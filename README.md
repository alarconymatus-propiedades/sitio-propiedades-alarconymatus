
# AYM Propiedades — Sitio estático (GitHub Pages + Cloudflare)

## Publicación rápida
1. Crea un **nuevo repositorio** en GitHub llamado `aym-propiedades` (público).
2. Sube todos los archivos de este zip a la **rama** `main` (carpeta raíz).
3. En GitHub: **Settings → Pages → Build and deployment**: elige **Deploy from a branch**, *Branch*: `main`, *Folder*: `/ (root)`.
4. Verifica que exista el archivo **CNAME** con `alarconymatuspropiedades.cl` (ya incluido).
5. En **Cloudflare → DNS** agrega:
   - `A @` → 185.199.108.153
   - `A @` → 185.199.109.153
   - `A @` → 185.199.110.153
   - `A @` → 185.199.111.153
   - `CNAME www` → `TUUSUARIO.github.io` (o el host de Pages)
6. En GitHub Pages **Settings → Custom domain**: escribe `alarconymatuspropiedades.cl` y guarda (GitHub validará y emitirá SSL).
7. Listo. Tu sitio servirá desde tu dominio con CDN de Cloudflare.

## Agregar/editar propiedades
- Edita `data/properties.json` y sube cambios.
- Esquema por propiedad:
```json
{
  "id": "mi-id-unico",
  "title": "Titulo visible",
  "operation": "Venta | Arriendo",
  "type": "Casa | Departamento | Oficina | Parcela | etc.",
  "commune": "Viña del Mar",
  "status": "Disponible | Reservada | Vendida/Arrendada",
  "priceCLP": 300000,
  "priceUF": 3200,
  "summary": "Breve descripción para tarjeta",
  "description": "Descripción completa",
  "bedrooms": 3,
  "bathrooms": 2,
  "surface": 120,
  "expenses": "$60.000",
  "parking": "Sí/No/Opcional",
  "address": "Dirección o sector",
  "cover": "URL imagen portada",
  "images": ["URL1","URL2","URL3"]
}
```
- Las imágenes pueden ser URLs externas (Cloudflare R2, Imgur, etc.).

## Personalizar
- Colores: `assets/style.css` (variables CSS).
- Logo: `assets/logo.png`.

## SEO
- Edita `<title>` y `meta description` en `index.html` y `property.html`.
