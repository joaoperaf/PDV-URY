import { useState, useEffect, useCallback, useMemo } from 'react';
import { showToast, Button, Badge, Card, StateMessage, cn } from '@ury/ui';
import { call as frappeCall, parseFrappeError } from '@ury/core';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Truck,
  ShoppingBag,
  Globe,
  Phone,
  MessageSquare,
  Check,
  Wifi,
  WifiOff,
  Ban,
} from 'lucide-react';
import { usePOSStore } from '../store/pos-store';
import { getProductionUnitsForBranch } from '../lib/production-api';
import { useKitchenRealtime } from '../lib/realtime';
import { getActiveLanguage, t } from '../i18n';

interface KotItem {
  name: string;
  item: string;
  item_name: string;
  quantity: number;
  cancelled_qty?: number;
  comments?: string;
  striked?: number;
}

interface KotDoc {
  name: string;
  invoice: string;
  customer_name?: string;
  order_type?: string;
  type: string;
  order_status: string;
  creation: string;
  time?: string;
  comments?: string;
  custom_ury_order_number?: string | number;
  kot_items: KotItem[];
}

const CHECK_STORAGE_PREFIX = 'ury_kds_check_';

function getItemCheckStorageKey(kotName: string, itemKey: string | number): string {
  return `${CHECK_STORAGE_PREFIX}${kotName}_${itemKey}`;
}

function readStoredItemCheck(kotName: string, itemKey: string | number): boolean {
  try {
    return localStorage.getItem(getItemCheckStorageKey(kotName, itemKey)) === '1';
  } catch {
    return false;
  }
}

function writeStoredItemCheck(kotName: string, itemKey: string | number, checked: boolean): void {
  try {
    const key = getItemCheckStorageKey(kotName, itemKey);
    if (checked) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    // Ignore storage quota errors
  }
}

function clearStoredChecksForKot(kotName: string): void {
  try {
    const prefix = `${CHECK_STORAGE_PREFIX}${kotName}_`;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Ignore storage errors
  }
}

function getElapsedMinutes(creation: string, nowMs: number): number {
  const created = new Date(creation).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((nowMs - created) / 60000));
}

function getOrderTypeInfo(orderType?: string) {
  switch (orderType) {
    case 'Delivery':
      return {
        label: t('kitchen.type_delivery'),
        icon: Truck,
        color: 'bg-blue-50 text-blue-900 border-blue-200',
      };
    case 'Aggregators':
      return {
        label: t('kitchen.type_aggregators'),
        icon: Globe,
        color: 'bg-rose-50 text-rose-900 border-rose-200',
      };
    case 'Take Away':
      return {
        label: t('kitchen.type_takeaway'),
        icon: ShoppingBag,
        color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      };
    case 'Phone In':
      return {
        label: t('kitchen.type_phone'),
        icon: Phone,
        color: 'bg-purple-50 text-purple-900 border-purple-200',
      };
    default:
      return {
        label: orderType || t('kitchen.type_default'),
        icon: ShoppingBag,
        color: 'bg-slate-100 text-slate-800 border-slate-200',
      };
  }
}

function formatSyncTime(timestamp: Date | null): string {
  if (!timestamp) return '';
  const locale = getActiveLanguage() || 'pt-BR';
  try {
    return timestamp.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp.toTimeString().slice(0, 5);
  }
}

