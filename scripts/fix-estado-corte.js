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

async function fixEstadoCorte() {
  try {
    console.log('🔧 Corrigiendo estado_corte en usuarios...\n');
    
    const codigos = ['56736', '18430', '61787'];
    
    // Actualizar a 'en_servicio'
    await sql`
      UPDATE usuarios 
      SET estado_corte = 'en_servicio'
      WHERE codigo_acceso::text = ANY(${codigos})
    `;
    
    console.log('✅ Actualización completada!\n');
    
    // Verificar cambios
    console.log('📋 Verificando cambios:\n');
    const usuarios = await sql`
      SELECT 
        codigo_acceso,
        nombre,
        activo,
        estado_corte
      FROM usuarios
      WHERE codigo_acceso::text = ANY(${codigos})
      ORDER BY codigo_acceso
    `;
    
    usuarios.forEach(u => {
      console.log(`✅ ${u.codigo_acceso} | ${u.nombre.padEnd(15)} | Estado: ${u.estado_corte}`);
    });
    
    console.log('\n✅ Ahora intenta hacer login nuevamente con estos códigos');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

fixEstadoCorte();
