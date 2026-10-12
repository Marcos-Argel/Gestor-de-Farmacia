-- ============================================================
-- Migracion: rol CLIENTE
-- ============================================================
-- Agrega el rol CLIENTE, usado por el registro publico en /login
-- (boton "Crear cuenta"). A diferencia de los demas roles, CLIENTE
-- no tiene acceso a ningun endpoint del panel interno (ver
-- SecurityConfig.java) -- por ahora solo entra a una pantalla de
-- bienvenida (/portal-cliente) mientras se construye el portal
-- publico real (catalogo, ubicacion, WhatsApp, etc.).
--
-- Ejecutar UNA SOLA VEZ contra la base de datos ya existente (la que usa
-- el docker-compose, puerto 5433). Correr esto en DBeaver conectado a esa
-- base, no a tu Postgres local (ahi ya se crea con farmacy_schema.sql
-- actualizado si es una base nueva).
-- ============================================================

INSERT INTO roles (nombre, descripcion)
SELECT 'CLIENTE', 'Cuenta de cliente creada por registro público, sin acceso al panel interno'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'CLIENTE');

-- Verificacion rapida: deberias ver ADMIN, GERENTE, VENDEDOR, INVENTARIO, CLIENTE.
SELECT id, nombre, descripcion FROM roles ORDER BY id;
