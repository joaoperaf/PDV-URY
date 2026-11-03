const state = { menu: null, category: 'Todos', search: '', cart: {}, selectedItem: null, customization: null, editingCartKey: null };
const $ = (id) => document.getElementById(id);
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const menuUrl = new URL('menu.json', document.currentScript?.src || window.location.href);
const categoryLabels = { Todos: 'Todos', Hamburgers: 'Hambúrgueres', Starters: 'Entradas', Beverages: 'Bebidas' };
const addOns = [
  { id: 'extra-meat', name: 'Mais uma carne', price: 12 },
  { id: 'bacon', name: 'Bacon', price: 8 },
  { id: 'caramelized-onion', name: 'Cebola caramelizada', price: 6 },
  { id: 'extra-cheese', name: 'Mais queijo', price: 6 },
];

async function loadMenu() {
  try {
    state.menu = await fetch(menuUrl).then((response) => {
      if (!response.ok) throw new Error('Não foi possível carregar o cardápio.');
      return response.json();
    });
    render();
  } catch (error) {
    $('menu-status').className = 'status status-error';
    $('menu-status').textContent = error.message;
  }
}

function categories() {
  return ['Todos', ...new Set(state.menu.items.filter((item) => item.available).map((item) => item.category))];
}

function visibleItems() {
  const query = state.search.toLowerCase().trim();
  return state.menu.items.filter((item) => item.available
    && (state.category === 'Todos' || item.category === state.category)
    && (!query || `${item.name} ${item.description}`.toLowerCase().includes(query)));
}

function cartRows() { return Object.values(state.cart); }
function total() { return cartRows().reduce((sum, row) => sum + row.item.price * row.quantity, 0); }
function count() { return cartRows().reduce((sum, row) => sum + row.quantity, 0); }

function add(item) {
  const existing = state.cart[item.id];
  state.cart[item.id] = { item, quantity: (existing?.quantity || 0) + 1 };
  render();
  setCartOpen(true);
}

function changeQuantity(id, amount) {
  const row = state.cart[id];
  if (!row) return;
  row.quantity += amount;
  if (row.quantity <= 0) delete state.cart[id];
  render();
}

function openItemDetails(item, existing = null, cartKey = null) {
  state.selectedItem = item;
  state.editingCartKey = cartKey;
  state.customization = {
    meatPoint: existing?.details?.meatPoint || 'Ao ponto',
    notes: existing?.details?.notes || '',
    addOns: Object.fromEntries(addOns.map((option) => [
      option.id,
      existing?.details?.extras?.find((extra) => extra.id === option.id)?.quantity
        || (existing?.details?.extras?.includes(option.name) ? 1 : 0),
    ])),
    quantity: existing?.quantity || 1,
  };
  renderDetails();
}

function closeItemDetails() {
  state.selectedItem = null;
  state.customization = null;
  state.editingCartKey = null;
  $('item-details').classList.remove('visible');
  $('item-details').setAttribute('aria-hidden', 'true');
  $('item-details').innerHTML = '';
}

function customizationTotal() {
  if (!state.selectedItem || !state.customization) return 0;
  const extras = addOns.reduce((sum, option) =>
    sum + option.price * (state.customization.addOns[option.id] || 0), 0);
  return (state.selectedItem.price + extras) * state.customization.quantity;
}

function customizationSummary() {
  const customization = state.customization;
  const extras = addOns
    .filter((option) => customization.addOns[option.id] > 0)
    .map((option) => `${customization.addOns[option.id]}x ${option.name}`);
  const choices = [];
  if (state.selectedItem?.category === 'Hamburgers') {
    choices.push(`Carne: ${customization.meatPoint}`);
  }
  if (extras.length) choices.push(extras.join(', '));
  if (customization.notes.trim()) choices.push('Com observações');
  return choices.length ? choices.join(' · ') : 'Nenhuma personalização adicionada';
}

