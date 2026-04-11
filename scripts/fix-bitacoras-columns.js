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

async function fixColumns() {
  console.log('===========================================');
  console.log('🔧 CORRIGIENDO COLUMNAS FALTANTES');
  console.log('===========================================\n');
  
  try {
    // Columnas faltantes - verificar y agregar
    const columnsToAdd = [
      { name: 'calificacion', type: 'INTEGER' },
      { name: 'reporte', type: 'TEXT' },
      { name: 'datos_extendidos', type: 'JSONB' }
    ];
    
    console.log('📝 Agregando columnas faltantes...\n');
    
    for (const col of columnsToAdd) {
      // Verificar si existe
      const exists = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'bitacoras' AND column_name = ${col.name}
      `;
      
      if (exists.length > 0) {
        console.log(`   ⏭️  ${col.name} ya existe, saltando`);
        continue;
      }
      
      // Agregar columna usando expresión dinámica
      try {
        if (col.type === 'JSONB') {
          await sql`ALTER TABLE bitacoras ADD COLUMN ${sql(col.name)} JSONB`;
        } else if (col.type === 'INTEGER') {
          await sql`ALTER TABLE bitacoras ADD COLUMN ${sql(col.name)} INTEGER`;
        } else {
          await sql`ALTER TABLE bitacoras ADD COLUMN ${sql(col.name)} TEXT`;
        }
        console.log(`   ✅ ${col.name} agregado`);
      } catch (e) {
        console.log(`   ⚠️ ${col.name}: ${e.message}`);
      }
    }
    
    // Verificar estructura final
    console.log('\n📋 Estructura final de bitacoras:');
    const finalColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bitacoras' 
      ORDER BY ordinal_position
    `;
    
    console.log(`   Total: ${finalColumns.length} columnas`);
    finalColumns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // Prueba de INSERT
    console.log('\n🧪 Probando INSERT con nuevos campos...');
    const testId = `test-${Date.now()}`;
    
    const payload = {
      id: testId,
      tipo: 'beneficiario',
      estado: 'borrador',
      tecnico_id: 'tecnico-001',
      beneficiario_id: 'benef-001',
      fecha_inicio: new Date().toISOString(),
      coord_inicio: '(19.4326,-99.1332)',
      actividades_desc: 'Prueba de inserción',
      recomendaciones: 'Recomendación de prueba',
      comentarios_beneficiario: 'Comentario de prueba',
      coordinacion_interinst: true,
      instancia_coordinada: 'Oficina municipal',
      proposito_coordinacion: 'Coordinación de actividades',
      calificacion: 5,
      reporte: 'Reporte de prueba',
      datos_extendidos: { hay_incidentes: false },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    try {
      const result = await sql`
        INSERT INTO bitacoras ${sql(payload)}
        RETURNING id, tipo, coordinacion_interinst, calificacion, datos_extendidos
      `;
      console.log('   ✅ INSERT exitoso:', JSON.stringify(result[0]));
      
      // Limpiar prueba
      await sql`DELETE FROM bitacoras WHERE id = ${testId}`;
      console.log('   ✅ Prueba limpiada');
      
    } catch (insertError) {
      console.log('   ❌ Error en INSERT:', insertError.message);
    }
    
    console.log('\n===========================================');
    console.log('✅ PROCESO COMPLETADO');
    console.log('===========================================');
    
    await sql.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await sql.end();
    process.exit(1);
  }
}

fixColumns();