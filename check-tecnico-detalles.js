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

async function checkTecnicoDetalles() {
  try {
    console.log('\n📋 ESTRUCTURA tecnico_detalles\n');
    
    const columns = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'tecnico_detalles'
      ORDER BY ordinal_position
    `;

    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '✓ Nullable' : '✗ NOT NULL';
      const defaultVal = col.column_default ? ` [DEFAULT: ${col.column_default}]` : '';
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(40)} | ${nullable}${defaultVal}`);
    });

    console.log('\n\n📊 REGISTROS EXISTENTES:\n');
    const records = await sql`
      SELECT 
        id,
        tecnico_id,
        coordinador_id,
        fecha_limite,
        updated_at
      FROM tecnico_detalles
      LIMIT 3
    `;

    records.forEach(r => {
      console.log(`  Tecnico: ${r.tecnico_id}`);
      console.log(`  Coordinador: ${r.coordinador_id}`);
      console.log(`  Fecha Límite: ${r.fecha_limite}`);
      console.log('  ─────────');
    });

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

checkTecnicoDetalles();
