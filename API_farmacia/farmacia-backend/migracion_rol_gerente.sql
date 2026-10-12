-- ============================================================
-- Migracion: reemplazar el rol CAJERO por GERENTE
-- ============================================================
-- Contexto: VENDEDOR y CAJERO hacian practicamente lo mismo (ver
-- SecurityConfig.java, ambos tenian acceso a Ventas/Clientes/Caja), asi
-- que se elimina CAJERO y esa funcion queda cubierta por VENDEDOR. En su
-- lugar se agrega GERENTE: un rol con casi los mismos permisos que ADMIN,
-- excepto que NO puede crear ni ascender a otro usuario a ADMIN o GERENTE
-- (esa regla se valida en UsuarioService.java, no en la base de datos).
--
-- Ejecutar UNA SOLA VEZ contra la base de datos ya existente (la que usa
-- el docker-compose, puerto 5433). Correr esto en DBeaver conectado a esa
-- base, no a tu Postgres local.
-- ============================================================

BEGIN;

-- 1. Crear el rol GERENTE si todavia no existe.
INSERT INTO roles (nombre, descripcion)
SELECT 'GERENTE', 'Igual que ADMIN, pero no puede crear ni ascender a otro ADMIN o GERENTE'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'GERENTE');

-- 2. Si ya tenias algun usuario con el rol CAJERO, lo pasamos a VENDEDOR
--    ANTES de borrar el rol (para no dejar usuarios con una FK invalida).
UPDATE usuarios
SET rol_id = (SELECT id FROM roles WHERE nombre = 'VENDEDOR')
WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'CAJERO');

-- 3. Eliminar el rol CAJERO (ya no queda ningun usuario apuntando a el).
DELETE FROM roles WHERE nombre = 'CAJERO';

-- 4. Actualizar la descripcion de VENDEDOR para reflejar que ahora
--    tambien cubre caja (antes decia solo "Gestiona ventas y clientes").
UPDATE roles
SET descripcion = 'Gestiona ventas, clientes y caja'
WHERE nombre = 'VENDEDOR';

COMMIT;

-- Verificacion rapida: deberias ver ADMIN, GERENTE, VENDEDOR, INVENTARIO
-- (4 filas, sin CAJERO).
SELECT id, nombre, descripcion FROM roles ORDER BY id;
