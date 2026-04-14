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
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function verificarBeneficiarios() {
  console.log('[VERIFY] Verificando beneficiarios...\n');

  try {
    const login = await httpRequest('POST', '/auth/tecnico', { codigo: '12345' });
    const token = login.data.token;

    console.log('=== ASIGNACIONES (con detalles de beneficiario) ===');
    const asignaciones = await httpRequest('GET', '/asignaciones', null, token);
    
    if (asignaciones.data.asignaciones) {
      asignaciones.data.asignaciones.forEach((a, i) => {
        console.log(`\n--- Asignación ${i+1} ---`);
        console.log('  id:', a.id);
        console.log('  nombre:', a.nombre);
        if (a.beneficiario) {
          console.log('  BENEFICIARIO:');
          console.log('    curp:', a.beneficiario.curp);
          console.log('    folio_saderh:', a.beneficiario.folio_saderh);
          console.log('    direccion:', a.beneficiario.direccion);
          console.log('    cp:', a.beneficiario.cp);
          console.log('    coord_parcela:', a.beneficiario.coord_parcela);
        }
      });
    }

    console.log('\n=== SYNC DELTA (beneficiarios) ===');
    const delta = await httpRequest('GET', '/sync/delta', null, token);
    
    if (delta.data.beneficiarios) {
      delta.data.beneficiarios.forEach((b, i) => {
        console.log(`\n--- Beneficiario ${i+1} ---`);
        console.log('  id:', b.id);
        console.log('  nombre:', b.nombre);
        console.log('  curp:', b.curp);
        console.log('  folio_saderh:', b.folio_saderh);
        console.log('  direccion:', b.direccion);
        console.log('  cp:', b.cp);
        console.log('  coord_parcela:', b.coord_parcela);
      });
    }

    console.log('\n=== RESUMEN ===');
    console.log('✓ Datos de beneficiarios verificados');

  } catch (error) {
    console.error('[ERROR]', error.message);
  }
}

verificarBeneficiarios();
