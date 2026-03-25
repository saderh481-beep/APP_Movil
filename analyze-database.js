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

async function checkDatabase() {
  try {
    console.log('\n📊 ANÁLISIS COMPLETO DE LA BASE DE DATOS\n');
    
    // 1. Listar todas las tablas
    console.log('1️⃣  TABLAS EN LA BASE DE DATOS:');
    console.log('─'.repeat(60));
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    tables.forEach(t => console.log(`   • ${t.table_name}`));
    
    // 2. Verificar últimos usuarios creados
    console.log('\n\n2️⃣  ÚLTIMOS 5 USUARIOS:');
    console.log('─'.repeat(60));
    const usuarios = await sql`
      SELECT 
        id,
        nombre,
        codigo_acceso,
        rol,
        activo,
        fecha_limite,
        estado_corte,
        created_at
      FROM usuarios
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    usuarios.forEach(u => {
      console.log(`\n   ID: ${u.id}`);
      console.log(`   Nombre: ${u.nombre}`);
      console.log(`   Código: ${u.codigo_acceso}`);
      console.log(`   Rol: ${u.rol}`);
      console.log(`   Activo: ${u.activo}`);
      console.log(`   Fecha Límite: ${u.fecha_limite}`);
      console.log(`   Estado Corte: ${u.estado_corte}`);
      console.log(`   Creado: ${u.created_at}`);
    });

    // 3. Revisar si hay tablas de períodos o accesos
    console.log('\n\n3️⃣  ESTRUCTURA DE OTRAS TABLAS (si existen):');
    console.log('─'.repeat(60));
    
    for (const tableName of tables.map(t => t.table_name)) {
      if (tableName !== 'usuarios') {
        try {
          const columns = await sql`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = ${tableName}
            LIMIT 5
          `;
          
          if (columns.length > 0) {
            console.log(`\n   📋 Tabla: ${tableName}`);
            columns.forEach(col => {
              console.log(`      • ${col.column_name} (${col.data_type})`);
            });
          }
        } catch (e) {
          // Ignorar si hay error
        }
      }
    }

    console.log('\n\n' + '─'.repeat(60) + '\n');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

checkDatabase();
