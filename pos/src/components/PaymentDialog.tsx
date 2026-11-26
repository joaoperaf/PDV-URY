import React, { useState, useEffect, useId, useRef, useCallback } from 'react';
import { X, Percent, Coins, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { usePOSStore, type PaymentMode } from '../store/pos-store';
import { formatCurrency, call, parseFrappeError } from '@ury/core';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogTitle,
  Spinner,
  StateMessage,
  cn,
  showToast,
} from '@ury/ui';
import { DEFAULT_PAYMENT_MODE } from '../data/order-types';
import { t } from '../i18n';

interface PaymentDialogProps {
  onClose: () => void;
  grandTotal: number;
  roundedTotal: number;
  invoice: string;
  customer: string;
  posProfile: string;
  table: string | null;
  tableLabel?: string | null;
  cashier: string;
  owner: string;
  fetchOrders: () => Promise<void>;
  clearSelectedOrder: () => void;
  discountPercentage?: number;
  discountAmount?: number;
}

function getPaymentModeId(mode: string | PaymentMode): string {
  return typeof mode === 'string' ? mode : mode.id;
}

function getPaymentModeRawName(mode: string | PaymentMode): string {
  return typeof mode === 'string' ? mode : mode.name;
}

function getPaymentModeLabel(mode: string): string {
  const normalized = mode.trim().toLowerCase();
  if (normalized === 'ifood') return 'iFood';
  const translationKey: Record<string, string> = {
    cash: 'payment_modes.cash',
    dinheiro: 'payment_modes.cash',
    'credit card': 'payment_modes.credit_card',
    'cartão de crédito': 'payment_modes.credit_card',
    'debit card': 'payment_modes.debit_card',
    'cartão de débito': 'payment_modes.debit_card',
    pix: 'payment_modes.pix',
    'bank transfer': 'payment_modes.bank_transfer',
    transferência: 'payment_modes.bank_transfer',
    cheque: 'payment_modes.check',
    check: 'payment_modes.check',
  };

  const key = translationKey[normalized];
  return key ? t(key) : mode;
}

