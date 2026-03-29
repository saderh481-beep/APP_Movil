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

async function addColumns() {
  try {
    console.log('⏳ Agregando columnas faltantes a tabla usuarios...\n');
    
    await sql`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS fecha_limite DATE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS estado_corte VARCHAR(50) DEFAULT 'activo'
    `;
    
    console.log('✅ Columnas agregadas exitosamente!');
    console.log('\n📝 Cambios realizados:');
    console.log('   - fecha_limite: DATE');
    console.log('   - estado_corte: VARCHAR(50)');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

addColumns();
