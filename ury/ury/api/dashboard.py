import frappe
from frappe.utils import add_days, add_to_date, flt, cint, get_datetime, getdate, today


VALID_PERIODS = {"today", "7d", "30d"}


def _normalize_branch(branch):
    if not branch or branch in ("all", "All Branches"):
        return None
    return branch


def _resolve_period_dates(period):
    period_key = period if period in VALID_PERIODS else "today"
    end_date = getdate(today())

    if period_key == "7d":
        start_date = add_days(end_date, -6)
        prev_end = add_days(start_date, -1)
        prev_start = add_days(prev_end, -6)
        label = "Últimos 7 dias"
        comparison_label = "vs. 7 dias anteriores"
    elif period_key == "30d":
        start_date = add_days(end_date, -29)
        prev_end = add_days(start_date, -1)
        prev_start = add_days(prev_end, -29)
        label = "Últimos 30 dias"
        comparison_label = "vs. 30 dias anteriores"
    else:
        start_date = end_date
        prev_start = add_days(end_date, -1)
        prev_end = prev_start
        label = "Hoje"
        comparison_label = "vs. ontem"

    return {
        "period": period_key,
        "start_date": str(start_date),
        "end_date": str(end_date),
        "prev_start_date": str(prev_start),
        "prev_end_date": str(prev_end),
        "label": label,
        "comparison_label": comparison_label,
    }


def _compute_delta_pct(current_val, previous_val):
    curr = flt(current_val)
    prev = flt(previous_val)
    if prev <= 0:
        return None if curr <= 0 else 100.0
    return round(((curr - prev) / prev) * 100.0, 1)


def _sum_period_invoices(start_date, end_date, branch_name=None):
    branch_clause = "AND b.`branch` = %(branch)s" if branch_name else ""
    params = {
        "start_date": start_date,
        "end_date": end_date,
        "branch": branch_name,
    }
    row = frappe.db.sql(
        f"""
        SELECT
            COUNT(b.`name`) AS total_orders,
            COALESCE(ROUND(SUM(b.`grand_total`), 2), 0) AS total_sales
        FROM `tabPOS Invoice` b
        WHERE
            b.`docstatus` = 1
            AND b.`status` IN ('Consolidated', 'Paid')
            AND b.`posting_date` BETWEEN %(start_date)s AND %(end_date)s
            {branch_clause}
        """,
        params,
        as_dict=True,
    )[0]
    orders = cint(row.total_orders)
    sales = flt(row.total_sales, 2)
    aov = round(sales / orders, 2) if orders > 0 else 0.0
    return {"orders": orders, "sales": sales, "aov": aov}


