-- =============================================================================
-- ExteamLlamas - Migración 001: Esquema inicial (reescritura según diseño 3FN)
-- Motor: PostgreSQL (Supabase compatible)
--
-- Diseño en Tercera Forma Normal (3FN):
--   * Cada atributo no clave depende únicamente de la PK completa:
--     - sucursales NO repite datos del cliente → solo referencia id_cliente.
--     - extintores NO repite datos del cliente → solo referencia id_cliente_propietario.
--     - No existen grupos repetidos ni dependencias parciales.
--   * Tablas normalizadas:
--     1. usuarios        → personal del sistema (PK: id_usuario)
--     2. clientes        → empresas dueñas de equipos (PK: id_cliente)
--     3. sucursales      → dependencias de un cliente (PK: id_sucursal)
--     4. extintores      → catálogo maestro de equipos (PK: id_extintor)
--
-- Nota de arquitectura: la UBICACIÓN actual de un extintor (sucursal donde está
-- instalado) NO se almacena aquí; ese dato depende de una entidad adicional
-- (instalaciones/asignaciones) prevista en una futura migración, evitando
-- dependencias parciales sobre estado_actual.
--
-- Ejecutar con:  psql -f migrations/001_crear_tablas_esenciales.sql
--        o en:  Supabase SQL Editor  |  npm run db:migrate
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. USUARIOS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario       SERIAL        PRIMARY KEY,
    rut              VARCHAR(12)   NOT NULL,
    nombre_completo  VARCHAR(120)  NOT NULL,
    email            VARCHAR(100)  NOT NULL,
    password_hash    VARCHAR(255)  NOT NULL,
    rol              VARCHAR(25)   NOT NULL,
    estado_activo    BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en        TIMESTAMP     NOT NULL DEFAULT LOCALTIMESTAMP,

    CONSTRAINT uq_usuarios_rut   UNIQUE (rut),
    CONSTRAINT uq_usuarios_email UNIQUE (email),

    CONSTRAINT chk_usuarios_rol
        CHECK (rol IN ('ADMIN', 'GERENTE', 'TECNICO_TERRENO', 'OPERADOR_TALLER')),

    -- Formato RUT chileno con o sin puntos: 12.345.678-5 | 12345678-5
    CONSTRAINT chk_usuarios_rut_formato
        CHECK (rut ~ '^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-[0-9kK]$')
);

COMMENT ON TABLE  usuarios IS 'Personal del sistema: administración, gerencia, terreno y taller';
COMMENT ON COLUMN usuarios.rol IS 'ADMIN | GERENTE | TECNICO_TERRENO | OPERADOR_TALLER';
COMMENT ON COLUMN usuarios.estado_activo IS 'TRUE = habilitado para iniciar sesión';
COMMENT ON COLUMN usuarios.password_hash IS 'Hash bcrypt/argon2; nunca texto plano';

-- -----------------------------------------------------------------------------
-- 2. CLIENTES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente         SERIAL        PRIMARY KEY,
    rut_empresa        VARCHAR(12)   NOT NULL,
    razon_social       VARCHAR(150)  NOT NULL,
    giro_comercial     VARCHAR(100),
    telefono_contacto  VARCHAR(20),
    email_notificacion VARCHAR(100),
    creado_en          TIMESTAMP     NOT NULL DEFAULT LOCALTIMESTAMP,

    CONSTRAINT uq_clientes_rut UNIQUE (rut_empresa),

    CONSTRAINT chk_clientes_rut_formato
        CHECK (rut_empresa ~ '^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-[\dkK]$')
);

COMMENT ON TABLE  clientes IS 'Empresas o personas titulares de equipos (propios o comodato)';
COMMENT ON COLUMN clientes.email_notificacion IS 'Correo para notificaciones de servicio y vencimientos';

