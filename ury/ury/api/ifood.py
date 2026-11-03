import json
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import frappe
import requests
from frappe import _
from frappe.utils import get_datetime


TOKEN_CACHE_KEY = "ury:ifood:access_token"
TOKEN_EXPIRY_CACHE_KEY = "ury:ifood:access_token_expiry"
POLLING_PATH = "/order/v1.0/events:polling"
ACKNOWLEDGMENT_PATH = "/order/v1.0/events/acknowledgment"
TOKEN_PATH = "/authentication/v1.0/oauth/token"
REQUEST_TIMEOUT = 20


def _settings():
    return frappe.get_single("iFood Settings")


def _api_url(settings, path):
    return f"{settings.api_base_url.rstrip('/')}/{path.lstrip('/')}"


def _get_access_token(settings):
    cached_token = frappe.cache().get_value(TOKEN_CACHE_KEY)
    cached_expiry = frappe.cache().get_value(TOKEN_EXPIRY_CACHE_KEY)
    if cached_token and cached_expiry:
        expiry = datetime.fromisoformat(cached_expiry)
        if expiry > datetime.now(timezone.utc) + timedelta(seconds=30):
            return cached_token

    if not settings.client_id or not settings.get_password("client_secret"):
        frappe.throw(_("Configure the iFood Client ID and Client Secret first."))

    response = requests.post(
        _api_url(settings, TOKEN_PATH),
        data={
            "grantType": "client_credentials",
            "clientId": settings.client_id,
            "clientSecret": settings.get_password("client_secret"),
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=REQUEST_TIMEOUT,
    )
    if not response.ok:
        detail = response.text[:500]
        raise requests.HTTPError(
            f"{response.status_code} response from iFood authentication: {detail}",
            response=response,
        )
    token_data = response.json()
    access_token = token_data.get("accessToken") or token_data.get("access_token")
    expires_in = int(token_data.get("expiresIn") or token_data.get("expires_in") or 3600)
    if not access_token:
        frappe.throw(_("The iFood authentication response did not contain an access token."))

    expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    frappe.cache().set_value(TOKEN_CACHE_KEY, access_token, expires_in_sec=max(expires_in - 60, 1))
    frappe.cache().set_value(TOKEN_EXPIRY_CACHE_KEY, expiry.isoformat(), expires_in_sec=max(expires_in - 60, 1))
    return access_token


def _request(settings, method, path, **kwargs):
    token = _get_access_token(settings)
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    headers["Authorization"] = "Bearer " + token
    response = requests.request(
        method,
        _api_url(settings, path),
        headers=headers,
        timeout=REQUEST_TIMEOUT,
        **kwargs,
    )
    if not response.ok:
        detail = response.text[:500]
        raise requests.HTTPError(f"{response.status_code} response from iFood: {detail}", response=response)
    return response


def _update_order_sync(order_id, status, error=None):
    order_name = frappe.db.exists("iFood Order", {"order_id": order_id})
    if not order_name:
        return
    frappe.db.set_value(
        "iFood Order",
        order_name,
        {
            "external_status": status,
            "last_sync_status": "Failed" if error else "Success",
            "last_sync_error": str(error)[:500] if error else None,
            "last_synced_at": datetime.now(),
        },
        update_modified=False,
    )


def _notify_ifood_cancellation(order_id, reason):
    recipients = frappe.get_all(
        "Has Role",
        filters={"role": ["in", ["URY Admin", "System Manager"]]},
        pluck="parent",
    )
    for user in set(recipients):
        frappe.get_doc(
            {
                "doctype": "Notification Log",
                "for_user": user,
                "subject": f"Pedido iFood {order_id} cancelado",
                "email_content": reason,
                "type": "Alert",
            }
        ).insert(ignore_permissions=True)


def cancel_local_ifood_order(order_id, reason="Cancelado pelo iFood"):
    """Cancel the local invoice and KOT after an iFood cancellation event."""
    order_name = frappe.db.exists("iFood Order", {"order_id": order_id})
    if not order_name:
        return {"status": "not_found", "order_id": order_id}

    invoice_name = frappe.db.exists("POS Invoice", {"custom_aggregator_id": order_id})
    if invoice_name:
        invoice = frappe.get_doc("POS Invoice", invoice_name)
        if invoice.docstatus != 2:
            from ury.ury.doctype.ury_order.ury_order import cancel_kot

            cancel_kot(invoice.name)
            invoice.db_set("cancel_reason", reason)
            if invoice.docstatus == 1:
                invoice.cancel()
                invoice.db_set("cancel_reason", reason)
            else:
                frappe.db.sql(
                    """UPDATE `tabPOS Invoice Item` SET docstatus = 2 WHERE parent = %s""",
                    (invoice.name,),
                )
                frappe.db.set_value("POS Invoice", invoice.name, "docstatus", 2)
                frappe.db.set_value("POS Invoice", invoice.name, "status", "Cancelled")
                frappe.db.set_value("POS Invoice", invoice.name, "cancel_reason", reason)

    frappe.db.set_value(
        "iFood Order",
        order_name,
        {"mapping_status": "Cancelled", "external_status": "CANCELLED"},
        update_modified=False,
    )
    _update_order_sync(order_id, "CANCELLED")
    _notify_ifood_cancellation(order_id, reason)
    frappe.db.commit()
    return {"status": "cancelled", "order_id": order_id, "invoice": invoice_name}


def mark_ifood_order_ready(order_id):
    """Notify iFood that an imported order is ready for driver pickup."""
    settings = _settings()
    order_name = frappe.db.exists("iFood Order", {"order_id": order_id})
    if not order_name:
        raise ValueError(f"iFood order not found: {order_id}")

    current_status = frappe.db.get_value("iFood Order", order_name, "external_status")
    if current_status == "READY_TO_PICKUP":
        return {"status": "already_sent", "order_id": order_id}

    try:
        _request(
            settings,
            "POST",
            f"/order/v1.0/orders/{quote(order_id, safe='')}/readyToPickup",
            headers={"Content-Type": "application/json"},
        )
    except Exception as exc:
        _update_order_sync(order_id, "READY_TO_PICKUP", exc)
        frappe.db.commit()
        frappe.log_error(
            title="iFood ready-to-pickup notification failed",
            message=frappe.get_traceback(),
        )
        return {"status": "failed", "order_id": order_id, "error": str(exc)[:500]}

    _update_order_sync(order_id, "READY_TO_PICKUP")
    frappe.db.commit()
    return {"status": "sent", "order_id": order_id}


def confirm_ifood_order(order_id):
    """Confirm an iFood order once it has been imported into the POS."""
    settings = _settings()
    order_name = frappe.db.exists("iFood Order", {"order_id": order_id})
    if not order_name:
        raise ValueError(f"iFood order not found: {order_id}")

    current_status = frappe.db.get_value("iFood Order", order_name, "external_status")
    if current_status in {"CONFIRMED", "READY_TO_PICKUP", "DISPATCHED"}:
        return {"status": "already_sent", "order_id": order_id}

    try:
        _request(
            settings,
            "POST",
            f"/order/v1.0/orders/{quote(order_id, safe='')}/confirm",
            headers={"Content-Type": "application/json"},
        )
    except Exception as exc:
        _update_order_sync(order_id, "CONFIRMED", exc)
        frappe.db.commit()
        frappe.log_error(title="iFood order confirmation failed", message=frappe.get_traceback())
        return {"status": "failed", "order_id": order_id, "error": str(exc)[:500]}

    _update_order_sync(order_id, "CONFIRMED")
    frappe.db.commit()
    return {"status": "sent", "order_id": order_id}


def _set_external_event_status(order_id, event_type, order_status=None):
    event_statuses = {
        "PLC": "PLACED",
        "CFM": "CONFIRMED",
        "SPS": "SEPARATION_STARTED",
        "SEP": "SEPARATION_ENDED",
        "RTP": "READY_TO_PICKUP",
        "DSP": "DISPATCHED",
        "CON": "CONCLUDED",
        "CAN": "CANCELLED",
    }
    status = event_statuses.get(event_type) or order_status
    if status:
        order_name = frappe.db.exists("iFood Order", {"order_id": order_id})
        if order_name:
            frappe.db.set_value(
                "iFood Order", order_name, "external_status", status, update_modified=False
            )


def _persist_event(event):
    event_id = event.get("id")
    if not event_id:
        frappe.log_error(
            title="iFood event without ID",
            message=json.dumps(event, ensure_ascii=False),
        )
        return None

    if frappe.db.exists("iFood Event Log", {"event_id": event_id}):
        return event_id, False

    event_created_at = event.get("createdAt")
    if event_created_at:
        event_created_at = get_datetime(event_created_at).replace(tzinfo=None)

    document = frappe.get_doc(
        {
            "doctype": "iFood Event Log",
            "event_id": event_id,
            "event_type": event.get("code") or event.get("type"),
            "order_id": event.get("orderId"),
            "merchant_id": event.get("merchantId"),
            "event_created_at": event_created_at,
            "status": "Received",
            "payload": json.dumps(event, ensure_ascii=False),
        }
    )
    document.insert(ignore_permissions=True)
    return event_id, True


def _acknowledge_events(settings, event_ids):
    if not event_ids:
        return
    _request(
        settings,
        "POST",
        ACKNOWLEDGMENT_PATH,
        json=[{"id": event_id} for event_id in event_ids],
        headers={"Content-Type": "application/json"},
    )


def _save_order_details(event, order):
    order_id = event.get("orderId")
    if not order_id:
        raise ValueError("iFood event does not contain an order ID.")

    order_created_at = order.get("createdAt")
    if order_created_at:
        order_created_at = get_datetime(order_created_at).replace(tzinfo=None)

    external_codes = _extract_external_codes(order)
    mapped_codes = set(
        frappe.get_all(
            "iFood Item Mapping",
            filters={"external_code": ["in", list(external_codes)], "enabled": 1},
            pluck="external_code",
        )
    ) if external_codes else set()
    unmapped_codes = sorted(external_codes - mapped_codes)

    existing_name = frappe.db.exists("iFood Order", {"order_id": order_id})
    values = {
        "order_id": order_id,
        "merchant_id": event.get("merchantId"),
        "display_id": order.get("displayId"),
        "order_status": order.get("orderStatus") or order.get("status"),
        "order_type": (order.get("orderType") or {}).get("type")
        if isinstance(order.get("orderType"), dict)
        else order.get("orderType"),
        "order_created_at": order_created_at,
        "event_id": event.get("id"),
        "external_status": order.get("orderStatus") or order.get("status"),
        "mapping_status": "Pending Mapping" if unmapped_codes else "Ready to Import",
        "unmapped_codes": ", ".join(unmapped_codes),
        "payload": json.dumps(order, ensure_ascii=False),
        "fetched_at": datetime.now(),
    }

    if existing_name:
        document = frappe.get_doc("iFood Order", existing_name)
        document.update(values)
        document.save(ignore_permissions=True)
    else:
        frappe.get_doc({"doctype": "iFood Order", **values}).insert(ignore_permissions=True)


def _extract_external_codes(order):
    return {
        str(item["externalCode"])
        for item in order.get("items", [])
        if item.get("externalCode")
    }


def _item_comments(item):
    comments = []
    if item.get("observations"):
        comments.append(str(item["observations"]))
    for option in item.get("options", []):
        label = option.get("name", "Option")
        quantity = option.get("quantity", 1)
        comments.append(f"{label} x{quantity}")
        for customization in option.get("customizations", []):
            nested_label = customization.get("name", "Customization")
            nested_quantity = customization.get("quantity", 1)
            comments.append(f"{nested_label} x{nested_quantity}")
    return "; ".join(comments)[:140]


def import_ready_ifood_orders():
    settings = _settings()
    profile = frappe.get_all(
        "POS Profile",
        fields=["name", "branch", "company", "warehouse"],
        limit_page_length=1,
    )
    if not profile:
        frappe.throw(_("Configure a POS Profile before importing iFood orders."))
    profile = profile[0]

    customer = frappe.db.exists("Customer", {"name": "ifood"}) or frappe.db.exists(
        "Customer", {"customer_name": "iFood"}
    )
    if not customer:
        frappe.throw(_("Create the iFood customer before importing orders."))

    imported = 0
    failed = 0
    orders = frappe.get_all(
        "iFood Order",
        filters={"mapping_status": ["in", ["Ready to Import", "Failed"]]},
        fields=["name", "order_id", "display_id", "payload", "external_status"],
        order_by="creation asc",
        limit_page_length=50,
    )
    for order_document in orders:
        try:
            if order_document.external_status == "CANCELLED":
                cancel_local_ifood_order(order_document.order_id)
                continue
            order = json.loads(order_document.payload)
            existing_invoice_name = frappe.db.exists(
                "POS Invoice", {"custom_aggregator_id": order_document.order_id}
            )
            if existing_invoice_name:
                existing_invoice = frappe.get_doc("POS Invoice", existing_invoice_name)
                has_kot = frappe.db.exists(
                    "URY KOT",
                    {"invoice": existing_invoice.name, "docstatus": 1},
                )
                if not has_kot:
                    existing_order_items = json.loads(order_document.payload).get("items", [])
                    existing_mappings = {
                        row.external_code: row.item
                        for row in frappe.get_all(
                            "iFood Item Mapping",
                            filters={"enabled": 1},
                            fields=["external_code", "item"],
                        )
                    }
                    existing_kot_items = [
                        {
                            "item": existing_mappings[str(item["externalCode"])],
                            "item_name": frappe.db.get_value(
                                "Item",
                                existing_mappings[str(item["externalCode"])],
                                "item_name",
                            ),
                            "qty": item.get("quantity", 1),
                            "comment": _item_comments(item),
                        }
                        for item in existing_order_items
                    ]
                    from ury.ury.api.ury_kot_generate import kot_execute

                    kot_execute(
                        existing_invoice.name,
                        existing_invoice.customer,
                        None,
                        existing_kot_items,
                        [],
                        existing_invoice.custom_comments,
                    )
                frappe.db.set_value(
                    "iFood Order",
                    order_document.name,
                    "mapping_status",
                    "Imported",
                    update_modified=False,
                )
                confirm_ifood_order(order_document.order_id)
                continue

            mappings = {
                row.external_code: row.item
                for row in frappe.get_all(
                    "iFood Item Mapping",
                    filters={"enabled": 1},
                    fields=["external_code", "item"],
                )
            }
            invoice = frappe.new_doc("POS Invoice")
            invoice.is_pos = 1
            invoice.update_stock = 1
            invoice.customer = customer
            invoice.company = profile.company
            invoice.branch = profile.branch
            invoice.pos_profile = profile.name
            invoice.warehouse = profile.warehouse
            invoice.order_type = "Aggregators"
            invoice.custom_aggregator_id = order_document.order_id
            invoice.custom_comments = (
                f"iFood #{order_document.display_id} | "
                f"Pagamento online: {order.get('payments', {}).get('prepaid', 0)}"
            )
            invoice.append(
                "payments",
                {"mode_of_payment": "ifood", "amount": 0},
            )
            for item in order.get("items", []):
                item_code = mappings.get(str(item.get("externalCode")))
                if not item_code:
                    raise ValueError(
                        f"Missing iFood mapping for {item.get('externalCode')}"
                    )
                invoice.append(
                    "items",
                    {
                        "item_code": item_code,
                        "item_name": frappe.db.get_value(
                            "Item", item_code, "item_name"
                        ),
                        "qty": item.get("quantity", 1),
                        "rate": item.get("unitPrice", 0),
                        "warehouse": profile.warehouse,
                        "description": _item_comments(item)
                        or frappe.db.get_value("Item", item_code, "item_name"),
                    },
                )
            invoice.insert(ignore_permissions=True)
            kot_items = [
                {
                    "item": mappings[str(item["externalCode"])],
                    "item_name": frappe.db.get_value(
                        "Item", mappings[str(item["externalCode"])], "item_name"
                    ),
                    "qty": item.get("quantity", 1),
                    "comment": _item_comments(item),
                }
                for item in order.get("items", [])
            ]
            from ury.ury.api.ury_kot_generate import kot_execute

            kot_execute(invoice.name, customer, None, kot_items, [], invoice.custom_comments)
            frappe.db.set_value(
                "iFood Order",
                order_document.name,
                "mapping_status",
                "Imported",
                update_modified=False,
            )
            confirm_ifood_order(order_document.order_id)
            imported += 1
        except Exception as exc:
            frappe.db.set_value(
                "iFood Order",
                order_document.name,
                {"mapping_status": "Failed", "unmapped_codes": str(exc)[:500]},
                update_modified=False,
            )
            frappe.log_error(title="iFood order import failed", message=frappe.get_traceback())
            failed += 1
    frappe.db.commit()
    return {"imported": imported, "failed": failed}


def create_demo_ifood_mappings():
    demo_mappings = {
        "1334": ("PRODUTO 1 - TESTE", "Burguinho"),
        "8849": ("PRODUTO 2 (COMBO) - TESTE", "Burger"),
    }
    created = 0
    for external_code, (external_name, item) in demo_mappings.items():
        if not frappe.db.exists("Item", item):
            continue
        if frappe.db.exists("iFood Item Mapping", {"external_code": external_code}):
            continue
        frappe.get_doc(
            {
                "doctype": "iFood Item Mapping",
                "external_code": external_code,
                "external_name": external_name,
                "item": item,
                "enabled": 1,
            }
        ).insert(ignore_permissions=True)
        created += 1
    refresh_ifood_order_mappings()
    return {"created": created}


def refresh_ifood_order_mappings():
    refreshed = 0
    for order_document in frappe.get_all(
        "iFood Order",
        fields=["name", "payload"],
        limit_page_length=0,
    ):
        order = json.loads(order_document.payload)
        external_codes = _extract_external_codes(order)
        mapped_codes = set(
            frappe.get_all(
                "iFood Item Mapping",
                filters={"external_code": ["in", list(external_codes)], "enabled": 1},
                pluck="external_code",
            )
        ) if external_codes else set()
        unmapped_codes = sorted(external_codes - mapped_codes)
        frappe.db.set_value(
            "iFood Order",
            order_document.name,
            {
                "mapping_status": "Pending Mapping" if unmapped_codes else "Ready to Import",
                "unmapped_codes": ", ".join(unmapped_codes),
            },
            update_modified=False,
        )
        refreshed += 1
    frappe.db.commit()
    return refreshed


def _process_pending_events(settings):
    processed = 0
    failed = 0
    events = frappe.get_all(
        "iFood Event Log",
        filters={"status": "Received", "order_id": ["is", "set"]},
        fields=["name", "event_id", "order_id", "merchant_id", "payload"],
        order_by="creation asc",
        limit_page_length=50,
    )
    for event_log in events:
        try:
            event = json.loads(event_log.payload)
            order = _request(
                settings,
                "GET",
                f"/order/v1.0/orders/{quote(event_log.order_id, safe='')}",
            ).json()
            _save_order_details(event, order)
            _set_external_event_status(
                event_log.order_id,
                event.get("code") or event.get("type"),
                order.get("orderStatus") or order.get("status"),
            )
            if event.get("code") == "CAN" or order.get("orderStatus") == "CANCELLED":
                cancel_local_ifood_order(
                    event_log.order_id,
                    "Cancelado pelo iFood: evento CAN recebido",
                )
            frappe.db.set_value(
                "iFood Event Log",
                event_log.name,
                {"status": "Processed", "error": None},
                update_modified=False,
            )
            processed += 1
        except Exception as exc:
            frappe.db.set_value(
                "iFood Event Log",
                event_log.name,
                {"status": "Failed", "error": str(exc)[:500]},
                update_modified=False,
            )
            failed += 1
    frappe.db.commit()
    return processed, failed


def poll_ifood_events():
    settings = _settings()
    if not settings.enabled or not settings.polling_enabled:
        return {"status": "disabled", "received": 0}

    headers = {}
    if settings.merchant_id:
        headers["x-polling-merchants"] = settings.merchant_id

    response = _request(settings, "GET", POLLING_PATH, headers=headers)
    if response.status_code == 204:
        processed, failed = _process_pending_events(settings)
        imported = import_ready_ifood_orders()
        return {
            "status": "ok",
            "received": 0,
            "acknowledged": 0,
            "processed": processed,
            "failed": failed,
            "imported": imported["imported"],
        }

    events = response.json()
    if not isinstance(events, list):
        frappe.throw(_("The iFood polling response must be a list of events."))

    persisted_events = [
        persisted
        for event in events
        if (persisted := _persist_event(event))
    ]
    event_ids = [event_id for event_id, _is_new in persisted_events]
    frappe.db.commit()
    _acknowledge_events(settings, event_ids)
    processed, failed = _process_pending_events(settings)
    imported = import_ready_ifood_orders()
    return {
        "status": "ok",
        "received": sum(1 for _event_id, is_new in persisted_events if is_new),
        "acknowledged": len(event_ids),
        "processed": processed,
        "failed": failed,
        "imported": imported["imported"],
    }


def poll_ifood_events_scheduled():
    try:
        return poll_ifood_events()
    except Exception:
        frappe.db.rollback()
        frappe.log_error(title="iFood polling failed", message=frappe.get_traceback())
    external_codes = _extract_external_codes(order)
    mapped_codes = set(
        frappe.get_all(
            "iFood Item Mapping",
            filters={"external_code": ["in", list(external_codes)], "enabled": 1},
            pluck="external_code",
        )
    ) if external_codes else set()
    unmapped_codes = sorted(external_codes - mapped_codes)