function renderDetails() {
  const item = state.selectedItem;
  const customization = state.customization;
  if (!item || !customization) return;
  const details = $('item-details');
  const isBurger = item.category === 'Hamburgers';
  details.classList.add('visible');
  details.setAttribute('aria-hidden', 'false');
  details.setAttribute('role', 'dialog');
  details.setAttribute('aria-modal', 'true');
  details.setAttribute('aria-label', `Personalizar ${item.name}`);
  details.innerHTML = `
    <div class="details-inner">
      <button class="details-close" type="button" data-close-details aria-label="Fechar detalhes de ${escapeHtml(item.name)}">×</button>
      <div class="details-product">
        <img class="details-image" src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.name)}">
        <div class="details-copy">
          <span class="card-category">${escapeHtml(categoryLabels[item.category] || item.category)}</span>
          <h2>${escapeHtml(item.name)}</h2>
          <p>${escapeHtml(item.description || 'Escolha como você quer seu pedido.')}</p>
          <strong class="details-base-price">${money(item.price)} <small>unidade</small></strong>
        </div>
      </div>
      <div class="details-options">
        ${isBurger ? `
          <fieldset>
            <legend>Ponto da carne</legend>
            <div class="option-grid">
              ${['Mal passada', 'Ao ponto', 'Bem passada'].map((point) => `
                <label class="choice ${customization.meatPoint === point ? 'selected' : ''}">
                  <input type="radio" name="meat-point" value="${point}" ${customization.meatPoint === point ? 'checked' : ''}>
                  <span>${point}</span>
                </label>
              `).join('')}
            </div>
          </fieldset>
        ` : ''}
        <fieldset>
          <legend>Adicionais</legend>
          <div class="add-on-list">
            ${addOns.map((option) => `
              <div class="add-on">
                <span><strong>${option.name}</strong><small>+ ${money(option.price)} cada</small></span>
                <div class="add-on-quantity">
                  <button type="button" data-extra-quantity="${option.id}" data-change="-1" aria-label="Diminuir ${option.name}">−</button>
                  <strong data-extra-count="${option.id}">${customization.addOns[option.id] || 0}</strong>
                  <button type="button" data-extra-quantity="${option.id}" data-change="1" aria-label="Aumentar ${option.name}">+</button>
                </div>
              </div>
            `).join('')}
          </div>
        </fieldset>
        <label class="notes-label" for="item-notes">Observações do pedido</label>
        <textarea id="item-notes" rows="2" placeholder="Ex.: sem molho, cortar ao meio...">${escapeHtml(customization.notes)}</textarea>
        <div class="selection-summary" aria-live="polite">
          <span>Resumo do item</span>
          <strong data-customization-summary>${escapeHtml(customizationSummary())}</strong>
        </div>
      </div>
      <div class="details-footer">
        <div class="detail-quantity">
          <button type="button" data-detail-quantity="-1" aria-label="Diminuir quantidade">−</button>
          <strong>${customization.quantity}</strong>
          <button type="button" data-detail-quantity="1" aria-label="Aumentar quantidade">+</button>
        </div>
        <button class="confirm-item" type="button" data-confirm-item>
          Adicionar ao pedido <strong data-customization-total>${money(customizationTotal())}</strong>
        </button>
      </div>
    </div>
  `;
  details.querySelector('[data-close-details]').addEventListener('click', closeItemDetails);
  details.querySelectorAll('[name="meat-point"]').forEach((input) => input.addEventListener('change', (event) => {
    state.customization.meatPoint = event.target.value;
    details.querySelectorAll('.choice').forEach((choice) => {
      choice.classList.toggle('selected', choice.querySelector('input').checked);
    });
  }));
  details.querySelectorAll('[data-extra-quantity]').forEach((button) => button.addEventListener('click', (event) => {
    const id = event.currentTarget.dataset.extraQuantity;
    state.customization.addOns[id] = Math.max(0, (state.customization.addOns[id] || 0) + Number(event.currentTarget.dataset.change));
    details.querySelector(`[data-extra-count="${id}"]`).textContent = state.customization.addOns[id];
    updateCustomizationTotal();
  }));
  details.querySelector('#item-notes').addEventListener('input', (event) => {
    state.customization.notes = event.target.value;
    updateCustomizationSummary();
  });
  details.querySelectorAll('[data-detail-quantity]').forEach((button) => button.addEventListener('click', () => {
    state.customization.quantity = Math.max(1, state.customization.quantity + Number(button.dataset.detailQuantity));
    details.querySelector('.detail-quantity strong').textContent = state.customization.quantity;
    updateCustomizationTotal();
  }));
  details.querySelector('[data-confirm-item]').addEventListener('click', () => {
    const extras = addOns
      .filter((option) => state.customization.addOns[option.id] > 0)
      .map((option) => ({ id: option.id, name: option.name, quantity: state.customization.addOns[option.id] }));
    const key = state.editingCartKey || `${item.id}-${Date.now()}`;
    state.cart[key] = {
      item: {
        ...item,
        id: key,
        price: item.price + extras.reduce((sum, extra) => {
          const option = addOns.find((addOn) => addOn.id === extra.id);
          return sum + (option?.price || 0) * extra.quantity;
        }, 0),
      },
      quantity: state.customization.quantity,
      details: {
        meatPoint: isBurger ? state.customization.meatPoint : '',
        notes: state.customization.notes,
        extras,
      },
    };
    if (state.editingCartKey && state.editingCartKey !== key) delete state.cart[state.editingCartKey];
    closeItemDetails();
    render();
    setCartOpen(true);
  });
}

