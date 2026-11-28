import { useCallback, useEffect, useState } from 'react'
import { formatCurrency, parseFrappeError } from '@ury/core'
import {
  addItems,
  bootstrap,
  createPaymentRequest,
  getCurrentOrder,
  getMenu,
  getStoredContext,
  requestBill,
  type CustomerOrder,
  type MenuItem,
  type OrderingContext,
  type PaymentRequestResult,
} from '../lib/api'

const SESSION_KEY = 'ury_order_session'
const CONTEXT_KEY = 'ury_order_context'

type Cart = Record<string, { item: MenuItem; qty: number }>

function useQueryToken(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('t')
}

export function useOrderingSession(initialContext?: OrderingContext) {
  const token = useQueryToken()
  const [context, setContext] = useState<OrderingContext | null>(null)
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [order, setOrder] = useState<CustomerOrder | null>(null)
  const [cart, setCart] = useState<Cart>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [billRequested, setBillRequested] = useState(false)
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequestResult | null>(null)
  const [payingOnline, setPayingOnline] = useState(false)
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadOrder = useCallback(async (session: string) => {
    const current = await getCurrentOrder(session)
    setOrder(current)
  }, [])

  const init = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let ctx: OrderingContext
      if (initialContext) {
        ctx = initialContext
      } else if (token) {
        ctx = await bootstrap(token)
      } else {
        const storedContext = getStoredContext()
        if (storedContext) {
          ctx = storedContext
        } else {
          setError(
            'Este link não possui um código de atendimento válido. Escaneie novamente o QR Code da mesa ou do balcão.',
          )
          setLoading(false)
          return
        }
      }
      setContext(ctx)
      const menuResponse = await getMenu(ctx.session)
      setMenu(menuResponse.items.filter((item) => !item.disabled))
      await loadOrder(ctx.session)
    } catch (err) {
      setError(
        parseFrappeError(
          err,
          'Não foi possível carregar o cardápio. Verifique sua conexão ou escaneie novamente o QR Code.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [initialContext, token, loadOrder])

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLiveAnnouncement('Conexão com a internet restabelecida.')
    }
    const handleOffline = () => {
      setIsOnline(false)
      setLiveAnnouncement('Dispositivo sem conexão com a internet.')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const resetSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(CONTEXT_KEY)
    setCart({})
    setOrder(null)
    setBillRequested(false)
    setPaymentRequest(null)
    setPayingOnline(false)
    setSubmitting(false)
    setError(null)
    setSuccessMessage(null)
    setContext(null)
    setMenu([])
    setLiveAnnouncement('Pedido reiniciado. Sacola limpa.')
    init()
  }, [init])

  function addToCart(item: MenuItem) {
    setSuccessMessage(null)
    setCart((prev) => {
      const existing = prev[item.item]
      const nextQty = (existing?.qty ?? 0) + 1
      const next = { ...prev, [item.item]: { item, qty: nextQty } }
      const total = Object.values(next).reduce((s, e) => s + e.qty * e.item.rate, 0)
      setLiveAnnouncement(
        `${item.item_name} adicionado. ${nextQty} na sacola, subtotal ${formatCurrency(total)}.`,
      )
      return next
    })
  }

  function decrementCart(itemCode: string) {
    setCart((prev) => {
      const existing = prev[itemCode]
      if (!existing) return prev
      let next: Cart
      if (existing.qty <= 1) {
        next = { ...prev }
        delete next[itemCode]
        const total = Object.values(next).reduce((s, e) => s + e.qty * e.item.rate, 0)
        setLiveAnnouncement(
          `${existing.item.item_name} removido da sacola. Subtotal ${formatCurrency(total)}.`,
        )
      } else {
        const nextQty = existing.qty - 1
        next = { ...prev, [itemCode]: { ...existing, qty: nextQty } }
        const total = Object.values(next).reduce((s, e) => s + e.qty * e.item.rate, 0)
        setLiveAnnouncement(
          `Quantidade de ${existing.item.item_name} alterada para ${nextQty}. Subtotal ${formatCurrency(total)}.`,
        )
      }
      return next
    })
  }

  const cartItems = Object.values(cart)
  const cartCount = cartItems.reduce((sum, entry) => sum + entry.qty, 0)
  const cartTotal = cartItems.reduce((sum, entry) => sum + entry.qty * entry.item.rate, 0)

  async function submitCart() {
    if (!context || cartItems.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const sentCount = cartCount
      const payload = cartItems.map((entry) => ({ item: entry.item.item, qty: entry.qty }))
      const updated = await addItems(context.session, payload)
      setOrder(updated)
      setCart({})
      const msg =
        sentCount === 1
          ? '1 item enviado para preparo na cozinha!'
          : `${sentCount} itens enviados para preparo na cozinha!`
      setSuccessMessage(msg)
      setLiveAnnouncement(msg)
    } catch (err) {
      const msg = parseFrappeError(
        err,
        'Não foi possível enviar o pedido para preparo. Verifique sua conexão e tente novamente.',
      )
      setError(msg)
      setLiveAnnouncement(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestBill() {
    if (!context) return
    setError(null)
    try {
      await requestBill(context.session)
      setBillRequested(true)
      setLiveAnnouncement('Fechamento da conta solicitado. Um atendente foi avisado.')
    } catch (err) {
      const msg = parseFrappeError(
        err,
        'Não foi possível solicitar a conta pelo aplicativo. Por favor, chame um atendente.',
      )
      setError(msg)
      setLiveAnnouncement(msg)
    }
  }

  async function payOnline() {
    if (!context) return
    setPayingOnline(true)
    setError(null)
    try {
      const result = await createPaymentRequest(context.session)
      setPaymentRequest(result)
      if (result.payment_url) {
        window.location.href = result.payment_url
      } else {
        setLiveAnnouncement(
          'Solicitação de pagamento criada. Um atendente concluirá o atendimento.',
        )
      }
    } catch (err) {
      const msg = parseFrappeError(
        err,
        'Não foi possível abrir o pagamento online no momento. Você pode pagar diretamente no caixa.',
      )
      setError(msg)
      setLiveAnnouncement(msg)
    } finally {
      setPayingOnline(false)
    }
  }

  return {
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
    dismissSuccessMessage: () => setSuccessMessage(null),
    dismissError: () => setError(null),
    retryInit: init,
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
  }
}
