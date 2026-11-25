const state = { menu: null, category: 'Todos', search: '', cart: {}, selectedItem: null, customization: null, editingCartKey: null };
const $ = (id) => document.getElementById(id);
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const menuUrl = new URL('menu.json', document.currentScript?.src || window.location.href);
const FEATURED_CATEGORY = 'featured';
const categoryAliases = {
  Hamburgers: 'Hamburgers',
  'Hambúrgueres': 'Hamburgers',
  Starters: 'Entradas',
  Entradas: 'Entradas',
  Beverages: 'Bebidas',
  Bebidas: 'Bebidas',
};
const categoryOrder = ['Hamburgers', 'Entradas', 'Bebidas'];
const categoryLabels = {
  Todos: 'Todos',
  [FEATURED_CATEGORY]: 'Mais pedidos',
  Hamburgers: 'Hambúrgueres',
  Entradas: 'Entradas',
  Bebidas: 'Bebidas',
};
const categoryDescriptions = {
  [FEATURED_CATEGORY]: 'Favoritos da casa escolhidos pelos clientes.',
  Hamburgers: 'Blends artesanais grelhados no ponto que você preferir.',
  Entradas: 'Porções crocantes para abrir o apetite ou compartilhar.',
  Bebidas: 'Opções para acompanhar o seu pedido.',
};
const categoryIcons = {
  Todos: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/></svg>',
  [FEATURED_CATEGORY]: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2.8l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 8l5-.7L10 2.8z"/></svg>',
  Hamburgers: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5a6.5 5 0 0 1 13 0H3.5z"/><path d="M2.8 11.2h14.4"/><path d="M4 13.8h12a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 13.8z"/></svg>',
  Entradas: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 9.5l1.3 7h6.4l1.3-7H5.5z"/><path d="M7.4 9.5V4.8"/><path d="M10 9.5V3.5"/><path d="M12.6 9.5V5.2"/></svg>',
  Bebidas: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 6.5h9l-1 10H6.5l-1-10z"/><path d="M4.5 6.5h11"/><path d="M10.5 6.5l1.3-3h2.2"/></svg>',
};
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

function canonicalCategory(raw) {
  return categoryAliases[raw] || raw || 'Outros';
}

function categoryLabel(category) {
  return categoryLabels[canonicalCategory(category)] || categoryLabels[category] || category;
}

function availableItems() {
  return state.menu.items.filter((item) => item.available);
}

function matchesSearch(item) {
  const query = state.search.toLowerCase().trim();
  if (!query) return true;
  return `${item.name} ${item.description || ''} ${categoryLabel(item.category)}`.toLowerCase().includes(query);
}

function orderedProductCategories() {
  const present = [...new Set(availableItems().map((item) => canonicalCategory(item.category)))];
  return [
    ...categoryOrder.filter((category) => present.includes(category)),
    ...present.filter((category) => !categoryOrder.includes(category)),
  ];
}

function hasFeaturedItems() {
  return availableItems().some((item) => Boolean(item.featured));
}

function categories() {
  return [
    'Todos',
    ...(hasFeaturedItems() ? [FEATURED_CATEGORY] : []),
    ...orderedProductCategories(),
  ];
}

function itemsInCategory(category) {
  const matching = availableItems().filter(matchesSearch);
  if (category === 'Todos') return matching;
  if (category === FEATURED_CATEGORY) return matching.filter((item) => Boolean(item.featured));
  return matching.filter((item) => canonicalCategory(item.category) === category);
}

function visibleItems() {
  return itemsInCategory(state.category);
}

function menuSections() {
  const hasQuery = Boolean(state.search.trim());
  if (state.category === 'Todos') {
    const sections = [];
    if (!hasQuery && hasFeaturedItems()) {
      const featured = itemsInCategory(FEATURED_CATEGORY);
      if (featured.length) {
        sections.push({
          id: FEATURED_CATEGORY,
          title: categoryLabel(FEATURED_CATEGORY),
          description: categoryDescriptions[FEATURED_CATEGORY] || '',
          items: featured,
        });
      }
    }
    orderedProductCategories().forEach((category) => {
      const items = itemsInCategory(category);
      if (items.length) {
        sections.push({
          id: category,
          title: categoryLabel(category),
          description: hasQuery ? '' : (categoryDescriptions[category] || ''),
          items,
        });
      }
    });
    return sections;
  }
  const items = visibleItems();
  if (!items.length) return [];
  return [{
    id: state.category,
    title: categoryLabel(state.category),
    description: hasQuery ? '' : (categoryDescriptions[state.category] || ''),
    items,
  }];
}

function itemCartQuantity(itemId) {
  return cartRows()
    .filter((row) => row.item.id === itemId)
    .reduce((sum, row) => sum + row.quantity, 0);
}

