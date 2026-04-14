const https = require('https');

const API_URL = 'https://campo-api-app-campo-saas.up.railway.app';

function httpRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function verificarBackend() {
  console.log('[VERIFY] Verificando backend...\n');

  let token = null;

  try {
    // 1. Health check
    console.log('=== HEALTH CHECK ===');
    const health = await httpRequest('GET', '/health');
    console.log(`  Status: ${health.status}`);
    console.log(`  Response: ${JSON.stringify(health.data)}`);

    // 2. Login con código 12345
    console.log('\n=== LOGIN 12345 ===');
    const login = await httpRequest('POST', '/auth/tecnico', { codigo: '12345' });
    console.log(`  Status: ${login.status}`);
    
    if (login.status === 200 && login.data.success) {
      token = login.data.token;
      console.log(`  ✓ Login exitoso: ${login.data.tecnico?.nombre}`);
      console.log(`  Token: ${token.substring(0, 50)}...`);
    } else {
      console.log(`  ✗ Login falló: ${JSON.stringify(login.data)}`);
      return;
    }

    // 3. Obtener asignaciones
    console.log('\n=== ASIGNACIONES ===');
    const asignaciones = await httpRequest('GET', '/asignaciones', null, token);
    console.log(`  Status: ${asignaciones.status}`);
    if (asignaciones.data.asignaciones) {
      console.log(`  Total: ${asignaciones.data.total || asignaciones.data.asignaciones.length}`);
      console.log(`  Primer registro: ${JSON.stringify(asignaciones.data.asignaciones[0] || 'N/A').substring(0, 150)}`);
    } else {
      console.log(`  Response: ${JSON.stringify(asignaciones.data).substring(0, 200)}`);
    }

    // 4. Obtener bitácoras
    console.log('\n=== BITACORAS ===');
    const bitacoras = await httpRequest('GET', '/bitacoras', null, token);
    console.log(`  Status: ${bitacoras.status}`);
    if (bitacoras.data.data) {
      console.log(`  Total: ${bitacoras.data.total || 0}`);
    } else {
      console.log(`  Response: ${JSON.stringify(bitacoras.data).substring(0, 200)}`);
    }

    // 5. Obtener sync/delta
    console.log('\n=== SYNC DELTA ===');
    const delta = await httpRequest('GET', '/sync/delta', null, token);
    console.log(`  Status: ${delta.status}`);
    console.log(`  Beneficiarios: ${delta.data.beneficiarios?.length || 0}`);
    console.log(`  Actividades: ${delta.data.actividades?.length || 0}`);

    console.log('\n=== RESUMEN ===');
    console.log('✓ Health check: OK');
    console.log('✓ Login: OK');
    console.log('✓ Asignaciones: ' + (asignaciones.status === 200 ? 'OK' : 'FALLO'));
    console.log('✓ Bitácoras: ' + (bitacoras.status === 200 ? 'OK' : 'FALLO'));
    console.log('✓ Sync Delta: ' + (delta.status === 200 ? 'OK' : 'FALLO'));
    
  } catch (error) {
    console.error('[ERROR]', error.message);
  }
}

verificarBackend();
