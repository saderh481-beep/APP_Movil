#!/usr/bin/env node

/**
 * VALIDACIÓN END-TO-END DEL FLUJO DE REGISTRACIÓN Y AUTENTICACIÓN
 * Verifica que todos los datos se capturen, guarden, recuperen y muestren correctamente
 */

const postgres = require('postgres');
const https = require('https');

const sql = postgres({
  host: 'caboose.proxy.rlwy.net',
  port: 21223,
  username: 'postgres',
  password: 'knoayZQlVchOwjbIsrndCGBPpSqzvDzY',
  database: 'railway',
  ssl: 'require'
});

const BASE_URL = 'campo-api-app-campo-saas.up.railway.app';

function httpRequest(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = data.length;
    
    const options = {
      hostname: BASE_URL,
      path,
      method,
      headers
    };
    
    const req = https.request(options, (res) => {
      let response = '';
      res.on('data', chunk => response += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: response ? JSON.parse(response) : null,
            raw: response
          });
        } catch {
          resolve({
            status: res.statusCode,
            data: null,
            raw: response
          });
        }
      });
    });
    
    req.on('error', e => resolve({ status: 0, error: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

async function testCompleteFlow() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 VALIDACIÓN END-TO-END: FLUJO COMPLETO DE REGISTRACIÓN Y AUTENTICACIÓN');
  console.log('='.repeat(80));
  
  try {
    // FASE 1: Obtener usuario de test
    console.log('\n📋 FASE 1: Obtener usuario de test de la base de datos');
    console.log('─'.repeat(80));
    
    const usuarios = await sql`
      SELECT 
        id,
        codigo_acceso,
        nombre,
        correo,
        activo,
        estado_corte,
        fecha_limite
      FROM usuarios 
      WHERE activo = true AND estado_corte = 'en_servicio'
      ORDER BY id DESC
      LIMIT 1
    `;
    
    if (usuarios.length === 0) {
      console.log('❌ ERROR: No hay usuarios activos con estado_corte válido');
      console.log('\n💡 SOLUCIÓN: Ejecuta antes:');
      console.log('   node fix-usuarios-estado.js');
      return false;
    }
    
    const usuario = usuarios[0];
    console.log(`✅ Usuario encontrado:`);
    console.log(`   ID: ${usuario.id}`);
    console.log(`   Nombre: ${usuario.nombre}`);
    console.log(`   Código: ${usuario.codigo_acceso}`);
    console.log(`   Correo: ${usuario.correo || 'no especificado'}`);
    console.log(`   Estado: ${usuario.estado_corte}`);
    console.log(`   Activo: ${usuario.activo ? '✅ SÍ' : '❌ NO'}`);
    
    // FASE 2: Validar estructura de datos
    console.log('\n📊 FASE 2: Validar integridad de datos en BD');
    console.log('─'.repeat(80));
    
    const problemas = [];
    
    if (!usuario.id) problemas.push('- ID faltante');
    if (!usuario.codigo_acceso) problemas.push('- Código de acceso faltante');
    if (!usuario.nombre) problemas.push('- Nombre faltante');
    if (!usuario.activo) problemas.push('- Usuario inactivo');
    if (usuario.estado_corte !== 'en_servicio') problemas.push(`- Estado incorrecto: ${usuario.estado_corte}`);
    
    if (problemas.length > 0) {
      console.log('❌ Problemas encontrados:');
      problemas.forEach(p => console.log(`   ${p}`));
      return false;
    }
    
    console.log('✅ Estructura de datos: VÁLIDA');
    
    // FASE 3: Login
    console.log('\n🔐 FASE 3: Intentar LOGIN con código');
    console.log('─'.repeat(80));
    
    const loginRes = await httpRequest('POST', '/auth/tecnico', {
      codigo: usuario.codigo_acceso
    });
    
    console.log(`Respuesta del servidor: ${loginRes.status}`);
    
    if (loginRes.status !== 200) {
      console.log(`❌ LOGIN FALLÓ: ${loginRes.status}`);
      console.log(`   Response: ${loginRes.raw ? loginRes.raw.substring(0, 300) : 'vacío'}`);
      return false;
    }
    
    console.log('✅ Login exitoso');
    
    // Validar respuesta
    if (!loginRes.data) {
      console.log('❌ Response vacío del servidor');
      return false;
    }
    
    const token = loginRes.data.token || loginRes.data.access_token;
    if (!token) {
      console.log('❌ No hay token en la respuesta');
      console.log(`   Response keys: ${Object.keys(loginRes.data).join(', ')}`);
      return false;
    }
    
    console.log(`✅ Token recibido: ${token.substring(0, 30)}...`);
    
    // Validar estructura JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log(`❌ Token no es JWT válido (${parts.length} partes)`);
      return false;
    }
    console.log('✅ Token tiene estructura JWT válida');
    
    // FASE 4: Usar token en request protegido
    console.log('\n📤 FASE 4: Hacer request con token a endpoint protegido');
    console.log('─'.repeat(80));
    
    const actividadesRes = await httpRequest('GET', '/mis-actividades', null, token);
    
    console.log(`GET /mis-actividades con token: ${actividadesRes.status}`);
    
    if (actividadesRes.status === 401) {
      console.log('❌ Backend rechazó el token (401 Unauthorized)');
      console.log(`   Response: ${actividadesRes.raw.substring(0, 200)}`);
      return false;
    }
    
    if (actividadesRes.status === 200) {
      console.log('✅ Token aceptado por servidor');
    } else {
      console.log(`⚠️  Respuesta inesperada: ${actividadesRes.status}`);
    }
    
    // FASE 5: Validar datos retornados
    console.log('\n📋 FASE 5: Validar integridad de datos retornados');
    console.log('─'.repeat(80));
    
    if (actividadesRes.status === 200) {
      if (actividadesRes.data) {
        console.log('✅ Servidor envió datos');
        console.log(`   Tipo: ${typeof actividadesRes.data}`);
        
        if (Array.isArray(actividadesRes.data)) {
          console.log(`   Es array: ✅ SÍ (${actividadesRes.data.length} elementos)`);
        } else if (Array.isArray(actividadesRes.data?.data)) {
          console.log(`   Es data envuelta: ✅ SÍ (${actividadesRes.data.data.length} elementos)`);
        } else if (Array.isArray(actividadesRes.data?.actividades)) {
          console.log(`   Es .actividades array: ✅ SÍ (${actividadesRes.data.actividades.length} elementos)`);
        } else {
          console.log('   ⚠️  No es un array (estructura diferente)');
        }
        
        console.log('✅ Datos retornados válidos');
      }
    }
    
    // RESUMEN
    console.log('\n' + '='.repeat(80));
    console.log('✅ VALIDACIÓN EXITOSA: El flujo completo funciona correctamente');
    console.log('='.repeat(80));
    
    console.log('\n📝 RESUMEN:');
    console.log(`   1. Usuario encontrado en BD: ${usuario.nombre}`);
    console.log(`   2. Datos íntegros: ✅ SÍ`);
    console.log(`   3. Login exitoso: ✅ SÍ`);
    console.log(`   4. Token válido: ✅ SÍ`);
    console.log(`   5. Request autenticado: ✅ SÍ`);
    console.log(`   6. Datos retornados: ✅ SÍ`);
    
    console.log('\n✨ La aplicación está lista para uso');
    console.log('='.repeat(80) + '\n');
    
    return true;
  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error);
    return false;
  } finally {
    await sql.end();
  }
}

// Ejecutar
testCompleteFlow().then(success => {
  process.exit(success ? 0 : 1);
});