@frappe.whitelist()
def get_dashboard_alerts(branch=None):
    branch_name = _normalize_branch(branch)
    alerts = []
    now_dt = get_datetime()
    three_hours_ago = add_to_date(now_dt, hours=-3)

    # 1. Delayed KOTs in the kitchen
    if frappe.db.exists("DocType", "URY KOT"):
        alert_minutes = 15
        if branch_name:
            configured = frappe.db.get_value(
                "POS Profile", {"branch": branch_name}, "custom_kot_warning_time"
            )
            if configured:
                alert_minutes = cint(configured) or 15

        delay_cutoff = add_to_date(now_dt, minutes=-alert_minutes)
        kot_filters = {
            "docstatus": 1,
            "order_status": "Ready For Prepare",
            "verified": 0,
            "creation": ["between", [three_hours_ago, delay_cutoff]],
        }
        if branch_name:
            kot_filters["branch"] = branch_name

        delayed_count = frappe.db.count("URY KOT", kot_filters)
        if delayed_count > 0:
            alerts.append(
                {
                    "id": "delayed_kots",
                    "severity": "high",
                    "title": f"{delayed_count} comanda(s) acima do tempo limite na cozinha",
                    "description": f"Existem pedidos aguardando preparo há mais de {alert_minutes} minutos no KDS.",
                    "action_label": "Abrir Cozinha (KDS)",
                    "action_href": "/pos/kitchen",
                    "is_external": True,
                }
            )

    # 2. Open POS Invoices (Draft) waiting payment/closure
    if frappe.db.exists("DocType", "POS Invoice"):
        draft_cutoff = add_to_date(now_dt, minutes=-20)
        branch_sql = "AND `branch` = %(branch)s" if branch_name else ""
        draft_row = frappe.db.sql(
            f"""
            SELECT
                COUNT(`name`) AS cnt,
                COALESCE(ROUND(SUM(`grand_total`), 2), 0) AS total
            FROM `tabPOS Invoice`
            WHERE
                `docstatus` = 0
                AND `creation` <= %(cutoff)s
                {branch_sql}
            """,
            {"cutoff": draft_cutoff, "branch": branch_name},
            as_dict=True,
        )[0]
        if cint(draft_row.cnt) > 0:
            alerts.append(
                {
                    "id": "open_draft_invoices",
                    "severity": "medium",
                    "title": f"{cint(draft_row.cnt)} pedido(s) em aberto aguardando fechamento",
                    "description": "Há faturas em rascunho abertas há mais de 20 minutos pendentes de baixa ou cancelamento.",
                    "action_label": "Revisar Pedidos",
                    "action_href": "/pos/orders",
                    "is_external": True,
                }
            )

    # 3. Unclosed POS Opening Entry from previous days
    if frappe.db.exists("DocType", "POS Opening Entry"):
        opening_filters = {
            "status": "Open",
            "docstatus": 1,
            "posting_date": ["<", today()],
        }
        if branch_name and frappe.get_meta("POS Opening Entry").has_field("branch"):
            opening_filters["branch"] = branch_name

        stale_openings = frappe.db.count("POS Opening Entry", opening_filters)
        if stale_openings > 0:
            alerts.append(
                {
                    "id": "stale_pos_opening",
                    "severity": "high",
                    "title": f"{stale_openings} turno(s) de caixa aberto(s) de dia anterior",
                    "description": "Feche o turno anterior no PDV para manter a conciliação financeira em dia.",
                    "action_label": "Abrir PDV",
                    "action_href": "/pos/pos",
                    "is_external": True,
                }
            )

    # 4. iFood orders blocked on item mapping or sync error
    if frappe.db.exists("DocType", "iFood Order"):
        unmapped_count = frappe.db.count(
            "iFood Order", {"mapping_status": "Pending Mapping"}
        )
        if unmapped_count > 0:
            alerts.append(
                {
                    "id": "ifood_pending_mapping",
                    "severity": "high",
                    "title": f"{unmapped_count} pedido(s) iFood aguardando vínculo de produto",
                    "description": "Vincule os códigos externos do catálogo iFood aos itens do cardápio para importar automaticamente.",
                    "action_label": "Ver Agregadores",
                    "action_href": "/aggregator",
                    "is_external": False,
                }
            )

    return alerts


