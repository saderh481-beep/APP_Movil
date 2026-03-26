#!/usr/bin/env node

/**
 * SOLUCIÓN ESCALONADA: Cambiar CHAR(8) a VARCHAR(5)
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
    console.log('🔧 SOLUCIÓN ESCALONADA: FIX PARA CHAR(8) → VARCHAR(5)');
    console.log('='.repeat(90) + '\n');
    
    // PASO 1: Remover constraint
    console.log('PASO 1: Remover constraint existente...\n');
    try {
      await sql.unsafe(`
        ALTER TABLE usuarios
        DROP CONSTRAINT codigo_acceso_format;
      `);
      console.log('  ✅ Constraint removido\n');
    } catch (e) {
      if (e.message.includes('does not exist')) {
        console.log('  ⚠️  Constraint no existía\n');
      } else {
        throw e;
      }
    }
    
    // PASO 2: Limpiar todos los espacios
    console.log('PASO 2: Limpiar todos los espacios con TRIM...\n');
    const updated = await sql`
      UPDATE usuarios
      SET codigo_acceso = TRIM(codigo_acceso)
      RETURNING nombre, codigo_acceso, LENGTH(codigo_acceso) as len
    `;
    console.log(`  ✅ Actualizados: ${updated.length}\n`);
    updated.slice(0, 5).forEach(u => {
      console.log(`     ${u.nombre}: '${u.codigo_acceso}' (len=${u.len})`);
    });
    
    // PASO 3: Cambiar CHAR(8) a VARCHAR(5)
    console.log('\nPASO 3: Cambiar tipo de dato CHAR(8) → VARCHAR(5)...\n');
    try {
      await sql.unsafe(`
        ALTER TABLE usuarios
        ALTER COLUMN codigo_acceso TYPE VARCHAR(5);
      `);
      console.log('  ✅ Tipo de dato cambiado\n');
    } catch (e) {
      console.log('  ❌ Error:', e.message);
      throw e;
    }
    
    // PASO 4: Verificar cambio
    console.log('PASO 4: Verificar cambio de tipo...\n');
    const typeInfo = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'usuarios' AND column_name = 'codigo_acceso'
    `;
    console.log(`  Tipo: ${typeInfo[0].data_type}(${typeInfo[0].character_maximum_length})\n`);
    
    // PASO 5: Verificar datos
    console.log('PASO 5: Verificar datos después del cambio...\n');
    const usuarios = await sql`
      SELECT nombre, codigo_acceso, LENGTH(codigo_acceso) as len
      FROM usuarios
      WHERE activo = true
      LIMIT 5
    `;
    
    usuarios.forEach(u => {
      const bytes = Buffer.from(u.codigo_acceso).toString('hex');
      const matches = /^\d{5}$/.test(u.codigo_acceso);
      console.log(`  ${u.nombre.substring(0, 25).padEnd(25)}: '${u.codigo_acceso}'`);
      if (!matches) console.log(`    → HEX: ${bytes}, len=${u.len}`);
    });
    
    // PASO 6: Resumen
    console.log('\nPASO 6: Resumen final...\n');
    const verificacion = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN codigo_acceso ~ '^\\d{5}$' THEN 1 END) as validos,
        COUNT(CASE WHEN LENGTH(TRIM(codigo_acceso)) != 5 THEN 1 END) as invalidos
      FROM usuarios
      WHERE activo = true
    `;
    
    const validos = verificacion[0].validos;
    const invalidos = verificacion[0].invalidos;
    const total = verificacion[0].total;
    
    console.log('╔════════════════════════════════════════╗');
    console.log(`║ Total técnicos: ${String(total).padEnd(28)} ║`);
    console.log(`║ Códigos válidos: ${String(validos).padEnd(28)} ║`);
    console.log(`║ Inválidos: ${String(invalidos).padEnd(34)} ║`);
    console.log(`║ Estado: ${(validos === total ? '✅ LISTO' : '❌ FALLA').padEnd(32)} ║`);
    console.log('╚════════════════════════════════════════╝\n');
    
    await sql.end();
    process.exit(validos === total ? 0 : 1);
    
  } catch (e) {
    console.error('\n❌ ERROR CRÍTICO:', e.message);
    await sql.end();
    process.exit(1);
  }
})();
