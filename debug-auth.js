#!/usr/bin/env node

const https = require('https');

async function testWithDetails() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'campo-api-app-campo-saas.up.railway.app',
      path: '/auth/tecnico',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      let headers = res.headers;
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('\n🔍 RESPUESTA DETALLADA DEL SERVIDOR:\n');
        console.log('Status Code:', res.statusCode);
        console.log('Headers:', JSON.stringify(headers, null, 2));
        console.log('Body:', data);
        
        try {
          const json = JSON.parse(data);
          console.log('\n📋 Error Details:', JSON.stringify(json, null, 2));
        } catch (e) {
          console.log('(No es JSON)');
        }
        
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('Error de conexión:', e.message);
      resolve();
    });

    req.write(JSON.stringify({ codigo: '12345' }));
    req.end();
  });
}

console.log('📡 Enviando POST /auth/tecnico con detalles...\n');
testWithDetails();
