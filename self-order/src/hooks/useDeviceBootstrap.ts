import { useCallback, useEffect, useState } from 'react'
import { parseFrappeError } from '@ury/core'
import { bootstrapDevice, type OrderingContext } from '../lib/api'

const DEVICE_ID_KEY = 'ury_device_id'
const DEVICE_CREDENTIAL_KEY = 'ury_device_credential'

function hasStoredDeviceCredentials(): boolean {
  try {
    return Boolean(
      localStorage.getItem(DEVICE_ID_KEY) && localStorage.getItem(DEVICE_CREDENTIAL_KEY),
    )
  } catch {
    return false
  }
}

export function useDeviceBootstrap() {
  const [isDevice, setIsDevice] = useState<boolean>(hasStoredDeviceCredentials)
  const [deviceContext, setDeviceContext] = useState<OrderingContext | null>(null)
  const [deviceLoading, setDeviceLoading] = useState<boolean>(hasStoredDeviceCredentials)
  const [deviceError, setDeviceError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  const init = useCallback(async () => {
    const deviceId = localStorage.getItem(DEVICE_ID_KEY)
    const deviceCredential = localStorage.getItem(DEVICE_CREDENTIAL_KEY)

    if (!deviceId || !deviceCredential) {
      setIsDevice(false)
      setDeviceLoading(false)
      return
    }

    setIsDevice(true)
    setDeviceLoading(true)
    setDeviceError(null)
    try {
      const context = await bootstrapDevice(deviceId, deviceCredential)
      setDeviceContext(context)
    } catch (err) {
      setDeviceError(
        parseFrappeError(
          err,
          'Não foi possível iniciar este terminal de autoatendimento. Verifique a conexão ou solicite auxílio a um atendente.',
        ),
      )
    } finally {
      setDeviceLoading(false)
    }
  }, [])

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      if (isDevice && !deviceContext) {
        init()
      }
    }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [isDevice, deviceContext, init])

  return { isDevice, deviceContext, deviceLoading, deviceError, isOnline, retryBootstrap: init }
}
