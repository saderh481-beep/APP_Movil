/**
 * Pruebas de validación de seguridad - SADERH
 * 
 * Este script prueba la validación de archivos e imágenes en el backend.
 * Para ejecutar: node scripts/test-file-validation.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3002';

// Generador de imágenes de prueba
function createTestImage(sizeKB) {
  const header = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
  ]);
  
  const dataSize = sizeKB * 1024 - 100;
  const data = Buffer.alloc(dataSize, 0x00);
  const end = Buffer.from([
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82, // CRC
  ]);
  
  return Buffer.concat([header, data, end]);
}

function createTestBitacora(token) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      tipo: 'beneficiario',
      fecha_inicio: new Date().toISOString(),
      actividades_desc: 'Prueba de validación de archivos',
    });

    const options = {
      hostname: new URL(BASE_URL).hostname,
      port: new URL(BASE_URL).port || 3002,
      path: '/bitacoras',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        Authorization: `Bearer ${token}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.id_bitacora || json.id);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data || '{}') });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getToken() {
  const res = await request('POST', '/auth/tecnico', { codigo: '12345' });
  return res.body.token;
}

async function testFileUpload(bitacoraId, token, fileSizeKB, fileType = 'image/jpeg') {
  console.log(`\n  📤 Probando archivo de ${fileSizeKB}KB...`);
  
  const imageData = createTestImage(fileSizeKB);
  
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    const postData = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="foto"; filename="test.jpg"\r\n`),
      Buffer.from(`Content-Type: ${fileType}\r\n\r\n`),
      imageData,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const options = {
      hostname: new URL(BASE_URL).hostname,
      port: new URL(BASE_URL).port || 3002,
      path: `/bitacoras/${bitacoraId}/foto-rostro`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(postData),
        Authorization: `Bearer ${token}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ 
            status: res.statusCode, 
            body: JSON.parse(data || '{}'),
            sizeSent: Buffer.byteLength(postData),
          });
        } catch {
          resolve({ 
            status: res.statusCode, 
            body: data,
            sizeSent: Buffer.byteLength(postData),
          });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 PRUEBAS DE VALIDACIÓN DE ARCHIVOS - SADERH');
  console.log('='.repeat(60));
  
  let token;
  try {
    token = await getToken();
    console.log('✅ Token de autenticación obtenido');
  } catch (e) {
    console.log('❌ No se pudo obtener token:', e.message);
    process.exit(1);
  }

  // Crear bitácora de prueba
  console.log('\n📝 Creando bitácora de prueba...');
  const bitacoraId = await createTestBitacora(token);
  if (!bitacoraId) {
    console.log('❌ No se pudo crear bitácora de prueba');
    process.exit(1);
  }
  console.log(`✅ Bitácora creada: ${bitacoraId}`);

  const results = [];

  // Test 1: Archivo pequeño (100KB)
  console.log('\n[FILE-01] Archivo pequeño (100KB)');
  try {
    const res = await testFileUpload(bitacoraId, token, 100);
    const pass = res.status === 200;
    console.log(`  Resultado: ${pass ? '✅ PASS' : '⚠️ STATUS: ' + res.status}`);
    results.push({ id: 'FILE-01', name: 'Archivo 100KB', pass, status: res.status });
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    results.push({ id: 'FILE-01', name: 'Archivo 100KB', pass: false, error: e.message });
  }

  // Test 2: Archivo grande (5MB)
  console.log('\n[FILE-02] Archivo grande (5MB)');
  try {
    const res = await testFileUpload(bitacoraId, token, 5000);
    const pass = res.status === 200 || res.status === 413;
    const hasLimit = res.status === 413;
    console.log(`  Resultado: ${pass ? '✅ PASS' : '⚠️ STATUS: ' + res.status}`);
    console.log(`  Límite implementado: ${hasLimit ? '✅ SÍ' : '⚠️ NO - No hay validación de tamaño'}`);
    results.push({ id: 'FILE-02', name: 'Archivo 5MB', pass, status: res.status, hasLimit });
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    results.push({ id: 'FILE-02', name: 'Archivo 5MB', pass: false, error: e.message });
  }

  // Test 3: Archivo muy grande (10MB)
  console.log('\n[FILE-03] Archivo muy grande (10MB)');
  try {
    const res = await testFileUpload(bitacoraId, token, 10000);
    const hasLimit = res.status === 413;
    console.log(`  Estado: ${res.status}`);
    console.log(`  Límite implementado: ${hasLimit ? '✅ SÍ' : '⚠️ NO - Riesgo de DoS'}`);
    results.push({ id: 'FILE-03', name: 'Archivo 10MB', pass: hasLimit, status: res.status, hasLimit });
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    results.push({ id: 'FILE-03', name: 'Archivo 10MB', pass: false, error: e.message });
  }

  // Test 4: Tipo de archivo no válido
  console.log('\n[FILE-04] Tipo de archivo no válido (text/plain)');
  try {
    const res = await testFileUpload(bitacoraId, token, 100, 'text/plain');
    const validates = res.status !== 200;
    console.log(`  Estado: ${res.status}`);
    console.log(`  Validación MIME: ${validates ? '✅ IMPLEMENTADA' : '⚠️ NO IMPLEMENTADA'}`);
    results.push({ id: 'FILE-04', name: 'Tipo no válido', pass: validates, status: res.status });
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    results.push({ id: 'FILE-04', name: 'Tipo no válido', pass: false, error: e.message });
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN - VALIDACIÓN DE ARCHIVOS');
  console.log('='.repeat(60));
  
  const withLimit = results.filter(r => r.hasLimit === true).length;
  const withoutLimit = results.filter(r => r.hasLimit === false).length;
  
  console.log(`\nTotal pruebas: ${results.length}`);
  console.log(`Con límites implementados: ${withLimit}`);
  console.log(`Sin límites (RIESGO): ${withoutLimit}`);
  
  if (withoutLimit > 0) {
    console.log('\n⚠️ HALLAZGOS DE SEGURIDAD:');
    console.log('  - No se valida el tamaño máximo de archivos');
    console.log('  - No se valida el tipo MIME de los archivos');
    console.log('  - Riesgo potencial de DoS por archivos muy grandes');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🧪 FIN DE PRUEBAS DE VALIDACIÓN');
  console.log('='.repeat(60));
}

runTests().catch(console.error);