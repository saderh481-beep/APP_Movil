#!/usr/bin/env node

/**
 * 🧪 PRUEBA DE LOGIN - SADERH
 * 
 * Este script prueba el login con diferentes códigos para verificar
 * que el sistema de autenticación funciona correctamente.
 * 
 * Uso: node scripts/test-login.js [código]
 * Ejemplo: node scripts/test-login.js 00000
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

// Función para hacer request de login
function testLogin(codigo) {
  return new Promise((resolve, reject) => {
    const datos = JSON.stringify({ codigo: codigo });
    
    const options = {
      hostname: 'campo-api-app-campo-saas.up.railway.app',
      path: '/auth/tecnico',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': datos.length,
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
            raw: data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: null,
            raw: data,
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ status: 0, error: e.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'Timeout' });
    });

    req.write(datos);
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
    return { valid: false, error: 'Token no tiene 3 partes' };
  }

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    if (!header.alg) {
      return { valid: false, error: 'Token sin algoritmo' };
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload inválido' };
    }

    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now + 30) {
        return { valid: false, error: 'Token expirado' };
      }
    }

    return { valid: true, payload };
  } catch (e) {
    return { valid: false, error: `Error decodificando: ${e.message}` };
  }
}

// Función principal
async function runLoginTest(codigo) {
  log.header('🧪 PRUEBA DE LOGIN - SADERH');

  if (!codigo) {
    log.error('No se proporcionó código de acceso');
    log.info('Uso: node scripts/test-login.js [código]');
    log.info('Ejemplo: node scripts/test-login.js 00000');
    process.exit(1);
  }

  // Validar formato del código
  if (!/^\d{5}$/.test(codigo)) {
    log.error(`Código inválido: "${codigo}"`);
    log.info('El código debe ser exactamente 5 dígitos');
    process.exit(1);
  }

  log.info(`Probando login con código: ${codigo}`);
  log.info(`API URL: ${API_URL}`);
  log.info('');

  // Realizar login
  log.info('Enviando petición de login...');
  const result = await testLogin(codigo);

  // Analizar resultado
  if (result.status === 0) {
    log.error(`Error de conexión: ${result.error}`);
    log.info('Verifica tu conexión a internet');
    process.exit(1);
  }

  log.info(`Status HTTP: ${result.status}`);
  log.info('');

  if (result.status === 200) {
    log.success('LOGIN EXITOSO');
    log.info('');

    // Verificar token
    if (result.body && result.body.token) {
      log.info('Token recibido: Sí');
      log.info(`Longitud del token: ${result.body.token.length} caracteres`);
      
      const tokenValidation = validateJWT(result.body.token);
      if (tokenValidation.valid) {
        log.success('Token JWT: Válido');
        log.info(`Algoritmo: ${tokenValidation.payload.alg || 'N/A'}`);
        if (tokenValidation.payload.exp) {
          const expDate = new Date(tokenValidation.payload.exp * 1000);
          log.info(`Expira: ${expDate.toLocaleString()}`);
        }
      } else {
        log.warning(`Token JWT: ${tokenValidation.error}`);
      }
    } else {
      log.warning('Token recibido: No');
    }

    // Verificar datos del técnico
    if (result.body && result.body.tecnico) {
      log.info('');
      log.info('Datos del técnico:');
      log.info(`  ID: ${result.body.tecnico.id || 'N/A'}`);
      log.info(`  Nombre: ${result.body.tecnico.nombre || 'N/A'}`);
      log.info(`  Rol: ${result.body.tecnico.rol || 'N/A'}`);
    }

    log.info('');
    log.success('✅ El sistema de autenticación funciona correctamente');
    log.info('Puedes usar este código en la aplicación');

  } else if (result.status === 401) {
    log.warning('LOGIN FALLIDO (401 - No autorizado)');
    log.info('');
    
    if (result.body && result.body.error) {
      log.info(`Error del servidor: ${result.body.error}`);
    }
    
    log.info('');
    log.info('Posibles causas:');
    log.info('  - Código de acceso incorrecto');
    log.info('  - Usuario no existe en la base de datos');
    log.info('  - Usuario inactivo');
    log.info('  - Período de validez vencido');

  } else if (result.status === 503) {
    log.error('ERROR 503 - Servicio no disponible');
    log.info('');
    log.info('El servidor backend tiene problemas de configuración.');
    log.info('');
    log.info('Acciones recomendadas:');
    log.info('  1. Verificar DATABASE_URL en Railway');
    log.info('  2. Verificar REDIS_URL en Railway');
    log.info('  3. Verificar JWT_SECRET en Railway');
    log.info('  4. Revisar logs del servidor');

  } else {
    log.warning(`Status inesperado: ${result.status}`);
    if (result.raw) {
      log.info(`Respuesta: ${result.raw.substring(0, 200)}`);
    }
  }

  log.info('');
  log.header('FIN DE PRUEBA');
}

// Obtener código de los argumentos
const codigo = process.argv[2];

// Ejecutar prueba
runLoginTest(codigo).catch(e => {
  log.error(`Error fatal: ${e.message}`);
  process.exit(1);
});
