-- ============================================================
-- MIGRACION: la auditoria ya no guarda el hash de la contrasena
-- ============================================================
-- fn_auditoria() guardaba la fila completa con to_jsonb(), lo que
-- en la tabla usuarios incluia password_hash. Cualquiera con acceso
-- a la auditoria podia ver los hashes (y atacarlos offline).
--
-- Ejecutar sobre una base ya creada. Es idempotente.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id BIGINT;
    v_old JSONB;
    v_new JSONB;
BEGIN
    BEGIN
        v_usuario_id := current_setting('app.current_user_id', true)::BIGINT;
    EXCEPTION WHEN OTHERS THEN
        v_usuario_id := NULL;
    END;

    -- El operador "-" quita la clave del JSON; si no existe, no hace nada.
    IF (TG_OP IN ('UPDATE', 'DELETE')) THEN
        v_old := to_jsonb(OLD) - 'password_hash';
    END IF;
    IF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        v_new := to_jsonb(NEW) - 'password_hash';
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, valores_anteriores, valores_nuevos)
        VALUES (v_usuario_id, 'INSERT', TG_TABLE_NAME, NEW.id, NULL, v_new);
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, valores_anteriores, valores_nuevos)
        VALUES (v_usuario_id, 'UPDATE', TG_TABLE_NAME, NEW.id, v_old, v_new);
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, valores_anteriores, valores_nuevos)
        VALUES (v_usuario_id, 'DELETE', TG_TABLE_NAME, OLD.id, v_old, NULL);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Limpia los hashes que ya quedaron guardados en registros viejos.
UPDATE auditoria SET valores_anteriores = valores_anteriores - 'password_hash'
WHERE valores_anteriores ? 'password_hash';
UPDATE auditoria SET valores_nuevos = valores_nuevos - 'password_hash'
WHERE valores_nuevos ? 'password_hash';
