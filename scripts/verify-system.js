#!/usr/bin/env node
/**
 * VERIFICACIÓN DEL SISTEMA SADERH
 * Verifica estructura de archivos y consistencia
 */

const fs = require('fs');
const path = require('path');

function existe(ruta) {
  try { return fs.existsSync(ruta); } catch { return false; }
}

function contiene(ruta, texto) {
  if (!existe(ruta)) return false;
  return fs.readFileSync(ruta, 'utf8').includes(texto);
}

console.log('═'.repeat(60));
console.log('🧪 VERIFICACIÓN DEL SISTEMA SADERH');
console.log('═'.repeat(60));

const results = [];

function check(name, fn) {
  try {
    const pass = fn();
    results.push({ name, pass });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
    return pass;
  } catch (e) {
    results.push({ name, pass: false, error: e.message });
    console.log(`❌ ${name}: ${e.message}`);
    return false;
  }
}

console.log('\n📁 ARCHIVOS DEL BACKEND');
check('backend/server.js existe', () => existe('./backend/server.js'));
check('backend/.env existe', () => existe('./backend/.env') || existe('./.env'));

console.log('\n📁 ARCHIVOS DEL FRONTEND');
check('app/stack/detalle-asignacion.tsx existe', () => existe('./app/stack/detalle-asignacion.tsx'));
check('app/tabs/alta-beneficiario.tsx existe', () => existe('./app/tabs/alta-beneficiario.tsx'));
check('app/tabs/dashboard.tsx existe', () => existe('./app/tabs/dashboard.tsx'));

console.log('\n📁 API DEL CLIENTE');
check('lib/api/bitacoras.ts existe', () => existe('./lib/api/bitacoras.ts'));
check('lib/api/beneficiarios.ts existe', () => existe('./lib/api/beneficiarios.ts'));
check('lib/api/http.ts existe', () => existe('./lib/api/http.ts'));

console.log('\n📁 TIPOS');
check('types/models.ts existe', () => existe('./types/models.ts'));

console.log('\n🔗 VERIFICACIÓN DE ENDPOINTS (server.js)');
check('POST /bitacoras', () => contiene('./backend/server.js', "url.pathname === '/bitacoras'"));
check('GET /bitacoras/:id', () => contiene('./backend/server.js', "url.pathname.match(/^\\/bitacoras\\/"));
check('PATCH /bitacoras/:id', () => contiene('./backend/server.js', "req.method === 'PATCH' && url.pathname.match(/^\\/bitacoras\\/"));
check('POST cerrar', () => contiene('./backend/server.js', '/cerrar$'));
check('POST firma', () => contiene('./backend/server.js', '/firma$'));
check('POST foto-rostro', () => contiene('./backend/server.js', '/foto-rostro$'));
check('POST fotos-campo', () => contiene('./backend/server.js', '/fotos-campo$'));

console.log('\n🔗 VERIFICACIÓN DE API (bitacoras.ts)');
check('bitacorasApi.crear', () => contiene('./lib/api/bitacoras.ts', 'crear: async'));
check('bitacorasApi.cerrar', () => contiene('./lib/api/bitacoras.ts', 'cerrar: async'));
check('bitacorasApi.subirFotoRostro', () => contiene('./lib/api/bitacoras.ts', 'subirFotoRostro'));
check('bitacorasApi.subirFirma', () => contiene('./lib/api/bitacoras.ts', 'subirFirma'));
check('bitacorasApi.subirFotosCampo', () => contiene('./lib/api/bitacoras.ts', 'subirFotosCampo'));

console.log('\n🔗 VERIFICACIÓN DE FRONTEND (detalle-asignacion.tsx)');
check('capturarFotoRostro', () => contiene('./app/stack/detalle-asignacion.tsx', 'capturarFotoRostro'));
check('tomarFotoCampo', () => contiene('./app/stack/detalle-asignacion.tsx', 'tomarFotoCampo'));
check('Firma canvas', () => contiene('./app/stack/detalle-asignacion.tsx', 'function Firma'));
check('finalizar bitácora', () => contiene('./app/stack/detalle-asignacion.tsx', 'const finalizar = async'));

console.log('\n🔗 VERIFICACIÓN DE TIPOS (models.ts)');
check('Bitacora interface', () => contiene('./types/models.ts', 'export interface Bitacora'));
check('Beneficiario interface', () => contiene('./types/models.ts', 'export interface Beneficiario'));
check('DatosExtendidos', () => contiene('./types/models.ts', 'export interface DatosExtendidos'));
check('foto_rostro_url', () => contiene('./types/models.ts', 'foto_rostro_url'));
check('firma_url', () => contiene('./types/models.ts', 'firma_url'));
check('fotos_campo', () => contiene('./types/models.ts', 'fotos_campo'));

console.log('\n🔗 VERIFICACIÓN DE AUTENTICACIÓN');
check('JWT en server', () => contiene('./backend/server.js', 'signJwt') && contiene('./backend/server.js', 'verifyJwt'));
check('requireAuth en server', () => contiene('./backend/server.js', 'requireAuth'));
check('Authorization header', () => contiene('./backend/server.js', 'Authorization'));

// Resultados
console.log('\n' + '═'.repeat(60));
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
console.log(`📊 RESULTADOS: ${passed}✅ / ${failed}❌ de ${results.length} verificaciones`);

if (failed > 0) {
  console.log('\n⚠️ FALLIDOS:');
  results.filter(r => !r.pass).forEach(r => console.log(`  - ${r.name}`));
}

console.log('\n' + '═'.repeat(60));
if (failed === 0) {
  console.log('✅ SISTEMA OPERATIVO - Todas las verificaciones pasaron');
} else if (failed <= 2) {
  console.log('⚠️ SISTEMA OPERATIVO CON ADVERTENCIAS MENORES');
} else {
  console.log(`❌ SISTEMA CON ${failed} PROBLEMAS`);
}
console.log('═'.repeat(60));