-- -----------------------------------------------------------------------------
-- 3. SUCURSALES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sucursales (
    id_sucursal     SERIAL        PRIMARY KEY,
    id_cliente      INT           NOT NULL,
    nombre_sucursal VARCHAR(120)  NOT NULL,
    direccion       VARCHAR(200)  NOT NULL,
    comuna          VARCHAR(80),
    region          VARCHAR(80),
    contacto_local  VARCHAR(120),
    creado_en       TIMESTAMP     NOT NULL DEFAULT LOCALTIMESTAMP,

    CONSTRAINT fk_sucursales_cliente
        FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    -- Evita sucursales homónimas dentro del mismo cliente
    CONSTRAINT uq_sucursales_cliente_nombre UNIQUE (id_cliente, nombre_sucursal)
);

COMMENT ON TABLE sucursales IS 'Dependencias físicas de un cliente (3FN: no duplica datos del cliente)';

-- PostgreSQL no indexa FKs automáticamente
CREATE INDEX IF NOT EXISTS idx_sucursales_cliente ON sucursales (id_cliente);

-- -----------------------------------------------------------------------------
-- 4. EXTINTORES (catálogo maestro)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extintores (
    id_extintor             SERIAL        PRIMARY KEY,
    codigo_qr               VARCHAR(64)   NOT NULL,
    numero_serie_fabricante VARCHAR(60),
    tipo_propiedad          VARCHAR(20)   NOT NULL,
    id_cliente_propietario  INT,
    tipo_agente              VARCHAR(30)   NOT NULL,
    capacidad_kg            NUMERIC(5,2)  NOT NULL,
    estado_actual           VARCHAR(30)   NOT NULL DEFAULT 'DISPONIBLE_BODEGA',
    fecha_fabricacion       DATE,
    fecha_ultima_ph         DATE,
    creado_en               TIMESTAMP     NOT NULL DEFAULT LOCALTIMESTAMP,

    CONSTRAINT uq_extintores_codigo_qr UNIQUE (codigo_qr),

    CONSTRAINT fk_extintores_propietario
        FOREIGN KEY (id_cliente_propietario) REFERENCES clientes (id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_extintores_tipo_propiedad
        CHECK (tipo_propiedad IN ('CLIENTE', 'COMODATO_EXTEAM')),

    -- Un equipo de propiedad CLIENTE debe declarar cliente propietario;
    -- en COMODATO_EXTEAM el propietario es ExteamLlamas → se permite NULL.
    CONSTRAINT chk_extintores_requiere_propietario
        CHECK (tipo_propiedad <> 'CLIENTE' OR id_cliente_propietario IS NOT NULL),

    CONSTRAINT chk_extintores_tipo_agente
        CHECK (tipo_agente IN ('PQS', 'CO2', 'AGUA', 'ACETATO_K')),

    CONSTRAINT chk_extintores_capacidad_kg
        CHECK (capacidad_kg > 0),

    CONSTRAINT chk_extintores_estado_actual
        CHECK (estado_actual IN (
            'INSTALADO',
            'EN_TRANSITO_TALLER',
            'EN_TALLER',
            'DISPONIBLE_BODEGA',
            'BAJA'
        )),

    -- Integridad temporal: la última prueba hidrostática no puede ser
    -- anterior a la fabricación (NULLs se aceptan; CHECK pasa con NULL).
    CONSTRAINT chk_extintores_fechas
        CHECK (fecha_fabricacion IS NULL
               OR fecha_ultima_ph IS NULL
               OR fecha_ultima_ph >= fecha_fabricacion)
);

COMMENT ON TABLE  extintores IS 'Catálogo maestro de extintores (sin dependencia de sucursal actual)';
COMMENT ON COLUMN extintores.tipo_propiedad IS 'CLIENTE = dueño es el cliente | COMODATO_EXTEAM = prestado por ExteamLlamas';
COMMENT ON COLUMN extintores.id_cliente_propietario IS 'NULL cuando tipo_propiedad = COMODATO_EXTEAM';
COMMENT ON COLUMN extintores.estado_actual IS 'INSTALADO | EN_TRANSITO_TALLER | EN_TALLER | DISPONIBLE_BODEGA | BAJA';
COMMENT ON COLUMN extintores.fecha_ultima_ph IS 'Fecha de última prueba hidrostática';

CREATE INDEX IF NOT EXISTS idx_extintores_propietario ON extintores (id_cliente_propietario);
CREATE INDEX IF NOT EXISTS idx_extintores_estado      ON extintores (estado_actual);

COMMIT;
