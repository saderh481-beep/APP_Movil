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

async function debugPeriodoVencido() {
  try {
    console.log('\n🔍 DEBUG: ¿POR QUÉ "periodo_vencido"?\n');

    // Query que el backend probablemente usa
    const codigo_test = '72147';
    
    console.log(`Buscando técnico con código: ${codigo_test}\n`);
    
    // Buscar en usuarios
    const usuario = await sql`
      SELECT 
        id,
        codigo_acceso,
        nombre,
        activo,
        fecha_limite as fecha_limite_usuarios,
        (fecha_limite > NOW()) as fecha_valida_usuarios
      FROM usuarios
      WHERE codigo_acceso = ${codigo_test}
        AND activo = true
      LIMIT 1
    `;

    if (!usuario || usuario.length === 0) {
      console.log('❌ Usuario no encontrado en tabla usuarios');
      await sql.end();
      process.exit(1);
    }

    const usr = usuario[0];
    console.log('✅ Usuario encontrado en tabla usuarios:');
    console.log(`   - ID: ${usr.id}`);
    console.log(`   - Código: ${usr.codigo_acceso}`);
    console.log(`   - Activo: ${usr.activo}`);
    console.log(`   - Fecha Límite (usuarios): ${usr.fecha_limite_usuarios}`);
    console.log(`   - ¿Fecha válida en usuarios?: ${usr.fecha_valida_usuarios}\n`);

    // Buscar en tecnico_detalles
    const detalles = await sql`
      SELECT 
        id,
        tecnico_id,
        coordinador_id,
        fecha_limite,
        estado_corte,
        (fecha_limite > NOW()) as fecha_valida,
        (NOW() - fecha_limite) as dias_transcurridos
      FROM tecnico_detalles
      WHERE tecnico_id = ${usr.id}
    `;

    if (!detalles || detalles.length === 0) {
      console.log('❌ NO HAY REGISTRO EN tecnico_detalles para este técnico');
      console.log('   → ESE ES EL PROBLEMA: El backend busca aca y no lo encuentra\n');
    } else {
      const det = detalles[0];
      console.log('✅ Detalles encontrados en tecnico_detalles:');
      console.log(`   - ID: ${det.id}`);
      console.log(`   - Tecnico ID: ${det.tecnico_id}`);
      console.log(`   - Fecha Límite: ${det.fecha_limite}`);
      console.log(`   - Estado Corte: ${det.estado_corte}`);
      console.log(`   - ¿Fecha válida?: ${det.fecha_valida}`);
      console.log(`   - Días transcurridos: ${det.dias_transcurridos}\n`);
    }

    // Comparar con NOW()
    console.log('📊 COMPARACIÓN DE FECHAS:');
    console.log(`   - NOW(): ${new Date().toISOString()}`);
    
    if (usr.fecha_limite_usuarios) {
      const diff = new Date(usr.fecha_limite_usuarios).getTime() - new Date().getTime();
      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      console.log(`   - fecha_limite (usuarios): ${new Date(usr.fecha_limite_usuarios).toISOString()} (${dias} días)}`);
    } else {
      console.log(`   - fecha_limite (usuarios): NULL`);
    }

    if (detalles && detalles.length > 0) {
      const det = detalles[0];
      const diff = new Date(det.fecha_limite).getTime() - new Date().getTime();
      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      console.log(`   - fecha_limite (detalles): ${new Date(det.fecha_limite).toISOString()} (${dias} días)`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 SOLUCIÓN');
    console.log('='.repeat(80));
    
    if (!detalles || detalles.length === 0) {
      console.log('\n❌ PROBLEMA IDENTIFICADO:');
      console.log('   El técnico NO tiene registro en tecnico_detalles');
      console.log('   El backend busca ahí, no lo encuentra, y devuelve "periodo_vencido"\n');
      console.log('✅ SOLUCIÓN:');
      console.log('   Asegurar que TODOS los técnicos nuevos tengan registro en tecnico_detalles');
      console.log('   con fecha_limite en el futuro\n');
    } else {
      const det = detalles[0];
      if (!det.fecha_valida) {
        console.log('\n❌ PROBLEMA IDENTIFICADO:');
        console.log('   La fecha en tecnico_detalles está en el PASADO');
        console.log(`   fecha_limite: ${det.fecha_limite}`);
        console.log(`   Hoy: ${new Date().toISOString()}\n`);
        console.log('✅ SOLUCIÓN:');
        console.log('   Actualizar fecha_limite a una fecha futura\n');
      } else {
        console.log('\n✅ TODO PARECE CORRECTO EN LA BD:');
        console.log('   - Técnico existe');
        console.log('   - Detalles existen');
        console.log('   - Fecha es válida\n');
        console.log('❓ PERO LA API devuelve "periodo_vencido"');
        console.log('   Posible causa: Timezone mismatch o lógica diferente en backend\n');
      }
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

debugPeriodoVencido();
