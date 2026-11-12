-- =============================================================================
-- Etapa 1 · Micro-prototipo offline-first
-- Archivo: 001_create_registros_prueba.sql
-- Tabla:   registros_prueba
--
-- Objetivo: almacenar los registros que la PWA (React + Dexie.js) envía al
--           backend cuando recupera la red. En la Etapa 2, la PWA guardará
--           primero en IndexedDB y este endpoint será su destino de sincronía.
--
-- Nota: todos los objetos usan IF NOT EXISTS para que el script sea
--       re-ejecutable (idempotente) durante el desarrollo.
-- =============================================================================

CREATE TABLE IF NOT EXISTS registros_prueba (
    id         BIGSERIAL     PRIMARY KEY,
    contenido  TEXT          NOT NULL,
    estado     TEXT          NOT NULL DEFAULT 'pendiente'
                             CONSTRAINT chk_registros_prueba_estado
                             CHECK (estado IN ('pendiente', 'procesado', 'error')),
    creado_en  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN registros_prueba.estado IS
    'pendiente: recibido, aún no procesado | procesado: procesamiento OK | error: fallo en el procesamiento';
COMMENT ON COLUMN registros_prueba.creado_en IS
    'Timestamp con zona horaria en que el backend recibió el registro';

-- Índices para las consultas típicas del prototipo
CREATE INDEX IF NOT EXISTS idx_registros_prueba_estado
    ON registros_prueba (estado);

CREATE INDEX IF NOT EXISTS idx_registros_prueba_creado_en
    ON registros_prueba (creado_en DESC);

-- ===========================================================================
-- Etapa 2 (pendiente): sincronización idempotente.
-- Cuando la PWA vuelva a tener red, reenviará los registros pendientes; para
-- evitar duplicados cada registro llevará un UUID generado en el cliente:
--
--   ALTER TABLE registros_prueba
--       ADD COLUMN IF NOT EXISTS cliente_uuid UUID;
--
--   CREATE UNIQUE INDEX IF NOT EXISTS uq_registros_prueba_cliente_uuid
--       ON registros_prueba (cliente_uuid)
--       WHERE cliente_uuid IS NOT NULL;
-- ===========================================================================
