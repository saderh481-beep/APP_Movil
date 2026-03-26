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

async function findValidTecnico() {
  try {
    console.log('\n📋 BÚSQUEDA DE TÉCNICO VÁLIDO\n');

    // Encontrar técnicos con fecha límite válida
    const tecnicosValidos = await sql`
      SELECT 
        u.id,
        u.codigo_acceso,
        u.nombre,
        u.activo,
        td.fecha_limite,
        (td.fecha_limite > NOW()) as fecha_valida,
        (NOW() - td.fecha_limite) as dias_restantes
      FROM usuarios u
      LEFT JOIN tecnico_detalles td ON u.id = td.tecnico_id
      WHERE u.activo = true 
        AND u.codigo_acceso IS NOT NULL
        AND u.codigo_acceso != ''
      ORDER BY td.fecha_limite DESC NULLS LAST
      LIMIT 10
    `;

    console.log('Técnicos existentes:\n');
    console.log('─'.repeat(100));
    
    tecnicosValidos.forEach((t, i) => {
      const estado = t.fecha_valida ? '✅ VÁLIDO' : '❌ EXPIRADO';
      const fecha = t.fecha_limite ? new Date(t.fecha_limite).toLocaleDateString('es-MX') : 'SIN FECHA';
      console.log(`${(i+1)}. Código: ${t.codigo_acceso.padEnd(8)} | ${t.nombre.substring(0, 30).padEnd(30)} | ${fecha.padEnd(12)} | ${estado}`);
    });

    console.log('─'.repeat(100) + '\n');

    // Si no hay válidos, avisar
    const valido = tecnicosValidos.find(t => t.fecha_valida);
    if (valido) {
      console.log(`✅ TÉCNICO VÁLIDO ENCONTRADO:`);
      console.log(`   Código: ${valido.codigo_acceso}`);
      console.log(`   Nombre: ${valido.nombre}`);
      console.log(`   Fecha Límite: ${new Date(valido.fecha_limite).toLocaleDateString('es-MX')}`);
    } else {
      console.log('❌ NO HAY TÉCNICOS VÁLIDOS CON FECHA LÍMITE FUTURA\n');
      console.log('Solución: Crear nuevo técnico con fecha límite actualizada\n');
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

findValidTecnico();
