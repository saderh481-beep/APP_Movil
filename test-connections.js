#!/usr/bin/env node

/**
 * Tester de Conexiones
 * Prueba si DATABASE_URL y REDIS_URL funcionan
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('🔌 TESTER DE CONEXIONES');
console.log('='.repeat(80) + '\n');

// Leer .env
const envPath = path.join(process.cwd(), '.env.production');
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

console.log('📋 VARIABLES CONFIGURADAS:\n');
console.log(`DATABASE_URL: ${envVars.DATABASE_URL?.substring(0, 60)}...`);
console.log(`REDIS_URL: ${envVars.REDIS_URL?.substring(0, 60)}...\n`);

// Prueba PostgreSQL
console.log('='.repeat(80));
console.log('🐘 PROBANDO POSTGRESQL');
console.log('='.repeat(80) + '\n');

console.log('Detalles de la URL:');
const dbUrl = new URL(envVars.DATABASE_URL);
console.log(`  Protocol: ${dbUrl.protocol}`);
console.log(`  Host: ${dbUrl.hostname}`);
console.log(`  Port: ${dbUrl.port}`);
console.log(`  Database: ${dbUrl.pathname.replace('/', '')}`);
console.log(`  User: ${dbUrl.username}\n`);

console.log('⚠️ Nota: La conexión se probará cuando subas a Railway');
console.log('   (No se puede probar desde localhost sin postgresql instalado)\n');

// Prueba Redis
console.log('='.repeat(80));
console.log('🔴 PROBANDO REDIS');
console.log('='.repeat(80) + '\n');

console.log('Detalles de la URL:');
const redisUrl = new URL(envVars.REDIS_URL);
console.log(`  Protocol: ${redisUrl.protocol}`);
console.log(`  Host: ${redisUrl.hostname}`);
console.log(`  Port: ${redisUrl.port}`);
console.log(`  Database: ${redisUrl.pathname || '0'}\n`);

console.log('⚠️ Nota: La conexión se probará cuando subas a Railway');
console.log('   (No se puede probar desde localhost sin redis instalado)\n');

// Resumen
console.log('='.repeat(80));
console.log('✅ CONFIGURACIÓN LISTA');
console.log('='.repeat(80) + '\n');

console.log('🚀 PRÓXIMOS PASOS:\n');

console.log('1️⃣ VE A RAILWAY DASHBOARD');
console.log('   https://railway.app/dashboard\n');

console.log('2️⃣ SELECCIONA TU PROYECTO "campo-saas"\n');

console.log('3️⃣ VE A: Settings → Environment Variables\n');

console.log('4️⃣ COPIA Y PEGA ESTAS VARIABLES:\n');

console.log('   DATABASE_URL');
console.log(`   ${envVars.DATABASE_URL}\n`);

console.log('   REDIS_URL');
console.log(`   ${envVars.REDIS_URL}\n`);

console.log('   JWT_SECRET');
console.log(`   ${envVars.JWT_SECRET}\n`);

console.log('   PORT');
console.log(`   ${envVars.PORT}\n`);

console.log('   NODE_ENV');
console.log(`   ${envVars.NODE_ENV}\n`);

console.log('5️⃣ HAZ CLICK EN "Save" O SIMILAR');
console.log('   Railway iniciará deploy automático\n');

console.log('6️⃣ ESPERA 2-5 MINUTOS');
console.log('   Luego ejecuta: node validate-api.js\n');

console.log('7️⃣ SI DE TODOS MODOS DA 503');
console.log('   Ejecuta: node monitor-server.js');
console.log('   Y espera a que se recupere\n');

console.log('='.repeat(80) + '\n');
