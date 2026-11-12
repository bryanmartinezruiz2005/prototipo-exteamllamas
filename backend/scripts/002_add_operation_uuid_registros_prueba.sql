-- =============================================================================
-- Etapa 2 · Sincronización idempotente
-- Archivo: 002_add_operation_uuid_registros_prueba.sql
--
-- La PWA genera un UUID v4 por registro (operation_uuid) antes de guardarlo
-- localmente. Si la sincronización se reintenta (p. ej. timeout o corte de
-- red a mitad de la cola), el backend detecta el duplicado y NO vuelve a
-- insertar: devuelve el registro existente.
--
-- La columna es opcional para no romper los datos/consultas de la Etapa 1.
-- =============================================================================

ALTER TABLE registros_prueba
    ADD COLUMN IF NOT EXISTS operation_uuid UUID;

COMMENT ON COLUMN registros_prueba.operation_uuid IS
    'UUID v4 generado por el cliente (PWA) para sincronización FIFO e idempotente';

-- Índice único parcial: solo aplica cuando la columna trae valor (NULL = sin uuid)
CREATE UNIQUE INDEX IF NOT EXISTS uq_registros_prueba_operation_uuid
    ON registros_prueba (operation_uuid)
    WHERE operation_uuid IS NOT NULL;
