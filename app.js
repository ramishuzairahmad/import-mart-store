// Import Mart Store — storefront logic. Products come from catalog.json
// so the admin page can add/edit products without touching this file.
(function () {
  var WA_NUMBER = '923015550121';
  var grid = document.getElementById('productsGrid');
  var empty = document.getElementById('filterEmpty');
  var cart = [];
  var openButton = document.getElementById('openCart');
  var closeButton = document.getElementById('closeCart');
  var drawer = document.getElementById('cartDrawer');
  var backdrop = document.getElementById('cartBackdrop');
  var itemsEl = document.getElementById('cartItems');
  var countEl = document.getElementById('cartCount');
  var totalEl = document.getElementById('cartTotal');
  var checkout = document.getElementById('checkoutBtn');
  var toast = document.getElementById('toast');
  var toastTimer;
  var lastFocus;
  var products = [];
  var currentFilter = 'all';

  function money(value) { return 'Rs. ' + Number(value).toLocaleString('en-PK'); }
  function esc(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function catKey(category) {
    var c = String(category || '').toLowerCase();
    if (c.indexOf('electron') !== -1) return 'electronics';
    if (c.indexOf('beauty') !== -1 || c.indexOf('care') !== -1) return 'beauty';
    if (c.indexOf('home') !== -1 || c.indexOf('kitchen') !== -1) return 'home';
    if (c.indexOf('toy') !== -1 || c.indexOf('kid') !== -1) return 'toys';
    return 'other';
  }
  function productMessage(name, price) {
    return 'Assalam-o-Alaikum! Mujhe Import Mart se order karna hai:\n• 1x ' + name + ' — ' + money(price) + '\nTotal: ' + money(price);
  }
  function waLink(message) {
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(message);
  }

  function cardHTML(p) {
    var discount = (p.old_price && p.old_price > p.price)
      ? Math.round((1 - p.price / p.old_price) * 100) : 0;
    var badge = '';
    if (!p.in_stock) badge += '<span class="stock-badge">Out of Stock</span>';
    if (discount > 0) badge += '<span class="discount">-' + discount + '%</span>';
    var actions = p.in_stock
      ? '<div class="product-actions"><button class="btn btn-outline add-cart" type="button" data-id="' + p.id + '">Add to Cart</button>' +
        '<a class="btn btn-green single-order" data-id="' + p.id + '" href="' + waLink(productMessage(p.name, p.price)) + '" target="_blank" rel="noopener">Order on WhatsApp</a></div>'
      : '<div class="product-actions"><button class="btn btn-outline" type="button" disabled>Add to Cart</button>' +
        '<button class="btn btn-green" type="button" disabled>Order on WhatsApp</button></div>';
    return '<article class="product" data-category="' + catKey(p.category) + '">' +
      '<div class="photo"><img src="' + esc(p.image_file) + '" alt="' + esc(p.name) + '" loading="lazy" /></div>' +
      badge +
      '<div class="product-body"><span class="lot-tag">' + esc(String(p.lot_tag || 'IMPORTED LOT').toUpperCase()) + '</span>' +
      '<h3>' + esc(p.name) + '</h3><div class="rating">★★★★★</div>' +
      '<div class="price"><span class="now">' + money(p.price) + '</span>' +
      (p.old_price ? '<span class="old">' + money(p.old_price) + '</span>' : '') + '</div>' +
      actions + '</div></article>';
  }

  function applyFilter() {
    var visible = 0;
    Array.prototype.forEach.call(grid.querySelectorAll('.product'), function (card) {
      var show = currentFilter === 'all' || card.getAttribute('data-category') === currentFilter;
      card.hidden = !show;
      if (show) visible += 1;
    });
    empty.classList.toggle('show', visible === 0);
  }

  function renderProducts(list) {
    products = list.filter(function (p) { return p && p.name && p.price; });
    grid.innerHTML = products.map(cardHTML).join('');
    applyFilter();
  }

  function showToast(name) {
    toast.textContent = name + ' added to your cart';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }
  function openCart() {
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
    openButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('cart-open');
    closeButton.focus();
  }
  function closeCart() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
    openButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('cart-open');
    if (lastFocus) lastFocus.focus();
  }
  function renderCart() {
    var count = cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    var total = cart.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
    countEl.textContent = count;
    countEl.classList.toggle('show', count > 0);
    openButton.setAttribute('aria-label', 'Open shopping cart, ' + count + ' item' + (count === 1 ? '' : 's'));
    totalEl.textContent = money(total);
    checkout.setAttribute('aria-disabled', cart.length ? 'false' : 'true');
    if (!cart.length) {
      itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty. Add a product to start your order.</p>';
      checkout.href = 'https://wa.me/' + WA_NUMBER;
      return;
    }
    itemsEl.innerHTML = cart.map(function (item) {
      return '<div class="cart-item"><img src="' + esc(item.image) + '" alt=""><div><h3>' + esc(item.name) + '</h3><div class="cart-item-price">' + money(item.price * item.qty) + '</div><div class="qty"><button type="button" data-action="minus" data-id="' + item.id + '" aria-label="Reduce quantity">−</button><span>' + item.qty + '</span><button type="button" data-action="plus" data-id="' + item.id + '" aria-label="Increase quantity">+</button></div></div><button class="remove-item" type="button" data-action="remove" data-id="' + item.id + '" aria-label="Remove">×</button></div>';
    }).join('');
    var lines = cart.map(function (item) { return '• ' + item.qty + 'x ' + item.name + ' — ' + money(item.price * item.qty); });
    checkout.href = waLink('Assalam-o-Alaikum! Mujhe Import Mart se order karna hai:\n' + lines.join('\n') + '\nTotal: ' + money(total));
  }

  grid.addEventListener('click', function (event) {
    var button = event.target.closest('.add-cart');
    if (!button) return;
    var id = Number(button.getAttribute('data-id'));
    var p = null;
    products.forEach(function (item) { if (item.id === id) p = item; });
    if (!p) return;
    var found = null;
    cart.forEach(function (item) { if (item.id === id) found = item; });
    if (found) found.qty += 1;
    else cart.push({ id: id, name: p.name, price: Number(p.price), image: p.image_file, qty: 1 });
    renderCart();
    showToast(p.name);
  });
  itemsEl.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-action]');
    if (!button) return;
    var id = Number(button.getAttribute('data-id'));
    var item = null;
    cart.forEach(function (entry) { if (entry.id === id) item = entry; });
    if (!item) return;
    var action = button.getAttribute('data-action');
    if (action === 'plus') item.qty += 1;
    if (action === 'minus') item.qty -= 1;
    if (action === 'remove' || item.qty < 1) cart = cart.filter(function (entry) { return entry.id !== id; });
    renderCart();
  });
  openButton.addEventListener('click', openCart);
  closeButton.addEventListener('click', closeCart);
  backdrop.addEventListener('click', closeCart);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && drawer.classList.contains('open')) closeCart();
  });
  document.querySelectorAll('.filter-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      currentFilter = chip.getAttribute('data-filter');
      document.querySelectorAll('.filter-chip').forEach(function (other) {
        var active = other === chip;
        other.classList.toggle('active', active);
        other.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      applyFilter();
    });
  });

  fetch('catalog.json', { cache: 'no-store' })
    .then(function (res) { if (!res.ok) throw new Error('catalog load failed'); return res.json(); })
    .then(renderProducts)
    .catch(function () {
      grid.innerHTML = '<p class="filter-empty show">Products abhi load nahi ho sake — page refresh karein.</p>';
    });
  renderCart();
})();
