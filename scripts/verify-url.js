#!/usr/bin/env node

/**
 * Verificar una URL alternativa del servidor
 * Uso: node verify-url.js https://tu-url-aqui
 */

const urlArg = process.argv[2];

if (!urlArg) {
  console.log('\n❌ Uso: node verify-url.js <URL>');
  console.log('Ejemplo: node verify-url.js https://api.tuservidor.com\n');
  process.exit(1);
}

const API_URL = urlArg.replace(/\/+$/, ''); // Remover trailing slashes

console.log('\n' + '='.repeat(80));
console.log('🔍 VERIFICANDO URL ALTERNATIVA');
console.log('='.repeat(80) + '\n');

async function verifyUrl() {
  console.log(`Probando: ${API_URL}\n`);

  // Test 1: Health check
  console.log('1️⃣ Health check...');
  try {
    const healthRes = await fetch(`${API_URL}/health`, { timeout: 5000 });
    console.log(`   ✅ ${healthRes.status} ${healthRes.statusText}`);
    const health = await healthRes.json();
    console.log(`   Status: ${health.status}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // Test 2: Auth endpoint
  console.log('\n2️⃣ POST /auth/tecnico...');
  try {
    const authRes = await fetch(`${API_URL}/auth/tecnico`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ codigo: '00000' }),
      timeout: 5000,
    });
    
    const text = await authRes.text();
    const emoji = authRes.status < 300 ? '✅' : authRes.status >= 500 ? '🔴' : '⚠️';
    console.log(`   ${emoji} ${authRes.status} ${authRes.statusText}`);
    
    if (text.length < 200) {
      console.log(`   Response: ${text}`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // Test 3: Otros endpoints
  console.log('\n3️⃣ Otros endpoints (sin token)...');
  const endpoints = ['/notificaciones', '/mis-beneficiarios', '/bitacoras'];
  
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${API_URL}${ep}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        timeout: 5000,
      });
      const emoji = res.status === 401 ? '✅' : res.status >= 500 ? '🔴' : '⚠️';
      console.log(`   ${emoji} ${ep.padEnd(25)} [${res.status}]`);
    } catch (e) {
      console.log(`   ❌ ${ep.padEnd(25)} ERROR`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESUMEN:');
  
  // Determinar si es la URL correcta
  console.log(`\n✅ URL a usar en la app: ${API_URL}`);
  console.log('\n📝 Para actualizar en el código (lib/api.ts):');
  console.log(`   DEFAULT_APP_API_URL = '${API_URL}'`);
  
  console.log('\n' + '='.repeat(80) + '\n');
}

verifyUrl().catch(console.error);
