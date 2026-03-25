#!/usr/bin/env node

const postgres = require('postgres');
const axios = require('axios');

const sql = postgres({
  host: 'caboose.proxy.rlwy.net',
  port: 21223,
  username: 'postgres',
  password: 'knoayZQlVchOwjbIsrndCGBPpSqzvDzY',
  database: 'railway',
  ssl: 'require'
});

const API_BASE = 'https://campo-api-app-campo-saas.up.railway.app';

async function crearYProbarTecnico() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 CREAR Y PROBAR NUEVO TÉCNICO - FLUJO COMPLETO');
    console.log('='.repeat(70) + '\n');

    // Generar código único de 5 dígitos
    const codigo = Math.floor(10000 + Math.random() * 90000).toString();
    const nombre = `Técnico Test ${new Date().toISOString().split('T')[0]}`;
    const correo = `tecnico${codigo}@test.com`;

    console.log('📝 Datos del nuevo técnico:');
    console.log(`   Código: ${codigo}`);
    console.log(`   Nombre: ${nombre}`);
    console.log(`   Correo: ${correo}\n`);

    // ============================================
    // PASO 1: CREAR TÉCNICO EN BD
    // ============================================
    console.log('⏳ [1/3] Creando técnico en base de datos...');
    
    const result = await sql`
      INSERT INTO usuarios (
        codigo_acceso,
        nombre,
        correo,
        rol,
        activo,
        fecha_limite,
        estado_corte
      )
      VALUES (
        ${codigo},
        ${nombre},
        ${correo},
        'tecnico',
        true,
        NULL,
        'activo'
      )
      RETURNING id, codigo_acceso, nombre, correo, rol, activo, estado_corte
    `;

    if (!result || result.length === 0) {
      throw new Error('No se pudo insertar el técnico');
    }

    const user = result[0];
    console.log('✅ Técnico creado exitosamente\n');
    console.log(`   ID: ${user.id}`);
    console.log(`   Rol: ${user.rol}`);
    console.log(`   Estado: ${user.activo ? '✅ Activo' : '❌ Inactivo'}`);
    console.log(`   Corte: ${user.estado_corte}\n`);

    // ============================================
    // PASO 2: PROBAR SALUD DEL API
    // ============================================
    console.log('⏳ [2/3] Verificando salud del API...');
    
    try {
      const healthResponse = await axios.get(`${API_BASE}/health`, {
        timeout: 5000
      });
      console.log(`✅ API Healthy: ${healthResponse.status} OK\n`);
    } catch (healthError) {
      console.log(`⚠️  API Health Check: ${healthError.message}\n`);
    }

    // ============================================
    // PASO 3: PROBAR LOGIN
    // ============================================
    console.log('⏳ [3/3] Probando login con nuevo técnico...');
    console.log(`   Enviando: POST ${API_BASE}/auth/tecnico`);
    console.log(`   Código: ${codigo}\n`);

    const loginResponse = await axios.post(
      `${API_BASE}/auth/tecnico`,
      { codigo: codigo },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Login exitoso: ${loginResponse.status} OK`);
    
    if (loginResponse.data.token) {
      console.log(`✅ JWT Token recibido: ${loginResponse.data.token.substring(0, 30)}...`);
    }
    
    if (loginResponse.data.user) {
      console.log(`✅ Datos usuario:`, {
        id: loginResponse.data.user.id,
        nombre: loginResponse.data.user.nombre,
        correo: loginResponse.data.user.correo
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ ¡FLUJO COMPLETO EXITOSO!');
    console.log('='.repeat(70));
    console.log('\n📱 El nuevo técnico puede iniciar sesión correctamente\n');
    console.log('Credenciales para probar en la app:');
    console.log(`   Código: ${codigo}\n`);

    await sql.end();
    process.exit(0);

  } catch (error) {
    console.log('\n' + '='.repeat(70));
    console.log('❌ ERROR EN EL FLUJO');
    console.log('='.repeat(70) + '\n');
    
    if (error.response) {
      console.log(`📊 Respuesta del servidor: ${error.response.status}`);
      console.log('📄 Datos de error:', error.response.data);
    } else if (error.message) {
      console.log(`❌ ${error.message}`);
    } else {
      console.log('❌ Error desconocido', error);
    }

    console.log('\n');
    await sql.end();
    process.exit(1);
  }
}

crearYProbarTecnico();
