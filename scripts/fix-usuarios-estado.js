#!/usr/bin/env node

/**
 * SCRIPT DE CORRECCIÓN - Arreglar estado_corte de usuarios
 * 
 * Este script corrige todos los usuarios que tienen estado_corte incorrecto
 * asegurando que solo usuarios activos puedan hacer login después
 */

const postgres = require('postgres');

const sql = postgres({
  host: 'caboose.proxy.rlwy.net',
  port: 21223,
  username: 'postgres',
  password: 'knoayZQlVchOwjbIsrndCGBPpSqzvDzY',
  database: 'railway',
  ssl: 'require'
});

async function mostrarEstadoActual() {
  console.log('\n📊 ESTADO ACTUAL DE USUARIOS\n');
  console.log('=' .repeat(70));
  
  try {
    const usuarios = await sql`
      SELECT id, nombre, activo, estado_corte, fecha_limite
      FROM usuarios 
      ORDER BY id DESC 
      LIMIT 20
    `;
    
    if (usuarios.length === 0) {
      console.log('No hay usuarios registrados');
      return;
    }
    
    console.log('ID      | Nombre                 | Activo | Estado Corte      | Límite');
    console.log('-'.repeat(85));
    
    for (const u of usuarios) {
      const id = String(u.id).padEnd(7);
      const nombre = (u.nombre || '').substring(0, 22).padEnd(22);
      const activo = u.activo ? '✅ Sí  ' : '❌ No  ';
      const estado = (u.estado_corte || 'NULL').padEnd(17);
      const limite = u.fecha_limite ? new Date(u.fecha_limite).toLocaleDateString('es-MX') : 'SIN LÍMITE';
      
      console.log(`${id} | ${nombre} | ${activo} | ${estado} | ${limite}`);
    }
    
    // Estadísticas
    const stats = {
      total: usuarios.length,
      activos: usuarios.filter(u => u.activo).length,
      inactivos: usuarios.filter(u => !u.activo).length,
      en_servicio: usuarios.filter(u => u.estado_corte === 'en_servicio').length,
      activo_state: usuarios.filter(u => u.estado_corte === 'activo').length,
      otros: usuarios.filter(u => !['en_servicio', 'activo'].includes(u.estado_corte)).length,
    };
    
    console.log('\n' + '='.repeat(70));
    console.log('📈 ESTADÍSTICAS:');
    console.log(`   Total de usuarios: ${stats.total}`);
    console.log(`   Activos (flag): ${stats.activos}`);
    console.log(`   Inactivos (flag): ${stats.inactivos}`);
    console.log(`   Con estado_corte='en_servicio': ${stats.en_servicio}`);
    console.log(`   Con estado_corte='activo': ${stats.activo_state}`);
    console.log(`   Otros estados: ${stats.otros}`);
    
    return stats;
  } catch (error) {
    console.error('❌ Error consultando usuarios:', error.message);
    throw error;
  }
}

async function corregirUsuarios() {
  console.log('\n🔧 APLICANDO CORRECCIONES\n');
  console.log('=' .repeat(70));
  
  try {
    // Paso 1: Asegurar que todos los usuarios activos tengan estado_corte correcto
    const usuarios_sin_estado = await sql`
      UPDATE usuarios 
      SET estado_corte = 'en_servicio' 
      WHERE activo = true 
        AND (estado_corte IS NULL OR estado_corte NOT IN ('en_servicio', 'corte_aplicado'))
      RETURNING id, nombre, estado_corte
    `;
    
    if (usuarios_sin_estado.length > 0) {
      console.log(`\n✅ Corregidos ${usuarios_sin_estado.length} usuarios sin estado válido:`);
      usuarios_sin_estado.forEach(u => {
        console.log(`   - ${u.nombre} (ID: ${u.id}) → ${u.estado_corte}`);
      });
    }
    
    // Paso 2: Poner usuarios inactivos en estado de corte
    const usuarios_inactivos = await sql`
      UPDATE usuarios 
      SET estado_corte = 'corte_aplicado' 
      WHERE activo = false 
        AND (estado_corte IS NULL OR estado_corte = 'en_servicio')
      RETURNING id, nombre, activo, estado_corte
    `;
    
    if (usuarios_inactivos.length > 0) {
      console.log(`\n✅ Actualizados ${usuarios_inactivos.length} usuarios inactivos:`);
      usuarios_inactivos.forEach(u => {
        console.log(`   - ${u.nombre} (ID: ${u.id}) → ${u.estado_corte}`);
      });
    }
    
    // Paso 3: Convertir estado='activo' a 'en_servicio' (compatibilidad)
    const estado_activo = await sql`
      UPDATE usuarios 
      SET estado_corte = 'en_servicio' 
      WHERE estado_corte = 'activo'
      RETURNING id, nombre, estado_corte
    `;
    
    if (estado_activo.length > 0) {
      console.log(`\n✅ Migrados ${estado_activo.length} usuarios con estado 'activo' → 'en_servicio':`);
      estado_activo.forEach(u => {
        console.log(`   - ${u.nombre} (ID: ${u.id}) → ${u.estado_corte}`);
      });
    }
    
    const totalCorregidos = usuarios_sin_estado.length + usuarios_inactivos.length + estado_activo.length;
    
    if (totalCorregidos === 0) {
      console.log('\n✅ Todos los usuarios ya tienen estado correcto');
    } else {
      console.log(`\n${'='.repeat(70)}\n✅ TOTAL CORREGIDOS: ${totalCorregidos} usuarios`);
    }
    
    return totalCorregidos;
  } catch (error) {
    console.error('❌ Error aplicando correcciones:', error.message);
    throw error;
  }
}

async function validarCorrecciones() {
  console.log('\n✓ VALIDANDO CORRECCIONES\n');
  console.log('=' .repeat(70));
  
  try {
    const usuarios = await sql`
      SELECT id, nombre, activo, estado_corte 
      FROM usuarios 
      WHERE activo = true
    `;
    
    const problemas = usuarios.filter(u => u.estado_corte !== 'en_servicio');
    
    if (problemas.length === 0) {
      console.log('✅ VALIDACIÓN EXITOSA: Todos los usuarios activos tienen estado correcto\n');
      console.log(`Total usuarios activos validados: ${usuarios.length}`);
      return true;
    } else {
      console.log(`❌ VALIDACIÓN FALLIDA: ${problemas.length} usuarios aún tienen estado incorrecto:\n`);
      problemas.forEach(u => {
        console.log(`   - ${u.nombre} (ID: ${u.id}) - estado: ${u.estado_corte}`);
      });
      return false;
    }
  } catch (error) {
    console.error('❌ Error en validación:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔧 HERRAMIENTA DE CORRECCIÓN: Estado de Usuarios');
    console.log('='.repeat(70));
    
    // Mostrar estado actual
    const estadoAntes = await mostrarEstadoActual();
    
    // Aplicar correcciones
    const corregidos = await corregirUsuarios();
    
    // Mostrar estado final
    console.log('\n📊 ESTADO FINAL DE USUARIOS\n');
    const estadoDespues = await mostrarEstadoActual();
    
    // Validar
    const valido = await validarCorrecciones();
    
    console.log('\n' + '='.repeat(70));
    if (valido) {
      console.log('✅ ¡CORRECCIONES APLICADAS CON ÉXITO!');
      console.log('   Los usuarios ya pueden hacer login y acceder a asignaciones');
    } else {
      console.log('⚠️  Algunas correcciones no se aplicaron completamente');
    }
    console.log('='.repeat(70) + '\n');
    
    await sql.end();
    process.exit(valido ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
