-- ============================================================
-- Migracion: login con Google
-- ============================================================
-- Agrega a "usuarios" las columnas necesarias para saber si una cuenta
-- se creo/usa con Google (columna "proveedor") y guardar la foto de
-- perfil que Google entrega (columna "foto_url"). Las cuentas ya
-- existentes (creadas con email/password) quedan como proveedor
-- 'LOCAL' automaticamente gracias al DEFAULT.
--
-- Ejecutar UNA SOLA VEZ contra la base de datos ya existente (la que usa
-- el docker-compose, puerto 5433). Correr esto en DBeaver conectado a esa
-- base, no a tu Postgres local (ahi ya se crea con farmacy_schema.sql
-- actualizado si es una base nueva).
-- ============================================================

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS proveedor VARCHAR(20) NOT NULL DEFAULT 'LOCAL';

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500);

-- Verificacion rapida: todas las cuentas actuales deberian quedar en LOCAL.
SELECT id, email, proveedor, foto_url FROM usuarios ORDER BY id;
