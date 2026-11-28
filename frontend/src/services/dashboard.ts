import { call, parseFrappeError } from '@ury/core';

export type DashboardPeriod = 'today' | '7d' | '30d';

export interface DashboardAlert {
  id: string;
  severity: 'high' | 'medium';
  title: string;
  description: string;
  action_label: string;
  action_href: string;
  is_external?: boolean;
}

export interface DashboardSummary {
  period?: DashboardPeriod;
  period_label?: string;
  comparison_label?: string;
  start_date?: string;
  end_date?: string;
  branch?: string;
  today_sales: number;
  previous_sales?: number;
  sales_delta_pct?: number | null;
  today_orders: number;
  previous_orders?: number;
  orders_delta_pct?: number | null;
  avg_order_value: number;
  previous_avg_order_value?: number;
  aov_delta_pct?: number | null;
  pending_kitchen_orders: number;
  open_draft_orders?: number;
  open_draft_total?: number;
  cancelled_orders?: number;
  occupied_tables: number;
  total_tables: number;
  active_cashiers: number;
  total_menu_items: number;
}

export interface ChartSalesTrend {
  date: string;
  label?: string;
  sales: number;
  orders?: number;
  avg_ticket?: number;
}

export interface ChartHourlySales {
  hour: string;
  orders?: number;
  sales: number;
}

export interface ChartPaymentMethod {
  method: string;
  count?: number;
  total: number;
}

export interface ChartOrderType {
  order_type: string;
  count: number;
  total: number;
  avg_ticket?: number;
}

export interface ChartTopItem {
  item_code?: string;
  item_name: string;
  item_group?: string;
  total_qty: number;
  total_amount: number;
}

export interface ChartRevenueByBranch {
  branch: string;
  orders?: number;
  total: number;
}

export interface ChartSalesByCourse {
  course: string;
  total: number;
}

export interface DashboardChartsData {
  period?: DashboardPeriod;
  period_label?: string;
  sales_trend: ChartSalesTrend[];
  hourly_sales: ChartHourlySales[];
  payment_methods: ChartPaymentMethod[];
  order_types: ChartOrderType[];
  top_items: ChartTopItem[];
  revenue_by_branch: ChartRevenueByBranch[];
  sales_by_course: ChartSalesByCourse[];
}

export interface TransactionRecord {
  name: string;
  customer?: string;
  customer_name?: string;
  posting_date: string;
  posting_time: string;
  grand_total: number;
  status: string;
  docstatus?: number;
  order_type?: string;
  branch?: string;
  custom_ury_order_number?: number | string;
  cashier?: string;
}

function unwrapMessage<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'message' in (res as Record<string, unknown>)) {
    return (res as { message: T }).message;
  }
  return res as T;
}

export const dashboardService = {
  async getAlerts(branch?: string): Promise<DashboardAlert[]> {
    try {
      const res = await call<DashboardAlert[]>('ury.ury.api.dashboard.get_dashboard_alerts', {
        branch,
      });
      const list = unwrapMessage<DashboardAlert[]>(res);
      return Array.isArray(list) ? list : [];
    } catch (err) {
      throw new Error(parseFrappeError(err, 'Não foi possível verificar os alertas operacionais.'));
    }
  },

  async getSummary(
    branch?: string,
    period: DashboardPeriod = 'today',
  ): Promise<DashboardSummary> {
    try {
      const res = await call<DashboardSummary>('ury.ury.api.dashboard.get_dashboard_summary', {
        branch,
        period,
      });
      const data = unwrapMessage<DashboardSummary>(res);
      if (!data || typeof data !== 'object') {
        throw new Error('Resposta inválida ao consultar resumo do período.');
      }
      return data;
    } catch (err) {
      throw new Error(
        parseFrappeError(err, 'Não foi possível carregar os indicadores do período.'),
      );
    }
  },

  async getCharts(
    branch?: string,
    period: DashboardPeriod = 'today',
  ): Promise<DashboardChartsData> {
    try {
      const res = await call<DashboardChartsData>('ury.ury.api.dashboard.get_dashboard_charts', {
        branch,
        period,
      });
      const data = unwrapMessage<DashboardChartsData>(res);
      if (!data || typeof data !== 'object') {
        throw new Error('Resposta inválida ao consultar gráficos analíticos.');
      }
      return {
        period: data.period,
        period_label: data.period_label,
        sales_trend: Array.isArray(data.sales_trend) ? data.sales_trend : [],
        hourly_sales: Array.isArray(data.hourly_sales) ? data.hourly_sales : [],
        payment_methods: Array.isArray(data.payment_methods) ? data.payment_methods : [],
        order_types: Array.isArray(data.order_types) ? data.order_types : [],
        top_items: Array.isArray(data.top_items) ? data.top_items : [],
        revenue_by_branch: Array.isArray(data.revenue_by_branch) ? data.revenue_by_branch : [],
        sales_by_course: Array.isArray(data.sales_by_course) ? data.sales_by_course : [],
      };
    } catch (err) {
      throw new Error(
        parseFrappeError(err, 'Não foi possível carregar as análises do período.'),
      );
    }
  },

  async getRecentTransactions(branch?: string, limit: number = 10): Promise<TransactionRecord[]> {
    try {
      const res = await call<TransactionRecord[]>(
        'ury.ury.api.dashboard.get_recent_transactions',
        { branch, limit },
      );
      const list = unwrapMessage<TransactionRecord[]>(res);
      return Array.isArray(list) ? list : [];
    } catch (err) {
      throw new Error(
        parseFrappeError(err, 'Não foi possível carregar as transações recentes.'),
      );
    }
  },

  async getModuleRecords<T = any>(doctype: string, branch?: string): Promise<T[]> {
    try {
      const res = await call<T[]>('ury.ury.api.dashboard.get_module_records', {
        doctype,
        branch,
      });
      const list = unwrapMessage<T[]>(res);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },
};
