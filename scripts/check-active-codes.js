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

async function checkCodes() {
  try {
    console.log('🔍 Verificando códigos activos en la base de datos...\n');
    
    const usuarios = await sql`
      SELECT 
        id,
        codigo_acceso,
        nombre,
        activo,
        fecha_limite,
        CASE 
          WHEN fecha_limite IS NULL THEN 'Sin límite'
          WHEN fecha_limite > NOW()::date THEN 'VÁLIDO ✅'
          ELSE 'VENCIDO ❌'
        END as estado_periodo
      FROM usuarios
      WHERE activo = true
      ORDER BY fecha_limite DESC
      LIMIT 10
    `;
    
    if (usuarios.length === 0) {
      console.log('⚠️  No hay usuarios activos en la base de datos.\n');
      console.log('Para hacer login, necesitas:');
      console.log('1. Insertar al menos un usuario con código_acceso válido');
      console.log('2. Asegurarse de que fecha_limite sea mayor a la fecha actual');
      console.log('3. El campo activo debe ser TRUE\n');
      
      console.log('Ejemplo de INSERT:');
      console.log(`
SQL:
INSERT INTO usuarios (codigo_acceso, nombre, correo, activo, fecha_limite, estado_corte)
VALUES ('12345', 'Test User', 'test@example.com', true, '2026-12-31', 'activo');
      `);
    } else {
      console.log('✅ Usuarios activos encontrados:\n');
      console.log('CÓDIGO\t| NOMBRE\t\t| ESTADO');
      console.log('-'.repeat(50));
      
      usuarios.forEach(u => {
        const codigo = String(u.codigo_acceso).padEnd(5);
        const nombre = (u.nombre || 'N/A').substring(0, 15).padEnd(15);
        const estado = u.estado_periodo;
        console.log(`${codigo}\t| ${nombre}\t| ${estado}`);
      });
      
      console.log('\n✅ Usa cualquiera de estos códigos para hacer login');
    }
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

checkCodes();