function KitchenSkeletonGrid() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="space-y-4"
    >
      <p className="text-sm font-medium text-slate-600">{t('kitchen.loading')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm motion-safe:animate-pulse"
          >
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-14 rounded bg-slate-200" />
                <div className="h-5 w-20 rounded-full bg-slate-200" />
              </div>
              <div className="h-6 w-20 rounded bg-slate-200" />
            </div>
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <div className="h-4 w-36 rounded bg-slate-200" />
              <div className="h-4 w-16 rounded bg-slate-200" />
            </div>
            <div className="p-4 space-y-3">
              <div className="h-5 w-4/5 rounded bg-slate-200" />
              <div className="h-5 w-3/5 rounded bg-slate-200" />
              <div className="h-10 w-full rounded-lg bg-slate-100 mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Kitchen() {
  const { posProfile } = usePOSStore();
  const branch = posProfile?.branch || '';

  const [activeTab, setActiveTab] = useState<'active' | 'served'>('active');
  const [kots, setKots] = useState<KotDoc[]>([]);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [alertTime, setAlertTime] = useState<number>(15);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [servingId, setServingId] = useState<string | null>(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('ALL');
  const [productionUnits, setProductionUnits] = useState<string[]>([]);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!branch) {
      setProductionUnits([]);
      return;
    }
    let mounted = true;
    getProductionUnitsForBranch()
      .then((units) => {
        if (mounted) setProductionUnits(units);
      })
      .catch(() => {
        if (mounted) setProductionUnits([]);
      });
    return () => {
      mounted = false;
    };
  }, [branch]);

  const fetchKots = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setLoadError(null);
      } else {
        setRefreshing(true);
      }

      try {
        const endpoint =
          activeTab === 'active'
            ? 'ury.ury.api.ury_kot_display.kot_list'
            : 'ury.ury.api.ury_kot_display.served_kot_list';

        const res = await frappeCall.get(endpoint);
        const data = res?.message || res || {};
        const kotList: KotDoc[] = Array.isArray(data.KOT) ? data.KOT : [];
        if (data.kot_alert_time) {
          setAlertTime(Number(data.kot_alert_time) || 15);
        }
        setKots(kotList);
        if (activeTab === 'active') {
          setActiveCount(kotList.length);
        }
        setCheckedItems((prev) => {
          const next = { ...prev };
          kotList.forEach((kot) => {
            (kot.kot_items || []).forEach((item, idx) => {
              const itemKey = item.name || idx;
              const stateKey = `${kot.name}_${itemKey}`;
              if (!(stateKey in next)) {
                next[stateKey] = readStoredItemCheck(kot.name, itemKey);
              }
            });
          });
          return next;
        });
        setLoadError(null);
        setSyncError(null);
        setLastSyncedAt(new Date());
        setNowMs(Date.now());
      } catch (err) {
        console.error('Erro ao carregar KOTs da cozinha:', err);
        const parsedMessage = parseFrappeError(err, t('kitchen.error_desc'));
        if (!silent) {
          setLoadError(parsedMessage);
        } else {
          setSyncError(parsedMessage);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab],
  );

  const handleRealtimeUpdate = useCallback(() => {
    fetchKots(true);
  }, [fetchKots]);

  const { socketState, reconnectSocket } = useKitchenRealtime(
    branch,
    productionUnits,
    handleRealtimeUpdate,
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncError(null);
      reconnectSocket();
      fetchKots(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchKots, reconnectSocket]);

  useEffect(() => {
    fetchKots(false);
    const interval = window.setInterval(() => {
      if (navigator.onLine) {
        fetchKots(true);
      }
    }, 6000);
    return () => window.clearInterval(interval);
  }, [fetchKots]);

  const handleReconnect = useCallback(async () => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    await reconnectSocket();
    await fetchKots(kots.length > 0 && !loadError);
  }, [reconnectSocket, fetchKots, kots.length, loadError]);

  const toggleItemCheck = (kotName: string, itemKey: string | number) => {
    const stateKey = `${kotName}_${itemKey}`;
    setCheckedItems((prev) => {
      const nextChecked = !prev[stateKey];
      writeStoredItemCheck(kotName, itemKey, nextChecked);
      return { ...prev, [stateKey]: nextChecked };
    });
  };

  const handleServeKot = async (kot: KotDoc) => {
    setServingId(kot.name);
    try {
      const isCancelledKot =
        kot.type === 'Cancelled' || kot.type === 'Partially cancelled';
      if (isCancelledKot) {
        await frappeCall.post('ury.ury.api.ury_kot_display.confirm_cancel_kot', {
          name: kot.name,
        });
        showToast.success(t('kitchen.cancel_confirmed_toast'));
      } else {
        await frappeCall.post('ury.ury.api.ury_kot_display.serve_kot', {
          name: kot.name,
        });
        showToast.success(t('kitchen.served_toast'));
      }
      clearStoredChecksForKot(kot.name);
      setKots((prev) => {
        const next = prev.filter((k) => k.name !== kot.name);
        if (activeTab === 'active') {
          setActiveCount(next.length);
        }
        return next;
      });
    } catch (err) {
      console.error('Falha ao dar baixa no KOT:', err);
      showToast.error(parseFrappeError(err, t('kitchen.serve_error')));
    } finally {
      setServingId(null);
    }
  };

  const filteredKots = useMemo(() => {
    return kots.filter((k) => {
      if (orderTypeFilter === 'ALL') return true;
      return k.order_type === orderTypeFilter;
    });
  }, [kots, orderTypeFilter]);

  const isRealtimeDegraded =
    !isOnline ||
    Boolean(syncError) ||
    socketState === 'error' ||
    socketState === 'disconnected';

  const formattedSyncTime = formatSyncTime(lastSyncedAt);

  const filterOptions = useMemo(
    () => [
      { id: 'ALL', label: t('kitchen.filter_all') },
      { id: 'Delivery', label: t('kitchen.type_delivery') },
      { id: 'Aggregators', label: t('kitchen.filter_aggregators') },
      { id: 'Take Away', label: t('kitchen.type_takeaway') },
    ],
    [],
  );

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Top Operational Bar */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {t('kitchen.title')}
              </h1>
              <p className="text-xs text-slate-600 truncate">
                {t('kitchen.subtitle')}
              </p>
            </div>
          </div>

          {/* Connection & Sync Pill + Manual Refresh */}
          <div className="flex items-center gap-2 ms-auto">
            <div
              role="status"
              aria-live="polite"
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border tabular-nums',
                !isOnline
                  ? 'bg-red-50 text-red-900 border-red-200'
                  : isRealtimeDegraded
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200',
              )}
            >
              {!isOnline ? (
                <WifiOff className="w-3.5 h-3.5 text-red-700 shrink-0" aria-hidden="true" />
              ) : isRealtimeDegraded ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              )}
              <span>
                {!isOnline
                  ? t('kitchen.status_offline')
                  : isRealtimeDegraded
                  ? t('kitchen.status_degraded')
                  : t('kitchen.status_live')}
              </span>
              {formattedSyncTime && (
                <span className="hidden sm:inline text-current/80 font-medium">
                  • {formattedSyncTime}
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReconnect}
              disabled={refreshing || loading}
              className="min-h-10 px-3 flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw
                className={cn(
                  'w-3.5 h-3.5 shrink-0',
                  (refreshing || loading) && 'motion-safe:animate-spin',
                )}
                aria-hidden="true"
              />
              <span>{t('kitchen.refresh')}</span>
            </Button>
          </div>
        </div>

        {/* Tabs & Channel Filter Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div
            role="group"
            aria-label={t('kitchen.tabs_aria')}
            className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 self-start max-w-full"
          >
            <button
              type="button"
              aria-pressed={activeTab === 'active'}
              onClick={() => setActiveTab('active')}
              className={cn(
                'min-h-9 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                activeTab === 'active'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-700 hover:text-slate-900',
              )}
            >
              {t('kitchen.tab_active')} (
              {activeTab === 'active' ? kots.length : activeCount ?? '–'})
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'served'}
              onClick={() => setActiveTab('served')}
              className={cn(
                'min-h-9 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                activeTab === 'served'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-700 hover:text-slate-900',
              )}
            >
              {t('kitchen.tab_served')}
              {activeTab === 'served' ? ` (${kots.length})` : ''}
            </button>
          </div>

          <div
            role="group"
            aria-label={t('kitchen.channel_filter_aria')}
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full"
          >
            {filterOptions.map((ft) => (
              <button
                key={ft.id}
                type="button"
                aria-pressed={orderTypeFilter === ft.id}
                onClick={() => setOrderTypeFilter(ft.id)}
                className={cn(
                  'min-h-9 px-3 py-1.5 rounded-md text-xs font-medium border whitespace-nowrap transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                  orderTypeFilter === ft.id
                    ? 'bg-blue-50 text-blue-900 border-blue-300 font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                )}
              >
                {ft.label}
              </button>
            ))}
          </div>
        </div>

        {/* Degraded Connection / Sync Warning Banner (when showing cached KOTs or socket down) */}
        {(!loadError || kots.length > 0) && (!isOnline || Boolean(syncError)) && (
          <div
            role="alert"
            className={cn(
              'rounded-lg border px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs',
              !isOnline
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-amber-50 border-amber-200 text-amber-900',
            )}
          >
            <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
              {!isOnline ? (
                <WifiOff className="w-4 h-4 text-red-700 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="font-semibold">
                  {!isOnline
                    ? t('kitchen.banner_offline_title')
                    : t('kitchen.banner_sync_error_title')}
                </p>
                <p className="text-current/90 mt-0.5">
                  {!isOnline
                    ? t('kitchen.banner_offline_desc')
                    : syncError || t('kitchen.banner_sync_error_desc')}
                  {formattedSyncTime
                    ? ` (${t('kitchen.last_synced_at', { time: formattedSyncTime })})`
                    : ''}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleReconnect}
              disabled={refreshing}
              className="min-h-9 bg-white text-slate-900 border-slate-300 hover:bg-slate-50 font-semibold shrink-0"
            >
              {t('kitchen.reconnect_action')}
            </Button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6">
        {loading && kots.length === 0 ? (
          <KitchenSkeletonGrid />
        ) : loadError && kots.length === 0 ? (
          <StateMessage
            variant={isOnline ? 'error' : 'offline'}
            title={!isOnline ? t('kitchen.offline_title') : t('kitchen.error_title')}
            description={!isOnline ? t('kitchen.offline_desc') : loadError}
            actionLabel={t('common.retry')}
            onAction={handleReconnect}
            className="bg-white rounded-xl border border-slate-200 shadow-sm"
          />
        ) : kots.length > 0 && filteredKots.length === 0 ? (
          <StateMessage
            variant="empty"
            title={t('kitchen.empty_filter_title')}
            description={t('kitchen.empty_filter_desc')}
            actionLabel={t('kitchen.clear_filter')}
            onAction={() => setOrderTypeFilter('ALL')}
            className="bg-white rounded-xl border border-slate-200 shadow-sm"
          />
        ) : filteredKots.length === 0 ? (
          <StateMessage
            variant="empty"
            title={
              activeTab === 'active'
                ? t('kitchen.empty_active_title')
                : t('kitchen.empty_served_title')
            }
            description={
              !isOnline
                ? t('kitchen.empty_offline_desc')
                : activeTab === 'active'
                ? isRealtimeDegraded
                  ? t('kitchen.empty_degraded_desc')
                  : t('kitchen.empty_active_desc')
                : t('kitchen.empty_served_desc')
            }
            actionLabel={t('kitchen.refresh_now')}
            onAction={() => fetchKots(false)}
            className="bg-white rounded-xl border border-slate-200 shadow-sm"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start">
            {filteredKots.map((kot) => {
              const elapsed = getElapsedMinutes(kot.creation, nowMs);
              const isCancelled =
                kot.type === 'Cancelled' || kot.type === 'Partially cancelled';
              const isPartiallyCancelled = kot.type === 'Partially cancelled';
              const isDelayed =
                activeTab === 'active' && !isCancelled && elapsed >= alertTime;
              const isModified = kot.type === 'Order Modified';
              const typeInfo = getOrderTypeInfo(kot.order_type);
              const TypeIcon = typeInfo.icon;

              const shortInvoice = kot.custom_ury_order_number
                ? `#${kot.custom_ury_order_number}`
                : kot.invoice
                ? `#${kot.invoice.slice(-4)}`
                : kot.name;

              return (
                <Card
                  key={kot.name}
                  padding="none"
                  role="region"
                  aria-label={`${t('kitchen.order_card_aria', { number: shortInvoice })}`}
                  className={cn(
                    'flex flex-col rounded-xl border-2 shadow-sm overflow-hidden transition-colors bg-white',
                    isCancelled
                      ? 'border-red-400'
                      : isDelayed
                      ? 'border-amber-500 ring-2 ring-amber-200'
                      : isModified
                      ? 'border-orange-300'
                      : 'border-slate-200',
                  )}
                >
                  {/* Card Header */}
                  <div
                    className={cn(
                      'px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2',
                      isCancelled
                        ? 'bg-red-50 border-red-200'
                        : isDelayed
                        ? 'bg-amber-50 border-amber-200'
                        : isModified
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-slate-50 border-slate-200',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg font-extrabold text-slate-900 tabular-nums">
                        {shortInvoice}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
                          typeInfo.color,
                        )}
                      >
                        <TypeIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>{typeInfo.label}</span>
                      </span>
                    </div>

                    <div
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold tabular-nums',
                        isDelayed
                          ? 'bg-red-700 text-white motion-safe:animate-pulse'
                          : 'bg-white text-slate-800 border border-slate-200',
                      )}
                    >
                      {isDelayed ? (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
                      )}
                      <span>
                        {isDelayed
                          ? t('kitchen.delayed_time', { minutes: elapsed })
                          : t('kitchen.elapsed_minutes', { minutes: elapsed })}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Explicit Status Subheader */}
                  <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-800 truncate">
                      {t('kitchen.customer_prefix')}:{' '}
                      {kot.customer_name || t('kitchen.walkin_customer')}
                    </span>

                    {isCancelled ? (
                      <Badge className="bg-red-700 text-white text-[11px] font-bold shrink-0">
                        {isPartiallyCancelled
                          ? t('kitchen.badge_partial_cancel')
                          : t('kitchen.badge_cancelled')}
                      </Badge>
                    ) : isDelayed ? (
                      <Badge className="bg-amber-800 text-white text-[11px] font-bold shrink-0">
                        {t('kitchen.badge_delayed')}
                      </Badge>
                    ) : isModified ? (
                      <Badge className="bg-orange-700 text-white text-[11px] font-bold shrink-0">
                        {t('kitchen.badge_modified')}
                      </Badge>
                    ) : activeTab === 'served' ? (
                      <Badge className="bg-emerald-700 text-white text-[11px] font-bold shrink-0">
                        {t('kitchen.badge_served')}
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-800 text-white text-[11px] font-bold shrink-0">
                        {t('kitchen.badge_preparing')}
                      </Badge>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="p-3 sm:p-4 divide-y divide-slate-100 flex-1">
                    {(kot.kot_items || []).map((item, idx) => {
                      const itemKey = item.name || idx;
                      const stateKey = `${kot.name}_${itemKey}`;
                      const isChecked = !!checkedItems[stateKey];
                      const effectiveQty =
                        isCancelled && item.cancelled_qty
                          ? Math.max(0, item.quantity - item.cancelled_qty)
                          : item.quantity;

                      const itemContent = (
                        <>
                          {activeTab === 'active' && (
                            <span
                              aria-hidden="true"
                              className={cn(
                                'mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors',
                                isChecked
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 bg-white',
                              )}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </span>
                          )}

                          <span className="flex-1 min-w-0 block">
                            <span className="flex items-baseline justify-between gap-2">
                              <span
                                className={cn(
                                  'text-sm font-bold text-slate-900 tabular-nums',
                                  (isChecked || isCancelled) && 'line-through',
                                )}
                              >
                                {effectiveQty}x {item.item_name}
                              </span>
                            </span>

                            {item.comments && (
                              <span className="mt-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-xs font-medium text-amber-950 flex items-start gap-1.5">
                                <MessageSquare
                                  className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-800"
                                  aria-hidden="true"
                                />
                                <span>
                                  {t('kitchen.item_note_prefix')}: {item.comments}
                                </span>
                              </span>
                            )}
                          </span>
                        </>
                      );

                      if (activeTab === 'active') {
                        return (
                          <div key={itemKey} className="py-2 first:pt-0 last:pb-0">
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={isChecked}
                              onClick={() => toggleItemCheck(kot.name, itemKey)}
                              className={cn(
                                'w-full min-h-11 rounded-lg px-1.5 py-1.5 text-left flex items-start gap-3 select-none transition-opacity hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                                isChecked && 'opacity-55',
                              )}
                            >
                              {itemContent}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={itemKey}
                          className="py-2 first:pt-0 last:pb-0 flex items-start gap-3"
                        >
                          {itemContent}
                        </div>
                      );
                    })}

                    {kot.comments && (
                      <div className="pt-3 mt-1">
                        <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-950">
                          <strong>{t('kitchen.order_note_prefix')}:</strong> {kot.comments}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Action */}
                  {activeTab === 'active' && (
                    <div className="p-3 bg-slate-50 border-t border-slate-100">
                      <Button
                        type="button"
                        onClick={() => handleServeKot(kot)}
                        disabled={servingId === kot.name}
                        className={cn(
                          'w-full min-h-11 font-bold text-white shadow-sm flex items-center justify-center gap-2',
                          isCancelled
                            ? 'bg-red-700 hover:bg-red-800'
                            : 'bg-emerald-700 hover:bg-emerald-800',
                        )}
                      >
                        {servingId === kot.name ? (
                          <RefreshCw
                            className="w-4 h-4 motion-safe:animate-spin"
                            aria-hidden="true"
                          />
                        ) : isCancelled ? (
                          <Ban className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        )}
                        <span>
                          {servingId === kot.name
                            ? t('kitchen.processing')
                            : isCancelled
                            ? t('kitchen.confirm_cancel_action')
                            : t('kitchen.serve_action')}
                        </span>
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
