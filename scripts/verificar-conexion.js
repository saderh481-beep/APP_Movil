#!/usr/bin/env node

/**
 * 🌐 VERIFICACIÓN DE CONEXIÓN - SADERH
 * 
 * Este script verifica la conexión con el servidor API
 * y reporta el estado de cada endpoint.
 * 
 * Uso: node scripts/verificar-conexion.js
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
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`),
};

// Función para hacer request
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
      reject(new Error('Timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Función principal
async function runConnectionCheck() {
  log.header('🌐 VERIFICACIÓN DE CONEXIÓN - SADERH');

  log.info(`API URL: ${API_URL}`);
  log.info('');

  const results = [];

  // 1. Health Check
  log.info('1. Health Check (GET /health)');
  try {
    const res = await makeRequest('GET', '/health');
    if (res.status === 200) {
      log.success(`Status: ${res.status} - OK`);
      if (res.data) {
        log.info(`   Service: ${res.data.service || 'N/A'}`);
        log.info(`   Status: ${res.data.status || 'N/A'}`);
      }
      results.push({ endpoint: '/health', status: 'ok', httpStatus: res.status });
    } else {
      log.warning(`Status: ${res.status}`);
      results.push({ endpoint: '/health', status: 'warning', httpStatus: res.status });
    }
  } catch (e) {
    log.error(`Error: ${e.message}`);
    results.push({ endpoint: '/health', status: 'error', error: e.message });
  }

  log.info('');

  // 2. Auth Endpoint
  log.info('2. Auth Endpoint (POST /auth/tecnico)');
  try {
    const res = await makeRequest('POST', '/auth/tecnico', { codigo: '00000' });
    if (res.status === 200) {
      log.success(`Status: ${res.status} - OK (Login exitoso)`);
      results.push({ endpoint: '/auth/tecnico', status: 'ok', httpStatus: res.status });
    } else if (res.status === 401) {
      log.success(`Status: ${res.status} - OK (Código inválido, esperado)`);
      results.push({ endpoint: '/auth/tecnico', status: 'ok', httpStatus: res.status });
    } else if (res.status === 503) {
      log.error(`Status: ${res.status} - ERROR (Servicio no disponible)`);
      results.push({ endpoint: '/auth/tecnico', status: 'error', httpStatus: res.status });
    } else {
      log.warning(`Status: ${res.status}`);
      results.push({ endpoint: '/auth/tecnico', status: 'warning', httpStatus: res.status });
    }
  } catch (e) {
    log.error(`Error: ${e.message}`);
    results.push({ endpoint: '/auth/tecnico', status: 'error', error: e.message });
  }

  log.info('');

  // 3. Endpoints protegidos (sin token)
  const protectedEndpoints = [
    { path: '/mis-beneficiarios', name: 'Mis Beneficiarios' },
    { path: '/mis-actividades', name: 'Mis Actividades' },
    { path: '/cadenas-productivas', name: 'Cadenas Productivas' },
    { path: '/bitacoras', name: 'Bitácoras' },
    { path: '/notificaciones', name: 'Notificaciones' },
  ];

  log.info('3. Endpoints Protegidos (sin token)');
  for (const ep of protectedEndpoints) {
    try {
      const res = await makeRequest('GET', ep.path);
      if (res.status === 401) {
        log.success(`${ep.name}: ${res.status} (Sin token, esperado)`);
        results.push({ endpoint: ep.path, status: 'ok', httpStatus: res.status });
      } else if (res.status === 503) {
        log.error(`${ep.name}: ${res.status} (Servicio no disponible)`);
        results.push({ endpoint: ep.path, status: 'error', httpStatus: res.status });
      } else {
        log.info(`${ep.name}: ${res.status}`);
        results.push({ endpoint: ep.path, status: 'info', httpStatus: res.status });
      }
    } catch (e) {
      log.error(`${ep.name}: Error - ${e.message}`);
      results.push({ endpoint: ep.path, status: 'error', error: e.message });
    }
  }

  log.info('');

  // Resumen
  log.header('📊 RESUMEN');

  const okCount = results.filter(r => r.status === 'ok').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const total = results.length;

  log.info(`Total de endpoints probados: ${total}`);
  log.success(`Endpoints OK: ${okCount}`);
  if (warningCount > 0) {
    log.warning(`Endpoints con advertencias: ${warningCount}`);
  }
  if (errorCount > 0) {
    log.error(`Endpoints con errores: ${errorCount}`);
  }

  log.info('');

  // Diagnóstico
  if (errorCount === 0) {
    log.success('✅ CONEXIÓN EXITOSA');
    log.info('Todos los endpoints responden correctamente.');
  } else if (errorCount === 1 && results.find(r => r.endpoint === '/auth/tecnico' && r.status === 'error')) {
    log.error('❌ PROBLEMA CRÍTICO: Endpoint de autenticación no disponible');
    log.info('');
    log.info('El servidor está funcionando pero el endpoint de autenticación tiene problemas.');
    log.info('');
    log.info('Acciones recomendadas:');
    log.info('  1. Verificar DATABASE_URL en Railway');
    log.info('  2. Verificar REDIS_URL en Railway');
    log.info('  3. Verificar JWT_SECRET en Railway');
    log.info('  4. Revisar logs del servidor en Railway');
  } else {
    log.warning('⚠️ PROBLEMAS DETECTADOS');
    log.info('Algunos endpoints tienen errores.');
    log.info('Revisa los detalles arriba.');
  }

  log.info('');
  log.header('FIN DE VERIFICACIÓN');
}

// Ejecutar verificación
runConnectionCheck().catch(e => {
  log.error(`Error fatal: ${e.message}`);
  process.exit(1);
});
