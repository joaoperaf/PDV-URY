import { TrendingUp, ShoppingCart, Clock, Users, AlertTriangle, Bell } from 'lucide-react';
import { Card, CardContent } from '@ury/ui';
import { useState, useEffect } from 'react';
import { usePOSStore } from '../store/pos-store';
import { formatCurrency, call } from '@ury/core';
import HufLogo from '../components/HufLogo';

// Helper function to format relative time
function getRelativeTime(creationDate: string): string {
  const now = new Date();
  const date = new Date(creationDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora mesmo';
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours} h`;
  return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
}

// Helper to format ETA minutes into readable time
function formatETA(minutes: number | null): string {
  if (minutes === null) return 'Estável';
  if (minutes <= 90) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `~${hours} h ${mins > 0 ? `${mins} min` : ''}`.trim();
}

export default function Dashboard() {
  const { posProfile } = usePOSStore();
  const [stats, setStats] = useState<any[]>([]);
  const [serviceLine, setServiceLine] = useState<any[]>([]);
  const [shiftMetrics, setShiftMetrics] = useState<any>(null);
  const [baseline, setBaseline] = useState<any>(null);
  const [floorLoad, setFloorLoad] = useState<any[]>([]);
  const [runningLow, setRunningLow] = useState<any[]>([]);
  const [needsAttention, setNeedsAttention] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [serviceLineLoading, setServiceLineLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [floorLoadLoading, setFloorLoadLoading] = useState(false);
  const [runningLowLoading, setRunningLowLoading] = useState(false);
  const [needsAttentionLoading, setNeedsAttentionLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [serviceLineError, setServiceLineError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [floorLoadError, setFloorLoadError] = useState<string | null>(null);
  const [runningLowError, setRunningLowError] = useState<string | null>(null);
  const [needsAttentionError, setNeedsAttentionError] = useState<string | null>(null);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  useEffect(() => {
    if (!posProfile?.branch) return;

    const fetchDashboardData = async () => {

      // Fetch dashboard stats
      setStatsLoading(true);
      setStatsError(null);
      try {
        const statsRes = await call.get('ury.ury.api.ury_dashboard.get_dashboard_stats', {
          branch: posProfile.branch
        });
        const statsData = statsRes.message;
        setStats([
          {
            label: "Vendas de Hoje",
            value: formatCurrency(statsData.todays_sales),
            icon: TrendingUp,
            color: 'text-green-600'
          },
          {
            label: 'Pedidos Hoje',
            value: String(statsData.orders_today),
            icon: ShoppingCart,
            color: 'text-blue-600'
          },
          {
            label: 'Ticket Médio',
            value: formatCurrency(statsData.avg_order_value),
            icon: Clock,
            color: 'text-purple-600'
          },
          {
            label: 'Mesas Ativas',
            value: `${statsData.active_tables} / ${statsData.total_tables}`,
            icon: Users,
            color: 'text-orange-600'
          }
        ]);
      } catch (err) {
        setStatsError('Falha ao carregar estatísticas');
        console.error('Error fetching stats:', err);
      } finally {
        setStatsLoading(false);
      }

      // Fetch service line
      setServiceLineLoading(true);
      setServiceLineError(null);
      try {
        const serviceRes = await call.get('ury.ury.api.ury_service_line.get_service_line', {
          branch: posProfile.branch
        });
        const serviceData = Array.isArray(serviceRes.message) ? serviceRes.message : [];
        setServiceLine(serviceData);
      } catch (err) {
        setServiceLineError('Failed to load service line');
        console.error('Error fetching service line:', err);
      } finally {
        setServiceLineLoading(false);
      }

      // Fetch shift metrics and baseline
      setMetricsLoading(true);
      setMetricsError(null);
      try {
        const metricsRes = await call.get('ury.ury.api.ury_dashboard.get_shift_metrics', {
          branch: posProfile.branch
        });
        setShiftMetrics(metricsRes.message);

        const baselineRes = await call.get('ury.ury.api.ury_dashboard.get_baseline', {
          branch: posProfile.branch
        });
        setBaseline(baselineRes.message);
      } catch (err) {
        setMetricsError('Failed to load metrics');
        console.error('Error fetching metrics:', err);
      } finally {
        setMetricsLoading(false);
      }

      // Fetch floor load
      setFloorLoadLoading(true);
      setFloorLoadError(null);
      try {
        const floorRes = await call.get('ury.ury.api.ury_dashboard.get_floor_load', {
          branch: posProfile.branch
        });
        const floorData = Array.isArray(floorRes.message) ? floorRes.message : [];
        setFloorLoad(floorData);
      } catch (err) {
        setFloorLoadError('Failed to load floor load');
        console.error('Error fetching floor load:', err);
      } finally {
        setFloorLoadLoading(false);
      }

      // Fetch running low items
      setRunningLowLoading(true);
      setRunningLowError(null);
      try {
        const runningRes = await call.get('ury.ury.api.ury_service_line.get_running_low', {
          branch: posProfile.branch
        });
        const runningData = Array.isArray(runningRes.message) ? runningRes.message : [];
        setRunningLow(runningData);
      } catch (err) {
        setRunningLowError('Failed to load running low items');
        console.error('Error fetching running low:', err);
      } finally {
        setRunningLowLoading(false);
      }

      // Fetch needs attention
      setNeedsAttentionLoading(true);
      setNeedsAttentionError(null);
      try {
        const attentionRes = await call.get('ury.ury.api.ury_dashboard.get_needs_attention', {
          branch: posProfile.branch
        });
        const attentionData = attentionRes.message;
        if (Array.isArray(attentionData) && attentionData.length > 0) {
          const processedAttention = attentionData.map((item, idx) => ({
            id: idx,
            message: item.message,
            icon: item.severity === 'high' ? AlertTriangle : Clock,
            severity: item.severity
          }));
          setNeedsAttention(processedAttention);
        } else {
          setNeedsAttention([]);
        }
      } catch (err) {
        setNeedsAttentionError('Failed to load needs attention');
        console.error('Error fetching needs attention:', err);
      } finally {
        setNeedsAttentionLoading(false);
      }

      // Fetch recent notifications
      setNotificationsLoading(true);
      setNotificationsError(null);
      try {
        const params = new URLSearchParams({
          doctype: 'Notification Log',
          fields: JSON.stringify(['name', 'subject', 'creation']),
          order_by: 'creation desc',
          limit_page_length: '10'
        });
        const notificationsRes = await fetch(
          `/api/method/frappe.client.get_list?${params.toString()}`
        );
        if (!notificationsRes.ok) throw new Error('Failed to fetch notifications');
        const notificationsData = await notificationsRes.json();
        const processedNotifications = (notificationsData.message || []).map((notif: any) => ({
          id: notif.name,
          message: notif.subject,
          timestamp: getRelativeTime(notif.creation)
        }));
        setNotifications(processedNotifications);
      } catch (err) {
        setNotificationsError('Failed to load notifications');
        console.error('Error fetching notifications:', err);
      } finally {
        setNotificationsLoading(false);
      }
    };

    fetchDashboardData();
  }, [posProfile?.branch]);

  // Calculate max minutes for service line bar height
  const maxMinutes = Math.max(90, ...serviceLine.filter(t => t.minutes !== null).map((t: any) => t.minutes), 1);
  const maxTableCount = Math.max(...floorLoad.map((f: any) => f.table_count), 1);

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50 space-y-6">
      {/* 1. Stat Cards Row (Aligned with Core UI & Icons Preserved) */}
      <section className="w-full">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsError ? (
            <div className="col-span-full text-red-600 text-sm">Falha ao carregar estatísticas</div>
          ) : statsLoading ? (
            <div className="col-span-full text-gray-600 text-sm">Carregando...</div>
          ) : (
            stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <Card
                  key={index}
                  className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/20"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-600">{stat.label}</span>
                    {IconComponent && <IconComponent className={`w-4 h-4 ${stat.color}`} />}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
                </Card>
              );
            })
          )}
        </div>
      </section>

      {/* 2. Service Line Section (v3-test design) */}
      <div>
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fila de Atendimento (Mesas)</h3>
            {serviceLineError ? (
              <p className="text-red-600 text-sm">Falha ao carregar fila de atendimento</p>
            ) : serviceLineLoading ? (
              <p className="text-gray-600 text-sm">Carregando...</p>
            ) : serviceLine.length === 0 ? (
              <p className="text-gray-600 text-sm">Nenhuma mesa ocupada no momento.</p>
            ) : (
              <div>
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-300 rounded"></div>
                    <span>Aberta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-300 rounded"></div>
                    <span>Ocupada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Em Preparo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-700 rounded"></div>
                    <span>Servida</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-600 rounded"></div>
                    <span>Tempo Excedido</span>
                  </div>
                </div>

                {/* Bars */}
                <div className="flex items-end gap-1 h-24 border-b border-gray-200 pb-2 overflow-x-auto">
                  {serviceLine.map((table: any, idx: number) => {
                    let barColor = 'bg-gray-300';
                    if (table.stage === 'open') barColor = 'bg-gray-300';
                    else if (table.stage === 'seated') barColor = 'bg-blue-300';
                    else if (table.stage === 'fired') barColor = 'bg-blue-500';
                    else if (table.stage === 'served') barColor = 'bg-blue-700';
                    else if (table.stage === 'over') barColor = 'bg-red-600';

                    const barHeight = table.minutes !== null ? (table.minutes / maxMinutes) * 100 : 5;

                    return (
                      <div key={idx} className="flex flex-col items-center flex-shrink-0">
                        {table.minutes !== null && (
                          <span className="text-xs text-gray-600 mb-1 h-4">{table.minutes}</span>
                        )}
                        <div
                          className={`w-8 ${barColor} rounded-t transition-all`}
                          style={{ height: `${barHeight}%`, minHeight: '4px' }}
                        />
                        <span className="text-xs text-gray-700 mt-1">{table.table}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                {serviceLine.filter((t: any) => t.stage === 'over').length > 0 && (
                  <div className="mt-3 text-sm text-red-600">
                    {serviceLine.filter((t: any) => t.stage === 'over').length} mesa{serviceLine.filter((t: any) => t.stage === 'over').length !== 1 ? 's' : ''} acima do tempo esperado
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Two-column layout (v3-test design) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left column - stacked sections */}
        <div className="space-y-6">
          {/* Needs Attention Section */}
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-900">Requer Atenção</h3>
              </div>
              <div className="space-y-3">
                {needsAttentionError ? (
                  <p className="text-red-600 text-sm">Falha ao carregar</p>
                ) : needsAttentionLoading ? (
                  <p className="text-gray-600 text-sm">Carregando...</p>
                ) : needsAttention.length === 0 ? (
                  <p className="text-gray-600 text-sm">Nenhum alerta no momento.</p>
                ) : (
                  needsAttention.map((item) => {
                    const ItemIcon = item.icon;
                    const severityColor = item.severity === 'high'
                      ? 'border-l-4 border-l-red-500 bg-red-50'
                      : 'border-l-4 border-l-amber-500 bg-amber-50';
                    return (
                      <div key={item.id} className={`p-3 rounded ${severityColor}`}>
                        <div className="flex items-center gap-3">
                          <ItemIcon className={`w-4 h-4 flex-shrink-0 ${item.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                          <p className="text-sm text-gray-700">{item.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tonight vs Baseline */}
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Desempenho do Turno vs Média</h3>
              {metricsError ? (
                <p className="text-red-600 text-sm">Falha ao carregar métricas</p>
              ) : metricsLoading ? (
                <p className="text-gray-600 text-sm">Carregando...</p>
              ) : !shiftMetrics || !baseline ? (
                <p className="text-gray-600 text-sm">Sem dados disponíveis</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Sales */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Vendas</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(shiftMetrics.sales)}</p>
                    {baseline.sample_days > 0 && (
                      <p className="text-xs mt-1">
                        <span className={shiftMetrics.sales >= baseline.median_sales ? 'text-green-600' : 'text-red-600'}>
                          {shiftMetrics.sales >= baseline.median_sales ? '+' : ''}{((shiftMetrics.sales - baseline.median_sales) / baseline.median_sales * 100).toFixed(0)}%
                        </span>
                        <span className="text-gray-600"> vs {formatCurrency(baseline.median_sales)}</span>
                      </p>
                    )}
                  </div>

                  {/* Covers */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Clientes Atendidos</p>
                    <p className="text-lg font-bold text-gray-900">{shiftMetrics.covers}</p>
                    {baseline.sample_days > 0 && (
                      <p className="text-xs mt-1">
                        <span className={shiftMetrics.covers >= baseline.median_covers ? 'text-green-600' : 'text-red-600'}>
                          {shiftMetrics.covers >= baseline.median_covers ? '+' : ''}{shiftMetrics.covers - baseline.median_covers}
                        </span>
                        <span className="text-gray-600"> vs {baseline.median_covers}</span>
                      </p>
                    )}
                  </div>

                  {/* Avg per Cover */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Média por Pessoa</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(shiftMetrics.avg_per_cover)}</p>
                  </div>

                  {/* Avg Ticket Time */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Tempo Médio do Pedido</p>
                    <p className="text-lg font-bold text-gray-900">
                      {shiftMetrics.avg_ticket_minutes !== null ? `${shiftMetrics.avg_ticket_minutes} min` : '—'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Running Low Section */}
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estoque Acabando</h3>
              {runningLowError ? (
                <p className="text-red-600 text-sm">Falha ao carregar</p>
              ) : runningLowLoading ? (
                <p className="text-gray-600 text-sm">Carregando...</p>
              ) : runningLow.length === 0 ? (
                <p className="text-gray-600 text-sm">Nenhum item com giro crítico no momento.</p>
              ) : (
                <div className="space-y-3">
                  {runningLow.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate">{item.item_name}</span>
                          <span className="text-xs text-gray-600 ml-2 flex-shrink-0">{formatETA(item.eta_minutes)}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${Math.min((item.remaining / (item.remaining + item.qty_sold_today)) * 100, 100)}%` }}
                          />
                        </div>
                        {item.data_quality_issue && (
                          <p className="text-xs text-gray-500 mt-1">(verificar dados de estoque)</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - narrow rail */}
        <div className="space-y-6">
          {/* Floor Load Section */}
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Carga por Garçom</h3>
              {floorLoadError ? (
                <p className="text-red-600 text-sm">Falha ao carregar</p>
              ) : floorLoadLoading ? (
                <p className="text-gray-600 text-sm">Carregando...</p>
              ) : floorLoad.length === 0 ? (
                <p className="text-gray-600 text-sm">Nenhuma mesa atribuída no momento.</p>
              ) : (
                <div className="space-y-3">
                  {floorLoad.map((waiter, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{waiter.waiter}</span>
                        <span className="text-xs text-gray-600">{waiter.table_count} mesa{waiter.table_count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${(waiter.table_count / maxTableCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shift Brief Section (with HUF Logo) */}
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Resumo do Turno</h3>
                <span className="inline-flex items-center justify-center px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded">
                  <HufLogo className="h-3.5 w-auto" />
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Resumos automáticos por IA ainda não estão conectados. Este painel exibirá as observações do turno quando integrado.
              </p>
            </CardContent>
          </Card>

          {/* Recent Notifications Section */}
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Notificações Recentes</h3>
              </div>
              <div className="space-y-2">
                {notificationsError ? (
                  <p className="text-red-600 text-sm">Falha ao carregar</p>
                ) : notificationsLoading ? (
                  <p className="text-gray-600 text-sm">Carregando...</p>
                ) : notifications.length === 0 ? (
                  <p className="text-gray-600 text-sm">Nenhuma notificação recente.</p>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <p className="text-xs text-gray-700">{notification.message}</p>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0 whitespace-nowrap">{notification.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
