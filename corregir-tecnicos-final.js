#!/usr/bin/env node

/**
 * CORRECCIÓN DE TÉCNICOS - Auditoría Final
 * 
 * Problemas encontrados:
 * 1. 10 técnicos con códigos de 6+ dígitos (NO válidos)
 * 2. 14 técnicos activos SIN registro en tecnico_detalles
 * 3. Necesario para que puedan hacer login
 */

const postgres = require('postgres');
const readline = require('readline');

const sql = postgres({
  host: 'caboose.proxy.rlwy.net',
  port: 21223,
  username: 'postgres',
  password: 'knoayZQlVchOwjbIsrndCGBPpSqzvDzY',
  database: 'railway',
  ssl: 'require'
});

async function corregirTecnicos() {
  try {
    console.log('\n' + '='.repeat(90));
    console.log('🔧 CORRECCIÓN DE TÉCNICOS - AUDITORÍA FINAL');
    console.log('='.repeat(90));
    
    // PASO 1: Obtener técnicos con códigos inválidos (no 5 dígitos)
    console.log('\n📋 PASO 1: Identificar técnicos con códigos inválidos\n');
    
    const usuarios = await sql`
      SELECT 
        id,
        codigo_acceso,
        nombre,
        activo
      FROM usuarios
      WHERE activo = true
      ORDER BY nombre
    `;
    
    const codigosInvalidos = usuarios.filter(u => 
      !u.codigo_acceso || 
      u.codigo_acceso.length !== 5 ||
      !/^\d+$/.test(u.codigo_acceso)
    );
    
    console.log(`Encontrados: ${codigosInvalidos.length} técnicos con códigos inválidos\n`);
    
    for (const u of codigosInvalidos) {
      console.log(`❌ ${u.nombre}: "${u.codigo_acceso}" (${u.codigo_acceso.length} dígitos)`);
    }
    
    // PASO 2: Obtener técnicos sin tecnico_detalles
    console.log('\n📋 PASO 2: Identificar técnicos sin tecnico_detalles\n');
    
    const sinDetalles = await sql`
      SELECT u.id, u.nombre, u.codigo_acceso
      FROM usuarios u
      LEFT JOIN tecnico_detalles td ON u.id = td.tecnico_id
      WHERE u.activo = true AND td.id IS NULL
    `;
    
    console.log(`Encontrados: ${sinDetalles.length} técnicos sin tecnico_detalles\n`);
    
    for (const u of sinDetalles) {
      console.log(`⚠️  ${u.nombre} (${u.codigo_acceso})`);
    }
    
    // PASO 3: Preguntar si continuar con correcciones
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const respuesta = await new Promise(resolve => {
      rl.question('\n¿Aplicar correcciones? (s/n): ', resolve);
    });
    rl.close();
    
    if (respuesta.toLowerCase() !== 's') {
      console.log('\n❌ Correcciones canceladas');
      await sql.end();
      process.exit(1);
    }
    
    // PASO 4: Corregir códigos inválidos
    console.log('\n🔧 PASO 3: Corrigiendo códigos inválidos...\n');
    
    let corregidos = 0;
    for (const u of codigosInvalidos) {
      // Tomar últimos 5 dígitos del código
      const codigoNuevo = u.codigo_acceso.toString().slice(-5).padStart(5, '0');
      
      // Verificar que el nuevo código no exista
      const existe = await sql`
        SELECT id FROM usuarios WHERE codigo_acceso = ${codigoNuevo} AND id != ${u.id}
      `;
      
      if (existe.length > 0) {
        console.log(`⚠️  ${u.nombre}: Código ${codigoNuevo} ya existe, generando nuevo...`);
        // Generar código aleatorio
        const nuevo = String(Math.floor(10000 + Math.random() * 90000));
        
        await sql`
          UPDATE usuarios 
          SET codigo_acceso = ${nuevo}
          WHERE id = ${u.id}
        `;
        console.log(`✅ ${u.nombre}: ${u.codigo_acceso} → ${nuevo}`);
      } else {
        await sql`
          UPDATE usuarios 
          SET codigo_acceso = ${codigoNuevo}
          WHERE id = ${u.id}
        `;
        console.log(`✅ ${u.nombre}: ${u.codigo_acceso} → ${codigoNuevo}`);
      }
      corregidos++;
    }
    
    // PASO 5: Crear tecnico_detalles para técnicos sin detalles
    console.log('\n🔧 PASO 4: Creando tecnico_detalles...\n');
    
    const coordinador = await sql`
      SELECT id FROM usuarios 
      WHERE activo = true AND rol IN ('coordinador', 'COORDINADOR', 'admin', 'ADMIN')
      LIMIT 1
    `;
    
    const coordinador_id = coordinador.length > 0 ? coordinador[0].id : sinDetalles[0].id;
    
    let insertos = 0;
    
    for (const u of sinDetalles) {
      const fechaLimite = new Date();
      fechaLimite.setFullYear(fechaLimite.getFullYear() + 1); // 1 año a partir de hoy
      
      try {
        await sql`
          INSERT INTO tecnico_detalles (
            tecnico_id,
            coordinador_id,
            fecha_limite,
            estado_corte,
            created_at,
            updated_at
          )
          VALUES (
            ${u.id}::uuid,
            ${coordinador_id}::uuid,
            ${fechaLimite.toISOString()}::timestamp with time zone,
            'en_servicio',
            NOW(),
            NOW()
          )
          ON CONFLICT (tecnico_id) DO NOTHING
        `;
        
        console.log(`✅ ${u.nombre}: Detalle creado (límite: ${fechaLimite.toLocaleDateString('es-MX')})`);
        insertos++;
      } catch (e) {
        console.log(`⚠️  ${u.nombre}: ${e.message}`);
      }
    }
    
    // PASO 6: Validar estado_corte
    console.log('\n🔧 PASO 5: Validando estado_corte...\n');
    
    const estadoIncorrecto = await sql`
      UPDATE usuarios 
      SET estado_corte = 'en_servicio'
      WHERE activo = true AND estado_corte != 'en_servicio'
      RETURNING nombre, estado_corte
    `;
    
    if (estadoIncorrecto.length > 0) {
      console.log(`✅ Corregidos ${estadoIncorrecto.length} técnicos con estado_corte`);
      estadoIncorrecto.forEach(u => {
        console.log(`   • ${u.nombre} → en_servicio`);
      });
    }
    
    // RESUMEN
    console.log('\n' + '='.repeat(90));
    console.log('📊 RESUMEN DE CORRECCIONES');
    console.log('='.repeat(90));
    
    console.log(`
  ✅ Códigos corregidos: ${corregidos}
  ✅ Registros tecnico_detalles creados: ${insertos}
  ✅ Estados_corte validados: ${estadoIncorrecto.length}
  
  ✨ CORRECCIONES COMPLETADAS
  `);
    
    console.log('='.repeat(90) + '\n');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

corregirTecnicos();
