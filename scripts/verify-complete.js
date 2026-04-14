const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:knoayZQlVchOwjbIsrndCGBPpSqzvDzY@caboose.proxy.rlwy.net:21223/railway';

async function verificarBaseDeDatos() {
  console.log('[VERIFY] Verificando base de datos...\n');
  
  const sql = postgres(DATABASE_URL, {
    ssl: 'require',
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // 1. Ver usuarios
    console.log('=== USUARIOS (código 12345 y 12346) ===');
    const usuarios = await sql`
      SELECT id, nombre, rol, codigo_acceso, estado_corte, fecha_limite
      FROM usuarios 
      WHERE codigo_acceso IN ('12345', '12346')
      ORDER BY codigo_acceso;
    `;
    console.log(`Total: ${usuarios.length}`);
    usuarios.forEach(u => {
      console.log(`  ${u.codigo_acceso}: ${u.nombre} (${u.rol})`);
      console.log(`    Estado: ${u.estado_corte}, Fecha límite: ${u.fecha_limite}`);
    });

    // 2. Ver beneficiarios
    console.log('\n=== BENEFICIARIOS ===');
    const benefs = await sql`SELECT id, nombre, municipio, tecnico_id FROM beneficiaries LIMIT 10;`;
    console.log(`Total: ${benefs.length}`);
    benefs.forEach(b => console.log(`  - ${b.nombre} (${b.municipio}) - Tech: ${b.tecnico_id}`));

    // 3. Ver estructura de bitacoras
    console.log('\n=== ESTRUCTURA BITACORAS ===');
    const cols = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'bitacoras'
      ORDER BY ordinal_position;
    `;
    console.log('Columnas:', cols.length);
    cols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`));

    // 4. Ver FK de bitacoras
    console.log('\n=== LLAVES FORANEAS DE BITACORAS ===');
    const fks = await sql`
      SELECT
        tc.constraint_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'bitacoras';
    `;
    if (fks.length === 0) {
      console.log('  ⚠️ No hay FK en bitacoras');
    } else {
      fks.forEach(fk => console.log(`  ✓ ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`));
    }

    // 5. Ver actividades
    console.log('\n=== ACTIVIDADES ===');
    const acts = await sql`SELECT id, nombre, tecnico_id, beneficiario_id FROM actividades LIMIT 5;`;
    console.log(`Total: ${acts.length}`);
    acts.forEach(a => console.log(`  - ${a.nombre} (Tech: ${a.tecnico_id})`));

    console.log('\n=== RESUMEN ===');
    console.log(`✓ ${usuarios.length} usuarios de prueba`);
    console.log(`✓ ${benefs.length} beneficiarios`);
    console.log(`✓ ${cols.length} columnas en bitacoras`);
    console.log(`✓ FK configuradas: ${fks.length}`);
    
  } catch (error) {
    console.error('[ERROR]', error.message);
  } finally {
    await sql.end();
  }
}

verificarBaseDeDatos();
