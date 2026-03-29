#!/usr/bin/env node

const https = require('https');

const endpoints = [
  { method: 'GET', path: '/health', name: 'Health Check' },
  { method: 'POST', path: '/auth/tecnico', name: 'Login Endpoint', body: { codigo: '12345' } }
];

async function testEndpoint(method, path, body) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'campo-api-app-campo-saas.up.railway.app',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          success: res.statusCode < 400
        });
      });
    });

    req.on('error', (e) => {
      resolve({ status: 0, error: e.message, success: false });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function validate() {
  console.log('🔍 Validando backend después de corregir REDIS_URL...\n');
  
  for (const endpoint of endpoints) {
    process.stdout.write(`⏳ ${endpoint.name}... `);
    const result = await testEndpoint(endpoint.method, endpoint.path, endpoint.body);
    
    if (result.success) {
      console.log(`✅ ${result.status}`);
    } else {
      console.log(`❌ ${result.status || 'ERROR'}`);
      console.log(`   ${result.error || result.data}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Si ambos endpoints tienen ✅, el backend está listo.\n');
  console.log('Ahora ejecuta: npx expo start\n');
}

validate();
