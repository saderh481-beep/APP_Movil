#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO RÁPIDO DEL SISTEMA DE AUTENTICACIÓN SADERH
 * 
 * Este script verifica el estado actual del sistema de autenticación
 * y reporta problemas encontrados.
 * 
 * Uso: node scripts/diagnostico-auth.js
 */

const https = require('https');

const API_URL = 'https://campo-api-app-campo-saas.up.railway.app';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`),
};

// Función para hacer requests HTTP
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000,
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null,
            raw: data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            raw: data,
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Función para validar JWT
function validateJWT(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token no es string' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Token no tiene 3 partes (header.payload.signature)' };
  }

  try {
    // Decodificar header
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    if (!header.alg) {
      return { valid: false, error: 'Token sin algoritmo (alg)' };
    }

    // Decodificar payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload inválido' };
    }

    // Verificar expiración
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now + 30) {
        return { valid: false, error: 'Token expirado o próximo a expirar' };
      }
    }

    // Verificar emisión
    if (!payload.iat || typeof payload.iat !== 'number') {
      return { valid: false, error: 'Token sin fecha de emisión (iat)' };
    }

    return { valid: true, payload };
  } catch (e) {
    return { valid: false, error: `Error decodificando token: ${e.message}` };
  }
}

// Función principal de diagnóstico
async function runDiagnostic() {
  log.header('🔍 DIAGNÓSTICO DEL SISTEMA DE AUTENTICACIÓN SADERH');

  const results = {
    healthCheck: null,
    authEndpoint: null,
    tokenValidation: null,
    connection: null,
  };

  // 1. Verificar Health Check
  log.info('1. Verificando Health Check...');
  try {
    const healthRes = await makeRequest('GET', '/health');
    if (healthRes.status === 200) {
      log.success(`Health Check: OK (${healthRes.status})`);
      results.healthCheck = { status: 'ok', data: healthRes.data };
    } else {
      log.warning(`Health Check: Status ${healthRes.status}`);
      results.healthCheck = { status: 'warning', data: healthRes.data };
    }
  } catch (e) {
    log.error(`Health Check: Error - ${e.message}`);
    results.healthCheck = { status: 'error', error: e.message };
  }

  // 2. Verificar Endpoint de Autenticación
  log.info('2. Verificando endpoint /auth/tecnico...');
  try {
    const authRes = await makeRequest('POST', '/auth/tecnico', { codigo: '00000' });
    
    if (authRes.status === 200) {
      log.success(`Auth Endpoint: OK (${authRes.status})`);
      results.authEndpoint = { status: 'ok', data: authRes.data };
      
      // Validar token recibido
      if (authRes.data && authRes.data.token) {
        const tokenValidation = validateJWT(authRes.data.token);
        if (tokenValidation.valid) {
          log.success('Token JWT: Válido');
          results.tokenValidation = { status: 'ok', payload: tokenValidation.payload };
        } else {
          log.warning(`Token JWT: ${tokenValidation.error}`);
          results.tokenValidation = { status: 'warning', error: tokenValidation.error };
        }
      }
    } else if (authRes.status === 401) {
      log.success(`Auth Endpoint: OK (${authRes.status} - Código inválido, esperado)`);
      results.authEndpoint = { status: 'ok', data: authRes.data };
    } else if (authRes.status === 503) {
      log.error(`Auth Endpoint: ERROR 503 - Servicio no disponible`);
      results.authEndpoint = { status: 'error', error: '503 Service Unavailable' };
    } else {
      log.warning(`Auth Endpoint: Status ${authRes.status}`);
      results.authEndpoint = { status: 'warning', data: authRes.data };
    }
  } catch (e) {
    log.error(`Auth Endpoint: Error - ${e.message}`);
    results.authEndpoint = { status: 'error', error: e.message };
  }

  // 3. Verificar Conexión General
  log.info('3. Verificando conexión general...');
  try {
    const optionsRes = await makeRequest('OPTIONS', '/');
    if (optionsRes.status < 400) {
      log.success(`Conexión: OK (${optionsRes.status})`);
      results.connection = { status: 'ok' };
    } else {
      log.warning(`Conexión: Status ${optionsRes.status}`);
      results.connection = { status: 'warning' };
    }
  } catch (e) {
    log.error(`Conexión: Error - ${e.message}`);
    results.connection = { status: 'error', error: e.message };
  }

  // 4. Verificar Otros Endpoints
  log.info('4. Verificando otros endpoints...');
  const endpoints = [
    '/mis-beneficiarios',
    '/mis-actividades',
    '/cadenas-productivas',
    '/bitacoras',
    '/notificaciones',
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await makeRequest('GET', endpoint);
      if (res.status === 401) {
        log.success(`${endpoint}: OK (${res.status} - Sin token, esperado)`);
      } else if (res.status === 503) {
        log.error(`${endpoint}: ERROR 503`);
      } else {
        log.info(`${endpoint}: Status ${res.status}`);
      }
    } catch (e) {
      log.error(`${endpoint}: Error - ${e.message}`);
    }
  }

  // Resumen
  log.header('📊 RESUMEN DEL DIAGNÓSTICO');

  const allOk = Object.values(results).every(r => r && r.status === 'ok');
  const hasErrors = Object.values(results).some(r => r && r.status === 'error');

  if (allOk) {
    log.success('✅ SISTEMA FUNCIONANDO CORRECTAMENTE');
    log.info('Todos los componentes están operativos.');
  } else if (hasErrors) {
    log.error('❌ SE ENCONTRARON PROBLEMAS CRÍTICOS');
    log.info('Revisa los errores marcados arriba.');
  } else {
    log.warning('⚠️ SISTEMA CON ADVERTENCIAS');
    log.info('Algunos componentes tienen advertencias.');
  }

  // Detalles de resultados
  console.log('\n📋 Detalles:');
  console.log(`   Health Check: ${results.healthCheck?.status || 'N/A'}`);
  console.log(`   Auth Endpoint: ${results.authEndpoint?.status || 'N/A'}`);
  console.log(`   Token Validation: ${results.tokenValidation?.status || 'N/A'}`);
  console.log(`   Connection: ${results.connection?.status || 'N/A'}`);

  // Recomendaciones
  log.header('💡 RECOMENDACIONES');

  if (results.authEndpoint?.status === 'error' && results.authEndpoint.error?.includes('503')) {
    log.error('El endpoint de autenticación retorna 503.');
    log.info('Esto indica que el backend tiene problemas de configuración.');
    log.info('Revisa: DATABASE_URL, REDIS_URL, JWT_SECRET en Railway.');
  }

  if (results.healthCheck?.status === 'error') {
    log.error('El health check falló.');
    log.info('El servidor puede estar caído o inaccesible.');
  }

  if (results.tokenValidation?.status === 'warning') {
    log.warning('El token JWT tiene advertencias.');
    log.info('Revisa la validación del token en el backend.');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  return results;
}

// Ejecutar diagnóstico
runDiagnostic().catch(e => {
  log.error(`Error fatal en diagnóstico: ${e.message}`);
  process.exit(1);
});
