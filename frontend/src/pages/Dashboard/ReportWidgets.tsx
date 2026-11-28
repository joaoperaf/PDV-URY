import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@ury/core';
import { Card, CardHeader, CardTitle, CardContent, Badge, StateMessage } from '@ury/ui';
import { ArrowRight } from 'lucide-react';
import { TransactionRecord } from '../../services/dashboard';

interface ReportWidgetsProps {
  recentTransactions: TransactionRecord[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function formatOrderTypeLabel(orderType?: string): string {
  switch (orderType) {
    case 'Delivery':
      return 'Delivery';
    case 'Aggregators':
      return 'App / iFood';
    case 'Take Away':
      return 'Retirada';
    case 'Phone In':
      return 'Telefone / Whats';
    case 'Dine In':
      return 'Local';
    default:
      return orderType || 'Delivery';
  }
}

function formatStatusBadge(status: string, docstatus?: number) {
  if (status === 'Cancelled' || docstatus === 2) {
    return {
      label: 'Cancelado',
      className: 'bg-red-50 text-red-800 border border-red-200',
    };
  }
  if (status === 'Paid' || status === 'Consolidated' || status === 'Submitted') {
    return {
      label: status === 'Consolidated' ? 'Consolidado' : 'Pago',
      className: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    };
  }
  return {
    label: 'Em Aberto',
    className: 'bg-amber-50 text-amber-900 border border-amber-200',
  };
}

function formatPostingDateTime(postingDate?: string, postingTime?: string): string {
  const dateStr = postingDate
    ? postingDate.split('-').reverse().join('/')
    : '';
  const timeStr = postingTime ? postingTime.slice(0, 5) : '';
  return [dateStr, timeStr].filter(Boolean).join(' às ');
}

export const ReportWidgets: React.FC<ReportWidgetsProps> = ({
  recentTransactions,
  loading,
  error,
  onRetry,
}) => {
  return (
    <section aria-label="Transações recentes do PDV">
      <Card padding="none" className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-200 bg-slate-50/70 px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                Movimentações Recentes do PDV
              </CardTitle>
              <p className="text-xs text-slate-600 mt-0.5">
                Últimas faturas registradas, pedidos em aberto e cancelamentos
              </p>
            </div>

            <Link
              to="/reports/daywise-invoices"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
            >
              <span>Relatório de faturas</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && recentTransactions.length === 0 ? (
            <div role="status" aria-busy="true" className="p-5 space-y-3 motion-safe:animate-pulse">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="h-10 w-full rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <StateMessage
              variant="error"
              title="Não foi possível carregar as transações recentes"
              description={error}
              actionLabel="Tentar novamente"
              onAction={onRetry}
              className="min-h-52 py-8"
            />
          ) : recentTransactions.length === 0 ? (
            <StateMessage
              variant="empty"
              title="Nenhuma transação registrada para esta filial"
              description="As faturas abertas, pagas ou canceladas no PDV aparecerão automaticamente nesta tabela."
              actionLabel={onRetry ? 'Atualizar lista' : undefined}
              onAction={onRetry}
              className="min-h-52 py-8"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3">Pedido / Fatura</th>
                    <th className="px-4 sm:px-6 py-3">Cliente</th>
                    <th className="px-4 sm:px-6 py-3">Canal</th>
                    <th className="px-4 sm:px-6 py-3 hidden md:table-cell">Data e Hora</th>
                    <th className="px-4 sm:px-6 py-3">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {recentTransactions.map((tx) => {
                    const statusInfo = formatStatusBadge(tx.status, tx.docstatus);
                    return (
                      <tr key={tx.name} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 sm:px-6 py-3.5 font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {tx.custom_ury_order_number ? `#${tx.custom_ury_order_number} · ` : ''}
                          <span className="text-blue-700">{tx.name}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-slate-900 font-semibold max-w-[160px] truncate">
                          {tx.customer_name || tx.customer || 'Cliente Avulso'}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-100 text-slate-800 font-semibold"
                          >
                            {formatOrderTypeLabel(tx.order_type)}
                          </Badge>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-slate-600 tabular-nums whitespace-nowrap hidden md:table-cell">
                          {formatPostingDateTime(tx.posting_date, tx.posting_time)}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatCurrency(tx.grand_total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default ReportWidgets;
