# Mis finanzas

App personal de finanzas (PWA): funciona sin internet y sincroniza con Supabase.

- Los datos **no** están en este repositorio: viven en Supabase, protegidos por inicio de sesión y RLS.
- La llave `sb_publishable_…` en `shim.js` es pública por diseño; la seguridad la dan las políticas RLS.
