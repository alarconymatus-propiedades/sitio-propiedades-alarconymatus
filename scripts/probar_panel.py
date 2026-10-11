# -*- coding: utf-8 -*-
"""
Prueba de punta a punta del panel y del sitio, sin Supabase real.

Levanta scripts/servidor_pruebas.py, abre un Chromium invisible con
Playwright y recorre lo que haría Fanny: entrar, crear una propiedad con
fotos, ordenarlas, guardar, compartir, ocultar, marcar arrendada, editar,
eliminar y recuperar la contraseña.

Uso:
    py -3 scripts/probar_panel.py            (resumen)
    py -3 scripts/probar_panel.py --ver      (abre el navegador visible)

Requiere:  py -3 -m pip install playwright && py -3 -m playwright install chromium
"""

import os
import struct
import sys
import tempfile
import threading
import zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:  # la consola de Windows no siempre sabe imprimir ★ ▶ ×
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001
    pass
import servidor_pruebas  # noqa: E402

from playwright.sync_api import sync_playwright, expect  # noqa: E402

PUERTO = 8765
BASE = "http://127.0.0.1:%d" % PUERTO
VER = "--ver" in sys.argv

fallos = []
pasos = 0


def paso(nombre, fn):
    global pasos
    pasos += 1
    try:
        fn()
        print("  OK   %s" % nombre)
    except Exception as e:  # noqa: BLE001
        fallos.append((nombre, e))
        print("  FALLA %s\n        %s" % (nombre, str(e).splitlines()[0] if str(e) else repr(e)))


def png(ancho, alto, rgb):
    """PNG mínimo de un solo color, sin PIL."""
    fila = b"\x00" + bytes(rgb) * ancho
    raw = fila * alto

    def chunk(tipo, datos):
        c = struct.pack(">I", len(datos)) + tipo + datos
        return c + struct.pack(">I", zlib.crc32(tipo + datos) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" +
            chunk(b"IHDR", struct.pack(">IIBBBBB", ancho, alto, 8, 2, 0, 0, 0)) +
            chunk(b"IDAT", zlib.compress(raw, 9)) +
            chunk(b"IEND", b""))


