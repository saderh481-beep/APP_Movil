#!/usr/bin/env node

const postgres = require('postgres');

const sql = postgres({
  host: 'caboose.proxy.rlwy.net',
  port: 21223,
  username: 'postgres',
  password: 'knoayZQlVchOwjbIsrndCGBPpSqzvDzY',
  database: 'railway',
  ssl: 'require'
});

async function addMissingColumns() {
  console.log('===========================================');
  console.log('🔧 AGREGANDO COLUMNAS FALTANTES A BITACORAS');
  console.log('===========================================\n');
  
  try {
    // 1. Verificar estructura actual
    console.log('📋 1. Verificando estructura actual de bitacoras...');
    
    const currentColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bitacoras' 
      ORDER BY ordinal_position
    `;
    
    console.log(`   Columnas actuales (${currentColumns.length}):`);
    currentColumns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // 2. Agregar columnas faltantes
    console.log('\n📝 2. Agregando columnas faltantes...');
    
    const columnsToAdd = [
      { name: 'coordinacion_interinst', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'instancia_coordinada', type: 'TEXT' },
      { name: 'proposito_coordinacion', type: 'TEXT' },
      { name: 'calificacion', type: 'INTEGER' },
      { name: 'reporte', type: 'TEXT' },
      { name: 'datos_extendidos', type: 'JSONB' }
    ];
    
    for (const col of columnsToAdd) {
      try {
        await sql`ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS ${sql(col.name)} ${sql(col.type)}`;
        console.log(`   ✅ ${col.name} agregado/verificado`);
      } catch (e) {
        console.log(`   ⚠️ ${col.name}: ${e.message}`);
      }
    }
    
    // 3. Verificar снова
    console.log('\n✅ 3. Verificando columnas después de cambios...');
    
    const newColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bitacoras' 
      ORDER BY ordinal_position
    `;
    
    console.log(`   Total columnas: ${newColumns.length}`);
    
    // 4. Probar INSERT con todos los campos
    console.log('\n🧪 4. Probando INSERT con todos los campos...');
    
    const testId = `test-${Date.now()}`;
    const testPayload = {
      id: testId,
      tipo: 'beneficiario',
      estado: 'borrador',
      tecnico_id: 'tecnico-001',
      beneficiario_id: 'benef-001',
      fecha_inicio: new Date().toISOString(),
      coord_inicio: '19.4326,-99.1332',
      actividades_desc: 'Prueba de inserción',
      recomendaciones: 'Recomendación de prueba',
      comentarios_beneficiario: 'Comentario de prueba',
      coordinacion_interinst: true,
      instancia_coordinada: 'Oficina municipal',
      proposito_coordinacion: 'Coordinación de actividades',
      calificacion: 5,
      reporte: 'Reporte de prueba',
      datos_extendidos: JSON.stringify({ hay_incidentes: false })
    };
    
    try {
      const result = await sql`
        INSERT INTO bitacoras ${sql(testPayload)}
        RETURNING id, tipo, coordinacion_interinst, instancia_coordinada, calificacion
      `;
      console.log('   ✅ INSERT exitoso:', result[0]);
      
      // Limpiar prueba
      await sql`DELETE FROM bitacoras WHERE id = ${testId}`;
      console.log('   ✅ Prueba limpiada');
    } catch (insertError) {
      console.log('   ❌ Error en INSERT:', insertError.message);
    }
    
    console.log('\n===========================================');
    console.log('✅ VERIFICACIÓN COMPLETA');
    console.log('===========================================');
    
    await sql.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR GENERAL:', error.message);
    console.error('Stack:', error.stack);
    await sql.end();
    process.exit(1);
  }
}

addMissingColumns();