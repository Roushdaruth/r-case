/* R-Case : espace propriétaire (connexion Supabase, réservé à la gérante) */
(function(){
"use strict";
var R = window.RCASE, C = window.RCASE_CONFIG || {}, esc = R.esc, fcfa = R.fcfa, hasPromo = R.hasPromo, priceOf = R.priceOf;
var $ = function(id){ return document.getElementById(id); };
var V = $("view");
var sb = null;
var D = {settings:{}, cats:[], subs:[], products:[], costs:{}, orders:[], expenses:[]};
var TAB = "ven";
try { TAB = sessionStorage.getItem("rcase-tab") || "ven"; } catch(e){}
var STATUSES = [["nouvelle","Nouvelle"],["confirmee","Confirmée"],["livree","Livrée"],["annulee","Annulée"]];
var PAYS = [["a_encaisser","À encaisser"],["paye","Payé"]];

function toast(t, ms){ var el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function(){ el.hidden = true; }, ms || 2600); }
var pending = 0;
function busy(p){
  pending++; $("saving").hidden = false; $("saving").textContent = "Enregistrement…";
  return Promise.resolve(p).then(function(r){
    if (r && r.error) throw r.error;
    pending--; if (!pending){ $("saving").textContent = "Enregistré"; setTimeout(function(){ if (!pending) $("saving").hidden = true; }, 1400); }
    return r;
  }).catch(function(err){
    pending--; $("saving").hidden = true;
    toast("Pas enregistré : " + ((err && err.message) || "vérifie ta connexion internet") + ".", 5000);
    throw err;
  });
}

/* ---------- Connexion ---------- */
function screenNoConfig(){
  V.innerHTML = '<section class="own g"><div class="w"><div class="panel lock"><h1 style="font-size:28px">Espace propriétaire</h1><p class="hint" style="font-size:15px;margin-top:10px">Le site n’est pas encore relié à ta base Supabase. Suis le guide de mise en ligne (fichier LISEZ-MOI), puis colle tes deux clés dans <b>assets/js/config.js</b>.</p><p style="margin-top:16px"><a class="btn btn-o btn-s" href="index.html">Retour à la boutique</a></p></div></div></section>';
}
function screenLogin(msg){
  V.innerHTML = '<section class="own g"><div class="w"><div class="panel lock"><h1 style="font-size:28px">Espace propriétaire</h1><p class="hint" style="font-size:15px;margin:10px 0 16px">Connecte-toi avec l’email et le mot de passe de ton compte gérante.</p>' +
    '<form class="form" id="login"><label for="em">Email<input id="em" type="email" autocomplete="username" required></label><label for="pw">Mot de passe<input id="pw" type="password" autocomplete="current-password" required></label>' +
    '<p class="hint" id="lerr" style="color:var(--alerte)"' + (msg ? '' : ' hidden') + '>' + esc(msg || "") + '</p><button class="btn btn-b" type="submit">Se connecter</button></form>' +
    '<p style="margin-top:14px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><button class="linkbtn" type="button" id="forgot" style="color:var(--bordeaux)">Mot de passe oublié ?</button><a class="hint" href="index.html">Retour à la boutique</a></p></div></div></section>';
  $("login").onsubmit = function(e){
    e.preventDefault(); var b = e.target.querySelector("button"); b.disabled = true; b.textContent = "Connexion…";
    sb.auth.signInWithPassword({email:$("em").value.trim(), password:$("pw").value}).then(function(r){
      if (r.error){ screenLogin("Email ou mot de passe incorrect."); return; }
      enter();
    });
  };
  $("forgot").onclick = function(){
    var em = $("em").value.trim(); if (!em){ $("lerr").hidden = false; $("lerr").textContent = "Écris d’abord ton email au-dessus."; return; }
    sb.auth.resetPasswordForEmail(em, {redirectTo: location.origin + location.pathname}).then(function(){ $("lerr").hidden = false; $("lerr").style.color = "var(--ok)"; $("lerr").textContent = "Si ce compte existe, un email pour changer le mot de passe vient d’être envoyé."; });
  };
}
function screenNewPassword(){
  V.innerHTML = '<section class="own g"><div class="w"><div class="panel lock"><h1 style="font-size:28px">Nouveau mot de passe</h1><form class="form" id="np" style="margin-top:14px"><label for="np1">Nouveau mot de passe (8 caractères minimum)<input id="np1" type="password" autocomplete="new-password" minlength="8" required></label><p class="hint" id="nperr" hidden style="color:var(--alerte)"></p><button class="btn btn-b" type="submit">Enregistrer</button></form></div></div></section>';
  $("np").onsubmit = function(e){
    e.preventDefault(); var p = $("np1").value;
    if (p.length < 8){ $("nperr").hidden = false; $("nperr").textContent = "8 caractères minimum."; return; }
    sb.auth.updateUser({password:p}).then(function(r){ if (r.error){ $("nperr").hidden = false; $("nperr").textContent = r.error.message; return; } toast("Mot de passe changé."); enter(); });
  };
}
function enter(){
  V.innerHTML = '<section class="own g"><div class="w"><p class="hint" style="text-align:center;padding:60px 0">Chargement de tes données…</p></div></section>';
  sb.rpc("is_admin").then(function(r){
    if (r.error || r.data !== true){ sb.auth.signOut(); screenLogin("Ce compte n’a pas accès à l’espace propriétaire."); return; }
    return loadAll().then(renderOwner);
  }).catch(function(){ screenLogin("Connexion impossible. Vérifie ta connexion internet."); });
}
function q(p){ return Promise.resolve(p).then(function(r){ if (r.error) throw r.error; return r.data; }); }
function loadAll(){
  return Promise.all([
    q(sb.from("settings").select("*")),
    q(sb.from("categories").select("*").order("position")),
    q(sb.from("subcategories").select("*").order("position")),
    q(sb.from("products").select("*").order("n")),
    q(sb.from("product_costs").select("*")),
    q(sb.from("orders").select("*, order_items(*)").order("created_at", {ascending:false})),
    q(sb.from("expenses").select("*").order("date", {ascending:false}))
  ]).then(function(r){
    D.settings = (r[0][0] || {}).data || {};
    D.cats = r[1]; D.subs = r[2]; D.products = r[3];
    D.costs = {}; r[4].forEach(function(c){ D.costs[c.n] = c.cost; });
    D.orders = r[5].map(function(o){ o.items = (o.order_items || []).sort(function(a, b){ return a.id - b.id; }); delete o.order_items; return o; });
    D.expenses = r[6];
  });
}

/* ---------- Outils ---------- */
function prod(n){ return D.products.find(function(p){ return p.n === n; }); }
function catLabel(id){ var c = D.cats.find(function(x){ return x.id === id; }); return c ? c.label : "—"; }
function subsOf(ci){ return D.subs.filter(function(s){ return s.cat_id === ci; }); }
function costOf(n){ return typeof D.costs[n] === "number" ? D.costs[n] : 0; }
function oTotal(o){ return o.items.reduce(function(s, l){ return s + l.price * l.qty; }, 0); }
function sold(o){ return o.pay === "paye" && o.status !== "annulee"; }
function confirmInline(btn, msg){
  if (btn.dataset.armed === "1"){ btn.dataset.armed = ""; return true; }
  var old = btn.textContent; btn.dataset.armed = "1"; btn.textContent = msg; setTimeout(function(){ if (btn.dataset.armed === "1"){ btn.dataset.armed = ""; btn.textContent = old; } }, 3500);
  return false;
}
function slug(l){ return l.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || ("x" + Date.now()); }

/* ---------- Coque de la page ---------- */
function renderOwner(){
  var todo = D.orders.filter(function(o){ return o.status === "nouvelle" || o.status === "confirmee"; }).length;
  V.innerHTML = '<section class="own g"><div class="w"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><h1>Espace propriétaire</h1><span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-o btn-s" type="button" id="refresh">Actualiser</button><a class="btn btn-o btn-s" href="index.html" target="_blank" rel="noopener">Voir la boutique</a><button class="btn btn-o btn-s" type="button" id="logout">Se déconnecter</button></span></div>' +
    '<div class="tabs" role="tablist">' + [["ven","Ventes"],["cmd","Commandes" + (todo ? " (" + todo + ")" : "")],["bord","Revenus et bénéfices"],["art","Articles et promos"],["dep","Dépenses"],["reg","Réglages"]].map(function(t){ return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (TAB === t[0]) + '">' + t[1] + '</button>'; }).join("") + '</div><div id="pane"></div></div></section>';
  V.querySelector(".tabs").onclick = function(e){ var b = e.target.closest("[data-tab]"); if (b){ TAB = b.dataset.tab; try { sessionStorage.setItem("rcase-tab", TAB); } catch(x){} renderOwner(); } };
  $("logout").onclick = function(){ sb.auth.signOut().then(function(){ screenLogin(); }); };
  $("refresh").onclick = function(){ loadAll().then(function(){ renderOwner(); toast("Données à jour."); }); };
  var p = $("pane");
  if (TAB === "bord"){ p.innerHTML = paneDash(); bindSim(); }
  else if (TAB === "art") paneItems(p);
  else if (TAB === "dep") paneExp(p);
  else if (TAB === "reg") paneSettings(p);
  else if (TAB === "ven") paneSales(p);
  else paneOrders(p);
}

/* ---------- Revenus ---------- */
function stats(){
  var byM = {};
  function M(k){ return byM[k] || (byM[k] = {k:k, orders:0, pieces:0, ca:0, cogs:0, exp:0, pending:0, toCash:0}); }
  D.orders.forEach(function(o){
    var m = M(o.created_at.slice(0, 7));
    if (sold(o)){ m.orders++; o.items.forEach(function(l){ m.pieces += l.qty; m.ca += l.price * l.qty; m.cogs += (typeof l.cost === "number" ? l.cost : costOf(l.n)) * l.qty; }); }
    else if (o.status !== "annulee"){ m.pending++; m.toCash += oTotal(o); }
  });
  D.expenses.forEach(function(x){ M(String(x.date).slice(0, 7)).exp += x.amount; });
  var months = Object.keys(byM).sort().reverse().map(function(k){ var m = byM[k]; m.profit = m.ca - m.cogs - m.exp; return m; });
  var T = months.reduce(function(t, m){ ["ca","cogs","exp","orders","pieces","pending","toCash"].forEach(function(f){ t[f] += m[f]; }); return t; }, {ca:0, cogs:0, exp:0, orders:0, pieces:0, pending:0, toCash:0});
  T.profit = T.ca - T.cogs - T.exp;
  T.stockPieces = D.products.reduce(function(s, i){ return s + Math.max(0, i.stock); }, 0);
  T.stockSale = D.products.reduce(function(s, i){ return s + Math.max(0, i.stock) * priceOf(i); }, 0);
  T.stockCost = D.products.reduce(function(s, i){ return s + Math.max(0, i.stock) * costOf(i.n); }, 0);
  T.invest = T.stockCost + T.cogs;
  var top = {}; D.orders.forEach(function(o){ if (sold(o)) o.items.forEach(function(l){ top[l.name] = (top[l.name] || 0) + l.qty; }); });
  T.top = Object.keys(top).map(function(k){ return {name:k, q:top[k]}; }).sort(function(a, b){ return b.q - a.q; }).slice(0, 5);
  return {months:months, T:T};
}
function monthLabel(k){ var p = k.split("-"); var s = new Date(+p[0], +p[1] - 1, 1).toLocaleDateString("fr-FR", {month:"long", year:"numeric"}); return s.charAt(0).toUpperCase() + s.slice(1); }
function isTransport(x){ return /^\s*(transport|douane|fret)|shein/i.test(x.label || ""); }
function bilan(){
  var B = {pieces:0, achat:0, vente:0, missing:0};
  D.products.forEach(function(i){ var k = Math.max(0, i.stock); if (!k) return; B.pieces += k; B.achat += k * costOf(i.n); B.vente += k * priceOf(i); if (!costOf(i.n)) B.missing++; });
  D.orders.forEach(function(o){ if (!o.stock_applied || o.status === "annulee") return; o.items.forEach(function(l){ B.pieces += l.qty; B.achat += (typeof l.cost === "number" ? l.cost : costOf(l.n)) * l.qty; B.vente += l.price * l.qty; }); });
  B.transport = D.expenses.filter(isTransport).reduce(function(t, x){ return t + x.amount; }, 0);
  B.autres = D.expenses.filter(function(x){ return !isTransport(x); }).reduce(function(t, x){ return t + x.amount; }, 0);
  B.cout = B.achat + B.transport;
  B.brut = B.vente - B.cout;
  B.net = B.brut - B.autres;
  B.parPiece = B.pieces ? B.transport / B.pieces : 0;
  return B;
}
function pct(a, b){ return b ? Math.round(a / b * 100) + " %" : "—"; }
function bilanHtml(T){
  var B = bilan(), enc = T.ca, prog = B.vente ? Math.min(100, Math.round(enc / B.vente * 100)) : 0;
  return '<div class="panel bilan"><h2 style="font-size:22px;color:var(--profond);margin:0 0 4px">Bilan de ta marchandise</h2>' +
    '<p class="hint" style="margin:0 0 14px">Toutes les pièces achetées (en stock + déjà vendues ou réservées). Le transport vient des dépenses de type « Transport ».</p>' +
    '<div class="bl"><span>Coût total de la marchandise achetée</span><b>' + fcfa(B.achat) + '</b></div>' +
    '<div class="bl"><span>Transport (SHEIN, douane, livraison fournisseur)</span><b>' + fcfa(B.transport) + '</b></div>' +
    '<div class="bl sub"><span>Coût de revient total</span><b>' + fcfa(B.cout) + '</b></div>' +
    '<div class="bl"><span>Ce que ça fait quand tout est vendu</span><b>' + fcfa(B.vente) + '</b></div>' +
    '<div class="bl big ' + (B.brut >= 0 ? "good" : "bad") + '"><span>Bénéfice prévu</span><b>' + fcfa(B.brut) + '<small> · marge ' + pct(B.brut, B.vente) + '</small></b></div>' +
    (B.autres ? '<div class="bl"><span>Autres dépenses (emballage, pub…)</span><b>− ' + fcfa(B.autres) + '</b></div><div class="bl sub ' + (B.net >= 0 ? "good" : "bad") + '"><span>Bénéfice net prévu</span><b>' + fcfa(B.net) + '</b></div>' : '') +
    '<div class="bl"><span>Pièces achetées · transport par pièce</span><b>' + B.pieces + ' · ' + fcfa(Math.round(B.parPiece)) + '</b></div>' +
    '<div style="margin-top:14px"><div style="display:flex;justify-content:space-between;font-weight:700;font-size:14px"><span>Déjà encaissé : ' + fcfa(enc) + '</span><span>' + prog + ' %</span></div><div class="bar" style="height:10px;margin-top:6px"><i style="width:' + prog + '%"></i></div></div>' +
    (B.missing ? '<p class="hint" style="margin-top:12px;color:var(--alerte)">' + B.missing + ' article(s) en stock n’ont pas de prix d’achat : complète-les dans l’onglet Articles pour un calcul exact.</p>' : '') +
    (B.transport ? '' : '<p class="hint" style="margin-top:12px">Ajoute le prix du transport dans l’onglet Dépenses en choisissant le type « Transport ».</p>') +
  '</div>' +
  '<div class="panel bilan"><h2 style="font-size:19px;color:var(--profond);margin:0 0 4px">Simuler un nouvel arrivage</h2><p class="hint" style="margin:0 0 12px">Avant de commander : entre les montants, le bénéfice se calcule tout seul. Rien n’est enregistré.</p>' +
    '<div class="ifields"><label for="sim-a">Coût de la marchandise (F)<input id="sim-a" type="number" min="0" step="500" inputmode="numeric"></label><label for="sim-t">Transport (F)<input id="sim-t" type="number" min="0" step="500" inputmode="numeric"></label><label for="sim-v">Total prévu à la vente (F)<input id="sim-v" type="number" min="0" step="500" inputmode="numeric"></label><label for="sim-n">Nombre de pièces<input id="sim-n" type="number" min="0" step="1" inputmode="numeric"></label></div>' +
    '<div id="sim-r" style="margin-top:12px"></div></div>';
}
function bindSim(){
  var ids = ["sim-a","sim-t","sim-v","sim-n"]; if (!$("sim-a")) return;
  function go(){ var a = +$("sim-a").value || 0, t = +$("sim-t").value || 0, v = +$("sim-v").value || 0, n = +$("sim-n").value || 0, c = a + t, b = v - c;
    $("sim-r").innerHTML = (a || t || v) ? '<div class="bl sub"><span>Coût de revient</span><b>' + fcfa(c) + '</b></div><div class="bl big ' + (b >= 0 ? "good" : "bad") + '"><span>Bénéfice</span><b>' + fcfa(b) + '<small> · marge ' + pct(b, v) + '</small></b></div>' + (n ? '<div class="bl"><span>Par pièce : coût réel · prix moyen · bénéfice</span><b>' + fcfa(Math.round(c / n)) + ' · ' + fcfa(Math.round(v / n)) + ' · ' + fcfa(Math.round(b / n)) + '</b></div>' : '') : ''; }
  ids.forEach(function(id){ $(id).oninput = go; });
}
function paneDash(){
  var s = stats(), T = s.T, maxCa = Math.max(1, Math.max.apply(null, s.months.map(function(m){ return m.ca; }).concat([0])));
  return bilanHtml(T) + '<h2 style="font-size:22px;color:var(--profond);margin:18px 0 10px">Ventes réalisées</h2><div class="kpis">' +
    '<div class="kpi main"><span>Encaissé</span><b>' + fcfa(T.ca) + '</b><small>' + T.orders + ' commande(s) payée(s)</small></div>' +
    '<div class="kpi ' + (T.profit >= 0 ? "good" : "bad") + '"><span>Bénéfice net</span><b>' + fcfa(T.profit) + '</b><small>' + (T.ca ? "Marge " + Math.round(T.profit / T.ca * 100) + " %" : "Après prix d’achat et dépenses") + '</small></div>' +
    '<div class="kpi"><span>À encaisser</span><b>' + fcfa(T.toCash) + '</b><small>' + T.pending + ' commande(s) en cours</small></div>' +
    '<div class="kpi"><span>Pièces vendues</span><b>' + T.pieces + '</b><small>Restantes : ' + T.stockPieces + '</small></div>' +
    '<div class="kpi"><span>Stock restant</span><b>' + fcfa(T.stockSale) + '</b><small>en prix de vente · ' + fcfa(T.stockCost) + ' en prix d’achat</small></div>' +
    '<div class="kpi"><span>Investi en marchandise</span><b>' + fcfa(T.invest) + '</b><small>Dépenses diverses : ' + fcfa(T.exp) + '</small></div></div>' +
    '<h2 style="font-size:22px;color:var(--profond);margin:8px 0 10px">Mois par mois</h2>' +
    (s.months.length ? '<div class="tw"><table class="t"><thead><tr><th>Mois</th><th class="r">Commandes payées</th><th class="r">Pièces vendues</th><th class="r">Encaissé</th><th class="r">Prix d’achat</th><th class="r">Dépenses</th><th class="r">Bénéfice</th><th class="r">En cours</th></tr></thead><tbody>' +
      s.months.map(function(m){ return '<tr><td><b>' + monthLabel(m.k) + '</b></td><td class="r">' + m.orders + '</td><td class="r">' + m.pieces + '</td><td class="r">' + fcfa(m.ca) + '<div class="bar" aria-hidden="true"><i style="width:' + Math.round(m.ca / maxCa * 100) + '%"></i></div></td><td class="r">' + fcfa(m.cogs) + '</td><td class="r">' + fcfa(m.exp) + '</td><td class="r" style="font-weight:800;color:' + (m.profit >= 0 ? "var(--ok)" : "var(--alerte)") + '">' + fcfa(m.profit) + '</td><td class="r">' + m.pending + '</td></tr>'; }).join("") +
      '</tbody></table></div>' : '<p class="panel hint" style="font-size:15px">Aucune vente pour l’instant. Les commandes passées sur le site arrivent dans l’onglet Commandes : passe leur paiement à « Payé » et les chiffres apparaîtront ici.</p>') +
    (T.top.length ? '<h2 style="font-size:22px;color:var(--profond);margin:22px 0 10px">Les plus vendus</h2><div class="tw"><table class="t" style="min-width:0"><tbody>' + T.top.map(function(t){ return '<tr><td>' + esc(t.name) + '</td><td class="r"><b>' + t.q + '</b> vendu(s)</td></tr>'; }).join("") + '</tbody></table></div>' : '');
}


/* ---------- Ventes (saisie rapide + historique) ---------- */
var SALE = {lines:[], total:null, q:""};
function stockPatch(p){ var patch = {stock:p.stock}; if (p.stock <= 0 && p.status !== "cache"){ p.status = "epuise"; patch.status = "epuise"; } else if (p.stock > 0 && p.status === "epuise"){ p.status = "dispo"; patch.status = "dispo"; } return q(sb.from("products").update(patch).eq("n", p.n)); }
function saleList(){ return D.orders.filter(sold).slice().sort(function(a, b){ return b.created_at.localeCompare(a.created_at); }); }
function listSum(){ return SALE.lines.reduce(function(s, l){ var p = prod(l.n); return s + (p ? priceOf(p) : 0) * l.qty; }, 0); }
function csvSales(){
  var rows = [["Date","N°","Client","Article","Réf.","Modèle","Qté","Prix encaissé (F)","Prix d'achat (F)","Bénéfice (F)","Paiement / note"]];
  saleList().forEach(function(o){ o.items.forEach(function(l){ var c = (typeof l.cost === "number" ? l.cost : costOf(l.n)) * l.qty; rows.push([new Date(o.created_at).toLocaleDateString("fr-FR"), o.num || "", o.client_name, l.name, l.n, l.model, l.qty, l.price * l.qty, c, l.price * l.qty - c, o.note]); }); });
  var csv = "﻿" + rows.map(function(r){ return r.map(function(x){ x = String(x == null ? "" : x); return /[;"\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(";"); }).join("\n");
  var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"})); a.download = "ventes-rcase-" + new Date().toISOString().slice(0, 10) + ".csv"; document.body.appendChild(a); a.click(); a.remove();
}
function paneSales(p){
  var sales = saleList(), mk = new Date().toISOString().slice(0, 7);
  var month = sales.filter(function(o){ return o.created_at.slice(0, 7) === mk; });
  var mCa = month.reduce(function(s, o){ return s + oTotal(o); }, 0), mPieces = month.reduce(function(s, o){ return s + o.items.reduce(function(t, l){ return t + l.qty; }, 0); }, 0);
  var mCost = month.reduce(function(s, o){ return s + o.items.reduce(function(t, l){ return t + (typeof l.cost === "number" ? l.cost : costOf(l.n)) * l.qty; }, 0); }, 0);
  var ql = SALE.q.toLowerCase().split(/\s+/).filter(Boolean);
  var found = SALE.q ? D.products.filter(function(i){ if (i.status === "cache" || i.stock <= 0) return false; var h = (i.name + " " + i.model + " " + i.n + " " + catLabel(i.cat)).toLowerCase(); return ql.every(function(w){ return h.indexOf(w) >= 0; }); }).slice(0, 8) : [];
  var sum = listSum(), tot = SALE.total == null ? sum : SALE.total;
  p.innerHTML = '<div class="kpis"><div class="kpi"><span>Ventes ce mois</span><b>' + month.length + '</b><small>' + mPieces + ' pièce(s)</small></div><div class="kpi"><span>Encaissé ce mois</span><b>' + fcfa(mCa) + '</b></div><div class="kpi main"><span>Bénéfice ce mois</span><b>' + fcfa(mCa - mCost) + '</b><small>avant transport et dépenses</small></div></div>' +
    '<div class="panel" style="margin-bottom:18px"><h2 style="font-size:21px">Enregistrer une vente</h2><p class="hint" style="margin:4px 0 12px">Cherche les articles vendus, ajuste le prix si c’est un pack, puis enregistre. Le stock baisse tout seul et un article à 0 disparaît du site.</p>' +
      '<label for="sq" class="sr">Chercher un article</label><input class="field" id="sq" type="search" placeholder="Tape un nom, un modèle ou un n° (ex. léopard, iPhone 13, 50)" value="' + esc(SALE.q) + '" autocomplete="off">' +
      (found.length ? '<div class="spick">' + found.map(function(i){ return '<button type="button" class="spi" data-sadd="' + i.n + '"><img alt="" src="' + esc(i.img) + '"><span><b>' + esc(i.name) + '</b><small>n°' + i.n + ' · ' + esc(i.model) + ' · ' + fcfa(priceOf(i)) + ' · ' + i.stock + ' en stock</small></span><em>+</em></button>'; }).join("") + '</div>' : (SALE.q ? '<p class="hint" style="margin-top:8px">Aucun article en stock ne correspond.</p>' : '')) +
      (SALE.lines.length ? '<div class="slines">' + SALE.lines.map(function(l, k){ var i = prod(l.n); return '<div class="sline"><img alt="" src="' + esc(i.img) + '"><span><b>' + esc(i.name) + '</b><small>' + esc(i.model) + ' · ' + fcfa(priceOf(i)) + ' l’unité</small></span><span class="qty"><button type="button" data-sq="' + k + '" data-d="-1" aria-label="Moins">−</button><span>' + l.qty + '</span><button type="button" data-sq="' + k + '" data-d="1" aria-label="Plus"' + (l.qty >= i.stock ? ' aria-disabled="true" class="max"' : '') + '>+</button></span><button class="linkbtn" type="button" data-srm="' + k + '">Retirer</button></div>'; }).join("") + '</div>' +
        '<div class="ifields" style="margin-top:14px"><label for="s-tot">Prix total encaissé (F)<input id="s-tot" type="number" min="0" step="500" inputmode="numeric" value="' + tot + '"></label><label for="s-cli">Client<input id="s-cli" placeholder="Ex. Ines" maxlength="80"></label><label for="s-pay">Paiement<select id="s-pay"><option>Espèces</option><option>Mobile Money</option><option>Orange Money</option><option>Autre</option></select></label><label for="s-date">Date<input id="s-date" type="date" value="' + new Date().toISOString().slice(0, 10) + '"></label><label class="wide" for="s-note">Note (facultatif)<input id="s-note" maxlength="300" placeholder="Ex. pack pochette + étui AirPods"></label></div>' +
        '<p class="hint" style="margin-top:8px">Prix affichés : ' + fcfa(sum) + (tot !== sum ? ' · tu encaisses ' + fcfa(tot) + ' (' + (tot < sum ? 'remise de ' + fcfa(sum - tot) : '+' + fcfa(tot - sum)) + ')' : '') + '</p>' +
        '<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-b" type="button" id="ssave">Enregistrer la vente ✓</button><button class="btn btn-o btn-s" type="button" id="sclear">Vider</button></div>' : '') +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px"><h2 style="font-size:21px;margin:0">Historique des ventes (' + sales.length + ')</h2><button class="btn btn-o btn-s" type="button" id="scsv"' + (sales.length ? '' : ' disabled') + '>Télécharger (Excel)</button></div>' +
    (sales.length ? '<div class="tw"><table class="t" style="min-width:860px"><thead><tr><th>Date</th><th>Client</th><th>Articles</th><th class="r">Encaissé</th><th class="r">Bénéfice</th><th>Paiement / note</th><th></th></tr></thead><tbody>' + sales.map(function(o){ var c = o.items.reduce(function(t, l){ return t + (typeof l.cost === "number" ? l.cost : costOf(l.n)) * l.qty; }, 0), tt = oTotal(o); return '<tr><td>' + new Date(o.created_at).toLocaleDateString("fr-FR") + '<br><small class="hint">' + esc(o.num || "") + '</small></td><td>' + esc(o.client_name || "—") + '</td><td>' + o.items.map(function(l){ return esc(l.name) + (l.qty > 1 ? ' ×' + l.qty : '') + ' <small class="hint">(n°' + l.n + ')</small>'; }).join("<br>") + '</td><td class="r"><b>' + fcfa(tt) + '</b></td><td class="r" style="color:' + (tt - c >= 0 ? 'var(--ok)' : 'var(--alerte)') + '">' + fcfa(tt - c) + '</td><td>' + esc(o.note || "") + '</td><td><button class="linkbtn" type="button" data-sundo="' + o.id + '">Annuler</button></td></tr>'; }).join("") + '</tbody></table></div>' : '<p class="panel hint" style="font-size:15px">Aucune vente enregistrée pour l’instant.</p>') +
    '<p class="hint" style="margin-top:12px">« Annuler » remet les pièces en stock et sur le site. Les commandes reçues par le site et marquées Payées apparaissent aussi ici.</p>';
  var sq = $("sq"); sq.oninput = function(e){ SALE.q = e.target.value; var pos = e.target.selectionStart; paneSales(p); var x = $("sq"); x.focus(); try { x.setSelectionRange(pos, pos); } catch(z){} };
  p.querySelectorAll("[data-sadd]").forEach(function(b){ b.onclick = function(){ var n = +b.dataset.sadd, ex = SALE.lines.find(function(l){ return l.n === n; }), i = prod(n); if (ex){ if (ex.qty < i.stock) ex.qty++; } else SALE.lines.push({n:n, qty:1}); SALE.q = ""; SALE.total = null; paneSales(p); }; });
  p.querySelectorAll("[data-sq]").forEach(function(b){ b.onclick = function(){ var l = SALE.lines[+b.dataset.sq], i = prod(l.n), d = +b.dataset.d; if (d > 0 && l.qty >= i.stock){ toast("Il n’y a que " + i.stock + " pièce(s) en stock."); return; } l.qty += d; if (l.qty <= 0) SALE.lines.splice(+b.dataset.sq, 1); SALE.total = null; paneSales(p); }; });
  p.querySelectorAll("[data-srm]").forEach(function(b){ b.onclick = function(){ SALE.lines.splice(+b.dataset.srm, 1); SALE.total = null; paneSales(p); }; });
  if ($("s-tot")) $("s-tot").onchange = function(e){ SALE.total = Math.max(0, Math.round(+e.target.value || 0)); var keep = {cli:$("s-cli").value, pay:$("s-pay").value, date:$("s-date").value, note:$("s-note").value}; paneSales(p); $("s-cli").value = keep.cli; $("s-pay").value = keep.pay; $("s-date").value = keep.date; $("s-note").value = keep.note; };
  if ($("sclear")) $("sclear").onclick = function(){ SALE = {lines:[], total:null, q:""}; paneSales(p); };
  if ($("ssave")) $("ssave").onclick = function(){
    var btn = $("ssave"), sum = listSum(), tot = SALE.total == null ? sum : SALE.total, lines = SALE.lines.slice();
    if (!lines.length) return;
    var dt = $("s-date").value, today = new Date().toISOString().slice(0, 10);
    var created = (dt && dt !== today) ? new Date(dt + "T12:00:00").toISOString() : new Date().toISOString();
    var note = ($("s-pay").value + ($("s-note").value.trim() ? " · " + $("s-note").value.trim() : "")).slice(0, 400);
    // répartir le total encaissé entre les articles, au prorata des prix affichés
    var acc = 0, items = lines.map(function(l, k){ var i = prod(l.n), base = priceOf(i) * l.qty, share = k === lines.length - 1 ? tot - acc : (sum ? Math.round(tot * base / sum) : Math.round(tot / lines.length)); acc += share; return {n:i.n, name:i.name, model:i.model || "", qty:l.qty, price:Math.max(0, Math.round(share / l.qty)), cost:Math.round(costOf(i.n))}; });
    var diff = tot - items.reduce(function(s, x){ return s + x.price * x.qty; }, 0); if (diff && items.length){ var last = items[items.length - 1]; if (last.qty === 1) last.price += diff; }
    btn.disabled = true;
    var row = {client_name:$("s-cli").value.trim().slice(0, 80), note:note, pay:"paye", status:"livree", source:"vente", stock_applied:true, mode:"commande", created_at:created};
    busy(q(sb.from("orders").insert(row).select().single()).then(function(ord){
      return q(sb.from("order_items").insert(items.map(function(x){ x.order_id = ord.id; return x; })).select()).then(function(its){
        ord.items = its; D.orders.unshift(ord);
        return Promise.all(lines.map(function(l){ var i = prod(l.n); i.stock = Math.max(0, i.stock - l.qty); return stockPatch(i); }));
      });
    })).then(function(){ var gone = lines.filter(function(l){ return prod(l.n).stock <= 0; }).length; SALE = {lines:[], total:null, q:""}; paneSales(p); toast("Vente enregistrée." + (gone ? " " + gone + " article(s) retiré(s) du site (plus de stock)." : ""), 4200); })
      .catch(function(err){ btn.disabled = false; toast("L’enregistrement n’a pas marché : " + ((err && err.message) || "réessaie"), 6000); });
  };
  if ($("scsv")) $("scsv").onclick = csvSales;
  p.querySelectorAll("[data-sundo]").forEach(function(b){ b.onclick = function(){
    if (!confirmInline(b, "Confirmer l’annulation")) return;
    var o = D.orders.find(function(x){ return x.id === b.dataset.sundo; });
    busy((o.stock_applied ? applyStock(o, -1) : Promise.resolve()).then(function(){ o.status = "annulee"; o.stock_applied = false; return q(sb.from("orders").update({status:"annulee", stock_applied:false}).eq("id", o.id)); })).then(function(){ paneSales(p); toast("Vente annulée, pièces remises en stock."); });
  }; });
}

/* ---------- Commandes ---------- */
var OF = "actives", OQ = "";
function applyStock(o, sign){
  return Promise.all(o.items.map(function(l){
    var p = prod(l.n); if (!p) return null;
    p.stock = Math.max(0, p.stock - sign * l.qty);
    return stockPatch(p);
  }));
}
function syncStock(o){
  var needs = o.status !== "annulee" && (o.status === "confirmee" || o.status === "livree" || o.pay === "paye");
  var jobs = [];
  if (needs && !o.stock_applied){ jobs.push(applyStock(o, 1)); o.stock_applied = true; jobs.push(q(sb.from("orders").update({stock_applied:true}).eq("id", o.id))); }
  if (!needs && o.stock_applied){ jobs.push(applyStock(o, -1)); o.stock_applied = false; jobs.push(q(sb.from("orders").update({stock_applied:false}).eq("id", o.id))); }
  if (sold(o)) o.items.forEach(function(l){ if (typeof l.cost !== "number"){ l.cost = costOf(l.n); jobs.push(q(sb.from("order_items").update({cost:l.cost}).eq("id", l.id))); } });
  return Promise.all(jobs);
}
function parseWA(txt){
  var o = {ref:"", items:[], name:"", place:"", mode:"reserve", remise:"", note:""};
  var m = txt.match(/RC-\d{4}-[A-Z0-9]{3}/); if (m) o.ref = m[0];
  txt.split(/\n(?=\*\d+\.\s)/).forEach(function(b){
    var r = b.match(/R[ée]f\.?\s*article\s*(\d+)/i) || b.match(/#article-(\d+)/);
    var qq = b.match(/Qt[ée]\s*:\s*(\d+)/i);
    if (r){ var p = prod(+r[1]); if (p) o.items.push({n:p.n, name:p.name, model:p.model, qty:qq ? +qq[1] : 1, price:priceOf(p)}); }
  });
  var g = function(re){ var x = txt.match(re); return x ? x[1].replace(/\*/g, "").trim() : ""; };
  o.name = g(/Nom\s*:\**\s*(.+)/i); o.place = g(/Lieu\s*:\**\s*(.+)/i); o.remise = g(/Remise\s*:\**\s*(.+)/i); o.note = g(/Note\s*:\**\s*(.+)/i);
  if (/Paiement\s*:\**\s*maintenant/i.test(txt)) o.mode = "commande";
  return o;
}
function addOrder(o){
  var row = {ref:o.ref || null, client_name:o.name || "", client_place:o.place || "", remise:o.remise || "", mode:o.mode || "reserve", note:o.note || "", delivery:[o.place, o.remise].filter(Boolean).join(" · "), source:"admin"};
  return busy(q(sb.from("orders").insert(row).select().single()).then(function(ord){
    return q(sb.from("order_items").insert(o.items.map(function(l){ return {order_id:ord.id, n:l.n, name:l.name, model:l.model || "", qty:l.qty, price:l.price}; })).select()).then(function(items){
      ord.items = items; D.orders.unshift(ord); return ord;
    });
  }));
}
function paneOrders(p){
  var all = D.orders.slice().sort(function(a, b){ return b.created_at.localeCompare(a.created_at); });
  var list = all.filter(function(o){
    if (OF === "actives" && !(o.status === "nouvelle" || o.status === "confirmee")) return false;
    if (OF === "encaisser" && !(o.pay === "a_encaisser" && o.status !== "annulee")) return false;
    if (OF === "livree" && o.status !== "livree") return false;
    if (OF === "annulee" && o.status !== "annulee") return false;
    if (OQ){ var h = (o.num + " " + (o.ref || "") + " " + o.client_name + " " + o.delivery + " " + o.items.map(function(l){ return l.name + " " + l.model; }).join(" ")).toLowerCase(); if (!OQ.toLowerCase().split(/\s+/).every(function(w){ return h.indexOf(w) >= 0; })) return false; }
    return true;
  });
  var cash = all.filter(sold).reduce(function(s, o){ return s + oTotal(o); }, 0);
  var toCash = all.filter(function(o){ return o.pay === "a_encaisser" && o.status !== "annulee"; }).reduce(function(s, o){ return s + oTotal(o); }, 0);
  var rows = list.map(function(o){
    var n = o.items.length || 1;
    var cells = function(l, k){
      var it = l && prod(l.n);
      return '<tr class="' + (k === 0 ? "first" : "") + (o.status === "annulee" ? " cancel" : "") + '">' +
        (k === 0 ? '<td rowspan="' + n + '"><span class="num">' + esc(o.num || "") + '</span>' + (o.ref ? '<span class="ref">' + esc(o.ref) + (o.source === "site" ? " · site" : "") + '</span>' : '') + '</td><td rowspan="' + n + '">' + new Date(o.created_at).toLocaleDateString("fr-FR") + '</td><td rowspan="' + n + '"><input aria-label="Client" data-of="client_name" data-o="' + o.id + '" value="' + esc(o.client_name) + '" style="max-width:120px"></td>' : '') +
        (l ? '<td style="min-width:230px"><span style="display:flex;gap:8px;align-items:center">' + (it && it.img ? '<img alt="" src="' + esc(it.img) + '">' : '') + '<span>' + esc(l.name) + (l.qty > 1 ? ' <b>× ' + l.qty + '</b>' : '') + '</span></span></td><td style="white-space:nowrap">' + esc(l.model || "") + '</td><td class="r">' + fcfa(l.price * l.qty) + '</td>' : '<td colspan="3" class="hint">Aucun article</td>') +
        (k === 0 ? '<td rowspan="' + n + '"><select aria-label="Paiement" data-of="pay" data-o="' + o.id + '">' + PAYS.map(function(s){ return '<option value="' + s[0] + '"' + (s[0] === o.pay ? " selected" : "") + '>' + s[1] + '</option>'; }).join("") + '</select>' + (n > 1 ? '<span class="ref">Total ' + fcfa(oTotal(o)) + '</span>' : '') + '</td>' +
          '<td rowspan="' + n + '"><input aria-label="Livraison" data-of="delivery" data-o="' + o.id + '" value="' + esc(o.delivery) + '" placeholder="Campus, Akwa…"></td>' +
          '<td rowspan="' + n + '"><select aria-label="Statut" data-of="status" data-o="' + o.id + '">' + STATUSES.map(function(s){ return '<option value="' + s[0] + '"' + (s[0] === o.status ? " selected" : "") + '>' + s[1] + '</option>'; }).join("") + '</select></td>' +
          '<td rowspan="' + n + '"><button class="linkbtn" type="button" data-odel="' + o.id + '">Supprimer</button></td>' : '') + '</tr>';
    };
    return o.items.length ? o.items.map(cells).join("") : cells(null, 0);
  }).join("");
  p.innerHTML = '<div class="kpis"><div class="kpi"><span>Commandes à traiter</span><b>' + all.filter(function(o){ return o.status === "nouvelle" || o.status === "confirmee"; }).length + '</b></div><div class="kpi"><span>À encaisser</span><b>' + fcfa(toCash) + '</b></div><div class="kpi main"><span>Encaissé</span><b>' + fcfa(cash) + '</b></div></div>' +
    '<p class="note" style="margin-bottom:16px">Les commandes passées sur le site arrivent ici toutes seules. Pour une commande reçue autrement (message direct, bouche-à-oreille), utilise les encadrés ci-dessous.</p>' +
    '<div class="two" style="margin-bottom:18px"><div class="panel"><h2 style="font-size:19px">Coller un message WhatsApp</h2><textarea id="paste" rows="4" style="width:100%;border-radius:12px;border:1.5px solid var(--filet);padding:10px;font-weight:600;margin-top:6px" placeholder="Colle ici le message du client"></textarea><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-b btn-s" type="button" id="padd">Ajouter la commande</button></div><p class="hint" id="pmsg" style="margin-top:8px"></p></div>' +
    '<div class="panel"><h2 style="font-size:19px">Saisie manuelle</h2><div class="form"><label for="m-name">Client<input id="m-name" placeholder="Ex. Eva"></label><label for="m-item">Article<select id="m-item">' + D.products.filter(function(i){ return i.status !== "cache"; }).map(function(i){ return '<option value="' + i.n + '">' + esc(i.name) + ' · ' + esc(i.model) + ' (' + fcfa(priceOf(i)) + ', ' + i.stock + ' en stock)</option>'; }).join("") + '</select></label><div class="two" style="gap:10px"><label for="m-q">Quantité<input id="m-q" type="number" min="1" value="1"></label><label for="m-liv">Livraison<input id="m-liv" placeholder="Campus"></label></div><button class="btn btn-b btn-s" type="button" id="madd">Ajouter</button></div></div></div>' +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px"><div class="chips">' + [["actives","À traiter"],["encaisser","À encaisser"],["livree","Livrées"],["annulee","Annulées"],["toutes","Toutes"]].map(function(f){ return '<button class="chip" type="button" data-ofl="' + f[0] + '" aria-pressed="' + (OF === f[0]) + '">' + f[1] + '</button>'; }).join("") + '</div><input class="field" style="max-width:280px" id="oq" type="search" placeholder="Chercher (client, n°, article)" aria-label="Chercher une commande" value="' + esc(OQ) + '"></div>' +
    (list.length ? '<div class="tw"><table class="t" style="min-width:1040px"><thead><tr><th>N° commande</th><th>Date</th><th>Client</th><th>Article</th><th>Modèle</th><th class="r">Prix</th><th>Paiement</th><th>Livraison</th><th>Statut</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="panel hint" style="font-size:15px">Aucune commande dans cette liste.</p>') +
    '<p class="hint" style="margin-top:12px">Le stock baisse dès qu’une commande est Confirmée, Livrée ou Payée, et remonte si tu l’annules. Seules les commandes Payées comptent dans tes revenus.</p>';
  $("padd").onclick = function(){
    var o = parseWA($("paste").value);
    if (!o.items.length){ $("pmsg").textContent = "Je n’ai trouvé aucun article dans ce message. Utilise la saisie manuelle."; return; }
    if (o.ref && D.orders.some(function(x){ return x.ref === o.ref; })){ $("pmsg").textContent = "Cette commande (" + o.ref + ") est déjà dans le tableau : elle est arrivée toute seule depuis le site."; return; }
    addOrder(o).then(function(){ OF = "actives"; paneOrders(p); toast("Commande ajoutée."); });
  };
  $("madd").onclick = function(){
    var i = prod(+$("m-item").value), qty = Math.max(1, +$("m-q").value || 1);
    addOrder({name:$("m-name").value.trim(), place:$("m-liv").value.trim(), items:[{n:i.n, name:i.name, model:i.model, qty:qty, price:priceOf(i)}]}).then(function(){ paneOrders(p); toast("Commande ajoutée."); });
  };
  $("oq").oninput = function(e){ OQ = e.target.value.trim(); var pos = e.target.selectionStart; paneOrders(p); var x = $("oq"); x.focus(); try { x.setSelectionRange(pos, pos); } catch(z){} };
  p.querySelectorAll("[data-ofl]").forEach(function(b){ b.onclick = function(){ OF = b.dataset.ofl; paneOrders(p); }; });
  p.querySelectorAll("[data-of]").forEach(function(el){
    el.onchange = function(){
      var o = D.orders.find(function(x){ return x.id === el.dataset.o; }), f = el.dataset.of, patch = {};
      o[f] = el.value; patch[f] = el.value;
      busy(q(sb.from("orders").update(patch).eq("id", o.id)).then(function(){ return (f === "pay" || f === "status") ? syncStock(o) : null; })).then(function(){ if (f === "pay" || f === "status") paneOrders(p); });
    };
  });
  p.querySelectorAll("[data-odel]").forEach(function(b){ b.onclick = function(){
    if (!confirmInline(b, "Confirmer")) return;
    var o = D.orders.find(function(x){ return x.id === b.dataset.odel; });
    busy((o.stock_applied ? applyStock(o, -1) : Promise.resolve()).then(function(){ return q(sb.from("orders").delete().eq("id", o.id)); })).then(function(){ D.orders = D.orders.filter(function(x){ return x !== o; }); paneOrders(p); });
  }; });
}

/* ---------- Articles et promos ---------- */
var IQ = "", IF = "all";
function resizeToBlob(file){
  return new Promise(function(res, rej){
    var fr = new FileReader(); fr.onerror = rej;
    fr.onload = function(){ var im = new Image(); im.onerror = rej; im.onload = function(){
      var W = 660, H = 880, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
      var r = Math.max(W / im.width, H / im.height), w = im.width * r, h = im.height * r;
      g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); c.toBlob(function(b){ b ? res(b) : rej(new Error("photo")); }, "image/jpeg", 0.82); }; im.src = fr.result; };
    fr.readAsDataURL(file);
  });
}
function uploadPhoto(file){
  return resizeToBlob(file).then(function(blob){
    var path = "p-" + Date.now() + "-" + Math.floor(Math.random() * 1000) + ".jpg";
    return q(sb.storage.from("produits").upload(path, blob, {contentType:"image/jpeg", upsert:false})).then(function(){ return sb.storage.from("produits").getPublicUrl(path).data.publicUrl; });
  });
}
function subOptions(ci, sel){ return '<option value="">—</option>' + subsOf(ci).map(function(s){ return '<option value="' + s.id + '"' + (s.id === sel ? " selected" : "") + '>' + esc(s.label) + '</option>'; }).join(""); }
function itemRow(i){
  var st = [["dispo","Disponible"],["reserve","Réservé"],["epuise","Vendu / épuisé"],["cache","Retiré du site"]];
  var marge = priceOf(i) - costOf(i.n);
  return '<article class="irow" data-row="' + i.n + '"><div class="thumb"><img alt="" src="' + esc(i.img) + '"><label for="ph-' + i.n + '">Changer</label><input id="ph-' + i.n + '" type="file" accept="image/*" data-ph="' + i.n + '"></div>' +
    '<div class="ifields">' +
      '<label class="wide" for="nm-' + i.n + '">Nom<input id="nm-' + i.n + '" data-f="name" data-n="' + i.n + '" value="' + esc(i.name) + '"></label>' +
      '<label for="ct-' + i.n + '">Catégorie<select id="ct-' + i.n + '" data-f="cat" data-n="' + i.n + '">' + D.cats.map(function(c){ return '<option value="' + c.id + '"' + (c.id === i.cat ? " selected" : "") + '>' + esc(c.label) + '</option>'; }).join("") + '</select></label>' +
      '<label for="sb-' + i.n + '">Sous-catégorie<select id="sb-' + i.n + '" data-f="sub" data-n="' + i.n + '">' + subOptions(i.cat, i.sub) + '</select></label>' +
      '<label for="md-' + i.n + '">Téléphone / modèle<input id="md-' + i.n + '" data-f="model" data-n="' + i.n + '" list="models" value="' + esc(i.model) + '"></label>' +
      '<label for="pr-' + i.n + '">Prix de vente (F)<input id="pr-' + i.n + '" type="number" min="0" step="500" inputmode="numeric" data-f="price" data-n="' + i.n + '" value="' + i.price + '"></label>' +
      '<label class="pro" for="po-' + i.n + '">Prix promo (F)<input id="po-' + i.n + '" type="number" min="0" step="500" inputmode="numeric" data-f="promo" data-n="' + i.n + '" value="' + (hasPromo(i) ? i.promo : "") + '" placeholder="Aucune"></label>' +
      '<label class="priv" for="co-' + i.n + '">Prix d’achat (privé)<input id="co-' + i.n + '" type="number" min="0" step="50" inputmode="numeric" data-f="cost" data-n="' + i.n + '" value="' + Math.round(costOf(i.n)) + '"></label>' +
      '<label for="sk-' + i.n + '">Stock<input id="sk-' + i.n + '" type="number" min="0" step="1" inputmode="numeric" data-f="stock" data-n="' + i.n + '" value="' + i.stock + '"></label>' +
      '<label for="ss-' + i.n + '">Statut<select id="ss-' + i.n + '" data-f="status" data-n="' + i.n + '">' + st.map(function(s){ return '<option value="' + s[0] + '"' + (s[0] === i.status ? " selected" : "") + '>' + s[1] + '</option>'; }).join("") + '</select></label>' +
      '<label class="wide" for="ds-' + i.n + '">Description (facultatif)<input id="ds-' + i.n + '" data-f="descr" data-n="' + i.n + '" value="' + esc(i.descr || "") + '" placeholder="Ex. matière, couleur, détail qui plaît"></label>' +
      '<div class="iacts"><span>Marge : <b style="color:' + (marge >= 0 ? "var(--ok)" : "var(--alerte)") + '">' + fcfa(marge) + '</b> par pièce</span><span style="display:flex;gap:14px;flex-wrap:wrap;align-items:center"><label class="chk"><input type="checkbox" data-f="is_new" data-n="' + i.n + '"' + (i.is_new ? " checked" : "") + '>Nouveauté / arrivage</label><label class="chk"><input type="checkbox" data-f="featured" data-n="' + i.n + '"' + (i.featured ? " checked" : "") + '>Dans le carrousel</label>' + (i.stock > 0 && i.status !== "cache" ? '<button class="btn btn-b btn-s" type="button" data-isold="' + i.n + '">Vendu ✓</button>' : '<span class="hint">Plus en stock</span>') + '<button class="linkbtn" type="button" data-idel="' + i.n + '">Supprimer</button></span></div>' +
    '</div></article>';
}
function paneItems(p){
  var models = {}; D.products.forEach(function(i){ if (i.model) models[i.model] = 1; });
  var list = D.products.filter(function(i){
    if (IF === "promo" && !hasPromo(i)) return false;
    if (IF === "new" && !i.is_new) return false;
    if (IF === "loss" && !(priceOf(i) < costOf(i.n))) return false;
    if (IF === "off" && i.status !== "cache") return false;
    if (!IQ) return true; var h = (i.name + " " + i.model + " " + catLabel(i.cat)).toLowerCase(); return IQ.toLowerCase().split(/\s+/).every(function(w){ return h.indexOf(w) >= 0; });
  });
  p.innerHTML = '<datalist id="models">' + Object.keys(models).sort().map(function(m){ return '<option value="' + esc(m) + '">'; }).join("") + '</datalist>' +
    '<div class="panel" style="margin-bottom:16px"><h2 style="font-size:19px">Ajouter un article ou un arrivage</h2><div class="ifields" style="margin-top:8px">' +
      '<label class="wide" for="n-name">Nom<input id="n-name" placeholder="Ex. Coque transparente papillons"></label>' +
      '<label for="n-cat">Catégorie<select id="n-cat">' + D.cats.map(function(c){ return '<option value="' + c.id + '">' + esc(c.label) + '</option>'; }).join("") + '</select></label>' +
      '<label for="n-sub">Sous-catégorie<select id="n-sub">' + subOptions((D.cats[0] || {}).id, "") + '</select></label>' +
      '<label for="n-model">Téléphone / modèle<input id="n-model" list="models" placeholder="Ex. iPhone 13 ou Universel"></label>' +
      '<label for="n-price">Prix de vente (F)<input id="n-price" type="number" min="0" step="500" inputmode="numeric"></label>' +
      '<label class="priv" for="n-cost">Prix d’achat (privé)<input id="n-cost" type="number" min="0" step="50" inputmode="numeric"></label>' +
      '<label for="n-stock">Stock<input id="n-stock" type="number" min="0" value="1" inputmode="numeric"></label>' +
      '<label for="n-photo">Photo<input id="n-photo" type="file" accept="image/*"></label>' +
    '</div><div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap"><button class="btn btn-b btn-s" type="button" id="nadd">Ajouter l’article</button><span class="hint" id="nmsg">Il apparaît sur le site, marqué « Nouveau ».</span></div></div>' +
    '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap"><div class="chips">' + [["all","Tous"],["promo","En promo"],["new","Nouveautés"],["loss","Vendus à perte"],["off","Retirés"]].map(function(f){ return '<button class="chip" type="button" data-if="' + f[0] + '" aria-pressed="' + (IF === f[0]) + '">' + f[1] + '</button>'; }).join("") + '</div><input class="field" style="max-width:300px" id="iq" type="search" placeholder="Chercher un article" aria-label="Chercher un article" value="' + esc(IQ) + '"></div>' +
    '<div class="ilist">' + (list.length ? list.slice().reverse().map(itemRow).join("") : '<p class="panel hint">Aucun article dans cette liste.</p>') + '</div>';
  $("n-cat").onchange = function(){ $("n-sub").innerHTML = subOptions($("n-cat").value, ""); };
  $("iq").oninput = function(e){ IQ = e.target.value.trim(); var pos = e.target.selectionStart; paneItems(p); var x = $("iq"); x.focus(); try { x.setSelectionRange(pos, pos); } catch(z){} };
  p.querySelectorAll("[data-if]").forEach(function(b){ b.onclick = function(){ IF = b.dataset.if; paneItems(p); }; });
  $("nadd").onclick = function(){
    var name = $("n-name").value.trim(), price = +$("n-price").value || 0, f = $("n-photo").files[0], btn = $("nadd");
    if (!name || !price){ $("nmsg").textContent = "Donne au moins un nom et un prix de vente."; return; }
    btn.disabled = true; $("nmsg").textContent = f ? "Envoi de la photo…" : "Ajout…";
    (f ? uploadPhoto(f) : Promise.resolve("")).then(function(url){
      var row = {name:name, model:$("n-model").value.trim() || "Universel", cat:$("n-cat").value, sub:$("n-sub").value, price:price, stock:Math.max(0, +$("n-stock").value || 0), status:"dispo", is_new:true, featured:false, img:url, descr:""};
      return busy(q(sb.from("products").insert(row).select().single()).then(function(np){
        D.products.push(np); var c = +$("n-cost").value || 0; D.costs[np.n] = c;
        return q(sb.from("product_costs").upsert({n:np.n, cost:c}));
      }));
    }).then(function(){ paneItems(p); toast("Article ajouté et visible sur le site."); })
      .catch(function(){ btn.disabled = false; $("nmsg").textContent = "L’ajout n’a pas marché. Réessaie."; });
  };
  p.onchange = function(e){
    var el = e.target, n = +el.dataset.n; if (!n || !el.dataset.f) return;
    var i = prod(n), f = el.dataset.f, patch = {}, job;
    if (f === "cost"){ D.costs[n] = Math.max(0, +el.value || 0); job = q(sb.from("product_costs").upsert({n:n, cost:D.costs[n]})); }
    else {
      if (f === "price" || f === "stock") i[f] = Math.max(0, Math.round(+el.value || 0));
      else if (f === "promo") i.promo = el.value === "" ? null : Math.max(0, Math.round(+el.value || 0));
      else if (f === "is_new" || f === "featured") i[f] = el.checked;
      else if (f === "cat"){ i.cat = el.value; i.sub = ""; patch.sub = ""; }
      else i[f] = el.value;
      patch[f] = i[f]; job = q(sb.from("products").update(patch).eq("n", n));
    }
    busy(job);
    if (f === "price" || f === "cost" || f === "promo" || f === "cat"){ var row = el.closest(".irow"), keep = el.id; if (row && row.parentNode){ try { row.outerHTML = itemRow(i); } catch(x){} var again = $(keep); if (again) again.focus(); } }
  };
  p.querySelectorAll("[data-ph]").forEach(function(inp){ inp.onchange = function(e){
    e.stopPropagation(); var f = inp.files[0]; if (!f) return; var i = prod(+inp.dataset.ph);
    toast("Envoi de la photo…");
    busy(uploadPhoto(f).then(function(url){ i.img = url; return q(sb.from("products").update({img:url}).eq("n", i.n)); })).then(function(){ paneItems(p); });
  }; });
  p.querySelectorAll("[data-isold]").forEach(function(b){ b.onclick = function(){ var n = +b.dataset.isold; SALE = {lines:[{n:n, qty:1}], total:null, q:""}; TAB = "ven"; try { sessionStorage.setItem("rcase-tab", TAB); } catch(x){} renderOwner(); toast("Vérifie le prix encaissé puis enregistre la vente."); }; });
  p.querySelectorAll("[data-idel]").forEach(function(b){ b.onclick = function(){
    if (!confirmInline(b, "Confirmer la suppression")) return;
    var n = +b.dataset.idel;
    busy(q(sb.from("products").delete().eq("n", n))).then(function(){ D.products = D.products.filter(function(i){ return i.n !== n; }); delete D.costs[n]; paneItems(p); });
  }; });
}

/* ---------- Dépenses ---------- */
function paneExp(p){
  var list = D.expenses.slice().sort(function(a, b){ return String(b.date).localeCompare(String(a.date)); });
  var today = new Date().toISOString().slice(0, 10);
  p.innerHTML = '<div class="panel" style="margin-bottom:16px"><h2 style="font-size:19px">Ajouter une dépense</h2><p class="hint" style="margin-bottom:10px">Tout ce qui n’est pas le prix d’achat d’un article : livraison, emballages, publicité, crédit internet… Le prix d’achat de chaque article se met dans l’onglet Articles.</p><div class="ifields"><label for="e-date">Date<input id="e-date" type="date" value="' + today + '"></label><label for="e-type">Type<select id="e-type"><option value="Transport">Transport</option><option value="Emballage">Emballage</option><option value="Publicité">Publicité</option><option value="Autre">Autre</option></select></label><label class="wide" for="e-label">Détail<input id="e-label" placeholder="Ex. Livraison commande du 18 octobre"></label><label for="e-amount">Montant (F)<input id="e-amount" type="number" min="0" step="100" inputmode="numeric"></label></div><button class="btn btn-b btn-s" type="button" id="eadd" style="margin-top:12px">Ajouter</button></div>' +
    (list.length ? '<div class="tw"><table class="t"><thead><tr><th>Date</th><th>Libellé</th><th class="r">Montant</th><th></th></tr></thead><tbody>' + list.map(function(x){ return '<tr><td>' + new Date(x.date + "T12:00:00").toLocaleDateString("fr-FR") + '</td><td>' + esc(x.label) + '</td><td class="r">' + fcfa(x.amount) + '</td><td class="r"><button class="linkbtn" type="button" data-edel="' + x.id + '">Supprimer</button></td></tr>'; }).join("") + '</tbody></table></div>' : '<p class="panel hint" style="font-size:15px">Aucune dépense enregistrée.</p>');
  $("eadd").onclick = function(){
    var a = +$("e-amount").value || 0, l = $("e-label").value.trim(), ty = $("e-type").value; if (!a) return; l = ty + (l ? " · " + l : "");
    busy(q(sb.from("expenses").insert({date:$("e-date").value || today, label:l, amount:a}).select().single())).then(function(x){ D.expenses.push(x); paneExp(p); });
  };
  p.querySelectorAll("[data-edel]").forEach(function(b){ b.onclick = function(){ if (!confirmInline(b, "Confirmer")) return; var id = +b.dataset.edel; busy(q(sb.from("expenses").delete().eq("id", id))).then(function(){ D.expenses = D.expenses.filter(function(x){ return x.id !== id; }); paneExp(p); }); }; });
}

/* ---------- Réglages ---------- */
function paneSettings(p){
  var s = D.settings;
  var F = function(id, key, label, area){ return '<label for="' + id + '">' + label + (area ? '<textarea id="' + id + '" data-s="' + key + '" rows="3">' + esc(s[key] || "") + '</textarea>' : '<input id="' + id + '" data-s="' + key + '" value="' + esc(s[key] || "") + '">') + '</label>'; };
  p.innerHTML = '<div class="two"><div class="sp">' +
    '<div class="panel"><h2 style="font-size:19px">Haut de l’accueil</h2><div class="form">' + F("s1","heroTitle1","Grand titre, ligne 1") + F("s2","heroTitle2","Grand titre, ligne 2 (en couleur)") + F("s3","heroLead","Phrase en gras") + F("s4","heroText","Texte",1) + '</div></div>' +
    '<div class="panel"><h2 style="font-size:19px">Première image du carrousel</h2><div class="form">' + F("s5","kicker","Petit titre") + F("s6","slideTitle","Titre (mets *entre étoiles* les mots en couleur)") + F("s7","slideSub","Texte",1) + '</div></div>' +
    '<div class="panel"><h2 style="font-size:19px">Boutique et bas de page</h2><div class="form">' + F("s8","shopTitle","Titre de la boutique") + F("s9","shopSub","Texte sous le titre",1) + F("s10","footerTitle","Grand titre du bas de page") + F("s11","footerText","Texte du bas de page",1) + F("s12","footerTag","Petite phrase sous le logo") + '</div></div>' +
    '<div class="panel"><h2 style="font-size:19px">Contact</h2><div class="form">' + F("s13","phone","Numéro WhatsApp (avec 237)") + F("s14","phoneDisplay","Numéro affiché") + F("s15","city","Ville") + F("s16","siteUrl","Adresse du site (ex. https://rcase.netlify.app)") + '</div></div>' +
    '</div><div class="sp">' +
    '<div class="panel"><h2 style="font-size:19px">Catégories et sous-catégories</h2><p class="hint" style="margin-bottom:6px">Les changements apparaissent tout de suite sur le site.</p>' +
      D.cats.map(function(c){ return '<div style="border-top:1px dashed var(--filet);padding-top:12px;margin-top:12px"><label class="hint" for="cl-' + c.id + '" style="display:block;margin-bottom:4px">Catégorie' + (c.main ? " principale" : " (cachée du menu)") + '</label><input class="field" style="border-radius:10px;font-weight:800" id="cl-' + c.id + '" data-cl="' + c.id + '" value="' + esc(c.label) + '"><div class="subed">' + subsOf(c.id).map(function(sb2){ return '<div><input aria-label="Sous-catégorie" data-sl="' + c.id + '|' + sb2.id + '" value="' + esc(sb2.label) + '"><button class="linkbtn" type="button" data-sd="' + c.id + '|' + sb2.id + '">Retirer</button></div>'; }).join("") + '<div><input aria-label="Nouvelle sous-catégorie" id="ns-' + c.id + '" placeholder="Nouvelle sous-catégorie"><button class="btn btn-o btn-s" type="button" data-sa="' + c.id + '">Ajouter</button></div></div></div>'; }).join("") +
      '<div style="display:flex;gap:8px;margin-top:16px"><input class="field" id="newcat" placeholder="Nouvelle catégorie (ex. Chargeurs)" aria-label="Nouvelle catégorie" style="border-radius:12px"><button class="btn btn-b btn-s" type="button" id="addcat">Ajouter</button></div></div>' +
    '<div class="panel"><h2 style="font-size:19px">Mot de passe</h2><div class="form"><label for="pw1">Nouveau mot de passe (8 caractères minimum)<input id="pw1" type="password" autocomplete="new-password"></label><button class="btn btn-b btn-s" type="button" id="setpw">Changer le mot de passe</button><p class="hint" id="pwmsg"></p></div></div>' +
    '</div></div>';
  p.onchange = function(e){
    var el = e.target;
    if (el.dataset.s){ s[el.dataset.s] = el.value; busy(q(sb.from("settings").update({data:s}).eq("id", 1))); }
    else if (el.dataset.cl){ var c = D.cats.find(function(x){ return x.id === el.dataset.cl; }); c.label = el.value; busy(q(sb.from("categories").update({label:el.value}).eq("id", c.id))); }
    else if (el.dataset.sl){ var k = el.dataset.sl.split("|"), sbb = D.subs.find(function(x){ return x.cat_id === k[0] && x.id === k[1]; }); sbb.label = el.value; busy(q(sb.from("subcategories").update({label:el.value}).match({cat_id:k[0], id:k[1]}))); }
  };
  p.querySelectorAll("[data-sa]").forEach(function(b){ b.onclick = function(){
    var ci = b.dataset.sa, l = $("ns-" + ci).value.trim(); if (!l) return;
    var id = slug(l); while (subsOf(ci).some(function(x){ return x.id === id; })) id += "-2";
    var row = {cat_id:ci, id:id, label:l, position:subsOf(ci).length};
    busy(q(sb.from("subcategories").insert(row))).then(function(){ D.subs.push(row); paneSettings(p); });
  }; });
  p.querySelectorAll("[data-sd]").forEach(function(b){ b.onclick = function(){
    if (!confirmInline(b, "Confirmer")) return;
    var k = b.dataset.sd.split("|");
    busy(q(sb.from("products").update({sub:""}).match({cat:k[0], sub:k[1]})).then(function(){ return q(sb.from("subcategories").delete().match({cat_id:k[0], id:k[1]})); })).then(function(){
      D.products.forEach(function(i){ if (i.cat === k[0] && i.sub === k[1]) i.sub = ""; });
      D.subs = D.subs.filter(function(x){ return !(x.cat_id === k[0] && x.id === k[1]); }); paneSettings(p);
    });
  }; });
  $("addcat").onclick = function(){
    var l = $("newcat").value.trim(); if (!l) return;
    var id = slug(l); while (D.cats.some(function(c){ return c.id === id; })) id += "-2";
    var row = {id:id, label:l, position:D.cats.length, main:true};
    busy(q(sb.from("categories").insert(row))).then(function(){ D.cats.push(row); paneSettings(p); });
  };
  $("setpw").onclick = function(){
    var a = $("pw1").value; if (a.length < 8){ $("pwmsg").textContent = "8 caractères minimum."; return; }
    sb.auth.updateUser({password:a}).then(function(r){ $("pwmsg").textContent = r.error ? r.error.message : "Mot de passe changé."; if (!r.error) $("pw1").value = ""; });
  };
}

/* ---------- Démarrage ---------- */
if (!R.live || !window.supabase){ screenNoConfig(); return; }
sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
var recovering = /type=recovery/.test(location.hash);
sb.auth.onAuthStateChange(function(ev){ if (ev === "PASSWORD_RECOVERY"){ recovering = true; screenNewPassword(); } });
sb.auth.getSession().then(function(r){
  if (recovering) return;
  if (r.data && r.data.session) enter(); else screenLogin();
});
})();
