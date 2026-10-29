import { useDeviceBootstrap } from './hooks/useDeviceBootstrap'
import MobileQRLayout from './layouts/MobileQRLayout'
import TabletLayout from './layouts/TabletLayout'
import LandscapeKioskLayout from './layouts/LandscapeKioskLayout'
import PortraitKioskLayout from './layouts/PortraitKioskLayout'
import PublicDigitalMenu from './layouts/PublicDigitalMenu'
import type { OrderingLayout } from './lib/api'

const LAYOUTS: Record<OrderingLayout, typeof MobileQRLayout> = {
  Mobile: MobileQRLayout,
  Tablet: TabletLayout,
  'Landscape Kiosk': LandscapeKioskLayout,
  'Portrait Kiosk': PortraitKioskLayout,
}

function App() {
  const { isDevice, deviceContext, deviceLoading, deviceError } = useDeviceBootstrap()
  const hasQrToken = Boolean(new URLSearchParams(window.location.search).get('t'))

  if (isDevice) {
    if (deviceLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          Iniciando…
        </div>
      )
    }
    if (deviceError || !deviceContext) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6 text-center text-destructive">
          {deviceError ?? 'Não foi possível iniciar este dispositivo. Por favor, chame um atendente.'}
        </div>
      )
    }
    const Layout = LAYOUTS[deviceContext.layout] ?? MobileQRLayout
    return <Layout initialContext={deviceContext} />
  }

  if (hasQrToken) {
    return <MobileQRLayout />
  }

  return <PublicDigitalMenu />
}

export default App
