import { formatCurrency } from '@ury/core'
import { StateMessage } from '@ury/ui'
import { Check, Plus, UtensilsCrossed } from 'lucide-react'
import type { MenuItem, OrderingCapabilities } from '../../lib/api'

type Cart = Record<string, { item: MenuItem; qty: number }>

interface MenuGridProps {
  menu: MenuItem[]
  cart: Cart
  capabilities: OrderingCapabilities | undefined
  onAdd: (item: MenuItem) => void
  onRetry?: () => void
  error?: string | null
  isOnline?: boolean
  /** Tailwind grid classes (columns/gap) — differs between Tablet and Kiosk. */
  gridClassName: string
  /** Tailwind classes for each card — controls touch-target size. */
  cardClassName: string
  imageClassName?: string
}

function MenuGrid({
  menu,
  cart,
  capabilities,
  onAdd,
  onRetry,
  error,
  isOnline = true,
  gridClassName,
  cardClassName,
  imageClassName,
}: MenuGridProps) {
  if (menu.length === 0) {
    if (error) {
      return (
        <StateMessage
          variant={isOnline ? 'error' : 'offline'}
          title={isOnline ? 'Não foi possível carregar o cardápio' : 'Sem conexão com a internet'}
          description={error}
          actionLabel={onRetry ? 'Tentar novamente' : undefined}
          onAction={onRetry}
          className="rounded-2xl border border-slate-200 bg-white shadow-xs"
        />
      )
    }
    return (
      <StateMessage
        variant="empty"
        title="Nenhum item disponível neste cardápio"
        description="No momento não há produtos disponíveis para pedido. Tente atualizar ou consulte um atendente."
        actionLabel={onRetry ? 'Atualizar cardápio' : undefined}
        onAction={onRetry}
        className="rounded-2xl border border-slate-200 bg-white shadow-xs"
      />
    )
  }

  return (
    <div className={gridClassName}>
      {menu.map((item) => {
        const inCartQty = cart[item.item]?.qty ?? 0
        return (
          <button
            key={item.item}
            type="button"
            onClick={() => onAdd(item)}
            aria-label={`Adicionar ${item.item_name}, ${formatCurrency(item.rate)}${
              inCartQty > 0 ? `, ${inCartQty} na sacola` : ''
            }`}
            className={`${cardClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              inCartQty > 0 ? 'border-primary ring-1 ring-primary/30 bg-blue-50/20' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            {capabilities?.show_item_images && (
              <div className={imageClassName ?? 'aspect-[4/3] w-full overflow-hidden bg-slate-100'}>
                {item.item_image ? (
                  <img
                    src={item.item_image}
                    alt={item.item_name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <UtensilsCrossed className="h-8 w-8" aria-hidden="true" />
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-1 flex-col justify-between gap-2 p-3.5">
              <div>
                <div className="font-semibold text-slate-900 leading-snug">{item.item_name}</div>
                <div className="mt-1 font-bold text-slate-800 tabular-nums">
                  {formatCurrency(item.rate)}
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between gap-2">
                {inCartQty > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white tabular-nums">
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Na sacola: {inCartQty}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Adicionar</span>
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default MenuGrid
