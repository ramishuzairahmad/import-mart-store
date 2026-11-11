// Import Mart Store — Shopify-style storefront logic.
// Products come from catalog.json; cart persists in localStorage.
(function () {
  var WA_NUMBER = '923015550121';
  var WA_GROUP = 'https://chat.whatsapp.com/HKbPbd7my20LOsFFBkbXb0';
  var products = [];
  var cart = loadCart();
  var currentFilter = 'all';
  var currentQty = 1;
  var currentProduct = null;
  var recentlyViewed = [];

  function $(id) { return document.getElementById(id); }
  function money(v) { return 'Rs. ' + Number(v || 0).toLocaleString('en-PK'); }
  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function discountOf(p) {
    return (p.old_price && p.old_price > p.price) ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  }
  function waLink(msg) { return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg); }
  function orderMessage(items, total) {
    var lines = items.map(function (it) { return '• ' + it.qty + 'x ' + it.name + ' — ' + money(it.price * it.qty); });
    return 'Assalam-o-Alaikum! Mujhe Import Mart se order karna hai:\n' + lines.join('\n') + '\nTotal: ' + money(total);
  }
  function loadCart() {
    try {
      var raw = localStorage.getItem('import_mart_cart_v1');
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveCart() {
    try { localStorage.setItem('import_mart_cart_v1', JSON.stringify(cart)); } catch (e) {}
  }

  /* ---------- countdown to midnight (Pakistan time, daily deal) ---------- */
  function nextMidnightPKT() {
    var now = new Date();
    var pktNow = new Date(now.getTime() + (now.getTimezoneOffset() + 300) * 60000);
    var midnight = new Date(pktNow.getFullYear(), pktNow.getMonth(), pktNow.getDate() + 1, 0, 0, 0);
    return new Date(midnight.getTime() - (now.getTimezoneOffset() + 300) * 60000);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tickCountdown() {
    var diff = Math.max(0, nextMidnightPKT().getTime() - Date.now());
    var d = Math.floor(diff / 86400000);
    var h = Math.floor(diff / 3600000) % 24;
    var m = Math.floor(diff / 60000) % 60;
    var s = Math.floor(diff / 1000) % 60;
    var set = function (id, v) { var el = $(id); if (el) el.textContent = pad(v); };
    set('cdD', d); set('cdH', h); set('cdM', m); set('cdS', s);
    var deal = document.querySelectorAll('.deal-chips .chip b');
    if (deal.length === 4) {
      deal[0].textContent = pad(d); deal[1].textContent = pad(h);
      deal[2].textContent = pad(m); deal[3].textContent = pad(s);
    }
  }
  setInterval(tickCountdown, 1000);
  $('cdClose').addEventListener('click', function () { $('countdownBar').style.display = 'none'; });

  /* ---------- rendering ---------- */
  function cardHTML(p) {
    var soldOut = !p.in_stock;
    var photo = soldOut
      ? '<div class="photo"><div class="ph-name">' + esc(p.name) + '</div><span class="soldout-badge">Sold out</span></div>'
      : '<div class="photo"><img src="' + esc(p.image_file) + '" alt="' + esc(p.name) + '" loading="lazy" /></div>';
    return '<article class="product tilt' + (soldOut ? ' soldout' : '') + '" data-id="' + p.id + '">' + photo +
      '<div class="product-body"><h3>' + esc(p.name) + '</h3>' +
      '<div class="price">' + money(p.price) +
      (p.old_price ? '<span class="old">' + money(p.old_price) + '</span>' : '') + '</div></div></article>';
  }
  function visibleProducts(list) {
    if (currentFilter === 'all') return list;
    return list.filter(function (p) { return (p.category || '') === currentFilter; });
  }
  function renderGrids() {
    var inStock = products.filter(function (p) { return p.in_stock; });
    var byDiscount = inStock.slice().sort(function (a, b) { return discountOf(b) - discountOf(a); });
    var best = byDiscount.slice(0, 4);
    var bestIds = {};
    best.forEach(function (p) { bestIds[p.id] = true; });
    var fresh = products.filter(function (p) { return !bestIds[p.id]; }).slice(0, 4);
    var bestShown = visibleProducts(best);
    var freshShown = visibleProducts(fresh);
    $('bestGrid').innerHTML = bestShown.length ? bestShown.map(cardHTML).join('') : '<p class="empty-note">Is category mein abhi koi product nahi.</p>';
    $('freshGrid').innerHTML = freshShown.length ? freshShown.map(cardHTML).join('') : '';
    $('shopEmpty').style.display = (bestShown.length + freshShown.length === 0) ? 'block' : 'none';
    bindTilts();
  }
  function renderCategories() {
    var counts = {};
    products.forEach(function (p) {
      counts[p.category || 'Other'] = (counts[p.category || 'Other'] || 0) + 1;
    });
    var cats = Object.keys(counts);
    var html = '<button class="cat-card" type="button" data-cat="all"><img src="assets/hero.jpg" alt="" /><h3>All Products</h3><span>' + products.length + ' products</span></button>';
    html += cats.map(function (c) {
      var first = null;
      products.forEach(function (p) { if (!first && p.category === c) first = p; });
      return '<button class="cat-card" type="button" data-cat="' + esc(c) + '"><img src="' + esc(first ? first.image_file : 'assets/hero.jpg') + '" alt="" /><h3>' + esc(c) + '</h3><span>' + counts[c] + ' products</span></button>';
    }).join('');
    $('catGrid').innerHTML = html;
    $('catGrid').querySelectorAll('.cat-card').forEach(function (card) {
      card.addEventListener('click', function () {
        currentFilter = card.getAttribute('data-cat');
        renderGrids();
        document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }
  function renderDeal() {
    var inStock = products.filter(function (p) { return p.in_stock && p.old_price; });
    if (!inStock.length) { $('dealCard').style.display = 'none'; return; }
    var deal = inStock.slice().sort(function (a, b) { return discountOf(b) - discountOf(a); })[0];
    var save = (deal.old_price || 0) - deal.price;
    $('dealCard').innerHTML =
      '<div class="deal-img"><img src="' + esc(deal.image_file) + '" alt="' + esc(deal.name) + '" /></div>' +
      '<div class="deal-body"><div class="kicker">Limited Time Offer</div>' +
      '<h3>' + esc(deal.name) + '</h3>' +
      '<p>Save ' + money(save) + ' on this bestseller today.</p>' +
      '<div class="deal-price"><span class="now">' + money(deal.price) + '</span><span class="old">' + money(deal.old_price) + '</span></div>' +
      '<div class="deal-chips"><span class="chip"><b>00</b> DAYS</span><span class="chip"><b>00</b> HOURS</span><span class="chip"><b>00</b> MINS</span><span class="chip"><b>00</b> SECS</span></div>' +
      '<button class="btn btn-black" type="button" id="dealBtn">SHOP THE DEAL</button></div>';
    $('dealBtn').addEventListener('click', function () { openProduct(deal.id); });
    tickCountdown();
  }

  /* ---------- product modal ---------- */
  function openProduct(id) {
    var p = null;
    products.forEach(function (x) { if (x.id === id) p = x; });
    if (!p) return;
    currentProduct = p;
    currentQty = 1;
    recentlyViewed = [p].concat(recentlyViewed.filter(function (x) { return x.id !== p.id; })).slice(0, 4);
    var related = products.filter(function (x) { return x.id !== p.id; }).slice(0, 4);
    var features = [
      'Working guarantee — har product tested, phir dispatch.',
      '3-day check warranty — product check karke tasalli karein.',
      'Packing video — parcel ki video pehle bheji jati hai.',
      'Original imported lot — ' + (p.lot_tag || 'Imported Lot') + '.',
      'Delivery: Rawalpindi / Islamabad COD Rs 200 • Baqi Pakistan advance Rs 300 • Fateh Jang FREE.'
    ];
    var actions = p.in_stock
      ? '<div class="pm-actions"><button class="btn btn-black" type="button" id="pmAdd">Add to cart</button>' +
        '<a class="btn btn-green" id="pmBuy" href="' + waLink(orderMessage([{ name: p.name, price: p.price, qty: 1 }], p.price)) + '" target="_blank" rel="noopener">Order on WhatsApp</a></div>'
      : '<div class="pm-actions"><button class="btn btn-black" type="button" disabled>Sold Out</button></div>';
    $('productModalCard').innerHTML =
      '<button class="close-x pm-close" type="button" data-close="product" aria-label="Close">×</button>' +
      '<div class="pm-grid"><div class="pm-img"><img src="' + esc(p.image_file) + '" alt="' + esc(p.name) + '" /></div>' +
      '<div class="pm-body"><a class="crumb" href="#home">Import Mart</a>' +
      '<h2>' + esc(p.name) + '</h2>' +
      '<div class="pm-price">' + money(p.price) + (p.old_price ? '<span class="old">' + money(p.old_price) + '</span>' : '') + '</div>' +
      '<p class="pm-label">Quantity</p>' +
      '<div class="pm-qty"><button type="button" id="pmMinus" aria-label="Decrease quantity">−</button><span id="pmQtyNum">1</span><button type="button" id="pmPlus" aria-label="Increase quantity">+</button></div>' +
      actions +
      '<p class="pm-desc">' + esc(p.name) + ' — ' + esc(p.lot_tag || 'Imported Lot') + ' se. Original imported product, working guarantee ke saath.</p>' +
      '<ul class="pm-features">' + features.map(function (f, i) { return '<li><b>' + (i + 1) + '</b><span>' + esc(f) + '</span></li>'; }).join('') + '</ul>' +
      '</div></div>' +
      (related.length ? '<div class="pm-related"><h3>You may also like</h3><div class="products">' + related.map(cardHTML).join('') + '</div></div>' : '');
    openModal('productModal');
    var qtyNum = $('pmQtyNum');
    var buyBtn = $('pmBuy');
    var syncQty = function () {
      qtyNum.textContent = currentQty;
      if (buyBtn) buyBtn.href = waLink(orderMessage([{ name: p.name, price: p.price, qty: currentQty }], p.price * currentQty));
    };
    var minus = $('pmMinus'), plus = $('pmPlus');
    if (minus) minus.addEventListener('click', function () { if (currentQty > 1) { currentQty -= 1; syncQty(); } });
    if (plus) plus.addEventListener('click', function () { currentQty += 1; syncQty(); });
    var addBtn = $('pmAdd');
    if (addBtn) addBtn.addEventListener('click', function () {
      addToCart(p, currentQty);
      closeModal('productModal');
      openCart();
    });
    bindTilts();
  }
  document.addEventListener('click', function (event) {
    var card = event.target.closest('.product');
    if (card && !card.closest('#productModalCard')) {
      openProduct(Number(card.getAttribute('data-id')));
      return;
    }
    var relCard = event.target.closest('.pm-related .product');
    if (relCard) openProduct(Number(relCard.getAttribute('data-id')));
    var closer = event.target.closest('[data-close]');
    if (closer) closeModal(closer.getAttribute('data-close') === 'search' ? 'searchModal' : 'productModal');
  });

  /* ---------- cart ---------- */
  function addToCart(p, qty) {
    var found = null;
    cart.forEach(function (item) { if (item.id === p.id) found = item; });
    if (found) found.qty += qty;
    else cart.push({ id: p.id, name: p.name, price: Number(p.price), image: p.image_file, qty: qty });
    saveCart();
    renderCart();
    showToast(p.name + ' added to your cart');
  }
  function renderCart() {
    var count = cart.reduce(function (s, it) { return s + it.qty; }, 0);
    var total = cart.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
    var countEl = $('cartCount');
    countEl.textContent = count;
    countEl.classList.toggle('show', count > 0);
    $('openCart').setAttribute('aria-label', 'Open shopping cart, ' + count + ' items');
    $('cartTotal').textContent = money(total);
    var checkout = $('checkoutBtn');
    checkout.setAttribute('aria-disabled', cart.length ? 'false' : 'true');
    if (!cart.length) {
      $('cartItems').innerHTML = '<p class="cart-empty">Your cart is empty. Add a product to start your order.</p>';
      checkout.href = 'https://wa.me/' + WA_NUMBER;
      return;
    }
    $('cartItems').innerHTML = cart.map(function (item) {
      return '<div class="cart-item"><img src="' + esc(item.image) + '" alt=""><div><h3>' + esc(item.name) + '</h3><div class="cart-item-price">' + money(item.price * item.qty) + '</div><div class="qty"><button type="button" data-action="minus" data-id="' + item.id + '">−</button><span>' + item.qty + '</span><button type="button" data-action="plus" data-id="' + item.id + '">+</button></div></div><button class="remove-item" type="button" data-action="remove" data-id="' + item.id + '" aria-label="Remove">×</button></div>';
    }).join('');
    checkout.href = waLink(orderMessage(cart, total));
  }
  function openCart() {
    renderCart();
    $('cartDrawer').classList.add('open');
    $('cartBackdrop').classList.add('open');
    $('cartDrawer').setAttribute('aria-hidden', 'false');
    $('openCart').setAttribute('aria-expanded', 'true');
    document.body.classList.add('locked');
    $('closeCart').focus();
  }
  function closeCart() {
    $('cartDrawer').classList.remove('open');
    $('cartBackdrop').classList.remove('open');
    $('cartDrawer').setAttribute('aria-hidden', 'true');
    $('openCart').setAttribute('aria-expanded', 'false');
    document.body.classList.remove('locked');
  }
  $('openCart').addEventListener('click', openCart);
  $('closeCart').addEventListener('click', closeCart);
  $('cartBackdrop').addEventListener('click', closeCart);
  $('cartItems').addEventListener('click', function (event) {
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
    saveCart();
    renderCart();
  });

  /* ---------- search ---------- */
  function openModal(id) {
    $(id).classList.add('open');
    document.body.classList.add('locked');
  }
  function closeModal(id) {
    $(id).classList.remove('open');
    if (!$('cartDrawer').classList.contains('open')) document.body.classList.remove('locked');
  }
  function renderSearch(q) {
    q = (q || '').trim().toLowerCase();
    var box = $('searchResults');
    if (!q) {
      if (!recentlyViewed.length) {
        box.innerHTML = '<p style="color:var(--muted);padding:14px 6px">Product ka naam likhein — masalan watch, earrings, lamp.</p>';
        return;
      }
      box.innerHTML = '<div class="suggest-label" style="margin-top:0">Recently viewed</div>' + recentlyViewed.map(suggestHTML).join('');
      return;
    }
    var hits = products.filter(function (p) {
      return (p.name + ' ' + (p.category || '') + ' ' + (p.lot_tag || '')).toLowerCase().indexOf(q) !== -1;
    }).slice(0, 6);
    box.innerHTML = hits.length
      ? hits.map(suggestHTML).join('')
      : '<p style="color:var(--muted);padding:14px 6px">Kuch nahi mila — doosra naam try karein.</p>';
  }
  function suggestHTML(p) {
    return '<div class="suggest-row" data-id="' + p.id + '"><img src="' + esc(p.image_file) + '" alt="" /><div><h4>' + esc(p.name) + '</h4><div class="price">' + money(p.price) + '</div></div></div>';
  }
  $('openSearch').addEventListener('click', function () {
    renderSearch('');
    openModal('searchModal');
    setTimeout(function () { $('searchInput').focus(); }, 60);
  });
  $('searchInput').addEventListener('input', function () { renderSearch(this.value); });
  $('searchResults').addEventListener('click', function (event) {
    var row = event.target.closest('.suggest-row');
    if (!row) return;
    closeModal('searchModal');
    openProduct(Number(row.getAttribute('data-id')));
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if ($('cartDrawer').classList.contains('open')) closeCart();
    closeModal('searchModal');
    closeModal('productModal');
  });

  /* ---------- 3D tilt + reveal ---------- */
  function bindTilts() {
    if (!window.matchMedia('(pointer:fine)').matches) return;
    document.querySelectorAll('.product.tilt').forEach(function (card) {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = '1';
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 7;
        card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
    var hero = $('heroImgWrap');
    if (hero && !hero.dataset.tiltBound) {
      hero.dataset.tiltBound = '1';
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
        hero.style.transform = 'perspective(1000px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      });
      hero.addEventListener('mouseleave', function () { hero.style.transform = ''; });
    }
  }
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); revealObs.unobserve(en.target); } });
  }, { threshold: 0.12 });
  function bindReveals() {
    document.querySelectorAll('.reveal:not(.in)').forEach(function (el) { revealObs.observe(el); });
  }

  /* ---------- toast ---------- */
  var toast = $('toast');
  var toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  /* ---------- boot ---------- */
  document.querySelectorAll('a[href="#shop"]').forEach(function (a) {
    a.addEventListener('click', function () { currentFilter = 'all'; renderGrids(); });
  });
  fetch('catalog.json', { cache: 'no-store' })
    .then(function (res) { if (!res.ok) throw new Error('catalog load failed'); return res.json(); })
    .then(function (data) {
      products = (data || []).filter(function (p) { return p && p.name && p.price; });
      renderCategories();
      renderDeal();
      renderGrids();
      bindReveals();
      tickCountdown();
    })
    .catch(function () {
      $('bestGrid').innerHTML = '<p class="empty-note">Products abhi load nahi ho sake — page refresh karein.</p>';
    });
  renderCart();
})();
