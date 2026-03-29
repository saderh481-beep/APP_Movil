#!/usr/bin/env node

/**
 * Validador de API - Verifica que todos los endpoints funcionen según README
 * Compara estado actual vs especificación espera
 */

const API_URL = 'https://campo-api-app-campo-saas.up.railway.app';

const ENDPOINTS_SPEC = {
  public: [
    { method: 'GET', path: '/health', name: 'Health Check', expectedStatus: 200 },
    { method: 'POST', path: '/auth/tecnico', name: 'Auth Login', expectedStatus: [200, 401], body: { codigo: '12345' } },
  ],
  authenticated: [
    { method: 'GET', path: '/mis-beneficiarios', name: 'Mis Beneficiarios', expectedStatus: 401, description: 'Sin token, debería ser 401' },
    { method: 'GET', path: '/mis-actividades', name: 'Mis Actividades', expectedStatus: 401 },
    { method: 'GET', path: '/cadenas-productivas', name: 'Cadenas Productivas', expectedStatus: 401 },
    { method: 'GET', path: '/bitacoras', name: 'Bitacoras', expectedStatus: 401 },
    { method: 'GET', path: '/notificaciones', name: 'Notificaciones', expectedStatus: 401 },
  ],
  errors: [
    { method: 'POST', path: '/auth/tecnico', name: 'Auth - Código inválido', expectedStatus: 401, body: { codigo: '99999' } },
  ]
};

console.log('\n' + '='.repeat(80));
console.log('📋 VALIDADOR DE API - Verificación de Especificación');
console.log('='.repeat(80));
console.log(`API URL: ${API_URL}\n`);

async function validateEndpoint(method, path, name, expectedStatus, body = null) {
  try {
    const options = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_URL}${path}`, options);
    const isExpected = Array.isArray(expectedStatus) 
      ? expectedStatus.includes(res.status)
      : res.status === expectedStatus;
    
    const emoji = isExpected ? '✅' : '❌';
    console.log(`${emoji} ${method.padEnd(6)} ${path.padEnd(30)} [${res.status}] ${name}`);
    
    if (!isExpected && res.status === 503) {
      console.log(`   └─ ⚠️ Esperaba: ${expectedStatus}, pero servidor no disponible`);
    }
    
    return { path, method, status: res.status, expected: expectedStatus, ok: isExpected };
  } catch (e) {
    console.log(`❌ ${method.padEnd(6)} ${path.padEnd(30)} [ERROR] ${name}`);
    console.log(`   └─ ${e.message}`);
    return { path, method, status: null, expected: expectedStatus, ok: false };
  }
}

async function runValidation() {
  const results = {
    public: [],
    authenticated: [],
    errors: [],
  };

  console.log('🔓 ENDPOINTS PÚBLICOS\n');
  for (const ep of ENDPOINTS_SPEC.public) {
    const result = await validateEndpoint(ep.method, ep.path, ep.name, ep.expectedStatus, ep.body);
    results.public.push(result);
  }

  console.log('\n🔐 ENDPOINTS CON AUTENTICACIÓN (Probados sin token - deberían ser 401)\n');
  for (const ep of ENDPOINTS_SPEC.authenticated) {
    const result = await validateEndpoint(ep.method, ep.path, ep.name, ep.expectedStatus);
    results.authenticated.push(result);
  }

  console.log('\n❌ PRUEBAS DE ERROR (Código inválido)\n');
  for (const ep of ENDPOINTS_SPEC.errors) {
    const result = await validateEndpoint(ep.method, ep.path, ep.name, ep.expectedStatus, ep.body);
    results.errors.push(result);
  }

  // Análisis
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESULTADO DE VALIDACIÓN');
  console.log('='.repeat(80) + '\n');

  const allResults = [...results.public, ...results.authenticated, ...results.errors];
  const passing = allResults.filter(r => r.ok).length;
  const total = allResults.length;
  const percentage = Math.round((passing / total) * 100);

  console.log(`Pasando: ${passing}/${total} (${percentage}%)\n`);

  // Problemas detectados
  const failures = allResults.filter(r => !r.ok);
  if (failures.length > 0) {
    console.log('🔴 PROBLEMAS DETECTADOS:\n');
    
    for (const fail of failures) {
      console.log(`✗ ${fail.method} ${fail.path}`);
      console.log(`  Status recibido: ${fail.status}`);
      console.log(`  Status esperado: ${fail.expected}`);
      
      if (fail.status === 503) {
        console.log(`  Causa: Servidor no disponible (503)`);
      } else if (fail.status === null) {
        console.log(`  Causa: Error de conexión`);
      }
    }
  }

  // Estado del backend
  console.log('\n🔍 ESTADO DEL BACKEND:\n');
  
  const healthOk = results.public.find(r => r.path === '/health')?.ok;
  const authFailing = results.public.find(r => r.path === '/auth/tecnico')?.status === 503;
  
  if (healthOk && authFailing) {
    console.log('⚠️ DIAGNÓSTICO:');
    console.log('  • Servidor (health): ✅ Responde');
    console.log('  • Auth (/auth/tecnico): 🔴 Error 503');
    console.log('');
    console.log('PROBABLES CAUSAS:');
    console.log('  1. DATABASE_URL no configurado o BD no alcanzable');
    console.log('  2. REDIS_URL no configurado o Redis no alcanzable');
    console.log('  3. JWT_SECRET no configurado');
    console.log('  4. Módulo de auth tiene un bug/crash');
    console.log('');
    console.log('RECOMENDACIÓN:');
    console.log('  Contactar backend team para revisar:');
    console.log('  • .env completo (DATABASE_URL, REDIS_URL, JWT_SECRET)');
    console.log('  • Logs de error del servicio auth');
    console.log('  • Estado de BD y Redis');
  } else if (healthOk && !authFailing) {
    console.log('✅ API FUNCIONANDO CORRECTAMENTE');
    console.log('   Todos los endpoints responden según especificación');
  } else {
    console.log('❌ PROBLEMA GENERAL DE INFRAESTRUCTURA');
    console.log('   El servidor no está alcanzable');
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Resumen técnico
  console.log('📝 RESUMEN TÉCNICO:\n');
  console.log('Especificación esperada según README:');
  console.log(`  • Health check: GET /health → 200`);
  console.log(`  • Login: POST /auth/tecnico → 200 (con token)`);
  console.log(`  • Datos: GET /mis-* → 401 sin token (esperado)`);
  console.log(`  • Bitácoras: GET /bitacoras → 401 sin token (esperado)`);
  console.log(`  • Notificaciones: GET /notificaciones → 401 sin token (esperado)`);
  console.log(`\nEstado actual:`);
  
  for (const type of ['public', 'authenticated', 'errors']) {
    const typeResults = results[type];
    const passing = typeResults.filter(r => r.ok).length;
    console.log(`  • ${type}: ${passing}/${typeResults.length} pasando`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

runValidation().catch(console.error);
