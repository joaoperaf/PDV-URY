import { formatCurrency } from '@ury/core'
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
  onIncrement: (item: MenuItem) => void
  onDecrement: (itemCode: string) => void
  onSubmit: () => void
  onRequestBill: () => void
  onPayOnline: () => void
  className?: string
}

/**
 * Persistent order-summary + cart panel shared between TabletLayout and
 * LandscapeKioskLayout. Unlike MobileQRLayout's bottom sheet, this is always
 * visible — no toggle to open/close it.
 */
function CartPanel({
  context,
  order,
  cartItems,
  cartCount,
  cartTotal,
  submitting,
  billRequested,
  payingOnline,
  onIncrement,
  onDecrement,
  onSubmit,
  onRequestBill,
  onPayOnline,
  className,
}: CartPanelProps) {
  return (
    <aside className={className}>
      <div className="flex-1 overflow-y-auto">
        {order && order.items.length > 0 && (
          <section className="mb-4 rounded-lg border p-3">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Seu pedido até agora</h2>
            <ul className="space-y-1 text-sm">
              {order.items.map((row, idx) => (
                <li key={`${row.item_code}-${idx}`} className="flex justify-between">
                  <span>
                    {row.item_name} × {row.qty}
                  </span>
                  <span>{row.amount}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t pt-2 text-sm font-semibold">
              <span>Total</span>
              <span>{order.grand_total}</span>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Carrinho</h2>
          {cartItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Toque em um item do cardápio para adicioná-lo ao pedido.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {cartItems.map((entry) => (
                <li key={entry.item.item} className="flex items-center justify-between gap-2">
                  <span className="flex-1">{entry.item.item_name}</span>
                  <span className="flex items-center gap-2">
                    <button
                      onClick={() => onDecrement(entry.item.item)}
                      className="h-7 w-7 rounded-full border text-sm leading-none"
                      aria-label={`Remover um ${entry.item.item_name}`}
                    >
                      −
                    </button>
                    <span className="w-4 text-center">{entry.qty}</span>
                    <button
                      onClick={() => onIncrement(entry.item)}
                      className="h-7 w-7 rounded-full border text-sm leading-none"
                      aria-label={`Adicionar mais um ${entry.item.item_name}`}
                    >
                      +
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="border-t pt-3">
        <div className="mb-3 flex items-center justify-between text-sm font-semibold">
          <span>
            {cartCount} {cartCount !== 1 ? 'itens' : 'item'}
          </span>
          <span className="tabular-nums">{formatCurrency(cartTotal)}</span>
        </div>
        <button
          onClick={onSubmit}
          disabled={submitting || cartCount === 0}
          className="w-full rounded-md bg-primary py-3 font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? 'Enviando pedido…' : 'Fazer Pedido'}
        </button>
        {context?.capabilities.customer_payment_enabled && order && !order.billed && (
          <button
            className="mt-2 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={payingOnline}
            onClick={onPayOnline}
          >
            {payingOnline ? 'Iniciando pagamento…' : 'Pagar Online'}
          </button>
        )}
        {context?.capabilities.request_bill_enabled && order && !order.billed && (
          <button
            className="mt-2 w-full rounded-md border py-2 text-sm font-medium disabled:opacity-50"
            disabled={billRequested}
            onClick={onRequestBill}
          >
            {billRequested ? 'Conta solicitada — garçom avisado' : 'Pedir a Conta'}
          </button>
        )}
      </div>
    </aside>
  )
}

export default CartPanel
