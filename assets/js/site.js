/* R-Case : le site vitrine (côté clients) */
(function(){
"use strict";
var R = window.RCASE, esc = R.esc, fcfa = R.fcfa, WA = R.WA, hasPromo = R.hasPromo, priceOf = R.priceOf;
var $ = function(id){ return document.getElementById(id); };
var S = {}, CATS = [], ITEMS = [];
var ICON = {
  plus:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  check:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  left:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  right:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  arrow:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  chev:'<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  coque:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="3.5" width="16" height="25" rx="4"/><rect x="10.5" y="6" width="6.5" height="7" rx="2"/><circle cx="13.7" cy="8.3" r="1.2"/><circle cx="13.7" cy="11.2" r="1.2"/><path d="M26.5 4.5v3M25 6h3"/><path d="M15 22c2-1.5 4-1.5 5 0"/></svg>',
  moto:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="22.5" r="3.5"/><circle cx="24" cy="22.5" r="3.5"/><path d="M11.5 22.5h7.5l3-8h3"/><path d="M19 14.5l-2.5-4.5h-3"/><rect x="3.5" y="11" width="8" height="6.5" rx="1.2"/><path d="M1.5 8.5h4M0.8 12h1.6"/></svg>',
  badge:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3l3.2 2.3 3.9-.2 1.2 3.7 3.2 2.3-1.2 3.7 1.2 3.7-3.2 2.3-1.2 3.7-3.9-.2L16 26.6l-3.2-2.3-3.9.2-1.2-3.7-3.2-2.3 1.2-3.7-1.2-3.7 3.2-2.3 1.2-3.7 3.9.2z"/><path d="M11.5 15l3 3 6-6"/><path d="M11 25.5L9 30l3.5-1.2L15 31M21 25.5l2 4.5-3.5-1.2L17 31"/></svg>',
  pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8c-4.3 0-7.8 3.4-7.8 7.7 0 5.7 7 12.2 7.3 12.5.3.3.7.3 1 0 .3-.3 7.3-6.8 7.3-12.5 0-4.3-3.5-7.7-7.8-7.7z" fill="#E4572E"/><circle cx="12" cy="9.5" r="3.1" fill="#FFF4F2"/></svg>'
};

/* ---------- Données ---------- */
function cat(id){ return CATS.find(function(c){ return c.id === id; }); }
function catLabel(id){ var c = cat(id); return c ? c.label : "Autres"; }
function subLabel(ci, si){ var c = cat(ci); var s = c && c.subs.find(function(x){ return x.id === si; }); return s ? s.label : ""; }
function item(n){ return ITEMS.find(function(i){ return i.n === n; }); }
function img(i){ return R.imgUrl(i.img); }
function isOut(i){ return i.status === "epuise" || i.stock <= 0; }
function visible(){ return ITEMS.filter(function(i){ return i.status !== "cache" && i.status !== "epuise" && i.stock > 0; }); }
function avail(){ return visible().filter(function(i){ return !isOut(i); }); }
function liveCats(){ return CATS.filter(function(c){ return c.main && visible().some(function(i){ return i.cat === c.id; }); }); }
function liveSubs(c){ return c.subs.filter(function(s){ return visible().some(function(i){ return i.cat === c.id && i.sub === s.id; }); }); }
function hasNews(){ return avail().some(function(i){ return i.is_new; }); }
function hasPromos(){ return avail().some(hasPromo); }
function waUrl(t){ return "https://wa.me/" + (S.phone || "237652089193") + (t ? "?text=" + encodeURIComponent(t) : ""); }
function priceHtml(i){ return hasPromo(i) ? '<span class="price promo"><s>' + fcfa(i.price) + '</s>' + fcfa(i.promo) + '</span>' : '<span class="price">' + fcfa(i.price) + '</span>'; }
function toast(html, ms){ var t = $("toast"); t.innerHTML = html; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function(){ t.hidden = true; }, ms || 3200); }
function stars(s){ return esc(s || "").replace(/\*(.+?)\*/g, "<em>$1</em>"); }

/* ---------- Panier ---------- */
var CART = {};
try { CART = JSON.parse(localStorage.getItem("rcase-cart") || "{}") || {}; } catch(e){ CART = {}; }
function saveCart(){ try { localStorage.setItem("rcase-cart", JSON.stringify(CART)); } catch(e){} updateCartN(); }
function cartLines(){ return Object.keys(CART).map(function(k){ var i = item(+k); return i && i.status === "dispo" && !isOut(i) ? {i:i, q:Math.min(CART[k], i.stock)} : null; }).filter(Boolean); }
function updateCartN(){ $("cartn").textContent = cartLines().reduce(function(s, l){ return s + l.q; }, 0); }
function addToCart(n, q){
  var i = item(n); if (!i || isOut(i) || i.status !== "dispo") return false;
  var cur = CART[n] || 0, nq = Math.min(i.stock, cur + (q || 1));
  if (nq === cur){ toast((i.stock === 1 ? "C’est une pièce unique : elle est déjà dans ton panier." : "Tu as déjà les " + i.stock + " pièces disponibles dans ton panier.") + ' <a href="#panier">Voir le panier</a>', 4200); return false; }
  CART[n] = nq; saveCart(); toast("Ajouté au panier <a href=\"#panier\">Voir le panier</a>"); return true;
}

/* ---------- Navigation ---------- */
function navLinks(){
  return '<a href="#accueil" data-r="accueil">Accueil</a><a href="#boutique" data-r="boutique">Boutique</a>' + (hasNews() ? '<a href="#nouveautes" data-r="nouveautes">Nouveautés</a>' : '');
}
function setBurger(open){ $("mpane").hidden = !open; $("burger").setAttribute("aria-expanded", open ? "true" : "false"); }
$("burger").addEventListener("click", function(e){ e.stopPropagation(); setBurger($("mpane").hidden); });
document.addEventListener("click", function(e){
  if (!e.target.closest("#burger") && !e.target.closest("#mpane")) setBurger(false);
  if (!e.target.closest(".dd")) closeDD();
});
document.addEventListener("keydown", function(e){ if (e.key === "Escape"){ setBurger(false); closeDD(); } });

var RENDERED = false, ROUTE = "accueil", shopCat = "all", shopSub = "all", shopQ = "";
function parseHash(){
  var h = (location.hash || "").replace(/^#/, "");
  var m = h.match(/^article-(\d+)$/); if (m) return {r:"article", a:+m[1]};
  if (h === "nouveautes") return {r:"boutique", a:"nouveautes", b:"all", nav:"nouveautes"};
  if (h === "promos") return {r:"boutique", a:"promos", b:"all"};
  var c = h.match(/^boutique-([a-z0-9-]+?)(?:--([a-z0-9-]+))?$/); if (c) return {r:"boutique", a:c[1], b:c[2] || "all"};
  return {r: ["accueil","boutique","panier"].indexOf(h) >= 0 ? h : "accueil"};
}
var NAV = "accueil";
function go(){
  var p = parseHash(); setBurger(false);
  if (p.r === "article"){
    if (RENDERED){ openSheet(p.a); return; }
    ROUTE = "boutique"; NAV = "boutique"; render(); openSheet(p.a); return;
  }
  if ($("sheet").open) $("sheet").close();
  if (p.r === "boutique"){ shopCat = p.a || "all"; shopSub = p.b || "all"; if (p.a) shopQ = ""; }
  ROUTE = p.r; NAV = p.nav || p.r; render(); window.scrollTo(0, 0);
}
window.addEventListener("hashchange", go);
function render(){
  RENDERED = true;
  $("navlinks").innerHTML = navLinks(); $("mpane").innerHTML = navLinks();
  document.querySelectorAll("[data-r]").forEach(function(a){ if (a.dataset.r === NAV) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  $("wafab").href = waUrl("Bonjour R-Case,\n\n");
  updateCartN(); renderFoot();
  var v = $("view");
  if (ROUTE === "boutique") v.innerHTML = viewShop();
  else if (ROUTE === "panier") v.innerHTML = viewCart();
  else v.innerHTML = viewHome();
  if (ROUTE === "accueil") startCarousel();
  bind();
  reveal();
}
/* Apparition douce des blocs au défilement */
var revealObs = null;
function reveal(){
  document.body.classList.add("ready");
  var v = $("view");
  if (reveal.last !== ROUTE){ reveal.last = ROUTE; v.classList.remove("enter"); void v.offsetWidth; v.classList.add("enter"); }
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (revealObs) revealObs.disconnect();
  revealObs = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add("vu"); revealObs.unobserve(e.target); } }); }, {rootMargin:"0px 0px -8% 0px", threshold:0.08});
  var els = [].filter.call(v.querySelectorAll(".blk .blk-h, .perk, .card, .catc, .edito > *"), function(el){ return !el.closest(".rail"); });
  els.forEach(function(el, k){
    var r = el.getBoundingClientRect();
    if (r.top < innerHeight * 0.95) return;
    el.classList.add("rv"); el.style.transitionDelay = (k % 4) * 60 + "ms"; revealObs.observe(el);
  });
}

