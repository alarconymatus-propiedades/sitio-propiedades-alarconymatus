/* ============================================================
   AYM Propiedades — Panel de administración
   ------------------------------------------------------------
   Todo lo que necesita una persona sin conocimientos técnicos
   para publicar, editar, compartir, ocultar y dar de baja
   propiedades, desde el celular o el computador.
   ============================================================ */
(function () {
  "use strict";

  var cfg   = window.AYM_CONFIG;
  var SITIO = (cfg && cfg.SITIO) || {};
  var sb    = null;

  // Estado en memoria
  var propiedades    = [];     // todas las filas de la tabla
  var editando       = null;   // fila que se está editando (null = nueva)
  var fotos          = [];     // [{url, path}]  la primera es la portada
  var fotosBorrar    = [];     // paths de storage a eliminar al guardar
  var fotosListas    = null;   // Files descargados para "enviar fotos"
  var operacion      = "Venta";
  var estado         = "Disponible";
  var codigoNuevo    = null;   // código reservado para la propiedad nueva
  var sucio          = false;  // hay cambios sin guardar
  var subidasEnCurso = 0;
  var modoRecuperar  = /type=recovery/.test(location.hash);
  var sesionEditor   = 0;      // cambia cada vez que se abre/cierra el editor (descarta subidas tardías)
  var codigoPromesa  = null;   // RPC en vuelo que reserva el código de la propiedad nueva
  var wakeLock       = null;   // mantiene la pantalla encendida mientras suben fotos
  var esAdmin        = true;   // se confirma con es_admin() al entrar
  var guardando      = false;  // hay un guardado en vuelo: no se puede salir del editor
  var idNuevo        = null;   // uuid de la propiedad nueva (guardar dos veces no la duplica)
  var _ignorarPop    = false;  // el próximo popstate lo provocamos nosotros

  var $ = function (id) { return document.getElementById(id); };

  /* =========================================================
     Utilidades
     ========================================================= */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function aviso(donde, texto, tipo) {
    var el = $(donde);
    if (!el) return;
    if (!texto) { el.innerHTML = ""; return; }
    el.innerHTML = '<div class="aviso aviso-' + (tipo || "info") + '">' + esc(texto) + "</div>";
  }
  // Igual que aviso() pero el contenido ya viene escapado y puede traer enlaces.
  function avisoHtml(donde, html, tipo) {
    var el = $(donde);
    if (!el) return;
    el.innerHTML = '<div class="aviso aviso-' + (tipo || "info") + '">' + html + "</div>";
  }

  var _toastTimer = null;
  function toast(texto) {
    var t = $("toast");
    t.textContent = texto;
    t.classList.remove("oculto");
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { t.classList.add("oculto"); }, 2800);
  }

  function fmtCLP(n) {
    try {
      return new Intl.NumberFormat("es-CL", {
        style: "currency", currency: "CLP", maximumFractionDigits: 0
      }).format(n);
    } catch (e) { return "$" + n; }
  }
  function fmtUF(n) {
    return "UF " + Number(n).toLocaleString("es-CL", { maximumFractionDigits: 2 });
  }
  function precioTexto(p) {
    if (p.price_uf)  return fmtUF(p.price_uf);
    if (p.price_clp) return fmtCLP(p.price_clp) + (p.operation === "Arriendo" ? " al mes" : "");
    return "Precio a convenir";
  }

  // Traduce los errores de Supabase a español entendible.
  function mensajeError(err) {
    var m = (err && (err.message || err.error_description)) || String(err);
    if (/Invalid login credentials/i.test(m))
      return "El correo o la contraseña no son correctos.";
    if (/Email not confirmed/i.test(m))
      return "La cuenta todavía no está confirmada. Revisa el correo de confirmación.";
    if (/Password should be at least/i.test(m))
      return "La contraseña es muy corta.";
    if (/rate limit|you can only request this after/i.test(m))
      return "Demasiados intentos seguidos. Espera un minuto y vuelve a probar.";
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(m))
      return "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.";
    if (/duplicate key|already exists/i.test(m))
      return "Ya existe una propiedad con ese código.";
    if (/row-level security|permission denied|42501/i.test(m))
      return "No tienes permiso para hacer eso. Cierra sesión y vuelve a entrar.";
    if (/JWT|token is expired|session missing|Auth session/i.test(m))
      return "Tu sesión expiró. Vuelve a iniciar sesión (tus cambios siguen en pantalla).";
    if (/not authorized|email_address_not_authorized/i.test(m))
      return "No se pudo enviar el correo. Pídele a Nelson que te cambie la contraseña.";
    if (/permission denied for table/i.test(m))
      return "Falta terminar de preparar la base de datos (permisos). Avísale a Nelson.";
    if (/invalid input syntax for type integer/i.test(m))
      return "Dormitorios y baños van en números enteros, sin decimales.";
    if (/PGRST116|multiple \(or no\) rows/i.test(m))
      return "Esta propiedad ya no existe (quizás se borró desde otro dispositivo). Vuelve a la lista.";
    if (/Bucket not found|relation .* does not exist|42P01/i.test(m))
      return "Falta preparar la base de datos: hay que ejecutar supabase/setup.sql.";
    if (/too large|exceeded the maximum allowed size|413/i.test(m))
      return "La foto es demasiado pesada.";
    if (/mime type .* is not supported/i.test(m))
      return "Ese tipo de archivo no está permitido. Usa fotos JPG o PNG.";
    return m;
  }

  // Promesa con tiempo máximo (las subidas no pueden quedarse colgadas para siempre).
  function conTimeout(promesa, ms, mensaje) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error(mensaje || "Se agotó el tiempo de espera")); }, ms);
      Promise.resolve(promesa).then(function (v) { clearTimeout(t); resolve(v); },
                                    function (e) { clearTimeout(t); reject(e); });
    });
  }

  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return copiarViejo(texto); });
    }
    return Promise.resolve(copiarViejo(texto));
  }
  function copiarViejo(texto) {
    var ta = document.createElement("textarea");
    ta.value = texto; ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.top = "-1000px";
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function urlFicha(codigo) {
    return "./property.html?" + (cfg.MOCK ? "mock=1&" : "") + "id=" + encodeURIComponent(codigo);
  }
  function urlPublica(codigo) {
    var base = cfg.MOCK ? location.origin : (SITIO.url || location.origin);
    return base + "/property.html?id=" + encodeURIComponent(codigo);
  }

  /* =========================================================
     Confirmación (reemplaza al confirm() del navegador)
     ========================================================= */
  var _confirmarCb = null, _confirmarNo = null;
  // suave=true: el botón de confirmar es naranjo (acción normal), no rojo (destructiva).
  // textoNo: texto del botón de la izquierda (por defecto «Cancelar»).
  function confirmar(titulo, texto, textoBoton, cb, cbNo, suave, textoNo) {
    $("modalTitulo").textContent = titulo;
    $("modalTexto").textContent  = texto;
    $("modalSi").textContent     = textoBoton;
    $("modalNo").textContent     = textoNo || "Cancelar";
    $("modalSi").className       = "btn " + (suave ? "btn-primario" : "btn-peligro");
    _confirmarCb = cb; _confirmarNo = cbNo || null;
    $("modal").classList.remove("oculto");
    $("modalNo").focus();
  }
  $("modalNo").onclick = function () {
    $("modal").classList.add("oculto");
    var no = _confirmarNo; _confirmarCb = null; _confirmarNo = null;
    if (no) no();
  };
  $("modalSi").onclick = function () {
    $("modal").classList.add("oculto");
    var cb = _confirmarCb; _confirmarCb = null; _confirmarNo = null;
    if (cb) cb();
  };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !$("modal").classList.contains("oculto")) $("modalNo").click();
  });

  /* =========================================================
     Arranque
     ========================================================= */
  function arrancar() {
    if (!cfg || !cfg.estaConfigurado()) {
      aviso("avisoLogin",
        "El panel todavía no está conectado a la base de datos. " +
        "Falta completar assets/config.js con la URL y la llave del proyecto Supabase.",
        "warn");
      $("btnEntrar").disabled = true;
      return;
    }
    cfg.cargarSdk().then(function (ok) {
      if (!ok) {
        aviso("avisoLogin", "No se pudo cargar la librería de Supabase. Revisa tu conexión a internet y recarga la página.", "error");
        $("btnEntrar").disabled = true;
        return;
      }
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      chequearConexion();

      sb.auth.onAuthStateChange(function (evento, sesion) {
        if (evento === "PASSWORD_RECOVERY") { modoRecuperar = true; mostrarClave(); return; }
        if (evento === "SIGNED_OUT" || (!sesion && evento !== "INITIAL_SESSION")) {
          var enEdicion = !$("vistaEditor").classList.contains("oculto");
          mostrarLogin();
          if (enEdicion) aviso("avisoLogin", "Tu sesión se cerró. Vuelve a entrar: lo que estabas escribiendo quedó guardado como borrador.", "info");
        }
      });

      if (modoRecuperar) { mostrarClave(); return; }

      // Enlace del correo vencido o ya usado
      if (/error_code=otp_expired|error=access_denied/.test(location.hash)) {
        aviso("avisoLogin", "Ese enlace ya venció o ya se usó. Escribe tu correo y pide uno nuevo con «¿Olvidaste tu contraseña?».", "warn");
        if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
      }

      sb.auth.getSession().then(function (res) {
        if (res.data && res.data.session) entrarAlPanel(res.data.session);
      });
    });
  }

  function chequearConexion() {
    var el = $("estadoConexion");
    if (cfg.MOCK) { el.textContent = "Modo de prueba: simulador local, sin datos reales."; el.className = "conexion"; return; }
    el.textContent = "Comprobando conexión…"; el.className = "conexion";
    // GET (no HEAD): así, si algo falla, llega el detalle del error.
    conTimeout(sb.from("propiedades").select("id", { count: "exact" }).eq("visible", true).range(0, 0), 12000)
      .then(function (res) {
        if (res.error) throw res.error;
        var n = res.count || 0;
        el.textContent = "Conectado · " + n + " propiedad" + (n === 1 ? "" : "es") + " publicada" + (n === 1 ? "" : "s");
        el.className = "conexion ok";
      })
      .catch(function (err) {
        var m = ((err && err.message) || "") + " " + ((err && err.code) || "");
        el.className = "conexion mal";
        if (/relation|does not exist|42P01|PGRST205|schema cache/i.test(m))
          el.textContent = "Conectado, pero falta crear la tabla: ejecuta supabase/setup.sql en Supabase.";
        else if (/permission denied for table|42501/i.test(m))
          el.textContent = "Conectado, pero faltan permisos de la tabla: vuelve a ejecutar supabase/setup.sql en Supabase.";
        else if (/Invalid API key|JWT|401|apikey/i.test(m))
          el.textContent = "La llave de assets/config.js no es válida. Copia de nuevo la «Publishable key» (sb_publishable_…).";
        else
          el.textContent = "No se pudo conectar a la base de datos. Revisa la URL de assets/config.js y tu internet.";
      });
  }

  function mostrarLogin() {
    $("pantallaApp").classList.add("oculto");
    $("pantallaClave").classList.add("oculto");
    $("pantallaLogin").classList.remove("oculto");
  }
  function mostrarClave() {
    $("pantallaApp").classList.add("oculto");
    $("pantallaLogin").classList.add("oculto");
    $("pantallaClave").classList.remove("oculto");
    $("clave1").focus();
  }
  function entrarAlPanel(sesion) {
    $("pantallaLogin").classList.add("oculto");
    $("pantallaClave").classList.add("oculto");
    $("pantallaApp").classList.remove("oculto");
    $("usuarioActual").textContent = (sesion && sesion.user && sesion.user.email) || "";
    cargarPropiedades();
    // Tener cuenta no basta: el correo tiene que estar en la tabla administradores.
    sb.rpc("es_admin").then(function (r) {
      if (!r.error && r.data === false) {
        esAdmin = false;
        aviso("avisoLista",
          "Tu cuenta entró, pero todavía no está autorizada para publicar. Pídele a Nelson que agregue " +
          "tu correo en la lista de administradores de Supabase.", "error");
        $("btnNueva").disabled = true;
      } else {
        esAdmin = true;
        $("btnNueva").disabled = false;
      }
    }, function () {});
  }

  /* =========================================================
     Iniciar / cerrar sesión / contraseña
     ========================================================= */
  $("btnOjo").onclick = function () {
    var p = $("password");
    p.type = p.type === "password" ? "text" : "password";
  };

  $("formLogin").onsubmit = function (e) {
    e.preventDefault();
    if (!sb) return;
    var email = $("email").value.trim(), pass = $("password").value;
    if (!email || !pass) { aviso("avisoLogin", "Escribe tu correo y tu contraseña.", "error"); return; }
    var btn = $("btnEntrar");
    btn.disabled = true; btn.textContent = "Entrando…";
    aviso("avisoLogin", "");

    conTimeout(sb.auth.signInWithPassword({ email: email, password: pass }), 20000)
      .then(function (res) {
        if (res.error) throw res.error;
        $("password").value = "";
        entrarAlPanel(res.data.session);
      })
      .catch(function (err) { aviso("avisoLogin", mensajeError(err), "error"); })
      .then(function () { btn.disabled = false; btn.textContent = "Entrar"; });
  };

  $("btnOlvide").onclick = function () {
    if (!sb) return;
    var email = $("email").value.trim();
    if (!email) {
      aviso("avisoLogin", "Escribe tu correo arriba y vuelve a apretar «¿Olvidaste tu contraseña?».", "info");
      $("email").focus();
      return;
    }
    // Destino fijo: tiene que coincidir con «Redirect URLs» en Supabase.
    var destino = cfg.MOCK ? location.origin + location.pathname : (SITIO.url || location.origin) + "/admin.html";
    sb.auth.resetPasswordForEmail(email, { redirectTo: destino }).then(function (res) {
      if (res.error) { aviso("avisoLogin", mensajeError(res.error), "error"); return; }
      aviso("avisoLogin", "Si ese correo tiene cuenta, te llegará un mensaje con un enlace para crear una contraseña nueva. " +
        "Revisa también la carpeta de spam. Si en 10 minutos no llega nada, pídele a Nelson que te la cambie.", "ok");
    });
  };

  $("formClave").onsubmit = function (e) {
    e.preventDefault();
    var a = $("clave1").value, b = $("clave2").value;
    if (a.length < 8) { aviso("avisoClave", "La contraseña debe tener al menos 8 caracteres.", "error"); return; }
    if (a !== b)      { aviso("avisoClave", "Las dos contraseñas no coinciden.", "error"); return; }
    var btn = $("btnGuardarClave");
    btn.disabled = true; btn.textContent = "Guardando…";
    sb.auth.updateUser({ password: a }).then(function (res) {
      btn.disabled = false; btn.textContent = "Guardar contraseña";
      if (res.error) { aviso("avisoClave", mensajeError(res.error), "error"); return; }
      modoRecuperar = false;
      $("clave1").value = ""; $("clave2").value = "";
      if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
      sb.auth.getSession().then(function (s) {
        if (s.data && s.data.session) { entrarAlPanel(s.data.session); toast("Contraseña guardada."); }
        else { mostrarLogin(); aviso("avisoLogin", "Contraseña guardada. Ahora entra con ella.", "ok"); }
      });
    });
  };

  $("btnSalir").onclick = function () {
    var texto = hayCambiosSinGuardar()
      ? "Tienes cambios sin guardar que se perderán. ¿Quieres salir igual?"
      : "¿Quieres salir del panel?";
    confirmar("Cerrar sesión", texto, "Sí, salir", function () {
      if (!$("vistaEditor").classList.contains("oculto")) cerrarEditor(true);
      // scope local: cerrar sesión aquí no la cierra en el celular.
      sb.auth.signOut({ scope: "local" }).then(mostrarLogin);
    });
  };

  /* =========================================================
     Lista
     ========================================================= */
  function cargarPropiedades() {
    $("lista").innerHTML = '<div class="cargando">Cargando propiedades…</div>';
    conTimeout(sb.from("propiedades").select("*").order("created_at", { ascending: false }), 20000)
      .then(function (res) {
        if (res.error) throw res.error;
        propiedades = res.data || [];
        dibujarLista();
      })
      .catch(function (err) {
        aviso("avisoLista", "No se pudieron cargar las propiedades: " + mensajeError(err), "error");
        $("lista").innerHTML = '<div class="vacio"><button class="btn" id="btnReintentar">Reintentar</button></div>';
        $("btnReintentar").onclick = cargarPropiedades;
      });
  }

  function dibujarLista() {
    var q      = $("buscar").value.toLowerCase().trim();
    var filtro = $("filtroEstado").value;

    var vista = propiedades.filter(function (p) {
      if (filtro === "visibles" && !p.visible) return false;
      if (filtro === "ocultas"  &&  p.visible) return false;
      if (filtro && filtro !== "visibles" && filtro !== "ocultas" && p.status !== filtro) return false;
      if (!q) return true;
      return ((p.title || "") + " " + (p.commune || "") + " " + (p.codigo || "") + " " +
              (p.type || "") + " " + (p.address || "")).toLowerCase().indexOf(q) !== -1;
    });

    var publicadas = propiedades.filter(function (p) { return p.visible; }).length;
    $("contador").textContent = propiedades.length === 0 ? "" :
      vista.length + " de " + propiedades.length + " propiedades · " + publicadas + " publicada" +
      (publicadas === 1 ? "" : "s") + " en el sitio";

    if (!propiedades.length) {
      $("lista").innerHTML =
        '<div class="vacio"><p style="font-size:2.2rem;margin:0">🏠</p>' +
        "<p><b>Todavía no hay propiedades.</b><br>" +
        'Aprieta «Publicar nueva propiedad» para crear la primera.</p></div>';
      return;
    }
    if (!vista.length) {
      $("lista").innerHTML = '<div class="vacio">No hay propiedades que coincidan con la búsqueda.</div>';
      return;
    }

    $("lista").innerHTML = vista.map(function (p) {
      var imgs  = Array.isArray(p.images) ? p.images : [];
      var cover = imgs[0];
      var foto  = cover
        ? '<img class="prop-foto" src="' + esc(cover) + '" alt="" loading="lazy">'
        : '<div class="prop-sinfoto">Sin fotos</div>';
      var id = esc(p.id);
      var siguiente = (p.operation === "Arriendo") ? "Arrendada" : "Vendida";
      var textoBaja = (p.operation === "Arriendo") ? "Marcar arrendada" : "Marcar vendida";

      return '' +
      '<div class="prop' + (p.visible ? "" : " no-visible") + '" data-codigo="' + esc(p.codigo) + '">' +
        foto +
        '<div class="prop-info">' +
          "<h3>" + esc(p.title || "(sin título)") +
            ' <span class="prop-codigo">· ' + esc(p.codigo) + "</span></h3>" +
          '<div class="prop-precio">' + esc(precioTexto(p)) + "</div>" +
          '<div class="prop-etiquetas">' +
            '<span class="et et-op">' + esc(p.operation) + "</span>" +
            '<span class="et et-' + esc(p.status) + '">' + esc(p.status) + "</span>" +
            (p.commune ? '<span class="et et-op">' + esc(p.commune) + "</span>" : "") +
            '<span class="et et-op">' + imgs.length + " foto" + (imgs.length === 1 ? "" : "s") + "</span>" +
            (p.visible ? "" : '<span class="et et-oculta">Oculta del sitio</span>') +
          "</div>" +
          '<div class="prop-botones">' +
            '<button class="btn btn-chico btn-primario" data-accion="editar" data-id="' + id + '">Editar</button>' +
            '<button class="btn btn-chico" data-accion="compartir" data-id="' + id + '">Compartir</button>' +
            (p.visible
              ? '<a class="btn btn-chico" href="' + esc(urlFicha(p.codigo)) + '" target="_blank" rel="noopener">Ver en el sitio</a>'
              : "") +
            '<button class="btn btn-chico" data-accion="visible" data-id="' + id + '">' +
              (p.visible ? "Ocultar del sitio" : "Mostrar en el sitio") + "</button>" +
            (p.status === "Disponible"
              ? '<button class="btn btn-chico" data-accion="reservar" data-id="' + id + '">Marcar reservada</button>' +
                '<button class="btn btn-chico" data-accion="baja" data-id="' + id +
                  '" data-estado="' + siguiente + '">' + textoBaja + "</button>"
              : '<button class="btn btn-chico" data-accion="disponible" data-id="' + id + '">Volver a disponible</button>') +
          "</div>" +
        "</div>" +
      "</div>";
    }).join("");
  }

  function porId(id) {
    return propiedades.filter(function (x) { return x.id === id; })[0] || null;
  }

  // Un solo listener para todos los botones de la lista
  $("lista").onclick = function (e) {
    var b = e.target.closest("button[data-accion]");
    if (!b) return;
    var p = porId(b.dataset.id);
    if (!p) return;

    switch (b.dataset.accion) {
      case "editar":     abrirEditor(p); break;
      case "compartir":  abrirEditor(p, true); break;
      case "visible":    actualizar(p, { visible: !p.visible }, p.visible ? "ocultada del sitio" : "publicada en el sitio"); break;
      case "reservar":   actualizar(p, { status: "Reservada" }, "marcada como reservada"); break;
      case "disponible": actualizar(p, { status: "Disponible" }, "marcada como disponible"); break;
      case "baja":
        confirmar(
          b.dataset.estado === "Vendida" ? "Marcar como vendida" : "Marcar como arrendada",
          "«" + (p.title || p.codigo) + "» quedará marcada como " +
          b.dataset.estado.toLowerCase() + ". Seguirá visible en el sitio con ese cartel.\n\n" +
          "Si prefieres que no aparezca, usa además «Ocultar del sitio».",
          "Sí, marcar",
          function () { actualizar(p, { status: b.dataset.estado }, "marcada como " + b.dataset.estado.toLowerCase()); }
        );
        break;
    }
  };

  // Enlaces dentro de los avisos de la lista ("Compartir en redes" tras guardar)
  $("avisoLista").onclick = function (e) {
    var b = e.target.closest("[data-compartir]");
    if (!b) return;
    var p = porId(b.dataset.compartir);
    if (p) abrirEditor(p, true);
  };

  function actualizar(p, cambios, mensaje) {
    if (!esAdmin) { aviso("avisoLista", "Tu cuenta no está autorizada para hacer cambios. Avísale a Nelson.", "error"); return; }
    // .select(): si no se tocó ninguna fila (sin permiso, o la borraron en otro equipo) lo sabemos.
    conTimeout(sb.from("propiedades").update(cambios).eq("id", p.id).select("id"), 20000)
      .then(function (res) {
        if (res.error) throw res.error;
        if (!res.data || !res.data.length) throw new Error("PGRST116");
        Object.assign(p, cambios);
        dibujarLista();
        toast(p.codigo + " " + (mensaje || "guardada") + ".");
      })
      .catch(function (err) { aviso("avisoLista", "No se pudo guardar el cambio: " + mensajeError(err), "error"); });
  }

  $("buscar").oninput        = dibujarLista;
  $("filtroEstado").onchange = dibujarLista;

  /* =========================================================
     Editor
     ========================================================= */
  function seleccionar(contenedor, valor) {
    Array.prototype.forEach.call($(contenedor).children, function (b) {
      b.classList.toggle("activa", b.dataset.valor === valor);
    });
  }

  $("opsOperacion").onclick = function (e) {
    var b = e.target.closest(".opcion"); if (!b) return;
    operacion = b.dataset.valor; seleccionar("opsOperacion", operacion);
    marcarSucio(); actualizarPrecioPreview();
  };
  $("opsEstado").onclick = function (e) {
    var b = e.target.closest(".opcion"); if (!b) return;
    estado = b.dataset.valor; seleccionar("opsEstado", estado); marcarSucio();
  };

  function marcarSucio() { sucio = true; programarBorrador(); }
  function hayCambiosSinGuardar() {
    return !$("vistaEditor").classList.contains("oculto") && (sucio || subidasEnCurso > 0);
  }
  $("vistaEditor").addEventListener("input", marcarSucio);
  $("vistaEditor").addEventListener("change", marcarSucio);
  window.addEventListener("beforeunload", function (e) {
    if (hayCambiosSinGuardar()) { e.preventDefault(); e.returnValue = ""; }
  });
  // El botón/gesto "atrás" del celular no debe sacarla del panel a mitad de una edición:
  // abre el mismo diálogo que «Volver».
  window.addEventListener("popstate", function () {
    if (_ignorarPop) { _ignorarPop = false; return; }
    if ($("vistaEditor").classList.contains("oculto")) return;
    history.pushState({ editor: true }, "");
    $("btnCancelar").click();
  });

  function nuevoUuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }

  /* ---------- borrador automático (sobrevive a recargas y cierres) ---------- */
  var CLAVE_BORRADOR = "aym_borrador";
  var CAMPOS = ["fTitle", "fType", "fCommune", "fAddress", "fMoneda", "fPrecio", "fBedrooms",
                "fBathrooms", "fSurface", "fTerrain", "fSummary", "fDescription"];
  var _borradorTimer = null;
  function programarBorrador() {
    clearTimeout(_borradorTimer);
    _borradorTimer = setTimeout(guardarBorrador, 300);
  }
  function guardarBorrador() {
    // Solo si de verdad cambió algo: abrir una ficha y mirarla no debe pisar otro borrador.
    if ($("vistaEditor").classList.contains("oculto") || !sucio) return;
    try {
      localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({
        editandoId: editando ? editando.id : null,
        idNuevo: editando ? null : idNuevo,
        codigoNuevo: codigoNuevo, operacion: operacion, estado: estado, fotos: fotos,
        visible: $("fVisible").checked,
        campos: CAMPOS.reduce(function (o, id) { o[id] = $(id).value; return o; }, {})
      }));
    } catch (e) { /* localStorage lleno o bloqueado: seguimos sin borrador */ }
  }
  function leerBorrador() {
    try { return JSON.parse(localStorage.getItem(CLAVE_BORRADOR) || "null"); } catch (e) { return null; }
  }
  function borrarBorrador() {
    clearTimeout(_borradorTimer);
    try { localStorage.removeItem(CLAVE_BORRADOR); } catch (e) {}
  }
  // Borra el borrador solo si es de lo que se está editando ahora (no el de otra propiedad).
  function borrarBorradorPropio() {
    clearTimeout(_borradorTimer);
    var b = leerBorrador();
    if (b && (b.editandoId || null) === (editando ? editando.id : null)) borrarBorrador();
  }
  function fotosNuevasDe(lista) {
    // Fotos subidas a Storage en esta edición que la propiedad guardada no tiene.
    var originales = (editando && Array.isArray(editando.images)) ? editando.images : [];
    return (lista || []).filter(function (f) { return f && f.path && originales.indexOf(f.url) === -1; })
                        .map(function (f) { return f.path; });
  }
  function ofrecerBorrador() {
    var b = leerBorrador();
    if (!b || (b.editandoId || null) !== (editando ? editando.id : null)) return;
    var fotosB = Array.isArray(b.fotos) ? b.fotos : [];
    var titulo = (b.campos && b.campos.fTitle) || "(sin título)";
    confirmar("Tienes cambios sin guardar",
      "Quedó a medio hacer «" + titulo + "» con " + fotosB.length + " foto" + (fotosB.length === 1 ? "" : "s") +
      ". ¿Quieres seguir con eso?\n\nSi eliges «Empezar de cero», se borra lo que tenías a medio hacer, fotos incluidas.",
      "Sí, seguir",
      function () { restaurarBorrador(b); },
      function () {
        borrarBorrador();
        var huerfanas = fotosNuevasDe(fotosB);
        if (!huerfanas.length) return;
        // Si en realidad sí alcanzó a guardarse (se cortó internet justo al guardar),
        // esas fotos son de una propiedad publicada: no se tocan.
        if (!b.idNuevo) { borrarDeStorage(huerfanas); return; }
        sb.from("propiedades").select("id").eq("id", b.idNuevo).then(function (r) {
          if (!r.error && r.data && r.data.length === 0) borrarDeStorage(huerfanas);
        });
      },
      true,
      "Empezar de cero");
  }
  function restaurarBorrador(b) {
    CAMPOS.forEach(function (id) { if (b.campos && b.campos[id] != null) $(id).value = b.campos[id]; });
    fijarTipo(b.campos && b.campos.fType);
    operacion = b.operacion || operacion;
    estado    = b.estado || estado;
    if (!editando && b.codigoNuevo) {
      codigoNuevo = b.codigoNuevo;
      $("tituloEditor").textContent = "Nueva propiedad · " + codigoNuevo;
    }
    if (!editando && b.idNuevo) idNuevo = b.idNuevo;
    fotos = (Array.isArray(b.fotos) ? b.fotos : []).filter(function (f) { return f && f.url; });
    $("fVisible").checked = b.visible !== false;
    seleccionar("opsOperacion", operacion);
    seleccionar("opsEstado", estado);
    $("fMoneda").onchange();
    dibujarFotos();
    actualizarCompartir();
    sucio = true;
    toast("Listo, seguimos donde quedaste.");
  }

  function fijarTipo(t) {
    var sel = $("fType");
    var buscado = String(t || "").trim().toLowerCase();
    var op = Array.prototype.filter.call(sel.options, function (o) { return o.value.toLowerCase() === buscado; })[0];
    if (op) { sel.value = op.value; return; }
    if (!buscado) { sel.value = "Casa"; return; }
    var nuevo = document.createElement("option");
    nuevo.textContent = t; sel.appendChild(nuevo); sel.value = t;
  }

  function abrirEditor(p, irACompartir) {
    sesionEditor++;
    editando      = p || null;
    fotos         = [];
    fotosBorrar   = [];
    fotosListas   = null;
    codigoNuevo   = null;
    codigoPromesa = null;
    idNuevo       = p ? null : nuevoUuid();
    subidasEnCurso = 0;
    actualizarBotonGuardar();
    $("progreso").classList.add("oculto");
    aviso("avisoEditor", "");

    if (p) {
      $("tituloEditor").textContent = "Editar propiedad " + p.codigo;
      $("subEditor").textContent    = "Modifica lo que necesites y aprieta Guardar.";
      $("btnEliminar").classList.remove("oculto");

      $("fTitle").value       = p.title || "";
      fijarTipo(p.type);
      $("fCommune").value     = p.commune || "";
      $("fAddress").value     = p.address || "";
      $("fBedrooms").value    = p.bedrooms  != null ? p.bedrooms  : "";
      $("fBathrooms").value   = p.bathrooms != null ? p.bathrooms : "";
      $("fSurface").value     = p.surface   != null ? p.surface   : "";
      $("fTerrain").value     = p.terrain   != null ? p.terrain   : "";
      $("fSummary").value     = p.summary || "";
      $("fDescription").value = p.description || "";
      $("fVisible").checked   = p.visible !== false;

      if (p.price_uf) { $("fMoneda").value = "UF";  $("fPrecio").value = p.price_uf; }
      else            { $("fMoneda").value = "CLP"; $("fPrecio").value = p.price_clp || ""; }

      operacion = p.operation || "Venta";
      estado    = p.status || "Disponible";

      fotos = (Array.isArray(p.images) ? p.images : []).filter(Boolean).map(function (u) {
        return { url: u, path: pathDesdeUrl(u) };
      });
    } else {
      $("tituloEditor").textContent = "Nueva propiedad";
      $("subEditor").textContent    = "Completa los datos y sube las fotos. Puedes guardarla oculta y publicarla después.";
      $("btnEliminar").classList.add("oculto");

      ["fTitle","fCommune","fAddress","fBedrooms","fBathrooms","fSurface",
       "fTerrain","fSummary","fDescription","fPrecio"].forEach(function (id) { $(id).value = ""; });
      fijarTipo("Casa");
      $("fMoneda").value    = "CLP";
      $("fVisible").checked = true;
      operacion = "Venta";
      estado    = "Disponible";

      // Reservamos el código (AM-015, AM-016…) antes de subir fotos, así
      // quedan guardadas en la carpeta correcta desde el primer momento.
      var gen = sesionEditor;
      codigoPromesa = conTimeout(sb.rpc("siguiente_codigo"), 15000).then(function (r) {
        if (gen !== sesionEditor) return null;
        if (!r.error && r.data) {
          codigoNuevo = r.data;
          $("tituloEditor").textContent = "Nueva propiedad · " + r.data;
        }
        return codigoNuevo;
      }, function () { return null; });
    }

    seleccionar("opsOperacion", operacion);
    seleccionar("opsEstado", estado);
    $("fMoneda").onchange();
    actualizarPrecioPreview();
    dibujarFotos();
    actualizarCompartir();
    sucio = false;

    $("vistaLista").classList.add("oculto");
    $("vistaEditor").classList.remove("oculto");
    if (!(history.state && history.state.editor)) history.pushState({ editor: true }, "");
    if (irACompartir) {
      $("grupoCompartir").scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo(0, 0);
    }
    ofrecerBorrador();
  }

  $("btnNueva").onclick    = function () { abrirEditor(null); };
  $("btnCancelar").onclick = function () {
    if (guardando) { toast("Espera un momento, se está guardando…"); return; }
    if (!hayCambiosSinGuardar()) { cerrarEditor(); return; }
    confirmar("Salir sin guardar", "Se perderán los cambios que no hayas guardado. ¿Seguro?", "Sí, salir sin guardar",
      function () { cerrarEditor(true); });
  };

  function cerrarEditor(descartar) {
    if (descartar) {
      // Las fotos que subió en esta edición y no guardó no deben quedar botadas en Storage.
      borrarDeStorage(fotosNuevasDe(fotos));
      sucio = false;
    }
    borrarBorradorPropio();
    sesionEditor++;
    subidasEnCurso = 0; actualizarBotonGuardar(); soltarPantalla();
    $("progreso").classList.add("oculto");
    editando = null; codigoNuevo = null; codigoPromesa = null; fotosListas = null; idNuevo = null;
    fotos = []; fotosBorrar = [];
    $("vistaEditor").classList.add("oculto");
    $("vistaLista").classList.remove("oculto");
    // Sacamos del historial la entrada que agregó abrirEditor, para que el
    // siguiente «atrás» del celular haga lo que ella espera.
    if (history.state && history.state.editor) { _ignorarPop = true; history.back(); }
    window.scrollTo(0, 0);
  }

  /* ---------- título sugerido ---------- */
  function tituloSugerido() {
    var tipo   = $("fType").value;
    var comuna = $("fCommune").value.trim();
    var sector = $("fAddress").value.trim();
    var lugar  = sector || comuna;
    if (sector && comuna && sector.toLowerCase().indexOf(comuna.toLowerCase()) === -1) lugar = sector + ", " + comuna;
    var verbo  = operacion === "Arriendo" ? "Arriendo" : "Vendo";
    var precio = precioActual();
    var t = verbo + " " + tipo + (lugar ? " en " + lugar : "");
    if (precio) t += " – " + precio;
    return t;
  }
  $("btnSugerirTitulo").onclick = function () {
    $("fTitle").value = tituloSugerido();
    marcarSucio();
    $("fTitle").focus();
  };

  /* ---------- precio ---------- */
  function num(id) {
    var v = $(id).value.trim();
    if (v === "") return null;
    // acepta "150.000.000", "150000000", "$ 150.000.000", "UF 3.200", "3200,5",
    // "3.200,50" y "1,500,000"
    v = v.replace(/[^\d.,-]/g, "");
    if (!/\d/.test(v)) return null;
    var comas = (v.match(/,/g) || []).length;
    if (comas > 1) v = v.replace(/,/g, "");
    else if (comas === 1) v = v.replace(/\./g, "").replace(",", ".");
    else if ((v.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(v)) v = v.replace(/\./g, "");
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  // true si el campo está vacío o tiene un número entero >= 0
  function enteroValido(id) {
    if (!$(id).value.trim()) return true;
    var n = num(id);
    return n != null && n >= 0 && Math.floor(n) === n;
  }
  function precioActual() {
    var n = num("fPrecio");
    if (n == null || n <= 0) return "";
    return $("fMoneda").value === "UF" ? fmtUF(n) : fmtCLP(n);
  }
  function actualizarPrecioPreview() {
    var crudo = $("fPrecio").value.trim();
    if (!crudo) { $("precioPreview").textContent = ""; return; }
    var n = num("fPrecio");
    if (n == null || n <= 0) { $("precioPreview").textContent = "Revisa el monto: solo números."; return; }
    var t = "Se verá así: " + precioActual();
    if ($("fMoneda").value === "CLP" && operacion === "Arriendo") t += " al mes";
    if ($("fMoneda").value === "CLP" && n < 10000) t += " — ¿seguro? Parece muy bajo.";
    $("precioPreview").textContent = t;
  }
  $("fPrecio").oninput  = actualizarPrecioPreview;
  $("fMoneda").onchange = function () {
    $("ayudaPrecio").textContent = $("fMoneda").value === "UF"
      ? "Escribe el valor en UF. Ej: 3200"
      : "Escribe solo números, con o sin puntos. Ej: 150000000";
    actualizarPrecioPreview();
  };

  /* =========================================================
     FOTOS
     ========================================================= */
  var PREFIJO_PUBLICO = "/storage/v1/object/public/fotos/";

  // Cada foto tiene una miniatura en thumb/<misma ruta>; al borrar una, van las dos.
  function rutasConThumb(paths) {
    var out = [];
    (paths || []).forEach(function (p) {
      if (!p) return;
      out.push(p);
      if (p.indexOf("thumb/") !== 0) out.push("thumb/" + p);
    });
    return out;
  }
  function borrarDeStorage(paths) {
    var rutas = rutasConThumb(paths);
    if (!rutas.length || !sb) return;
    sb.storage.from("fotos").remove(rutas).then(null, function (e) { console.warn("[AYM] no se pudo borrar:", e); });
  }

  function pathDesdeUrl(url) {
    var i = String(url).indexOf(PREFIJO_PUBLICO);
    if (i === -1) return null;
    try { return decodeURIComponent(String(url).slice(i + PREFIJO_PUBLICO.length).split("?")[0]); }
    catch (e) { return null; }
  }

  function dibujarFotos() {
    var grid = $("gridFotos");
    fotosListas = null;
    if (!fotos.length) {
      grid.innerHTML = "";
      $("ayudaFotos").textContent = "Todavía no hay fotos. La primera que subas queda de portada; después puedes cambiarla.";
      return;
    }
    $("ayudaFotos").textContent =
      fotos.length + " foto" + (fotos.length === 1 ? "" : "s") + ". " +
      "La primera es la portada. Usa ◀ ▶ para cambiar el orden y ★ para elegir la portada.";

    grid.innerHTML = fotos.map(function (f, i) {
      var ultima = i === fotos.length - 1;
      return '<div class="foto' + (i === 0 ? " es-portada" : "") + '" draggable="true" data-i="' + i + '">' +
        (i === 0 ? '<div class="portada">PORTADA</div>' : "") +
        '<img src="' + esc(f.url) + '" alt="Foto ' + (i + 1) + '" loading="lazy">' +
        '<span class="num">' + (i + 1) + "</span>" +
        '<button type="button" class="quitar" data-quitar="' + i + '" aria-label="Quitar foto ' + (i + 1) + '" title="Quitar esta foto">×</button>' +
        '<div class="acciones-foto">' +
          '<button type="button" data-mover="-1" data-i="' + i + '" title="Mover antes" aria-label="Mover antes"' + (i === 0 ? " disabled" : "") + '>◀</button>' +
          '<button type="button" data-portada="' + i + '" title="Poner de portada" aria-label="Poner de portada"' + (i === 0 ? " disabled" : "") + '>★</button>' +
          '<button type="button" data-mover="1" data-i="' + i + '" title="Mover después" aria-label="Mover después"' + (ultima ? " disabled" : "") + '>▶</button>' +
        "</div>" +
      "</div>";
    }).join("");
  }

  $("gridFotos").onclick = function (e) {
    var b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.quitar != null) {
      var i = Number(b.dataset.quitar);
      if (fotos[i] && fotos[i].path) fotosBorrar.push(fotos[i].path);
      fotos.splice(i, 1);
    } else if (b.dataset.portada != null) {
      fotos.unshift(fotos.splice(Number(b.dataset.portada), 1)[0]);
    } else if (b.dataset.mover != null) {
      var de = Number(b.dataset.i), a = de + Number(b.dataset.mover);
      if (a < 0 || a >= fotos.length) return;
      fotos.splice(a, 0, fotos.splice(de, 1)[0]);
    } else return;
    marcarSucio();
    dibujarFotos();
  };

  // Reordenar arrastrando (solo computador)
  var arrastrado = null;
  $("gridFotos").addEventListener("dragstart", function (e) {
    var f = e.target.closest(".foto"); if (!f) return;
    arrastrado = Number(f.dataset.i);
    f.classList.add("arrastrando");
    try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(arrastrado)); } catch (x) {}
  });
  $("gridFotos").addEventListener("dragend", function () {
    arrastrado = null;
    Array.prototype.forEach.call($("gridFotos").children, function (f) {
      f.classList.remove("arrastrando", "destino");
    });
  });
  $("gridFotos").addEventListener("dragover", function (e) {
    if (arrastrado === null) return;
    e.preventDefault();
    var f = e.target.closest(".foto"); if (!f) return;
    Array.prototype.forEach.call($("gridFotos").children, function (x) { x.classList.remove("destino"); });
    f.classList.add("destino");
  });
  $("gridFotos").addEventListener("drop", function (e) {
    if (arrastrado === null) return;
    e.preventDefault();
    var f = e.target.closest(".foto"); if (!f) return;
    var destino = Number(f.dataset.i);
    if (destino !== arrastrado) {
      fotos.splice(destino, 0, fotos.splice(arrastrado, 1)[0]);
      marcarSucio();
    }
    arrastrado = null;
    dibujarFotos();
  });

  // Elegir archivos
  $("zonaFotos").onclick = function () { $("inputFotos").click(); };
  $("zonaFotos").onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("inputFotos").click(); }
  };
  $("inputFotos").onchange = function (e) {
    subirFotos(Array.prototype.slice.call(e.target.files));
    e.target.value = "";
  };

  // Arrastrar archivos desde el escritorio
  ["dragenter", "dragover"].forEach(function (ev) {
    $("zonaFotos").addEventListener(ev, function (e) {
      e.preventDefault(); $("zonaFotos").classList.add("encima");
    });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    $("zonaFotos").addEventListener(ev, function (e) {
      e.preventDefault(); $("zonaFotos").classList.remove("encima");
    });
  });
  $("zonaFotos").addEventListener("drop", function (e) {
    var files = Array.prototype.slice.call(e.dataTransfer.files);
    if (files.length) subirFotos(files);
  });

  function esImagenUsable(file) {
    var nombre = (file.name || "").toLowerCase();
    if (/\.(heic|heif)$/.test(nombre) || /heic|heif/.test(file.type)) return "heic";
    if (/svg/.test(file.type) || /\.svg$/.test(nombre)) return "no";
    if (file.type && !/^image\//.test(file.type)) return "no";
    if (!file.type && !/\.(jpe?g|png|webp|gif|bmp)$/.test(nombre)) return "no";
    return "ok";
  }

  /* --- Redimensiona una imagen con el canvas. Devuelve un Blob JPEG, el
     archivo original si ya servía tal cual, o null si no se pudo decodificar.
     siempre=true fuerza pasar por el canvas aunque sea chica (miniaturas). --- */
  function redimensionar(file, MAX, calidad, siempre) {
    return new Promise(function (resolve) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) return resolve(null);
        var yaSirve = !siempre && /^image\/(jpeg|png|webp)$/.test(file.type);
        if (yaSirve && w <= MAX && h <= MAX && file.size < 600 * 1024) return resolve(file);

        if (w >= h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        else if (h > MAX)      { w = Math.round(w * MAX / h); h = MAX; }

        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#fff";           // JPEG no tiene transparencia: fondo blanco, no negro
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        c.toBlob(function (blob) {
          if (!blob) return resolve(yaSirve ? file : null);
          resolve(yaSirve && blob.size >= file.size ? file : blob);
        }, "image/jpeg", calidad);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  /* Foto grande: máx. 1800 px (una foto de celular pesa 3-8 MB; así queda en ~300 KB).
     Siempre pasa por el canvas salvo que ya sea JPEG/PNG/WebP chico: lo que
     llega a Storage es una imagen real, aunque el original fuera BMP o GIF. */
  function achicar(file) { return redimensionar(file, 1800, 0.85, false); }
  /* Miniatura para el listado y la galería: 640 px, ~60 KB. */
  function miniatura(blob) { return redimensionar(blob, 640, 0.8, true); }

  function subirFotos(files) {
    if (!files.length) return;

    var heic = 0, raros = 0;
    files = files.filter(function (f) {
      var r = esImagenUsable(f);
      if (r === "heic") heic++;
      else if (r === "no") raros++;
      return r === "ok";
    });
    if (heic || raros) {
      aviso("avisoEditor",
        (heic ? heic + " foto(s) en formato HEIC no se pueden usar. En el iPhone: Ajustes → Cámara → Formatos → «Más compatible», o envíatelas por WhatsApp y guárdalas. " : "") +
        (raros ? raros + " archivo(s) no eran fotos y se saltaron. " : ""), "warn");
    }
    if (!files.length) return;

    var gen = sesionEditor;

    // Propiedad nueva: esperamos a tener el código para que las fotos vayan a su carpeta.
    // Mientras tanto Guardar queda bloqueado y se ve que algo está pasando.
    if (!editando && !codigoNuevo && codigoPromesa) {
      var cp = codigoPromesa; codigoPromesa = null;
      subidasEnCurso += files.length;
      actualizarBotonGuardar();
      $("progreso").classList.remove("oculto");
      $("barraRelleno").style.width = "0%";
      $("textoProgreso").textContent = "Preparando…";
      cp.then(function () {
        if (gen !== sesionEditor) return;        // ya cerró o cambió de propiedad
        subidasEnCurso = Math.max(0, subidasEnCurso - files.length);
        subirFotos(files);
      });
      return;
    }

    var carpeta = (editando && editando.codigo) || codigoNuevo || "sin-codigo";
    var total = files.length, hechas = 0, fallidas = [];
    subidasEnCurso += total;
    marcarSucio();
    actualizarBotonGuardar();
    pedirPantallaEncendida();

    $("progreso").classList.remove("oculto");
    $("barraRelleno").style.width = "0%";
    $("textoProgreso").textContent = "Preparando " + total + " foto" + (total === 1 ? "" : "s") + "…";

    function paso() {
      hechas++;
      var vigente = gen === sesionEditor;
      if (vigente) {
        subidasEnCurso = Math.max(0, subidasEnCurso - 1);
        $("barraRelleno").style.width = Math.round(hechas / total * 100) + "%";
        $("textoProgreso").textContent = "Subiendo " + hechas + " de " + total + "… no cierres esta página.";
      }
      if (hechas === total) {
        if (!vigente) return;
        actualizarBotonGuardar();
        if (subidasEnCurso === 0) soltarPantalla();
        setTimeout(function () {
          $("progreso").classList.add("oculto");
          if (fallidas.length) {
            aviso("avisoEditor", "No se pudieron subir " + fallidas.length + " foto" + (fallidas.length === 1 ? "" : "s") +
              " (" + fallidas.slice(0, 4).join(", ") + (fallidas.length > 4 ? "…" : "") + "). " +
              "Revisa tu conexión y vuelve a elegirlas.", "warn");
          } else {
            toast(total + " foto" + (total === 1 ? "" : "s") + " subida" + (total === 1 ? "" : "s") + ".");
          }
        }, 500);
      }
    }

    // Una a la vez: más lento pero mucho más estable con internet de celular.
    var cadena = Promise.resolve();
    files.forEach(function (file, idx) {
      cadena = cadena.then(function () {
        var nombre = file.name || ("foto " + (idx + 1));
        // Si ya cerró o cambió de propiedad, no seguimos gastando datos en estas fotos.
        if (gen !== sesionEditor) { paso(); return; }
        return achicar(file).then(function (blob) {
          if (!blob) { fallidas.push(nombre); paso(); return; }
          var tipo = blob.type || file.type || "image/jpeg";
          var ext  = tipo === "image/png" ? ".png" : tipo === "image/webp" ? ".webp" : ".jpg";
          var base = nombre.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9\-_]/g, "_").slice(-30) || "foto";
          var ruta = carpeta + "/" + Date.now() + "-" + idx + "-" + base + ext;

          return conTimeout(
            sb.storage.from("fotos").upload(ruta, blob, { cacheControl: "31536000", upsert: false, contentType: tipo }),
            120000, "La subida tardó demasiado"
          ).then(function (res) {
            if (res.error) throw res.error;
            // Miniatura para el listado y la galería. Si falla, el sitio usa la foto grande.
            return miniatura(blob).then(function (mini) {
              if (!mini) return;
              return conTimeout(
                sb.storage.from("fotos").upload("thumb/" + ruta, mini, { cacheControl: "31536000", upsert: false, contentType: "image/jpeg" }),
                60000
              ).then(null, function (e) { console.warn("[AYM] miniatura no subida:", nombre, e); });
            });
          }).then(function () {
            if (gen !== sesionEditor) {
              // Ya cerró o cambió de propiedad: esta foto no pertenece a nada, la borramos.
              borrarDeStorage([ruta]);
              paso();
              return;
            }
            var pub = sb.storage.from("fotos").getPublicUrl(ruta);
            fotos.push({ url: pub.data.publicUrl, path: ruta });
            dibujarFotos();
            programarBorrador();
            paso();
          }).catch(function (err) {
            fallidas.push(nombre); console.error("[AYM] foto no subida:", nombre, err);
            paso();
          });
        });
      });
    });
  }

  // Con 20 fotos la subida dura minutos y el celular apaga la pantalla a los 30 s.
  function pedirPantallaEncendida() {
    if (wakeLock || !navigator.wakeLock || !navigator.wakeLock.request) return;
    navigator.wakeLock.request("screen").then(function (w) { wakeLock = w; }, function () {});
  }
  function soltarPantalla() {
    if (!wakeLock) return;
    var w = wakeLock; wakeLock = null;
    try { w.release().then(null, function () {}); } catch (e) {}
  }

  function actualizarBotonGuardar() {
    var b = $("btnGuardar");
    if (subidasEnCurso > 0) { b.disabled = true; b.textContent = "Subiendo fotos…"; }
    else { b.disabled = false; b.textContent = "Guardar"; }
  }

  /* =========================================================
     COMPARTIR EN REDES
     ========================================================= */
  function datosDelFormulario() {
    var esUF = $("fMoneda").value === "UF";
    var precio = num("fPrecio");
    return {
      codigo:      (editando && editando.codigo) || codigoNuevo || "",
      title:       $("fTitle").value.trim(),
      operation:   operacion,
      status:      estado,
      type:        $("fType").value,
      commune:     $("fCommune").value.trim() || null,
      address:     $("fAddress").value.trim() || null,
      price_clp:   esUF ? null : (precio == null ? null : Math.round(precio)),
      price_uf:    esUF ? precio : null,
      summary:     $("fSummary").value.trim() || null,
      description: $("fDescription").value.trim() || null,
      bedrooms:    num("fBedrooms"),
      bathrooms:   num("fBathrooms"),
      surface:     num("fSurface"),
      terrain:     num("fTerrain"),
      visible:     $("fVisible").checked
    };
  }

  // Quita del texto las líneas de contacto/redes: el aviso las agrega al final.
  // Solo borra rótulos seguidos de «:» o líneas que son SOLO un teléfono, para no
  // llevarse cosas como «Contacto directo con la naturaleza» o «569 m² de terreno».
  var RE_CONTACTO = /^(contacto(\s+\S+){0,3}|cont[aá]ctanos|facebook|instagram|p[aá]gina\s+web|web|s[ií]guenos(\s+\S+){0,3}|ll[aá]manos|whatsapp)\s*:/i;
  var RE_TELEFONO = /^(\+?56\s?)?9\s?\d{4}\s?\d{4}$/;
  function limpiarDescripcion(texto) {
    return String(texto || "").split("\n").filter(function (l) {
      var t = l.trim();
      if (!t) return true;
      return !(RE_CONTACTO.test(t) || RE_TELEFONO.test(t));
    }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function armarAviso(d) {
    var lineas = [];
    var titulo = (d.title || tituloSugerido()).toUpperCase();
    lineas.push(titulo);
    lineas.push("");

    var desc = limpiarDescripcion(d.description || d.summary || "");
    if (desc) { lineas.push(desc); lineas.push(""); }

    var carac = [];
    if (d.bedrooms  != null) carac.push(d.bedrooms + " dormitorio" + (d.bedrooms === 1 ? "" : "s"));
    if (d.bathrooms != null) carac.push(d.bathrooms + " baño" + (d.bathrooms === 1 ? "" : "s"));
    if (d.surface   != null) carac.push(d.surface + " m² construidos");
    if (d.terrain   != null) carac.push(d.terrain + " m² de terreno");
    if (carac.length) { lineas.push("Características: " + carac.join(" · ")); }
    var lugar = [d.address, d.commune].filter(Boolean).join(", ");
    if (lugar) lineas.push("Ubicación: " + lugar);
    if (carac.length || lugar) lineas.push("");

    var precio = d.price_uf ? fmtUF(d.price_uf) : (d.price_clp ? fmtCLP(d.price_clp) : "");
    if (precio) {
      lineas.push((d.operation === "Arriendo" ? "Canon de arriendo: " : "Precio: ") + precio +
                  (d.operation === "Arriendo" && d.price_clp ? " mensual" : ""));
      lineas.push("");
    }

    if (d.codigo) {
      lineas.push("Más fotos y detalles (código " + d.codigo + "):");
      lineas.push(urlPublica(d.codigo));
      lineas.push("");
    }

    lineas.push("Contacto " + (SITIO.nombre || "AYM Propiedades") + ":");
    (SITIO.telefonos || []).forEach(function (t) { lineas.push(t); });
    if (SITIO.email) lineas.push(SITIO.email);
    lineas.push("");
    lineas.push("Síguenos en redes sociales:");
    if (SITIO.facebook)  lineas.push("Facebook: Busca " + SITIO.facebook);
    if (SITIO.instagram) lineas.push("Instagram: " + SITIO.instagram);
    if (SITIO.dominio)   lineas.push("Página web: " + SITIO.dominio);
    lineas.push("");

    var tags = ["#AYMPropiedades", "#" + (d.operation || "Venta")];
    if (d.type)    tags.push("#" + d.type.replace(/\s+/g, ""));
    if (d.commune) tags.push("#" + d.commune.replace(/\s+/g, ""));
    tags.push("#VRegión", "#Propiedades", "#Chile");
    lineas.push(tags.join(" "));

    return lineas.join("\n");
  }

  function actualizarCompartir() {
    var guardada = !!editando;
    var botones = ["btnCopiarAviso", "btnCompartirFotos", "btnCompartirEnlace"];
    botones.forEach(function (id) { $(id).disabled = !guardada; });
    $("btnCompartirFotos").textContent = "📷 Preparar fotos para Instagram / WhatsApp";
    var ver = $("btnVerSitio");
    if (guardada && editando.visible) {
      ver.href = urlFicha(editando.codigo); ver.classList.remove("oculto");
    } else {
      ver.classList.add("oculto");
    }
    $("ayudaCompartir").textContent = guardada
      ? "Primero se copia el texto; después eliges las fotos y las envías a la app. Al final pegas el texto como descripción."
      : "Guarda la propiedad primero. Después podrás copiar el aviso y enviar las fotos a Instagram o WhatsApp.";
    $("textoAviso").textContent = guardada ? armarAviso(Object.assign({}, editando)) : "";
  }

  $("btnCopiarAviso").onclick = function () {
    var texto = armarAviso(datosDelFormulario());
    $("textoAviso").textContent = texto;
    copiar(texto).then(function (ok) {
      if (ok) toast("Aviso copiado. Pégalo en Facebook o Instagram.");
      else { $("detalleAviso").open = true; aviso("avisoEditor", "No se pudo copiar automáticamente. Abre «Ver el texto del aviso», selecciónalo y cópialo.", "warn"); }
    });
  };

  $("btnCompartirEnlace").onclick = function () {
    var d = datosDelFormulario();
    if (!d.codigo) return;
    var url = urlPublica(d.codigo);
    var texto = (d.title || "Propiedad " + d.codigo) + "\n" + url;
    if (navigator.share) {
      navigator.share({ title: d.title || "Propiedad", text: texto }).catch(function () {});
    } else {
      window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener");
    }
  };

  $("btnCompartirFotos").onclick = function () {
    var btn = this;
    if (!fotos.length) { aviso("avisoEditor", "Esta propiedad no tiene fotos.", "warn"); return; }
    if (!navigator.share || !navigator.canShare) {
      aviso("avisoEditor",
        "Enviar las fotos directo a Instagram o WhatsApp funciona desde el celular. " +
        "Abre este panel en tu teléfono, o usa «Copiar aviso» y sube las fotos a mano.", "info");
      return;
    }
    var d = datosDelFormulario();

    // Segundo toque: las fotos ya están descargadas, se envían al instante.
    if (fotosListas) {
      if (!navigator.canShare({ files: fotosListas })) {
        aviso("avisoEditor", "Tu celular no permite enviar fotos desde el navegador. Usa «Copiar aviso» y sube las fotos a mano.", "warn");
        return;
      }
      copiar(armarAviso(d));
      // Solo archivos, sin title ni text: con texto, iOS e Instagram descartan las fotos.
      navigator.share({ files: fotosListas })
        .then(function () { toast("Listo. Pega el texto del aviso en la descripción."); })
        .catch(function (e) { if (e && e.name !== "AbortError") aviso("avisoEditor", "No se pudieron enviar: " + e.message, "warn"); });
      return;
    }

    // Primer toque: descargar (máximo 10, que es lo que acepta Instagram por publicación).
    var lista = fotos.slice(0, 10);
    var gen = sesionEditor;
    btn.disabled = true; btn.textContent = "Preparando fotos…";
    Promise.all(lista.map(function (f, i) {
      return fetch(f.url).then(function (r) { if (!r.ok) throw new Error("foto " + (i + 1)); return r.blob(); })
        .then(function (b) {
          var ext = b.type === "image/png" ? "png" : "jpg";
          return new File([b], (d.codigo || "foto") + "-" + (i + 1) + "." + ext, { type: b.type || "image/jpeg" });
        });
    })).then(function (files) {
      if (gen !== sesionEditor) return;   // ya está en otra propiedad
      fotosListas = files;
      btn.disabled = false;
      btn.textContent = "📤 Enviar " + files.length + " foto" + (files.length === 1 ? "" : "s") + " ahora";
      toast("Fotos listas. Toca de nuevo para elegir Instagram o WhatsApp." +
            (fotos.length > 10 ? " (Se envían las 10 primeras.)" : ""));
    }).catch(function (e) {
      if (gen !== sesionEditor) return;
      btn.disabled = false; btn.textContent = "📷 Preparar fotos para Instagram / WhatsApp";
      aviso("avisoEditor", "No se pudieron preparar las fotos (" + e.message + "). Revisa tu conexión.", "warn");
    });
  };

  /* =========================================================
     Guardar
     ========================================================= */
  function errorEnCampo(id, texto) {
    aviso("avisoEditor", texto, "error");
    $(id).focus(); $(id).scrollIntoView({ behavior: "smooth", block: "center" });
  }

  $("btnGuardar").onclick = function () {
    if (guardando) return;
    if (!esAdmin) { aviso("avisoEditor", "Tu cuenta no está autorizada para publicar. Avísale a Nelson.", "error"); return; }
    if (subidasEnCurso > 0) {
      aviso("avisoEditor", "Espera a que terminen de subir las fotos.", "warn");
      return;
    }
    var datos = datosDelFormulario();
    if (!datos.title) return errorEnCampo("fTitle", "Falta el título del aviso. Es lo único obligatorio (puedes apretar «Sugerir»).");
    if ($("fPrecio").value.trim() && (num("fPrecio") == null || num("fPrecio") <= 0))
      return errorEnCampo("fPrecio", "Revisa el precio: escribe solo números, por ejemplo 150000000 o 150.000.000.");
    if (!enteroValido("fBedrooms"))  return errorEnCampo("fBedrooms", "Dormitorios va en número entero, sin decimales (ej: 3).");
    if (!enteroValido("fBathrooms")) return errorEnCampo("fBathrooms", "Baños va en número entero, sin decimales (ej: 2).");
    if ($("fSurface").value.trim() && num("fSurface") == null) return errorEnCampo("fSurface", "Revisa los metros construidos: solo números (ej: 95 o 117,5).");
    if ($("fTerrain").value.trim() && num("fTerrain") == null) return errorEnCampo("fTerrain", "Revisa los metros de terreno: solo números (ej: 250).");
    datos.images = fotos.map(function (f) { return f.url; });
    delete datos.codigo;

    if (!datos.images.length && datos.visible) {
      confirmar("Sin fotos", "Esta propiedad no tiene fotos y va a aparecer en el sitio sin imagen. ¿Guardar igual?",
        "Sí, guardar", function () { guardar(datos); });
      return;
    }
    guardar(datos);
  };

  function bloquearSalida(si) {
    guardando = si;
    $("btnCancelar").disabled = si;
    $("btnEliminar").disabled = si;
  }

  function guardar(datos) {
    var btn = $("btnGuardar");
    btn.disabled = true; btn.textContent = "Guardando…";
    bloquearSalida(true);
    aviso("avisoEditor", "");
    var eraNueva = !editando;
    var gen = sesionEditor;
    var miId = idNuevo;

    // La propiedad nueva lleva un id fijo desde que se abrió el editor. Si se corta
    // internet justo al guardar y ella vuelve a apretar Guardar, no se duplica:
    // detectamos que ya existe y seguimos como si nada.
    function insertar(codigo) {
      datos.codigo = codigo;
      if (miId) datos.id = miId;
      return sb.from("propiedades").insert(datos).select().single().then(function (res) {
        if (!(res.error && /duplicate key|already exists|23505/i.test((res.error.message || "") + " " + (res.error.code || "")))) return res;
        var yaExiste = miId
          ? sb.from("propiedades").select("*").eq("id", miId).then(function (r) { return (r.data && r.data[0]) || null; })
          : Promise.resolve(null);
        return yaExiste.then(function (fila) {
          if (fila) return { data: fila, error: null };            // el guardado anterior sí había llegado
          // El código lo tomó otra propiedad: pedimos el siguiente y reintentamos.
          return sb.rpc("siguiente_codigo").then(function (r) {
            if (r.error) throw r.error;
            datos.codigo = r.data;
            return sb.from("propiedades").insert(datos).select().single();
          });
        });
      });
    }

    var trabajo;
    if (editando) {
      trabajo = sb.from("propiedades").update(datos).eq("id", editando.id).select().single();
    } else if (codigoNuevo) {
      trabajo = insertar(codigoNuevo);
    } else {
      trabajo = sb.rpc("siguiente_codigo").then(function (r) {
        if (r.error) throw r.error;
        return insertar(r.data);
      });
    }

    conTimeout(trabajo, 30000).then(function (res) {
      if (res.error) throw res.error;
      var fila = res.data;
      bloquearSalida(false);

      // Recién ahora borramos de verdad las fotos que quitó.
      borrarDeStorage(fotosBorrar);
      fotosBorrar = [];

      btn.disabled = false; btn.textContent = "Guardar";
      if (gen !== sesionEditor) { cargarPropiedades(); return; }
      sucio = false;
      borrarBorradorPropio();
      cerrarEditor();
      cargarPropiedades();

      var html = esc(eraNueva ? "Propiedad publicada." : "Propiedad actualizada.") + " ";
      if (datos.visible && fila && fila.codigo) {
        html += esc("Ya se ve en el sitio web. ") +
          '<a href="' + esc(urlFicha(fila.codigo)) + '" target="_blank" rel="noopener">Ver en el sitio</a>';
      } else {
        html += esc("Quedó guardada como oculta: nadie la ve hasta que aprietes «Mostrar en el sitio».");
      }
      if (fila && fila.id) {
        html += ' · <button type="button" class="link" data-compartir="' + esc(fila.id) + '">Compartir en redes</button>';
      }
      avisoHtml("avisoLista", html, "ok");
    }).catch(function (err) {
      bloquearSalida(false);
      btn.disabled = false; btn.textContent = "Guardar";
      if (gen !== sesionEditor) return;
      aviso("avisoEditor", "No se pudo guardar: " + mensajeError(err) +
        " Tus cambios siguen en pantalla: vuelve a apretar Guardar.", "error");
      window.scrollTo(0, 0);
    });
  }

  /* =========================================================
     Eliminar
     ========================================================= */
  $("btnEliminar").onclick = function () {
    if (!editando || guardando) return;
    var p = editando;
    confirmar(
      "Eliminar propiedad",
      "Se borrará «" + (p.title || p.codigo) + "» y todas sus fotos. Esto NO se puede deshacer.\n\n" +
      "Si solo quieres que deje de aparecer en el sitio, cierra esto y usa «Ocultar del sitio».",
      "Sí, eliminar",
      function () {
        var paths = fotos.map(function (f) { return f.path; }).filter(Boolean).concat(fotosBorrar);
        var btn = $("btnEliminar");
        btn.disabled = true; btn.textContent = "Eliminando…";
        conTimeout(sb.from("propiedades").delete().eq("id", p.id).select("id"), 20000).then(function (res) {
          if (res.error) throw res.error;
          if (!res.data || !res.data.length) throw new Error("PGRST116");
          borrarDeStorage(paths);
          btn.disabled = false; btn.textContent = "Eliminar";
          cerrarEditor(true);
          cargarPropiedades();
          aviso("avisoLista", "Propiedad " + p.codigo + " eliminada.", "ok");
        }).catch(function (err) {
          btn.disabled = false; btn.textContent = "Eliminar";
          aviso("avisoEditor", "No se pudo eliminar: " + mensajeError(err), "error");
          window.scrollTo(0, 0);
        });
      }
    );
  };

  arrancar();
})();
