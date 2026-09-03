/* ============================================================
   AYM Propiedades — Panel de administración
   ------------------------------------------------------------
   Todo lo que necesita una persona sin conocimientos técnicos
   para publicar, editar, ocultar y dar de baja propiedades.
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.AYM_CONFIG;
  var sb  = null;

  // Estado en memoria
  var propiedades = [];      // todas las filas de la tabla
  var editando    = null;    // fila que se está editando (null = nueva)
  var fotos       = [];      // [{url, path}]  la primera es la portada
  var fotosBorrar = [];      // paths de storage a eliminar al guardar
  var operacion   = "Venta";
  var estado      = "Disponible";
  var codigoNuevo = null;    // código reservado para la propiedad que se está creando

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------------------------------------------------
     Utilidades
     --------------------------------------------------------- */
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

  function fmtCLP(n) {
    try {
      return new Intl.NumberFormat("es-CL", {
        style: "currency", currency: "CLP", maximumFractionDigits: 0
      }).format(n);
    } catch (e) { return "$" + n; }
  }

  function precioTexto(p) {
    if (p.price_uf)  return "UF " + Number(p.price_uf).toLocaleString("es-CL");
    if (p.price_clp) return fmtCLP(p.price_clp);
    return "Precio a convenir";
  }

  // Traduce los errores de Supabase a español entendible.
  function mensajeError(err) {
    var m = (err && (err.message || err.error_description)) || String(err);
    if (/Invalid login credentials/i.test(m))
      return "El correo o la contraseña no son correctos.";
    if (/Email not confirmed/i.test(m))
      return "La cuenta todavía no está confirmada. Revisa el correo de confirmación.";
    if (/Failed to fetch|NetworkError/i.test(m))
      return "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.";
    if (/duplicate key|already exists/i.test(m))
      return "Ya existe una propiedad con ese código.";
    if (/row-level security|permission denied/i.test(m))
      return "No tienes permiso para hacer eso. Vuelve a iniciar sesión.";
    if (/JWT|token is expired/i.test(m))
      return "Tu sesión expiró. Vuelve a iniciar sesión.";
    return m;
  }

  /* ---------------------------------------------------------
     Confirmación (reemplaza al confirm() del navegador)
     --------------------------------------------------------- */
  var _confirmarCb = null;
  function confirmar(titulo, texto, textoBoton, cb) {
    $("modalTitulo").textContent = titulo;
    $("modalTexto").textContent  = texto;
    $("modalSi").textContent     = textoBoton;
    _confirmarCb = cb;
    $("modal").classList.remove("oculto");
  }
  $("modalNo").onclick = function () {
    $("modal").classList.add("oculto"); _confirmarCb = null;
  };
  $("modalSi").onclick = function () {
    $("modal").classList.add("oculto");
    var cb = _confirmarCb; _confirmarCb = null;
    if (cb) cb();
  };

  /* ---------------------------------------------------------
     Arranque
     --------------------------------------------------------- */
  function arrancar() {
    if (!cfg || !cfg.estaConfigurado()) {
      aviso("avisoLogin",
        "El panel todavía no está conectado a la base de datos. " +
        "Falta completar assets/config.js con la URL y la llave del proyecto Supabase.",
        "warn");
      $("btnEntrar").disabled = true;
      return;
    }
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

    sb.auth.getSession().then(function (res) {
      if (res.data && res.data.session) entrarAlPanel(res.data.session);
    });

    sb.auth.onAuthStateChange(function (evento, sesion) {
      if (evento === "SIGNED_OUT" || !sesion) mostrarLogin();
    });
  }

  function mostrarLogin() {
    $("pantallaApp").classList.add("oculto");
    $("pantallaLogin").classList.remove("oculto");
  }

  function entrarAlPanel(sesion) {
    $("pantallaLogin").classList.add("oculto");
    $("pantallaApp").classList.remove("oculto");
    $("usuarioActual").textContent = sesion.user.email;
    cargarPropiedades();
  }

  /* ---------------------------------------------------------
     Iniciar / cerrar sesión
     --------------------------------------------------------- */
  $("formLogin").onsubmit = function (e) {
    e.preventDefault();
    var btn = $("btnEntrar");
    btn.disabled = true; btn.textContent = "Entrando…";
    aviso("avisoLogin", "");

    sb.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    }).then(function (res) {
      btn.disabled = false; btn.textContent = "Entrar";
      if (res.error) { aviso("avisoLogin", mensajeError(res.error), "error"); return; }
      $("password").value = "";
      entrarAlPanel(res.data.session);
    });
  };

  $("btnSalir").onclick = function () {
    confirmar("Cerrar sesión", "¿Quieres salir del panel?", "Sí, salir", function () {
      sb.auth.signOut().then(mostrarLogin);
    });
  };

  /* ---------------------------------------------------------
     Cargar y dibujar la lista
     --------------------------------------------------------- */
  function cargarPropiedades() {
    $("lista").innerHTML = '<div class="cargando">Cargando propiedades…</div>';
    sb.from("propiedades")
      .select("*")
      .order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) {
          aviso("avisoLista", "No se pudieron cargar las propiedades: " + mensajeError(res.error), "error");
          $("lista").innerHTML = "";
          return;
        }
        propiedades = res.data || [];
        dibujarLista();
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
              (p.type || "")).toLowerCase().indexOf(q) !== -1;
    });

    $("contador").textContent =
      propiedades.length === 0 ? "" :
      vista.length + " de " + propiedades.length + " propiedades" +
      " · " + propiedades.filter(function (p) { return p.visible; }).length + " publicadas en el sitio";

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

      var siguiente = (p.operation === "Arriendo") ? "Arrendada" : "Vendida";
      var textoBaja = (p.operation === "Arriendo") ? "Marcar arrendada" : "Marcar vendida";

      return '' +
      '<div class="prop' + (p.visible ? "" : " no-visible") + '">' +
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
            '<button class="btn btn-chico btn-primario" data-accion="editar" data-id="' + p.id + '">Editar</button>' +
            '<button class="btn btn-chico" data-accion="visible" data-id="' + p.id + '">' +
              (p.visible ? "Ocultar del sitio" : "Mostrar en el sitio") + "</button>" +
            (p.status === "Disponible"
              ? '<button class="btn btn-chico" data-accion="reservar" data-id="' + p.id + '">Marcar reservada</button>' +
                '<button class="btn btn-chico" data-accion="baja" data-id="' + p.id +
                  '" data-estado="' + siguiente + '">' + textoBaja + "</button>"
              : '<button class="btn btn-chico" data-accion="disponible" data-id="' + p.id + '">Volver a disponible</button>') +
          "</div>" +
        "</div>" +
      "</div>";
    }).join("");
  }

  // Un solo listener para todos los botones de la lista
  $("lista").onclick = function (e) {
    var b = e.target.closest("button[data-accion]");
    if (!b) return;
    var p = propiedades.filter(function (x) { return x.id === b.dataset.id; })[0];
    if (!p) return;

    switch (b.dataset.accion) {
      case "editar":     abrirEditor(p); break;
      case "visible":    actualizar(p, { visible: !p.visible }); break;
      case "reservar":   actualizar(p, { status: "Reservada" }); break;
      case "disponible": actualizar(p, { status: "Disponible" }); break;
      case "baja":
        confirmar(
          b.dataset.estado === "Vendida" ? "Marcar como vendida" : "Marcar como arrendada",
          "«" + (p.title || p.codigo) + "» quedará marcada como " +
          b.dataset.estado.toLowerCase() + ". Seguirá visible en el sitio con ese cartel. " +
          "Si prefieres que no aparezca, usa además «Ocultar del sitio».",
          "Sí, marcar",
          function () { actualizar(p, { status: b.dataset.estado }); }
        );
        break;
    }
  };

  function actualizar(p, cambios) {
    sb.from("propiedades").update(cambios).eq("id", p.id).then(function (res) {
      if (res.error) { aviso("avisoLista", mensajeError(res.error), "error"); return; }
      Object.assign(p, cambios);
      aviso("avisoLista", "Cambio guardado.", "ok");
      setTimeout(function () { aviso("avisoLista", ""); }, 2500);
      dibujarLista();
    });
  }

  $("buscar").oninput       = dibujarLista;
  $("filtroEstado").onchange = dibujarLista;

  /* ---------------------------------------------------------
     Editor
     --------------------------------------------------------- */
  function seleccionar(contenedor, valor) {
    Array.prototype.forEach.call($(contenedor).children, function (b) {
      b.classList.toggle("activa", b.dataset.valor === valor);
    });
  }

  $("opsOperacion").onclick = function (e) {
    var b = e.target.closest(".opcion"); if (!b) return;
    operacion = b.dataset.valor; seleccionar("opsOperacion", operacion);
  };
  $("opsEstado").onclick = function (e) {
    var b = e.target.closest(".opcion"); if (!b) return;
    estado = b.dataset.valor; seleccionar("opsEstado", estado);
  };

  function abrirEditor(p) {
    editando    = p || null;
    fotos       = [];
    fotosBorrar = [];
    aviso("avisoEditor", "");

    if (p) {
      $("tituloEditor").textContent = "Editar propiedad " + p.codigo;
      $("subEditor").textContent    = "Modifica lo que necesites y aprieta Guardar.";
      $("btnEliminar").classList.remove("oculto");

      $("fTitle").value       = p.title || "";
      $("fType").value        = p.type || "Casa";
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

      fotos = (Array.isArray(p.images) ? p.images : []).map(function (u) {
        return { url: u, path: pathDesdeUrl(u) };
      });
    } else {
      $("tituloEditor").textContent = "Nueva propiedad";
      $("subEditor").textContent    = "Completa los datos y sube las fotos. Puedes guardarla oculta y publicarla después.";
      $("btnEliminar").classList.add("oculto");

      // Reservamos el código (AM-015, AM-016…) antes de subir fotos, así
      // quedan guardadas en la carpeta correcta desde el primer momento.
      codigoNuevo = null;
      sb.rpc("siguiente_codigo").then(function (r) {
        if (!r.error && r.data) {
          codigoNuevo = r.data;
          $("tituloEditor").textContent = "Nueva propiedad · " + r.data;
        }
      });

      ["fTitle","fCommune","fAddress","fBedrooms","fBathrooms","fSurface",
       "fTerrain","fSummary","fDescription","fPrecio"].forEach(function (id) { $(id).value = ""; });
      $("fType").value      = "Casa";
      $("fMoneda").value    = "CLP";
      $("fVisible").checked = true;
      operacion = "Venta";
      estado    = "Disponible";
    }

    seleccionar("opsOperacion", operacion);
    seleccionar("opsEstado", estado);
    actualizarPrecioPreview();
    dibujarFotos();

    $("vistaLista").classList.add("oculto");
    $("vistaEditor").classList.remove("oculto");
    window.scrollTo(0, 0);
  }

  $("btnNueva").onclick    = function () { abrirEditor(null); };
  $("btnCancelar").onclick = function () {
    confirmar("Cancelar", "Se perderán los cambios que no hayas guardado. ¿Seguro?", "Sí, salir",
      function () { cerrarEditor(); });
  };

  function cerrarEditor() {
    $("vistaEditor").classList.add("oculto");
    $("vistaLista").classList.remove("oculto");
    window.scrollTo(0, 0);
  }

  /* ---------------------------------------------------------
     Precio: vista previa formateada
     --------------------------------------------------------- */
  function actualizarPrecioPreview() {
    var crudo = $("fPrecio").value.replace(/[^\d.]/g, "");
    var n = parseFloat(crudo);
    if (!crudo || isNaN(n)) { $("precioPreview").textContent = ""; return; }
    $("precioPreview").textContent = "Se verá así: " +
      ($("fMoneda").value === "UF" ? "UF " + n.toLocaleString("es-CL") : fmtCLP(n));
  }
  $("fPrecio").oninput   = actualizarPrecioPreview;
  $("fMoneda").onchange  = function () {
    $("ayudaPrecio").textContent = $("fMoneda").value === "UF"
      ? "Escribe el valor en UF. Ej: 3200"
      : "Escribe solo números, sin puntos. Ej: 150000000";
    actualizarPrecioPreview();
  };

  /* ---------------------------------------------------------
     FOTOS
     --------------------------------------------------------- */
  var PREFIJO_PUBLICO = "/storage/v1/object/public/fotos/";

  function pathDesdeUrl(url) {
    var i = String(url).indexOf(PREFIJO_PUBLICO);
    return i === -1 ? null : decodeURIComponent(String(url).slice(i + PREFIJO_PUBLICO.length));
  }

  function dibujarFotos() {
    var grid = $("gridFotos");
    if (!fotos.length) {
      grid.innerHTML = "";
      $("ayudaFotos").textContent = "Todavía no has subido fotos.";
      return;
    }
    $("ayudaFotos").textContent =
      fotos.length + " foto" + (fotos.length === 1 ? "" : "s") + ". " +
      "La primera es la portada. Arrástralas para cambiar el orden, " +
      "o usa ★ para poner una de portada.";

    grid.innerHTML = fotos.map(function (f, i) {
      return '<div class="foto" draggable="true" data-i="' + i + '">' +
        (i === 0 ? '<div class="portada">PORTADA</div>' : "") +
        '<img src="' + esc(f.url) + '" alt="" loading="lazy">' +
        '<button type="button" class="quitar" data-quitar="' + i + '" title="Quitar esta foto">×</button>' +
        '<span class="num">' + (i + 1) + "</span>" +
        (i > 0 ? '<button type="button" class="hacer-portada" data-portada="' + i +
                 '" title="Poner de portada">★</button>' : "") +
      "</div>";
    }).join("");
  }

  $("gridFotos").onclick = function (e) {
    var q = e.target.closest("[data-quitar]");
    if (q) {
      var i = Number(q.dataset.quitar);
      if (fotos[i].path) fotosBorrar.push(fotos[i].path);
      fotos.splice(i, 1);
      dibujarFotos();
      return;
    }
    var p = e.target.closest("[data-portada]");
    if (p) {
      var j = Number(p.dataset.portada);
      fotos.unshift(fotos.splice(j, 1)[0]);
      dibujarFotos();
    }
  };

  // Reordenar arrastrando
  var arrastrado = null;
  $("gridFotos").addEventListener("dragstart", function (e) {
    var f = e.target.closest(".foto"); if (!f) return;
    arrastrado = Number(f.dataset.i);
    f.classList.add("arrastrando");
    e.dataTransfer.effectAllowed = "move";
  });
  $("gridFotos").addEventListener("dragend", function () {
    arrastrado = null;
    Array.prototype.forEach.call($("gridFotos").children, function (f) {
      f.classList.remove("arrastrando", "destino");
    });
  });
  $("gridFotos").addEventListener("dragover", function (e) {
    e.preventDefault();
    var f = e.target.closest(".foto"); if (!f || arrastrado === null) return;
    Array.prototype.forEach.call($("gridFotos").children, function (x) { x.classList.remove("destino"); });
    f.classList.add("destino");
  });
  $("gridFotos").addEventListener("drop", function (e) {
    e.preventDefault();
    var f = e.target.closest(".foto"); if (!f || arrastrado === null) return;
    var destino = Number(f.dataset.i);
    if (destino === arrastrado) return;
    fotos.splice(destino, 0, fotos.splice(arrastrado, 1)[0]);
    arrastrado = null;
    dibujarFotos();
  });

  // Elegir archivos
  $("zonaFotos").onclick  = function () { $("inputFotos").click(); };
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
    var files = Array.prototype.slice.call(e.dataTransfer.files)
      .filter(function (f) { return /^image\//.test(f.type); });
    if (files.length) subirFotos(files);
  });

  /* --- Achica la foto antes de subirla (celular = 5 MB por foto) --- */
  function achicar(file) {
    return new Promise(function (resolve) {
      if (!/^image\//.test(file.type) || /gif|svg/.test(file.type)) return resolve(file);

      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var MAX = 1800;
        var w = img.width, h = img.height;
        if (w <= MAX && h <= MAX && file.size < 600 * 1024) return resolve(file);

        if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        else if (h > MAX)     { w = Math.round(w * MAX / h); h = MAX; }

        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        c.toBlob(function (blob) {
          resolve(blob && blob.size < file.size ? blob : file);
        }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function subirFotos(files) {
    if (!files.length) return;
    var carpeta = (editando && editando.codigo) || codigoNuevo || "sin-codigo";
    var total = files.length, hechas = 0, fallidas = 0;

    $("progreso").classList.remove("oculto");
    $("barraRelleno").style.width = "0%";
    $("textoProgreso").textContent = "Preparando " + total + " foto" + (total === 1 ? "" : "s") + "…";

    function paso() {
      hechas++;
      $("barraRelleno").style.width = Math.round(hechas / total * 100) + "%";
      $("textoProgreso").textContent = "Subiendo " + hechas + " de " + total + "…";
      if (hechas === total) {
        setTimeout(function () {
          $("progreso").classList.add("oculto");
          if (fallidas) {
            aviso("avisoEditor", "No se pudieron subir " + fallidas + " foto(s). " +
              "Revisa tu conexión e inténtalo otra vez.", "warn");
          }
        }, 600);
      }
    }

    // Una a la vez: más lento pero mucho más estable en conexiones domésticas.
    var cadena = Promise.resolve();
    files.forEach(function (file, idx) {
      cadena = cadena.then(function () {
        return achicar(file).then(function (blob) {
          var nombre = Date.now() + "-" + idx + "-" +
            (file.name || "foto.jpg").replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-40);
          var ruta = carpeta + "/" + nombre;

          return sb.storage.from("fotos")
            .upload(ruta, blob, { cacheControl: "31536000", upsert: false,
                                  contentType: blob.type || "image/jpeg" })
            .then(function (res) {
              if (res.error) { fallidas++; console.error(res.error); paso(); return; }
              var pub = sb.storage.from("fotos").getPublicUrl(ruta);
              fotos.push({ url: pub.data.publicUrl, path: ruta });
              dibujarFotos();
              paso();
            });
        });
      });
    });
  }

  /* ---------------------------------------------------------
     Guardar
     --------------------------------------------------------- */
  function num(id) {
    var v = $(id).value.trim();
    if (v === "") return null;
    var n = parseFloat(v.replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? null : n;
  }

  $("btnGuardar").onclick = function () {
    var titulo = $("fTitle").value.trim();
    if (!titulo) {
      aviso("avisoEditor", "Falta el título del aviso. Es lo único obligatorio.", "error");
      $("fTitle").focus(); window.scrollTo(0, 0);
      return;
    }

    var esUF   = $("fMoneda").value === "UF";
    var precio = num("fPrecio");

    var datos = {
      title:       titulo,
      operation:   operacion,
      status:      estado,
      type:        $("fType").value,
      commune:     $("fCommune").value.trim() || null,
      address:     $("fAddress").value.trim() || null,
      price_clp:   esUF ? null : precio,
      price_uf:    esUF ? precio : null,
      summary:     $("fSummary").value.trim() || null,
      description: $("fDescription").value.trim() || null,
      bedrooms:    num("fBedrooms"),
      bathrooms:   num("fBathrooms"),
      surface:     num("fSurface"),
      terrain:     num("fTerrain"),
      visible:     $("fVisible").checked,
      images:      fotos.map(function (f) { return f.url; })
    };

    var btn = $("btnGuardar");
    btn.disabled = true; btn.textContent = "Guardando…";
    aviso("avisoEditor", "");

    function insertar(codigo) {
      datos.codigo = codigo;
      return sb.from("propiedades").insert(datos).select().single().then(function (res) {
        // Si ese código ya estaba tomado, pedimos el siguiente y reintentamos.
        if (res.error && /duplicate key|already exists/i.test(res.error.message || "")) {
          return sb.rpc("siguiente_codigo").then(function (r) {
            if (r.error) throw r.error;
            datos.codigo = r.data;
            return sb.from("propiedades").insert(datos).select().single();
          });
        }
        return res;
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

    Promise.resolve(trabajo).then(function (res) {
      if (res.error) throw res.error;

      // Recién ahora borramos de verdad las fotos que quitó
      if (fotosBorrar.length) {
        sb.storage.from("fotos").remove(fotosBorrar).then(function () {});
        fotosBorrar = [];
      }

      btn.disabled = false; btn.textContent = "Guardar";
      cerrarEditor();
      cargarPropiedades();
      aviso("avisoLista",
        (editando ? "Propiedad actualizada." : "Propiedad publicada.") +
        (datos.visible ? " Ya se ve en el sitio web." : " Quedó guardada como oculta."), "ok");
      setTimeout(function () { aviso("avisoLista", ""); }, 5000);
    }).catch(function (err) {
      btn.disabled = false; btn.textContent = "Guardar";
      aviso("avisoEditor", "No se pudo guardar: " + mensajeError(err), "error");
      window.scrollTo(0, 0);
    });
  };

  /* ---------------------------------------------------------
     Eliminar
     --------------------------------------------------------- */
  $("btnEliminar").onclick = function () {
    if (!editando) return;
    confirmar(
      "Eliminar propiedad",
      "Se borrará «" + (editando.title || editando.codigo) + "» y todas sus fotos. " +
      "Esto NO se puede deshacer.\n\n" +
      "Si solo quieres que deje de aparecer en el sitio, cierra esto y usa «Ocultar del sitio».",
      "Sí, eliminar",
      function () {
        var paths = fotos.map(function (f) { return f.path; })
                         .filter(function (x) { return !!x; });
        sb.from("propiedades").delete().eq("id", editando.id).then(function (res) {
          if (res.error) {
            aviso("avisoEditor", "No se pudo eliminar: " + mensajeError(res.error), "error");
            return;
          }
          if (paths.length) sb.storage.from("fotos").remove(paths).then(function () {});
          cerrarEditor();
          cargarPropiedades();
          aviso("avisoLista", "Propiedad eliminada.", "ok");
          setTimeout(function () { aviso("avisoLista", ""); }, 4000);
        });
      }
    );
  };

  arrancar();
})();
