#!/usr/bin/env node

const postgres = require('postgres');

const sql = postgres({
  host: 'caboose.proxy.rlwy.net',
  port: 21223,
  username: 'postgres',
  password: 'knoayZQlVchOwjbIsrndCGBPpSqzvDzY',
  database: 'railway',
  ssl: 'require'
});

(async () => {
  try {
    const usuarios = await sql`
      SELECT id, codigo_acceso, nombre 
      FROM usuarios 
      WHERE activo = true 
      ORDER BY nombre 
      LIMIT 10
    `;
    
    console.log('CÓDIGOS ACTUALES EN BD:\n');
    usuarios.forEach(u => {
      console.log(`  ${u.nombre}: '${u.codigo_acceso}' (length: ${u.codigo_acceso.length})`);
    });
    
    await sql.end();
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
