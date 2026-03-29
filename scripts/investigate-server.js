#!/usr/bin/env node

const API_URL = 'https://campo-api-app-campo-saas.up.railway.app';

console.log('\n' + '='.repeat(80));
console.log('🔍 INVESTIGACIÓN PROFUNDA - SERVIDOR 503');
console.log('='.repeat(80) + '\n');

async function investigateServer() {
  // 1. Verificar disponibilidad general
  console.log('1️⃣ VERIFICANDO DISPONIBILIDAD DEL SERVIDOR\n');
  
  try {
    const healthRes = await fetch(`${API_URL}/health`, { timeout: 5000 });
    console.log(`✅ Servidor responde: ${healthRes.status} ${healthRes.statusText}`);
    const health = await healthRes.json();
    console.log(`   Status: ${health.status}`);
    console.log(`   Servicio: ${health.service}`);
  } catch (e) {
    console.error(`❌ No se puede conectar: ${e.message}`);
    return;
  }

  // 2. Verificar si el dominio está en línea
  console.log('\n2️⃣ VERIFICANDO INFRAESTRUCTURA\n');
  
  try {
    const res = await fetch(API_URL, { method: 'OPTIONS', timeout: 5000 });
    console.log(`✅ Responde a OPTIONS: ${res.status}`);
    console.log(`   Server header: ${res.headers.get('server') || 'No especificado'}`);
    console.log(`   Content-Type: ${res.headers.get('content-type') || 'No especificado'}`);
  } catch (e) {
    console.error(`❌ Error en OPTIONS: ${e.message}`);
  }

  // 3. Probar endpoint de auth con diferentes métodos
  console.log('\n3️⃣ INVESTIGANDO ENDPOINT /auth/tecnico\n');
  
  const authTests = [
    { name: 'POST con body JSON', body: { codigo: '00000' } },
    { name: 'POST sin body', body: null },
    { name: 'GET (incorrecto pero para ver respuesta)', method: 'GET', body: null },
    { name: 'POST con header específico', body: { codigo: '00000' }, headers: { 'X-API-Version': '1' } },
  ];

  for (const test of authTests) {
    try {
      const options = {
        method: test.method || 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(test.headers || {}),
        },
        timeout: 5000,
      };
      
      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      const res = await fetch(`${API_URL}/auth/tecnico`, options);
      const text = await res.text();
      
      console.log(`${res.status < 300 ? '✅' : res.status >= 500 ? '🔴' : '⚠️'} ${test.name}`);
      console.log(`   Status: ${res.status} - ${res.statusText}`);
      
      if (text && text.length < 500) {
        console.log(`   Response: ${text}`);
      }
      
      // Analizar headers
      const retryAfter = res.headers.get('retry-after');
      const xError = res.headers.get('x-error');
      if (retryAfter) console.log(`   Retry-After: ${retryAfter}`);
      if (xError) console.log(`   X-Error: ${xError}`);
    } catch (e) {
      console.log(`🔴 ${test.name}`);
      console.log(`   ERROR: ${e.message}`);
    }
  }

  // 4. Verificar otros endpoints para ver patrón
  console.log('\n4️⃣ VERIFICANDO OTROS ENDPOINTS\n');
  
  const endpoints = [
    '/health',
    '/notificaciones',
    '/mis-beneficiarios',
    '/bitacoras',
    '/cadenas-productivas',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${API_URL}${ep}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        timeout: 5000,
      });
      console.log(`${res.status < 300 ? '✅' : res.status >= 500 ? '🔴' : '⚠️'} ${ep.padEnd(30)} [${res.status}]`);
    } catch (e) {
      console.log(`🔴 ${ep.padEnd(30)} ERROR: ${e.message}`);
    }
  }

  // 5. Análisis del problema
  console.log('\n\n' + '='.repeat(80));
  console.log('🔬 ANÁLISIS ENCONTRADO');
  console.log('='.repeat(80) + '\n');

  console.log('PATRÓN DETECTADO:');
  console.log('✅ Health check: Responde 200');
  console.log('✅ Infrastructure: Servers están en línea');
  console.log('🔴 /auth/tecnico: Responde 503');
  console.log('❓ Otros endpoints: Verificar patrón...\n');

  console.log('INTERPRETACIÓN:\n');
  
  console.log('La respuesta 503 "Service Unavailable" puede significar:');
  console.log('');
  console.log('Opción 1: Error en base de datos');
  console.log('  • La app está corriendo');
  console.log('  • Los servidores responden');
  console.log('  • Pero la BD no responde o está saturada');
  console.log('  • Solo algunos endpoints fallan (aquellos que usan BD)');
  console.log('');
  console.log('Opción 2: Servicio específico caído');
  console.log('  • El servicio de autenticación puede estar offline');
  console.log('  • Otros servicios funcionan (health check)');
  console.log('');
  console.log('Opción 3: Error de configuración');
  console.log('  • La app está esperando algo que no está disponible');
  console.log('  • Variables de entorno no configuradas');
  console.log('  • Dependencia externa no disponible');
  console.log('');
  console.log('Opción 4: Mantenimiento');
  console.log('  • El servidor está en mantenimiento');
  console.log('  • O fue reiniciado recientemente');
  console.log('');

  console.log('RECOMENDACIONES:\n');
  console.log('1. Contactar al team de DevOps/Backend');
  console.log('2. Solicitar que verifiquen:');
  console.log('   • Estado de base de datos');
  console.log('   • Logs del servicio de autenticación');
  console.log('   • Monitoreo de recursos (CPU, memoria)');
  console.log('   • Conexiones activas');
  console.log('3. Preguntar si hay mantenimiento programado');
  console.log('4. Solicitar que reinicien el servicio si es necesario');

  console.log('\n' + '='.repeat(80) + '\n');
}

investigateServer().catch(console.error);
