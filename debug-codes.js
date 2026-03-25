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

async function debugCodes() {
  try {
    console.log('🔍 Diagnóstico detallado de códigos de 5 dígitos...\n');
    
    const codigos = ['56736', '18430', '61787'];
    
    for (const codigo of codigos) {
      console.log(`\n📋 Verificando código: ${codigo}`);
      console.log('-'.repeat(50));
      
      const usuarios = await sql`
        SELECT 
          id,
          codigo_acceso,
          nombre,
          correo,
          activo,
          fecha_limite,
          estado_corte,
          NOW()::date as fecha_actual
        FROM usuarios
        WHERE codigo_acceso::text = ${codigo}
      `;
      
      if (usuarios.length === 0) {
        console.log('❌ No encontrado en BD');
        continue;
      }
      
      const u = usuarios[0];
      console.log(`ID: ${u.id}`);
      console.log(`Nombre: ${u.nombre}`);
      console.log(`Correo: ${u.correo}`);
      console.log(`Activo: ${u.activo ? '✅ SÍ' : '❌ NO'}`);
      console.log(`Fecha Límite: ${u.fecha_limite || 'NULL (Sin límite)'}`);
      console.log(`Fecha Actual: ${u.fecha_actual}`);
      console.log(`Estado Corte: ${u.estado_corte}`);
      
      if (u.fecha_limite) {
        const vencido = new Date(u.fecha_limite) < new Date(u.fecha_actual);
        console.log(`Vencido: ${vencido ? '❌ SÍ - EXPIRÓ' : '✅ NO - VÁLIDO'}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n💡 SOLUCIÓN: Si ves problemas, voy a crear un nuevo usuario de prueba...\n');
    
    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sql.end();
  }
}

debugCodes();