function cartRows() { return Object.values(state.cart); }
function rowExtrasUnitTotal(row) {
  return (row.details?.extras || []).reduce((sum, extra) => {
    const option = addOns.find((addOn) => addOn.id === extra.id);
    const unitPrice = extra.price ?? option?.price ?? 0;
    return sum + unitPrice * (extra.quantity || 0);
  }, 0);
}
function rowUnitPrice(row) { return row.item.price + rowExtrasUnitTotal(row); }
function rowTotal(row) { return rowUnitPrice(row) * row.quantity; }
function total() { return cartRows().reduce((sum, row) => sum + rowTotal(row), 0); }
function count() { return cartRows().reduce((sum, row) => sum + row.quantity, 0); }

function add(item) {
  const existing = state.cart[item.id];
  state.cart[item.id] = { id: item.id, item, quantity: (existing?.quantity || 0) + 1 };
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
  const baseItem = state.menu?.items?.find((menuItem) => menuItem.id === item.id) || item;
  state.selectedItem = baseItem;
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
  if (canonicalCategory(state.selectedItem?.category) === 'Hamburgers') {
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
  const isBurger = canonicalCategory(item.category) === 'Hamburgers';
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
          <span class="card-category">${escapeHtml(categoryLabel(item.category))}</span>
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
      .map((option) => ({
        id: option.id,
        name: option.name,
        price: option.price,
        quantity: state.customization.addOns[option.id],
      }));
    const key = state.editingCartKey || `${item.id}-${Date.now()}`;
    state.cart[key] = {
      id: key,
      item: { ...item },
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

function renderCard(item) {
  const inCart = itemCartQuantity(item.id);
  return `
    <article class="card" data-open-item="${escapeHtml(item.id)}" tabindex="0" role="button" aria-label="Personalizar ${escapeHtml(item.name)}">
      <div class="card-image-wrap">
        <img class="card-image" src="${escapeHtml(item.image || '')}" alt="" loading="lazy">
        ${inCart > 0 ? `<span class="card-in-cart" aria-label="${inCart} no pedido">${inCart} no pedido</span>` : ''}
      </div>
      <div class="card-content">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description || '')}</p>
        </div>
        <div class="card-bottom">
          <span class="price">${money(item.price)}</span>
          <button class="add-button" data-add="${escapeHtml(item.id)}" type="button" aria-label="Adicionar ${escapeHtml(item.name)} ao pedido"><span aria-hidden="true">+</span> Adicionar</button>
        </div>
      </div>
    </article>
  `;
}

function selectCategory(nextCategory, { focusCategory = false } = {}) {
  state.category = nextCategory;
  render({ focusCategory, revealActiveCategory: true });
  const mainEl = document.querySelector('main');
  if (mainEl && mainEl.getBoundingClientRect?.().top < 0) {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    mainEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }
}

function render({ focusCategory = false, revealActiveCategory = false } = {}) {
  const availableCategories = categories();
  if (!availableCategories.includes(state.category)) state.category = 'Todos';

  const categoryElement = $('categories');
  const categoryHadFocus = Boolean(document.activeElement && categoryElement.contains?.(document.activeElement));
  categoryElement.innerHTML = availableCategories.map((category) => {
    const isActive = category === state.category;
    const itemCount = itemsInCategory(category).length;
    const icon = categoryIcons[category] || '';
    const label = categoryLabel(category);
    return `<button class="category ${isActive ? 'active' : ''}" type="button" data-category="${escapeHtml(category)}" aria-pressed="${isActive}">${icon ? `<span class="category-icon">${icon}</span>` : ''}<span class="category-label">${escapeHtml(label)}</span><span class="category-count" aria-label="${itemCount} ${itemCount === 1 ? 'item' : 'itens'}">${itemCount}</span></button>`;
  }).join('');
  categoryElement.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => selectCategory(button.dataset.category));
  });
  const activeCategoryButton = categoryElement.querySelector('.category.active');
  if (focusCategory || categoryHadFocus) activeCategoryButton?.focus?.({ preventScroll: true });
  if (revealActiveCategory) {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    activeCategoryButton?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', inline: 'nearest', block: 'nearest' });
  }

  const items = visibleItems();
  const sections = menuSections();
  const hasFilters = Boolean(state.search.trim()) || state.category !== 'Todos';
  $('menu-count').textContent = `${items.length} ${items.length === 1 ? 'item disponível' : 'itens disponíveis'}`;
  $('menu-status').className = items.length ? 'status status-hidden' : 'status status-empty';
  $('menu-status').innerHTML = items.length
    ? ''
    : `<strong>Nenhum item encontrado</strong><p>Tente outro termo na busca ou volte para todas as categorias.</p>${hasFilters ? '<button type="button" class="reset-filters" id="reset-filters">Limpar filtros</button>' : ''}`;
  $('reset-filters')?.addEventListener('click', () => {
    state.search = '';
    $('search').value = '';
    selectCategory('Todos', { focusCategory: true });
  });
  $('menu').innerHTML = sections.map((section) => {
    const slug = String(section.id).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const icon = categoryIcons[section.id] || '';
    return `
      <section class="menu-section" id="section-${escapeHtml(slug)}" aria-labelledby="heading-${escapeHtml(slug)}">
        <header class="section-header">
          <div class="section-title-row">
            <div class="section-heading">
              ${icon ? `<span class="section-icon">${icon}</span>` : ''}
              <h2 id="heading-${escapeHtml(slug)}">${escapeHtml(section.title)}</h2>
            </div>
            <span class="section-count">${section.items.length} ${section.items.length === 1 ? 'opção' : 'opções'}</span>
          </div>
          ${section.description ? `<p class="section-description">${escapeHtml(section.description)}</p>` : ''}
        </header>
        <div class="menu-grid">
          ${section.items.map(renderCard).join('')}
        </div>
      </section>
    `;
  }).join('');
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
        <small class="cart-category">${escapeHtml(categoryLabel(row.item.category))}</small>
        ${row.details?.meatPoint ? `<small class="cart-spec">Carne: ${escapeHtml(row.details.meatPoint)}</small>` : ''}
        ${row.details?.extras?.length ? `<ul class="cart-extras" aria-label="Adicionais">${row.details.extras.map((extra) => `<li>${extra.quantity}x ${escapeHtml(extra.name)}</li>`).join('')}</ul>` : ''}
        ${row.details?.notes ? `<small class="cart-spec cart-note">Obs.: ${escapeHtml(row.details.notes)}</small>` : ''}
        <div class="quantity"><button type="button" data-minus="${row.id || row.item.id}" aria-label="Diminuir ${escapeHtml(row.item.name)}">−</button><span>${row.quantity}</span><button type="button" data-plus="${row.id || row.item.id}" aria-label="Aumentar ${escapeHtml(row.item.name)}">+</button><button class="edit-item" type="button" data-edit="${row.id || row.item.id}" aria-label="Editar ${escapeHtml(row.item.name)}">Editar</button></div>
      </div>
      <div class="cart-line-price"><small>${money(rowUnitPrice(row))} cada</small><strong class="cart-line-total">${money(rowTotal(row))}</strong></div>
    </div>
  `).join('') || `<div class="cart-empty"><span class="cart-empty-icon" aria-hidden="true">🛒</span><strong>Seu pedido está vazio</strong><p>Escolha seus favoritos no cardápio e eles aparecem aqui.</p><button type="button" class="cart-empty-action" id="cart-empty-close">Ver cardápio</button></div>`;
  $('cart-empty-close')?.addEventListener('click', () => $('close-cart').click());
  const isEmpty = count() === 0;
  $('checkout-form').hidden = isEmpty;
  document.querySelector('.cart-footer .whatsapp-button').disabled = isEmpty;
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

function formatWhatsAppItem(row) {
  const itemLines = [`• ${row.quantity}x ${row.item.name} — ${money(rowTotal(row))}`];
  if (row.details?.meatPoint) itemLines.push(`  Ponto: ${row.details.meatPoint}`);
  if (row.details?.extras?.length) {
    itemLines.push(`  Adicionais: ${row.details.extras.map((extra) => `${extra.quantity}x ${extra.name}`).join(', ')}`);
  }
  if (row.details?.notes?.trim()) itemLines.push(`  Obs.: ${row.details.notes.trim()}`);
  return itemLines.join('\n');
}

function sendWhatsApp(event) {
  event.preventDefault();
  if (!count()) return;
  const form = new FormData(event.currentTarget);
  const type = form.get('type') === 'pickup' ? 'Retirada no balcão' : 'Entrega';
  const lines = [`🍔 *NOVO PEDIDO — ${state.menu.restaurantName.toUpperCase()}*`, `*Cliente:* ${form.get('name')}`, `*Tipo:* ${type}`];
  if (form.get('phone')) lines.push(`*Telefone:* ${form.get('phone')}`);
  if (type === 'Entrega' && form.get('address')) lines.push(`*Endereço:* ${form.get('address')}`);
  lines.push('', '*ITENS:*', ...cartRows().map(formatWhatsAppItem), '', `*TOTAL:* ${money(total())}`, `*Pagamento:* ${form.get('payment')}`);
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
$('categories').addEventListener('keydown', (event) => {
  const buttons = [...$('categories').querySelectorAll('button')];
  if (!buttons.length) return;
  const currentIndex = buttons.indexOf(document.activeElement);
  if (currentIndex === -1) return;
  let nextIndex = -1;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % buttons.length;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = buttons.length - 1;
  if (nextIndex !== -1) {
    event.preventDefault();
    buttons[nextIndex].focus();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    buttons[nextIndex].scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', inline: 'nearest', block: 'nearest' });
  }
});
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
