# Mis finanzas — notas para Claude

App personal (PWA) de Pedro. Producción: https://pterenaud9999.github.io/mis-finanzas/ (GitHub Pages, rama `main`, raíz).
Datos en Supabase (proyecto `fsmnkedjwmwbtrqtlrbq`): tabla `public.docs` (owner, path, data jsonb, deleted, updated_at) con RLS por usuario; bucket privado `fotos` (`<uid>/<id>`). Nunca subir datos personales al repo (es público).

## Estructura
- `src/wallet/parts/*.js` — código de la app (app.js base + ext.js, app2.js, app3.js, backup.js). `build.py` + `patch2.py` aplican parches y generan el `<script>` dentro de `src/wallet/index.html` (que también contiene el CSS).
- `src/pwa/` — capa fuera de Claude: `shim.js` (emula `claude.use("db"|"assets")` sobre Supabase con caché IndexedDB y cola sin conexión), `sw.js`, manifest, íconos, `head.html`, `vendor/supabase.js`.
- Raíz del repo = salida publicada (no editar a mano).

## Compilar
```
cd src/wallet && python3 parts/build.py && cd ../pwa && python3 build_pwa.py
```
Verificar sintaxis del script de index.html con `node -e "new Function(...)"` antes de publicar.

## Versión dentro de Claude (artefacto "Mis finanzas")
`src/wallet/index.html` compilado también es la página del artefacto (slug 495cab13-25e1-4c85-9357-8172526dd0e7). Si se publica allí, usa la plantilla con el nombre del usuario sólo en el artefacto, no en el repo.
