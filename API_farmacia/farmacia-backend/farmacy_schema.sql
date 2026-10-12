-- ============================================================
-- SISTEMA DE GESTIÓN DE FARMACIA
-- Esquema de base de datos - PostgreSQL
-- ============================================================
-- Módulos cubiertos: Inventario, Ventas, Compras, Proveedores,
-- Clientes, Devoluciones, Caja, Usuarios, Auditoría, Configuración
-- ============================================================44

-- Extensión para generar UUIDs si se prefieren en el futuro
-- (por ahora usamos BIGSERIAL para simplicidad y rendimiento)

-- ============================================================
-- 1. TIPOS ENUM
-- ============================================================

CREATE TYPE estado_venta AS ENUM ('COMPLETADA', 'ANULADA', 'PENDIENTE');
CREATE TYPE estado_compra AS ENUM ('RECIBIDA', 'PENDIENTE', 'CANCELADA');
CREATE TYPE metodo_pago AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO');
CREATE TYPE tipo_movimiento_caja AS ENUM ('APERTURA', 'INGRESO', 'EGRESO', 'VENTA', 'CIERRE');
CREATE TYPE estado_caja AS ENUM ('ABIERTA', 'CERRADA');
CREATE TYPE tipo_devolucion AS ENUM ('VENTA', 'COMPRA');
CREATE TYPE accion_auditoria AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- ============================================================
-- 2. USUARIOS Y ROLES
-- ============================================================

CREATE TABLE roles (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(50) NOT NULL UNIQUE,   -- ADMIN, VENDEDOR, CAJERO, etc.
    descripcion     VARCHAR(255)
);

