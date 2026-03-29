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
    // Encontrar códigos con longitud > 5
    const problemas = await sql`
      SELECT nombre, codigo_acceso, LENGTH(TRIM(codigo_acceso)) as len
      FROM usuarios
      WHERE LENGTH(TRIM(codigo_acceso)) != 5
    `;
    
    console.log('Códigos con longitud != 5:\n');
    problemas.forEach(u => {
      console.log(`  ${u.nombre}: '${u.codigo_acceso}' (len=${u.len})`);
    });
    
    // Usar los últimos 5 dígitos
    console.log('\nFijando...\n');
    for (const u of problemas) {
      const codigoCorto = u.codigo_acceso.trim().slice(-5);
      await sql`
        UPDATE usuarios
        SET codigo_acceso = ${codigoCorto}
        WHERE nombre = ${u.nombre}
      `;
      console.log(`  ${u.nombre}: '${u.codigo_acceso}' → '${codigoCorto}'`);
    }
    
    await sql.end();
  } catch (e) {
    console.error('Error:', e.message);
    await sql.end();
  }
})();
