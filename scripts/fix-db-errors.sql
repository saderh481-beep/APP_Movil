-- SADERH - Script de CORRECCIÓN para BD existente
-- Ejecutar SI YA tienes las tablas creadas y quieres corregirlas
-- Este script repara los errores críticos sin perder datos

-- ============================================================
-- 1. CORREGIR FK DE beneficiario A beneficiarios
-- ============================================================

-- Primero, eliminar la FK mal definida si existe
ALTER TABLE bitacoras DROP CONSTRAINT IF EXISTS bitacoras_beneficiario_id_fkey;

-- Ahora crear la FK correcta
ALTER TABLE bitacoras ADD CONSTRAINT bitacoras_beneficiario_id_fkey 
    FOREIGN KEY (beneficiario_id) REFERENCES beneficiarios(id);

-- ============================================================
-- 2. AGREGAR CAMPOS FALTANTES A bitacoras
-- ============================================================

ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS coordinacion_interinst BOOLEAN DEFAULT false;
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS instancia_coordinada VARCHAR(255);
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS proposito_coordinacion TEXT;

-- ============================================================
-- 3. CORREGIR INSERT DE beneficiario (plural)
-- ============================================================

-- Verificar que existe el beneficiario de prueba
INSERT INTO beneficiarios (id, tecnico_id, nombre_completo, curp, municipio, localidad, cadena_productiva)
VALUES ('benef-001', 'tecnico-001', 'Juan Pérez López', 'PELJ900101HNLRRN01', 'Pachuca', 'Santiago', 'Aguacate')
ON CONFLICT (id) DO NOTHING;

INSERT INTO beneficiaries (id, tecnico_id, nombre_completo, curp, municipio, localidad, cadena_productiva)
VALUES ('benef-002', 'tecnico-001', 'María González Ruiz', 'GORM820202MHGZRR01', 'Tulancingo', 'San Lorenzo', 'Maíz')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. VERIFICAR ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_usuarios_codigo ON usuarios(codigo_acceso);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_tecnico ON beneficiarios(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_activo ON beneficiarios(activo);
CREATE INDEX IF NOT EXISTS idx_bitacoras_tecnico ON bitacoras(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_bitacoras_estado ON bitacoras(estado);
CREATE INDEX IF NOT EXISTS idx_bitacoras_beneficiario ON bitacoras(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_bitacoras_fecha_inicio ON bitacoras(fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_bitacoras_sync_id ON bitacoras(sync_id);
CREATE INDEX IF NOT EXISTS idx_actividades_cadena ON actividades(cadena_productiva_id);
CREATE INDEX IF NOT EXISTS idx_actividades_tecnico ON actividades(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_actividades_beneficiario ON actividades(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_actividades_fecha_limite ON actividades(fecha_limite);
CREATE INDEX IF NOT EXISTS idx_actividades_completado ON actividades(completado);

-- ============================================================
-- 5. VERIFICACIÓN FINAL
-- ============================================================

-- Verificar FK
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'bitacoras';

-- Probar login
SELECT id, nombre, rol, codigo_acceso, estado_corte 
FROM usuarios 
WHERE codigo_acceso = '12345';
