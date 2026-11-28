import { useMemo, useState } from 'react'
import { formatCurrency } from '@ury/core'
import { StateMessage } from '@ury/ui'
import { Check, ChevronDown, ChevronUp, Minus, Plus, UtensilsCrossed } from 'lucide-react'
import { useOrderingSession } from '../hooks/useOrderingSession'
import type { OrderingContext } from '../lib/api'
import {
  LiveAnnouncementRegion,
  ResetOrderDialog,
  SelfOrderLoadingSkeleton,
  SessionStatusBanners,
} from './shared/SessionFeedback'

const ALL_CATEGORY = '__all__'

interface LayoutProps {
  initialContext?: OrderingContext
}

function MobileQRLayout({ initialContext }: LayoutProps) {
  const {
    context,
    menu,
    order,
    cart,
    loading,
    submitting,
    error,
    isOnline,
    liveAnnouncement,
    successMessage,
    dismissSuccessMessage,
    dismissError,
    retryInit,
    billRequested,
    paymentRequest,
    payingOnline,
    addToCart,
    decrementCart,
    submitCart,
    handleRequestBill,
    payOnline,
    resetSession,
    cartItems,
    cartCount,
    cartTotal,
  } = useOrderingSession(initialContext)

  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY)
  const [cartSheetExpanded, setCartSheetExpanded] = useState<boolean>(false)
  const [showResetDialog, setShowResetDialog] = useState<boolean>(false)

  const categories = useMemo(() => {
    const seen = new Map<string, string>()
    for (const item of menu) {
      const key = item.course ?? ALL_CATEGORY
      if (key === ALL_CATEGORY) continue
      if (!seen.has(key)) {
        seen.set(key, item.course_label ?? item.course ?? 'Outros')
      }
    }
    return Array.from(seen.entries()).map(([course, label]) => ({ course, label }))
  }, [menu])

  const visibleMenu = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) return menu
    return menu.filter((item) => (item.course ?? ALL_CATEGORY) === selectedCategory)
  }, [menu, selectedCategory])

  if (loading) {
    return <SelfOrderLoadingSkeleton message="Carregando cardápio…" />
  }

  if (error && !context) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <StateMessage
          variant={isOnline ? 'error' : 'offline'}
          title={isOnline ? 'Não foi possível abrir o cardápio' : 'Sem conexão com a internet'}
          description={error}
          actionLabel="Tentar novamente"
          onAction={retryInit}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      </div>
    )
  }

  const isPickup = context?.source === 'QR Pickup'

  return (
    <div className="min-h-screen bg-slate-50 pb-44">
      <LiveAnnouncementRegion message={liveAnnouncement} />

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">
              {isPickup
                ? 'Pedido para Retirada'
                : context?.table
                ? `Mesa ${context.table}`
                : 'Autoatendimento'}
            </h1>
            {context?.restaurant && (
              <p className="text-xs text-slate-600 truncate">{context.restaurant}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowResetDialog(true)}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shrink-0"
          >
            Recomeçar
          </button>
        </div>

        {categories.length > 0 && (
          <nav
            aria-label="Categorias do cardápio"
            className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <button
              type="button"
              aria-pressed={selectedCategory === ALL_CATEGORY}
              onClick={() => setSelectedCategory(ALL_CATEGORY)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                selectedCategory === ALL_CATEGORY
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {selectedCategory === ALL_CATEGORY && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>Todos</span>
            </button>
            {categories.map((cat) => {
              const active = selectedCategory === cat.course
              return (
                <button
                  key={cat.course}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedCategory(cat.course)}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </nav>
        )}
      </header>

      <SessionStatusBanners
        isOnline={isOnline}
        error={menu.length > 0 ? error : null}
        successMessage={successMessage}
        onRetry={retryInit}
        onDismissError={dismissError}
        onDismissSuccess={dismissSuccessMessage}
        className="mx-4 mt-3"
      />

      {order && order.items.length > 0 && (
        <section
          aria-label="Itens já enviados"
          className="mx-4 mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
        >
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            Já enviado para preparo
          </h2>
          {isPickup && order.pickup_code && (
            <p className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-center text-sm font-bold text-amber-950 tabular-nums">
              Código de retirada: {order.pickup_code}
            </p>
          )}
          <ul className="space-y-1.5 text-sm">
            {order.items.map((row, idx) => (
              <li key={`${row.item_code}-${idx}`} className="flex justify-between gap-2">
                <span className="text-slate-800">
                  {row.item_name} <span className="font-semibold tabular-nums">× {row.qty}</span>
                </span>
                <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                  {formatCurrency(row.amount)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-2.5 text-sm font-bold text-slate-900">
            <span>Total já pedido</span>
            <span className="tabular-nums">{formatCurrency(order.grand_total)}</span>
          </div>

          {context?.capabilities.customer_payment_enabled && !order.billed && (
            <button
              type="button"
              className="mt-3 w-full min-h-11 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              disabled={payingOnline || !isOnline}
              onClick={payOnline}
            >
              {payingOnline ? 'Abrindo pagamento…' : 'Abrir pagamento online'}
            </button>
          )}
          {paymentRequest && !paymentRequest.payment_url && (
            <p role="status" className="mt-2 text-xs text-slate-600">
              Solicitação de pagamento criada ({formatCurrency(paymentRequest.amount)}) — um atendente concluirá o recebimento.
            </p>
          )}
          {!isPickup && context?.capabilities.request_bill_enabled && !order.billed && (
            <button
              type="button"
              className="mt-2.5 w-full min-h-11 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              disabled={billRequested || !isOnline}
              onClick={handleRequestBill}
            >
              {billRequested
                ? 'Conta solicitada — atendente avisado'
                : 'Solicitar fechamento da conta'}
            </button>
          )}
        </section>
      )}

      <main className="mx-4 mt-4">
        {menu.length === 0 && error ? (
          <StateMessage
            variant={isOnline ? 'error' : 'offline'}
            title={isOnline ? 'Não foi possível carregar o cardápio' : 'Sem conexão com a internet'}
            description={error}
            actionLabel="Tentar novamente"
            onAction={retryInit}
            className="rounded-2xl border border-slate-200 bg-white shadow-xs"
          />
        ) : visibleMenu.length === 0 ? (
          <StateMessage
            variant="empty"
            title="Nenhum item disponível"
            description={
              selectedCategory !== ALL_CATEGORY
                ? 'Não há itens nesta categoria no momento.'
                : 'O cardápio não possui itens disponíveis no momento.'
            }
            actionLabel={
              selectedCategory !== ALL_CATEGORY ? 'Mostrar todas as categorias' : 'Atualizar cardápio'
            }
            onAction={
              selectedCategory !== ALL_CATEGORY
                ? () => setSelectedCategory(ALL_CATEGORY)
                : retryInit
            }
            className="rounded-2xl border border-slate-200 bg-white shadow-xs"
          />
        ) : (
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 gap-3.5">
            {visibleMenu.map((item) => {
              const inCartQty = cart[item.item]?.qty ?? 0
              return (
                <button
                  key={item.item}
                  type="button"
                  onClick={() => addToCart(item)}
                  aria-label={`Adicionar ${item.item_name}, ${formatCurrency(item.rate)}${
                    inCartQty > 0 ? `, ${inCartQty} na sacola` : ''
                  }`}
                  className={`flex min-h-[120px] flex-col overflow-hidden rounded-2xl border text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    inCartQty > 0
                      ? 'border-blue-600 bg-blue-50/25 ring-1 ring-blue-600/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {context?.capabilities.show_item_images && (
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      {item.item_image ? (
                        <img
                          src={item.item_image}
                          alt={item.item_name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col justify-between gap-2 p-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 leading-snug">
                        {item.item_name}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-slate-800 tabular-nums">
                        {formatCurrency(item.rate)}
                      </div>
                    </div>

                    <div>
                      {inCartQty > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white tabular-nums">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          <span>Na sacola: {inCartQty}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          <Plus className="h-3 w-3" aria-hidden="true" />
                          <span>Adicionar</span>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>

      {cartCount > 0 && (
        <div
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pt-3 shadow-xl"
        >
          {cartSheetExpanded && (
            <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto border-b border-slate-100 pb-3 text-sm">
              {cartItems.map((entry) => (
                <li key={entry.item.item} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">
                      {entry.item.item_name}
                    </div>
                    <div className="text-xs text-slate-600 tabular-nums">
                      {formatCurrency(entry.item.rate * entry.qty)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => decrementCart(entry.item.item)}
                      disabled={submitting}
                      className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      aria-label={`Diminuir quantidade de ${entry.item.item_name}`}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="min-w-6 text-center font-bold text-slate-900 tabular-nums">
                      {entry.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => addToCart(entry.item)}
                      disabled={submitting}
                      className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      aria-label={`Aumentar quantidade de ${entry.item.item_name}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mb-2.5 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-expanded={cartSheetExpanded}
              onClick={() => setCartSheetExpanded((prev) => !prev)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <span>
                {cartCount} {cartCount > 1 ? 'itens na sacola' : 'item na sacola'}
              </span>
              {cartSheetExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-600" aria-hidden="true" />
              ) : (
                <ChevronUp className="h-4 w-4 text-slate-600" aria-hidden="true" />
              )}
            </button>
            <span className="text-base font-extrabold text-slate-900 tabular-nums">
              {formatCurrency(cartTotal)}
            </span>
          </div>

          <button
            type="button"
            onClick={submitCart}
            disabled={submitting || !isOnline}
            className="w-full min-h-12 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-xs disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {submitting
              ? 'Enviando pedido…'
              : !isOnline
              ? 'Sem conexão para enviar'
              : 'Enviar pedido para preparo'}
          </button>
        </div>
      )}

      <ResetOrderDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={resetSession}
      />
    </div>
  )
}

export default MobileQRLayout
