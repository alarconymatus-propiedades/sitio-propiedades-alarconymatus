# AYM Propiedades — Sitio estático + panel de administración

Sitio estático (GitHub Pages) con un panel web para publicar propiedades
sin tocar código. Los datos y las fotos nuevas viven en Supabase.

- **Sitio público:** `index.html`, `property.html`
- **Panel:** `admin.html` → `https://www.alarconymatuspropiedades.cl/admin.html`
- **Guía para quien publica:** [GUIA-PANEL.md](GUIA-PANEL.md)

---

## Puesta en marcha (10 minutos, una sola vez)

### 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) → *Start your project* (plan gratuito).
2. *New project*: nombre `aym-propiedades`, región **South America (São Paulo)**,
   y una contraseña de base de datos (guárdala; no se vuelve a usar desde el sitio).
3. Espera a que termine de crearse (1-2 minutos).

### 2. Crear el usuario que va a publicar

**Authentication → Users → Add user → Create new user**: correo y contraseña
de Fanny, y marca **Auto Confirm User**.

Hazlo **antes** del paso 3: el SQL registra como administradoras a todas
las cuentas que existan en ese momento. Para agregar otra persona después:
**Table Editor → administradores → Insert row** con su correo (y crear su
usuario en Authentication).

### 3. Crear las tablas, el almacén de fotos y cargar las propiedades

**SQL Editor → New query**, pega el contenido completo de
[`supabase/setup.sql`](supabase/setup.sql) y **Run**.

Crea la tabla `propiedades`, la lista de `administradores`, el bucket
`fotos` con sus permisos, y carga las 14 propiedades que ya existían
(10 visibles + 4 rescatadas de carpetas de fotos sin ficha, que quedan
ocultas para revisarlas en el panel). Se puede ejecutar más de una vez.

### 4. Conectar el sitio

**Settings → API** → copia los dos valores y pégalos en
[`assets/config.js`](assets/config.js) (se puede editar directo en GitHub
con el lápiz, y hacer *Commit changes*):

```js
SUPABASE_URL:      "https://xxxxxxxx.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...",
```

> La llave `anon` es **pública por diseño** y va en el HTML sin riesgo:
> quien protege los datos son las políticas RLS del `setup.sql`.
> **Nunca** pegar aquí la llave `service_role`.

Uno o dos minutos después del commit, GitHub Pages publica el cambio. Abre
`/admin.html`: abajo del formulario de entrada dice **«Conectado · N
propiedades publicadas»** si todo quedó bien, o te dice qué falta.

### 5. Ajustes de Authentication (5 clics)

- **Providers → Email**: dejar *Enable Email provider* activado y
  **desactivar *Enable sign-ups***. Así nadie puede crearse una cuenta;
  los usuarios los creas tú. (Aunque alguien lo lograra, sin estar en
  `administradores` no puede tocar nada.)
- **Providers**: todos los demás (Google, GitHub, Anonymous…) desactivados.
- **Sign In / Providers → Password**: *Minimum password length* **8**.
- **URL Configuration**: *Site URL* `https://www.alarconymatuspropiedades.cl`
  y en *Redirect URLs* agregar `https://www.alarconymatuspropiedades.cl/admin.html`
  (necesario para «¿Olvidaste tu contraseña?»).
- **Attack Protection**: activar *Leaked password protection* si está disponible.

### 6. Probar

Entra a `/admin.html` con el correo de Fanny, abre una propiedad, toca
**Guardar** sin cambiar nada y luego **Ver en el sitio**. Si eso funciona,
funciona todo.

---

## Cómo está armado

