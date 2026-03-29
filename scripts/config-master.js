#!/usr/bin/env node

/**
 * MAESTRO DE CONFIGURACIÓN
 * Orquesta todo el proceso de configuración de variables de entorno
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n' + '='.repeat(80));
console.log('🎯 MAESTRO DE CONFIGURACIÓN DE ENTORNO');
console.log('='.repeat(80) + '\n');

// Verificar si .env.production existe
const envPath = path.join(process.cwd(), '.env.production');
if (!fs.existsSync(envPath)) {
  console.log('❌ No se encontró .env.production');
  console.log('\n1️⃣ Ejecuta primero: node generate-env.js\n');
  process.exit(1);
}

console.log('✅ Archivo .env.production encontrado\n');

// Actual
console.log('='.repeat(80));
console.log('📊 ESTADO ACTUAL');
console.log('='.repeat(80) + '\n');

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match && !line.startsWith('#')) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key && value) {
      envVars[key] = value;
    }
  }
});

const checks = [
  {
    name: 'DATABASE_URL',
    ok: envVars.DATABASE_URL?.startsWith('postgresql://'),
    value: envVars.DATABASE_URL?.substring(0, 60)
  },
  {
    name: 'REDIS_URL',
    ok: envVars.REDIS_URL?.startsWith('redis://'),
    value: envVars.REDIS_URL?.substring(0, 60)
  },
  {
    name: 'JWT_SECRET',
    ok: envVars.JWT_SECRET?.length > 20,
    value: envVars.JWT_SECRET ? `${envVars.JWT_SECRET.substring(0, 20)}...` : 'NOT SET'
  }
];

let needsWork = 0;
checks.forEach(check => {
  if (check.ok) {
    console.log(`✅ ${check.name.padEnd(20)} ${check.value || 'OK'}`);
  } else {
    console.log(`❌ ${check.name.padEnd(20)} REQUIERE CONFIGURACIÓN`);
    needsWork++;
  }
});

console.log('\n' + '='.repeat(80));
console.log('🛠️ INSTRUCCIONES DE CONFIGURACIÓN');
console.log('='.repeat(80) + '\n');

if (needsWork === 0) {
  console.log('✅ TODAS LAS VARIABLES ESTÁN CONFIGURADAS\n');
  console.log('PRÓXIMO PASO: Subir a Railway\n');
  console.log('1. Ve a: https://railway.app/dashboard/project');
  console.log('2. Selecciona tu proyecto');
  console.log('3. Variables → Environment');
  console.log('4. Crea estas variables:\n');

  checks.forEach(check => {
    if (envVars[check.name]) {
      console.log(`   ${check.name}=${envVars[check.name]}`);
    }
  });

  console.log('\n5. Deploy automático\n');
} else {
  console.log('PASO 1: OBTENER URLs DE RAILWAY\n');

  console.log('Necesitas obtener:\n');
  checks.forEach(check => {
    if (!check.ok && (check.name === 'DATABASE_URL' || check.name === 'REDIS_URL')) {
      console.log(`  ❌ ${check.name}`);
    }
  });

  console.log('\nCOMO OBTENERLAS:\n');

  console.log('DATABASE_URL (PostgreSQL):');
  console.log('  1. Railway.app → Dashboard → Proyecto');
  console.log('  2. Plugins → PostgreSQL');
  console.log('  3. Connect → Railway Provided URL');
  console.log('  4. Copiar completa (comienza con postgresql://)\n');

  console.log('REDIS_URL (Redis):');
  console.log('  1. Railway.app → Dashboard → Proyecto');
  console.log('  2. Plugins → Redis');
  console.log('  3. Connect → REDIS_URL');
  console.log('  4. Copiar completa (comienza con redis://)\n');

  console.log('PASO 2: ACTUALIZAR .env.production\n');

  console.log('Edita el archivo .env.production y reemplaza:\n');

  if (!envVars.DATABASE_URL?.startsWith('postgresql://')) {
    console.log('DATABASE_URL=<PEGA_AQUI_LA_URL_DE_POSTGRESQL>\n');
  }

  if (!envVars.REDIS_URL?.startsWith('redis://')) {
    console.log('REDIS_URL=<PEGA_AQUI_LA_URL_DE_REDIS>\n');
  }

  console.log('PASO 3: SUBE A RAILWAY\n');

  console.log('1. Ve a: https://railway.app/dashboard');
  console.log('2. Proyecto → Variables');
  console.log('3. Crea estas variables en el "Environment":\n');

  if (!checks[0].ok) {
    console.log(`   DATABASE_URL=${envVars.DATABASE_URL || '<URL>'}`);
  }
  if (!checks[1].ok) {
    console.log(`   REDIS_URL=${envVars.REDIS_URL || '<URL>'}`);
  }
  if (checks[2].ok) {
    console.log(`   JWT_SECRET=${envVars.JWT_SECRET}`);
  }

  console.log('\n4. Deploy automático\n');

  console.log('PASO 4: ESPERAR A QUE EL SERVIDOR SE RECUPERE\n');

  console.log('Ejecuta: node monitor-server.js');
  console.log('Te notificará cuando /auth/tecnico esté disponible\n');
}

console.log('='.repeat(80));
console.log('HERRAMIENTAS DISPONIBLES');
console.log('='.repeat(80) + '\n');

console.log('node generate-env.js');
console.log('  └─ Generar .env.production con JWT_SECRET seguro\n');

console.log('node validate-env.js');
console.log('  └─ Validar todas las variables están correctas\n');

console.log('node get-railway-urls.js');
console.log('  └─ Obtener URLs de Railway de forma interactiva\n');

console.log('node validate-api.js');
console.log('  └─ Probar todos los 14 endpoints\n');

console.log('node monitor-server.js');
console.log('  └─ Detectar cuándo el servidor se recupera\n');

console.log('=' .repeat(80) + '\n');
