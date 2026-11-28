import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ury/ui'
import { AlertTriangle, CheckCircle2, WifiOff, X } from 'lucide-react'

export function LiveAnnouncementRegion({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  )
}

export function SelfOrderLoadingSkeleton({ message = 'Carregando cardápio…' }: { message?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="min-h-screen bg-slate-50 p-4 sm:p-6 space-y-5"
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-white rounded-xl px-4 py-3.5 shadow-xs motion-safe:animate-pulse">
        <div className="h-6 w-44 rounded bg-slate-200" />
        <div className="h-9 w-28 rounded-lg bg-slate-100" />
      </div>
      <p className="text-sm font-medium text-slate-600">{message}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs motion-safe:animate-pulse"
          >
            <div className="aspect-[4/3] w-full bg-slate-200" />
            <div className="p-3.5 space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface SessionStatusBannersProps {
  isOnline: boolean
  error: string | null
  successMessage: string | null
  onRetry?: () => void
  onDismissError?: () => void
  onDismissSuccess?: () => void
  className?: string
}

export function SessionStatusBanners({
  isOnline,
  error,
  successMessage,
  onRetry,
  onDismissError,
  onDismissSuccess,
  className = '',
}: SessionStatusBannersProps) {
  if (!isOnline && !error && !successMessage) {
    return null
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {!isOnline && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-amber-950"
        >
          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
            <WifiOff className="w-4 h-4 text-amber-800 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <span>
              <strong>Sem conexão com a internet:</strong> reconecte para enviar ou atualizar seu pedido.
            </span>
          </div>
          {onRetry && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="min-h-11 bg-white text-slate-900 border-slate-300 font-semibold"
            >
              Tentar novamente
            </Button>
          )}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-red-950"
        >
          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2">
            {onRetry && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="min-h-11 bg-white text-slate-900 border-slate-300 font-semibold"
              >
                Recarregar
              </Button>
            )}
            {onDismissError && (
              <button
                type="button"
                aria-label="Fechar aviso de erro"
                onClick={onDismissError}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-900 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm text-emerald-950"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          {onDismissSuccess && (
            <button
              type="button"
              aria-label="Fechar confirmação"
              onClick={onDismissSuccess}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-emerald-900 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface ResetOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isKiosk?: boolean
}

export function ResetOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  isKiosk = false,
}: ResetOrderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>
            {isKiosk ? 'Iniciar um novo atendimento?' : 'Limpar seleção e recomeçar?'}
          </DialogTitle>
          <DialogDescription>
            Os itens adicionados na sacola que ainda não foram enviados para preparo serão removidos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-11 font-semibold"
          >
            Continuar no pedido
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onOpenChange(false)
              onConfirm()
            }}
            className="min-h-11 font-semibold"
          >
            Sim, recomeçar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