const PaymentDialog: React.FC<PaymentDialogProps> = ({
  onClose,
  grandTotal,
  roundedTotal,
  invoice,
  customer,
  posProfile,
  table,
  tableLabel,
  cashier,
  owner,
  fetchOrders,
  clearSelectedOrder,
  discountPercentage,
  discountAmount,
}) => {
  const baseId = useId();
  const discountInputId = `${baseId}-discount`;
  const discountErrorId = `${baseId}-discount-error`;
  const paymentStatusId = `${baseId}-payment-status`;
  const paymentErrorId = `${baseId}-payment-error`;

  const { paymentModes, fetchPaymentModes, posProfile: storePosProfile } = usePOSStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingModes, setIsLoadingModes] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const discountInputRef = useRef<HTMLInputElement | null>(null);
  const paymentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const initialFocusDoneRef = useRef(false);

  // Calculate effective percentage if only amount is provided (for invoice-level discounts)
  const effectivePercentage = discountPercentage
    ? discountPercentage
    : discountAmount && grandTotal + discountAmount > 0
      ? (discountAmount / (grandTotal + discountAmount)) * 100
      : 0;

  const [discountValue, setDiscountValue] = useState<string>(
    effectivePercentage > 0 ? String(Math.round(effectivePercentage * 100) / 100) : ''
  );
  const [appliedDiscount, setAppliedDiscount] = useState<number>(discountAmount || 0);
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});

  const loadPaymentModes = useCallback(async () => {
    setIsLoadingModes(true);
    try {
      await fetchPaymentModes();
    } finally {
      setIsLoadingModes(false);
    }
  }, [fetchPaymentModes]);

  useEffect(() => {
    loadPaymentModes();
  }, [loadPaymentModes]);

  // baseTotal represents the amount before any invoice-level discount
  const baseTotal = grandTotal + (discountAmount || 0);

  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue);
    if (Number.isNaN(value) || value <= 0) {
      setDiscountError(t('errors.invalid_discount'));
      discountInputRef.current?.focus();
      return;
    }
    if (value > 100) {
      setDiscountError(t('errors.discount_exceeds_max'));
      discountInputRef.current?.focus();
      return;
    }
    const calculatedDiscount = (baseTotal * value) / 100;
    setAppliedDiscount(calculatedDiscount);
    setDiscountError(null);
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(0);
    setDiscountValue('');
    setDiscountError(null);
    discountInputRef.current?.focus();
  };

  // Order summary logic
  const subtotal = baseTotal;
  const totalDiscount = appliedDiscount;
  const discountedTotal = Math.max(0, subtotal - totalDiscount);
  // Preserve existing rounding rule: if discount is applied, round up; else, round normally
  const finalTotal =
    appliedDiscount > 0 ? Math.ceil(discountedTotal) : Math.round(discountedTotal);

  const invalidModeIds = paymentModes
    .map((mode) => getPaymentModeId(mode))
    .filter((id) => {
      const raw = paymentInputs[id];
      if (!raw || !raw.trim()) return false;
      const parsed = parseFloat(raw);
      return Number.isNaN(parsed) || parsed < 0;
    });
  const hasInvalidAmount = invalidModeIds.length > 0;

  // Calculate split payment total
  const payments = paymentModes
    .map((mode) => {
      const id = getPaymentModeId(mode);
      const amount = parseFloat(paymentInputs[id] || '');
      return !Number.isNaN(amount) && amount > 0 ? { mode_of_payment: id, amount } : null;
    })
    .filter((entry): entry is { mode_of_payment: string; amount: number } => Boolean(entry));

  const paymentsTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const shortfall = finalTotal - paymentsTotal;
  const isShort = shortfall > 0.005;
  const changeDue = paymentsTotal - finalTotal;
  const hasChange = changeDue > 0.005;

  const finalAdjustment = finalTotal - discountedTotal;
  const roundedFinalAdjustment = Math.round(finalAdjustment * 100) / 100;
  const showFinalAdjustment = Math.abs(roundedFinalAdjustment) > 0.001;

  // Autofill default payment mode when opening or when total updates before user splits across modes
  useEffect(() => {
    const defaultMode = paymentModes.find(
      (mode) => getPaymentModeId(mode) === DEFAULT_PAYMENT_MODE
    );
    const enteredKeys = Object.keys(paymentInputs).filter(
      (k) => paymentInputs[k] !== undefined && paymentInputs[k] !== ''
    );
    const onlyDefaultOrEmpty =
      enteredKeys.length === 0 ||
      (enteredKeys.length === 1 && enteredKeys[0] === DEFAULT_PAYMENT_MODE);

    if (finalTotal > 0 && defaultMode && DEFAULT_PAYMENT_MODE && onlyDefaultOrEmpty) {
      setPaymentInputs((prev) => ({
        ...prev,
        [DEFAULT_PAYMENT_MODE]: String(finalTotal),
      }));
    }
  }, [finalTotal, paymentModes]);

  // Direct initial focus to the primary/first payment field once modes are ready
  useEffect(() => {
    if (initialFocusDoneRef.current || paymentModes.length === 0) return;
    const defaultMode = paymentModes.find(
      (mode) => getPaymentModeId(mode) === DEFAULT_PAYMENT_MODE
    );
    const targetId = getPaymentModeId(defaultMode ?? paymentModes[0]);
    const frame = requestAnimationFrame(() => {
      const targetInput = paymentInputRefs.current[targetId];
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
        initialFocusDoneRef.current = true;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [paymentModes]);

  const getRemainingBalance = (currentId: string) => {
    const totalEntered = Object.entries(paymentInputs)
      .filter(([id]) => id !== currentId)
      .reduce((sum, [, val]) => {
        const parsed = parseFloat(val);
        return sum + (!Number.isNaN(parsed) && parsed > 0 ? parsed : 0);
      }, 0);
    return Math.max(0, Math.round((finalTotal - totalEntered) * 100) / 100);
  };

  const handlePaymentInputFocus = (id: string) => {
    setPaymentInputs((inputs) => {
      if (!inputs[id] || parseFloat(inputs[id]) === 0) {
        const remaining = getRemainingBalance(id);
        return { ...inputs, [id]: remaining > 0 ? String(remaining) : '' };
      }
      return inputs;
    });
  };

  const focusFirstPendingInput = () => {
    if (hasInvalidAmount) {
      paymentInputRefs.current[invalidModeIds[0]]?.focus();
      return;
    }
    const emptyMode = paymentModes.find((mode) => {
      const id = getPaymentModeId(mode);
      const val = parseFloat(paymentInputs[id] || '');
      return Number.isNaN(val) || val <= 0;
    });
    const fallbackMode = emptyMode ?? paymentModes[0];
    if (fallbackMode) {
      paymentInputRefs.current[getPaymentModeId(fallbackMode)]?.focus();
    }
  };

  const isPayDisabled =
    isProcessing || hasInvalidAmount || payments.length === 0 || isShort;

  const handlePayment = async () => {
    if (isPayDisabled) {
      focusFirstPendingInput();
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);
    try {
      await call.post('ury.ury.doctype.ury_order.ury_order.make_invoice', {
        additionalDiscount: appliedDiscount > 0 ? appliedDiscount : null,
        cashier,
        customer,
        invoice,
        owner,
        payments,
        pos_profile: posProfile,
        table,
      });
      showToast.success(t('payment.success', { amount: formatCurrency(paymentsTotal) }));
      onClose();
      clearSelectedOrder();
      await fetchOrders();
    } catch (err) {
      console.error('Payment failed:', err);
      setPaymentError(parseFrappeError(err, t('errors.payment_failed')));
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isPayDisabled) {
        void handlePayment();
      } else {
        focusFirstPendingInput();
      }
    }
  };

  return (
    <Dialog
      open={true}
      closeOnEscape={!isProcessing}
      onOpenChange={(open) => {
        if (!open && !isProcessing) onClose();
      }}
    >
      <DialogContent
        variant="xlarge"
        className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row p-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Left Column - Discount and Payment Methods */}
        <div className="md:w-7/12 p-6 border-b md:border-b-0 md:border-e border-gray-200 overflow-y-auto">
          <div className="flex justify-between items-start gap-3 mb-6">
            <div className="min-w-0">
              <DialogTitle className="text-xl md:text-2xl font-bold text-gray-900">
                {t('payment.title')}
              </DialogTitle>
              <p className="mt-1 text-xs text-gray-500 truncate">
                {invoice}
                {customer ? ` • ${customer}` : ''}
              </p>
            </div>
            <Button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              variant="ghost"
              size="icon"
              aria-label={t('common.close')}
              title={t('common.close')}
              className="shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Discount Section (conditional) */}
          {storePosProfile?.enable_discount === 1 && (
            <div className="space-y-2.5 mb-6 pb-6 border-b border-gray-100">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={discountInputId}
                  className="text-sm font-semibold text-gray-900 flex items-center gap-2 cursor-pointer"
                >
                  <Percent className="w-4 h-4 text-gray-600" aria-hidden="true" />
                  {t('payment.apply_discount')}
                </label>
                {appliedDiscount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleRemoveDiscount}
                    disabled={isProcessing}
                    className="text-xs text-gray-600 hover:text-gray-900"
                  >
                    {t('payment.remove_discount')}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  id={discountInputId}
                  ref={discountInputRef}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  inputMode="decimal"
                  value={discountValue}
                  onChange={(e) => {
                    setDiscountValue(e.target.value);
                    if (discountError) setDiscountError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyDiscount();
                    }
                  }}
                  placeholder={t('payment.discount_placeholder')}
                  variant={discountError ? 'error' : 'default'}
                  aria-invalid={!!discountError || undefined}
                  aria-describedby={discountError ? discountErrorId : undefined}
                  disabled={isProcessing}
                  className="flex-1 tabular-nums"
                />
                <Button
                  type="button"
                  onClick={handleApplyDiscount}
                  disabled={isProcessing}
                  variant="outline"
                >
                  {t('common.apply')}
                </Button>
              </div>
              {discountError && (
                <p
                  id={discountErrorId}
                  role="alert"
                  className="text-xs font-medium text-red-600 flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{discountError}</span>
                </p>
              )}
            </div>
          )}

          {/* Payment Methods Section - Split Payment */}
          <fieldset className="space-y-4" aria-describedby={paymentStatusId}>
            <legend className="text-base font-semibold text-gray-900 mb-3">
              {t('payment.payment_methods')}
            </legend>

            {isLoadingModes && paymentModes.length === 0 ? (
              <div className="py-8">
                <Spinner message={t('common.loading')} />
              </div>
            ) : paymentModes.length === 0 ? (
              <StateMessage
                variant="error"
                title={t('payment.no_methods_title')}
                description={t('pos_opening.no_payment_modes')}
                actionLabel={t('common.retry')}
                onAction={() => {
                  void loadPaymentModes();
                }}
                className="min-h-40 py-6"
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {paymentModes.map((mode, idx) => {
                  const id = getPaymentModeId(mode);
                  const label = getPaymentModeLabel(getPaymentModeRawName(mode));
                  const inputId = `${baseId}-mode-${idx}`;
                  const isModeInvalid = invalidModeIds.includes(id);

                  return (
                    <div
                      key={id}
                      className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3"
                    >
                      <label
                        htmlFor={inputId}
                        className="sm:w-40 shrink-0 text-sm font-medium text-gray-800 cursor-pointer"
                      >
                        {label}
                      </label>
                      <Input
                        id={inputId}
                        ref={(el) => {
                          paymentInputRefs.current[id] = el;
                        }}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={paymentInputs[id] ?? ''}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setPaymentInputs((inputs) => ({ ...inputs, [id]: nextVal }));
                          if (paymentError) setPaymentError(null);
                        }}
                        onFocus={() => handlePaymentInputFocus(id)}
                        onKeyDown={handlePaymentKeyDown}
                        placeholder={t('payment.amount_placeholder')}
                        variant={isModeInvalid ? 'error' : 'default'}
                        aria-invalid={isModeInvalid || undefined}
                        aria-describedby={paymentStatusId}
                        className="flex-1 tabular-nums sm:text-end font-medium"
                        disabled={isProcessing}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Payment Validation & Balance Status */}
            {paymentModes.length > 0 && (
              <div
                id={paymentStatusId}
                role={hasInvalidAmount ? 'alert' : 'status'}
                aria-live="polite"
                className={cn(
                  'mt-4 rounded-lg border p-3.5 text-sm transition-colors',
                  hasInvalidAmount
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : isShort
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                )}
              >
                <div className="flex items-center justify-between gap-2 font-medium">
                  <span>{t('payment.total_entered')}</span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(paymentsTotal)} / {formatCurrency(finalTotal)}
                  </span>
                </div>

                {hasInvalidAmount ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t('payment.invalid_amount')}</span>
                  </p>
                ) : payments.length === 0 && finalTotal > 0 ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {t('payment.enter_amount_hint', {
                        amount: formatCurrency(finalTotal),
                      })}
                    </span>
                  </p>
                ) : isShort ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-900 tabular-nums">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{t('payment.short_by', { amount: formatCurrency(shortfall) })}</span>
                  </p>
                ) : hasChange ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-900 tabular-nums">
                    <Coins className="w-4 h-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    <span>
                      {t('payment.change_due', { amount: formatCurrency(changeDue) })}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    <span>{t('payment.exact_amount')}</span>
                  </p>
                )}
              </div>
            )}
          </fieldset>
        </div>

        {/* Right Column - Order Summary and Submit Action */}
        <div className="md:w-5/12 p-6 bg-gray-50/70 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Server / Submission Error Alert */}
            {paymentError && (
              <div
                id={paymentErrorId}
                role="alert"
                aria-live="assertive"
                className="mb-4 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-800"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
                <p className="text-sm font-medium leading-5">{paymentError}</p>
              </div>
            )}

            {/* Order Summary */}
            <div className="space-y-3 mb-6">
              <h3 className="text-base font-semibold text-gray-900">
                {t('payment.order_summary')}
              </h3>
              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2.5 text-sm">
                {tableLabel && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600">{t('tables.table_name')}</span>
                    <span className="font-medium text-gray-900">{tableLabel}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">{t('payment.subtotal')}</span>
                  <span className="font-medium text-gray-900 tabular-nums">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between gap-2 text-emerald-700 font-medium">
                    <span>{t('payment.discount')}</span>
                    <span className="tabular-nums">-{formatCurrency(appliedDiscount)}</span>
                  </div>
                )}
                {showFinalAdjustment && (
                  <div className="flex justify-between gap-2 text-blue-700">
                    <span>{t('payment.adjustment')}</span>
                    <span className="tabular-nums">
                      {roundedFinalAdjustment > 0 ? '+' : ''}
                      {formatCurrency(roundedFinalAdjustment)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 mt-2">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="font-semibold text-base text-gray-900">
                      {t('payment.total')}
                    </span>
                    <span className="font-bold text-xl text-gray-950 tabular-nums">
                      {formatCurrency(finalTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Payment Button */}
          <Button
            type="button"
            size="lg"
            onClick={() => {
              void handlePayment();
            }}
            disabled={isPayDisabled}
            aria-busy={isProcessing}
            aria-describedby={
              isPayDisabled && paymentModes.length > 0 ? paymentStatusId : undefined
            }
            variant="default"
            className="w-full font-semibold text-base tabular-nums disabled:bg-gray-200 disabled:text-gray-600 disabled:opacity-100"
          >
            {isProcessing ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                {t('payment.processing')}
              </span>
            ) : (
              t('payment.pay_button', {
                amount: formatCurrency(
                  !isShort && paymentsTotal > 0 ? paymentsTotal : finalTotal
                ),
              })
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
