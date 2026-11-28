import { StateMessage } from '@ury/ui'
import { useDeviceBootstrap } from './hooks/useDeviceBootstrap'
import MobileQRLayout from './layouts/MobileQRLayout'
import TabletLayout from './layouts/TabletLayout'
import LandscapeKioskLayout from './layouts/LandscapeKioskLayout'
import PortraitKioskLayout from './layouts/PortraitKioskLayout'
import { SelfOrderLoadingSkeleton } from './layouts/shared/SessionFeedback'
import type { OrderingLayout } from './lib/api'
import { getStoredContext } from './lib/api'

const LAYOUTS: Record<OrderingLayout, typeof MobileQRLayout> = {
  Mobile: MobileQRLayout,
  Tablet: TabletLayout,
  'Landscape Kiosk': LandscapeKioskLayout,
  'Portrait Kiosk': PortraitKioskLayout,
}

function App() {
  const { isDevice, deviceContext, deviceLoading, deviceError, isOnline, retryBootstrap } =
    useDeviceBootstrap()
  const hasQrToken = Boolean(new URLSearchParams(window.location.search).get('t'))
  const hasStoredContext = Boolean(getStoredContext())

  if (isDevice) {
    if (deviceLoading) {
      return <SelfOrderLoadingSkeleton message="Iniciando terminal de autoatendimento…" />
    }
    if (deviceError || !deviceContext) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <StateMessage
            variant={isOnline ? 'error' : 'offline'}
            title={
              isOnline
                ? 'Não foi possível iniciar este terminal'
                : 'Terminal sem conexão com a rede'
            }
            description={
              deviceError ??
              'Não foi possível carregar as configurações deste dispositivo. Solicite auxílio a um atendente.'
            }
            actionLabel="Tentar novamente"
            onAction={retryBootstrap}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm"
          />
        </div>
      )
    }
    const Layout = LAYOUTS[deviceContext.layout] ?? MobileQRLayout
    return <Layout initialContext={deviceContext} />
  }

  if (hasQrToken || hasStoredContext) {
    return <MobileQRLayout />
  }

  window.location.replace('/menu')
  return null
}

export default App
