-- Script para verificar y corregir índices de bitacoras en Railway
-- Ejecutar en PostgreSQL (Railway)

-- 1. Ver índices existentes
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'bitacoras';

-- 2. Crear índices que podrían faltar
CREATE INDEX IF NOT EXISTS idx_bitacoras_tecnico_id ON bitacoras(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_bitacoras_sync_id ON bitacoras(sync_id);
CREATE INDEX IF NOT EXISTS idx_bitacoras_beneficiario_id ON bitacoras(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_bitacoras_estado ON bitacoras(estado);
CREATE INDEX IF NOT EXISTS idx_bitacoras_fecha_inicio ON bitacoras(fecha_inicio DESC);

-- 3. Verificar FK
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'bitacoras' AND tc.constraint_type = 'FOREIGN KEY';

-- 4. Probar consulta simple
SELECT COUNT(*) FROM bitacoras WHERE tecnico_id IS NOT NULL;
SELECT COUNT(*) FROM bitacoras WHERE sync_id IS NOT NULL;
