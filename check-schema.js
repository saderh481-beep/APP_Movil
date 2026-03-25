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

async function checkSchema() {
  try {
    console.log('\n📋 ESTRUCTURA DE TABLA usuarios\n');
    
    const info = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position
    `;

    if (info.length === 0) {
      console.log('No se encontró la tabla usuarios');
      process.exit(1);
    }

    console.log('Columnas:');
    console.log('─'.repeat(80));
    
    info.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '✓ Nullable' : '✗ NOT NULL';
      const defaultVal = col.column_default ? ` [DEFAULT: ${col.column_default}]` : '';
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(15)} | ${nullable}${defaultVal}`);
    });

    console.log('─'.repeat(80) + '\n');

    // Check for data
    const count = await sql`SELECT COUNT(*) as total FROM usuarios`;
    console.log(`📊 Total de registros: ${count[0].total}\n`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

checkSchema();