/* ---------- Carte produit ---------- */
function addBtn(i){
  var inC = !!CART[i.n], full = inC && CART[i.n] >= i.stock;
  return '<button class="add' + (inC ? ' in' : '') + '" type="button" data-add="' + i.n + '" aria-label="' + (full ? esc(i.name) + ' est dans ton panier' : 'Ajouter ' + esc(i.name) + ' au panier') + '">' + (full ? ICON.check : ICON.plus) + '</button>';
}
function refreshAdds(){ document.querySelectorAll("[data-add]").forEach(function(b){ var i = item(+b.dataset.add); if (i) b.outerHTML = addBtn(i); }); }
function card(i){
  var out = isOut(i), res = i.status === "reserve";
  var flag = out ? "" : res ? '<span class="flag res">Réservé</span>' : hasPromo(i) ? '<span class="flag promo">Promo −' + Math.round((1 - i.promo / i.price) * 100) + ' %</span>' : i.is_new ? '<span class="flag new">Nouveau</span>' : (i.stock === 1 ? '<span class="flag few">Pièce unique</span>' : '');
  return '<article class="card' + (out ? " out" : "") + '">' +
    '<a class="ph" href="#article-' + i.n + '" aria-label="Voir ' + esc(i.name) + '"><img loading="lazy" alt="" src="' + esc(img(i)) + '"><span class="tag">' + esc(fitLabel(i)) + '</span>' + flag + '</a>' +
    '<div class="bd"><a class="nm" href="#article-' + i.n + '">' + esc(i.name) + '</a><span class="md">' + esc(subLabel(i.cat, i.sub) || catLabel(i.cat)) + '</span>' +
    '<div class="row">' + priceHtml(i) + (out || res ? '' : addBtn(i)) + '</div></div></article>';
}

