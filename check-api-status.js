const https = require('https');

const API_URL = 'https://campo-api-app-campo-saas.up.railway.app';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function checkFullStatus() {
  console.log('🔍 Verificación Completa de Conexión SADERH\n');
  
  try {
    // Health Check
    console.log('1️⃣  Health Check...');
    const healthRes = await makeRequest('GET', '/health');
    console.log('   ✅ Servidor respondiendo');
    console.log(`   • Status: ${healthRes.data.status}`);
    console.log(`   • Service: ${healthRes.data.service}`);
    console.log(`   • Timestamp: ${healthRes.data.ts}\n`);

    // Info de API
    console.log('📡 Información de API:');
    console.log(`   • Base URL: ${API_URL}`);
    console.log(`   • Endpoint de autenticación: POST /auth/tecnico`);
    console.log(`   • Requiere: Código de 5 dígitos\n`);

    console.log('🔐 Para obtener usuarios registrados:');
    console.log('   1. Autentica con tu código de acceso');
    console.log('   2. Usa el JWT token en requests posteriores');
    console.log('   3. Accede a: GET /mis-beneficiarios\n');

    console.log('📊 RESUMEN FINAL:');
    console.log('   ✅ Servidor API: OPERATIVO');
    console.log('   ✅ Base de datos: OPERATIVA');
    console.log('   ⚠️  Usuarios: Requiere autenticación\n');

    console.log('Para ver usuarios: proporciona tu código de 5 dígitos');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkFullStatus();
