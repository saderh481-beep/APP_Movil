#!/usr/bin/env node

/**
 * SOLUCIÓN: Cambiar CHAR(8) a VARCHAR(5) y limpiar espacios
 */

const postgres = require('postgres');

const sql = postgres({
  host: 'caboose.proxy.rlwy.net',
  port: 21223,
  username: 'postgres',
  password: 'knoayZQlVchOwjbIsrndCGBPpSqzvDzY',
  database: 'railway',
  ssl: 'require'
});

(async () => {
  try {
    console.log('\n' + '='.repeat(90));
    console.log('🔧 SOLUCIÓN: CAMBIAR CHAR(8) A VARCHAR(5) Y LIMPIAR ESPACIOS');
    console.log('='.repeat(90) + '\n');
    
    // PASO 1: Actualizar todos los códigos con TRIM
    console.log('PASO 1: Limpiar espacios con UPDATE...\n');
    const updated = await sql`
      UPDATE usuarios
      SET codigo_acceso = TRIM(codigo_acceso)
      WHERE LENGTH(TRIM(codigo_acceso)) > 0
      RETURNING nombre, codigo_acceso
    `;
    console.log(`✅ Actualizados: ${updated.length}\n`);
    
    // PASO 2: Cambiar el tipo de dato
    console.log('PASO 2: Cambiar CHAR(8) → VARCHAR(5)...\n');
    try {
      await sql`
        ALTER TABLE usuarios
        DROP CONSTRAINT IF EXISTS usuarios_codigo_acceso_check;
      `;
      console.log('  ✅ Constraint removido');
    } catch (e) {
      console.log('  ⚠️  No existía constraint');
    }
    
    try {
      await sql`
        ALTER TABLE usuarios
        ALTER COLUMN codigo_acceso TYPE VARCHAR(5) USING TRIM(codigo_acceso)
      `;
      console.log('  ✅ Tipo de dato cambiado a VARCHAR(5)');
    } catch (e) {
      console.log('  ❌ Error en ALTER:', e.message);
    }
    
    // PASO 3: Agregar validación NOT NULL si es necesario
    console.log('\nPASO 3: Agregar constraint de validación...\n');
    try {
      await sql`
        ALTER TABLE usuarios
        ADD CONSTRAINT codigo_acceso_format 
        CHECK (codigo_acceso ~ '^\\d{5}$')
      `;
      console.log('  ✅ Constraint agregado: codigo_acceso ~ ^\\d{5}$');
    } catch (e) {
      console.log('  ⚠️  Constraint podría ya existir:', e.message);
    }
    
    // PASO 4: Verificar resultados
    console.log('\nPASO 4: Verificar resultados...\n');
    const usuarios = await sql`
      SELECT 
        nombre,
        codigo_acceso,
        LENGTH(codigo_acceso) as len
      FROM usuarios
      WHERE activo = true
      LIMIT 5
    `;
    
    usuarios.forEach(u => {
      const bytes = Buffer.from(u.codigo_acceso).toString('hex');
      const matches = /^\d{5}$/.test(u.codigo_acceso);
      console.log(`  ${u.nombre}: '${u.codigo_acceso}' (len=${u.len}, valid=${matches})`);
    });
    
    // PASO 5: Resumen
    console.log('\nPASO 5: Resumen final...\n');
    const verificacion = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN codigo_acceso ~ '^\\d{5}$' THEN 1 END) as validos
      FROM usuarios
      WHERE activo = true
    `;
    
    const validos = verificacion[0].validos;
    const total = verificacion[0].total;
    
    console.log('╔════════════════════════════════════════╗');
    console.log(`║ Total técnicos: ${String(total).padEnd(28)} ║`);
    console.log(`║ Códigos válidos: ${String(validos + '/' + total).padEnd(24)} ║`);
    console.log(`║ Estado: ${(validos === total ? '✅ TODOS VÁLIDOS' : '❌ PROBLEMAS').padEnd(29)} ║`);
    console.log('╚════════════════════════════════════════╝\n');
    
    await sql.end();
    
  } catch (e) {
    console.error('\n❌ ERROR:', e.message);
    console.error(e);
    await sql.end();
    process.exit(1);
  }
})();
