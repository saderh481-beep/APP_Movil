#!/usr/bin/env node

const https = require('https');

async function testLogin(codigo) {
  return new Promise((resolve) => {
    const datos = JSON.stringify({ codigo: codigo });
    
    const options = {
      hostname: 'campo-api-app-campo-saas.up.railway.app',
      path: '/auth/tecnico',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': datos.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', (e) => {
      resolve({ status: 0, error: e.message });
    });

    req.write(datos);
    req.end();
  });
}

async function runTests() {
  const codigos = ['56736', '18430', '61787'];
  
  console.log('🧪 PRUEBA DE LOGIN CON CÓDIGOS CORREGIDOS\n');
  console.log('=' .repeat(60));
  
  for (const codigo of codigos) {
    console.log(`\n📱 Intentando login con código: ${codigo}`);
    console.log('-'.repeat(60));
    
    const result = await testLogin(codigo);
    
    console.log(`Status: ${result.status}`);
    console.log(`Response: ${result.body}`);
    
    if (result.status === 200) {
      try {
        const json = JSON.parse(result.body);
        console.log(`✅ TOKEN RECIBIDO: ${json.token ? '✅ SÍ' : '❌ NO'}`);
      } catch (e) {}
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Si ves status 200 con token, el login funciona!');
}

runTests();
