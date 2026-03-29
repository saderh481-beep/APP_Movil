#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Credenciales ya proporcionadas por el usuario
const config = {
  // PostgreSQL (usando URL interna de Railway - más rápida y segura)
  DATABASE_URL: 'postgresql://postgres:knoayZQlVchOwjbIsrndCGBPpSqzvDzY@postgres.railway.internal:5432/railway',
  
  // Redis (usando URL interna de Railway)
  REDIS_URL: 'redis://default:SdekIELQIOJNBXLIUXHgDfHQhfqSwgqU@redis.railway.internal:6379',
  
  // Backend URL
  BACKEND_URL: 'https://campo-api-app-campo-saas.up.railway.app',
  
  // JWT Secret (generar automáticamente con 64 bytes de aleatoriedad)
  JWT_SECRET: crypto.randomBytes(64).toString('base64'),
  
  // Ambiente
  NODE_ENV: 'production',
  
  // Logging
  LOG_LEVEL: 'info'
};

console.log('🔒 CONFIGURACIÓN DE RAILWAY - COPIA ESTO A RAILWAY DASHBOARD');
console.log('=' .repeat(70));
console.log('');
console.log('📋 VARIABLES DE ENTORNO A CONFIGURAR EN RAILWAY:');
console.log('');

Object.entries(config).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('');
console.log('=' .repeat(70));
console.log('');
console.log('📍 INSTRUCCIONES:');
console.log('1. Ve a: https://railway.app/dashboard');
console.log('2. Selecciona proyecto: campo-api-app-campo-saas');
console.log('3. Ve a Tab "Variables" ');
console.log('4. Copia cada variable arriba y pégala en Railway');
console.log('5. El backend se redeplegará automáticamente');
console.log('6. Espera 1-2 minutos');
console.log('7. Prueba login nuevamente con: npx expo start');
console.log('');
console.log('✅ Notas importantes:');
console.log('   - DATABASE_URL y REDIS_URL usan URLs INTERNAS (más rápidas)');
console.log('   - JWT_SECRET se regeneró automáticamente');
console.log('   - NODE_ENV está en "production"');
console.log('   - El backend se redeplegará solo al guardar');
console.log('');

// Crear archivo .env.railway para referencia local
const envContent = Object.entries(config)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync(path.join(__dirname, '.env.railway'), envContent);
console.log('✅ Guardado en: .env.railway (referencia local)');
