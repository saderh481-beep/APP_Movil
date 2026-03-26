#!/usr/bin/env node

/**
 * VALIDACIÓN FINAL: Test individual de los 12 técnicos que dieron 429
 */

const postgres = require('postgres');

const sql = postgres({
  host: 'caboose.proxy.rlwy.net',
  port: 21223,
  username: 'postgres',
  password: 'knoayZQlVchOwjbIsrndCGBPpSqzvDzY',
  database: 'railway',
  ssl: 'require'
});

async function httpRequest(method, endpoint, data = null) {
  const url = new URL('https://campo-api-app-campo-saas.up.railway.app' + endpoint);
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  const result = await response.json();
  
  return {
    status: response.status,
    data: result
  };
}

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔐 VALIDACIÓN FINAL: TEST DE 12 TÉCNICOS CON 429');
    console.log('='.repeat(80) + '\n');
    
    // Obtener los 12 técnicos que dieron 429
    const tecnicos12 = await sql`
      SELECT id, codigo_acceso, nombre
      FROM usuarios
      WHERE activo = true
      AND nombre IN (
        'Tecnico 1',
        'Tecnico 2',
        'Tecnico 3',
        'Técnico Test 2026-03-25',
        'Técnico Test 2026-03-26'
      )
      ORDER BY nombre
      LIMIT 12
    `;
    
    console.log(`Probando ${tecnicos12.length} técnicos después de esperar...\n`);
    
    let exitosos = 0;
    const resultados = [];
    
    for (const tecnico of tecnicos12) {
      const nombre = tecnico.nombre.substring(0, 25).padEnd(25);
      const codigo = tecnico.codigo_acceso;
      
      try {
        const res = await httpRequest('POST', '/auth/tecnico', {
          codigo: codigo
        });
        
        if (res.status === 200) {
          console.log(`✅ ${nombre} → ${codigo}: 200 OK`);
          exitosos++;
          resultados.push({ nombre: tecnico.nombre, status: 200 });
        } else {
          console.log(`❌ ${nombre} → ${codigo}: ${res.status}`);
          resultados.push({ nombre: tecnico.nombre, status: res.status });
        }
      } catch (e) {
        console.log(`❌ ${nombre} → ${codigo}: ERROR ${e.message}`);
        resultados.push({ nombre: tecnico.nombre, status: 'ERROR' });
      }
      
      // Esperar 500ms entre requests
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`RESULTADO: ${exitosos}/${tecnicos12.length} exitosos`);
    console.log('='.repeat(80) + '\n');
    
    await sql.end();
    
  } catch (e) {
    console.error('Error:', e.message);
    await sql.end();
  }
})();