@frappe.whitelist()
def get_dashboard_summary(branch=None, period="today"):
    branch_name = _normalize_branch(branch)
    bounds = _resolve_period_dates(period)

    current = _sum_period_invoices(bounds["start_date"], bounds["end_date"], branch_name)
    previous = _sum_period_invoices(
        bounds["prev_start_date"], bounds["prev_end_date"], branch_name
    )

    # Active kitchen queue (last 3h, matching KDS board)
    three_hours_ago = add_to_date(get_datetime(), hours=-3)
    kot_filters = {
        "docstatus": 1,
        "order_status": "Ready For Prepare",
        "verified": 0,
        "creation": [">=", three_hours_ago],
    }
    if branch_name:
        kot_filters["branch"] = branch_name

    pending_kitchen_orders = (
        frappe.db.count("URY KOT", kot_filters)
        if frappe.db.exists("DocType", "URY KOT")
        else 0
    )

    # Open draft orders & cancelled orders in period
    branch_clause = "AND `branch` = %(branch)s" if branch_name else ""
    draft_row = frappe.db.sql(
        f"""
        SELECT
            COUNT(`name`) AS cnt,
            COALESCE(ROUND(SUM(`grand_total`), 2), 0) AS total
        FROM `tabPOS Invoice`
        WHERE `docstatus` = 0 {branch_clause}
        """,
        {"branch": branch_name},
        as_dict=True,
    )[0]

    cancelled_count = cint(
        frappe.db.sql(
            f"""
            SELECT COUNT(`name`)
            FROM `tabPOS Invoice`
            WHERE
                `docstatus` = 2
                AND `posting_date` BETWEEN %(start_date)s AND %(end_date)s
                {branch_clause}
            """,
            {
                "start_date": bounds["start_date"],
                "end_date": bounds["end_date"],
                "branch": branch_name,
            },
        )[0][0]
    )

    return {
        "period": bounds["period"],
        "period_label": bounds["label"],
        "comparison_label": bounds["comparison_label"],
        "start_date": bounds["start_date"],
        "end_date": bounds["end_date"],
        "branch": branch_name or "all",
        "today_sales": current["sales"],
        "previous_sales": previous["sales"],
        "sales_delta_pct": _compute_delta_pct(current["sales"], previous["sales"]),
        "today_orders": current["orders"],
        "previous_orders": previous["orders"],
        "orders_delta_pct": _compute_delta_pct(current["orders"], previous["orders"]),
        "avg_order_value": current["aov"],
        "previous_avg_order_value": previous["aov"],
        "aov_delta_pct": _compute_delta_pct(current["aov"], previous["aov"]),
        "pending_kitchen_orders": pending_kitchen_orders,
        "open_draft_orders": cint(draft_row.cnt),
        "open_draft_total": flt(draft_row.total, 2),
        "cancelled_orders": cancelled_count,
        "occupied_tables": 0,
        "total_tables": 0,
        "active_cashiers": frappe.db.count("User", {"enabled": 1}),
        "total_menu_items": frappe.db.count("Item", {"disabled": 0})
        if frappe.db.exists("DocType", "Item")
        else 0,
    }


