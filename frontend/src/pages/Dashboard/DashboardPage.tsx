import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Badge, cn } from '@ury/ui';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { useBranchContext } from '../../context/BranchContext';
import KPIGrid from './KPIGrid';
import AnalyticsCharts from './AnalyticsCharts';
import ReportWidgets from './ReportWidgets';
import {
  dashboardService,
  DashboardAlert,
  DashboardSummary,
  DashboardChartsData,
  DashboardPeriod,
  TransactionRecord,
} from '../../services/dashboard';

const PERIOD_OPTIONS: Array<{ id: DashboardPeriod; label: string }> = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
];

export const DashboardPage: React.FC = () => {
  const { activeBranchId, activeBranch } = useBranchContext();

  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState<boolean>(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [chartsData, setChartsData] = useState<DashboardChartsData | null>(null);
  const [chartsLoading, setChartsLoading] = useState<boolean>(true);
  const [chartsError, setChartsError] = useState<string | null>(null);

  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);
  const [txLoading, setTxLoading] = useState<boolean>(true);
  const [txError, setTxError] = useState<string | null>(null);

  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const data = await dashboardService.getAlerts(activeBranchId);
      setAlerts(data);
    } catch (err) {
      setAlertsError(
        err instanceof Error ? err.message : 'Falha ao consultar alertas operacionais.',
      );
    } finally {
      setAlertsLoading(false);
    }
  }, [activeBranchId]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await dashboardService.getSummary(activeBranchId, period);
      setSummary(data);
    } catch (err) {
      setSummaryError(
        err instanceof Error ? err.message : 'Falha ao carregar indicadores.',
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [activeBranchId, period]);

  const fetchCharts = useCallback(async () => {
    setChartsLoading(true);
    setChartsError(null);
    try {
      const data = await dashboardService.getCharts(activeBranchId, period);
      setChartsData(data);
    } catch (err) {
      setChartsError(
        err instanceof Error ? err.message : 'Falha ao carregar gráficos analíticos.',
      );
    } finally {
      setChartsLoading(false);
    }
  }, [activeBranchId, period]);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    setTxError(null);
    try {
      const data = await dashboardService.getRecentTransactions(activeBranchId, 10);
      setRecentTransactions(data);
    } catch (err) {
      setTxError(
        err instanceof Error ? err.message : 'Falha ao carregar transações recentes.',
      );
    } finally {
      setTxLoading(false);
    }
  }, [activeBranchId]);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      fetchAlerts(),
      fetchSummary(),
      fetchCharts(),
      fetchTransactions(),
    ]);
    setLastUpdatedAt(new Date());
  }, [fetchAlerts, fetchSummary, fetchCharts, fetchTransactions]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const isAnyLoading = alertsLoading || summaryLoading || chartsLoading || txLoading;
  const branchDisplayName =
    activeBranchId === 'all'
      ? 'Todas as Filiais'
      : activeBranch?.name || activeBranchId;

  const updatedLabel = lastUpdatedAt
    ? lastUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Operational Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Painel Operacional
            </h1>
            <Badge className="bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>{branchDisplayName}</span>
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Alertas da operação, desempenho de vendas, canais de delivery e movimentações recentes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Selecionar período de análise"
            className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={period === opt.id}
                onClick={() => setPeriod(opt.id)}
                className={cn(
                  'min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                  period === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-700 hover:text-slate-900',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={isAnyLoading}
            className="min-h-10 px-3.5 flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', isAnyLoading && 'motion-safe:animate-spin')}
              aria-hidden="true"
            />
            <span>Atualizar</span>
            {updatedLabel && (
              <span className="hidden lg:inline text-slate-500 font-normal tabular-nums">
                • {updatedLabel}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 1. Actionable Operational Alerts First (Issue #16 Hierarchy #1) */}
      <section aria-label="Alertas operacionais">
        {alertsLoading && alerts.length === 0 && !alertsError ? (
          <div
            role="status"
            aria-busy="true"
            className="h-14 rounded-xl border border-slate-200 bg-white px-4 flex items-center motion-safe:animate-pulse"
          >
            <div className="h-4 w-64 rounded bg-slate-200" />
          </div>
        ) : alertsError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-red-950"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
              <span>{alertsError}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={fetchAlerts}
              className="bg-white text-slate-900 border-slate-300"
            >
              Tentar novamente
            </Button>
          </div>
        ) : alerts.length > 0 ? (
          <div className="space-y-2.5">
            {alerts.map((alert) => {
              const isHigh = alert.severity === 'high';
              return (
                <div
                  key={alert.id}
                  role="alert"
                  className={cn(
                    'rounded-xl border px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs',
                    isHigh
                      ? 'bg-red-50 border-red-200 text-red-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950',
                  )}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <AlertTriangle
                      className={cn(
                        'w-5 h-5 shrink-0 mt-0.5 sm:mt-0',
                        isHigh ? 'text-red-700' : 'text-amber-800',
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase',
                            isHigh
                              ? 'bg-red-700 text-white'
                              : 'bg-amber-800 text-white',
                          )}
                        >
                          {isHigh ? 'Urgente' : 'Atenção'}
                        </span>
                        <p className="text-xs sm:text-sm font-bold">{alert.title}</p>
                      </div>
                      <p className="text-xs opacity-90 mt-0.5">{alert.description}</p>
                    </div>
                  </div>

                  {alert.is_external ? (
                    <a
                      href={alert.action_href}
                      className="min-h-9 px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <span>{alert.action_label}</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link
                      to={alert.action_href}
                      className="min-h-9 px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <span>{alert.action_label}</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-emerald-950"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span className="font-semibold">
                Operação sem pendências críticas no momento — KDS, turnos de caixa e integrações em dia.
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <a href="/pos/pos" className="text-emerald-900 hover:underline">
                Ir ao PDV
              </a>
              <span aria-hidden="true" className="text-emerald-400">•</span>
              <Link to="/reports" className="text-emerald-900 hover:underline">
                Relatórios
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 2 & 3. Period KPIs & Operational Queue */}
      <KPIGrid
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
        onRetry={fetchSummary}
      />

      {/* 4 & 5. Operational Analytics (Sales/Orders Trend, Channels, Peak Hours, Top Items & Payments) */}
      <AnalyticsCharts
        chartsData={chartsData}
        loading={chartsLoading}
        error={chartsError}
        period={period}
        onRetry={fetchCharts}
        onSelectPeriod={setPeriod}
      />

      {/* 6. Recent POS Transactions */}
      <ReportWidgets
        recentTransactions={recentTransactions}
        loading={txLoading}
        error={txError}
        onRetry={fetchTransactions}
      />
    </div>
  );
};

export default DashboardPage;
