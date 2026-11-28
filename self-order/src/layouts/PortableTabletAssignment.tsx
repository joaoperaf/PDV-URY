import { useState } from 'react'
import { parseFrappeError } from '@ury/core'
import { Delete } from 'lucide-react'
import { assignDeviceTable, type OrderingContext } from '../lib/api'
import TabletLayout from './TabletLayout'

type Step = 'pin' | 'table'

const MIN_PIN_LENGTH = 4
const MAX_PIN_LENGTH = 6

const DEVICE_ID_KEY = 'ury_device_id'
const DEVICE_CREDENTIAL_KEY = 'ury_device_credential'

function PortableTabletAssignment() {
  const [step, setStep] = useState<Step>('pin')
  const [pin, setPin] = useState('')
  const [table, setTable] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<OrderingContext | null>(null)

  function handlePinDigit(digit: string) {
    if (pin.length >= MAX_PIN_LENGTH) return
    setPin((prev) => prev + digit)
  }

  function handlePinBackspace() {
    setPin((prev) => prev.slice(0, -1))
  }

  function handlePinSubmit() {
    if (pin.length < MIN_PIN_LENGTH) return
    setError(null)
    setStep('table')
  }

  async function handleAssign() {
    if (!table.trim() || submitting) return

    const deviceId = localStorage.getItem(DEVICE_ID_KEY)
    const deviceCredential = localStorage.getItem(DEVICE_CREDENTIAL_KEY)
    if (!deviceId || !deviceCredential) {
      setError('Este tablet ainda não foi provisionado. Solicite a configuração a um gerente.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const assigned = await assignDeviceTable(deviceId, deviceCredential, pin, table.trim())
      setContext(assigned)
    } catch (err) {
      setError(
        parseFrappeError(
          err,
          'Não foi possível vincular esta mesa. Confira o PIN e o código da mesa e tente novamente.',
        ),
      )
      setPin('')
      setStep('pin')
    } finally {
      setSubmitting(false)
    }
  }

  if (context) {
    return <TabletLayout initialContext={context} />
  }

  const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'BACKSPACE']

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 gap-6 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">Vincular Tablet à Mesa</h1>
          <p className="mt-1 text-xs text-slate-600">
            Uso exclusivo da equipe antes de entregar o tablet ao cliente
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="w-full rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-medium text-red-950"
          >
            {error}
          </div>
        )}

        {step === 'pin' && (
          <div className="flex w-full flex-col items-center gap-4">
            <p className="text-sm font-semibold text-slate-800">Digite o PIN do atendente</p>
            <div
              role="status"
              aria-label={`${pin.length} de ${MAX_PIN_LENGTH} dígitos preenchidos`}
              className="flex gap-2"
            >
              {Array.from({ length: MAX_PIN_LENGTH }).map((_, idx) => (
                <div
                  key={idx}
                  className={`flex h-11 w-9 items-center justify-center rounded-lg border text-lg font-bold ${
                    idx < pin.length
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-slate-50 text-transparent'
                  }`}
                >
                  <span aria-hidden="true">*</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {keypadKeys.map((key, idx) =>
                key === '' ? (
                  <div key={idx} />
                ) : key === 'BACKSPACE' ? (
                  <button
                    key={idx}
                    type="button"
                    aria-label="Apagar último dígito"
                    onClick={handlePinBackspace}
                    disabled={pin.length === 0}
                    className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 transition hover:bg-slate-100 active:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <Delete className="h-5 w-5" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Dígito ${key}`}
                    onClick={() => handlePinDigit(key)}
                    className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-300 bg-white text-lg font-bold text-slate-900 transition hover:bg-slate-50 active:scale-95 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    {key}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={handlePinSubmit}
              disabled={pin.length < MIN_PIN_LENGTH}
              className="w-full min-h-12 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Continuar para mesa
            </button>
          </div>
        )}

        {step === 'table' && (
          <div className="flex w-full flex-col gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="portable-tablet-table"
                className="block text-sm font-semibold text-slate-800"
              >
                Código ou número da mesa
              </label>
              <input
                id="portable-tablet-table"
                value={table}
                onChange={(event) => setTable(event.target.value)}
                placeholder="Ex.: M12"
                className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={handleAssign}
              disabled={!table.trim() || submitting}
              className="w-full min-h-12 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {submitting ? 'Vinculando mesa…' : 'Confirmar e liberar cardápio'}
            </button>
            <button
              type="button"
              onClick={() => setStep('pin')}
              disabled={submitting}
              className="w-full min-h-11 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Voltar ao PIN
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PortableTabletAssignment
