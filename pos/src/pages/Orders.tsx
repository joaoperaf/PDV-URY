import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Clock,
  User,
  UserCheck,
  Receipt,
  Printer,
  Pencil,
  Ban,
  X,
  GitBranch,
  GitMerge,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Spinner,
  StateMessage,
  Textarea,
  cn,
  showToast,
} from '@ury/ui';
import OrderStatusSidebar from '../components/OrderStatusSidebar';
import { useRootStore } from '../store/root-store';
import { call, formatCurrency, parseFrappeError } from '@ury/core';
import { usePOSStore } from '../store/pos-store';
import { useNavigate } from 'react-router-dom';
import PaymentDialog from '../components/PaymentDialog';
import BillSplitDialog from '../components/BillSplitDialog';
import BillMergeDialog from '../components/BillMergeDialog';
import OrderActionsMenu from '../components/OrderActionsMenu';
import SplitGroupPanel from '../components/SplitGroupPanel';
import MergedBillPanel from '../components/MergedBillPanel';
import { printOrder } from '../lib/print';
import { splitBill } from '../lib/order-api';
import {
  getOrdersTabForInvoice,
  getSplitGroup,
  getCombinedOrderTotals,
  isMergedBill,
  resolvePrintFormat,
  mapSplitGroupInvoiceToPOSInvoice,
  type POSInvoice,
  type SplitGroupInvoice,
} from '../lib/invoice-api';
import { getOrderStatusTypes, type OrderStatusType } from '../data/order-types';
import { formatMergedTableLabel } from '../lib/table-utils';
import { getActiveLanguage, t } from '../i18n';

function getOrderTableLabel(order: Pick<POSInvoice, 'restaurant_table' | 'custom_merged_tables'>) {
  if (!order.restaurant_table) return null;
  return formatMergedTableLabel(order.restaurant_table, order.custom_merged_tables);
}

function isOrderEditable(status: string) {
  return status === 'Draft' || status === 'Unbilled' || status === 'Recently Paid';
}

function isSplitBill(order: Pick<POSInvoice, 'split_total' | 'custom_split_group' | 'custom_split_from'>) {
  return (
    (order.split_total ?? 0) >= 2 ||
    !!order.custom_split_group ||
    !!order.custom_split_from
  );
}

