const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:knoayZQlVchOwjbIsrndCGBPpSqzvDzY@caboose.proxy.rlwy.net:21223/railway';

async function verificarBaseDeDatos() {
  console.log('[VERIFY] Conectando a la base de datos...');
  
  const sql = postgres(DATABASE_URL, {
    ssl: 'require',
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // 1. Ver tablas existentes
    console.log('\n=== TABLAS EXISTENTES ===');
    const tablas = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    if (tablas.length === 0) {
      console.log('⚠️ No hay tablas en la base de datos');
    } else {
      tablas.forEach(t => console.log('  - ' + t.table_name));
    }

    // 2. Ver usuarios
    console.log('\n=== USUARIOS ===');
    const usuarios = await sql`SELECT id, nombre, rol, codigo_acceso, estado_corte FROM usuarios ORDER BY created_at DESC;`;
    console.log(`Total: ${usuarios.length}`);
    usuarios.forEach(u => console.log(`  - ${u.codigo_acceso}: ${u.nombre} (${u.rol}) - ${u.estado_corte}`));

    // 3. Ver beneficiarios
    console.log('\n=== BENEFICIARIOS ===');
    const beneficiarios = await sql`SELECT id, nombre_completo, municipio, cadena_productiva, tecnico_id FROM beneficiarios ORDER BY created_at DESC;`;
    console.log(`Total: ${beneficiarios.length}`);
    beneficiarios.forEach(b => console.log(`  - ${b.nombre_completo} (${b.municipio}) - Tech: ${b.tecnico_id}`));

    // 4. Ver estructura de bitacoras
    console.log('\n=== ESTRUCTURA BITACORAS ===');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bitacoras'
      ORDER BY ordinal_position;
    `;
    console.log(`Total columnas: ${columns.length}`);
    columns.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`));

    // 5. Ver FK
    console.log('\n=== LLAVES FORANEAS ===');
    const fks = await sql`
      SELECT
        tc.constraint_name, 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY';
    `;
    if (fks.length === 0) {
      console.log('  No hay llaves foráneas configuradas');
    } else {
      fks.forEach(fk => console.log(`  - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`));
    }

    // 6. Probar login
    console.log('\n=== PROBAR LOGIN ===');
    const testUser = await sql`
      SELECT id, nombre, rol, codigo_acceso, estado_corte, fecha_limite
      FROM usuarios 
      WHERE codigo_acceso = '12345';
    `;
    if (testUser.length > 0) {
      const u = testUser[0];
      console.log(`  ✓ Usuario 12345 encontrado: ${u.nombre}`);
      console.log(`    Estado: ${u.estado_corte}, Fecha límite: ${u.fecha_limite}`);
    } else {
      console.log('  ✗ Usuario 12345 NO encontrado');
    }

    console.log('\n=== VERIFICACION COMPLETA ===');
    console.log('✓ Base de datos conectada correctamente');
    
  } catch (error) {
    console.error('[ERROR]', error.message);
  } finally {
    await sql.end();
  }
}

verificarBaseDeDatos();
