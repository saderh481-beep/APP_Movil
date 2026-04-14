const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:knoayZQlVchOwjbIsrndCGBPpSqzvDzY@caboose.proxy.rlwy.net:21223/railway';

async function verificarBeneficiariosDB() {
  console.log('[VERIFY] Verificando beneficiarios en BD...\n');
  
  const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });

  try {
    // Ver estructura de beneficiarios
    console.log('=== ESTRUCTURA BENEFICIARIOS ===');
    const cols = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'beneficiarios' ORDER BY ordinal_position;
    `;
    console.log('Columnas:', cols.map(c => c.column_name).join(', '));

    // Ver datos reales
    console.log('\n=== DATOS REALES ===');
    const benefs = await sql`
      SELECT id, nombre, curp, folio_saderh, direccion, cp, coord_parcela, tecnico_id
      FROM beneficiarios 
      LIMIT 5;
    `;
    
    benefs.forEach((b, i) => {
      console.log(`\n--- Beneficiario ${i+1} ---`);
      console.log('  id:', b.id);
      console.log('  nombre:', b.nombre);
      console.log('  curp:', b.curp);
      console.log('  folio_saderh:', b.folio_saderh);
      console.log('  direccion:', b.direccion);
      console.log('  cp:', b.cp);
      console.log('  coord_parcela:', b.coord_parcela);
    });

    console.log('\n=== CONCLUSIÓN ===');
    const primerBenef = benefs[0];
    if (primerBenef && (primerBenef.curp || primerBenef.folio_saderh || primerBenef.direccion)) {
      console.log('✓ Los datos EXISTEN en la base de datos');
      console.log('✗ El BACKEND no los está devolviendo en la API');
    } else {
      console.log('✗ Los datos NO existen en la base de datos (están vacíos/nulos)');
    }
    
  } catch (e) {
    console.error('[ERROR]', e.message);
  } finally {
    await sql.end();
  }
}

verificarBeneficiariosDB();