export default function Orders() {
  const {
    orders,
    orderLoading,
    error,
    selectedStatus,
    pagination,
    selectedOrder,
    selectedOrderItems,
    selectedOrderTaxes,
    selectedOrderLoading,
    selectedOrderError,
    fetchOrders,
    setSelectedStatus,
    goToNextPage,
    goToPreviousPage,
    selectOrder,
    clearSelectedOrder,
    orderSearchQuery,
    setOrderSearchQuery,
  } = useRootStore();

  const posStore = usePOSStore();
  const navigate = useNavigate();
  const mounted = useRef(false);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const orderCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastSelectedOrderNameRef = useRef<string | null>(null);

  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [cancelLoading, setCancelLoading] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = React.useState(false);
  const [showSplitDialog, setShowSplitDialog] = React.useState(false);
  const [showMergeDialog, setShowMergeDialog] = React.useState(false);
  const [orderActionsMenuOpen, setOrderActionsMenuOpen] = React.useState(false);
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [canCancelInvoice, setCanCancelInvoice] = React.useState(false);

  const statusTypes = useMemo(
    () => getOrderStatusTypes(posStore.posProfile?.view_all_status, posStore.posProfile?.paid_limit),
    [posStore.posProfile?.view_all_status, posStore.posProfile?.paid_limit]
  );

  React.useEffect(() => {
    if (selectedOrder?.name) {
      lastSelectedOrderNameRef.current = selectedOrder.name;
      call
        .get('frappe.client.has_permission', {
          doctype: 'POS Invoice',
          docname: selectedOrder.name,
          perm_type: 'cancel',
        })
        .then((res: any) => {
          setCanCancelInvoice(res?.message?.has_permission === true);
        })
        .catch(() => {
          setCanCancelInvoice(false);
        });
    } else {
      setCanCancelInvoice(false);
    }
  }, [selectedOrder?.name]);

  const handleCloseDetail = useCallback(() => {
    const previousName = lastSelectedOrderNameRef.current;
    clearSelectedOrder();
    if (previousName) {
      requestAnimationFrame(() => {
        orderCardRefs.current[previousName]?.focus();
      });
    }
  }, [clearSelectedOrder]);

  const hasSubModalOpen =
    cancelDialogOpen ||
    showPaymentDialog ||
    showSplitDialog ||
    showMergeDialog ||
    orderActionsMenuOpen;

  // Manage focus and Escape dismissal when detail panel acts as a drawer/sheet (< lg)
  useEffect(() => {
    if (!selectedOrder || window.innerWidth >= 1024) return;
    detailPanelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !hasSubModalOpen) {
        e.preventDefault();
        handleCloseDetail();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedOrder, hasSubModalOpen, handleCloseDetail]);

  const canSplitBill = useMemo(() => {
    if (!selectedOrder || selectedOrderItems.length === 0) return false;

    const hasSplittableItems =
      selectedOrderItems.length >= 2 ||
      selectedOrderItems.some((item) => item.qty > 1);
    if (!hasSplittableItems) return false;

    const invoicePrinted = String(selectedOrder.invoice_printed);
    return invoicePrinted === '0' || invoicePrinted === '1';
  }, [selectedOrder, selectedOrderItems]);

  const isSecondaryMergedBill = useMemo(() => {
    if (!selectedOrder) return false;
    return orders.some((order) => order.custom_merged_pos_invoice === selectedOrder.name);
  }, [orders, selectedOrder]);

  const canMergeBill = useMemo(() => {
    if (!selectedOrder || selectedOrderItems.length === 0) return false;
    if (!isOrderEditable(selectedOrder.status)) return false;
    if (isMergedBill(selectedOrder)) return false;
    if (isSecondaryMergedBill) return false;
    return true;
  }, [selectedOrder, selectedOrderItems, isSecondaryMergedBill]);

  const selectedOrderTotals = useMemo(() => {
    if (!selectedOrder) {
      return { grandTotal: 0, roundedTotal: 0 };
    }
    return getCombinedOrderTotals(selectedOrder);
  }, [selectedOrder]);

  useEffect(() => {
    setOrderActionsMenuOpen(false);
  }, [selectedOrder?.name]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderSearchQuery]);

  const formatDateTime = (date: string, time: string) => {
    const isoCandidate = new Date(`${date}T${time}`);
    const spaceCandidate = new Date(`${date} ${time}`);
    const validDate = !Number.isNaN(isoCandidate.getTime()) ? isoCandidate : spaceCandidate;
    if (Number.isNaN(validDate.getTime())) {
      return `${date} ${time}`.trim();
    }
    const lang = getActiveLanguage() || 'pt-BR';
    return validDate.toLocaleString(lang, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleOrderClick = (order: POSInvoice) => {
    void selectOrder(order);
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'Draft':
      case 'Unbilled':
        return 'danger';
      case 'Dispatched':
        return 'warning';
      case 'Recently Paid':
      case 'Paid':
      case 'Consolidated':
        return 'success';
      case 'Return':
        return 'destructive';
      case 'Cancelled':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getDisplayedStatus = (order: POSInvoice) =>
    (order.status === 'Draft' || order.status === 'Unbilled') &&
    order.operational_status === 'Dispatched'
      ? 'Dispatched'
      : order.status;

  async function handleCancelOrder() {
    if (!selectedOrder) return;
    if (!cancelReason.trim()) {
      showToast.error(t('errors.enter_cancel_reason'));
      return;
    }
    setCancelLoading(true);
    try {
      await call.post('ury.ury.doctype.ury_order.ury_order.cancel_order', {
        invoice_id: selectedOrder.name,
        reason: cancelReason,
      });
      showToast.success(t('success.order_cancelled'));
      setCancelDialogOpen(false);
      setCancelReason('');
      clearSelectedOrder();
      await fetchOrders();
    } catch (err) {
      showToast.error(parseFrappeError(err, t('errors.failed_cancel_order')));
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleEditOrder() {
    if (!selectedOrder) return;
    setEditLoading(true);
    try {
      const res = await fetch(
        `/api/method/frappe.client.get?doctype=POS+Invoice&name=${encodeURIComponent(selectedOrder.name)}`
      );
      if (!res.ok) throw new Error('Failed to fetch order details');
      const data = await res.json();
      const order = data.message;

      const items = (order.items || []).map((item: any) => ({
        id: item.item_code,
        name: item.item_name,
        price: item.rate,
        quantity: item.qty,
        amount: item.amount,
        image: item.image || null,
        uniqueId: item.name,
        item: item.item_code,
        item_name: item.item_name,
        item_image: null,
        course: '',
        description: item.description || '',
        special_dish: 0,
        tax_rate: 0,
      }));

      posStore.openDraftOrderInNewTab({
        orderId: order.name,
        orderType: order.order_type,
        customer: {
          id: order.customer,
          name: order.customer_name,
          phone: order.mobile_number,
        },
        table: order.restaurant_table || null,
        room: order.custom_restaurant_room || null,
        items,
      });

      navigate('/pos');
    } catch (err) {
      showToast.error(parseFrappeError(err, t('errors.failed_edit_order')));
    } finally {
      setEditLoading(false);
    }
  }

  async function handlePrintOrder() {
    if (!selectedOrder || !posStore.posProfile) return;
    setIsPrinting(true);
    try {
      await printOrder({
        orderId: selectedOrder.name,
        posProfile: posStore.posProfile,
        printFormat: resolvePrintFormat(selectedOrder, posStore.posProfile.print_format),
      });
      showToast.success(t('success.printed'));
      if (selectedOrder && typeof selectedOrder === 'object') {
        void selectOrder({ ...selectedOrder, invoice_printed: 1 });
      }
      if (selectedStatus === 'Unbilled') {
        showToast.info(t('success.order_moved_to_draft'));
        await setSelectedStatus('Draft');
        await fetchOrders();
      }
    } catch (err: any) {
      showToast.error(t('errors.print_failed', { reason: err?.message || String(err) }));
    } finally {
      setIsPrinting(false);
    }
  }

  async function handleSplitBill(payload: {
    itemsToMove: Array<{ name: string; qty: number }>;
    customer?: string;
  }) {
    if (!selectedOrder) return;
    const result = await splitBill(selectedOrder.name, payload.itemsToMove, payload.customer);
    showToast.success(t('bill_split.split_success', { invoice: result.new_invoice }));

    const childOnUnbilledTab =
      !!selectedOrder.restaurant_table && String(selectedOrder.invoice_printed) === '1';

    if (childOnUnbilledTab) {
      await setSelectedStatus('Unbilled');
    } else {
      await fetchOrders();
    }

    const splitGroup = await getSplitGroup(result.new_invoice).catch(() => null);
    if (splitGroup?.invoices?.length) {
      const enriched = new Map(
        splitGroup.invoices.map((inv) => [inv.name, mapSplitGroupInvoiceToPOSInvoice(inv)])
      );
      useRootStore.setState((state) => ({
        orders: state.orders.map((o) => enriched.get(o.name) ?? o),
      }));
    }

    const newInvoice = splitGroup?.invoices.find((inv) => inv.name === result.new_invoice);
    if (newInvoice) {
      await selectOrder(mapSplitGroupInvoiceToPOSInvoice(newInvoice));
      return;
    }

    const newOrder = useRootStore.getState().orders.find((o) => o.name === result.new_invoice);
    if (newOrder) {
      await selectOrder(newOrder);
    }
  }

  async function handleMergeBill() {
    if (!selectedOrder) return;
    await fetchOrders();
    const updated = useRootStore.getState().orders.find((o) => o.name === selectedOrder.name);
    if (updated) {
      await selectOrder(updated);
    }
  }

  async function openSecondaryInvoice(invoiceName: string) {
    const inList = orders.find((o) => o.name === invoiceName);
    if (inList) {
      await selectOrder(inList);
      return;
    }
    await fetchOrders();
    const refreshed = useRootStore.getState().orders.find((o) => o.name === invoiceName);
    if (refreshed) {
      await selectOrder(refreshed);
    }
  }

  async function openRelatedInvoice(sibling: SplitGroupInvoice) {
    const tab = getOrdersTabForInvoice(sibling, {
      paidLimit: posStore.posProfile?.paid_limit,
      viewAllStatus: posStore.posProfile?.view_all_status,
    });

    if (tab !== selectedStatus) {
      await setSelectedStatus(tab);
    }

    const inList = useRootStore.getState().orders.find((o) => o.name === sibling.name);
    await selectOrder(inList ?? mapSplitGroupInvoiceToPOSInvoice(sibling));
  }

  const hasActiveSearch = Boolean(orderSearchQuery && orderSearchQuery.trim());

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar - Order Statuses (>= md) */}
      <OrderStatusSidebar
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
      />

      {/* Middle Section - Mobile Status Strip + Order Cards */}
      <div className="flex-1 flex flex-col h-full overflow-hidden lg:pe-96">
        {/* Status strip (< md): horizontal scrollable tabs */}
        <div
          className="md:hidden flex shrink-0 gap-2 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2"
          role="tablist"
          aria-label={t('orders.status_title')}
        >
          {statusTypes.map((status) => {
            const active = selectedStatus === status.value;
            return (
              <button
                key={status.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  void setSelectedStatus(status.value as OrderStatusType);
                }}
                className={cn(
                  'shrink-0 min-h-11 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {t(`order_status_types.${status.value.toLowerCase().replace(/ /g, '_')}`)}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-32">
          {orderLoading ? (
            <div className="flex items-center justify-center h-96">
              <Spinner message={t('common.loading')} />
            </div>
          ) : error ? (
            <StateMessage
              variant="error"
              title={t('orders.error_loading')}
              description={error}
              actionLabel={t('common.retry')}
              onAction={() => {
                void fetchOrders(pagination.currentPage);
              }}
              className="h-96"
            />
          ) : orders.length === 0 ? (
            <StateMessage
              variant="empty"
              title={t('orders.no_orders_found')}
              description={
                hasActiveSearch
                  ? t('orders.no_orders_search_hint', { query: orderSearchQuery.trim() })
                  : t('orders.no_orders_status_hint')
              }
              actionLabel={hasActiveSearch ? t('orders.clear_search') : t('orders.refresh')}
              onAction={() => {
                if (hasActiveSearch) {
                  setOrderSearchQuery('');
                } else {
                  void fetchOrders(1);
                }
              }}
              className="h-96"
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4 max-w-screen-xl mx-auto">
              {orders.map((order) => {
                const splitBill = isSplitBill(order);
                const mergedBill = isMergedBill(order);
                const isSelected = selectedOrder?.name === order.name;
                const tableLabel = getOrderTableLabel(order);
                const cardTotal = mergedBill
                  ? order.rounded_total + Math.round(order.custom_merged_total ?? 0)
                  : order.rounded_total;

                return (
                  <Card
                    key={order.name}
                    ref={(el) => {
                      orderCardRefs.current[order.name] = el;
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={() => handleOrderClick(order)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOrderClick(order);
                      }
                    }}
                    className={cn(
                      'p-0 bg-white hover:shadow-md transition-shadow flex flex-col overflow-hidden cursor-pointer',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                      isSelected && 'ring-2 ring-blue-600 shadow-md',
                      (splitBill || mergedBill) && 'border-primary-300'
                    )}
                  >
                    <CardContent className="p-0 flex flex-col h-full">
                      <div
                        className={cn(
                          'p-3 border-b',
                          splitBill || mergedBill ? 'bg-primary-50/40' : 'bg-gray-50'
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <h3
                            className="font-semibold text-gray-900 text-sm truncate"
                            title={order.name}
                          >
                            {order.name}
                          </h3>
                          <div className="flex shrink-0 items-center gap-1">
                            {mergedBill && (
                              <Badge
                                variant="outline"
                                className="shrink-0 gap-1 border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-50"
                              >
                                <GitMerge className="h-3 w-3" aria-hidden="true" />
                                {t('bill_merge.merged_bill')}
                              </Badge>
                            )}
                            {splitBill && (
                              <Badge
                                variant="outline"
                                className="shrink-0 gap-1 border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-50"
                              >
                                <GitBranch className="h-3 w-3" aria-hidden="true" />
                                {(order.split_total ?? 0) >= 2
                                  ? t('bill_split.split_indicator', {
                                      index: order.split_index ?? 0,
                                      total: order.split_total ?? 0,
                                    })
                                  : t('bill_split.split_bill')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-gray-600 truncate">
                              {tableLabel
                                ? `${t('orders.table_prefix', { table: tableLabel })} • `
                                : ''}
                              {t(`order_types.${order.order_type.toLowerCase().replace(/ /g, '_')}`)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Badge variant={getBadgeVariant(getDisplayedStatus(order))}>
                              {t(
                                `order_status_types.${getDisplayedStatus(order)
                                  .toLowerCase()
                                  .replace(/ /g, '_')}`
                              )}
                            </Badge>
                          </div>
                        </div>
                        {mergedBill && order.custom_merged_pos_invoice && (
                          <p className="mt-2 text-xs text-primary-700">
                            {t('bill_merge.includes_bill', {
                              invoice: order.custom_merged_pos_invoice,
                            })}
                          </p>
                        )}
                        {splitBill && order.custom_split_from && (
                          <p className="mt-2 text-xs text-primary-700">
                            {t('bill_split.split_from', { invoice: order.custom_split_from })}
                          </p>
                        )}
                      </div>

                      <div className="flex-1 p-3 flex flex-col gap-1.5">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {order.customer}
                        </p>

                        <div className="flex items-center gap-1.5 text-xs text-gray-500 tabular-nums">
                          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{formatDateTime(order.posting_date, order.posting_time)}</span>
                        </div>

                        <div className="mt-auto pt-2 flex items-baseline justify-between">
                          <span className="text-base font-bold text-gray-950 tabular-nums">
                            {formatCurrency(cardTotal)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {!orderLoading && !error && (orders.length > 0 || pagination.currentPage > 1) && (
            <div className="py-5">
              <div className="flex justify-center items-center gap-x-4 max-w-screen-xl mx-auto">
                <Button
                  type="button"
                  onClick={() => {
                    void goToPreviousPage();
                  }}
                  disabled={pagination.currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="min-w-24"
                >
                  {t('orders.pagination.previous')}
                </Button>
                <span className="text-sm font-medium text-muted-foreground tabular-nums">
                  {t('orders.pagination.page', { number: pagination.currentPage.toString() })}
                </span>
                <Button
                  type="button"
                  onClick={() => {
                    void goToNextPage();
                  }}
                  disabled={!pagination.hasNextPage}
                  variant="outline"
                  size="sm"
                  className="min-w-24"
                >
                  {t('orders.pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop (< lg) when an order is open in drawer/bottom-sheet */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={handleCloseDetail}
          aria-hidden="true"
        />
      )}

      {/* Right Section - Order Details (fixed panel on lg+, drawer on md, bottom sheet on mobile) */}
      <aside
        ref={detailPanelRef}
        tabIndex={-1}
        aria-label={selectedOrder ? selectedOrder.name : t('order.select_to_view')}
        className={cn(
          'bg-white border-gray-200 flex-col outline-none z-[45]',
          // Mobile: bottom sheet
          'fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t shadow-2xl',
          // Tablet: right drawer
          'md:inset-x-auto md:end-0 md:top-16 md:bottom-0 md:max-h-none md:w-96 md:rounded-none md:border-t-0 md:border-s',
          // Desktop: permanent panel
          'lg:bottom-16 lg:z-10 lg:shadow-none lg:flex',
          selectedOrder ? 'flex' : 'hidden lg:flex'
        )}
      >
        {!selectedOrder ? (
          <StateMessage
            variant="empty"
            title={t('order.select_to_view')}
            description={t('orders.click_to_view')}
            className="h-full"
          />
        ) : selectedOrderLoading ? (
          <div className="flex items-center justify-center h-full min-h-64">
            <Spinner message={t('common.loading')} />
          </div>
        ) : selectedOrderError ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 lg:hidden">
              <span className="font-semibold text-gray-900 truncate">{selectedOrder.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCloseDetail}
                aria-label={t('common.close')}
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <StateMessage
              variant="error"
              title={t('order.error_loading_details')}
              description={selectedOrderError}
              actionLabel={t('common.retry')}
              onAction={() => {
                void selectOrder(selectedOrder);
              }}
              className="flex-1"
            />
          </div>
        ) : (
          <>
            {/* Fixed Header */}
            <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <h2
                  className="min-w-0 flex-1 truncate text-lg font-bold text-gray-900"
                  title={selectedOrder.name}
                >
                  {selectedOrder.name}
                </h2>

                <div className="flex shrink-0 items-center gap-1.5">
                  {isOrderEditable(selectedOrder.status) && (
                    <>
                      <OrderActionsMenu
                        isOpen={orderActionsMenuOpen}
                        onOpenChange={setOrderActionsMenuOpen}
                        showMergeBill={canMergeBill}
                        onMergeBill={() => setShowMergeDialog(true)}
                        showSplitBill={canSplitBill}
                        onSplitBill={() => setShowSplitDialog(true)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 text-gray-700"
                        aria-label={t('order.edit_order')}
                        title={t('order.edit_order')}
                        onClick={() => {
                          void handleEditOrder();
                        }}
                        disabled={editLoading}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {canCancelInvoice && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label={t('order.cancel_order')}
                          title={t('order.cancel_order')}
                          onClick={() => setCancelDialogOpen(true)}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 lg:hidden"
                    onClick={handleCloseDetail}
                    aria-label={t('common.close')}
                    title={t('common.close')}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={getBadgeVariant(getDisplayedStatus(selectedOrder))}>
                  {t(
                    `order_status_types.${getDisplayedStatus(selectedOrder)
                      .toLowerCase()
                      .replace(/ /g, '_')}`
                  )}
                </Badge>
                {(selectedOrder.split_total ?? 0) >= 2 || isSplitBill(selectedOrder) ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-50"
                  >
                    <GitBranch className="h-3 w-3" aria-hidden="true" />
                    {(selectedOrder.split_total ?? 0) >= 2
                      ? t('bill_split.split_indicator', {
                          index: selectedOrder.split_index ?? 0,
                          total: selectedOrder.split_total ?? 0,
                        })
                      : t('bill_split.split_bill')}
                  </Badge>
                ) : null}
                {isMergedBill(selectedOrder) ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-50"
                  >
                    <GitMerge className="h-3 w-3" aria-hidden="true" />
                    {t('bill_merge.merged_bill')}
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* Cancel Order Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('order.cancel_order')}</DialogTitle>
                  <DialogDescription>{t('errors.enter_cancel_reason')}</DialogDescription>
                </DialogHeader>
                <div className="px-6 mb-3">
                  <Textarea
                    aria-label={t('order.cancel_reason')}
                    placeholder={t('order.enter_cancel_reason')}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    disabled={cancelLoading}
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCancelDialogOpen(false)}
                    disabled={cancelLoading}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      void handleCancelOrder();
                    }}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? t('common.cancelling') : t('common.confirm_cancel')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <SplitGroupPanel
                invoiceName={selectedOrder.name}
                onOpenInvoice={openRelatedInvoice}
              />

              <MergedBillPanel
                order={selectedOrder}
                onOpenSecondary={openSecondaryInvoice}
              />

              <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 border border-gray-100 p-3.5">
                <div className="space-y-2.5 min-w-0">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <User className="w-4 h-4 shrink-0 text-gray-500" aria-hidden="true" />
                    <span className="text-gray-900 font-medium truncate">
                      {selectedOrder.customer}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 tabular-nums">
                    <Clock className="w-4 h-4 shrink-0 text-gray-500" aria-hidden="true" />
                    <span className="truncate">
                      {formatDateTime(selectedOrder.posting_date, selectedOrder.posting_time)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2.5 min-w-0">
                  {selectedOrder.waiter && (
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <UserCheck className="w-4 h-4 shrink-0 text-gray-500" aria-hidden="true" />
                      <span className="text-gray-600 truncate">{selectedOrder.waiter}</span>
                    </div>
                  )}
                  {selectedOrder.restaurant_table && (
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <Receipt className="w-4 h-4 shrink-0 text-gray-500" aria-hidden="true" />
                      <span className="text-gray-600 truncate">
                        {getOrderTableLabel(selectedOrder)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.status === 'Cancelled' && selectedOrder.cancel_reason && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <h3 className="text-sm font-semibold text-red-800">
                    {t('order.cancel_reason')}
                  </h3>
                  <p className="mt-1 text-sm text-red-700">{selectedOrder.cancel_reason}</p>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  {t('order.items_title')}
                </h3>
                <div className="divide-y divide-gray-100">
                  {selectedOrderItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-start gap-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.item_name}</p>
                        <p className="text-xs text-gray-500 tabular-nums">
                          {t('order.qty_label', { qty: String(item.qty) })}
                        </p>
                      </div>
                      <div className="text-end shrink-0">
                        <p className="text-sm font-semibold text-gray-900 tabular-nums">
                          {formatCurrency(item.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Taxes */}
              {selectedOrderTaxes.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    {t('order.taxes_charges')}
                  </h3>
                  <div className="space-y-2">
                    {selectedOrderTaxes.map((tax, index) => (
                      <div key={index} className="flex justify-between items-center gap-2 py-1">
                        <span className="text-sm text-gray-600">{tax.description}</span>
                        <span className="text-sm font-medium text-gray-900 tabular-nums">
                          {formatCurrency(tax.rate)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Bar */}
            <div className="shrink-0 border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    void handlePrintOrder();
                  }}
                  aria-label={t('order.print')}
                  title={t('order.print')}
                  disabled={isPrinting}
                >
                  {isPrinting ? (
                    <Spinner className="w-5 h-5" hideMessage message={t('common.loading')} />
                  ) : (
                    <Printer className="w-5 h-5" />
                  )}
                </Button>
                {isOrderEditable(selectedOrder.status) && (
                  <Button
                    type="button"
                    className="flex-1 font-semibold"
                    onClick={() => setShowPaymentDialog(true)}
                  >
                    {t('order.payment')}
                  </Button>
                )}
                <span className="ms-auto text-lg font-bold text-gray-950 whitespace-nowrap tabular-nums">
                  {isMergedBill(selectedOrder) ? (
                    <span className="flex flex-col items-end leading-tight">
                      <span className="text-xs font-medium text-gray-500">
                        {t('bill_merge.combined_total')}
                      </span>
                      <span>{formatCurrency(selectedOrderTotals.roundedTotal)}</span>
                    </span>
                  ) : (
                    formatCurrency(selectedOrder.rounded_total)
                  )}
                </span>
              </div>
            </div>
          </>
        )}
      </aside>

      {showPaymentDialog && selectedOrder && (
        <PaymentDialog
          onClose={() => setShowPaymentDialog(false)}
          grandTotal={selectedOrderTotals.grandTotal}
          roundedTotal={selectedOrderTotals.roundedTotal}
          invoice={selectedOrder.name}
          customer={selectedOrder.customer}
          posProfile={posStore.posProfile?.name || ''}
          table={selectedOrder.restaurant_table || null}
          tableLabel={getOrderTableLabel(selectedOrder)}
          cashier={posStore.posProfile?.cashier || ''}
          owner={posStore.posProfile?.cashier || ''}
          fetchOrders={fetchOrders}
          clearSelectedOrder={clearSelectedOrder}
          discountPercentage={selectedOrder.additional_discount_percentage}
          discountAmount={selectedOrder.discount_amount}
        />
      )}
      {selectedOrder && (
        <BillMergeDialog
          open={showMergeDialog}
          onOpenChange={setShowMergeDialog}
          invoiceName={selectedOrder.name}
          onConfirm={handleMergeBill}
        />
      )}
      {selectedOrder && (
        <BillSplitDialog
          open={showSplitDialog}
          onOpenChange={setShowSplitDialog}
          invoiceName={selectedOrder.name}
          items={selectedOrderItems}
          sourceCustomer={
            selectedOrder.customer
              ? {
                  id: selectedOrder.customer,
                  name: selectedOrder.customer,
                  phone: selectedOrder.mobile_number,
                }
              : null
          }
          onConfirm={handleSplitBill}
        />
      )}
    </div>
  );
}