CREATE TABLE usuarios (
    id              BIGSERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    rol_id          INTEGER NOT NULL REFERENCES roles(id),
    -- 'LOCAL' (email/password) o 'GOOGLE' (creada/usada con "Iniciar
    -- sesion con Google"). Ver migracion_login_google.sql.
    proveedor       VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    foto_url        VARCHAR(500),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. PROVEEDORES
-- ============================================================

CREATE TABLE proveedores (
    id              BIGSERIAL PRIMARY KEY,
    nombre_contacto VARCHAR(150) NOT NULL,
    empresa         VARCHAR(150) NOT NULL,
    telefono        VARCHAR(30),
    email           VARCHAR(150),
    direccion       VARCHAR(255),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. INVENTARIO: categorías, productos y lotes (FEFO)
-- ============================================================

CREATE TABLE categorias (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    descripcion     VARCHAR(255)
);

CREATE TABLE productos (
    id                  BIGSERIAL PRIMARY KEY,
    nombre              VARCHAR(200) NOT NULL,
    descripcion         VARCHAR(500),
    categoria_id        INTEGER REFERENCES categorias(id),
    principio_activo    VARCHAR(200),
    presentacion        VARCHAR(100),          -- Tabletas, Jarabe, Ampolla, etc.
    unidad_medida       VARCHAR(50),            -- mg, ml, etc.
    codigo_barras       VARCHAR(100) UNIQUE,
    requiere_receta     BOOLEAN NOT NULL DEFAULT FALSE,
    -- El precio de venta ya incluye el IVA; la factura solo lo desglosa.
    grava_iva           BOOLEAN NOT NULL DEFAULT FALSE,
    proveedor_id        BIGINT REFERENCES proveedores(id),
    precio_compra       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_compra >= 0),
    precio_venta        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_venta >= 0),
    stock_minimo        INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    -- Foto del producto en base64 (data URL, ej. "data:image/jpeg;base64,...").
    -- Se guarda ya comprimida/redimensionada desde el frontend antes de
    -- subirla, por eso TEXT alcanza sin problema.
    imagen_base64       TEXT,
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);

-- Lotes: cada ingreso de mercancía crea un lote con su propio vencimiento.
-- El stock real de un producto = SUM(cantidad_actual) de sus lotes activos.
CREATE TABLE lotes (
    id                  BIGSERIAL PRIMARY KEY,
    producto_id         BIGINT NOT NULL REFERENCES productos(id),
    numero_lote         VARCHAR(100) NOT NULL,
    fecha_vencimiento   DATE NOT NULL,
    cantidad_inicial    INTEGER NOT NULL CHECK (cantidad_inicial >= 0),
    cantidad_actual     INTEGER NOT NULL CHECK (cantidad_actual >= 0),
    precio_compra_unit  NUMERIC(12,2) NOT NULL CHECK (precio_compra_unit >= 0),
    proveedor_id        BIGINT REFERENCES proveedores(id),
    fecha_ingreso       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- TRUE = excluido de la venta (ver VencimientoScheduler.java): se
    -- marca solo cuando el lote esta a "dias_alerta_mal_estado" (config,
    -- 10 por defecto) o menos de vencer, o ya vencido.
    en_mal_estado       BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_cantidad_actual_max CHECK (cantidad_actual <= cantidad_inicial)
);

-- Índice clave para las consultas FEFO: al vender, se busca el lote con
-- cantidad disponible y fecha_vencimiento más próxima para ese producto.
CREATE INDEX idx_lotes_fefo ON lotes(producto_id, fecha_vencimiento) WHERE cantidad_actual > 0;
CREATE INDEX idx_lotes_vencimiento ON lotes(fecha_vencimiento);

-- ============================================================
-- 5. CLIENTES
-- ============================================================

CREATE TABLE clientes (
    id                  BIGSERIAL PRIMARY KEY,
    nombre              VARCHAR(150) NOT NULL,
    tipo_documento      VARCHAR(20),
    numero_documento    VARCHAR(50) UNIQUE,
    telefono            VARCHAR(30),
    email               VARCHAR(150),
    direccion           VARCHAR(255),
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. VENTAS
-- ============================================================

CREATE TABLE ventas (
    id                          BIGSERIAL PRIMARY KEY,
    cliente_id                  BIGINT REFERENCES clientes(id),      -- puede ser NULL (venta genérica)
    usuario_id                  BIGINT NOT NULL REFERENCES usuarios(id),
    fecha                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subtotal                    NUMERIC(12,2) NOT NULL DEFAULT 0,
    descuento                   NUMERIC(12,2) NOT NULL DEFAULT 0,
    impuesto                    NUMERIC(12,2) NOT NULL DEFAULT 0,
    total                       NUMERIC(12,2) NOT NULL DEFAULT 0,
    metodo_pago                 metodo_pago NOT NULL,
    estado                      estado_venta NOT NULL DEFAULT 'COMPLETADA',
    -- Datos de fórmula médica: solo se completan si la venta incluye
    -- al menos un producto con requiere_receta = TRUE
    numero_formula              VARCHAR(100),
    medico_nombre               VARCHAR(150),
    creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);

CREATE TABLE detalle_ventas (
    id                  BIGSERIAL PRIMARY KEY,
    venta_id            BIGINT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id         BIGINT NOT NULL REFERENCES productos(id),
    lote_id             BIGINT NOT NULL REFERENCES lotes(id),
    cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario     NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal            NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX idx_detalle_ventas_venta ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_ventas_producto ON detalle_ventas(producto_id);

-- ============================================================
-- 7. COMPRAS
-- ============================================================

CREATE TABLE compras (
    id              BIGSERIAL PRIMARY KEY,
    proveedor_id    BIGINT NOT NULL REFERENCES proveedores(id),
    usuario_id      BIGINT NOT NULL REFERENCES usuarios(id),
    fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    numero_factura  VARCHAR(100),
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    total           NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado          estado_compra NOT NULL DEFAULT 'PENDIENTE',
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE detalle_compras (
    id                  BIGSERIAL PRIMARY KEY,
    compra_id           BIGINT NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    producto_id         BIGINT NOT NULL REFERENCES productos(id),
    lote_id             BIGINT REFERENCES lotes(id),   -- se enlaza al lote creado al recibir la compra
    cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario     NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal            NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX idx_detalle_compras_compra ON detalle_compras(compra_id);

-- ============================================================
-- 8. DEVOLUCIONES
-- ============================================================

CREATE TABLE devoluciones (
    id                  BIGSERIAL PRIMARY KEY,
    tipo                tipo_devolucion NOT NULL,
    venta_id            BIGINT REFERENCES ventas(id),
    compra_id           BIGINT REFERENCES compras(id),
    producto_id         BIGINT NOT NULL REFERENCES productos(id),
    lote_id             BIGINT REFERENCES lotes(id),
    cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
    motivo              VARCHAR(500) NOT NULL,
    monto_reembolso     NUMERIC(12,2) NOT NULL DEFAULT 0,
    usuario_id          BIGINT NOT NULL REFERENCES usuarios(id),
    fecha               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_devolucion_origen CHECK (
        (tipo = 'VENTA' AND venta_id IS NOT NULL AND compra_id IS NULL) OR
        (tipo = 'COMPRA' AND compra_id IS NOT NULL AND venta_id IS NULL)
    )
);

-- ============================================================
-- 9. CAJA
-- ============================================================

CREATE TABLE caja_sesiones (
    id                      BIGSERIAL PRIMARY KEY,
    usuario_id              BIGINT NOT NULL REFERENCES usuarios(id),
    fecha_apertura          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    monto_apertura          NUMERIC(12,2) NOT NULL DEFAULT 0,
    fecha_cierre            TIMESTAMPTZ,
    monto_cierre_esperado   NUMERIC(12,2),
    monto_cierre_real       NUMERIC(12,2),
    diferencia              NUMERIC(12,2),
    estado                  estado_caja NOT NULL DEFAULT 'ABIERTA',
    observaciones           VARCHAR(500)
);

CREATE TABLE movimientos_caja (
    id                  BIGSERIAL PRIMARY KEY,
    caja_sesion_id      BIGINT NOT NULL REFERENCES caja_sesiones(id) ON DELETE CASCADE,
    tipo                tipo_movimiento_caja NOT NULL,
    monto               NUMERIC(12,2) NOT NULL,
    concepto            VARCHAR(255),
    venta_id            BIGINT REFERENCES ventas(id),
    fecha               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movimientos_caja_sesion ON movimientos_caja(caja_sesion_id);

-- ============================================================
-- 10. CONFIGURACIÓN (key-value del sistema)
-- ============================================================

CREATE TABLE configuracion (
    id              SERIAL PRIMARY KEY,
    clave           VARCHAR(100) NOT NULL UNIQUE,
    valor           VARCHAR(500) NOT NULL,
    descripcion     VARCHAR(255),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. AUDITORÍA (detallada, con valores antes/después)
-- ============================================================

CREATE TABLE auditoria (
    id                  BIGSERIAL PRIMARY KEY,
    usuario_id          BIGINT REFERENCES usuarios(id),
    accion              accion_auditoria NOT NULL,
    tabla_afectada      VARCHAR(100) NOT NULL,
    registro_id         BIGINT NOT NULL,
    valores_anteriores  JSONB,          -- NULL si accion = INSERT
    valores_nuevos      JSONB,          -- NULL si accion = DELETE
    fecha               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address          VARCHAR(50)
);

CREATE INDEX idx_auditoria_tabla ON auditoria(tabla_afectada, registro_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);

-- ============================================================
-- 12. DATOS INICIALES (roles y configuración base)
-- ============================================================

INSERT INTO roles (nombre, descripcion) VALUES
    ('ADMIN', 'Acceso total al sistema'),
    ('GERENTE', 'Igual que ADMIN, pero no puede crear ni ascender a otro ADMIN o GERENTE'),
    ('VENDEDOR', 'Gestiona ventas, clientes y caja'),
    ('INVENTARIO', 'Gestiona productos, lotes y compras');

INSERT INTO configuracion (clave, valor, descripcion) VALUES
    ('nombre_farmacia', 'Mi Farmacia', 'Nombre del establecimiento'),
    ('dias_alerta_vencimiento', '30', 'Días antes del vencimiento para alertar en Reportes'),
    ('dias_alerta_mal_estado', '15', 'Días antes del vencimiento para dar de baja un lote automáticamente (deja de venderse y sale del stock)'),
    ('iva_porcentaje', '19', 'Porcentaje de IVA para productos que lo llevan (el precio de venta ya lo incluye; la factura lo desglosa)'),
    ('nit', '900.000.000-0', 'NIT de la farmacia (se imprime en las facturas)'),
    ('direccion', 'Calle 00 # 00-00, Medellín, Colombia', 'Dirección de la farmacia (se imprime en las facturas)'),
    ('telefono', '(604) 000 0000', 'Teléfono de la farmacia (se imprime en las facturas)');