@frappe.whitelist()
def get_dashboard_charts(branch=None, period="today"):
    branch_name = _normalize_branch(branch)
    bounds = _resolve_period_dates(period)
    branch_clause = "AND b.`branch` = %(branch)s" if branch_name else ""
    params = {
        "start_date": bounds["start_date"],
        "end_date": bounds["end_date"],
        "branch": branch_name,
    }

    # 1. Sales Trend (hourly when period='today', daily when '7d' or '30d')
    sales_trend = []
    if bounds["period"] == "today":
        hourly_rows = frappe.db.sql(
            f"""
            SELECT
                HOUR(b.`posting_time`) AS hr,
                COUNT(b.`name`) AS orders,
                COALESCE(ROUND(SUM(b.`grand_total`), 2), 0) AS sales
            FROM `tabPOS Invoice` b
            WHERE
                b.`docstatus` = 1
                AND b.`status` IN ('Consolidated', 'Paid')
                AND b.`posting_date` = %(start_date)s
                {branch_clause}
            GROUP BY HOUR(b.`posting_time`)
            ORDER BY hr ASC
            """,
            params,
            as_dict=True,
        )
        if hourly_rows:
            by_hr = {cint(r.hr): r for r in hourly_rows}
            min_hr = min(max(0, min(by_hr.keys()) - 1), 11)
            max_hr = max(min(23, max(by_hr.keys()) + 1), 22)
            for h in range(min_hr, max_hr + 1):
                r = by_hr.get(h)
                orders = cint(r.orders) if r else 0
                sales = flt(r.sales, 2) if r else 0.0
                sales_trend.append(
                    {
                        "date": f"{h:02d}:00",
                        "label": f"{h:02d}h",
                        "sales": sales,
                        "orders": orders,
                        "avg_ticket": round(sales / orders, 2) if orders > 0 else 0.0,
                    }
                )
    else:
        daily_rows = frappe.db.sql(
            f"""
            SELECT
                b.`posting_date` AS dt,
                COUNT(b.`name`) AS orders,
                COALESCE(ROUND(SUM(b.`grand_total`), 2), 0) AS sales
            FROM `tabPOS Invoice` b
            WHERE
                b.`docstatus` = 1
                AND b.`status` IN ('Consolidated', 'Paid')
                AND b.`posting_date` BETWEEN %(start_date)s AND %(end_date)s
                {branch_clause}
            GROUP BY b.`posting_date`
            ORDER BY b.`posting_date` ASC
            """,
            params,
            as_dict=True,
        )
        if daily_rows:
            by_dt = {str(r.dt): r for r in daily_rows}
            cursor = getdate(bounds["start_date"])
            end_dt = getdate(bounds["end_date"])
            while cursor <= end_dt:
                key = str(cursor)
                r = by_dt.get(key)
                orders = cint(r.orders) if r else 0
                sales = flt(r.sales, 2) if r else 0.0
                sales_trend.append(
                    {
                        "date": key,
                        "label": cursor.strftime("%d/%m"),
                        "sales": sales,
                        "orders": orders,
                        "avg_ticket": round(sales / orders, 2) if orders > 0 else 0.0,
                    }
                )
                cursor = add_days(cursor, 1)

    # 2. Peak Hours distribution across the selected period
    hourly_dist_rows = frappe.db.sql(
        f"""
        SELECT
            HOUR(b.`posting_time`) AS hr,
            COUNT(b.`name`) AS orders,
            COALESCE(ROUND(SUM(b.`grand_total`), 2), 0) AS sales
        FROM `tabPOS Invoice` b
        WHERE
            b.`docstatus` = 1
            AND b.`status` IN ('Consolidated', 'Paid')
            AND b.`posting_date` BETWEEN %(start_date)s AND %(end_date)s
            {branch_clause}
        GROUP BY HOUR(b.`posting_time`)
        ORDER BY hr ASC
        """,
        params,
        as_dict=True,
    )
    hourly_sales = [
        {
            "hour": f"{cint(r.hr):02d}h",
            "orders": cint(r.orders),
            "sales": flt(r.sales, 2),
        }
        for r in hourly_dist_rows
    ]

    # 3. Order Types / Delivery Channels
    order_type_rows = frappe.db.sql(
        f"""
        SELECT
            COALESCE(NULLIF(b.`order_type`, ''), 'Balcão') AS order_type,
            COUNT(b.`name`) AS count,
            COALESCE(ROUND(SUM(b.`grand_total`), 2), 0) AS total
        FROM `tabPOS Invoice` b
        WHERE
            b.`docstatus` = 1
            AND b.`status` IN ('Consolidated', 'Paid')
            AND b.`posting_date` BETWEEN %(start_date)s AND %(end_date)s
            {branch_clause}
        GROUP BY COALESCE(NULLIF(b.`order_type`, ''), 'Balcão')
        ORDER BY total DESC, count DESC
        """,
        params,
        as_dict=True,
    )
    order_types = [
        {
            "order_type": r.order_type,
            "count": cint(r.count),
            "total": flt(r.total, 2),
            "avg_ticket": round(flt(r.total) / cint(r.count), 2)
            if cint(r.count) > 0
            else 0.0,
        }
        for r in order_type_rows
    ]

    # 4. Payment Methods Breakdown
    payment_rows = frappe.db.sql(
        f"""
        SELECT
            p.`mode_of_payment` AS method,
            COUNT(DISTINCT b.`name`) AS count,
            COALESCE(ROUND(SUM(p.`amount`), 2), 0) AS total
        FROM `tabSales Invoice Payment` p
        INNER JOIN `tabPOS Invoice` b ON b.`name` = p.`parent`
        WHERE
            p.`parenttype` = 'POS Invoice'
            AND b.`docstatus` = 1
            AND b.`status` IN ('Consolidated', 'Paid')
            AND b.`posting_date` BETWEEN %(start_date)s AND %(end_date)s
            AND p.`amount` > 0
            {branch_clause}
        GROUP BY p.`mode_of_payment`
        ORDER BY total DESC
        """,
        params,
        as_dict=True,
    )
    payment_methods = [
        {
            "method": r.method or "Outro",
            "count": cint(r.count),
            "total": flt(r.total, 2),
        }
        for r in payment_rows
    ]

    # 5. Top Menu Items
    top_item_rows = frappe.db.sql(
        f"""
        SELECT
            i.`item_code`,
            COALESCE(NULLIF(i.`item_name`, ''), i.`item_code`) AS item_name,
            COALESCE(NULLIF(i.`item_group`, ''), 'Cardápio') AS item_group,
            COALESCE(SUM(i.`qty`), 0) AS total_qty,
            COALESCE(ROUND(SUM(i.`amount`), 2), 0) AS total_amount
        FROM `tabPOS Invoice Item` i
        INNER JOIN `tabPOS Invoice` b ON b.`name` = i.`parent`
        WHERE
            i.`parenttype` = 'POS Invoice'
            AND b.`docstatus` = 1
            AND b.`status` IN ('Consolidated', 'Paid')
            AND b.`posting_date` BETWEEN %(start_date)s AND %(end_date)s
            {branch_clause}
        GROUP BY i.`item_code`, i.`item_name`, i.`item_group`
        ORDER BY total_amount DESC, total_qty DESC
        LIMIT 8
        """,
        params,
        as_dict=True,
    )
    top_items = [
        {
            "item_code": r.item_code,
            "item_name": r.item_name,
            "item_group": r.item_group,
            "total_qty": flt(r.total_qty),
            "total_amount": flt(r.total_amount, 2),
        }
        for r in top_item_rows
    ]

    # 6. Revenue by Branch
    branch_rows = frappe.db.sql(
        """
        SELECT
            COALESCE(NULLIF(b.`branch`, ''), 'Sem Filial') AS branch,
            COUNT(b.`name`) AS orders,
            COALESCE(ROUND(SUM(b.`grand_total`), 2), 0) AS total
        FROM `tabPOS Invoice` b
        WHERE
            b.`docstatus` = 1
            AND b.`status` IN ('Consolidated', 'Paid')
            AND b.`posting_date` BETWEEN %(start_date)s AND %(end_date)s
        GROUP BY COALESCE(NULLIF(b.`branch`, ''), 'Sem Filial')
        ORDER BY total DESC
        """,
        {"start_date": bounds["start_date"], "end_date": bounds["end_date"]},
        as_dict=True,
    )
    revenue_by_branch = [
        {
            "branch": r.branch,
            "orders": cint(r.orders),
            "total": flt(r.total, 2),
        }
        for r in branch_rows
    ]

    return {
        "period": bounds["period"],
        "period_label": bounds["label"],
        "sales_trend": sales_trend,
        "hourly_sales": hourly_sales,
        "payment_methods": payment_methods,
        "order_types": order_types,
        "top_items": top_items,
        "revenue_by_branch": revenue_by_branch,
        "sales_by_course": [],
    }


