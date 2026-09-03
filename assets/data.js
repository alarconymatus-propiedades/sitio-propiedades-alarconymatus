/* ============================================================
   AYM Propiedades — Capa de datos
   ------------------------------------------------------------
   Único punto por donde el sitio lee propiedades.

   Orden de preferencia:
     1. Supabase (lo que publica el panel /admin.html)
     2. data/properties.json  (respaldo: si Supabase falla o
        todavía no está configurado, el sitio NO se cae)

   Devuelve siempre objetos con la MISMA forma que usaba
   properties.json, así index.html y property.html no notan
   la diferencia:
     { id, title, operation, type, commune, status, priceCLP,
       priceUF, summary, description, bedrooms, bathrooms,
       surface, terrain, address, cover, images }
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.AYM_CONFIG || {};
  var _cliente = null;
  var _cache = null;

  /* ---------- cliente Supabase (se crea una sola vez) ---------- */
  function cliente() {
    if (_cliente) return _cliente;
    if (!cfg.estaConfigurado || !cfg.estaConfigurado()) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    _cliente = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return _cliente;
  }

  /* ---------- fila de Supabase -> forma del sitio ---------- */
  function normalizar(fila) {
    var imgs = fila.images;
    if (typeof imgs === "string") {
      try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; }
    }
    if (!Array.isArray(imgs)) imgs = [];

    return {
      id:          fila.codigo,
      _uuid:       fila.id,
      title:       fila.title || "",
      operation:   fila.operation || "",
      type:        fila.type || "",
      commune:     fila.commune || "",
      address:     fila.address || "",
      status:      fila.status || "Disponible",
      priceCLP:    fila.price_clp != null ? Number(fila.price_clp) : undefined,
      priceUF:     fila.price_uf  != null ? Number(fila.price_uf)  : undefined,
      summary:     fila.summary || "",
      description: fila.description || "",
      bedrooms:    fila.bedrooms  != null ? Number(fila.bedrooms)  : undefined,
      bathrooms:   fila.bathrooms != null ? Number(fila.bathrooms) : undefined,
      surface:     fila.surface   != null ? Number(fila.surface)   : undefined,
      terrain:     fila.terrain   != null ? Number(fila.terrain)   : undefined,
      visible:     fila.visible !== false,
      orden:       fila.orden || 0,
      cover:       imgs[0] || "",
      images:      imgs
    };
  }

  /* ---------- respaldo: properties.json ---------- */
  function desdeJson() {
    var url = (cfg.FALLBACK_JSON || "./data/properties.json") + "?v=" + Date.now();
    return fetch(url, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("No se pudo leer properties.json (" + r.status + ")");
        return r.json();
      })
      .then(function (lista) {
        return (Array.isArray(lista) ? lista : []).map(function (p) {
          var imgs = Array.isArray(p.images) ? p.images.slice() : [];
          if (p.cover && imgs.indexOf(p.cover) === -1) imgs.unshift(p.cover);
          p.images = imgs;
          p.cover = p.cover || imgs[0] || "";
          if (p.visible === undefined) p.visible = true;
          return p;
        });
      });
  }

  /* ---------- API pública ---------- */

  // Propiedades para el SITIO PÚBLICO (solo visibles).
  function listar(opciones) {
    opciones = opciones || {};
    if (!opciones.refrescar && _cache) return Promise.resolve(_cache);

    var sb = cliente();
    if (!sb) return desdeJson().then(function (l) { _cache = l; return l; });

    return sb
      .from("propiedades")
      .select("*")
      .eq("visible", true)
      .order("orden", { ascending: true })
      .order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        var lista = (res.data || []).map(normalizar);
        // Si la tabla está vacía todavía, mostramos el JSON viejo.
        if (!lista.length) return desdeJson();
        return lista;
      })
      .catch(function (err) {
        console.warn("[AYM] Supabase no respondió, uso properties.json:", err.message || err);
        return desdeJson();
      })
      .then(function (l) { _cache = l; return l; });
  }

  // Una propiedad por código (AM-014).
  function obtener(codigo) {
    return listar().then(function (lista) {
      return lista.filter(function (p) {
        return String(p.id) === String(codigo);
      })[0] || null;
    });
  }

  window.AYMData = {
    listar: listar,
    obtener: obtener,
    normalizar: normalizar,
    cliente: cliente,
    limpiarCache: function () { _cache = null; }
  };
})();
