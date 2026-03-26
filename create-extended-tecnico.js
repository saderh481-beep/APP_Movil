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

async function createLongValidTecnico() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 CREAR TÉCNICO CON PERIODO EXTENDIDO (5 AÑOS)');
    console.log('='.repeat(80) + '\n');

    const codigo = Math.floor(10000 + Math.random() * 90000).toString();
    const nombre = 'Técnico Admin';
    const correo = `tecnico.admin@test.com`;
    
    // Fecha límite: 5 años a partir de hoy (muy segura)
    const hoy = new Date();
    const cincoAnosAdelante = new Date(hoy.getFullYear() + 5, hoy.getMonth(), hoy.getDate());
    const fechaLimite = cincoAnosAdelante.toISOString().split('T')[0];

    console.log('📝 Datos:');
    console.log(`   Código: ${codigo}`);
    console.log(`   Nombre: ${nombre}`);
    console.log(`   Correo: ${correo}`);
    console.log(`   Fecha Límite: ${fechaLimite}\n`);

    // CREAR EN USUARIOS
    console.log('⏳ Insertando en usuarios...');
    const result = await sql`
      INSERT INTO usuarios (
        codigo_acceso,
        nombre,
        correo,
        rol,
        activo
      )
      VALUES (
        ${codigo},
        ${nombre},
        ${correo},
        'tecnico',
        true
      )
      RETURNING id, codigo_acceso, nombre, activo
    `;

    if (!result || result.length === 0) throw new Error('No se insertó usuario');
    
    const user = result[0];
    console.log(`✅ Usuario creado: ${user.id}\n`);

    // CREAR EN TECNICO_DETALLES
    console.log('⏳ Insertando en tecnico_detalles...');
    const coordinador_id = '7c9f7746-9c53-496e-9ea3-cc7f07d01e36';
    const fecha_timestamp = cincoAnosAdelante.toISOString();
    
    await sql`
      INSERT INTO tecnico_detalles (
        tecnico_id,
        coordinador_id,
        fecha_limite,
        estado_corte
      )
      VALUES (
        ${user.id}::uuid,
        ${coordinador_id}::uuid,
        ${fecha_timestamp}::timestamp with time zone,
        'en_servicio'
      )
    `;
    
    console.log(`✅ Detalles creados\n`);

    // PROBAR LOGIN
    console.log('⏳ Probando login...');
    const axios = require('axios');
    const API_URL = 'https://campo-api-app-campo-saas.up.railway.app';

    try {
      const loginResponse = await axios.post(
        `${API_URL}/auth/tecnico`,
        { codigo }
      );
      
      console.log(`✅ Login exitoso\n`);
      
      if (loginResponse.data.token) {
        console.log(`✅ Token recibido: ${loginResponse.data.token.substring(0, 40)}...\n`);
      }

      console.log('='.repeat(80));
      console.log('✅ TÉCNICO CREADO Y LOGIN EXITOSO');
      console.log('='.repeat(80));
      console.log(`\n✅ Código de acceso: ${codigo}`);
      console.log(`✅ Válido hasta: ${fechaLimite}\n`);

    } catch (loginError) {
      console.log(`❌ Login falló: ${loginError.response?.data?.error || loginError.message}\n`);
    }

    await sql.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

createLongValidTecnico();
