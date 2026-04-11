-- Migración para agregar columnas a tabla actividades
-- Ejecutar en la base de datos de Railway

-- Agregar columnas si no existen
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS tecnico_id VARCHAR(255);
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS beneficiario_id VARCHAR(255);
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS fecha_limite DATE;
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS prioridad VARCHAR(20) DEFAULT 'MEDIA';
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS completado BOOLEAN DEFAULT false;
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_actividades_tecnico ON actividades(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_actividades_beneficiario ON actividades(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_actividades_fecha_limite ON actividades(fecha_limite);
CREATE INDEX IF NOT EXISTS idx_actividades_completado ON actividades(completado);
