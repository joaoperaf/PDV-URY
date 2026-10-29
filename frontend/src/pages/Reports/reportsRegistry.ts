import type { LucideIcon } from 'lucide-react';
import {
  Sun,
  CalendarDays,
  Receipt,
  BarChart3,
  Clock,
  PieChart,
  Ban,
  Gauge,
  Package,
  Users,
  UserPlus,
  Repeat,
} from 'lucide-react';

export interface ReportEntry {
  id: string;
  label: string;
  group: string;
  path: string;
  icon: LucideIcon;
}

export const reportsRegistry: ReportEntry[] = [
  { id: 'today-sales', label: 'Vendas de Hoje', group: 'Resumo de Vendas', path: 'today-sales', icon: Sun },
  { id: 'daywise-sales', label: 'Vendas por Dia', group: 'Resumo de Vendas', path: 'daywise-sales', icon: CalendarDays },
  { id: 'daywise-invoices', label: 'Faturas por Dia', group: 'Resumo de Vendas', path: 'daywise-invoices', icon: Receipt },
  { id: 'month-wise-sales', label: 'Vendas por Mês', group: 'Resumo de Vendas', path: 'month-wise-sales', icon: BarChart3 },
  { id: 'time-wise-sales', label: 'Vendas por Horário', group: 'Resumo de Vendas', path: 'time-wise-sales', icon: Clock },
  { id: 'service-wise-sales', label: 'Vendas por Canal / Serviço', group: 'Resumo de Vendas', path: 'service-wise-sales', icon: PieChart },
  { id: 'cancelled-invoices', label: 'Pedidos Cancelados', group: 'Resumo de Vendas', path: 'cancelled-invoices', icon: Ban },
  { id: 'average-bill-value', label: 'Ticket Médio', group: 'Resumo de Vendas', path: 'average-bill-value', icon: Gauge },

  { id: 'item-wise-sales', label: 'Vendas por Produto', group: 'Clientes e Cardápio', path: 'item-wise-sales', icon: Package },
  { id: 'customer-data', label: 'Base de Clientes', group: 'Clientes e Cardápio', path: 'customer-data', icon: Users },
  { id: 'daywise-customer-details', label: 'Clientes por Dia', group: 'Clientes e Cardápio', path: 'daywise-customer-details', icon: UserPlus },
  { id: 'repeated-customers', label: 'Clientes Recorrentes', group: 'Clientes e Cardápio', path: 'repeated-customers', icon: Repeat },
];

export function groupReports(reports: ReportEntry[]): Record<string, ReportEntry[]> {
  return reports.reduce<Record<string, ReportEntry[]>>((acc, report) => {
    if (!acc[report.group]) {
      acc[report.group] = [];
    }
    acc[report.group].push(report);
    return acc;
  }, {});
}