function isPhoneModel(i){ return i.cat === "coque" && /iphone|galaxy|samsung|redmi|tecno|infinix|pixel/i.test(i.model || ""); }
function fitLabel(i){ return isPhoneModel(i) ? "Pour " + i.model : (i.model || "Universel"); }

/* ---------- Accueil ---------- */
function viewHome(){
  var A = avail();
  var feat = A.filter(function(i){ return i.featured; });
  if (feat.length < 3) feat = feat.concat(A.filter(function(i){ return !i.featured; })).slice(0, 9);
  var slides = ['<div class="slide"><div class="txt"><span class="kick">' + esc(S.kicker || "Nouvelle collection") + '</span><h2>' + stars(S.slideTitle) + '</h2><p>' + esc(S.slideSub || "") + '</p></div><div class="pic"><div class="mosaic">' + A.slice(0, 4).map(function(i){ return '<img alt="" src="' + esc(img(i)) + '">'; }).join("") + '</div></div></div>'];
  feat.filter(function(i){ return i.cat === "coque"; }).sort(function(a, b){ return b.n - a.n; }).concat(feat).filter(function(x, j, arr){ return arr.indexOf(x) === j; }).slice(0, 3).forEach(function(i){
    slides.push('<a class="slide one" href="#article-' + i.n + '" aria-label="' + esc(i.name) + '"><span class="bgi" style="background-image:url(\'' + esc(img(i)) + '\')"></span><span class="shot"><img alt="" src="' + esc(img(i)) + '"></span></a>');
  });
  var promos = A.filter(hasPromo);
  var news = A.filter(function(i){ return i.is_new; });
  var wallItems = feat.slice().reverse().concat(A).filter(function(x, j, arr){ return arr.indexOf(x) === j && x.n !== 36; }).slice(0, 5);
  return '<section class="intro"><div class="w g"><div class="intro-pics" aria-hidden="true"><img class="c2" alt="" src="assets/img/coque-2.webp"><img class="c1" alt="" src="assets/img/coque-1.webp"></div><h1>' + esc(S.heroTitle1 || "La touche en plus,") + '<span>' + esc(S.heroTitle2 || "c’est R-Case.") + '</span></h1><p class="lead">' + esc(S.heroLead || "") + '</p><p>' + esc(S.heroText || "") + '</p>' +
      '<div class="acts"><a class="btn btn-gold" href="#boutique">' + ICON.arrow + 'Voir la boutique</a>' + (news.length ? '<a class="btn btn-line" href="#nouveautes">Nouveautés</a>' : '<a class="btn btn-line" href="' + waUrl("Bonjour R-Case,\n\n") + '" target="_blank" rel="noopener">Nous écrire</a>') + '</div></div></section>' +
    '<section class="hero g"><div class="w"><div class="slides" id="slides"><div class="track" id="track">' + slides.join("") + '</div>' +
      '<button class="arrow prev" type="button" id="prev" aria-label="Diapositive précédente">' + ICON.left + '</button><button class="arrow next" type="button" id="next" aria-label="Diapositive suivante">' + ICON.right + '</button>' +
      '<div class="dots" id="dots">' + slides.map(function(_, j){ return '<button type="button" aria-label="Aller à la diapositive ' + (j + 1) + '" data-dot="' + j + '"></button>'; }).join("") + '</div></div>' +
      '<div class="perks">' +
        '<div class="perk"><span class="ic">' + ICON.coque + '</span><div><b>Des pièces rares</b><span>Peu d’exemplaires par modèle : tu ne la croiseras pas à chaque coin de rue.</span></div></div>' +
        '<div class="perk"><span class="ic">' + ICON.moto + '</span><div><b>Livraison</b><span>Rapide et efficace, partout à ' + esc(S.city || "Douala") + '.</span></div></div>' +
        '<div class="perk"><span class="ic">' + ICON.badge + '</span><div><b>Qualité-prix garantie</b><span>Des produits pour tous les prix.</span></div></div>' +
      '</div></div></section>' +
    (promos.length ? '<section class="blk g"><div class="w"><div class="blk-h"><div><h2>Promotions</h2><p>Les bons plans du moment, tant qu’il en reste.</p></div><a href="#promos">Tout voir</a></div><div class="rail">' + promos.map(card).join("") + '</div></div></section>' : '') +
    (news.length ? '<section class="blk g"><div class="w"><div class="blk-h"><div><h2>Nouveautés</h2><p>Fraîchement arrivées, déjà convoitées.</p></div><a href="#nouveautes">Tout voir</a></div><div class="rail">' + news.slice(0, 12).map(card).join("") + '</div></div></section>' : '') +
    '<section class="blk g"><div class="w"><div class="blk-h"><div><h2>Trouve ton style</h2><p>Choisis une catégorie, puis le genre qui te ressemble.</p></div></div><div class="cats">' + liveCats().map(function(c){
      var first = A.find(function(i){ return i.cat === c.id && i.featured; }) || A.find(function(i){ return i.cat === c.id; }) || visible().find(function(i){ return i.cat === c.id; });
      return '<div class="catc"><a class="im" href="#boutique-' + c.id + '"><img loading="lazy" alt="" src="' + (first ? esc(img(first)) : "") + '"><span>' + esc(c.label) + '</span></a><div class="subs">' + liveSubs(c).map(function(s){ return '<a class="subchip" href="#boutique-' + c.id + '--' + s.id + '">' + esc(s.label) + '</a>'; }).join("") + '</div></div>';
    }).join("") + '</div></div></section>' +
    (wallItems.length >= 3 ? '<section class="blk g"><div class="w edito"><div class="txtb"><div class="edpic" aria-hidden="true"><img alt="" src="assets/img/coque-3.webp"><span>Coup de cœur</span></div><span class="kick">La sélection du moment</span><h2>Choisies une à une,<span>portées par toi.</span></h2><p>Les pièces qu’on adore en ce moment. Elles partent vite : réserve la tienne avant les autres.</p><a class="btn btn-gold" href="#boutique">' + ICON.arrow + 'Tout découvrir</a></div><div class="wall">' + wallItems.map(function(i){ return '<a href="#article-' + i.n + '"><img loading="lazy" alt="" src="' + esc(img(i)) + '"><span>' + esc(i.name) + '</span></a>'; }).join("") + '</div></div></section>' : '');
}
var carTimer = null;
function startCarousel(){
  var tr = $("track"); if (!tr) return;
  var n = tr.children.length, k = 0, dots = $("dots").querySelectorAll("button"), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function mark(){ dots.forEach(function(d, j){ d.setAttribute("aria-current", j === k ? "true" : "false"); }); }
  function to(j){ k = (j + n) % n; tr.scrollTo({left:tr.clientWidth * k, behavior:reduce ? "auto" : "smooth"}); mark(); }
  tr.addEventListener("scroll", function(){ var j = Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth)); if (j !== k){ k = j; mark(); } }, {passive:true});
  $("prev").onclick = function(){ to(k - 1); restart(); };
  $("next").onclick = function(){ to(k + 1); restart(); };
  $("dots").onclick = function(e){ var b = e.target.closest("[data-dot]"); if (b){ to(+b.dataset.dot); restart(); } };
  function restart(){ clearInterval(carTimer); if (!reduce) carTimer = setInterval(function(){ if (document.hidden || !$("track")) return; to(k + 1); }, 5000); }
  $("slides").addEventListener("pointerenter", function(){ clearInterval(carTimer); });
  $("slides").addEventListener("pointerleave", restart);
  mark(); restart();
}

