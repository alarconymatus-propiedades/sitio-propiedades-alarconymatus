# -*- coding: utf-8 -*-
"""
Genera supabase/seed.sql a partir de lo que YA existe en el repositorio:

  1. data/properties.json  -> las 10 fichas publicadas hoy
  2. carpetas fotos/AM-XXX que NO tienen ficha -> se recuperan como
     borradores (visible = false) para revisarlas en el panel

Las fotos NO se mueven: siguen sirviéndose desde el repositorio con sus
rutas actuales (/fotos/AM-XXX/...). Solo las fotos nuevas que suba el
panel irán a Supabase Storage. Ambas conviven sin problema.

Uso:
    python scripts/generar_seed.py
"""

import io
import json
import os
import re
import glob

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PROPS = os.path.join(RAIZ, "data", "properties.json")
DIR_FOTOS = os.path.join(RAIZ, "fotos")
SALIDA = os.path.join(RAIZ, "supabase", "seed.sql")
SCHEMA = os.path.join(RAIZ, "supabase", "schema.sql")
SETUP = os.path.join(RAIZ, "supabase", "setup.sql")

# Los tipos tal como los muestra el panel (misma letra mayúscula/minúscula)
TIPOS = ["Casa", "Departamento", "Parcela", "Terreno", "Oficina",
         "Local comercial", "Bodega", "Otro"]


def tipo_canonico(t):
    t = (t or "Casa").strip()
    for c in TIPOS:
        if c.lower() == t.lower():
            return c
    return t

EXT_IMG = (".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP")

COMUNAS = [
    "Villa Alemana", "Viña del Mar", "Valparaíso", "Quilpué", "Limache",
    "Olmué", "Quillota", "Concón", "Casablanca", "La Calera", "San Antonio",
]


def orden_natural(nombre):
    """AM-014-2.jpg va antes que AM-014-10.jpg."""
    return [int(t) if t.isdigit() else t.lower()
            for t in re.split(r"(\d+)", nombre)]


def fotos_de(codigo):
    carpeta = os.path.join(DIR_FOTOS, codigo)
    if not os.path.isdir(carpeta):
        return []
    archivos = [f for f in os.listdir(carpeta) if f.endswith(EXT_IMG)]
    archivos.sort(key=orden_natural)
    # Si hay un archivo llamado "portada", va primero: esa es la foto de tapa.
    portadas = [f for f in archivos if f.lower().startswith("portada")]
    for f in portadas:
        archivos.remove(f)
    archivos = portadas + archivos
    return ["/fotos/%s/%s" % (codigo, f) for f in archivos]


def sql_txt(v):
    if v is None or v == "":
        return "null"
    return "'" + unicode_str(v).replace("'", "''") + "'"


def sql_num(v):
    if v is None or v == "":
        return "null"
    try:
        n = float(v)
    except (TypeError, ValueError):
        return "null"
    return str(int(n)) if n == int(n) else repr(n)


def unicode_str(v):
    return v if isinstance(v, str) else str(v)


def sql_json(lista):
    return "'" + json.dumps(lista, ensure_ascii=False).replace("'", "''") + "'::jsonb"


# ----------------------------------------------------------------------
# 1. Fichas que ya existen en properties.json
# ----------------------------------------------------------------------
with io.open(JSON_PROPS, encoding="utf-8") as fh:
    existentes = json.load(fh)

filas = []
codigos_con_ficha = set()

for p in existentes:
    codigo = p.get("id")
    codigos_con_ficha.add(codigo)

    imgs = list(p.get("images") or [])
    cover = p.get("cover")
    if cover:
        if cover in imgs:
            imgs.remove(cover)
        imgs.insert(0, cover)
    if not imgs:
        imgs = fotos_de(codigo)

    op = (p.get("operation") or "Venta").strip().capitalize()
    if op not in ("Venta", "Arriendo"):
        op = "Venta"

    st = (p.get("status") or "Disponible").strip().capitalize()
    if st not in ("Disponible", "Reservada", "Vendida", "Arrendada"):
        st = "Disponible"

    filas.append({
        "codigo": codigo,
        "title": p.get("title"),
        "operation": op,
        "type": tipo_canonico(p.get("type")),
        "commune": p.get("commune"),
        "address": p.get("address"),
        "status": st,
        "price_clp": p.get("priceCLP"),
        "price_uf": p.get("priceUF"),
        "summary": p.get("summary"),
        "description": p.get("description"),
        "bedrooms": p.get("bedrooms"),
        "bathrooms": p.get("bathrooms"),
        "surface": p.get("surface"),
        "terrain": p.get("terrain"),
        "images": imgs,
        "visible": True,
    })

