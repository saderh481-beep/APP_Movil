-- Script para agregar columnas faltantes a la tabla bitacoras
-- Ejecutar en la base de datos PostgreSQL

-- Agregar columnas faltantes si no existen
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS coordinacion_interinst BOOLEAN DEFAULT FALSE;
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS instancia_coordinada VARCHAR(255);
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS proposito_coordinacion TEXT;
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS calificacion VARCHAR(10);
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS reporte TEXT;
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS datos_extendidos JSONB DEFAULT '{}';
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS pdf_edicion JSONB DEFAULT '{}';
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS pdf_actividades_url TEXT;

-- Verificar estructura actual
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bitacoras' 
ORDER BY ordinal_position;