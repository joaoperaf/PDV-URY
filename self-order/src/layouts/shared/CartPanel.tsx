import { formatCurrency } from '@ury/core'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import type { CustomerOrder, MenuItem, OrderingContext } from '../../lib/api'

type CartEntry = { item: MenuItem; qty: number }

interface CartPanelProps {
  context: OrderingContext | null
  order: CustomerOrder | null
  cartItems: CartEntry[]
  cartCount: number
  cartTotal: number
  submitting: boolean
  billRequested: boolean
  payingOnline: boolean
  isOnline?: boolean
  onIncrement: (item: MenuItem) => void
  onDecrement: (itemCode: string) => void
  onSubmit: () => void
  onRequestBill: () => void
  onPayOnline: () => void
  className?: string
}

function CartPanel({
  context,
  order,
  cartItems,
  cartCount,
  cartTotal,
  submitting,
  billRequested,
  payingOnline,
  isOnline = true,
  onIncrement,
  onDecrement,
  onSubmit,
  onRequestBill,
  onPayOnline,
  className,
}: CartPanelProps) {
  return (
    <aside aria-label="Resumo do pedido e sacola" className={className}>
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {order && order.items.length > 0 && (
          <section
            aria-label="Itens já enviados para preparo"
            className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
          >
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
              Já enviado para preparo
            </h2>
            <ul className="space-y-1.5 text-sm">
              {order.items.map((row, idx) => (
                <li key={`${row.item_code}-${idx}`} className="flex justify-between gap-2">
                  <span className="text-slate-800">
                    {row.item_name} <span className="tabular-nums font-semibold">× {row.qty}</span>
                  </span>
                  <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                    {formatCurrency(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
              <span>Total já pedido</span>
              <span className="tabular-nums">{formatCurrency(order.grand_total)}</span>
            </div>
          </section>
        )}

        <section aria-label="Sacola atual">
          <h2 className="mb-2.5 text-sm font-bold text-slate-900">Sua sacola</h2>
          {cartItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
              <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600">
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Sua sacola está vazia</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Toque nos itens do cardápio ao lado para montar seu pedido.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {cartItems.map((entry) => (
                <li
                  key={entry.item.item}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 leading-snug">
                      {entry.item.item_name}
                    </div>
                    <div className="text-xs font-medium text-slate-600 tabular-nums mt-0.5">
                      {formatCurrency(entry.item.rate * entry.qty)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDecrement(entry.item.item)}
                      disabled={submitting}
                      className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-900 transition hover:bg-slate-100 active:scale-95 active:bg-slate-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      aria-label={`Diminuir quantidade de ${entry.item.item_name}`}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="min-w-6 text-center font-bold text-slate-900 tabular-nums">
                      {entry.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIncrement(entry.item)}
                      disabled={submitting}
                      className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-900 transition hover:bg-slate-100 active:scale-95 active:bg-slate-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      aria-label={`Aumentar quantidade de ${entry.item.item_name}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-3 border-t border-slate-200 pt-3.5 space-y-2.5">
        <div
          aria-live="polite"
          className="flex items-center justify-between text-sm font-bold text-slate-900"
        >
          <span className="tabular-nums">
            {cartCount} {cartCount !== 1 ? 'itens na sacola' : 'item na sacola'}
          </span>
          <span className="text-base font-extrabold tabular-nums">
            {formatCurrency(cartTotal)}
          </span>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || cartCount === 0 || !isOnline}
          className="w-full min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-xs transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          {submitting
            ? 'Enviando pedido…'
            : !isOnline
            ? 'Sem conexão para enviar'
            : 'Enviar pedido para preparo'}
        </button>

        {context?.capabilities.customer_payment_enabled && order && !order.billed && (
          <button
            type="button"
            className="w-full min-h-11 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            disabled={payingOnline || !isOnline}
            onClick={onPayOnline}
          >
            {payingOnline ? 'Abrindo pagamento…' : 'Abrir pagamento online'}
          </button>
        )}

        {context?.capabilities.request_bill_enabled && order && !order.billed && (
          <button
            type="button"
            className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            disabled={billRequested || !isOnline}
            onClick={onRequestBill}
          >
            {billRequested
              ? 'Conta solicitada — atendente avisado'
              : 'Solicitar fechamento da conta'}
          </button>
        )}
      </div>
    </aside>
  )
}

export default CartPanel
