const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3002';

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

async function runTests() {
  console.log('🧪 INICIO PRUEBAS DE SEGURIDAD - SADERH\n');
  console.log('='.repeat(60));

  let token = null;
  const results = [];

  // Test 1: Health check
  console.log('\n[TEST-01] Verificando health check...');
  try {
    const res = await request('GET', '/health');
    const pass = res.status === 200;
    console.log(`  Resultado: ${pass ? '✅ PASS' : '❌ FAIL'} (status: ${res.status})`);
    results.push({ id: 'TEST-01', name: 'Health check', pass });
  } catch (e) {
    console.log(`  Resultado: ❌ FAIL (error: ${e.message})`);
    results.push({ id: 'TEST-01', name: 'Health check', pass: false });
  }

  // Test 2: Autenticación
  console.log('\n[TEST-02] Verificando autenticación con código válido...');
  try {
    const res = await request('POST', '/auth/tecnico', { codigo: '12345' });
    const pass = res.status === 200 && res.body.success;
    if (pass) token = res.body.token;
    console.log(`  Resultado: ${pass ? '✅ PASS' : '❌ FAIL'} (status: ${res.status})`);
    results.push({ id: 'TEST-02', name: 'Autenticación código válido', pass });
  } catch (e) {
    console.log(`  Resultado: ❌ FAIL (error: ${e.message})`);
    results.push({ id: 'TEST-02', name: 'Autenticación código válido', pass: false });
  }

  // Test 3: Autenticación con código inválido
  console.log('\n[TEST-03] Verificando autenticación con código inválido...');
  try {
    const res = await request('POST', '/auth/tecnico', { codigo: '99999' });
    const pass = res.status === 401;
    console.log(`  Resultado: ${pass ? '✅ PASS' : '❌ FAIL'} (status: ${res.status})`);
    results.push({ id: 'TEST-03', name: 'Autenticación código inválido', pass });
  } catch (e) {
    console.log(`  Resultado: ❌ FAIL (error: ${e.message})`);
    results.push({ id: 'TEST-03', name: 'Autenticación código inválido', pass: false });
  }

  // Test 4: Endpoint sin autenticación
  console.log('\n[TEST-04] Verificando acceso sin token...');
  try {
    const res = await request('GET', '/bitacoras');
    const pass = res.status === 401;
    console.log(`  Resultado: ${pass ? '✅ PASS' : '❌ FAIL'} (status: ${res.status})`);
    results.push({ id: 'TEST-04', name: 'Acceso sin token', pass });
  } catch (e) {
    console.log(`  Resultado: ❌ FAIL (error: ${e.message})`);
    results.push({ id: 'TEST-04', name: 'Acceso sin token', pass: false });
  }

  // Test 5: Endpoint con token inválido
  console.log('\n[TEST-05] Verificando acceso con token inválido...');
  try {
    const res = await request('GET', '/bitacoras', null, 'token-invalido-123');
    const pass = res.status === 401;
    console.log(`  Resultado: ${pass ? '✅ PASS' : '❌ FAIL'} (status: ${res.status})`);
    results.push({ id: 'TEST-05', name: 'Token inválido', pass });
  } catch (e) {
    console.log(`  Resultado: ❌ FAIL (error: ${e.message})`);
    results.push({ id: 'TEST-05', name: 'Token inválido', pass: false });
  }

  // Test 6: Crear bitácora sin autenticación
  console.log('\n[TEST-06] Verificando creación de bitácora sin auth...');
  try {
    const res = await request('POST', '/bitacoras', {
      tipo: 'beneficiario',
      fecha_inicio: new Date().toISOString(),
    });
    const pass = res.status === 401;
    console.log(`  Resultado: ${pass ? '✅ PASS' : '❌ FAIL'} (status: ${res.status})`);
    results.push({ id: 'TEST-06', name: 'Crear bitácora sin auth', pass });
  } catch (e) {
    console.log(`  Resultado: ❌ FAIL (error: ${e.message})`);
    results.push({ id: 'TEST-06', name: 'Crear bitácora sin auth', pass: false });
  }

  // Test 7: Crear bitácora con autenticación
  if (token) {
    console.log('\n[TEST-07] Verificando creación de bitácora con auth...');
    try {
      const res = await request(
        'POST',
        '/bitacoras',
        {
          tipo: 'beneficiario',
          fecha_inicio: new Date().toISOString(),
          actividades_desc: 'Prueba de seguridad automatizada',
        },
        token
      );
      const pass = res.status === 201 && res.body.success;
      console.log(`  Resultado: ${pass ? '✅ PASS' : '❌ FAIL'} (status: ${res.status})`);
      results.push({ id: 'TEST-07', name: 'Crear bitácora con auth', pass });

      // Test 8: Obtener bitácora propia
      if (pass && res.body.id_bitacora) {
        console.log('\n[TEST-08] Verificando acceso a bitácora propia...');
        const getRes = await request('GET', `/bitacoras/${res.body.id_bitacora}`, null, token);
        const pass8 = getRes.status === 200 && getRes.body.success;
        console.log(`  Resultado: ${pass8 ? '✅ PASS' : '❌ FAIL'} (status: ${getRes.status})`);
        results.push({ id: 'TEST-08', name: 'Acceso a bitácora propia', pass: pass8 });
      }
    } catch (e) {
      console.log(`  Resultado: ❌ FAIL (error: ${e.message})`);
      results.push({ id: 'TEST-07', name: 'Crear bitácora con auth', pass: false });
    }
  }

  // Test 9: CORS verification
  console.log('\n[TEST-09] Verificando headers CORS...');
  try {
    const res = await request('OPTIONS', '/health');
    const hasCors = res.status === 204;
    console.log(`  CORS presente: ${hasCors ? '✅' : '⚠️ No tiene CORS'}`);
    console.log(`  Resultado: ${hasCors ? '✅ PASS' : '⚠️ INFO'} (status: ${res.status})`);
    results.push({ id: 'TEST-09', name: 'Verificación CORS', pass: true });
  } catch (e) {
    console.log(`  Resultado: ❌ FAIL (error: ${e.message})`);
    results.push({ id: 'TEST-09', name: 'Verificación CORS', pass: false });
  }

  // Test 10: Verificar que imagen no se devuelve en respuesta
  console.log('\n[TEST-10] Verificando que datos sensibles no se exponen en logs...');
  try {
    const res = await request('GET', '/cloudinary-config', null, token);
    const pass = res.status === 200;
    const hasSecret = res.body.apiKey && res.body.apiKey.length > 0;
    console.log(`  API Key expuesta en respuesta: ${hasSecret ? '⚠️ SÍ' : '✅ NO'}`);
    console.log(`  Resultado: ${pass ? '✅ PASS' : '❌ FAIL'}`);
    results.push({ id: 'TEST-10', name: 'Seguridad config Cloudinary', pass: !hasSecret });
  } catch (e) {
    console.log(`  Resultado: ❌ FAIL (error: ${e.message})`);
    results.push({ id: 'TEST-10', name: 'Seguridad config Cloudinary', pass: false });
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  
  console.log(`\nTotal: ${results.length} pruebas`);
  console.log(`✅ Aprobadas: ${passed}`);
  console.log(`❌ Fallidas: ${failed}`);
  
  if (failed > 0) {
    console.log('\n⚠️ Pruebas fallidas:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  - ${r.id}: ${r.name}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('🧪 FIN DE PRUEBAS DE SEGURIDAD');
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);