import { useMemo, useRef, useState } from 'react'
import { formatCurrency } from '@ury/core'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  StateMessage,
} from '@ury/ui'
import { Check, ChevronDown, ChevronUp, Minus, Plus, UtensilsCrossed } from 'lucide-react'
import { useIdleReset } from '../hooks/useIdleReset'
import { useOrderingSession } from '../hooks/useOrderingSession'
import type { MenuItem, OrderingContext } from '../lib/api'
import {
  LiveAnnouncementRegion,
  ResetOrderDialog,
  SelfOrderLoadingSkeleton,
  SessionStatusBanners,
} from './shared/SessionFeedback'

const IDLE_WARN_MS = 60000
const IDLE_RESET_GRACE_MS = 15000

const ALL_CATEGORY = '__all__'

interface LayoutProps {
  initialContext?: OrderingContext
}

function PortraitKioskLayout({ initialContext }: LayoutProps) {
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
  const [cartExpanded, setCartExpanded] = useState(false)
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const idleResetTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useIdleReset(() => {
    if (submitting || payingOnline) return
    setShowIdleWarning(true)
    idleResetTimerRef.current = setTimeout(() => {
      setShowIdleWarning(false)
      if (!submitting && !payingOnline) {
        resetSession()
      }
    }, IDLE_RESET_GRACE_MS)
  }, IDLE_WARN_MS)

  function handleStillHere() {
    clearTimeout(idleResetTimerRef.current)
    setShowIdleWarning(false)
  }

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
    return <SelfOrderLoadingSkeleton message="Carregando cardápio do totem…" />
  }

  if (error && !context) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <StateMessage
          variant={isOnline ? 'error' : 'offline'}
          title={isOnline ? 'Não foi possível abrir o cardápio' : 'Totem sem conexão'}
          description={error}
          actionLabel="Tentar novamente"
          onAction={retryInit}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-36">
      <LiveAnnouncementRegion message={liveAnnouncement} />

      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 sm:px-6 py-4 backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
            {context?.table ? `Mesa ${context.table}` : 'Pedido para Retirada'}
          </h1>
          {context?.restaurant && (
            <p className="text-xs sm:text-sm text-slate-600 truncate">{context.restaurant}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowResetDialog(true)}
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 shrink-0"
        >
          Iniciar novo pedido
        </button>
      </header>

      <SessionStatusBanners
        isOnline={isOnline}
        error={menu.length > 0 ? error : null}
        successMessage={successMessage}
        onRetry={retryInit}
        onDismissError={dismissError}
        onDismissSuccess={dismissSuccessMessage}
        className="mx-4 sm:mx-6 mt-3"
      />

      {order && order.items.length > 0 && (
        <section
          aria-label="Itens já enviados para preparo"
          className="mx-4 sm:mx-6 mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
        >
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            Já enviado para preparo
          </h2>
          <ul className="space-y-1.5 text-base">
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
          <div className="mt-2.5 flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <span>Total já pedido</span>
            <span className="tabular-nums">{formatCurrency(order.grand_total)}</span>
          </div>
          {context?.capabilities.customer_payment_enabled && !order.billed && (
            <button
              type="button"
              className="mt-3 w-full min-h-12 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              disabled={payingOnline || !isOnline}
              onClick={payOnline}
            >
              {payingOnline ? 'Abrindo pagamento…' : 'Abrir pagamento online'}
            </button>
          )}
          {context?.capabilities.request_bill_enabled && !order.billed && (
            <button
              type="button"
              className="mt-2.5 w-full min-h-12 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
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

      <div className="flex flex-1 flex-col md:flex-row gap-4 px-4 sm:px-6 pt-4">
        <nav
          aria-label="Categorias do cardápio"
          className="flex md:w-44 shrink-0 flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible self-stretch md:self-start rounded-2xl border border-slate-200 bg-white p-2 shadow-2xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            aria-pressed={selectedCategory === ALL_CATEGORY}
            onClick={() => setSelectedCategory(ALL_CATEGORY)}
            className={`inline-flex min-h-12 shrink-0 items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              selectedCategory === ALL_CATEGORY
                ? 'bg-primary text-primary-foreground'
                : 'text-slate-800 hover:bg-slate-100'
            }`}
          >
            <span>Todos os Itens</span>
            {selectedCategory === ALL_CATEGORY && (
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
          </button>
          {categories.map((category) => {
            const isSelected = selectedCategory === category.course
            return (
              <button
                key={category.course}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedCategory(category.course)}
                className={`inline-flex min-h-12 shrink-0 items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <span>{category.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
            )
          })}
        </nav>

        <main className="flex-1">
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
              title="Nenhum item encontrado"
              description={
                selectedCategory !== ALL_CATEGORY
                  ? 'Não há itens disponíveis nesta categoria no momento.'
                  : 'O cardápio não possui itens disponíveis no momento.'
              }
              actionLabel={
                selectedCategory !== ALL_CATEGORY
                  ? 'Ver todos os itens'
                  : 'Atualizar cardápio'
              }
              onAction={
                selectedCategory !== ALL_CATEGORY
                  ? () => setSelectedCategory(ALL_CATEGORY)
                  : retryInit
              }
              className="rounded-2xl border border-slate-200 bg-white shadow-xs"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {visibleMenu.map((item) => (
                <MenuCard
                  key={item.item}
                  item={item}
                  qtyInCart={cart[item.item]?.qty ?? 0}
                  showImage={context?.capabilities.show_item_images ?? false}
                  onAdd={() => addToCart(item)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {cartCount > 0 && (
        <div
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white shadow-xl"
        >
          {cartExpanded && (
            <div className="max-h-[48vh] overflow-y-auto border-b border-slate-200 p-4">
              <ul className="space-y-2.5 text-base">
                {cartItems.map((entry) => (
                  <li
                    key={entry.item.item}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 truncate">
                        {entry.item.item_name}
                      </div>
                      <div className="text-xs font-medium text-slate-600 tabular-nums">
                        {formatCurrency(entry.item.rate * entry.qty)}
                      </div>
                    </div>
                    <span className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => decrementCart(entry.item.item)}
                        disabled={submitting}
                        className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
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
                        className="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        aria-label={`Aumentar quantidade de ${entry.item.item_name}`}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 px-4 pt-3.5">
            <button
              type="button"
              onClick={() => setCartExpanded((prev) => !prev)}
              className="flex min-h-12 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-expanded={cartExpanded}
            >
              <span className="inline-flex items-center gap-1.5 text-base font-bold text-slate-900">
                <span>
                  {cartCount} {cartCount > 1 ? 'itens na sacola' : 'item na sacola'}
                </span>
                {cartExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-600" aria-hidden="true" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-slate-600" aria-hidden="true" />
                )}
              </span>
              <span className="text-base font-extrabold text-slate-900 tabular-nums">
                {formatCurrency(cartTotal)}
              </span>
            </button>
            <button
              type="button"
              onClick={submitCart}
              disabled={submitting || !isOnline}
              className="min-h-12 rounded-xl bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-xs disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {submitting
                ? 'Enviando…'
                : !isOnline
                ? 'Sem conexão'
                : 'Enviar pedido para preparo'}
            </button>
          </div>
        </div>
      )}

      <Dialog open={showIdleWarning} onOpenChange={(open) => !open && handleStillHere()}>
        <DialogContent onClose={handleStillHere}>
          <DialogHeader>
            <DialogTitle>Você ainda está fazendo seu pedido?</DialogTitle>
            <DialogDescription>
              Toque abaixo para manter sua sacola ativa neste totem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={handleStillHere}
              className="w-full min-h-12 rounded-xl bg-primary py-3 text-base font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Continuar meu pedido
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResetOrderDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={resetSession}
        isKiosk
      />
    </div>
  )
}

function MenuCard({
  item,
  qtyInCart,
  showImage,
  onAdd,
}: {
  item: MenuItem
  qtyInCart: number
  showImage: boolean
  onAdd: () => void
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Adicionar ${item.item_name}, ${formatCurrency(item.rate)}${
        qtyInCart > 0 ? `, ${qtyInCart} na sacola` : ''
      }`}
      className={`flex min-h-[140px] flex-col overflow-hidden rounded-2xl border text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
        qtyInCart > 0
          ? 'border-blue-600 bg-blue-50/25 ring-1 ring-blue-600/20'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {showImage && (
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
              <UtensilsCrossed className="h-8 w-8" aria-hidden="true" />
            </div>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          <div className="text-lg font-semibold text-slate-900 leading-snug">{item.item_name}</div>
          <div className="mt-1 text-base font-bold text-slate-800 tabular-nums">
            {formatCurrency(item.rate)}
          </div>
        </div>
        <div>
          {qtyInCart > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white tabular-nums">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Na sacola: {qtyInCart}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Adicionar</span>
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default PortraitKioskLayout
