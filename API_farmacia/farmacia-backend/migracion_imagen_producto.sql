-- ============================================================
-- Migracion: foto de producto
-- ============================================================
-- Agrega una columna para guardar la foto del producto, subida desde
-- el formulario de Inventario. Se guarda como base64 (data URL) porque
-- el frontend la redimensiona/comprime antes de enviarla, asi que el
-- tamano se mantiene chico -- no hace falta un servicio de archivos
-- aparte (S3, disco persistente, etc.), lo cual tambien evita el
-- problema de que Render borre archivos sueltos en cada redeploy.
--
-- Ejecutar UNA SOLA VEZ contra la base de datos ya existente (la que usa
-- el docker-compose, puerto 5433). Correr esto en DBeaver conectado a esa
-- base, no a tu Postgres local (ahi ya se crea con farmacy_schema.sql
-- actualizado si es una base nueva).
-- ============================================================

ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_base64 TEXT;
