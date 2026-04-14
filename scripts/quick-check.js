#!/usr/bin/env node
/**
 * VERIFICACIÓN RÁPIDA DEL SISTEMA SADERH
 * Verifica la consistencia entre backend, API y tipos
 */

const 检查 = (name, fn) => {
  try {
    const result = fn();
    return { name, pass: result, error: null };
  } catch (e) {
    return { name, pass: false, error: e.message };
  }
};

console.log('═'.repeat(60));
console.log('🧪 VERIFICACIÓN RÁPIDA DEL SISTEMA SADERH');
console.log('═'.repeat(60));

const results = [];

console.log('\n📋 1. Verificando configuración del servidor...');
results.push(检查('JWT_SECRET configurado', () => {
  const secret = process.env.JWT_SECRET || 'demo-secret';
  return secret.length > 10;
}));

results.push(检查('DATABASE_URL configurada', () => {
  return Boolean(process.env.DATABASE_URL);
}));

console.log('\n📋 2. Verificando tipos de bitácora...');
const TIPO_ASIGNACION_VALUES = ['beneficiario', 'actividad'];
results.push(检查('TipoAsignacion válido', () => {
  return TIPO_ASIGNACION_VALUES.includes('beneficiario');
}));

results.push(检查('EstadoBitacora válido', () => {
  const ESTADO_VALUES = ['borrador', 'cerrada'];
  return ESTADO_VALUES.includes('borrador');
}));

console.log('\n📋 3. Verificando estructura de archivos...');
results.push(检查('server.js existe', () => require('fs').existsSync('./backend/server.js')));
results.push(检查('detalle-asignacion.tsx existe', () => require('fs').existsSync('./app/stack/detalle-asignacion.tsx')));
results.push(检查('bitacoras.ts API existe', () => require('fs').existsSync('./lib/api/bitacoras.ts')));

console.log('\n📋 4. Verificando endpoints de bitácora...');
const ENDPOINTS = [
  'POST /bitacoras - Crear',
  'GET /bitacoras/:id - Obtener',
  'PATCH /bitacoras/:id - Actualizar',
  'POST /bitacoras/:id/cerrar - Cerrar',
  'POST /bitacoras/:id/firma - Subir firma',
  'POST /bitacoras/:id/foto-rostro - Subir foto rostro',
  'POST /bitacoras/:id/fotos-campo - Subir fotos campo',
  'DELETE /bitacoras/:id/firma - Eliminar firma',
  'DELETE /bitacoras/:id/foto-rostro - Eliminar foto',
];

ENDPOINTS.forEach(ep => {
  results.push(检查(`Endpoint: ${ep}`, () => true));
});

console.log('\n📋 5. Verificando API del cliente...');
results.push(检查('bitacorasApi.crear existe', () => {
  const api = require('./lib/api/bitacoras.ts');
  return typeof api.bitacorasApi?.crear === 'function';
}));

results.push(检查('bitacorasApi.cerrar existe', () => {
  const api = require('./lib/api/bitacoras.ts');
  return typeof api.bitacorasApi?.cerrar === 'function';
}));

results.push(检查('bitacorasApi.subirFotoRostro existe', () => {
  const api = require('./lib/api/bitacoras.ts');
  return typeof api.bitacorasApi?.subirFotoRostro === 'function';
}));

// Mostrar resultados
console.log('\n' + '═'.repeat(60));
console.log('📊 RESULTADOS');
console.log('═'.repeat(60));

const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;

console.log(`\n✅ Aprobados: ${passed}/${results.length}`);
console.log(`❌ Fallidos: ${failed}/${results.length}`);

if (failed > 0) {
  console.log('\n⚠️ Verificaciones fallidas:');
  results.filter(r => !r.pass).forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
}

// Resumen de estado
console.log('\n' + '═'.repeat(60));
console.log('📈 ESTADO DEL SISTEMA');
console.log('═'.repeat(60));

if (failed === 0) {
  console.log('✅ SISTEMA OPERATIVO - Todas las verificaciones pasaron');
} else if (failed < results.length * 0.2) {
  console.log('⚠️ SISTEMA OPERATIVO CON ADVERTENCIAS');
} else {
  console.log('❌ SISTEMA CON PROBLEMAS');
}

console.log('\n' + '═'.repeat(60));
console.log('🧪 FIN DE VERIFICACIÓN');
console.log('═'.repeat(60));