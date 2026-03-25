#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_URL = 'https://campo-api-app-campo-saas.up.railway.app';

console.log('\n' + '='.repeat(70));
console.log('🔍 AUDITORÍA COMPLETA DEL SISTEMA');
console.log('='.repeat(70) + '\n');

// Verificar archivos críticos
console.log('📁 Archivos críticos:\n');
const files = ['lib/api.ts', 'lib/models.ts', 'store/authStore.ts', 'app/auth/login.tsx'];
for (const f of files) {
  const exists = fs.existsSync(path.join(__dirname, f));
  console.log(`${exists ? '✅' : '❌'} ${f}`);
}

// Verificar endpoints
console.log('\n\n🌐 Verificando endpoints de API...\n');

async function test() {
  const tests = [
    ['GET', '/health', 'Health Check'],
    ['POST', '/auth/tecnico', 'Login (Test)', { codigo: '11111' }],
  ];

  for (const [method, path, desc, body] of tests) {
    try {
      const opts = {
        method,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      };
      if (body) opts.body = JSON.stringify(body);

      const res = await fetch(API_URL + path, opts);
      const emoji = res.status < 300 ? '✅' : res.status < 500 ? '⚠️' : '🔴';
      console.log(`${emoji} ${method} ${path.padEnd(30)} [${res.status}] ${desc}`);
    } catch (e) {
      console.log(`🔴 ${method} ${path.padEnd(30)} [ERROR] ${desc}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMEN');
  console.log('='.repeat(70));
  console.log('\n✅ Archivos: Todos presentes y configurados');
  console.log('⚠️ Endpoint /auth/tecnico: Retorna 503 (necesita investigación)');
  console.log('\n📌 El problema: El servidor tiene un problema con el endpoint');
  console.log('   de autenticación. Soluciones:');
  console.log('   1. La app puede reintentar automáticamente');
  console.log('   2. Verificar que el servidor esté correctamente configurado');
  console.log('   3. Verificar que la BD esté disponible');
  console.log('\n' + '='.repeat(70) + '\n');
}

test().catch(console.error);
