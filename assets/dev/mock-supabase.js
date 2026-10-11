/* ============================================================
   AYM Propiedades — Simulador de Supabase (SOLO para pruebas)
   ------------------------------------------------------------
   Imita la parte de supabase-js que usan admin.js y data.js, con
   los datos guardados en localStorage y las fotos en el servidor
   de pruebas (scripts/servidor_pruebas.py). Permite probar TODO el
   panel sin tener un proyecto Supabase real.

   Se activa únicamente cuando:
     - el sitio corre en localhost / 127.0.0.1, y
     - la URL trae ?mock=1
   (ver assets/config.js). En producción nunca se carga.

   Usuario de prueba: cualquier correo, contraseña "demo1234".
   ============================================================ */
(function () {
  "use strict";

  var CLAVE_FILAS  = "aym_mock_propiedades";
  var CLAVE_SESION = "aym_mock_sesion";
  var CLAVE_RESET  = "aym_mock_reset";
  var PASSWORD_OK  = "demo1234";
  var RUTA_STORE   = "/__mockstore/";
  var PREFIJO_PUB  = "/storage/v1/object/public/fotos/";

  var listeners = [];

  /* ---------------- utilidades ---------------- */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function ahora() { return new Date().toISOString(); }
  function leerFilas() {
    try { return JSON.parse(localStorage.getItem(CLAVE_FILAS) || "null"); } catch (e) { return null; }
  }
  function guardarFilas(f) { localStorage.setItem(CLAVE_FILAS, JSON.stringify(f)); }
  function sesionActual() {
    try { return JSON.parse(localStorage.getItem(CLAVE_SESION) || "null"); } catch (e) { return null; }
  }
  function avisar(evento, sesion) {
    listeners.forEach(function (cb) { try { cb(evento, sesion); } catch (e) { console.error(e); } });
  }
  function err(msg, code) { return { message: msg, code: code || null }; }

  /* Primera vez: cargo data/properties.json como datos de ejemplo */
  var _semilla = null;
  function filas() {
    var f = leerFilas();
    if (f) return Promise.resolve(f);
    if (_semilla) return _semilla;
    _semilla = fetch("./data/properties.json").then(function (r) { return r.json(); })
      .catch(function () { return []; })
      .then(function (lista) {
        var base = new Date("2026-01-01T12:00:00Z").getTime();
        var out = (Array.isArray(lista) ? lista : []).map(function (p, i) {
          var imgs = Array.isArray(p.images) ? p.images.slice() : [];
          if (p.cover) { var k = imgs.indexOf(p.cover); if (k > -1) imgs.splice(k, 1); imgs.unshift(p.cover); }
          var t = new Date(base + i * 86400000).toISOString();
          return {
            id: uuid(), codigo: p.id, title: p.title || "", operation: p.operation || "Venta",
            type: p.type || "Casa", commune: p.commune || null, address: p.address || null,
            status: p.status || "Disponible",
            price_clp: p.priceCLP != null ? p.priceCLP : null,
            price_uf: p.priceUF != null ? p.priceUF : null,
            summary: p.summary || null, description: p.description || null,
            bedrooms: p.bedrooms != null ? p.bedrooms : null,
            bathrooms: p.bathrooms != null ? p.bathrooms : null,
            surface: p.surface != null ? p.surface : null,
            terrain: p.terrain != null ? p.terrain : null,
            images: imgs, visible: true, orden: 0, created_at: t, updated_at: t
          };
        });
        guardarFilas(out);
        return out;
      });
    return _semilla;
  }

  var ESTADOS = ["Disponible", "Reservada", "Vendida", "Arrendada"];
  var OPERACIONES = ["Venta", "Arriendo"];

  function validar(fila) {
    if (fila.operation != null && OPERACIONES.indexOf(fila.operation) === -1)
      return err('new row for relation "propiedades" violates check constraint "propiedades_operation_check"', "23514");
    if (fila.status != null && ESTADOS.indexOf(fila.status) === -1)
      return err('new row for relation "propiedades" violates check constraint "propiedades_status_check"', "23514");
    if (fila.title != null && !String(fila.title).trim())
      return err('null value in column "title" violates not-null constraint', "23502");
    return null;
  }

  /* ---------------- constructor de consultas ---------------- */
  function Consulta(tabla) {
    this.tabla = tabla; this.op = "select"; this.filtros = []; this.ordenes = [];
    this.payload = null; this.retornar = false; this.unico = false; this.head = false; this.contar = false;
  }
  Consulta.prototype.select = function (cols, opts) {
    if (this.op === "select") { this.head = !!(opts && opts.head); this.contar = !!(opts && opts.count); }
    else this.retornar = true;
    return this;
  };
  Consulta.prototype.insert = function (p) { this.op = "insert"; this.payload = p; return this; };
  Consulta.prototype.update = function (p) { this.op = "update"; this.payload = p; return this; };
  Consulta.prototype.delete = function ()  { this.op = "delete"; return this; };
  Consulta.prototype.eq = function (c, v) { this.filtros.push([c, v]); return this; };
  Consulta.prototype.order = function (c, o) { this.ordenes.push([c, !o || o.ascending !== false]); return this; };
  Consulta.prototype.single = function () { this.unico = true; return this; };
  Consulta.prototype.then = function (ok, ko) { return this._correr().then(ok, ko); };

  Consulta.prototype._correr = function () {
    var self = this;
    if (this.tabla !== "propiedades")
      return Promise.resolve({ data: null, error: err('relation "' + this.tabla + '" does not exist', "42P01") });
    var autenticado = !!sesionActual();

    return filas().then(function (todas) {
      function pasa(f) {
        return self.filtros.every(function (ft) { return String(f[ft[0]]) === String(ft[1]); });
      }

      if (self.op === "select") {
        var vis = todas.filter(pasa);
        // RLS: el anónimo solo ve las visibles
        if (!autenticado) vis = vis.filter(function (f) { return f.visible === true; });
        self.ordenes.slice().reverse().forEach(function (o) {
          vis.sort(function (a, b) {
            var x = a[o[0]], y = b[o[0]];
            if (x === y) return 0;
            if (x == null) return 1; if (y == null) return -1;
            return (x < y ? -1 : 1) * (o[1] ? 1 : -1);
          });
        });
        if (self.head) return { data: null, count: self.contar ? vis.length : null, error: null };
        if (self.unico) return vis.length === 1
          ? { data: vis[0], error: null }
          : { data: null, error: err("JSON object requested, multiple (or no) rows returned", "PGRST116") };
        return { data: vis, count: self.contar ? vis.length : null, error: null };
      }

      if (!autenticado)
        return { data: null, error: err('new row violates row-level security policy for table "propiedades"', "42501") };

      if (self.op === "insert") {
        var nueva = Object.assign({
          id: uuid(), operation: "Venta", type: "Casa", status: "Disponible", images: [],
          visible: true, orden: 0, created_at: ahora(), updated_at: ahora()
        }, self.payload);
        var e = validar(nueva); if (e) return { data: null, error: e };
        if (!nueva.codigo) return { data: null, error: err('null value in column "codigo" violates not-null constraint', "23502") };
        if (todas.some(function (f) { return f.codigo === nueva.codigo; }))
          return { data: null, error: err('duplicate key value violates unique constraint "propiedades_codigo_key"', "23505") };
        todas.push(nueva); guardarFilas(todas);
        return { data: self.retornar ? (self.unico ? nueva : [nueva]) : null, error: null };
      }

      if (self.op === "update") {
        var e2 = validar(self.payload); if (e2) return { data: null, error: e2 };
        var tocadas = [];
        todas.forEach(function (f) {
          if (pasa(f)) { Object.assign(f, self.payload, { updated_at: ahora() }); tocadas.push(f); }
        });
        guardarFilas(todas);
        if (self.unico && tocadas.length !== 1)
          return { data: null, error: err("JSON object requested, multiple (or no) rows returned", "PGRST116") };
        return { data: self.retornar ? (self.unico ? tocadas[0] : tocadas) : null, error: null };
      }

      if (self.op === "delete") {
        var quedan = todas.filter(function (f) { return !pasa(f); });
        guardarFilas(quedan);
        return { data: null, error: null };
      }
      return { data: null, error: err("operación no soportada en el simulador") };
    });
  };

  /* ---------------- cliente ---------------- */
  function createClient() {
    return {
      auth: {
        getSession: function () { return Promise.resolve({ data: { session: sesionActual() }, error: null }); },
        onAuthStateChange: function (cb) {
          listeners.push(cb);
          return { data: { subscription: { unsubscribe: function () {
            listeners = listeners.filter(function (x) { return x !== cb; });
          } } } };
        },
        signInWithPassword: function (c) {
          return new Promise(function (resolve) {
            setTimeout(function () {
              if (!c || !c.email || c.password !== PASSWORD_OK)
                return resolve({ data: { session: null, user: null }, error: err("Invalid login credentials") });
              var s = { access_token: "mock", user: { id: "mock-user", email: c.email } };
              localStorage.setItem(CLAVE_SESION, JSON.stringify(s));
              avisar("SIGNED_IN", s);
              resolve({ data: { session: s, user: s.user }, error: null });
            }, 150);
          });
        },
        signOut: function () {
          localStorage.removeItem(CLAVE_SESION);
          avisar("SIGNED_OUT", null);
          return Promise.resolve({ error: null });
        },
        resetPasswordForEmail: function (email) {
          localStorage.setItem(CLAVE_RESET, email || "");
          return Promise.resolve({ data: {}, error: null });
        },
        updateUser: function (attrs) {
          if (!sesionActual()) return Promise.resolve({ data: null, error: err("Auth session missing!") });
          if (attrs && attrs.password && attrs.password.length < 6)
            return Promise.resolve({ data: null, error: err("Password should be at least 6 characters.") });
          return Promise.resolve({ data: { user: sesionActual().user }, error: null });
        }
      },
      from: function (tabla) { return new Consulta(tabla); },
      rpc: function (fn) {
        if (fn !== "siguiente_codigo")
          return Promise.resolve({ data: null, error: err("function " + fn + " does not exist", "42883") });
        return filas().then(function (todas) {
          var max = 0;
          todas.forEach(function (f) {
            var n = parseInt(String(f.codigo || "").replace(/\D/g, ""), 10);
            if (!isNaN(n) && n > max) max = n;
          });
          return { data: "AM-" + String(max + 1).padStart(3, "0"), error: null };
        });
      },
      storage: {
        from: function (bucket) {
          return {
            upload: function (ruta, blob) {
              if (!sesionActual())
                return Promise.resolve({ data: null, error: err("new row violates row-level security policy", "42501") });
              return fetch(RUTA_STORE + bucket + "/" + ruta, { method: "PUT", body: blob })
                .then(function (r) {
                  if (!r.ok) return { data: null, error: err("No se pudo guardar en el servidor de pruebas (" + r.status + ")") };
                  return { data: { path: ruta }, error: null };
                })
                .catch(function (e) { return { data: null, error: err(e.message) }; });
            },
            getPublicUrl: function (ruta) {
              return { data: { publicUrl: location.origin + PREFIJO_PUB + ruta } };
            },
            remove: function (rutas) {
              return Promise.all((rutas || []).map(function (r) {
                return fetch(RUTA_STORE + bucket + "/" + r, { method: "DELETE" }).catch(function () {});
              })).then(function () { return { data: rutas, error: null }; });
            }
          };
        }
      }
    };
  }

  window.supabase = { createClient: createClient, __mock: true };
  console.info("[AYM] Simulador de Supabase activo (solo pruebas). Contraseña: " + PASSWORD_OK);
})();
