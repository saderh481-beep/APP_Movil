#!/usr/bin/env node

/**
 * CORRECCIÓN FINAL - Limpieza de espacios en códigos
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

async function corregirCodigosFinales() {
  try {
    console.log('\n' + '='.repeat(90));
    console.log('🔧 CORRECCIÓN FINAL - LIMPIEZA DE ESPACIOS EN CÓDIGOS');
    console.log('='.repeat(90));
    
    // Obtener todos los técnicos activos
    const usuarios = await sql`
      SELECT id, codigo_acceso, nombre
      FROM usuarios
      WHERE activo = true
      ORDER BY nombre
    `;
    
    console.log(`\n📋 Total de técnicos activos: ${usuarios.length}\n`);
    
    // Analizar códigos problemáticos
    const problemas = usuarios.filter(u => {
      const codigo = u.codigo_acceso.trim();
      return codigo.length !== 5 || !/^\d{5}$/.test(codigo);
    });
    
    console.log(`⚠️  Códigos con problemas: ${problemas.length}\n`);
    
    if (problemas.length === 0) {
      console.log('✅ No hay problemas, todos los códigos son válidos');
      await sql.end();
      return;
    }
    
    for (const u of problemas) {
      const limpio = u.codigo_acceso.trim();
      console.log(`❌ ${u.nombre}`);
      console.log(`   Actual: '${u.codigo_acceso}' (length=${u.codigo_acceso.length})`);
      console.log(`   Limpio: '${limpio}' (length=${limpio.length})`);
      console.log(`   Válido: ${/^\d{5}$/.test(limpio) ? '✅' : '❌'}\n`);
    }
    
    // Preguntar confirmación
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const respuesta = await new Promise(resolve => {
      rl.question('¿Proceder a corregir? (s/n): ', resolve);
    });
    rl.close();
    
    if (respuesta.toLowerCase() !== 's') {
      console.log('\n❌ Correcciones canceladas');
      await sql.end();
      return;
    }
    
    // CORREGIR
    console.log('\n🔧 Aplicando correcciones...\n');
    
    let corregidos = 0;
    for (const u of problemas) {
      const limpio = u.codigo_acceso.trim();
      
      if (/^\d{5}$/.test(limpio)) {
        // Solo tiene espacios, limpiar
        await sql`
          UPDATE usuarios
          SET codigo_acceso = ${limpio}
          WHERE id = ${u.id}
        `;
        console.log(`✅ ${u.nombre}: '${u.codigo_acceso}' → '${limpio}'`);
      } else if (limpio.length === 5 && /^\d+$/.test(limpio)) {
        // 5 dígitos sin espacios pero otro problema
        await sql`
          UPDATE usuarios
          SET codigo_acceso = ${limpio}
          WHERE id = ${u.id}
        `;
        console.log(`✅ ${u.nombre}: Limpiado a '${limpio}'`);
      } else {
        // Generar código válido (5 dígitos aleatorios)
        let codigoNuevo = String(Math.floor(Math.random() * 90000) + 10000);
        
        // Verificar que no exista
        let intento = 0;
        while (intento < 10) {
          const existe = await sql`
            SELECT id FROM usuarios 
            WHERE codigo_acceso = ${codigoNuevo}
          `;
          if (existe.length === 0) break;
          codigoNuevo = String(Math.floor(Math.random() * 90000) + 10000);
          intento++;
        }
        
        await sql`
          UPDATE usuarios
          SET codigo_acceso = ${codigoNuevo}
          WHERE id = ${u.id}
        `;
        console.log(`✅ ${u.nombre}: Regenerado con '${codigoNuevo}'`);
      }
      corregidos++;
    }
    
    // VERIFICAR LA CORRECCIÓN
    console.log('\n📊 Verificando resultados...\n');
    
    const usuariosVerificacion = await sql`
      SELECT codigo_acceso, nombre
      FROM usuarios
      WHERE activo = true
      ORDER BY nombre
    `;
    
    const todosValidos = usuariosVerificacion.every(u => {
      const codigo = u.codigo_acceso.trim();
      return /^\d{5}$/.test(codigo);
    });
    
    const invalidosRestantes = usuariosVerificacion.filter(u => {
      const codigo = u.codigo_acceso.trim();
      return !/^\d{5}$/.test(codigo);
    });
    
    if (todosValidos) {
      console.log('✅ TODOS LOS CÓDIGOS SON AHORA VÁLIDOS');
    } else {
      console.log(`❌ Aún hay ${invalidosRestantes.length} códigos inválidos:`);
      invalidosRestantes.forEach(u => {
        console.log(`   ${u.nombre}: '${u.codigo_acceso}'`);
      });
    }
    
    // RESUMEN
    console.log('\n' + '='.repeat(90));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(90));
    console.log(`✅ Técnicos corregidos: ${corregidos}`);
    console.log(`✅ Códigos válidos: ${usuariosVerificacion.length}/${usuariosVerificacion.length}`);
    console.log('='.repeat(90) + '\n');
    
    await sql.end();
    
  } catch (e) {
    console.error('\n❌ ERROR:', e.message);
    await sql.end();
    process.exit(1);
  }
}

corregirCodigosFinales();
