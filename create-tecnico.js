#!/usr/bin/env node

const postgres = require('postgres');
const readline = require('readline');

const sql = postgres({
  host: 'caboose.proxy.rlwy.net',
  port: 21223,
  username: 'postgres',
  password: 'knoayZQlVchOwjbIsrndCGBPpSqzvDzY',
  database: 'railway',
  ssl: 'require'
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(msg) {
  return new Promise(resolve => {
    rl.question(msg, resolve);
  });
}

async function crearTecnico() {
  try {
    console.log('\n🔧 CREAR NUEVO TÉCNICO PARA LOGIN\n');
    console.log('=' .repeat(60));
    
    const codigo = await pregunta('\n📱 Código de acceso (5 dígitos): ');
    const nombre = await pregunta('👤 Nombre completo: ');
    const correo = await pregunta('📧 Correo: ');
    
    // Validaciones
    if (!/^\d{5}$/.test(codigo)) {
      console.log('\n❌ El código debe ser exactamente 5 dígitos');
      rl.close();
      process.exit(1);
    }
    
    if (!nombre.trim()) {
      console.log('\n❌ El nombre no puede estar vacío');
      rl.close();
      process.exit(1);
    }
    
    console.log('\n⏳ Insertando técnico en la base de datos...\n');
    
    // Insertar con valores correctos para login
    const result = await sql`
      INSERT INTO usuarios (
        codigo_acceso,
        nombre,
        correo,
        activo,
        fecha_limite,
        estado_corte
      )
      VALUES (
        ${codigo},
        ${nombre},
        ${correo},
        true,
        NULL,
        'en_servicio'
      )
      RETURNING id, codigo_acceso, nombre, correo, activo, estado_corte
    `;
    
    if (result.length > 0) {
      const user = result[0];
      console.log('✅ ¡TÉCNICO CREADO EXITOSAMENTE!\n');
      console.log('Detalles:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Código: ${user.codigo_acceso}`);
      console.log(`  Nombre: ${user.nombre}`);
      console.log(`  Correo: ${user.correo}`);
      console.log(`  Activo: ${user.activo ? '✅ SÍ' : '❌ NO'}`);
      console.log(`  Estado Corte: ${user.estado_corte}`);
      console.log('\n📱 Ahora puede iniciar sesión con:');
      console.log(`   Código: ${user.codigo_acceso}`);
    }
    
    rl.close();
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    await sql.end();
    process.exit(1);
  }
}

crearTecnico();
