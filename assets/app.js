/* Nhành — giỏ hoa, chọn size, lọc, giao theo khung giờ, phiếu giao hoa, tự bó hoa (SVG), đếm ngược giờ chốt đơn */
(function () {
  'use strict';
  var D = window.NH || {}; var BASE = window.NH_BASE || '';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var vnd = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ'; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var code = function () { var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return 'NH-' + s; };
  var KEY = 'nhanh_cart';
  var cart; try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { cart = []; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { } badge(); }
  function badge() { var n = cart.reduce(function (a, x) { return a + x.q; }, 0); $$('[data-bag-n]').forEach(function (b) { b.textContent = n; b.hidden = !n; }); }
  var tt; function toast(m) { var t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); } t.innerHTML = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 2600); }
  var P = {}; (D.products || []).forEach(function (p) { P[p.slug] = p; });

  /* header, drawer, reveal */
  var hdr = $('.hdr'); addEventListener('scroll', function () { if (hdr) hdr.classList.toggle('scrolled', scrollY > 10); }, { passive: true });
  var dr = $('.drawer'); $$('[data-drawer]').forEach(function (b) { b.addEventListener('click', function () { dr.classList.toggle('open'); }); });
  if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -6% 0px' }); $$('.reveal').forEach(function (el) { io.observe(el); }); setTimeout(function () { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); }, 2500); }
  else $$('.reveal').forEach(function (el) { el.classList.add('in'); });

  /* đếm ngược tới 14:00 chốt đơn giao trong ngày */
  function cd() { var n = new Date(), t = new Date(n); t.setHours(14, 0, 0, 0); var el = $$('[data-cd]'); if (!el.length) return; var ms = t - n; el.forEach(function (x) { if (ms > 0) { var h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4); x.innerHTML = 'Còn <span class="cd">' + h + ' giờ ' + ('0' + m).slice(-2) + ' phút</span> để đặt giao <b>trong hôm nay</b>'; } else x.innerHTML = 'Đã qua 14:00 · đặt bây giờ giao <b>sáng mai từ 8:00</b>'; }); }
  cd(); setInterval(cd, 30000);

  /* chọn size trên thẻ */
  $$('.card').forEach(function (c) {
    var s = P[c.getAttribute('data-slug')]; if (!s) return; var sz = 1;
    $$('.sizes button', c).forEach(function (b, i) { b.addEventListener('click', function () { sz = i; $$('.sizes button', c).forEach(function (x, j) { x.classList.toggle('on', j === i); }); $('[data-pr]', c).textContent = vnd(s.price[i]); }); });
    var add = $('.add', c); if (add) add.addEventListener('click', function () { addItem({ slug: s.slug, size: sz, addons: [] }); });
  });
  function addItem(it) { var ex = cart.filter(function (x) { return x.slug === it.slug && x.size === it.size && JSON.stringify(x.addons) === JSON.stringify(it.addons) && !it.custom; })[0]; if (ex) ex.q++; else { it.q = 1; cart.push(it); } save(); toast('Đã thêm <b>' + esc(it.custom ? 'Bó hoa tự thiết kế' : P[it.slug].name) + '</b> vào giỏ'); openCart(); }
  function itemPrice(x) { if (x.custom) return x.price; var p = P[x.slug].price[x.size]; (x.addons || []).forEach(function (a) { var ad = (D.addons || []).filter(function (y) { return y[0] === a; })[0]; if (ad) p += ad[2]; }); return p; }

  /* lọc cửa hàng */
  var grid = $('[data-shop]');
  if (grid) {
    var q = new URLSearchParams(location.search), st = { dip: q.get('dip') || '', tone: q.get('tone') || '', gia: q.get('gia') || '' };
    function apply() {
      var n = 0; $$('.card', grid).forEach(function (c) { var s = P[c.getAttribute('data-slug')], ok = (!st.dip || s.occ.indexOf(st.dip) >= 0) && (!st.tone || s.tone === st.tone) && (!st.gia || (st.gia === 'duoi500' ? s.price[0] < 500000 : st.gia === '500-1tr' ? s.price[0] >= 500000 && s.price[0] < 1000000 : s.price[0] >= 1000000)); c.hidden = !ok; if (ok) n++; });
      $('[data-count]').textContent = n + ' mẫu hoa'; $('.empty').hidden = n > 0;
      $$('[data-f]').forEach(function (b) { var k = b.getAttribute('data-f'), v = b.getAttribute('data-v'); b.classList.toggle('on', st[k] === v); });
      var u = new URLSearchParams(); Object.keys(st).forEach(function (k) { if (st[k]) u.set(k, st[k]); }); history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : ''));
    }
    $$('[data-f]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-f'), v = b.getAttribute('data-v'); st[k] = st[k] === v ? '' : v; apply(); }); });
    $$('[data-clear]').forEach(function (b) { b.addEventListener('click', function () { st = { dip: '', tone: '', gia: '' }; apply(); }); });
    apply();
  }

  /* khung giờ giao */
  function slots(root, dateInput) {
    var box = $('[data-slots]', root); if (!box) return; var hours = [8, 10, 12, 14, 16, 18, 20];
    function draw() {
      var d = new Date(dateInput.value + 'T00:00'), now = new Date(), today = d.toDateString() === now.toDateString(), sel = box.getAttribute('data-sel');
      box.innerHTML = hours.slice(0, 6).map(function (h) { var dis = today && (h <= now.getHours() + 1 || now.getHours() >= 14 && h < 24); return '<button type="button" data-h="' + h + '"' + (dis ? ' disabled' : '') + (sel == h && !dis ? ' class="on"' : '') + '>' + h + ':00 – ' + (h + 2) + ':00</button>'; }).join('');
      if (!$('.on', box)) { var f = $('button:not([disabled])', box); if (f) { f.classList.add('on'); box.setAttribute('data-sel', f.getAttribute('data-h')); } }
      $$('button', box).forEach(function (b) { b.addEventListener('click', function () { box.setAttribute('data-sel', b.getAttribute('data-h')); draw(); }); });
    }
    dateInput.addEventListener('change', draw); draw();
  }
  function isoDate(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function prepDate(inp) { var now = new Date(), d = new Date(now); if (now.getHours() >= 14) d.setDate(d.getDate() + 1); inp.min = isoDate(now); inp.value = isoDate(d); }

  /* trang chi tiết */
  var pd = $('[data-pd]');
  if (pd) {
    var s = P[pd.getAttribute('data-pd')], sz = 1, ads = [];
    function price() { var p = s.price[sz]; ads.forEach(function (a) { p += (D.addons.filter(function (y) { return y[0] === a; })[0] || [0, 0, 0])[2]; }); $('[data-price]', pd).textContent = vnd(p); }
    $$('.sz button', pd).forEach(function (b, i) { b.addEventListener('click', function () { sz = i; $$('.sz button', pd).forEach(function (x, j) { x.classList.toggle('on', j === i); }); price(); }); });
    $$('[data-addon]', pd).forEach(function (c) { c.addEventListener('change', function () { ads = $$('[data-addon]:checked', pd).map(function (x) { return x.value; }); price(); }); });
    var di = $('[data-date]', pd); prepDate(di); slots(pd, di);
    $('[data-addcart]', pd).addEventListener('click', function () { addItem({ slug: s.slug, size: sz, addons: ads.slice(), note: $('[data-note]', pd).value.trim(), date: di.value, slot: $('[data-slots]', pd).getAttribute('data-sel') }); });
    var nt = $('[data-note]', pd), prev = $('[data-note-prev]'); if (nt && prev) nt.addEventListener('input', function () { prev.textContent = nt.value || 'Lời nhắn của bạn sẽ được viết tay ở đây'; });
    price();
  }

  /* giỏ + thanh toán */
  var cartEl = $('.cart'), cbg = $('.cart-bg');
  function openCart() { if (!cartEl) return; drawCart(); cartEl.classList.add('open'); cbg.classList.add('open'); cartEl.setAttribute('aria-hidden', 'false'); }
  function closeCart() { cartEl.classList.remove('open'); cbg.classList.remove('open'); cartEl.setAttribute('aria-hidden', 'true'); }
  $$('[data-bag]').forEach(function (b) { b.addEventListener('click', openCart); });
  if (cbg) cbg.addEventListener('click', closeCart);
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && cartEl && cartEl.classList.contains('open')) closeCart(); });
  function drawCart(step) {
    var b = $('.cart-b', cartEl), f = $('.cart-f', cartEl), sub = cart.reduce(function (a, x) { return a + itemPrice(x) * x.q; }, 0);
    $('[data-close-cart]', cartEl).onclick = closeCart;
    if (!cart.length) { b.innerHTML = '<p class="empty">Giỏ hoa đang trống.<br><a class="lnk" href="' + BASE + 'cua-hang.html">Chọn hoa</a></p>'; f.innerHTML = ''; return; }
    if (step !== 'pay') {
      b.innerHTML = cart.map(function (x, i) { var p = x.custom ? null : P[x.slug]; return '<div class="ci"><span class="ph">' + (p ? '<img src="' + BASE + 'assets/img/' + p.img + '-600.webp" alt="">' : '<img src="' + BASE + 'assets/img/tay-bo-600.webp" alt="">') + '</span><div><b>' + esc(p ? p.name : 'Bó hoa tự thiết kế') + '</b><small>' + (p ? 'Size ' + ['S', 'M', 'L'][x.size] : esc(x.desc)) + ' · ' + x.q + ' × ' + vnd(itemPrice(x)) + '</small></div><button type="button" data-rm="' + i + '" aria-label="Bỏ">✕</button></div>'; }).join('');
      f.innerHTML = '<div class="row"><span>Tạm tính</span><b class="tot">' + vnd(sub) + '</b></div><p class="muted" style="font-size:.86rem">Phí giao tính theo khu vực ở bước sau. Thiệp viết tay miễn phí.</p><button type="button" class="btn btn-rose" style="width:100%" data-go>Đặt giao hoa</button>';
      $$('[data-rm]', b).forEach(function (x) { x.addEventListener('click', function () { cart.splice(+x.getAttribute('data-rm'), 1); save(); drawCart(); }); });
      $('[data-go]', f).addEventListener('click', function () { drawCart('pay'); });
      return;
    }
    b.innerHTML = '<form data-pay novalidate><div class="fld"><span>Người nhận</span><input name="ten" autocomplete="name" placeholder="Tên người nhận"></div><div class="fld"><span>Số điện thoại người nhận</span><input name="sdt" inputmode="tel" placeholder="09xx xxx xxx"></div>' +
      '<div class="fld"><span>Khu vực</span><select name="kv">' + D.districts.map(function (d, i) { return '<option value="' + i + '">' + esc(d[0]) + (d[1] ? ' · +' + vnd(d[1]) : ' · miễn phí') + '</option>'; }).join('') + '</select></div><div class="fld"><span>Địa chỉ</span><input name="dc" autocomplete="street-address" placeholder="Số nhà, đường, phường"></div>' +
      '<div class="fld"><span>Ngày giao</span><input type="date" name="ngay" data-date></div><div class="fld"><span>Khung giờ</span><div class="slots" data-slots></div></div>' +
      '<div class="fld"><span>Lời nhắn trên thiệp</span><textarea name="loi" class="note" placeholder="Chúc mừng sinh nhật mẹ…">' + esc((cart.filter(function (x) { return x.note; })[0] || {}).note || '') + '</textarea></div><label class="ck"><input type="checkbox" name="an"> Giấu tên người gửi</label></form>';
    var fm = $('[data-pay]', b); prepDate(fm.ngay); slots(fm, fm.ngay);
    function tot() { var ship = D.districts[+fm.kv.value][1]; return { ship: ship, all: sub + ship }; }
    function foot() { var t = tot(); f.innerHTML = '<div class="row"><span>Hoa</span><span>' + vnd(sub) + '</span></div><div class="row"><span>Giao hoa</span><span>' + (t.ship ? vnd(t.ship) : 'Miễn phí') + '</span></div><div class="row"><span>Tổng</span><b class="tot">' + vnd(t.all) + '</b></div><button type="button" class="btn btn-rose" style="width:100%" data-submit>Xác nhận đặt hoa</button><button type="button" class="lnk" style="margin-top:12px;background:none;border:0;cursor:pointer" data-back>Quay lại giỏ</button>'; $('[data-back]', f).onclick = function () { drawCart(); }; $('[data-submit]', f).onclick = submit; }
    fm.kv.addEventListener('change', foot); foot();
    function submit() {
      $$('.err', fm).forEach(function (x) { x.remove(); }); var ok = true;
      [['ten', function (v) { return v.trim().length > 1; }, 'Nhập tên người nhận'], ['sdt', function (v) { return /^0\d{9}$/.test(v.replace(/[\s.]/g, '')); }, 'Số điện thoại 10 số'], ['dc', function (v) { return v.trim().length > 5; }, 'Nhập địa chỉ giao']].forEach(function (r) { if (!r[1](fm[r[0]].value)) { ok = false; fm[r[0]].insertAdjacentHTML('afterend', '<small class="err">' + r[2] + '</small>'); } });
      if (!ok) return;
      var t = tot(), c = code(), h = +$('[data-slots]', fm).getAttribute('data-sel'), d = fm.ngay.value.split('-').reverse().join('/');
      var payload = {
        customer: { ten: fm.ten.value, sdt: fm.sdt.value, dc: fm.dc.value, kv: D.districts[+fm.kv.value][0] },
        delivery: { date: fm.ngay.value, slot: h, note: fm.loi.value },
        items: cart.map(function(it) {
          return {
            slug: it.slug || '',
            name: it.custom ? 'Bó hoa tự thiết kế' : (P[it.slug] ? P[it.slug].name : it.slug),
            size: it.size,
            price: itemPrice(it),
            addons: it.addons,
            q: it.q,
            desc: it.desc || ''
          };
        }),
        ship: t.ship,
        total: t.all
      };
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function(err) { console.error('Order error:', err); });
      b.innerHTML = '<div class="slip"><span class="cap">Phiếu giao hoa</span><div class="code">' + c + '</div><p class="script" style="font-size:2rem;color:var(--stem)">Cảm ơn bạn!</p><dl><dt>Người nhận</dt><dd>' + esc(fm.ten.value) + '</dd><dt>Giao</dt><dd>' + d + ', ' + h + ':00 – ' + (h + 2) + ':00</dd><dt>Địa chỉ</dt><dd>' + esc(fm.dc.value) + ', ' + esc(D.districts[+fm.kv.value][0]) + '</dd><dt>Tổng</dt><dd><b>' + vnd(t.all) + '</b></dd>' + (fm.loi.value ? '<dt>Thiệp</dt><dd class="script" style="font-size:1.5rem;color:var(--stem)">' + esc(fm.loi.value) + '</dd>' : '') + '</dl><p class="muted" style="font-size:.88rem">Woashe Bloom đã tiếp nhận đơn hàng. Chúng tôi sẽ chụp ảnh hoa gửi duyệt qua Zalo trước khi giao.</p></div>';
      f.innerHTML = '<a class="btn" style="width:100%" href="https://zalo.me/0817567008" target="_blank" rel="noopener">Nhắn Zalo cho Woashe Bloom</a>';
      cart = []; save();
    }
  }
  badge();

  /* tự bó hoa */
  var bl = $('[data-builder]');
  if (bl) {
    var cnt = {}, wrap = 0; (D.stems || []).forEach(function (s) { cnt[s.k] = 0; }); cnt['hong-kem'] = 5; cnt['baby'] = 3;
    function head(s, x, y, r, id) {
      var c = s.col, st = '';
      if (s.shape === 'rose') st = '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '"/><path d="M' + (x - r * .5) + ' ' + y + ' q' + r * .5 + ' ' + (-r * .7) + ' ' + r + ' 0 q' + (-r * .5) + ' ' + r * .6 + ' ' + (-r) + ' 0" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="2"/><circle cx="' + x + '" cy="' + y + '" r="' + r * .35 + '" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="2"/>';
      else if (s.shape === 'tulip') st = '<path d="M' + (x - r) + ' ' + (y - r * .3) + ' Q' + (x - r) + ' ' + (y + r) + ' ' + x + ' ' + (y + r) + ' Q' + (x + r) + ' ' + (y + r) + ' ' + (x + r) + ' ' + (y - r * .3) + ' L' + (x + r * .45) + ' ' + y + ' L' + x + ' ' + (y - r) + ' L' + (x - r * .45) + ' ' + y + 'Z" fill="' + c + '"/>';
      else if (s.shape === 'peony') { for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; st += '<circle cx="' + (x + Math.cos(a) * r * .45).toFixed(1) + '" cy="' + (y + Math.sin(a) * r * .45).toFixed(1) + '" r="' + r * .62 + '" fill="' + c + '" opacity=".85"/>'; } st += '<circle cx="' + x + '" cy="' + y + '" r="' + r * .45 + '" fill="#F7C6D1"/>'; }
      else if (s.shape === 'hydra') { for (var j = 0; j < 14; j++) { var aa = j * 2.4, rr = r * .75 * Math.sqrt((j + 1) / 14); st += '<circle cx="' + (x + Math.cos(aa) * rr).toFixed(1) + '" cy="' + (y + Math.sin(aa) * rr).toFixed(1) + '" r="' + r * .3 + '" fill="' + c + '" stroke="#fff" stroke-width="1"/>'; } }
      else if (s.shape === 'sun') { for (var m = 0; m < 14; m++) { var b = m * Math.PI / 7; st += '<ellipse cx="' + (x + Math.cos(b) * r * .75).toFixed(1) + '" cy="' + (y + Math.sin(b) * r * .75).toFixed(1) + '" rx="' + r * .45 + '" ry="' + r * .18 + '" transform="rotate(' + (b * 180 / Math.PI) + ' ' + (x + Math.cos(b) * r * .75).toFixed(1) + ' ' + (y + Math.sin(b) * r * .75).toFixed(1) + ')" fill="' + c + '"/>'; } st += '<circle cx="' + x + '" cy="' + y + '" r="' + r * .45 + '" fill="#5B3A1C"/>'; }
      else if (s.shape === 'daisy') { for (var n = 0; n < 12; n++) { var g = n * Math.PI / 6; st += '<ellipse cx="' + (x + Math.cos(g) * r * .6).toFixed(1) + '" cy="' + (y + Math.sin(g) * r * .6).toFixed(1) + '" rx="' + r * .35 + '" ry="' + r * .14 + '" transform="rotate(' + (g * 180 / Math.PI) + ' ' + (x + Math.cos(g) * r * .6).toFixed(1) + ' ' + (y + Math.sin(g) * r * .6).toFixed(1) + ')" fill="#fff" stroke="#e6e0d6"/>'; } st += '<circle cx="' + x + '" cy="' + y + '" r="' + r * .3 + '" fill="#F4B400"/>'; }
      else { for (var o = 0; o < 7; o++) st += '<circle cx="' + (x + (Math.random() - .5) * r * 1.6).toFixed(1) + '" cy="' + (y + (Math.random() - .5) * r * 1.6).toFixed(1) + '" r="3.2" fill="#fff" stroke="#ddd"/>'; }
      return '<g class="fl-head">' + st + '</g>';
    }
    function draw() {
      var list = []; D.stems.forEach(function (s) { for (var i = 0; i < cnt[s.k]; i++) list.push(s); });
      var n = list.length, W = D.wraps[wrap], svg = '<svg viewBox="0 0 400 440" role="img" aria-label="Bó hoa của bạn"><defs><linearGradient id="wg" x1="0" x2="1"><stop offset="0" stop-color="' + W[2] + '"/><stop offset=".5" stop-color="' + W[2] + '" stop-opacity=".85"/><stop offset="1" stop-color="' + W[2] + '"/></linearGradient></defs>';
      var stems = '', heads = '', seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      list.forEach(function (s, i) { var ang = n > 1 ? (-60 + 120 * i / (n - 1)) : 0, ring = i % 3, R = 110 - ring * 28 + rnd() * 16, x = 200 + Math.sin(ang * Math.PI / 180) * R * (0.7 + rnd() * .3), y = 170 - Math.cos(ang * Math.PI / 180) * R * .8 + ring * 22; stems += '<path d="M200 330 Q' + (200 + (x - 200) * .3) + ' 260 ' + x.toFixed(1) + ' ' + y.toFixed(1) + '" stroke="#5E8C4E" stroke-width="3" fill="none"/>'; if (i % 2 === 0) stems += '<ellipse cx="' + ((x + 200) / 2).toFixed(1) + '" cy="' + ((y + 300) / 2).toFixed(1) + '" rx="12" ry="5" fill="#7FA36E" transform="rotate(' + (ang - 30) + ' ' + ((x + 200) / 2).toFixed(1) + ' ' + ((y + 300) / 2).toFixed(1) + ')"/>'; var r = s.shape === 'baby' ? 14 : s.shape === 'hydra' ? 30 : s.shape === 'peony' ? 26 : 20; heads += head(s, +x.toFixed(1), +y.toFixed(1), r, i); });
      svg += stems + heads + '<path d="M110 250 L200 420 L290 250 Q250 280 200 270 Q150 280 110 250Z" fill="url(#wg)" stroke="rgba(0,0,0,.15)"/><path d="M130 262 L200 420" stroke="rgba(0,0,0,.08)" stroke-width="2"/><path d="M270 262 L200 420" stroke="rgba(0,0,0,.08)" stroke-width="2"/><path d="M175 340 q25 16 50 0 M200 348 l-18 34 M200 348 l18 34" stroke="#B23A5B" stroke-width="5" fill="none" stroke-linecap="round"/>' + (n ? '' : '<text x="200" y="160" text-anchor="middle" font-family="Josefin Sans" font-size="18" fill="#6E655E">Chọn hoa ở bên cạnh</text>') + '</svg>';
      $('[data-bq]', bl).innerHTML = svg;
      var stemTot = D.stems.reduce(function (a, s) { return a + s.price * cnt[s.k]; }, 0), labor = Math.round(stemTot * .1 / 1000) * 1000, total = stemTot + (n ? W[3] + labor : 0);
      $('[data-bq-n]', bl).textContent = n + ' cành'; $('[data-bq-p]', bl).textContent = vnd(total);
      $('[data-bq-break]', bl).innerHTML = n ? 'Hoa ' + vnd(stemTot) + ' · giấy ' + vnd(W[3]) + ' · công bó ' + vnd(labor) : '';
      D.stems.forEach(function (s) { var el = $('[data-q="' + s.k + '"]', bl); if (el) el.textContent = cnt[s.k]; });
      $('[data-bq-add]', bl).disabled = n < 3; bl._tot = total; bl._n = n;
    }
    $$('[data-inc]', bl).forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-inc'), d = +b.getAttribute('data-d'), tot = D.stems.reduce(function (a, s) { return a + cnt[s.k]; }, 0); if (d > 0 && tot >= 40) { toast('Tối đa 40 cành một bó'); return; } cnt[k] = Math.max(0, cnt[k] + d); draw(); }); });
    $$('[data-wrap]', bl).forEach(function (b, i) { b.addEventListener('click', function () { wrap = i; $$('[data-wrap]', bl).forEach(function (x, j) { x.classList.toggle('on', j === i); }); draw(); }); });
    $('[data-bq-add]', bl).addEventListener('click', function () { var desc = D.stems.filter(function (s) { return cnt[s.k]; }).map(function (s) { return cnt[s.k] + ' ' + s.name.toLowerCase(); }).join(', ') + ' · ' + D.wraps[wrap][1].toLowerCase(); cart.push({ custom: true, price: bl._tot, desc: desc, q: 1 }); save(); toast('Đã thêm bó hoa của bạn vào giỏ'); openCart(); });
    draw();
  }

  /* đăng ký hoa định kỳ */
  var sb = $('[data-subs]');
  if (sb) {
    var pick = 0, subs = D.subs; function upd() { var s = subs[pick], w = +$('[data-weeks]', sb).value; $$('.sub', sb).forEach(function (x, i) { x.classList.toggle('on', i === pick); }); var times = s.k === 'tuan' ? w : s.k === '2tuan' ? Math.ceil(w / 2) : Math.ceil(w / 4), disc = w >= 12 ? .1 : 0; $('[data-sub-out]', sb).innerHTML = times + ' lần giao × ' + vnd(s.price) + (disc ? ' · giảm 10% gói từ 12 tuần' : '') + ' = <b>' + vnd(times * s.price * (1 - disc)) + '</b>'; }
    $$('.sub', sb).forEach(function (x, i) { x.addEventListener('click', function () { pick = i; upd(); }); }); $('[data-weeks]', sb).addEventListener('change', upd); upd();
    var sf = $('[data-sub-form]'); if (sf) sf.addEventListener('submit', function (e) { e.preventDefault(); if (!/^0\d{9}$/.test(sf.sdt.value.replace(/[\s.]/g, ''))) { toast('Nhập số điện thoại 10 số'); return; } sf.outerHTML = '<div class="slip"><span class="cap">Đăng ký hoa định kỳ</span><div class="code">' + code() + '</div><p>Nhành sẽ gọi xác nhận lịch giao đầu tiên. Mẫu demo: không gửi đi.</p></div>'; });
  }
  /* bảng mùa: tô tháng hiện tại */
  var mo = new Date().getMonth(); $$('[data-mo="' + mo + '"]').forEach(function (x) { x.classList.add('now'); });
  /* form liên hệ + bản tin */
  $$('[data-simple]').forEach(function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); var inps = $$('input[required],textarea[required]', f); if (inps.some(function (i) { return !i.value.trim(); })) { toast('Vui lòng điền đủ thông tin'); return; } f.innerHTML = '<p class="script" style="font-size:2rem">Cảm ơn bạn!</p><p class="muted">Nhành sẽ liên hệ lại sớm. (Mẫu demo, chưa gửi đi.)</p>'; }); });
})();