def main():
    srv = servidor_pruebas.crear(PUERTO)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    tmp = tempfile.mkdtemp(prefix="aym-fotos-")
    rutas = []
    for i, color in enumerate([(200, 60, 60), (60, 160, 60), (60, 60, 200)]):
        r = os.path.join(tmp, "foto%d.png" % (i + 1))
        with open(r, "wb") as fh:
            fh.write(png(900, 675, color))
        rutas.append(r)

    with sync_playwright() as p:
        navegador = p.chromium.launch(headless=not VER, slow_mo=250 if VER else 0)
        ctx = navegador.new_context(viewport={"width": 390, "height": 844},  # tamaño celular
                                    permissions=["clipboard-read", "clipboard-write"],
                                    locale="es-CL")
        page = ctx.new_page()
        errores_js = []
        page.on("pageerror", lambda e: errores_js.append(str(e)))
        page.on("console", lambda m: errores_js.append(m.text) if m.type == "error" and "favicon" not in m.text else None)

        print("Sitio público")

        def t_index():
            page.goto(BASE + "/index.html?mock=1")
            expect(page.locator(".card")).to_have_count(10, timeout=10000)
        paso("index.html muestra las 10 propiedades", t_index)

        def t_ficha():
            page.goto(BASE + "/property.html?mock=1&id=AM-014")
            expect(page.locator("#content")).to_be_visible(timeout=10000)
            assert "Belloto" in page.locator("#title").inner_text()
            assert page.locator("#gallery img").count() > 5
            assert page.locator("#cover").is_visible()
            wa = page.locator("#ctaWa").get_attribute("href")
            assert wa.startswith("https://wa.me/56990003574?text=") and "AM-014" in wa, wa
            assert page.locator("#ctaTel").get_attribute("href") == "tel:+56990003574"
            assert "alarconymatus@gmail.com" in page.locator("#ctaExtra").inner_text()
        paso("property.html muestra la ficha AM-014 con galería y botones de contacto", t_ficha)

        print("Panel: entrar")

        def t_login_mal():
            page.goto(BASE + "/admin.html?mock=1")
            expect(page.locator("#estadoConexion")).to_contain_text("simulador", timeout=10000)
            page.fill("#email", "fanny@ejemplo.cl")
            page.fill("#password", "incorrecta")
            page.click("#btnEntrar")
            expect(page.locator("#avisoLogin")).to_contain_text("no son correctos")
        paso("contraseña incorrecta muestra mensaje claro", t_login_mal)

        def t_login_ok():
            page.fill("#password", "demo1234")
            page.click("#btnEntrar")
            expect(page.locator("#pantallaApp")).to_be_visible()
            expect(page.locator(".prop")).to_have_count(10)
            assert "10 publicadas" in page.locator("#contador").inner_text()
        paso("entra y ve las 10 propiedades", t_login_ok)

        def t_sesion():
            page.reload()
            expect(page.locator("#pantallaApp")).to_be_visible(timeout=10000)
            expect(page.locator(".prop")).to_have_count(10)
        paso("al recargar sigue dentro (sesión guardada)", t_sesion)

        print("Panel: nueva propiedad")

        def t_nueva():
            page.click("#btnNueva")
            expect(page.locator("#vistaEditor")).to_be_visible()
            expect(page.locator("#tituloEditor")).to_contain_text("AM-015")
            assert page.locator("#btnCopiarAviso").is_disabled()
        paso("abre editor con código AM-015 reservado", t_nueva)

        def t_fotos():
            page.set_input_files("#inputFotos", rutas)
            expect(page.locator(".foto")).to_have_count(3, timeout=20000)
            expect(page.locator("#progreso")).to_be_hidden(timeout=10000)
            expect(page.locator("#btnGuardar")).to_be_enabled()
            assert page.locator(".foto[data-i='0'] .portada").count() == 1
            guardadas = servidor_pruebas.fotos_guardadas()
            assert len(guardadas) == 6, guardadas                      # 3 grandes + 3 miniaturas
            assert sum(1 for g in guardadas if g.startswith("thumb/AM-015/")) == 3, guardadas
        paso("sube 3 fotos (con miniatura) y la primera queda de portada", t_fotos)

        def t_orden():
            srcs = lambda: page.eval_on_selector_all(".foto img", "els => els.map(e => e.getAttribute('src'))")  # noqa: E731
            antes = srcs()
            page.click(".foto[data-i='1'] [data-portada]")          # la 2ª pasa a portada
            despues = srcs()
            assert despues[0] == antes[1] and despues[1] == antes[0], "★ no movió la foto a portada"
            page.click(".foto[data-i='0'] [data-mover='1']")        # ▶ la baja al 2º lugar
            assert srcs()[1] == despues[0], "▶ no movió la foto"
            assert page.locator(".foto[data-i='0'] [data-mover='-1']").is_disabled()
            page.click(".foto[data-i='2'] [data-quitar]")           # × quita la 3ª
            expect(page.locator(".foto")).to_have_count(2)
        paso("★ ▶ y × reordenan y quitan fotos sin arrastrar", t_orden)

        def t_datos():
            page.click("#opsOperacion [data-valor='Arriendo']")
            page.click("#opsEstado [data-valor='Reservada']")
            page.select_option("#fType", "Casa")
            page.fill("#fCommune", "Quilpué")
            page.fill("#fAddress", "Belloto 2000")
            page.fill("#fPrecio", "550.000")
            expect(page.locator("#precioPreview")).to_contain_text("$550.000 al mes")
            page.click("#btnSugerirTitulo")
            assert page.input_value("#fTitle") == "Arriendo Casa en Belloto 2000, Quilpué – $550.000", page.input_value("#fTitle")
            page.fill("#fBedrooms", "4")
            page.fill("#fBathrooms", "2")
            page.fill("#fSummary", "Casa 2 pisos en Belloto 2000.")
            page.fill("#fDescription", "Se arrienda linda casa.\n\nContacto:\n+56 9 1234 5678\nInstagram: @algo\nPagina web: x.cl")
        paso("llena datos, vista previa del precio y título sugerido", t_datos)

        def t_guardar():
            page.click("#btnGuardar")
            expect(page.locator("#vistaLista")).to_be_visible()
            expect(page.locator(".prop")).to_have_count(11, timeout=10000)
            primera = page.locator(".prop").first
            assert "AM-015" in primera.inner_text()
            assert primera.locator(".et-Reservada").count() == 1
            expect(page.locator("#avisoLista")).to_contain_text("publicada")
            assert page.locator("#avisoLista a[href*='AM-015']").count() == 1
            page.wait_for_timeout(500)
            guardadas = servidor_pruebas.fotos_guardadas()
            assert len(guardadas) == 4, guardadas                      # la foto quitada se borró con su miniatura
        paso("guarda, aparece primera como Reservada y borra la foto quitada", t_guardar)

        print("Panel: compartir")

        def t_aviso():
            page.click(".prop[data-codigo='AM-015'] [data-accion='editar']")
            expect(page.locator("#vistaEditor")).to_be_visible()
            texto = page.locator("#textoAviso").text_content()  # está dentro de un <details> cerrado
            assert texto.startswith("ARRIENDO CASA EN BELLOTO 2000"), texto[:60]
            assert "property.html?id=AM-015" in texto
            assert "Canon de arriendo: $550.000" in texto
            assert "4 dormitorios" in texto
            assert "+56 9 1234 5678" not in texto, "no limpió el contacto viejo de la descripción"
            assert texto.count("Instagram:") == 1
            assert "#Quilpué" in texto
            page.click("#btnCopiarAviso")
            portapapeles = page.evaluate("navigator.clipboard.readText()")
            assert portapapeles.startswith("ARRIENDO CASA"), portapapeles[:40]
        paso("arma el aviso estilo AYM, limpia contactos viejos y lo copia", t_aviso)

        def t_fotos_compartir():
            page.click("#btnCompartirFotos")
            expect(page.locator("#avisoEditor")).to_contain_text("celular")
        paso("sin Web Share explica que se hace desde el celular", t_fotos_compartir)

        def t_volver_limpio():
            page.click("#btnCancelar")
            expect(page.locator("#vistaLista")).to_be_visible()
            assert page.locator("#modal").is_hidden()
        paso("Volver sin cambios no pregunta nada", t_volver_limpio)

        def t_volver_sucio():
            page.click(".prop[data-codigo='AM-015'] [data-accion='editar']")
            page.fill("#fTitle", "otro título")
            page.click("#btnCancelar")
            expect(page.locator("#modal")).to_be_visible()
            page.click("#modalSi")
            expect(page.locator("#vistaLista")).to_be_visible()
            assert "otro título" not in page.locator(".prop[data-codigo='AM-015']").inner_text()
        paso("Volver con cambios pregunta y descarta", t_volver_sucio)

        def t_borrador():
            page.click("#btnNueva")
            expect(page.locator("#vistaEditor")).to_be_visible()
            page.fill("#fTitle", "Borrador de prueba")
            page.fill("#fCommune", "Limache")
            page.wait_for_timeout(600)                      # el borrador se guarda 300 ms después de escribir
            page.once("dialog", lambda d: d.accept())       # el aviso "¿salir sin guardar?" del navegador
            page.reload()
            expect(page.locator("#pantallaApp")).to_be_visible(timeout=10000)
            expect(page.locator("#vistaLista")).to_be_visible()
            page.click("#btnNueva")
            expect(page.locator("#modal")).to_be_visible()
            assert "Borrador de prueba" in page.locator("#modalTexto").inner_text()
            page.click("#modalSi")
            assert page.input_value("#fTitle") == "Borrador de prueba"
            assert page.input_value("#fCommune") == "Limache"
            page.click("#btnCancelar")
            page.click("#modalSi")
            expect(page.locator("#vistaLista")).to_be_visible()
            page.click("#btnNueva")
            assert page.locator("#modal").is_hidden(), "el borrador descartado volvió a aparecer"
            page.click("#btnCancelar")
            expect(page.locator("#vistaLista")).to_be_visible()
        paso("si se recarga a medio escribir, ofrece seguir con el borrador", t_borrador)

        def t_atras():
            page.click(".prop[data-codigo='AM-002'] [data-accion='editar']")
            expect(page.locator("#vistaEditor")).to_be_visible()
            page.fill("#fTitle", "cambio sin guardar")
            page.go_back()
            expect(page.locator("#modal")).to_be_visible()
            page.click("#modalNo")
            expect(page.locator("#vistaEditor")).to_be_visible()
            assert page.input_value("#fTitle") == "cambio sin guardar"
            page.click("#btnCancelar")
            page.click("#modalSi")
            expect(page.locator("#vistaLista")).to_be_visible()
        paso("el botón «atrás» del celular no la saca del editor sin preguntar", t_atras)

        def t_validaciones():
            page.click("#btnNueva")
            expect(page.locator("#vistaEditor")).to_be_visible()
            page.fill("#fTitle", "Prueba validaciones")
            page.fill("#fPrecio", "$ 150.000.000")
            expect(page.locator("#precioPreview")).to_contain_text("$150.000.000")
            page.fill("#fBathrooms", "1,5")
            page.click("#btnGuardar")
            expect(page.locator("#avisoEditor")).to_contain_text("número entero")
            assert page.locator("#vistaEditor").is_visible(), "guardó con baños decimales"
            page.fill("#fBathrooms", "")
            page.fill("#fPrecio", "abc")
            page.click("#btnGuardar")
            expect(page.locator("#avisoEditor")).to_contain_text("Revisa el precio")
            page.click("#btnCancelar")
            page.click("#modalSi")
            expect(page.locator("#vistaLista")).to_be_visible()
            assert "Prueba validaciones" not in page.locator("#lista").inner_text(), "se guardó con datos inválidos"
        paso("precio con $ y puntos se entiende; decimales en baños y precio inválido no se guardan", t_validaciones)

        print("Panel: estados")

        def t_ocultar():
            page.click(".prop[data-codigo='AM-015'] [data-accion='visible']")
            expect(page.locator(".prop[data-codigo='AM-015'] .et-oculta")).to_be_visible()
            page.select_option("#filtroEstado", "ocultas")
            expect(page.locator(".prop")).to_have_count(1)
            page.select_option("#filtroEstado", "")
            page2 = ctx.new_page()
            page2.goto(BASE + "/index.html?mock=1")
            expect(page2.locator(".card")).to_have_count(10, timeout=10000)
            page2.close()
        paso("ocultar la saca del sitio público", t_ocultar)

        def t_mostrar():
            page.click(".prop[data-codigo='AM-015'] [data-accion='visible']")
            expect(page.locator(".prop[data-codigo='AM-015'] .et-oculta")).to_have_count(0)
            page2 = ctx.new_page()
            page2.goto(BASE + "/index.html?mock=1")
            expect(page2.locator(".card")).to_have_count(11, timeout=10000)
            # La tarjeta usa la miniatura y lleva la cinta de estado
            tarjeta = page2.locator(".card", has_text="AM-015").first if page2.locator(".card", has_text="AM-015").count() else page2.locator(".card-reservada").first
            src = tarjeta.locator("img").get_attribute("src")
            assert "/thumb/AM-015/" in src, src
            assert tarjeta.locator(".cinta").inner_text().strip().lower() == "reservada"
            # La ficha usa miniaturas en la galería y la grande en el visor
            page2.goto(BASE + "/property.html?mock=1&id=AM-015")
            expect(page2.locator("#content")).to_be_visible(timeout=10000)
            srcs = page2.eval_on_selector_all("#gallery img", "els => els.map(e => e.getAttribute('src'))")
            assert len(srcs) == 2 and all("/thumb/AM-015/" in s for s in srcs), srcs
            page2.locator("#gallery img").first.click()
            expect(page2.locator("#lightbox")).to_be_visible()
            grande = page2.locator("#lightboxImage").get_attribute("src")
            assert "/thumb/" not in grande and "AM-015/" in grande, grande
            page2.close()
        paso("mostrar la devuelve al sitio; tarjeta y galería usan miniaturas, visor la grande", t_mostrar)

        def t_estados():
            fila = page.locator(".prop[data-codigo='AM-015']")
            fila.locator("[data-accion='disponible']").click()
            expect(fila.locator(".et-Disponible")).to_be_visible()
            fila.locator("[data-accion='baja']").click()
            expect(page.locator("#modal")).to_be_visible()
            assert "arrendada" in page.locator("#modalTitulo").inner_text().lower()
            page.click("#modalSi")
            expect(fila.locator(".et-Arrendada")).to_be_visible()
        paso("volver a disponible y marcar arrendada", t_estados)

        print("Panel: eliminar")

        def t_eliminar():
            page.click(".prop[data-codigo='AM-015'] [data-accion='editar']")
            page.click("#btnEliminar")
            expect(page.locator("#modal")).to_be_visible()
            page.click("#modalSi")
            expect(page.locator("#vistaLista")).to_be_visible()
            expect(page.locator(".prop")).to_have_count(10, timeout=10000)
            expect(page.locator("#avisoLista")).to_contain_text("eliminada")
            page.wait_for_timeout(500)
            assert servidor_pruebas.fotos_guardadas() == [], servidor_pruebas.fotos_guardadas()
        paso("eliminar borra la propiedad y sus fotos del almacén", t_eliminar)

        print("Panel: contraseña")

        def t_recuperar():
            # El enlace del correo abre una pestaña nueva: simulamos una carga completa
            # (cambiar solo el #hash no recarga la página).
            page.goto(BASE + "/admin.html?mock=1&desde=correo#access_token=x&type=recovery")
            expect(page.locator("#pantallaClave")).to_be_visible(timeout=10000)
            page.fill("#clave1", "corta")
            page.fill("#clave2", "corta")
            page.click("#btnGuardarClave")
            expect(page.locator("#avisoClave")).to_contain_text("8 caracteres")
            page.fill("#clave1", "nuevaclave123")
            page.fill("#clave2", "nuevaclave123")
            page.click("#btnGuardarClave")
            expect(page.locator("#pantallaApp")).to_be_visible(timeout=10000)
        paso("enlace de recuperación pide contraseña nueva y entra", t_recuperar)

        def t_olvide():
            page.click("#btnSalir")
            page.click("#modalSi")
            expect(page.locator("#pantallaLogin")).to_be_visible()
            page.fill("#email", "")
            page.click("#btnOlvide")
            expect(page.locator("#avisoLogin")).to_contain_text("Escribe tu correo")
            page.fill("#email", "fanny@ejemplo.cl")
            page.click("#btnOlvide")
            expect(page.locator("#avisoLogin")).to_contain_text("te llegará un mensaje")
        paso("olvidé mi contraseña envía el correo", t_olvide)

        def t_noadmin():
            page.fill("#email", "noadmin@ejemplo.cl")
            page.fill("#password", "demo1234")
            page.click("#btnEntrar")
            expect(page.locator("#pantallaApp")).to_be_visible(timeout=10000)
            expect(page.locator("#avisoLista")).to_contain_text("no está autorizada")
            assert page.locator("#btnNueva").is_disabled()
            page.click("#btnSalir")
            page.click("#modalSi")
            expect(page.locator("#pantallaLogin")).to_be_visible()
        paso("una cuenta que no está en administradores ve el aviso y no puede publicar", t_noadmin)

        def t_errores():
            assert not errores_js, "\n".join(errores_js[:5])
        paso("sin errores de JavaScript en consola", t_errores)

        navegador.close()
    srv.shutdown()

    print()
    print("%d pasos, %d fallas" % (pasos, len(fallos)))
    for nombre, e in fallos:
        print(" - %s: %s" % (nombre, str(e).splitlines()[0] if str(e) else repr(e)))
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main()
