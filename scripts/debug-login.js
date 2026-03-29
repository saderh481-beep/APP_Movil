#!/usr/bin/env node

/**
 * Script de diagnóstico para verificar el endpoint /auth/tecnico
 */

const API_URL = 'https://campo-api-app-campo-saas.up.railway.app';

async function testAuthEndpoint() {
  console.log('🔧 Diagnóstico de autenticación');
  console.log('================================\n');

  // Test 1: Health Check
  console.log('1️⃣  Verificando health check...');
  try {
    const healthRes = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 5000,
    });
    console.log(`   Status: ${healthRes.status}`);
    const healthData = await healthRes.json();
    console.log(`   Response:`, JSON.stringify(healthData, null, 2));
  } catch (e) {
    console.error(`   ❌ Error:`, e.message);
  }

  console.log('\n2️⃣  Verificando endpoint /auth/tecnico (POST)...');
  try {
    const authRes = await fetch(`${API_URL}/auth/tecnico`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ codigo: '12345' }),
      timeout: 5000,
    });
    console.log(`   Status: ${authRes.status}`);
    const text = await authRes.text();
    console.log(`   Response (raw):`, text.substring(0, 500));
    
    if (authRes.status === 503) {
      console.log('\n   ⚠️  PROBLEMA: El servidor retorna 503 Service Unavailable');
      console.log('   Causas posibles:');
      console.log('   - El servidor está en mantenimiento');
      console.log('   - La base de datos no está disponible');
      console.log('   - El endpoint tiene un error interno');
    }
  } catch (e) {
    console.error(`   ❌ Error:`, e.message);
  }

  console.log('\n3️⃣  Verificando conectividad general...');
  try {
    const testRes = await fetch(`${API_URL}`, {
      method: 'OPTIONS',
      timeout: 5000,
    });
    console.log(`   Status: ${testRes.status}`);
    console.log(`   Headers CORS:`, {
      'Access-Control-Allow-Origin': testRes.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': testRes.headers.get('Access-Control-Allow-Methods'),
    });
  } catch (e) {
    console.error(`   ❌ Error:`, e.message);
  }

  console.log('\n4️⃣  Intentando con diferentes formatos de request...');
  
  // Sin body
  try {
    const res1 = await fetch(`${API_URL}/auth/tecnico`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      timeout: 5000,
    });
    console.log(`   Sin body: ${res1.status}`);
  } catch (e) {
    console.error(`   Sin body error:`, e.message);
  }

  // Con código en URL
  try {
    const res2 = await fetch(`${API_URL}/auth/tecnico?codigo=12345`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      timeout: 5000,
    });
    console.log(`   Con código en URL: ${res2.status}`);
  } catch (e) {
    console.error(`   Con código en URL error:`, e.message);
  }

  console.log('\n================================');
  console.log('✅ Diagnóstico completado');
}

testAuthEndpoint().catch(console.error);
