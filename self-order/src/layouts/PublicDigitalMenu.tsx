import { useState, useEffect, useMemo } from 'react'
import { call, formatCurrency } from '@ury/core'

interface PublicMenuItem {
  item: string
  item_name: string
  rate: number
  special_dish: number
  item_image: string | null
  description: string
  course: string | null
  course_label: string | null
}

interface PublicMenuData {
  restaurant_name: string
  branch: string
  menu_name: string
  whatsapp_phone: string
  items: PublicMenuItem[]
}

interface CartRow {
  item: PublicMenuItem
  qty: number
  notes: string
}

export default function PublicDigitalMenu() {
  const [data, setData] = useState<PublicMenuData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [search, setSearch] = useState<string>('')
  const [cart, setCart] = useState<Record<string, CartRow>>({})
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false)
  const [copiedLink, setCopiedLink] = useState<boolean>(false)
  const [copiedOrder, setCopiedOrder] = useState<boolean>(false)

  // Customer checkout fields
  const [deliveryType, setDeliveryType] = useState<'Delivery' | 'Retirada'>('Delivery')
  const [customerName, setCustomerName] = useState<string>('')
  const [customerPhone, setCustomerPhone] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [neighborhood, setNeighborhood] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Cartão na Entrega' | 'Dinheiro'>('PIX')
  const [changeFor, setChangeFor] = useState<string>('')
  const [orderNotes, setOrderNotes] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await call.get<{ message: PublicMenuData }>('ury.ury_pos.api.get_public_menu')
        const payload = res?.message ?? (res as unknown as PublicMenuData)
        if (!cancelled) {
          setData(payload)
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Não foi possível carregar o cardápio digital.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    if (!data?.items) return []
    const map = new Map<string, string>()
    for (const it of data.items) {
      const key = it.course || 'Outros'
      const label = it.course_label || key
      if (!map.has(key)) map.set(key, label)
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [data])

  const filteredItems = useMemo(() => {
    if (!data?.items) return []
    return data.items.filter((it) => {
      const matchesCat =
        selectedCategory === 'ALL' ||
        (selectedCategory === 'SPECIAL' && it.special_dish === 1) ||
        (it.course || 'Outros') === selectedCategory
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        it.item_name.toLowerCase().includes(q) ||
        (it.description || '').toLowerCase().includes(q)
      return matchesCat && matchesSearch
    })
  }, [data, selectedCategory, search])

  const cartRows = useMemo(() => Object.values(cart), [cart])
  const cartCount = useMemo(() => cartRows.reduce((acc, r) => acc + r.qty, 0), [cartRows])
  const cartTotal = useMemo(
    () => cartRows.reduce((acc, r) => acc + r.item.rate * r.qty, 0),
    [cartRows]
  )

  const addItem = (item: PublicMenuItem) => {
    setCart((prev) => {
      const existing = prev[item.item]
      return {
        ...prev,
        [item.item]: {
          item,
          qty: (existing?.qty || 0) + 1,
          notes: existing?.notes || '',
        },
      }
    })
  }

  const updateQty = (itemCode: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[itemCode]
      if (!existing) return prev
      const nextQty = existing.qty + delta
      if (nextQty <= 0) {
        const copy = { ...prev }
        delete copy[itemCode]
        return copy
      }
      return {
        ...prev,
        [itemCode]: { ...existing, qty: nextQty },
      }
    })
  }

  const updateItemNotes = (itemCode: string, notes: string) => {
    setCart((prev) => {
      const existing = prev[itemCode]
      if (!existing) return prev
      return {
        ...prev,
        [itemCode]: { ...existing, notes },
      }
    })
  }

  const handleShareLink = () => {
    navigator.clipboard?.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const buildWhatsAppMessage = () => {
    const storeName = data?.restaurant_name || 'Péricles Burger'
    const lines: string[] = [
      `🍔 *NOVO PEDIDO — ${storeName.toUpperCase()}*`,
      `----------------------------------`,
      `*Tipo:* ${deliveryType === 'Delivery' ? '🛵 Entrega (Delivery)' : '🛍️ Retirada no Balcão'}`,
      `*Cliente:* ${customerName || 'Não informado'}`,
    ]
    if (customerPhone) {
      lines.push(`*Telefone:* ${customerPhone}`)
    }
    if (deliveryType === 'Delivery') {
      lines.push(`*Endereço:* ${address || 'Não informado'}`)
      if (neighborhood) lines.push(`*Bairro / Ref:* ${neighborhood}`)
    }
    lines.push(`----------------------------------`)
    lines.push(`*ITENS DO PEDIDO:*`)
    for (const row of cartRows) {
      const sub = formatCurrency(row.item.rate * row.qty)
      lines.push(`• ${row.qty}x *${row.item.item_name}* — ${sub}`)
      if (row.notes.trim()) {
        lines.push(`   _Obs: ${row.notes.trim()}_`)
      }
    }
    lines.push(`----------------------------------`)
    lines.push(`*TOTAL:* *${formatCurrency(cartTotal)}*`)
    lines.push(`*Pagamento:* ${paymentMethod}`)
    if (paymentMethod === 'Dinheiro' && changeFor.trim()) {
      lines.push(`*Troco para:* R$ ${changeFor.trim()}`)
    }
    if (orderNotes.trim()) {
      lines.push(`*Observações Gerais:* ${orderNotes.trim()}`)
    }
    return lines.join('\n')
  }

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault()
    if (cartRows.length === 0) return
    if (!customerName.trim()) {
      alert('Por favor, informe seu nome.')
      return
    }
    if (deliveryType === 'Delivery' && !address.trim()) {
      alert('Por favor, informe o endereço de entrega.')
      return
    }

    const message = buildWhatsAppMessage()
    const rawPhone = (data?.whatsapp_phone || '').replace(/\D/g, '')
    const encoded = encodeURIComponent(message)

    if (rawPhone.length >= 10) {
      const phoneWithCountry = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`
      window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank')
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank')
    }
  }

  const handleCopyOrderText = () => {
    const message = buildWhatsAppMessage()
    navigator.clipboard?.writeText(message)
    setCopiedOrder(true)
    setTimeout(() => setCopiedOrder(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-600">
        Carregando cardápio digital…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-red-600">
        {error}
      </div>
    )
  }

  const storeName = data?.restaurant_name || 'Péricles Burger'

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 font-sans text-neutral-900">
      {/* Top Banner / Header */}
      <header className="bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-md">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl backdrop-blur-xs">
                🍔
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight">{storeName}</h1>
                  <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-300/40">
                    • Aberto
                  </span>
                </div>
                <p className="text-sm text-amber-100">
                  Cardápio Digital • Delivery & Retirada Rápida
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleShareLink}
              className="rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/25"
            >
              {copiedLink ? '✓ Link Copiado!' : '🔗 Compartilhar Cardápio'}
            </button>
          </div>

          {/* Search Input */}
          <div className="mt-5">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar hambúrguer, porção ou bebida..."
              className="w-full rounded-xl bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-xs focus:outline-none"
            />
          </div>
        </div>
      </header>

      {/* Category Pills */}
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto px-4 py-3">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
              selectedCategory === 'ALL'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Todos ({data?.items.length || 0})
          </button>
          {data?.items.some((i) => i.special_dish === 1) && (
            <button
              type="button"
              onClick={() => setSelectedCategory('SPECIAL')}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                selectedCategory === 'SPECIAL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              ⭐ Destaques da Casa
            </button>
          )}
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                selectedCategory === cat.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-neutral-500">
            Nenhum item encontrado para esta busca.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredItems.map((item) => {
              const inCartQty = cart[item.item]?.qty || 0
              return (
                <div
                  key={item.item}
                  className="flex justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs transition hover:border-amber-300 hover:shadow-md"
                >
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-neutral-900">
                          {item.item_name}
                        </h3>
                        {item.special_dish === 1 && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            Destaque
                          </span>
                        )}
                      </div>
                      {item.course_label && (
                        <span className="text-[11px] font-medium text-neutral-400">
                          {item.course_label}
                        </span>
                      )}
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                          {item.description.replace(/<[^>]+>/g, '')}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-base font-extrabold text-amber-700">
                        {formatCurrency(item.rate)}
                      </span>

                      {inCartQty === 0 ? (
                        <button
                          type="button"
                          onClick={() => addItem(item)}
                          className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700"
                        >
                          + Adicionar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateQty(item.item, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-sm font-bold text-amber-700 shadow-2xs"
                          >
                            -
                          </button>
                          <span className="min-w-5 text-center text-xs font-extrabold text-amber-900">
                            {inCartQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.item, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white shadow-2xs"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {item.item_image ? (
                    <img
                      src={item.item_image}
                      alt={item.item_name}
                      className="h-24 w-24 shrink-0 rounded-xl object-cover bg-neutral-100"
                    />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-3xl">
                      🍔
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Bottom Floating Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 p-3 shadow-2xl backdrop-blur-xs">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-neutral-500">
                {cartCount} {cartCount === 1 ? 'item na sacola' : 'itens na sacola'}
              </p>
              <p className="text-lg font-extrabold text-neutral-900">
                {formatCurrency(cartTotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700"
            >
              Ver Sacola / Finalizar Pedido →
            </button>
          </div>
        </div>
      )}

      {/* Checkout Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="text-lg font-extrabold text-neutral-900">
                Sua Sacola — {storeName}
              </h2>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="rounded-lg px-2.5 py-1 text-sm font-bold text-neutral-500 hover:bg-neutral-100"
              >
                ✕ Fechar
              </button>
            </div>

            <form onSubmit={handleSendWhatsApp} className="flex-1 space-y-5 overflow-y-auto p-5 text-sm">
              {/* Items in cart */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Itens Selecionados
                </h3>
                {cartRows.map((row) => (
                  <div
                    key={row.item.item}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-neutral-900">{row.item.item_name}</p>
                        <p className="text-xs font-semibold text-amber-700">
                          {formatCurrency(row.item.rate * row.qty)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQty(row.item.item, -1)}
                          className="h-7 w-7 rounded-lg border bg-white font-bold"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold">{row.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(row.item.item, 1)}
                          className="h-7 w-7 rounded-lg bg-amber-600 font-bold text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => updateItemNotes(row.item.item, e.target.value)}
                      placeholder="Observação deste item (ex: sem cebola, ponto da carne)..."
                      className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs placeholder-neutral-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* Delivery vs Pickup */}
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Como deseja receber?
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['Delivery', 'Retirada'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDeliveryType(type)}
                      className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                        deliveryType === type
                          ? 'border-amber-600 bg-amber-50 text-amber-900'
                          : 'border-neutral-200 bg-white text-neutral-600'
                      }`}
                    >
                      {type === 'Delivery' ? '🛵 Entrega (Delivery)' : '🛍️ Retirar no Balcão'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Seus Dados
                </h3>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Seu Nome *"
                  className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Seu WhatsApp / Telefone"
                  className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                />
                {deliveryType === 'Delivery' && (
                  <>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Endereço completo (Rua, Número, Compl.) *"
                      className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Bairro / Ponto de Referência"
                      className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-none"
                    />
                  </>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Forma de Pagamento
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['PIX', 'Cartão na Entrega', 'Dinheiro'] as const).map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
                        paymentMethod === pm
                          ? 'border-amber-600 bg-amber-50 text-amber-900'
                          : 'border-neutral-200 bg-white text-neutral-600'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
                {paymentMethod === 'Dinheiro' && (
                  <input
                    type="text"
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                    placeholder="Precisa de troco para quanto? (Ex: 100,00)"
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-xs focus:border-amber-600 focus:outline-none"
                  />
                )}
              </div>

              {/* General Notes */}
              <div>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Observações gerais do pedido (opcional)..."
                  className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-xs focus:border-amber-600 focus:outline-none"
                />
              </div>

              {/* Total & Submit */}
              <div className="border-t border-neutral-200 pt-4 space-y-2">
                <div className="flex items-center justify-between text-base font-extrabold">
                  <span>Total do Pedido</span>
                  <span className="text-amber-700">{formatCurrency(cartTotal)}</span>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-md transition hover:bg-emerald-700"
                >
                  📲 Enviar Pedido pelo WhatsApp
                </button>

                <button
                  type="button"
                  onClick={handleCopyOrderText}
                  className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 text-xs font-bold text-neutral-700 transition hover:bg-neutral-50"
                >
                  {copiedOrder ? '✓ Resumo do Pedido Copiado!' : '📋 Copiar Resumo do Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
