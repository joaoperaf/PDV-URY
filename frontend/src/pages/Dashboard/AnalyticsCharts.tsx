import React, { useMemo, useState } from 'react';
import { formatCurrency } from '@ury/core';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  StateMessage,
  cn,
} from '@ury/ui';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { DashboardChartsData, DashboardPeriod } from '../../services/dashboard';

interface AnalyticsChartsProps {
  chartsData: DashboardChartsData | null;
  loading: boolean;
  error?: string | null;
  period: DashboardPeriod;
  onRetry?: () => void;
  onSelectPeriod?: (period: DashboardPeriod) => void;
}

function formatChannelName(raw?: string): string {
  switch (raw) {
    case 'Delivery':
      return 'Delivery Próprio';
    case 'Aggregators':
      return 'Apps / iFood';
    case 'Take Away':
      return 'Retirada no Balcão';
    case 'Phone In':
      return 'Telefone / WhatsApp';
    case 'Dine In':
      return 'Consumo Local';
    default:
      return raw || 'Balcão';
  }
}

const CHANNEL_COLORS = ['#2563EB', '#E11D48', '#059669', '#D97706', '#7C3AED'];
const PAYMENT_COLORS = ['#0F766E', '#2563EB', '#7C3AED', '#D97706', '#475569'];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  chartsData,
  loading,
  error,
  period,
  onRetry,
  onSelectPeriod,
}) => {
  const [trendMetric, setTrendMetric] = useState<'sales' | 'orders'>('sales');

  const trendSeries = useMemo(() => {
    return (chartsData?.sales_trend || []).map((point) => ({
      label: point.label || point.date,
      date: point.date,
      sales: point.sales || 0,
      orders: point.orders || 0,
      avgTicket: point.avg_ticket || 0,
    }));
  }, [chartsData?.sales_trend]);

  const hasAnyPeriodSales = useMemo(() => {
    return (
      trendSeries.some((p) => p.sales > 0 || p.orders > 0) ||
      (chartsData?.order_types?.length ?? 0) > 0 ||
      (chartsData?.top_items?.length ?? 0) > 0
    );
  }, [trendSeries, chartsData?.order_types, chartsData?.top_items]);

  const peakTrendPoint = useMemo(() => {
    return trendSeries.reduce(
      (best, cur) => (cur.sales > best.sales ? cur : best),
      { label: '–', sales: 0, orders: 0 },
    );
  }, [trendSeries]);

  const hourlySeries = useMemo(() => {
    const raw = chartsData?.hourly_sales || [];
    const maxSales = Math.max(...raw.map((r) => r.sales || 0), 1);
    return raw.map((r) => ({
      hour: r.hour,
      sales: r.sales || 0,
      orders: r.orders || 0,
      isPeak: (r.sales || 0) > 0 && (r.sales || 0) === maxSales,
    }));
  }, [chartsData?.hourly_sales]);

  const peakHour = useMemo(() => {
    return hourlySeries.find((h) => h.isPeak) || null;
  }, [hourlySeries]);

  const channels = useMemo(() => {
    const raw = chartsData?.order_types || [];
    const totalRevenue = raw.reduce((acc, item) => acc + (item.total || 0), 0);
    const totalCount = raw.reduce((acc, item) => acc + (item.count || 0), 0);
    return raw.map((item, idx) => ({
      label: formatChannelName(item.order_type),
      count: item.count || 0,
      total: item.total || 0,
      avgTicket:
        item.avg_ticket ?? (item.count > 0 ? item.total / item.count : 0),
      sharePct:
        totalRevenue > 0
          ? Math.round(((item.total || 0) / totalRevenue) * 100)
          : totalCount > 0
          ? Math.round(((item.count || 0) / totalCount) * 100)
          : 0,
      color: CHANNEL_COLORS[idx % CHANNEL_COLORS.length],
    }));
  }, [chartsData?.order_types]);

  const payments = useMemo(() => {
    const raw = chartsData?.payment_methods || [];
    const sum = raw.reduce((acc, p) => acc + (p.total || 0), 0);
    return raw.map((p, idx) => ({
      method: p.method || 'Outro',
      count: p.count || 0,
      total: p.total || 0,
      sharePct: sum > 0 ? Math.round(((p.total || 0) / sum) * 100) : 0,
      color: PAYMENT_COLORS[idx % PAYMENT_COLORS.length],
    }));
  }, [chartsData?.payment_methods]);

  const topItems = useMemo(() => {
    const raw = chartsData?.top_items || [];
    const maxAmount = Math.max(...raw.map((i) => i.total_amount || 0), 1);
    return raw.map((item, idx) => ({
      rank: idx + 1,
      name: item.item_name,
      group: item.item_group || 'Cardápio',
      qty: item.total_qty || 0,
      amount: item.total_amount || 0,
      widthPct: Math.max(6, Math.round(((item.total_amount || 0) / maxAmount) * 100)),
    }));
  }, [chartsData?.top_items]);

  if (loading && !chartsData) {
    return (
      <section aria-label="Análises operacionais" role="status" aria-busy="true" className="space-y-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7 rounded-xl border border-slate-200 bg-white p-6 shadow-sm motion-safe:animate-pulse space-y-4">
            <div className="h-5 w-52 rounded bg-slate-200" />
            <div className="h-60 w-full rounded-lg bg-slate-100" />
          </div>
          <div className="xl:col-span-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm motion-safe:animate-pulse space-y-4">
            <div className="h-5 w-48 rounded bg-slate-200" />
            <div className="h-60 w-full rounded-lg bg-slate-100" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Análises operacionais">
        <StateMessage
          variant="error"
          title="Não foi possível carregar os gráficos analíticos"
          description={error}
          actionLabel="Tentar novamente"
          onAction={onRetry}
          className="rounded-xl border border-slate-200 bg-white shadow-sm"
        />
      </section>
    );
  }

  if (!hasAnyPeriodSales) {
    return (
      <section aria-label="Análises operacionais">
        <StateMessage
          variant="empty"
          title={
            period === 'today'
              ? 'Nenhuma venda faturada hoje até o momento'
              : 'Nenhuma venda concluída no período selecionado'
          }
          description={
            period === 'today'
              ? 'Assim que pedidos forem pagos no PDV, os gráficos de evolução, canais de delivery, horários de pico e produtos aparecerão aqui. Você também pode consultar o histórico recente.'
              : 'Não há faturas pagas ou consolidadas para esta filial no intervalo escolhido.'
          }
          actionLabel={period !== '30d' && onSelectPeriod ? 'Ver últimos 30 dias' : 'Atualizar dados'}
          onAction={
            period !== '30d' && onSelectPeriod ? () => onSelectPeriod('30d') : onRetry
          }
          className="rounded-xl border border-slate-200 bg-white shadow-sm"
        />
      </section>
    );
  }

  return (
    <section aria-label="Análises operacionais" className="space-y-6">
      {/* Row 1: Sales/Orders Evolution + Delivery Channels Breakdown */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* 1. Sales & Volume Over Time */}
        <Card className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm xl:col-span-7">
          <CardHeader className="p-0 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                  Evolução de Vendas e Pedidos
                </CardTitle>
                <p className="text-xs text-slate-600 mt-0.5">
                  {period === 'today'
                    ? 'Faturamento e volume por faixa horária hoje'
                    : 'Desempenho diário de receita e pedidos concluídos'}
                  {peakTrendPoint.sales > 0
                    ? ` • Pico em ${peakTrendPoint.label} (${formatCurrency(peakTrendPoint.sales)})`
                    : ''}
                </p>
              </div>

              <div
                role="group"
                aria-label="Métrica do gráfico de evolução"
                className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200"
              >
                <button
                  type="button"
                  aria-pressed={trendMetric === 'sales'}
                  onClick={() => setTrendMetric('sales')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                    trendMetric === 'sales'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-700 hover:text-slate-900',
                  )}
                >
                  Receita (R$)
                </button>
                <button
                  type="button"
                  aria-pressed={trendMetric === 'orders'}
                  onClick={() => setTrendMetric('orders')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                    trendMetric === 'orders'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-700 hover:text-slate-900',
                  )}
                >
                  Pedidos
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 pt-2">
            {trendSeries.length === 0 ? (
              <div className="h-64 flex items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-600">
                Sem série temporal disponível para este período.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={trendSeries}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      minTickGap={14}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#475569' }}
                      tickLine={false}
                      axisLine={false}
                      width={trendMetric === 'sales' ? 68 : 36}
                      allowDecimals={false}
                      tickFormatter={(val: number) =>
                        trendMetric === 'sales' ? `R$ ${val}` : String(val)
                      }
                    />
                    <Tooltip
                      cursor={{ fill: '#F1F5F9' }}
                      contentStyle={{
                        borderRadius: '0.75rem',
                        borderColor: '#CBD5E1',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'sales') return [formatCurrency(value), 'Receita'];
                        return [`${value} pedido(s)`, 'Volume'];
                      }}
                      labelFormatter={(label) => `Período: ${label}`}
                    />
                    <Bar
                      dataKey={trendMetric}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                      fill={trendMetric === 'sales' ? '#2563EB' : '#0F766E'}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Sales Channels & Delivery Mix */}
        <Card className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm xl:col-span-5">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
              Canais de Venda e Delivery
            </CardTitle>
            <p className="text-xs text-slate-600 mt-0.5">
              Participação por canal, volume de pedidos e ticket médio
            </p>
          </CardHeader>

          <CardContent className="p-0 pt-2">
            {channels.length === 0 ? (
              <div className="h-56 flex items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-600">
                Sem vendas por canal neste período.
              </div>
            ) : (
              <div className="space-y-4">
                {channels.map((ch) => (
                  <div
                    key={ch.label}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ch.color }}
                          aria-hidden="true"
                        />
                        <span className="font-bold text-slate-900 truncate">
                          {ch.label}
                        </span>
                      </div>
                      <span className="font-extrabold text-slate-900 tabular-nums shrink-0">
                        {formatCurrency(ch.total)} ({ch.sharePct}%)
                      </span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(ch.sharePct, 4)}%`,
                          backgroundColor: ch.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
                      <span>{ch.count} pedido(s)</span>
                      <span>Ticket médio: {formatCurrency(ch.avgTicket)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Peak Hours + Top Products & Payment Methods */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* 3. Peak Hours */}
        <Card className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm xl:col-span-5">
          <CardHeader className="p-0 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                  Horários de Maior Movimento
                </CardTitle>
                <p className="text-xs text-slate-600 mt-0.5">
                  Concentração de receita por hora para dimensionar chapa e entregas
                </p>
              </div>
              {peakHour && (
                <Badge className="bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold tabular-nums">
                  Pico: {peakHour.hour} ({peakHour.orders} ped.)
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0 pt-2">
            {hourlySeries.length === 0 ? (
              <div className="h-56 flex items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-600">
                Sem horários registrados neste período.
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={hourlySeries}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#475569' }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                      tickFormatter={(v: number) => `R$ ${v}`}
                    />
                    <Tooltip
                      cursor={{ fill: '#F1F5F9' }}
                      contentStyle={{
                        borderRadius: '0.75rem',
                        borderColor: '#CBD5E1',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, _name, item) => [
                        `${formatCurrency(value)} (${item?.payload?.orders ?? 0} ped.)`,
                        'Movimento',
                      ]}
                      labelFormatter={(label) => `Faixa: ${label}`}
                    />
                    <Bar dataKey="sales" radius={[6, 6, 0, 0]} maxBarSize={32}>
                      {hourlySeries.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.isPeak ? '#D97706' : '#64748B'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Top Products + Payment Methods */}
        <Card className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm xl:col-span-7">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Top Selling Products */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Produtos Mais Vendidos
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Itens líderes em faturamento e quantidade vendida
                </p>
              </div>

              {topItems.length === 0 ? (
                <div className="h-44 flex items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-600">
                  Sem itens faturados neste período.
                </div>
              ) : (
                <div className="space-y-3">
                  {topItems.slice(0, 5).map((item) => (
                    <div key={`${item.rank}-${item.name}`} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-800 font-bold text-[11px] shrink-0 tabular-nums">
                            {item.rank}
                          </span>
                          <span className="font-semibold text-slate-900 truncate">
                            {item.name}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums shrink-0">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>

                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${item.widthPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                        <span className="truncate">{item.group}</span>
                        <span>{item.qty} un. vendida(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="md:col-span-5 md:border-s md:border-slate-100 md:ps-6 space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Meios de Pagamento
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Distribuição financeira recebida
                </p>
              </div>

              {payments.length === 0 ? (
                <div className="h-44 flex items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-600 text-center px-3">
                  Sem pagamentos liquidados neste período.
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((pm) => (
                    <div
                      key={pm.method}
                      className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-900 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: pm.color }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{pm.method}</span>
                        </span>
                        <span className="font-bold text-slate-900 tabular-nums shrink-0">
                          {pm.sharePct}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
                        <span>{formatCurrency(pm.total)}</span>
                        <span>{pm.count} fatura(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default AnalyticsCharts;