/* ---------- Boutique ---------- */
function closeDD(except){ document.querySelectorAll(".ddm").forEach(function(m){ if (m !== except){ m.hidden = true; var b = m.previousElementSibling; if (b) b.setAttribute("aria-expanded", "false"); } }); }
function viewShop(){
  var f = '<button class="fbtn" type="button" data-pick="all|all" aria-pressed="' + (shopCat === "all") + '">Tout</button>' +
    liveCats().map(function(c){
      var subs = liveSubs(c), on = shopCat === c.id;
      if (!subs.length) return '<button class="fbtn' + (on ? " on" : "") + '" type="button" data-pick="' + c.id + '|all">' + esc(c.label) + '</button>';
      return '<div class="dd"><button class="fbtn' + (on ? " on" : "") + '" type="button" data-dd aria-expanded="false" aria-haspopup="true">' + esc(c.label) + ICON.chev + '</button><div class="ddm" hidden><button type="button" data-pick="' + c.id + '|all" aria-current="' + (on && shopSub === "all") + '">Tout voir</button>' + subs.map(function(s){ return '<button type="button" data-pick="' + c.id + '|' + s.id + '" aria-current="' + (on && shopSub === s.id) + '">' + esc(s.label) + '</button>'; }).join("") + '</div></div>';
    }).join("") +
    (hasNews() ? '<button class="fbtn" type="button" data-pick="nouveautes|all" aria-pressed="' + (shopCat === "nouveautes") + '">Nouveautés</button>' : '') +
    (hasPromos() ? '<button class="fbtn" type="button" data-pick="promos|all" aria-pressed="' + (shopCat === "promos") + '">Promotions</button>' : '');
  return '<section class="shop-h g"><div class="w"><h1>' + esc(S.shopTitle || "La boutique") + '</h1><p>' + esc(S.shopSub || "") + '</p></div></section>' +
    '<div class="g"><div class="w tools"><div class="filters">' + f + '</div><input class="field search" id="q" type="search" placeholder="Ton téléphone, ex. iPhone 13" aria-label="Chercher par modèle de téléphone ou nom" value="' + esc(shopQ) + '"><p class="active-f" id="activef">' + activeLabel() + '</p></div></div>' +
    '<section class="g"><div class="w grid" id="grid">' + shopGrid() + '</div></section>';
}
function activeLabel(){
  if (shopCat === "all") return "";
  var l = shopCat === "nouveautes" ? "Nouveautés" : shopCat === "promos" ? "Promotions" : catLabel(shopCat);
  var s = shopSub !== "all" ? " · " + subLabel(shopCat, shopSub) : "";
  return 'Filtre : <b>' + esc(l + s) + '</b>';
}
function shopGrid(){
  var list = visible().filter(function(i){
    if (shopCat === "promos"){ if (!hasPromo(i)) return false; }
    else if (shopCat === "nouveautes"){ if (!i.is_new) return false; }
    else if (shopCat !== "all" && i.cat !== shopCat) return false;
    if (shopSub !== "all" && i.sub !== shopSub) return false;
    if (shopQ){ var h = (i.name + " " + i.model + " " + catLabel(i.cat) + " " + subLabel(i.cat, i.sub)).toLowerCase(); return shopQ.toLowerCase().split(/\s+/).every(function(w){ return h.indexOf(w) >= 0; }); }
    return true;
  });
  list.sort(function(a, b){ return (isOut(a) ? 1 : 0) - (isOut(b) ? 1 : 0) || (hasPromo(b) ? 1 : 0) - (hasPromo(a) ? 1 : 0) || (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0) || b.n - a.n; });
  return list.length ? list.map(card).join("") : '<p class="empty">Rien pour ce choix en ce moment. Écris-moi sur WhatsApp : je peux peut-être le faire venir.</p>';
}
function bind(){
  var v = $("view");
  v.onclick = function(e){
    var a = e.target.closest("[data-add]");
    if (a){ e.preventDefault(); e.stopPropagation(); addToCart(+a.dataset.add); refreshAdds(); return; }
    var dd = e.target.closest("[data-dd]");
    if (dd){ var m = dd.nextElementSibling, open = m.hidden; closeDD(m); m.hidden = !open; dd.setAttribute("aria-expanded", open ? "true" : "false"); return; }
    var pk = e.target.closest("[data-pick]");
    if (pk){ var p = pk.dataset.pick.split("|"); shopCat = p[0]; shopSub = p[1]; closeDD(); var h = shopCat === "all" ? "#boutique" : shopCat === "nouveautes" ? "#nouveautes" : shopCat === "promos" ? "#promos" : "#boutique-" + shopCat + (shopSub !== "all" ? "--" + shopSub : ""); history.replaceState(null, "", h); NAV = shopCat === "nouveautes" ? "nouveautes" : "boutique"; render(); return; }
    var rm = e.target.closest("[data-rm]");
    if (rm){ delete CART[rm.dataset.rm]; saveCart(); v.innerHTML = viewCart(); bind(); return; }
    var qb = e.target.closest("[data-q]");
    if (qb){ var n = qb.dataset.n, i = item(+n), d = +qb.dataset.q, nq = (CART[n] || 0) + d; if (d > 0 && (CART[n] || 0) >= i.stock){ toast("Il n’y a que " + i.stock + " pièce" + (i.stock > 1 ? "s" : "") + " de cet article."); return; } if (nq <= 0) delete CART[n]; else CART[n] = Math.min(i.stock, nq); saveCart(); v.innerHTML = viewCart(); bind(); return; }
  };
  if (ROUTE === "boutique") $("q").oninput = function(e){ shopQ = e.target.value.trim(); $("grid").innerHTML = shopGrid(); };
  if (ROUTE === "panier") bindCart();
}