# ----------------------------------------------------------------------
# 2. Carpetas de fotos sin ficha -> rescatar como borradores
# ----------------------------------------------------------------------
huerfanas = []
if os.path.isdir(DIR_FOTOS):
    for codigo in sorted(os.listdir(DIR_FOTOS)):
        if not re.match(r"^AM-\d+$", codigo):
            continue
        if codigo in codigos_con_ficha:
            continue
        imgs = fotos_de(codigo)
        if not imgs:
            continue

        # El .txt que a veces acompaña a las fotos trae el aviso completo
        titulo, descripcion, precio, operacion = None, None, None, "Venta"
        txts = glob.glob(os.path.join(DIR_FOTOS, codigo, "*.txt"))
        if txts:
            nombre = os.path.basename(txts[0])[:-4]
            titulo = re.sub(r"^\s*\d+\s*[.\-]\s*", "", nombre).strip()
            with io.open(txts[0], encoding="utf-8", errors="replace") as fh:
                descripcion = fh.read().strip()
            m = re.search(r"\$\s*([\d.]{7,})", nombre + "\n" + descripcion)
            if m:
                try:
                    precio = int(m.group(1).replace(".", ""))
                except ValueError:
                    precio = None
            if re.search(r"arriend", nombre + " " + descripcion[:400], re.I):
                operacion = "Arriendo"

        if not titulo:
            titulo = "Propiedad %s (falta completar)" % codigo

        comuna = None
        for c in COMUNAS:
            if re.search(re.escape(c), titulo + " " + (descripcion or ""), re.I):
                comuna = c
                break

        tipo = "Casa"
        for palabra, t in (("parcela", "Parcela"), ("departamento", "Departamento"),
                           ("terreno", "Terreno"), ("local", "Local comercial"),
                           ("oficina", "Oficina")):
            if re.search(palabra, titulo, re.I):
                tipo = t
                break

        filas.append({
            "codigo": codigo,
            "title": titulo[:300],
            "operation": operacion,
            "type": tipo,
            "commune": comuna,
            "address": None,
            "status": "Disponible",
            "price_clp": precio,
            "price_uf": None,
            "summary": None,
            "description": descripcion,
            "bedrooms": None,
            "bathrooms": None,
            "surface": None,
            "terrain": None,
            "images": imgs,
            # OCULTAS a propósito: los datos se dedujeron del .txt y hay que
            # revisarlos en el panel antes de publicarlas.
            "visible": False,
        })
        huerfanas.append((codigo, len(imgs)))

# ----------------------------------------------------------------------
# 3. Escribir el SQL
# ----------------------------------------------------------------------
filas.sort(key=lambda f: orden_natural(f["codigo"]))

lineas = [
    "-- ============================================================",
    "--  AYM Propiedades — Carga inicial (generado automáticamente)",
    "--  Generado por scripts/generar_seed.py — no editar a mano.",
    "--",
    "--  Ejecutar DESPUÉS de supabase/schema.sql, en el SQL Editor.",
    "--  Es seguro ejecutarlo más de una vez: no duplica ni pisa nada.",
    "-- ============================================================",
    "",
]

for f in filas:
    lineas.append(
        "insert into public.propiedades\n"
        "  (codigo, title, operation, type, commune, address, status,\n"
        "   price_clp, price_uf, summary, description,\n"
        "   bedrooms, bathrooms, surface, terrain, images, visible)\n"
        "values\n"
        "  (%s, %s, %s, %s, %s, %s, %s,\n"
        "   %s, %s, %s, %s,\n"
        "   %s, %s, %s, %s, %s, %s)\n"
        "on conflict (codigo) do nothing;\n" % (
            sql_txt(f["codigo"]), sql_txt(f["title"]), sql_txt(f["operation"]),
            sql_txt(f["type"]), sql_txt(f["commune"]), sql_txt(f["address"]),
            sql_txt(f["status"]),
            sql_num(f["price_clp"]), sql_num(f["price_uf"]),
            sql_txt(f["summary"]), sql_txt(f["description"]),
            sql_num(f["bedrooms"]), sql_num(f["bathrooms"]),
            sql_num(f["surface"]), sql_num(f["terrain"]),
            sql_json(f["images"]), "true" if f["visible"] else "false",
        )
    )

with io.open(SALIDA, "w", encoding="utf-8", newline="\n") as fh:
    fh.write("\n".join(lineas))

# ----------------------------------------------------------------------
# 4. setup.sql = schema.sql + seed.sql, para pegar UNA sola vez en Supabase
# ----------------------------------------------------------------------
with io.open(SCHEMA, encoding="utf-8") as fh:
    schema = fh.read()
with io.open(SETUP, "w", encoding="utf-8", newline="\n") as fh:
    fh.write(
        "-- ============================================================\n"
        "--  AYM Propiedades — PUESTA EN MARCHA EN UN SOLO PASO\n"
        "--  (generado por scripts/generar_seed.py: schema.sql + seed.sql)\n"
        "--\n"
        "--  1. Crea antes el usuario en Authentication -> Users\n"
        "--  2. Pega TODO este archivo en SQL Editor -> New query -> Run\n"
        "--  Es seguro ejecutarlo más de una vez.\n"
        "-- ============================================================\n\n"
    )
    fh.write(schema.rstrip() + "\n\n")
    fh.write("\n".join(lineas))

print("Generado: supabase/seed.sql y supabase/setup.sql")
print("  %d propiedades en total" % len(filas))
print("  %d fotos referenciadas" % sum(len(f["images"]) for f in filas))
print("  %d publicadas / %d ocultas para revisar"
      % (sum(1 for f in filas if f["visible"]),
         sum(1 for f in filas if not f["visible"])))
if huerfanas:
    print("\n  Rescatadas de carpetas sin ficha (quedan OCULTAS):")
    for codigo, n in huerfanas:
        print("    %s  -> %d fotos" % (codigo, n))
