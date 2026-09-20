/* ===================================================
   BAKELY Cart System
   - Add-to-cart with quantity stepper (per product card)
   - Persistent cart via localStorage (shared across pages)
   - Cart drawer: line items, qty +/-, remove, subtotal/total
   - Checkout modal: payment method picker (UPI / Card / COD)
     -> submits order details via FormSubmit (no backend/payment gateway)
   =================================================== */
(function () {
  'use strict';

  const CART_KEY = 'bakely_cart_v1';
  const CURRENCY = '₹';
  const FORM_ENDPOINT = 'https://formsubmit.co/infosupport247@gmail.com';

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }
  function addToCart(item) {
    const cart = getCart();
    const existing = cart.find(c => c.id === item.id);
    if (existing) existing.qty += item.qty;
    else cart.push(item);
    saveCart(cart);
  }
  function updateQty(id, qty) {
    const cart = getCart();
    const item = cart.find(c => c.id === id);
    if (!item) return;
    item.qty = qty;
    if (item.qty <= 0) return removeFromCart(id);
    saveCart(cart);
    renderCartDrawer();
  }
  function removeFromCart(id) {
    const cart = getCart().filter(c => c.id !== id);
    saveCart(cart);
    renderCartDrawer();
  }
  function cartTotal() {
    return getCart().reduce((sum, c) => sum + c.price * c.qty, 0);
  }
  function cartCount() {
    return getCart().reduce((sum, c) => sum + c.qty, 0);
  }

  function injectStyles() {
    const css = `
      .qty-stepper { display:inline-flex; align-items:center; gap:0; border:1px solid var(--border-bright,rgba(201,165,92,0.2));
        border-radius:50px; overflow:hidden; background:var(--bg-card,rgba(255,255,255,0.03)); }
      .qty-stepper button { background:none; border:none; color:var(--gold,#c9a55c); width:30px; height:30px;
        font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; font-family:sans-serif; }
      .qty-stepper button:hover { background:var(--gold-soft,rgba(201,165,92,0.08)); }
      .qty-stepper .qty-val { min-width:24px; text-align:center; font-size:0.85rem; color:var(--cream,#f5ecd9); font-weight:600; }
      .add-cart-row { display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; }

      #cart-fab { position:fixed; bottom:24px; right:24px; z-index:9000;
        background:linear-gradient(135deg,var(--gold,#c9a55c),var(--gold-light,#e0c896)); color:var(--bg,#1c1108);
        border:none; border-radius:50px; padding:0.85rem 1.4rem; font-family:sans-serif; font-weight:700;
        font-size:0.85rem; cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,0.4); display:flex; align-items:center; gap:0.5rem;
        transition:transform .3s ease; }
      #cart-fab:hover { transform:translateY(-3px) scale(1.03); }
      #cart-fab .cart-count-badge { background:var(--bg,#1c1108); color:var(--gold-bright,#f0d99a); border-radius:50%;
        width:20px; height:20px; font-size:0.7rem; display:flex; align-items:center; justify-content:center; }

      #cart-overlay { position:fixed; inset:0; background:rgba(10,6,2,0.7); z-index:9998; opacity:0; pointer-events:none;
        transition:opacity .3s ease; backdrop-filter:blur(4px); }
      #cart-overlay.open { opacity:1; pointer-events:auto; }
      #cart-drawer { position:fixed; top:0; right:0; bottom:0; width:min(420px,92vw); background:var(--bg,#1c1108);
        border-left:1px solid var(--border-bright,rgba(201,165,92,0.2)); z-index:9999; transform:translateX(100%);
        transition:transform .35s cubic-bezier(0.25,0.1,0.25,1); display:flex; flex-direction:column; font-family:sans-serif; }
      #cart-drawer.open { transform:translateX(0); }
      .cart-header { padding:1.5rem; border-bottom:1px solid var(--border,rgba(201,165,92,0.1));
        display:flex; align-items:center; justify-content:space-between; }
      .cart-header h3 { font-family:var(--serif,serif); color:var(--cream,#f5ecd9); font-size:1.3rem; font-weight:500; margin:0; }
      .cart-close { background:none; border:none; color:var(--ink-light,rgba(232,220,200,0.3)); font-size:1.3rem; cursor:pointer; }
      .cart-body { flex:1; overflow-y:auto; padding:1rem 1.5rem; }
      .cart-empty { text-align:center; padding:3rem 1rem; color:var(--ink-light,rgba(232,220,200,0.3)); }
      .cart-line { display:flex; gap:1rem; padding:1rem 0; border-bottom:1px solid var(--border,rgba(201,165,92,0.1)); align-items:center; }
      .cart-line img, .cart-line .cart-line-thumb { width:64px; height:64px; border-radius:10px; object-fit:cover; background-size:cover; background-position:center; flex-shrink:0; }
      .cart-line-info { flex:1; min-width:0; }
      .cart-line-info h4 { font-family:var(--serif,serif); color:var(--cream,#f5ecd9); font-size:0.98rem; margin:0 0 0.3rem; font-weight:500; }
      .cart-line-info .cart-line-price { color:var(--gold-light,#e0c896); font-size:0.85rem; font-weight:600; }
      .cart-line-remove { background:none; border:none; color:var(--ink-light,rgba(232,220,200,0.3)); cursor:pointer; font-size:0.95rem; padding:0.3rem; }
      .cart-line-remove:hover { color:#e08080; }
      .cart-footer { border-top:1px solid var(--border,rgba(201,165,92,0.1)); padding:1.3rem 1.5rem 1.6rem; }
      .cart-summary-row { display:flex; justify-content:space-between; font-size:0.9rem; color:var(--ink-soft,rgba(232,220,200,0.55)); margin-bottom:0.6rem; }
      .cart-summary-row.total { font-size:1.1rem; font-weight:700; color:var(--cream,#f5ecd9); border-top:1px solid var(--border,rgba(201,165,92,0.1)); padding-top:0.8rem; margin-top:0.4rem; }
      .cart-checkout-btn { width:100%; margin-top:1rem; padding:0.95rem; border:none; border-radius:50px;
        background:linear-gradient(135deg,var(--gold,#c9a55c),var(--gold-light,#e0c896)); color:var(--bg,#1c1108);
        font-weight:700; font-size:0.95rem; cursor:pointer; font-family:sans-serif; }
      .cart-checkout-btn:disabled { opacity:0.5; cursor:not-allowed; }

      #checkout-modal-overlay { position:fixed; inset:0; background:rgba(10,6,2,0.85); z-index:10001; display:none;
        align-items:center; justify-content:center; padding:1.5rem; backdrop-filter:blur(6px); }
      #checkout-modal-overlay.open { display:flex; }
      #checkout-modal { background:var(--bg-warm,#241708); border:1px solid var(--border-bright,rgba(201,165,92,0.2));
        border-radius:20px; padding:2.2rem 2rem 2rem; max-width:420px; width:100%; max-height:88vh; overflow-y:auto; font-family:sans-serif; }
      #checkout-modal h3 { font-family:var(--serif,serif); color:var(--cream,#f5ecd9); font-size:1.5rem; margin-bottom:1.4rem; font-weight:500; }
      #checkout-modal label.field-label { display:block; font-size:0.68rem; text-transform:uppercase; letter-spacing:0.15em;
        color:var(--gold,#c9a55c); margin-bottom:0.5rem; margin-top:1.3rem; font-weight:600; }
      #checkout-modal label.field-label:first-of-type { margin-top:0; }
      #checkout-modal input, #checkout-modal textarea { width:100%; padding:0.75rem 1rem; border-radius:8px;
        border:1px solid var(--border,rgba(201,165,92,0.1)); background:var(--bg,#1c1108); color:var(--cream,#f5ecd9);
        font-family:sans-serif; font-size:0.9rem; box-sizing:border-box; outline:none; transition:border-color .2s ease; }
      #checkout-modal input:focus, #checkout-modal textarea:focus { border-color:var(--gold,#c9a55c); }
      #checkout-modal input::placeholder, #checkout-modal textarea::placeholder { color:var(--ink-light,rgba(232,220,200,0.3)); }
      .payment-options { display:flex; flex-direction:column; gap:0.7rem; margin-top:0.5rem; }
      .payment-option {
        display:flex; align-items:center; gap:0.85rem; padding:0.95rem 1.1rem; border-radius:12px;
        border:1.5px solid var(--border,rgba(201,165,92,0.14)); cursor:pointer; transition:.2s ease;
        background:rgba(0,0,0,0.15); position:relative;
      }
      .payment-option:hover { border-color:var(--border-bright,rgba(201,165,92,0.3)); background:rgba(201,165,92,0.05); }
      .payment-option.selected { border-color:var(--gold,#c9a55c); background:var(--gold-soft,rgba(201,165,92,0.1)); }
      .payment-option input[type=radio] {
        appearance:none; -webkit-appearance:none; margin:0; flex-shrink:0;
        width:19px; height:19px; border-radius:50%; border:2px solid var(--border-bright,rgba(201,165,92,0.35));
        background:transparent; cursor:pointer; position:relative; outline:none; box-shadow:none;
        transition:border-color .2s ease;
      }
      .payment-option input[type=radio]:checked { border-color:var(--gold,#c9a55c); }
      .payment-option input[type=radio]:checked::after {
        content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
        width:10px; height:10px; border-radius:50%; background:var(--gold,#c9a55c);
      }
      .payment-option .pay-icon {
        width:34px; height:34px; border-radius:8px; flex-shrink:0;
        display:flex; align-items:center; justify-content:center; font-size:1rem;
        background:rgba(201,165,92,0.1); color:var(--gold-light,#e0c896);
      }
      .payment-option span.pay-label { color:var(--cream,#f5ecd9); font-size:0.92rem; font-weight:500; flex:1; }
      .checkout-submit-btn { width:100%; margin-top:1.5rem; padding:0.95rem; border:none; border-radius:50px;
        background:linear-gradient(135deg,var(--gold,#c9a55c),var(--gold-light,#e0c896)); color:var(--bg,#1c1108);
        font-weight:700; font-size:0.95rem; cursor:pointer; font-family:sans-serif; }
      .checkout-close { position:absolute; top:1.2rem; right:1.4rem; background:none; border:none; font-size:1.3rem;
        color:var(--ink-light,rgba(232,220,200,0.3)); cursor:pointer; }
      #checkout-modal { position:relative; }
      .checkout-success { text-align:center; padding:1rem 0; }
      .checkout-success i { font-size:2.6rem; color:var(--gold,#c9a55c); margin-bottom:1rem; display:block; }
      .checkout-success h4 { font-family:var(--serif,serif); color:var(--cream,#f5ecd9); font-size:1.3rem; margin-bottom:0.5rem; }
      .checkout-success p { color:var(--ink-soft,rgba(232,220,200,0.55)); font-size:0.9rem; }
    `;
    const style = document.createElement('style');
    style.id = 'cart-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildFab() {
    const fab = document.createElement('button');
    fab.id = 'cart-fab';
    fab.innerHTML = `<i class="fas fa-shopping-bag"></i> View Cart <span class="cart-count-badge" id="cart-count-badge">0</span>`;
    fab.addEventListener('click', openCartDrawer);
    document.body.appendChild(fab);

    const overlay = document.createElement('div');
    overlay.id = 'cart-overlay';
    overlay.addEventListener('click', closeCartDrawer);
    document.body.appendChild(overlay);

    const drawer = document.createElement('div');
    drawer.id = 'cart-drawer';
    drawer.innerHTML = `
      <div class="cart-header">
        <h3>My Cart</h3>
        <button class="cart-close" id="cart-close-btn">&times;</button>
      </div>
      <div class="cart-body" id="cart-body"></div>
      <div class="cart-footer" id="cart-footer"></div>
    `;
    document.body.appendChild(drawer);
    document.getElementById('cart-close-btn').addEventListener('click', closeCartDrawer);
  }

  function openCartDrawer() {
    renderCartDrawer();
    document.getElementById('cart-drawer').classList.add('open');
    document.getElementById('cart-overlay').classList.add('open');
  }
  function closeCartDrawer() {
    document.getElementById('cart-drawer').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('open');
  }

  function renderCartDrawer() {
    const cart = getCart();
    const body = document.getElementById('cart-body');
    const footer = document.getElementById('cart-footer');
    if (!body || !footer) return;

    if (cart.length === 0) {
      body.innerHTML = `<div class="cart-empty"><i class="fas fa-shopping-bag" style="font-size:2rem;margin-bottom:1rem;display:block;opacity:.4"></i>Your cart is empty.</div>`;
      footer.innerHTML = '';
      return;
    }

    body.innerHTML = cart.map(item => `
      <div class="cart-line" data-id="${item.id}">
        ${item.img ? `<div class="cart-line-thumb" style="background-image:url('${item.img}')"></div>` : ''}
        <div class="cart-line-info">
          <h4>${item.name}</h4>
          <div class="qty-stepper">
            <button class="cart-qty-minus" data-id="${item.id}">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="cart-qty-plus" data-id="${item.id}">+</button>
          </div>
        </div>
        <div class="cart-line-price">${CURRENCY}${item.price * item.qty}</div>
        <button class="cart-line-remove" data-id="${item.id}"><i class="fas fa-trash"></i></button>
      </div>
    `).join('');

    const subtotal = cartTotal();
    footer.innerHTML = `
      <div class="cart-summary-row"><span>Subtotal</span><span>${CURRENCY}${subtotal}</span></div>
      <div class="cart-summary-row"><span>Delivery</span><span>Calculated at checkout</span></div>
      <div class="cart-summary-row total"><span>Total</span><span>${CURRENCY}${subtotal}</span></div>
      <button class="cart-checkout-btn" id="cart-checkout-btn">Checkout</button>
    `;

    body.querySelectorAll('.cart-qty-plus').forEach(b => b.addEventListener('click', () => {
      const item = getCart().find(c => c.id === b.dataset.id);
      if (item) updateQty(item.id, item.qty + 1);
    }));
    body.querySelectorAll('.cart-qty-minus').forEach(b => b.addEventListener('click', () => {
      const item = getCart().find(c => c.id === b.dataset.id);
      if (item) updateQty(item.id, item.qty - 1);
    }));
    body.querySelectorAll('.cart-line-remove').forEach(b => b.addEventListener('click', () => removeFromCart(b.dataset.id)));
    document.getElementById('cart-checkout-btn').addEventListener('click', openCheckoutModal);
  }

  function updateCartBadge() {
    const badge = document.getElementById('cart-count-badge');
    if (badge) badge.textContent = cartCount();
    const fab = document.getElementById('cart-fab');
    if (fab) fab.style.display = cartCount() > 0 ? 'flex' : 'none';
  }

  // --- Checkout Modal ---
  function buildCheckoutModal() {
    const overlay = document.createElement('div');
    overlay.id = 'checkout-modal-overlay';
    overlay.innerHTML = `
      <div id="checkout-modal">
        <button class="checkout-close" id="checkout-close-btn">&times;</button>
        <div id="checkout-form-wrap">
          <h3>Checkout</h3>
          <label class="field-label">Full Name</label>
          <input type="text" id="checkout-name" placeholder="Your name" required>
          <label class="field-label">Phone Number</label>
          <input type="tel" id="checkout-phone" placeholder="+91 9XXXX XXXXX" required>
          <label class="field-label">Delivery Address</label>
          <textarea id="checkout-address" rows="3" placeholder="Full delivery address" required></textarea>
          <label class="field-label">Payment Method</label>
          <div class="payment-options">
            <label class="payment-option selected">
              <input type="radio" name="payMethod" value="UPI" checked>
              <span class="pay-icon"><i class="fas fa-mobile-alt"></i></span>
              <span class="pay-label">UPI</span>
            </label>
            <label class="payment-option">
              <input type="radio" name="payMethod" value="Card">
              <span class="pay-icon"><i class="fas fa-credit-card"></i></span>
              <span class="pay-label">Credit / Debit Card</span>
            </label>
            <label class="payment-option">
              <input type="radio" name="payMethod" value="Cash on Delivery">
              <span class="pay-icon"><i class="fas fa-money-bill-wave"></i></span>
              <span class="pay-label">Cash on Delivery</span>
            </label>
          </div>
          <button class="checkout-submit-btn" id="checkout-submit-btn">Place Order</button>
        </div>
        <div class="checkout-success" id="checkout-success" style="display:none">
          <i class="fas fa-check-circle"></i>
          <h4>Order Placed!</h4>
          <p>Thank you — we've received your order and will confirm shortly via phone/WhatsApp.</p>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('checkout-close-btn').addEventListener('click', closeCheckoutModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeCheckoutModal(); });

    overlay.querySelectorAll('.payment-option').forEach(opt => {
      opt.addEventListener('click', () => {
        overlay.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        opt.querySelector('input').checked = true;
      });
    });

    document.getElementById('checkout-submit-btn').addEventListener('click', submitOrder);
  }

  function openCheckoutModal() {
    if (getCart().length === 0) return;
    document.getElementById('checkout-modal-overlay').classList.add('open');
  }
  function closeCheckoutModal() {
    document.getElementById('checkout-modal-overlay').classList.remove('open');
    document.getElementById('checkout-form-wrap').style.display = '';
    document.getElementById('checkout-success').style.display = 'none';
  }

  async function submitOrder() {
    const name = document.getElementById('checkout-name').value.trim();
    const phone = document.getElementById('checkout-phone').value.trim();
    const address = document.getElementById('checkout-address').value.trim();
    const payMethod = document.querySelector('input[name=payMethod]:checked').value;
    if (!name || !phone || !address) { alert('Please fill in all fields.'); return; }

    const cart = getCart();
    const subtotal = cartTotal();
    const itemsSummary = cart.map(c => `${c.name} x${c.qty} = ${CURRENCY}${c.price * c.qty}`).join('\n');

    const btn = document.getElementById('checkout-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Placing order...';

    const formData = new FormData();
    formData.append('_subject', 'New BAKELY Order (Cart Checkout)');
    formData.append('_captcha', 'false');
    formData.append('_template', 'table');
    formData.append('Name', name);
    formData.append('Phone', phone);
    formData.append('Address', address);
    formData.append('Payment Method', payMethod);
    formData.append('Order Items', itemsSummary);
    formData.append('Total', `${CURRENCY}${subtotal}`);

    try {
      await fetch(FORM_ENDPOINT, { method: 'POST', body: formData });
    } catch (e) {
      console.error('Order submit failed', e);
    }

    localStorage.removeItem(CART_KEY);
    updateCartBadge();
    document.getElementById('checkout-form-wrap').style.display = 'none';
    document.getElementById('checkout-success').style.display = 'block';
    closeCartDrawer();
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }

  // --- Attach "Add to Cart" UI to product cards ---
  function buildAddToCartControl(container, product) {
    const wrap = document.createElement('div');
    wrap.className = 'add-cart-row';
    wrap.innerHTML = `
      <div class="qty-stepper">
        <button type="button" class="stepper-minus">−</button>
        <span class="qty-val">1</span>
        <button type="button" class="stepper-plus">+</button>
      </div>
      <button type="button" class="mini-btn add-to-cart-btn">Add to Cart <i class="fas fa-shopping-bag"></i></button>
    `;
    const qtyVal = wrap.querySelector('.qty-val');
    let qty = 1;
    wrap.querySelector('.stepper-minus').addEventListener('click', () => { if (qty > 1) { qty--; qtyVal.textContent = qty; } });
    wrap.querySelector('.stepper-plus').addEventListener('click', () => { qty++; qtyVal.textContent = qty; });
    wrap.querySelector('.add-to-cart-btn').addEventListener('click', () => {
      addToCart({ ...product, qty });
      openCartDrawer();
      qty = 1;
      qtyVal.textContent = 1;
    });
    container.replaceWith(wrap);
  }

  function initProductCards() {
    // Featured cards & viral cards on index.html: replace "Order" mini-btn links
    document.querySelectorAll('.featured-footer a.mini-btn, .viral-footer a.mini-btn').forEach(link => {
      const footer = link.closest('.featured-footer, .viral-footer');
      const card = link.closest('.featured-card, .viral-card');
      if (!card || !footer) return;
      const name = card.querySelector('h3') ? card.querySelector('h3').textContent.trim() : 'BAKELY Item';
      const priceEl = footer.querySelector('.price');
      const priceText = priceEl ? priceEl.textContent : '';
      const priceMatch = priceText.match(/[\d,]+/);
      const price = priceMatch ? parseInt(priceMatch[0].replace(/,/g, '')) : 0;
      const imgEl = card.querySelector('.featured-img, .viral-img');
      let img = '';
      if (imgEl && imgEl.style.backgroundImage) {
        const m = /url\(['"]?(.*?)['"]?\)/.exec(imgEl.style.backgroundImage);
        if (m) img = m[1];
      }
      buildAddToCartControl(link, { id: name.toLowerCase().replace(/\s+/g, '-'), name, price, img });
    });

    // Menu items on menu.html: replace .add-btn
    document.querySelectorAll('.menu-item .add-btn').forEach(btn => {
      const item = btn.closest('.menu-item');
      if (!item) return;
      const name = item.querySelector('h3') ? item.querySelector('h3').textContent.trim() : 'BAKELY Item';
      const priceEl = item.querySelector('.menu-item-price');
      const priceMatch = priceEl ? priceEl.textContent.match(/[\d,]+/) : null;
      const price = priceMatch ? parseInt(priceMatch[0].replace(/,/g, '')) : 0;
      const imgEl = item.querySelector('.menu-item-img');
      let img = '';
      if (imgEl && imgEl.style.backgroundImage) {
        const m = /url\(['"]?(.*?)['"]?\)/.exec(imgEl.style.backgroundImage);
        if (m) img = m[1];
      }
      buildAddToCartControl(btn, { id: name.toLowerCase().replace(/\s+/g, '-'), name, price, img });
    });
  }

  function boot() {
    injectStyles();
    buildFab();
    buildCheckoutModal();
    initProductCards();
    updateCartBadge();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
