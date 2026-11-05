-- =============================================================================
-- ExteamLlamas - Migración 001: Tablas esenciales
-- Motor: PostgreSQL (Supabase compatible)
-- Descripción:
--   1. usuarios        → personal del sistema con rol y estado
--   2. clientes        → empresas/clientes del servicio
--   3. sucursales      → dependencias físicas de cada cliente
--   4. extintores      → inventario con propiedad, agente, capacidad y estado
-- Integridad referencial:
--   - sucursales.id_cliente  → clientes.id_cliente
--   - extintores.id_cliente  → clientes.id_cliente
--   - extintores (id_sucursal, id_cliente) → sucursales (id_sucursal, id_cliente)
--     (FK compuesta: garantiza que la sucursal exista Y pertenezca al cliente)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. USUARIOS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rut              VARCHAR(12)   NOT NULL,
    nombre_completo  VARCHAR(160)  NOT NULL,
    email            VARCHAR(255)  NOT NULL,
    password_hash    VARCHAR(255)  NOT NULL,
    rol              VARCHAR(20)   NOT NULL,
    estado_activo    BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_usuarios_rut     UNIQUE (rut),
    CONSTRAINT uq_usuarios_email   UNIQUE (email),
    CONSTRAINT chk_usuarios_rol
        CHECK (rol IN ('ADMIN', 'GERENTE', 'TECNICO_TERRENO', 'OPERADOR_TALLER')),
    -- Acepta RUT con o sin puntos: 12.345.678-5  |  12345678-5
    CONSTRAINT chk_usuarios_rut_formato
        CHECK (rut ~ '^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$')
);

COMMENT ON TABLE  usuarios IS 'Personal del sistema (administración, taller y terreno)';
COMMENT ON COLUMN usuarios.rol IS 'ADMIN | GERENTE | TECNICO_TERRENO | OPERADOR_TALLER';
COMMENT ON COLUMN usuarios.estado_activo IS 'TRUE = usuario habilitado para ingresar';

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios (rol);

-- -----------------------------------------------------------------------------
-- 2. CLIENTES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rut              VARCHAR(12)   NOT NULL,
    razon_social     VARCHAR(200)  NOT NULL,
    giro             VARCHAR(120),
    email            VARCHAR(255),
    telefono         VARCHAR(20),
    direccion        VARCHAR(255),
    estado_activo    BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_clientes_rut UNIQUE (rut),
    CONSTRAINT chk_clientes_rut_formato
        CHECK (rut ~ '^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$')
);

COMMENT ON TABLE clientes IS 'Empresas o personas que contratan el servicio';

-- -----------------------------------------------------------------------------
-- 3. SUCURSALES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sucursales (
    id_sucursal      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente       BIGINT        NOT NULL,
    nombre           VARCHAR(160)  NOT NULL,
    direccion        VARCHAR(255)  NOT NULL,
    comuna           VARCHAR(80),
    ciudad           VARCHAR(80),
    telefono         VARCHAR(20),
    estado_activo    BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_sucursales_cliente
        FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    -- Evita sucursales duplicadas con el mismo nombre dentro de un cliente
    CONSTRAINT uq_sucursales_cliente_nombre UNIQUE (id_cliente, nombre),
    -- Requerida por la FK compuesta de extintores (id_sucursal, id_cliente)
    CONSTRAINT uq_sucursales_id UNIQUE (id_sucursal, id_cliente)
);

COMMENT ON TABLE sucursales IS 'Dependencias físicas de un cliente donde se instalan equipos';
-- El índice uq_sucursales_cliente_nombre (id_cliente, nombre) ya cubre búsquedas por id_cliente

-- -----------------------------------------------------------------------------
-- 4. EXTINTORES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extintores (
    id_extintor      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo           VARCHAR(30)   NOT NULL,
    tipo_propiedad   VARCHAR(20)   NOT NULL,
    id_cliente       BIGINT        NOT NULL,
    id_sucursal      BIGINT        NOT NULL,
    tipo_agente      VARCHAR(20)   NOT NULL,
    capacidad        NUMERIC(5,2)  NOT NULL,
    estado_actual    VARCHAR(30)   NOT NULL DEFAULT 'OPERATIVO',
    marca            VARCHAR(80),
    modelo           VARCHAR(80),
    numero_serie     VARCHAR(80),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_extintores_codigo UNIQUE (codigo),

    CONSTRAINT fk_extintores_cliente
        FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- FK compuesta: la sucursal debe existir y pertenecer al mismo cliente
    CONSTRAINT fk_extintores_ubicacion
        FOREIGN KEY (id_sucursal, id_cliente)
        REFERENCES sucursales (id_sucursal, id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_extintores_tipo_propiedad
        CHECK (tipo_propiedad IN ('CLIENTE', 'COMODATO_EXTEAM')),

    CONSTRAINT chk_extintores_tipo_agente
        CHECK (tipo_agente IN ('POLVO_QUIMICO', 'CO2', 'ESPUMA', 'AGUA', 'HALON')),

    CONSTRAINT chk_extintores_capacidad
        CHECK (capacidad > 0),

    CONSTRAINT chk_extintores_estado_actual
        CHECK (estado_actual IN ('OPERATIVO', 'EN_MANTENIMIENTO', 'VENCIDO', 'BAJA'))
);

COMMENT ON TABLE  extintores IS 'Inventario de extintores instalados (propios o en comodato)';
COMMENT ON COLUMN extintores.tipo_propiedad IS 'CLIENTE = propiedad del cliente | COMODATO_EXTEAM = prestado por ExteamLlamas';
COMMENT ON COLUMN extintores.capacidad IS 'Capacidad nominal en litros/kilogramos según tipo de agente';
COMMENT ON COLUMN extintores.estado_actual IS 'OPERATIVO | EN_MANTENIMIENTO | VENCIDO | BAJA';

CREATE INDEX IF NOT EXISTS idx_extintores_cliente  ON extintores (id_cliente);
CREATE INDEX IF NOT EXISTS idx_extintores_sucursal ON extintores (id_sucursal, id_cliente);
CREATE INDEX IF NOT EXISTS idx_extintores_estado   ON extintores (estado_actual);
CREATE INDEX IF NOT EXISTS idx_extintores_agente   ON extintores (tipo_agente);

-- -----------------------------------------------------------------------------
-- 5. TRIGGER: updated_at automático en todas las tablas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_updated_at   ON usuarios;
DROP TRIGGER IF EXISTS trg_clientes_updated_at   ON clientes;
DROP TRIGGER IF EXISTS trg_sucursales_updated_at ON sucursales;
DROP TRIGGER IF EXISTS trg_extintores_updated_at ON extintores;

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_sucursales_updated_at
    BEFORE UPDATE ON sucursales
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_extintores_updated_at
    BEFORE UPDATE ON extintores
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMIT;
