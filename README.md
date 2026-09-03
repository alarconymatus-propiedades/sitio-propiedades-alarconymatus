# AYM Propiedades — Sitio estático + panel de administración

Sitio estático (GitHub Pages) con un panel web para publicar propiedades
sin tocar código. Los datos y las fotos nuevas viven en Supabase.

- **Sitio público:** `index.html`, `property.html`
- **Panel:** `admin.html` → `www.alarconymatuspropiedades.cl/admin.html`
- **Guía para quien publica:** [GUIA-PANEL.md](GUIA-PANEL.md)

---

## Puesta en marcha (una sola vez)

### 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) → *Start your project* (plan gratuito).
2. Crea un proyecto llamado `aym-propiedades`, región **South America (São Paulo)**.
3. Guarda bien la contraseña de la base de datos que te pide.

### 2. Crear las tablas y el almacén de fotos

En Supabase, **SQL Editor → New query**, y ejecuta en este orden:

1. El contenido de [`supabase/schema.sql`](supabase/schema.sql) — crea la tabla
   `propiedades`, el bucket `fotos` y los permisos (RLS).
2. El contenido de [`supabase/seed.sql`](supabase/seed.sql) — carga las 14
   propiedades que ya existían en el repositorio.

Ambos se pueden ejecutar más de una vez sin romper nada.

### 3. Conectar el sitio

En **Settings → API** copia los dos valores y pégalos en
[`assets/config.js`](assets/config.js):

```js
SUPABASE_URL:      "https://xxxxxxxx.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...",
```

> La llave `anon` es **pública por diseño** y va en el HTML sin riesgo:
> quien protege los datos son las políticas RLS del `schema.sql`.
> **Nunca** pegar aquí la llave `service_role`.

### 4. Crear el usuario que va a publicar

**Authentication → Users → Add user**: correo y contraseña, y marca
*Auto Confirm User*.

Después, en **Authentication → Providers → Email**, desactiva
**Enable sign-ups**. Así nadie puede crearse una cuenta por su cuenta;
los usuarios los creas tú desde el panel de Supabase.

### 5. Restringir desde dónde se puede usar

En **Authentication → URL Configuration**, en *Site URL* pon
`https://www.alarconymatuspropiedades.cl`.

---

## Cómo está armado

```
index.html            Portada: grilla de propiedades + filtros
property.html         Ficha individual (?id=AM-014)
admin.html            Panel de administración
assets/
  config.js           URL y llave de Supabase          <-- hay que completarlo
  data.js             Capa de datos (Supabase -> respaldo JSON)
  script.js           Header, footer y tarjetas del sitio público
  admin.js            Lógica del panel
  admin.css           Estilos del panel
  style.css           Estilos del sitio público
data/properties.json  Respaldo. Ver nota más abajo.
fotos/AM-XXX/         Fotos históricas, servidas desde el repositorio
supabase/
  schema.sql          Tabla, bucket y permisos
  seed.sql            Carga inicial (generado)
scripts/
  generar_seed.py     Regenera seed.sql desde properties.json + fotos/
```

### De dónde salen los datos

`assets/data.js` es el único punto de lectura. El orden es:

1. **Supabase** — lo que publica el panel.
2. **`data/properties.json`** — respaldo. Se usa si Supabase no responde,
   si todavía no está configurado, o si la tabla está vacía.

Por eso el sitio **nunca se cae** aunque Supabase falle: en el peor caso
muestra la última versión del JSON.

### Dónde viven las fotos

Conviven dos orígenes, a propósito:

- **Fotos históricas** (`/fotos/AM-XXX/...`): siguen en el repositorio y las
  sirve GitHub Pages. Son 43 MB ya versionados; moverlas no aportaba nada.
- **Fotos nuevas** (las que sube el panel): van a Supabase Storage, bucket
  `fotos`, carpeta por código de propiedad.

El panel achica cada foto a 1800 px de lado mayor antes de subirla, para que
la página cargue rápido y no se llene la cuota gratuita.

---

## Desarrollo local

```bash
python -m http.server 8123
```

Y abre `http://127.0.0.1:8123`. Hace falta un servidor: abrir el archivo
con doble clic (`file://`) rompe los `fetch`.

Para regenerar la carga inicial después de tocar `data/properties.json`
o agregar carpetas en `fotos/`:

```bash
python scripts/generar_seed.py
```

---

## Publicación (GitHub Pages + dominio)

1. **Settings → Pages**: *Deploy from a branch*, rama `main`, carpeta `/ (root)`.
2. El archivo `CNAME` ya trae `www.alarconymatuspropiedades.cl`.
3. DNS (Cloudflare o NIC Chile):
   - `A @` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME www` → `alarconymatus-propiedades.github.io`
4. **Settings → Pages → Custom domain**: escribe el dominio y guarda.
   GitHub emite el certificado SSL solo.

> **Pendiente:** el dominio está vencido en NIC Chile. Mientras tanto el sitio
> y el panel funcionan en
> `https://alarconymatus-propiedades.github.io/sitio-propiedades-alarconymatus/`.
> Al renovarlo no hay que cambiar nada en el código.

---

## Notas

- Colores del sitio: variables CSS al inicio de `assets/style.css`.
  Colores del panel: al inicio de `assets/admin.css`.
- Logo: `assets/logo.png`.
- `admin.html` lleva `noindex, nofollow`: no aparece en Google. Igual está
  protegido por login, no por ser secreto.
