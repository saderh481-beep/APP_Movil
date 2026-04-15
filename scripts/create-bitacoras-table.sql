-- Script SQL para crear la tabla de bitácoras
-- Ejecutar en la base de datos PostgreSQL

-- Crear tabla de bitácoras si no existe
CREATE TABLE IF NOT EXISTS bitacoras (
    id VARCHAR(255) PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL, -- 'beneficiario' o 'actividad'
    estado VARCHAR(50) DEFAULT 'borrador', -- 'borrador', 'cerrada'
    tecnico_id VARCHAR(255) NOT NULL,
    beneficiario_id VARCHAR(255),
    cadena_productiva_id VARCHAR(255),
    actividad_id VARCHAR(255),
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP,
    coord_inicio VARCHAR(100),
    coord_fin VARCHAR(100),
    foto_rostro_url TEXT,
    firma_url TEXT,
    fotos_campo JSONB, -- Array de URLs
    observaciones_coordinador TEXT,
    actividades_desc TEXT,
    recomendaciones TEXT,
    comentarios_beneficiario TEXT,
    pdf_url_actual TEXT,
    pdf_original_url TEXT,
    pdf_version INTEGER DEFAULT 0,
    creada_offline BOOLEAN DEFAULT FALSE,
    sync_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_bitacoras_tecnico ON bitacoras(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_bitacoras_estado ON bitacoras(estado);
CREATE INDEX IF NOT EXISTS idx_bitacoras_beneficiario ON bitacoras(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_bitacoras_actividad ON bitacoras(actividad_id);
CREATE INDEX IF NOT EXISTS idx_bitacoras_fecha_inicio ON bitacoras(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_bitacoras_sync_id ON bitacoras(sync_id);

-- Agregar columnas faltantes si no existen
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS coordinacion_interinst BOOLEAN DEFAULT FALSE;
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS instancia_coordinada VARCHAR(255);
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS proposito_coordinacion TEXT;
-- Cambiar tipo de calificacion de VARCHAR a INTEGER
ALTER TABLE bitacoras ALTER COLUMN calificacion TYPE INTEGER USING COALESCE(NULLIF(calificacion, ''), '0')::INTEGER;
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS reporte TEXT;
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS datos_extendidos JSONB;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bitacoras_updated_at BEFORE UPDATE ON bitacoras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verificar que la tabla se creó correctamente
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bitacoras' 
ORDER BY ordinal_position;