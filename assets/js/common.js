/* R-Case : outils communs au site et à l'espace propriétaire */
(function(){
"use strict";
var C = window.RCASE_CONFIG || {};
var R = window.RCASE = {};
R.live = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
R.esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };
R.fcfa = function(n){ return Math.round(n || 0).toLocaleString("fr-FR").replace(/[  ]/g, " ") + " F"; };
R.WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z";
R.WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + R.WA_PATH + '"/></svg>';
R.hasPromo = function(i){ return typeof i.promo === "number" && i.promo > 0 && i.promo < i.price; };
R.priceOf = function(i){ return R.hasPromo(i) ? i.promo : i.price; };
R.imgUrl = function(p){ return p || ""; };
function rest(path){
  return fetch(C.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/" + path, {headers:{apikey:C.SUPABASE_ANON_KEY, Authorization:"Bearer " + C.SUPABASE_ANON_KEY}})
    .then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
}
/* Charge le catalogue : depuis Supabase si configuré, sinon depuis data/catalogue.json */
R.loadCatalogue = function(){
  if (!R.live) return fetch("data/catalogue.json", {cache:"no-cache"}).then(function(r){ return r.json(); });
  return Promise.all([
    rest("settings?select=data&id=eq.1"),
    rest("categories?select=*&order=position.asc"),
    rest("subcategories?select=*&order=position.asc"),
    rest("products?select=n,name,model,cat,sub,price,promo,stock,status,is_new,featured,img,descr&status=neq.cache&order=n.desc")
  ]).then(function(r){ return {settings:(r[0][0] || {}).data || {}, categories:r[1], subcategories:r[2], products:r[3]}; })
    .catch(function(){ return fetch("data/catalogue.json").then(function(r){ return r.json(); }); });
};
/* Enregistre la commande dans la base, même si la page part vers WhatsApp juste après */
R.recordOrder = function(o){
  if (!R.live) return;
  try {
    fetch(C.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/rpc/place_order", {
      method:"POST", keepalive:true,
      headers:{apikey:C.SUPABASE_ANON_KEY, Authorization:"Bearer " + C.SUPABASE_ANON_KEY, "Content-Type":"application/json"},
      body:JSON.stringify({p_ref:o.ref, p_name:o.name || "", p_place:o.place || "", p_remise:o.remise || "", p_mode:o.mode || "reserve", p_note:o.note || "", p_items:o.items})
    }).catch(function(){});
  } catch(e){}
};
})();
