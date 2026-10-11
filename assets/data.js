/* ============================================================
   AYM Propiedades — Capa de datos
   ------------------------------------------------------------
   Único punto por donde el sitio público lee propiedades.

   Orden de preferencia:
     1. Supabase (lo que publica el panel /admin.html)
     2. data/properties.json  (respaldo: si Supabase falla o
        todavía no está configurado, el sitio NO se cae)

   Devuelve siempre objetos con la MISMA forma que usaba
   properties.json, así index.html y property.html no notan
   la diferencia:
     { id, title, operation, type, commune, status, priceCLP,
       priceUF, summary, description, bedrooms, bathrooms,
       surface, terrain, address, cover, images, visible }
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.AYM_CONFIG || {};
  var _cliente = null;
  var _cache = null;

  /* ---------- cliente Supabase (se crea una sola vez) ---------- */
  function cliente() {
    if (_cliente) return Promise.resolve(_cliente);
    if (!cfg.cargarSdk) return Promise.resolve(null);
    return cfg.cargarSdk().then(function (ok) {
      if (!ok) return null;
      _cliente = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      return _cliente;
    });
  }

  /* ---------- miniaturas ----------
     El panel sube cada foto nueva dos veces: grande y en thumb/<misma ruta>.
     Para las fotos históricas del repositorio (/fotos/...) no hay miniatura
     y se usa la misma foto. Si una miniatura no existe, el <img> cae a la
     grande (ver script.js y property.html). */
  var PREFIJO_PUBLICO = "/storage/v1/object/public/fotos/";
  function miniatura(u) {
    u = String(u || "");
    var i = u.indexOf(PREFIJO_PUBLICO);
    if (i === -1 || u.indexOf(PREFIJO_PUBLICO + "thumb/") !== -1) return u;
    return u.slice(0, i + PREFIJO_PUBLICO.length) + "thumb/" + u.slice(i + PREFIJO_PUBLICO.length);
  }

  /* ---------- fila de Supabase -> forma del sitio ---------- */
  function normalizar(fila) {
    var imgs = fila.images;
    if (typeof imgs === "string") {
      try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; }
    }
    if (!Array.isArray(imgs)) imgs = [];
    imgs = imgs.filter(function (u) { return typeof u === "string" && u; });

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
      coverThumb:  imgs[0] ? miniatura(imgs[0]) : "",
      images:      imgs,
      thumbs:      imgs.map(miniatura)
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
          if (p.cover) {
            var k = imgs.indexOf(p.cover);
            if (k > -1) imgs.splice(k, 1);
            imgs.unshift(p.cover);
          }
          p.images = imgs;
          p.thumbs = imgs.slice();
          p.cover = imgs[0] || "";
          p.coverThumb = p.cover;
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

    return cliente().then(function (sb) {
      if (!sb) return desdeJson();
      return sb
        .from("propiedades")
        .select("*")
        .eq("visible", true)
        .order("orden", { ascending: true })
        .order("created_at", { ascending: false })
        .then(function (res) {
          if (res.error) throw res.error;
          // Si Supabase respondió, mandan sus datos aunque la lista esté vacía:
          // "ocultar todo" en el panel no debe resucitar el JSON viejo.
          return (res.data || []).map(normalizar);
        })
        .catch(function (err) {
          console.warn("[AYM] Supabase no respondió, uso properties.json:", err && err.message || err);
          return desdeJson();
        });
    }).then(function (l) { _cache = l; return l; });
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