```
index.html            Portada: grilla de propiedades + filtros
property.html         Ficha individual (?id=AM-014)
admin.html            Panel de administración
assets/
  config.js           URL y llave de Supabase, datos de contacto   <-- completar (paso 4)
  data.js             Capa de datos del sitio (Supabase -> respaldo JSON)
  script.js           Header, footer y tarjetas del sitio público
  admin.js            Lógica del panel
  admin.css           Estilos del panel
  style.css           Estilos del sitio público
  dev/mock-supabase.js  Simulador de Supabase, SOLO para pruebas locales
data/properties.json  Respaldo (ver abajo)
fotos/AM-XXX/         Fotos históricas, servidas desde el repositorio
supabase/
  setup.sql           schema.sql + seed.sql en un solo archivo (generado)
  schema.sql          Tablas, funciones, bucket y permisos
  seed.sql            Carga inicial (generado)
scripts/
  generar_seed.py     Regenera seed.sql y setup.sql desde properties.json + fotos/
  servidor_pruebas.py Servidor local con almacén de fotos simulado
  probar_panel.py     Prueba de punta a punta del panel (Playwright)
```

### De dónde salen los datos

`assets/data.js` es el único punto de lectura del sitio público:

1. **Supabase** — lo que publica el panel (solo filas con `visible = true`).
2. **`data/properties.json`** — respaldo, solo si Supabase **no responde**
   o todavía no está configurado.

Así el sitio no se cae aunque Supabase falle. Ojo: el respaldo no sabe de
«ocultar», así que conviene mantenerlo razonablemente actualizado
(`py -3 scripts/generar_seed.py` no lo toca; es un archivo manual).

### Dónde viven las fotos

Conviven dos orígenes, a propósito:

- **Fotos históricas** (`/fotos/AM-XXX/...`): siguen en el repositorio y las
  sirve GitHub Pages. Son públicas aunque la propiedad esté oculta.
- **Fotos nuevas** (las que sube el panel): Supabase Storage, bucket `fotos`,
  una carpeta por código de propiedad. El panel achica cada foto a 1800 px
  antes de subirla; el bucket rechaza archivos de más de 10 MB y todo lo que
  no sea JPEG/PNG/WebP.

### Seguridad, en corto

- Leer propiedades visibles: cualquiera. Leer ocultas, crear, editar, borrar
  y subir fotos: solo cuentas cuyo correo está en `administradores`
  (función `es_admin()` usada por todas las políticas RLS).
- `siguiente_codigo()` no puede llamarla un anónimo.
- La librería de Supabase se carga con hash SRI: si el CDN la alterara, el
  navegador la rechaza.
- Todo lo que viene de los datos pasa por `esc()` antes de entrar al HTML.
- `admin.html` lleva `noindex`. No hace falta esconderlo: lo protege el login.

---

## Desarrollo y pruebas locales (sin Supabase)

```bash
py -3 scripts/servidor_pruebas.py
```

Abre `http://127.0.0.1:8123/admin.html?mock=1` (cualquier correo,
contraseña `demo1234`). Con `?mock=1` en localhost el sitio usa un
simulador en memoria con las propiedades de `data/properties.json`; nunca
se activa en el dominio real.

Prueba automática completa (entra, crea con fotos, ordena, guarda,
comparte, oculta, marca arrendada, elimina, recupera contraseña):

```bash
py -3 scripts/probar_panel.py
```

Requiere `py -3 -m pip install playwright` y `py -3 -m playwright install chromium`.
Con `--ver` abre el navegador visible.

Para regenerar la carga inicial después de tocar `data/properties.json`,
`supabase/schema.sql` o agregar carpetas en `fotos/`:

```bash
py -3 scripts/generar_seed.py
```

---

## Publicación (GitHub Pages + dominio)

Ya está configurado: rama `main`, carpeta raíz, `CNAME` con
`www.alarconymatuspropiedades.cl`, DNS en Cloudflare (A → GitHub Pages,
CNAME www → `alarconymatus-propiedades.github.io`). Cada commit a `main`
se publica solo en 1-2 minutos.

---

## Notas

- Colores del sitio: variables al inicio de `assets/style.css`. Del panel:
  al inicio de `assets/admin.css`.
- Datos de contacto que usa el panel para armar los avisos:
  `SITIO` en `assets/config.js`. Los del pie del sitio: `SITE` en `assets/script.js`.
- Logo: `assets/logo.png`.
