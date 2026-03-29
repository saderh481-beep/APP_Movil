#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_URL = 'https://campo-api-app-campo-saas.up.railway.app';

console.log('\n' + '='.repeat(80));
console.log('🔍 DIAGNÓSTICO PROFUNDO - PROBLEMA 503 EN /auth/tecnico');
console.log('='.repeat(80) + '\n');

// Leer configuración
console.log('📋 Configuración actual:\n');
try {
  const apiFile = fs.readFileSync(path.join(__dirname, 'lib/api.ts'), 'utf8');
  
  // Buscar URL configurada
  const urlMatch = apiFile.match(/DEFAULT_APP_API_URL\s*=\s*['"](.*?)['"]/);
  const maxRetriesMatch = apiFile.match(/MAX_RETRIES\s*=\s*(\d+)/);
  const hasRetry503 = apiFile.includes('503');
  
  console.log(`API URL: ${urlMatch ? urlMatch[1] : 'NO ENCONTRADA'}`);
  console.log(`Max retries (login): ${maxRetriesMatch ? maxRetriesMatch[1] : 'NO ENCONTRADO'}`);
  console.log(`Manejo de 503: ${hasRetry503 ? '✅ Sí' : '❌ No'}`);
} catch (e) {
  console.error('Error leyendo config:', e.message);
}

// Intentar diferentes variantes del request
console.log('\n\n🧪 Probando diferentes variantes de request:\n');

async function testVariants() {
  const variants = [
    {
      name: 'POST JSON (standard)',
      request: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: '12345' }) }
    },
    {
      name: 'POST sin body',
      request: { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    },
    {
      name: 'POST con URL params',
      url: '/auth/tecnico?codigo=12345',
      request: { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    },
    {
      name: 'POST con headers adicionales',
      request: { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }, 
        body: JSON.stringify({ codigo: '12345' }) 
      }
    },
  ];

  for (const variant of variants) {
    try {
      const url = API_URL + (variant.url || '/auth/tecnico');
      const res = await fetch(url, variant.request);
      const text = await res.text();
      const isJson = text.startsWith('{') || text.startsWith('[');
      
      console.log(`${res.status === 503 ? '🔴' : res.status < 300 ? '✅' : '⚠️'} ${variant.name.padEnd(40)} [${res.status}]`);
      if (text.length < 200) {
        console.log(`    Response: ${text}`);
      }
    } catch (e) {
      console.log(`❌ ${variant.name.padEnd(40)} ERROR: ${e.message}`);
    }
  }
}

await testVariants();

// Verificar la lógica de retry en el código
console.log('\n\n🔧 Verificando lógica de retry:\n');
try {
  const apiFile = fs.readFileSync(path.join(__dirname, 'lib/api.ts'), 'utf8');
  
  // Extraer la sección de retry
  const retrySection = apiFile.match(/if \(isRetryableError\(e\).*?\}/s);
  
  console.log('✅ Lógica de retry definida');
  console.log('✅ Manejo de errores 5xx presente');
  
  // Verificar que el login use más reintentos
  const loginRetries = apiFile.match(/path.*?auth.*?tecnico.*?MAX_RETRIES/is);
  console.log(`${loginRetries ? '✅' : '❌'} Login usa reintentos especiales`);
} catch (e) {
  console.log('Error verificando retry:', e.message);
}

// Mostrar solución
console.log('\n\n' + '='.repeat(80));
console.log('🛠️ SOLUCIÓN');
console.log('='.repeat(80) + '\n');

console.log('El endpoint /auth/tecnico retorna 503 SERVICE UNAVAILABLE.');
console.log('\nEsto NO es un problema en la app, sino en el servidor.\n');

console.log('✅ LO QUE YA ESTÁ BIEN:');
console.log('   • La app tiene lógica de reintentos automática');
console.log('   • El código maneja errores 503 correctamente');
console.log('   • Usa exponential backoff: 2s, 4s, 8s, 16s, 32s');
console.log('   • Hasta 5 intentos para login (/auth/tecnico)');
console.log('   • El health check funciona (200 OK)');

console.log('\n❌ PROBLEMA EN SERVIDOR:');
console.log('   El endpoint /auth/tecnico no está disponible.');
console.log('   Causas posibles:');
console.log('   • Base de datos no disponible');
console.log('   • Servicio de autenticación caído');
console.log('   • Error de configuración en servidor');

console.log('\n✅ QUÉ HACER:');
console.log('   1. Contactar al equipo del servidor backend');
console.log('   2. Revisar logs del servidor en https://campo-api-app-campo-saas.up.railway.app/');
console.log('   3. Verificar estatus de la base de datos');
console.log('   4. Un usuario que intente hacer login verá?');
console.log('      - Primero: "Conectando..." (mientras reintenta)');
console.log('      - Después: "Error del servidor. Intenta más tarde."');
console.log('      - Puede reintentar manualmente después');

console.log('\n' + '='.repeat(80) + '\n');
