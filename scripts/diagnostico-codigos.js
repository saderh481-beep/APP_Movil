#!/usr/bin/env node

/**
 * DIAGNÓSTICO: Verificar tipo de dato y espacios en códigos
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
    console.log('\n📊 DIAGNÓSTICO DE CÓDIGO_ACCESO\n');
    
    // 1. Type check
    console.log('1️⃣  Tipo de dato en BD:\n');
    const typeInfo = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'usuarios' AND column_name = 'codigo_acceso'
    `;
    console.log(JSON.stringify(typeInfo, null, 2));
    
    // 2. Muestra de códigos actuales
    console.log('\n2️⃣  Primeros 5 códigos actuales:\n');
    const usuarios = await sql`
      SELECT id, codigo_acceso, LENGTH(codigo_acceso) as len
      FROM usuarios
      WHERE activo = true
      LIMIT 5
    `;
    usuarios.forEach(u => {
      const bytes = Buffer.from(u.codigo_acceso).toString('hex');
      console.log(`  Código: '${u.codigo_acceso}' | Length: ${u.len} | HEX: ${bytes}`);
    });
    
    // 3. Contar códigos con espacios
    console.log('\n3️⃣  Análisis de espacios:\n');
    const espaciosAnalisis = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN codigo_acceso != TRIM(codigo_acceso) THEN 1 END) as con_espacios,
        COUNT(CASE WHEN LENGTH(TRIM(codigo_acceso)) != 5 THEN 1 END) as longitud_invalida
      FROM usuarios
      WHERE activo = true
    `;
    console.log(`  Total: ${espaciosAnalisis[0].total}`);
    console.log(`  Con espacios: ${espaciosAnalisis[0].con_espacios}`);
    console.log(`  Longitud inválida (≠5): ${espaciosAnalisis[0].longitud_invalida}`);
    
    // 4. Actualizar con TRIM
    console.log('\n4️⃣  Actualizando con TRIM()...\n');
    const resultado = await sql`
      UPDATE usuarios
      SET codigo_acceso = TRIM(codigo_acceso)
      WHERE activo = true AND codigo_acceso != TRIM(codigo_acceso)
      RETURNING nombre, codigo_acceso
    `;
    console.log(`  ✅ Actualizados: ${resultado.length}`);
    resultado.forEach(u => {
      console.log(`     ${u.nombre}: '${u.codigo_acceso}'`);
    });
    
    // 5. Verificar validez
    console.log('\n5️⃣  Verificación final:\n');
    const verificacion = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN codigo_acceso ~ '^\\d{5}$' THEN 1 END) as validos
      FROM usuarios
      WHERE activo = true
    `;
    const validos = verificacion[0].validos;
    const total = verificacion[0].total;
    console.log(`  Códigos válidos: ${validos}/${total}`);
    console.log(`  ${validos === total ? '✅ TODOS VÁLIDOS' : '❌ AÚN HAY PROBLEMAS'}`);
    
    await sql.end();
    
  } catch (e) {
    console.error('Error:', e.message);
    await sql.end();
  }
})();