@frappe.whitelist()
def get_recent_transactions(branch=None, limit=10):
    branch_name = _normalize_branch(branch)
    filters = {"docstatus": ["in", [0, 1, 2]]}
    if branch_name:
        filters["branch"] = branch_name

    if frappe.db.exists("DocType", "POS Invoice"):
        invoices = frappe.get_all(
            "POS Invoice",
            filters=filters,
            fields=[
                "name",
                "customer",
                "customer_name",
                "posting_date",
                "posting_time",
                "grand_total",
                "status",
                "docstatus",
                "order_type",
                "branch",
                "custom_ury_order_number",
                "owner as cashier",
            ],
            order_by="creation desc",
            limit=int(limit),
        )
        for inv in invoices:
            if not inv.get("status"):
                inv["status"] = (
                    "Cancelled"
                    if inv.get("docstatus") == 2
                    else "Draft"
                    if inv.get("docstatus") == 0
                    else "Paid"
                )
            if not inv.get("order_type"):
                inv["order_type"] = "Delivery"
        return invoices
    return []


@frappe.whitelist()
def get_module_records(doctype, branch=None):
    if not frappe.db.exists("DocType", doctype):
        return []

    branch_name = _normalize_branch(branch)
    filters = {}
    if branch_name:
        meta = frappe.get_meta(doctype)
        if meta.has_field("branch"):
            filters["branch"] = branch_name
        elif meta.has_field("custom_branch"):
            filters["custom_branch"] = branch_name

    try:
        records = frappe.get_all(doctype, filters=filters, fields=["*"])
        if doctype == "User":
            for r in records:
                r["roles"] = frappe.get_all(
                    "Has Role", filters={"parent": r.name}, fields=["role"]
                )
        return records
    except Exception:
        return []
