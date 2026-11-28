import React from 'react';
import { formatCurrency } from '@ury/core';
import { Card, StateMessage, cn } from '@ury/ui';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  ShoppingBag,
  Receipt,
  ChefHat,
} from 'lucide-react';
import { DashboardSummary } from '../../services/dashboard';

interface KPIGridProps {
  summary: DashboardSummary | null;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

interface DeltaBadgeProps {
  deltaPct?: number | null;
  comparisonLabel: string;
}

const DeltaBadge: React.FC<DeltaBadgeProps> = ({ deltaPct, comparisonLabel }) => {
  if (deltaPct === null || deltaPct === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 tabular-nums">
        <Minus className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
        <span>Sem base anterior ({comparisonLabel})</span>
      </span>
    );
  }

  if (deltaPct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 tabular-nums">
        <Minus className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
        <span>Estável ({comparisonLabel})</span>
      </span>
    );
  }

  const isPositive = deltaPct > 0;
  const formatted = `${isPositive ? '+' : ''}${deltaPct.toFixed(1).replace('.', ',')}%`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold tabular-nums',
        isPositive ? 'text-emerald-800' : 'text-red-700',
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>
        {formatted} {comparisonLabel}
      </span>
    </span>
  );
};

export const KPIGrid: React.FC<KPIGridProps> = ({
  summary,
  loading,
  error,
  onRetry,
}) => {
  if (loading && !summary) {
    return (
      <section aria-label="Indicadores do período" role="status" aria-busy="true">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm motion-safe:animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 rounded bg-slate-200" />
                <div className="h-8 w-8 rounded-lg bg-slate-100" />
              </div>
              <div className="h-8 w-32 rounded bg-slate-200" />
              <div className="h-3.5 w-36 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Indicadores do período">
        <StateMessage
          variant="error"
          title="Não foi possível carregar os indicadores"
          description={error}
          actionLabel="Tentar novamente"
          onAction={onRetry}
          className="rounded-xl border border-slate-200 bg-white shadow-sm min-h-48 py-8"
        />
      </section>
    );
  }

  const periodSales = summary?.today_sales ?? 0;
  const periodOrders = summary?.today_orders ?? 0;
  const aov = summary?.avg_order_value ?? 0;
  const pendingKitchen = summary?.pending_kitchen_orders ?? 0;
  const openDrafts = summary?.open_draft_orders ?? 0;
  const cancelledOrders = summary?.cancelled_orders ?? 0;
  const periodLabel = summary?.period_label || 'Período atual';
  const comparisonLabel = summary?.comparison_label || 'vs. período anterior';

  return (
    <section aria-label="Indicadores do período" className="w-full">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1. Sales */}
        <Card className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Faturamento ({periodLabel})
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
            {formatCurrency(periodSales)}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <DeltaBadge deltaPct={summary?.sales_delta_pct} comparisonLabel={comparisonLabel} />
          </div>
        </Card>

        {/* 2. Completed Orders */}
        <Card className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Pedidos Concluídos
            </span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {periodOrders}
            </span>
            {cancelledOrders > 0 && (
              <span className="text-xs font-medium text-red-700 tabular-nums">
                ({cancelledOrders} cancel.)
              </span>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <DeltaBadge deltaPct={summary?.orders_delta_pct} comparisonLabel={comparisonLabel} />
          </div>
        </Card>

        {/* 3. Average Order Value */}
        <Card className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Ticket Médio
            </span>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-800 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
            {formatCurrency(aov)}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <DeltaBadge deltaPct={summary?.aov_delta_pct} comparisonLabel={comparisonLabel} />
          </div>
        </Card>

        {/* 4. Live Kitchen & Cashier Queue */}
        <Card className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Fila Operacional Agora
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
              <ChefHat className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {pendingKitchen} na chapa
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-700 tabular-nums">
              {openDrafts} conta(s) em aberto
            </span>
            <a
              href="/pos/kitchen"
              className="font-semibold text-blue-700 hover:text-blue-800 hover:underline shrink-0"
            >
              Ver KDS
            </a>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default KPIGrid;
