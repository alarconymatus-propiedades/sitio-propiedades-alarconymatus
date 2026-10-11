/* ============================================================
   AYM Propiedades — Configuración
   ------------------------------------------------------------
   REEMPLAZAR los dos valores de SUPABASE con los de tu proyecto:
     Supabase -> Settings -> API
       * Project URL   -> SUPABASE_URL
       * anon public   -> SUPABASE_ANON_KEY

   La llave "anon" es PÚBLICA por diseño y puede vivir en el HTML
   sin riesgo: quien protege los datos son las políticas RLS de
   supabase/schema.sql, no el secreto de esta llave.

   NUNCA pegar aquí la llave "service_role".
   ============================================================ */
window.AYM_CONFIG = {
  SUPABASE_URL:      "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "PEGAR-AQUI-LA-LLAVE-ANON-PUBLIC",

  // Mientras Supabase no esté configurado, el sitio sigue
  // funcionando leyendo data/properties.json.
  FALLBACK_JSON: "./data/properties.json",

  // Librería de Supabase (se carga solo cuando hace falta). El hash SRI
  // garantiza que el navegador rechace el archivo si el CDN lo altera.
  // Si cambias la versión, recalcula el hash:
  //   curl -sL <URL> | openssl dgst -sha384 -binary | openssl base64 -A
  SDK_URL: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js",
  SDK_SRI: "sha384-GFr3yTh5lJznCbZfpTtXnwboFsxqtTQoeTZCRHhE0579KrRmlCzen5AA8ohaB5ug",

  // Datos de contacto que usan el panel (para armar avisos) y el sitio.
  SITIO: {
    nombre:    "AYM Propiedades",
    dominio:   "alarconymatuspropiedades.cl",
    url:       "https://www.alarconymatuspropiedades.cl",
    telefonos: ["+56 9 9000 3574", "+56 9 9682 5523"],
    email:     "alarconymatus@gmail.com",
    instagram: "@alarconymatus.propiedades",
    facebook:  "AYM Propiedades"
  }
};

(function () {
  var c = window.AYM_CONFIG;

  /* ---- Modo de prueba: solo en localhost y con ?mock=1 en la URL ----
     Usa assets/dev/mock-supabase.js en vez de Supabase. Nunca se activa
     en el dominio real. Ver scripts/servidor_pruebas.py. */
  var esLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  c.MOCK = esLocal && /[?&]mock=1(&|$)/.test(location.search);
  if (c.MOCK) {
    c.SUPABASE_URL = "http://simulador.local";
    c.SUPABASE_ANON_KEY = "simulador";
  }

  c.estaConfigurado = function () {
    return !!c.SUPABASE_URL &&
           c.SUPABASE_URL.indexOf("TU-PROYECTO") === -1 &&
           !!c.SUPABASE_ANON_KEY &&
           c.SUPABASE_ANON_KEY.indexOf("PEGAR-AQUI") === -1;
  };

  /* ---- Carga la librería de Supabase (o el simulador) una sola vez.
     Resuelve true si quedó disponible window.supabase, false si no. */
  var _carga = null;
  c.cargarSdk = function () {
    if (_carga) return _carga;
    _carga = new Promise(function (resolve) {
      if (!c.estaConfigurado()) return resolve(false);
      if (window.supabase && window.supabase.createClient) return resolve(true);
      var s = document.createElement("script");
      s.src = c.MOCK ? "./assets/dev/mock-supabase.js" : c.SDK_URL;
      if (!c.MOCK && c.SDK_SRI) { s.integrity = c.SDK_SRI; s.crossOrigin = "anonymous"; }
      s.async = true;
      s.onload  = function () { resolve(!!(window.supabase && window.supabase.createClient)); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
    return _carga;
  };
})();