function updateCustomizationTotal() {
  const totalElement = $('item-details').querySelector('[data-customization-total]');
  if (totalElement) totalElement.textContent = money(customizationTotal());
  updateCustomizationSummary();
}

function updateCustomizationSummary() {
  const summaryElement = $('item-details').querySelector('[data-customization-summary]');
  if (summaryElement) summaryElement.textContent = customizationSummary();
}

function render() {
  const categoryElement = $('categories');
  categoryElement.innerHTML = categories().map((category) =>
    `<button class="category ${category === state.category ? 'active' : ''}" data-category="${escapeHtml(category)}" aria-pressed="${category === state.category}">${escapeHtml(categoryLabels[category] || category)}</button>`
  ).join('');
  categoryElement.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => { state.category = button.dataset.category; render(); });
  });

  const items = visibleItems();
  $('menu-count').textContent = `${items.length} ${items.length === 1 ? 'item disponível' : 'itens disponíveis'}`;
  $('menu-status').className = items.length ? 'status' : 'status status-empty';
  $('menu-status').textContent = items.length ? '' : 'Nenhum item encontrado. Tente outra busca ou categoria.';
  $('menu').innerHTML = items.map((item) => `
    <article class="card" data-open-item="${escapeHtml(item.id)}" tabindex="0" role="button" aria-label="Personalizar ${escapeHtml(item.name)}">
      <img class="card-image" src="${escapeHtml(item.image || '')}" alt="" loading="lazy">
      <div class="card-content">
        <div>
          <div class="card-category">${escapeHtml(categoryLabels[item.category] || item.category)}</div>
          <h2>${escapeHtml(item.name)}</h2>
          <p>${escapeHtml(item.description || '')}</p>
        </div>
        <div class="card-bottom">
          <span class="price">${money(item.price)}</span>
          <button class="add-button" data-add="${item.id}" type="button" aria-label="Adicionar ${escapeHtml(item.name)} ao pedido"><span aria-hidden="true">+</span> Adicionar</button>
        </div>
      </div>
    </article>
  `).join('');
  $('menu').querySelectorAll('[data-add]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openItemDetails(state.menu.items.find((item) => item.id === button.dataset.add));
    });
  });
  $('menu').querySelectorAll('[data-open-item]').forEach((card) => {
    const open = () => openItemDetails(state.menu.items.find((item) => item.id === card.dataset.openItem));
    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });

  $('cart-count').textContent = `${count()} ${count() === 1 ? 'item' : 'itens'}`;
  $('cart-total').textContent = money(total());
  $('floating-total').textContent = money(total());
  $('open-cart').classList.toggle('visible', count() > 0);
  $('open-cart').setAttribute('aria-label', `Ver pedido, ${count()} ${count() === 1 ? 'item' : 'itens'}, ${money(total())}`);
  $('cart-items').innerHTML = cartRows().map((row) => `
    <div class="cart-row">
      <img class="cart-item-image" src="${escapeHtml(row.item.image || '')}" alt="" loading="lazy">
      <div class="cart-item-details">
        <strong>${escapeHtml(row.item.name)}</strong>
        <small>${escapeHtml(row.details?.extras?.length
          ? row.details.extras.map((extra) => `${extra.quantity}x ${extra.name}`).join(', ')
          : categoryLabels[row.item.category] || row.item.category)}</small>
        ${row.details?.meatPoint ? `<small>Carne: ${escapeHtml(row.details.meatPoint)}</small>` : ''}
        ${row.details?.notes ? `<small>Obs.: ${escapeHtml(row.details.notes)}</small>` : ''}
        <div class="quantity"><button type="button" data-minus="${row.item.id}" aria-label="Diminuir ${escapeHtml(row.item.name)}">−</button><span>${row.quantity}</span><button type="button" data-plus="${row.item.id}" aria-label="Aumentar ${escapeHtml(row.item.name)}">+</button><button class="edit-item" type="button" data-edit="${row.item.id}" aria-label="Editar ${escapeHtml(row.item.name)}">Editar</button></div>
      </div>
      <div class="cart-line-price"><small>${money(row.item.price)} cada</small><strong class="cart-line-total">${money(row.item.price * row.quantity)}</strong></div>
    </div>
  `).join('') || '<p class="status">Adicione itens ao pedido.</p>';
  $('cart-items').querySelectorAll('[data-minus]').forEach((button) => button.addEventListener('click', () => changeQuantity(button.dataset.minus, -1)));
  $('cart-items').querySelectorAll('[data-plus]').forEach((button) => button.addEventListener('click', () => changeQuantity(button.dataset.plus, 1)));
  $('cart-items').querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => {
    const row = state.cart[button.dataset.edit];
    if (row) openItemDetails(row.item, row, button.dataset.edit);
  }));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function setCartOpen(isOpen) {
  $('cart-panel').classList.toggle('open', isOpen);
  $('cart-panel').setAttribute('aria-hidden', String(!isOpen));
  $('cart-backdrop').classList.toggle('visible', isOpen);
  $('open-cart').setAttribute('aria-expanded', String(isOpen));
}

