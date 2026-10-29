import { useState, useEffect, useCallback } from 'react';
import { showToast, Button, Badge, Card, Spinner } from '@ury/ui';
import { call as frappeCall } from '@ury/core';
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
} from 'lucide-react';

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

function getElapsedMinutes(creation: string): number {
  const created = new Date(creation).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

function getOrderTypeInfo(orderType?: string) {
  switch (orderType) {
    case 'Delivery':
      return { label: 'Delivery', icon: Truck, color: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'Aggregators':
      return { label: 'App / iFood', icon: Globe, color: 'bg-red-100 text-red-800 border-red-200' };
    case 'Take Away':
      return { label: 'Retirada', icon: ShoppingBag, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'Phone In':
      return { label: 'Telefone / Whats', icon: Phone, color: 'bg-purple-100 text-purple-800 border-purple-200' };
    default:
      return { label: orderType || 'Pedido', icon: ShoppingBag, color: 'bg-gray-100 text-gray-800 border-gray-200' };
  }
}

export default function Kitchen() {
  const [activeTab, setActiveTab] = useState<'active' | 'served'>('active');
  const [kots, setKots] = useState<KotDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [alertTime, setAlertTime] = useState<number>(15);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [servingId, setServingId] = useState<string | null>(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('ALL');

  const fetchKots = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

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
    } catch (err) {
      console.error('Erro ao carregar KOTs da cozinha:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchKots(false);
    const interval = setInterval(() => {
      fetchKots(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchKots]);

  const toggleItemCheck = (kotName: string, itemIdx: number) => {
    const key = `${kotName}_${itemIdx}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleServeKot = async (kot: KotDoc) => {
    setServingId(kot.name);
    try {
      if (kot.type === 'Cancelled' || kot.type === 'Partially cancelled') {
        await frappeCall.post('ury.ury.api.ury_kot_display.confirm_cancel_kot', {
          name: kot.name,
        });
        showToast.success(`Cancelamento do pedido confirmado`);
      } else {
        await frappeCall.post('ury.ury.api.ury_kot_display.serve_kot', {
          name: kot.name,
        });
        showToast.success(`Pedido pronto / despachado!`);
      }
      setKots((prev) => prev.filter((k) => k.name !== kot.name));
    } catch (err: any) {
      console.error('Falha ao dar baixa no KOT:', err);
      showToast.error(err?.message || 'Erro ao atualizar status na cozinha');
    } finally {
      setServingId(null);
    }
  };

  const filteredKots = kots.filter((k) => {
    if (orderTypeFilter === 'ALL') return true;
    return k.order_type === orderTypeFilter;
  });

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Cozinha (KDS) — Péricles Burger</h1>
            <p className="text-xs text-gray-500">
              Acompanhamento de preparo em tempo real • Atualiza automaticamente
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-gray-100 p-1 border border-gray-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'active'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Em Preparo ({activeTab === 'active' ? kots.length : '…'})
            </button>
            <button
              onClick={() => setActiveTab('served')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'served'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Prontos / Despachados
            </button>
          </div>

          <div className="h-5 w-px bg-gray-200 mx-1 hidden sm:block" />

          {/* Order Type Filter */}
          <div className="flex items-center gap-1">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'Delivery', label: 'Delivery' },
              { id: 'Aggregators', label: 'Apps / iFood' },
              { id: 'Take Away', label: 'Retirada' },
            ].map((ft) => (
              <button
                key={ft.id}
                onClick={() => setOrderTypeFilter(ft.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  orderTypeFilter === ft.id
                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {ft.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchKots(true)}
            disabled={refreshing}
            className="ms-2 flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* KOT Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner message="Carregando comandas da cozinha..." />
          </div>
        ) : filteredKots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center bg-white rounded-xl border border-gray-200 p-8">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {activeTab === 'active'
                ? 'Nenhuma comanda pendente na chapa!'
                : 'Nenhum pedido finalizado nas últimas 3 horas'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              {activeTab === 'active'
                ? 'Assim que um pedido for lançado no PDV ou recebido de um app, ele aparecerá aqui instantaneamente.'
                : 'Os pedidos marcados como Prontos / Despachados aparecerão nesta aba.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
            {filteredKots.map((kot) => {
              const elapsed = getElapsedMinutes(kot.creation);
              const isDelayed = activeTab === 'active' && elapsed >= alertTime;
              const isCancelled =
                kot.type === 'Cancelled' || kot.type === 'Partially cancelled';
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
                  className={`flex flex-col rounded-xl border-2 shadow-xs overflow-hidden transition-all bg-white ${
                    isCancelled
                      ? 'border-red-400'
                      : isDelayed
                      ? 'border-amber-400 ring-2 ring-amber-200'
                      : isModified
                      ? 'border-orange-300'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className={`px-4 py-3 border-b flex items-center justify-between ${
                      isCancelled
                        ? 'bg-red-50 border-red-200'
                        : isDelayed
                        ? 'bg-amber-50 border-amber-200'
                        : isModified
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold text-gray-900">
                        {shortInvoice}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${typeInfo.color}`}
                      >
                        <TypeIcon className="w-3 h-3" />
                        {typeInfo.label}
                      </span>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                        isDelayed
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      {isDelayed ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      <span>{elapsed} min</span>
                    </div>
                  </div>

                  {/* Customer & Status Subheader */}
                  <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center justify-between text-xs text-gray-600">
                    <span className="font-semibold text-gray-800 truncate">
                      Cliente: {kot.customer_name || 'Balcão / Rápido'}
                    </span>
                    {isCancelled && (
                      <Badge className="bg-red-600 text-white text-[10px]">
                        CANCELADO
                      </Badge>
                    )}
                    {isModified && !isCancelled && (
                      <Badge className="bg-orange-500 text-white text-[10px]">
                        MODIFICADO
                      </Badge>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="p-4 divide-y divide-gray-100 space-y-2 flex-1">
                    {(kot.kot_items || []).map((item, idx) => {
                      const key = `${kot.name}_${idx}`;
                      const isChecked = !!checkedItems[key];

                      return (
                        <div
                          key={item.name || idx}
                          onClick={() => activeTab === 'active' && toggleItemCheck(kot.name, idx)}
                          className={`pt-2 first:pt-0 flex items-start gap-3 cursor-pointer select-none transition-opacity ${
                            isChecked ? 'opacity-45' : ''
                          }`}
                        >
                          {activeTab === 'active' && (
                            <div
                              className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                isChecked
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <span
                                className={`text-sm font-bold text-gray-900 ${
                                  isChecked || isCancelled ? 'line-through' : ''
                                }`}
                              >
                                {item.quantity}x {item.item_name}
                              </span>
                            </div>

                            {item.comments && (
                              <div className="mt-1 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900 flex items-start gap-1.5">
                                <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-amber-600" />
                                <span>Obs: {item.comments}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {kot.comments && (
                      <div className="pt-2">
                        <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-900">
                          <strong>Obs. do Pedido:</strong> {kot.comments}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Action */}
                  {activeTab === 'active' && (
                    <div className="p-3 bg-gray-50 border-t border-gray-100">
                      <Button
                        onClick={() => handleServeKot(kot)}
                        disabled={servingId === kot.name}
                        className={`w-full font-bold text-white shadow-xs ${
                          isCancelled
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {servingId === kot.name
                          ? 'Processando...'
                          : isCancelled
                          ? 'Confirmar Cancelamento'
                          : '✓ Pronto / Despachar'}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