/* ---------- Fiche article ---------- */
function siteBase(){ return (S.siteUrl || (location.origin + location.pathname)).replace(/#.*$/, ""); }
function artLink(i){ return /^https?:/.test(siteBase()) ? siteBase() + "#article-" + i.n : ""; }
function openSheet(n){
  var i = item(n), d = $("sheet");
  if (!i || i.status === "cache"){ if (d.open) d.close(); return; }
  var out = isOut(i), res = i.status === "reserve", q = 1;
  var similar = avail().filter(function(x){ return x.n !== i.n && x.cat === i.cat && (x.sub === i.sub || !i.sub); }).slice(0, 4);
  d.innerHTML = '<div style="position:relative"><button class="x" type="button" id="xclose" aria-label="Fermer">×</button><div class="sheet-in">' +
    '<div class="big"><img alt="' + esc(i.name) + '" src="' + esc(img(i)) + '"></div>' +
    '<div class="info"><span class="md">' + esc([catLabel(i.cat), subLabel(i.cat, i.sub), i.model || "Universel"].filter(Boolean).join(" · ")) + '</span><h2>' + esc(i.name) + '</h2>' + priceHtml(i) +
    (isPhoneModel(i) ? '<p class="fit"><b>Pour ' + esc(i.model) + '</b><span>Sur la photo du fournisseur, la coque peut être montrée sur un autre téléphone : celle que tu reçois est faite pour ce modèle.</span></p>' : '') +
    (i.descr ? '<p style="margin:0;color:var(--douce);font-weight:600">' + esc(i.descr) + '</p>' : '') +
    '<p class="hint">' + (out ? "Cet article est parti. Écris-moi : je peux peut-être en refaire venir." : res ? "Cet article est réservé pour le moment. Écris-moi pour être prévenu(e) s’il se libère." : (i.stock === 1 ? "Pièce unique." : i.stock + " pièces disponibles.")) + '</p>' +
    (out || res ? '<a class="btn btn-wa" target="_blank" rel="noopener" href="' + waUrl("Bonjour R-Case,\n\nL’article *" + i.name + "* (" + (i.model || "Universel") + ", réf. " + i.n + ") sera-t-il de nouveau disponible ?\n\nMerci de me prévenir.") + '">' + WA + 'Me prévenir sur WhatsApp</a>' :
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' + (i.stock > 1 ? '<span class="qty"><button type="button" id="qm" aria-label="Moins">−</button><span id="qv">1</span><button type="button" id="qp" aria-label="Plus">+</button></span>' : '') +
      '<button class="btn btn-b" type="button" id="sadd">Ajouter au panier</button></div>' +
      '<a class="btn btn-wa" id="sres" target="_blank" rel="noopener" href="#">' + WA + 'Réserver tout de suite</a>') +
    (similar.length ? '<div><p class="hint" style="margin-bottom:8px">Dans le même style</p><div style="display:flex;gap:10px;flex-wrap:wrap">' + similar.map(function(x){ return '<a href="#article-' + x.n + '" style="width:68px;flex:none" aria-label="' + esc(x.name) + '"><img alt="" src="' + esc(img(x)) + '" style="width:68px;height:90px;object-fit:cover;border-radius:12px;display:block"></a>'; }).join("") + '</div></div>' : '') +
    '</div></div></div>';
  var code = newCode();
  function resLink(){ var l = $("sres"); if (l) l.href = waUrl(orderMessage([{i:i, q:q}], {code:code, mode:"reserve"})); }
  resLink();
  if ($("sres")) $("sres").addEventListener("click", function(){ R.recordOrder({ref:code, mode:"reserve", items:[{n:i.n, qty:q}]}); code = newCode(); setTimeout(resLink, 300); });
  if ($("qm")){ $("qm").onclick = function(){ q = Math.max(1, q - 1); $("qv").textContent = q; resLink(); }; $("qp").onclick = function(){ if (q >= i.stock){ toast("Il n’y a que " + i.stock + " pièces de cet article."); return; } q = q + 1; $("qv").textContent = q; $("qp").classList.toggle("max", q >= i.stock); resLink(); }; }
  if ($("sadd")) $("sadd").onclick = function(){ if (addToCart(i.n, q)) closeSheet(); };
  $("xclose").onclick = closeSheet;
  if (!d.open) d.showModal();
}
function closeSheet(){ var d = $("sheet"); if (d.open) d.close(); }
$("sheet").addEventListener("close", function(){ if (/^#article-/.test(location.hash)) history.replaceState(null, "", "#" + (NAV === "nouveautes" ? "nouveautes" : ROUTE)); });
$("sheet").addEventListener("click", function(e){ if (e.target === $("sheet")) closeSheet(); });

/* ---------- Panier et message WhatsApp ---------- */
function newCode(){ var d = new Date(), a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = ""; for (var k = 0; k < 3; k++) s += a[Math.floor(Math.random() * a.length)]; return "RC-" + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-" + s; }
function orderMessage(lines, o){
  var total = lines.reduce(function(s, l){ return s + priceOf(l.i) * l.q; }, 0);
  var res = o.mode === "reserve";
  var t = "Bonjour R-Case,\n\n" + (res ? "Je souhaite réserver" : "Je souhaite commander") + (lines.length > 1 ? " les articles suivants :" : " l’article suivant :") + "\n\n";
  lines.forEach(function(l, k){
    t += "*" + (k + 1) + ". " + l.i.name + "*\n" + (l.i.model || "Universel") + "  ·  Qté : " + l.q + "  ·  " + fcfa(priceOf(l.i) * l.q) + (hasPromo(l.i) ? " (prix promo)" : "") + "\nRéf. article " + l.i.n + "\n\n";
  });
  t += "*Total : " + fcfa(total) + "*\n\n";
  if (o.name) t += "*Nom :* " + o.name + "\n";
  if (o.place) t += "*Lieu :* " + o.place + "\n";
  if (o.remise) t += "*Remise :* " + o.remise + "\n";
  t += "*Paiement :* " + (res ? "à la remise" : "maintenant") + "\n";
  if (o.note) t += "*Note :* " + o.note + "\n";
  return t + "\nRéférence : " + o.code + "\n\nMerci de me confirmer la disponibilité.";
}
var CHECK = {name:"", place:"", mode:"reserve", remise:"En main propre", note:""};
try { var ck = JSON.parse(localStorage.getItem("rcase-check") || "null"); if (ck) CHECK = Object.assign(CHECK, ck); } catch(e){}
var LAST = null;
function viewCart(){
  var lines = cartLines();
  if (!lines.length) return '<section class="g"><div class="w cart" style="grid-template-columns:1fr"><div class="panel" style="text-align:center;padding:40px 20px"><h2>Ton panier est vide</h2>' + (LAST ? '<div class="done-box" style="margin:14px auto;max-width:520px">Ta commande <b>' + esc(LAST) + '</b> est prête dans WhatsApp. Si le message ne s’est pas ouvert, écris au ' + esc(S.phoneDisplay || "") + ' en donnant ce numéro.</div>' : '<p class="hint" style="font-size:16px;margin-bottom:16px">Ajoute des articles avec le bouton + sous chaque photo.</p>') + '<a class="btn btn-b" href="#boutique">Aller à la boutique</a></div></div></section>';
  var total = lines.reduce(function(s, l){ return s + priceOf(l.i) * l.q; }, 0);
  return '<section class="g"><div class="w cart"><div class="panel"><h2>Mon panier</h2>' + lines.map(function(l){
      return '<div class="line"><a href="#article-' + l.i.n + '"><img alt="' + esc(l.i.name) + '" src="' + esc(img(l.i)) + '"></a><div style="min-width:0"><div class="nm">' + esc(l.i.name) + '</div><div class="md">' + esc(l.i.model || "Universel") + ' · ' + fcfa(priceOf(l.i)) + '</div>' +
      '<div style="display:flex;gap:12px;align-items:center;margin-top:8px;flex-wrap:wrap">' + (l.i.stock <= 1 ? '<span class="uniq">Pièce unique</span>' : '<span class="qty"><button type="button" data-q="-1" data-n="' + l.i.n + '" aria-label="Moins">−</button><span>' + l.q + '</span><button type="button" data-q="1" data-n="' + l.i.n + '" aria-label="Plus"' + (l.q >= l.i.stock ? ' aria-disabled="true" class="max"' : '') + '>+</button></span>' + (l.q >= l.i.stock ? '<span class="uniq">Max ' + l.i.stock + ' en stock</span>' : '')) + '<button class="rm" type="button" data-rm="' + l.i.n + '">Retirer</button></div></div>' +
      '<span class="price">' + fcfa(priceOf(l.i) * l.q) + '</span></div>';
    }).join("") + '<div class="sum"><span style="font-weight:800">Total</span><b>' + fcfa(total) + '</b></div></div>' +
    '<div class="panel"><h2>Finaliser</h2><form class="form" id="checkout" novalidate>' +
      '<label for="c-name">Ton prénom<input id="c-name" autocomplete="given-name" required value="' + esc(CHECK.name) + '"></label>' +
      '<label for="c-place">Lieu de livraison à ' + esc(S.city || "Douala") + '<input id="c-place" placeholder="Ex. Campus, Akwa, Bonamoussadi…" value="' + esc(CHECK.place) + '"></label>' +
      '<div role="radiogroup" aria-label="Paiement" style="display:flex;flex-direction:column;gap:8px">' +
        '<label class="opt"><input type="radio" name="mode" value="reserve"' + (CHECK.mode === "reserve" ? " checked" : "") + '><span><b>Je réserve</b><small>Je paie à la livraison.</small></span></label>' +
        '<label class="opt"><input type="radio" name="mode" value="commande"' + (CHECK.mode === "commande" ? " checked" : "") + '><span><b>Je commande et je paie maintenant</b><small>On fixe le moyen de paiement sur WhatsApp.</small></span></label>' +
      '</div>' +
      '<label for="c-remise">Livraison<select id="c-remise"><option' + (CHECK.remise === "En main propre" ? " selected" : "") + '>En main propre</option><option' + (CHECK.remise === "Livraison à domicile" ? " selected" : "") + '>Livraison à domicile</option></select></label>' +
      '<label for="c-note">Un détail à ajouter ? (facultatif)<textarea id="c-note" rows="2">' + esc(CHECK.note) + '</textarea></label>' +
      '<p class="hint" id="c-err" hidden style="color:var(--alerte)">Indique ton prénom pour que je sache qui commande.</p>' +
      '<a class="btn btn-wa" id="c-send" href="#" target="_blank" rel="noopener">' + WA + 'Envoyer ma commande · ' + fcfa(total) + '</a>' +
      '<p class="hint">Ton panier s’ouvre tout prêt dans WhatsApp, avec le lien de chaque article. Il ne te reste qu’à appuyer sur Envoyer.</p>' +
    '</form></div></div></section>';
}
function bindCart(){
  var f = $("checkout"); if (!f) return;
  var code = newCode();
  function read(){ CHECK.name = $("c-name").value.trim(); CHECK.place = $("c-place").value.trim(); CHECK.mode = (f.querySelector("input[name=mode]:checked") || {}).value || "reserve"; CHECK.remise = $("c-remise").value; CHECK.note = $("c-note").value.trim(); try { localStorage.setItem("rcase-check", JSON.stringify({name:CHECK.name, place:CHECK.place, remise:CHECK.remise})); } catch(e){} }
  function link(){ read(); $("c-send").href = waUrl(orderMessage(cartLines(), {code:code, name:CHECK.name, place:CHECK.place, mode:CHECK.mode, remise:CHECK.remise, note:CHECK.note})); }
  f.addEventListener("input", link); f.addEventListener("change", link); link();
  f.addEventListener("submit", function(e){ e.preventDefault(); });
  $("c-send").addEventListener("click", function(e){
    read();
    if (!CHECK.name){ e.preventDefault(); $("c-err").hidden = false; $("c-name").focus(); return; }
    link(); LAST = code;
    R.recordOrder({ref:code, name:CHECK.name, place:CHECK.place, remise:CHECK.remise, mode:CHECK.mode, note:CHECK.note, items:cartLines().map(function(l){ return {n:l.i.n, qty:l.q}; })});
    setTimeout(function(){ CART = {}; saveCart(); if (ROUTE === "panier"){ $("view").innerHTML = viewCart(); bind(); } }, 400);
  });
}

/* ---------- Pied de page ---------- */
function renderFoot(){
  $("foot").innerHTML = '<div class="w g">' +
    '<div class="foot-hero"><div><h2>' + stars(S.footerTitle) + '</h2><p>' + esc(S.footerText || "") + '</p></div>' +
    '<div class="foot-cta"><small>Une envie, une question ?</small><span class="tel">' + esc(S.phoneDisplay || "") + '</span><a class="btn btn-wa" href="' + waUrl("Bonjour R-Case,\n\n") + '" target="_blank" rel="noopener">' + WA + 'Écris-moi sur WhatsApp</a></div></div>' +
    '<div class="foot-cols">' +
      '<div><a class="brand" href="#accueil" aria-label="R-Case"><span class="tile"><b>R</b></span><span class="brand-t"><b>R-CASE</b><small>Accessoires téléphone</small></span></a><p>' + esc(S.footerTag || "") + '</p><span class="loc">' + ICON.pin + esc(S.city || "Douala") + '</span></div>' +
      '<div><h3>Boutique</h3><ul>' + liveCats().map(function(c){ return '<li><a href="#boutique-' + c.id + '">' + esc(c.label) + '</a></li>'; }).join("") + '</ul></div>' +
      '<div><h3>À voir</h3><ul>' + (hasNews() ? '<li><a href="#nouveautes">Nouveautés</a></li>' : '') + (hasPromos() ? '<li><a href="#promos">Promotions</a></li>' : '') + '<li><a href="#boutique">Toute la boutique</a></li><li><a href="#panier">Mon panier</a></li></ul></div>' +
    '</div><div class="foot-bot"><span>© ' + new Date().getFullYear() + ' R-Case · ' + esc(S.city || "Douala") + '</span><span>Choisi avec soin, pièce par pièce</span></div></div>';
}

/* ---------- Démarrage ---------- */
$("wafabico").innerHTML = WA;
var fontsReady = (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(function(r){ setTimeout(r, 1600); })]) : Promise.resolve());
Promise.all([R.loadCatalogue(), fontsReady]).then(function(all){ var d = all[0];
  S = d.settings || {};
  CATS = (d.categories || []).map(function(c){ return {id:c.id, label:c.label, main:c.main !== false, position:c.position || 0, subs:(d.subcategories || []).filter(function(s){ return s.cat_id === c.id; }).sort(function(a, b){ return a.position - b.position; })}; }).sort(function(a, b){ return a.position - b.position; });
  ITEMS = (d.products || []).map(function(p){ p.n = +p.n; return p; });
  go();
}).catch(function(){
  $("view").innerHTML = '<section class="g"><div class="w"><p class="loading">Le catalogue n’a pas pu se charger. Vérifie ta connexion et recharge la page.</p></div></section>';
});
})();
