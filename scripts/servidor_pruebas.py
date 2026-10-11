# -*- coding: utf-8 -*-
"""
Servidor local para probar el sitio y el panel SIN un proyecto Supabase.

Sirve los archivos del repositorio y, además, un almacén de fotos en
memoria que usa assets/dev/mock-supabase.js cuando el panel se abre con
?mock=1:

    PUT    /__mockstore/fotos/<ruta>              guarda una foto
    DELETE /__mockstore/fotos/<ruta>              la borra
    GET    /storage/v1/object/public/fotos/<ruta> la sirve (misma URL que Supabase)

Uso:
    py -3 scripts/servidor_pruebas.py            (puerto 8123)
    py -3 scripts/servidor_pruebas.py 9000

Luego abrir:
    http://127.0.0.1:8123/admin.html?mock=1      (clave: demo1234)
    http://127.0.0.1:8123/index.html?mock=1
"""

import os
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREFIJO_STORE = "/__mockstore/fotos/"
PREFIJO_PUBLICO = "/storage/v1/object/public/fotos/"

_fotos = {}
_lock = threading.Lock()


class Manejador(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=RAIZ, **kw)

    def log_message(self, fmt, *args):  # silencio: Playwright llena la consola si no
        if os.environ.get("AYM_SERVIDOR_VERBOSE"):
            super().log_message(fmt, *args)

    # ---- fotos simuladas ----
    def do_PUT(self):
        if not self.path.startswith(PREFIJO_STORE):
            self.send_error(405)
            return
        largo = int(self.headers.get("Content-Length") or 0)
        cuerpo = self.rfile.read(largo)
        tipo = self.headers.get("Content-Type") or "application/octet-stream"
        with _lock:
            _fotos[self.path[len(PREFIJO_STORE):]] = (tipo, cuerpo)
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_DELETE(self):
        if not self.path.startswith(PREFIJO_STORE):
            self.send_error(405)
            return
        with _lock:
            _fotos.pop(self.path[len(PREFIJO_STORE):], None)
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith(PREFIJO_PUBLICO):
            ruta = self.path[len(PREFIJO_PUBLICO):].split("?")[0]
            with _lock:
                item = _fotos.get(ruta)
            if not item:
                self.send_error(404)
                return
            tipo, cuerpo = item
            self.send_response(200)
            self.send_header("Content-Type", tipo)
            self.send_header("Content-Length", str(len(cuerpo)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(cuerpo)
            return
        super().do_GET()

    def end_headers(self):
        # Que el navegador no cachee nada mientras se desarrolla
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def crear(puerto=8123):
    return ThreadingHTTPServer(("127.0.0.1", puerto), Manejador)


def fotos_guardadas():
    with _lock:
        return sorted(_fotos.keys())


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    srv = crear(puerto)
    print("Sirviendo %s en http://127.0.0.1:%d" % (RAIZ, puerto))
    print("Panel de prueba: http://127.0.0.1:%d/admin.html?mock=1  (clave demo1234)" % puerto)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
