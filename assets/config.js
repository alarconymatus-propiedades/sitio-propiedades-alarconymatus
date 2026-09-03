/* ============================================================
   AYM Propiedades — Configuración de Supabase
   ------------------------------------------------------------
   REEMPLAZAR los dos valores de abajo con los de tu proyecto:
     Supabase -> Settings -> API
       * Project URL   -> SUPABASE_URL
       * anon public   -> SUPABASE_ANON_KEY

   La llave "anon" es PÚBLICA por diseño y puede vivir en el
   HTML sin riesgo: quien protege los datos son las políticas
   RLS de supabase/schema.sql, no el secreto de esta llave.

   NUNCA pegar aquí la llave "service_role".
   ============================================================ */
window.AYM_CONFIG = {
  SUPABASE_URL:      "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "PEGAR-AQUI-LA-LLAVE-ANON-PUBLIC",

  // Mientras Supabase no esté configurado, el sitio sigue
  // funcionando leyendo data/properties.json.
  FALLBACK_JSON: "./data/properties.json"
};

window.AYM_CONFIG.estaConfigurado = function () {
  var c = window.AYM_CONFIG;
  return !!c.SUPABASE_URL &&
         c.SUPABASE_URL.indexOf("TU-PROYECTO") === -1 &&
         !!c.SUPABASE_ANON_KEY &&
         c.SUPABASE_ANON_KEY.indexOf("PEGAR-AQUI") === -1;
};
