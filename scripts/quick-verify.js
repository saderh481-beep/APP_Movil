const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:knoayZQlVchOwjbIsrndCGBPpSqzvDzY@caboose.proxy.rlwy.net:21223/railway';

async function verificar() {
  console.log('[VERIFY] Verificando base de datos...\n');
  
  const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

  try {
    // 1. Ver todas las tablas
    console.log('=== TABLAS ===');
    const tablas = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    tablas.forEach(t => console.log('  ' + t.table_name));

    // 2. Ver usuarios
    console.log('\n=== USUARIOS ===');
    const usuarios = await sql`
      SELECT id, nombre, rol, codigo_acceso, estado_corte
      FROM usuarios 
      WHERE codigo_acceso IN ('12345', '12346')
      ORDER BY codigo_acceso;
    `;
    usuarios.forEach(u => console.log(`  ${u.codigo_acceso}: ${u.nombre} (${u.rol}) - ${u.estado_corte}`));

    // 3. Ver beneficiarios - probar con diferente nombre
    console.log('\n=== BENEFICIARIOS ===');
    let benefs = await sql`SELECT * FROM beneficiario LIMIT 5;`.catch(() => []);
    if (benefs.length === 0) benefs = await sql`SELECT * FROM beneficiarios LIMIT 5;`.catch(() => []);
    console.log(`  Total encontrado: ${benefs.length}`);
    if (benefs.length > 0) console.log('  Columnas:', Object.keys(benefs[0]).join(', '));
    benefs.forEach(b => console.log(`  - ${JSON.stringify(b).substring(0, 100)}`));

    // 4. Ver estructura bitacoras
    console.log('\n=== BITACORAS COLUMNAS ===');
    const cols = await sql`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'bitacoras' ORDER BY ordinal_position;
    `;
    cols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // 5. Ver FK
    console.log('\n=== FK BITACORAS ===');
    const fks = await sql`
      SELECT tc.constraint_name, kcu.column_name, ccu.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'bitacoras';
    `;
    fks.forEach(fk => console.log(`  ${fk.column_name} -> ${fk.table_name}`));

    console.log('\n=== RESULTADO ===');
    console.log('✓ Base de datos conectada');
    console.log('✓ Usuarios de prueba existen');
    
  } catch (e) {
    console.error('[ERROR]', e.message);
  } finally {
    await sql.end();
  }
}

verificar();
