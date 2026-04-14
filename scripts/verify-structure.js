const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:knoayZQlVchOwjbIsrndCGBPpSqzvDzY@caboose.proxy.rlwy.net:21223/railway';

async function verificarEstructura() {
  console.log('[VERIFY] Conectando a la base de datos...\n');
  
  const sql = postgres(DATABASE_URL, {
    ssl: 'require',
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // 1. Ver estructura de usuarios
    console.log('=== ESTRUCTURA USUARIOS ===');
    const cols = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position;
    `;
    cols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // 2. Ver estructura de beneficiarios
    console.log('\n=== ESTRUCTURA BENEFICIARIOS ===');
    const benefCols = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'beneficiarios'
      ORDER BY ordinal_position;
    `;
    benefCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // 3. Ver beneficiarios (usando columnas correctas)
    console.log('\n=== BENEFICIARIOS ===');
    const beneficiarios = await sql`SELECT * FROM beneficiaries LIMIT 5;`;
    console.log('Columnas:', Object.keys(beneficiarios[0] || {}).join(', '));
    beneficiarios.forEach(b => console.log(`  - ID: ${b.id}, Tech: ${b.tecnico_id}`));

    // 4. Ver estructura de bitacoras
    console.log('\n=== ESTRUCTURA BITACORAS ===');
    const bitacoraCols = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'bitacoras'
      ORDER BY ordinal_position;
    `;
    bitacoraCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // 5. Ver actividades
    console.log('\n=== ESTRUCTURA ACTIVIDADES ===');
    const actCols = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'actividades'
      ORDER BY ordinal_position;
    `;
    actCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // 6. Probar login
    console.log('\n=== PROBAR LOGIN ===');
    const testUser = await sql`SELECT * FROM usuarios WHERE codigo_acceso = '12345';`;
    if (testUser.length > 0) {
      const u = testUser[0];
      console.log(`  ✓ Usuario 12345: ${u.nombre} (${u.rol})`);
      console.log(`    Estado: ${u.estado_corte}`);
      console.log(`    Fecha límite: ${u.fecha_limite}`);
    } else {
      console.log('  ✗ Usuario 12345 NO encontrado');
    }

    // 7. Probar login con 12346
    console.log('\n=== PROBAR LOGIN 12346 ===');
    const testUser2 = await sql`SELECT * FROM usuarios WHERE codigo_acceso = '12346';`;
    if (testUser2.length > 0) {
      const u = testUser2[0];
      console.log(`  ✓ Usuario 12346: ${u.nombre} (${u.rol})`);
    }

    console.log('\n=== VERIFICACION COMPLETA ===');
    
  } catch (error) {
    console.error('[ERROR]', error.message);
  } finally {
    await sql.end();
  }
}

verificarEstructura();
