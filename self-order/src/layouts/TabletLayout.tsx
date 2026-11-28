import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  StateMessage,
} from '@ury/ui'
import { useIdleReset } from '../hooks/useIdleReset'
import { useOrderingSession } from '../hooks/useOrderingSession'
import type { OrderingContext } from '../lib/api'
import CartPanel from './shared/CartPanel'
import MenuGrid from './shared/MenuGrid'
import {
  LiveAnnouncementRegion,
  ResetOrderDialog,
  SelfOrderLoadingSkeleton,
  SessionStatusBanners,
} from './shared/SessionFeedback'

const IDLE_WARN_MS = 60000
const IDLE_RESET_GRACE_MS = 15000

interface LayoutProps {
  initialContext?: OrderingContext
}

function TabletLayout({ initialContext }: LayoutProps) {
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

  if (loading) {
    return <SelfOrderLoadingSkeleton message="Carregando cardápio…" />
  }

  if (error && !context) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <StateMessage
          variant={isOnline ? 'error' : 'offline'}
          title={isOnline ? 'Não foi possível abrir o cardápio' : 'Tablet sem conexão'}
          description={error}
          actionLabel="Tentar novamente"
          onAction={retryInit}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen md:h-screen flex-col md:overflow-hidden bg-slate-50">
      <LiveAnnouncementRegion message={liveAnnouncement} />

      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 py-3.5">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
            {context?.table ? `Mesa ${context.table}` : 'Pedido para Retirada'}
          </h1>
          {context?.restaurant && (
            <p className="text-xs text-slate-600 truncate">{context.restaurant}</p>
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

      <div className="flex flex-1 flex-col md:flex-row md:overflow-hidden">
        <main className="flex-1 md:w-[64%] lg:w-[68%] md:overflow-y-auto p-4 sm:p-6">
          <MenuGrid
            menu={menu}
            cart={cart}
            capabilities={context?.capabilities}
            onAdd={addToCart}
            onRetry={retryInit}
            error={error}
            isOnline={isOnline}
            gridClassName="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4"
            cardClassName="flex min-h-[120px] flex-col overflow-hidden rounded-2xl border text-left transition active:scale-[0.98]"
            imageClassName="aspect-[4/3] w-full overflow-hidden bg-slate-100"
          />
        </main>

        <CartPanel
          context={context}
          order={order}
          cartItems={cartItems}
          cartCount={cartCount}
          cartTotal={cartTotal}
          submitting={submitting}
          billRequested={billRequested}
          payingOnline={payingOnline}
          isOnline={isOnline}
          onIncrement={addToCart}
          onDecrement={decrementCart}
          onSubmit={submitCart}
          onRequestBill={handleRequestBill}
          onPayOnline={payOnline}
          className="flex w-full md:w-[36%] lg:w-[32%] shrink-0 flex-col md:overflow-hidden border-t md:border-t-0 md:border-l border-slate-200 bg-white p-4"
        />
      </div>

      <Dialog open={showIdleWarning} onOpenChange={(open) => !open && handleStillHere()}>
        <DialogContent onClose={handleStillHere}>
          <DialogHeader>
            <DialogTitle>Você ainda está fazendo seu pedido?</DialogTitle>
            <DialogDescription>
              Por segurança, esta sessão será reiniciada em instantes se não houver atividade.
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

export default TabletLayout