function sendWhatsApp(event) {
  event.preventDefault();
  if (!count()) return;
  const form = new FormData(event.currentTarget);
  const type = form.get('type') === 'pickup' ? 'Retirada no balcão' : 'Entrega';
  const lines = [`🍔 *NOVO PEDIDO — ${state.menu.restaurantName.toUpperCase()}*`, `*Cliente:* ${form.get('name')}`, `*Tipo:* ${type}`];
  if (form.get('phone')) lines.push(`*Telefone:* ${form.get('phone')}`);
  if (type === 'Entrega' && form.get('address')) lines.push(`*Endereço:* ${form.get('address')}`);
  lines.push('', '*ITENS:*', ...cartRows().map((row) => `• ${row.quantity}x ${row.item.name} — ${money(row.item.price * row.quantity)}`), '', `*TOTAL:* ${money(total())}`, `*Pagamento:* ${form.get('payment')}`);
  if (form.get('notes')) lines.push(`*Observações:* ${form.get('notes')}`);
  const phone = String(state.menu.whatsappPhone || '').replace(/\D/g, '');
  if (!phone) {
    window.alert('O WhatsApp ainda não está configurado neste cardápio.');
    return;
  }
  const destination = `https://wa.me/${phone.startsWith('55') ? phone : `55${phone}`}`;
  window.open(`${destination}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
}

$('search').addEventListener('input', (event) => { state.search = event.target.value; render(); });
$('checkout-form').querySelector('[name="type"]').addEventListener('change', (event) => {
  $('delivery-address-field').hidden = event.target.value !== 'delivery';
});
$('open-cart').addEventListener('click', () => {
  setCartOpen(true);
});
$('close-cart').addEventListener('click', () => {
  setCartOpen(false);
});
$('cart-backdrop').addEventListener('click', () => $('close-cart').click());
$('item-details').addEventListener('click', (event) => {
  if (event.target === $('item-details')) closeItemDetails();
});
$('cart-panel').addEventListener('keydown', (event) => {
  if (event.key === 'Escape') $('close-cart').click();
});
$('item-details').addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeItemDetails();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.selectedItem) closeItemDetails();
});
$('checkout-form').addEventListener('submit', sendWhatsApp);
loadMenu();
