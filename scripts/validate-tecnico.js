#!/usr/bin/env node

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(msg) {
  return new Promise(resolve => {
    rl.question(msg, resolve);
  });
}

async function validarTecnico() {
  try {
    console.log('\n🔍 VALIDAR QUE NUEVO TÉCNICO PUEDA HACER LOGIN\n');
    console.log('='.repeat(60));
    
    const codigo = await pregunta('\n📱 Código del técnico (5 dígitos): ');
    
    if (!/^\d{5}$/.test(codigo)) {
      console.log('\n❌ El código debe ser exactamente 5 dígitos');
      rl.close();
      process.exit(1);
    }
    
    console.log('\n⏳ Verificando configuración...\n');
    
    const usuarios = await sql`
      SELECT 
        id,
        codigo_acceso,
        nombre,
        correo,
        activo,
        fecha_limite,
        estado_corte,
        NOW()::date as fecha_actual
      FROM usuarios
      WHERE codigo_acceso = ${codigo}
    `;
    
    if (usuarios.length === 0) {
      console.log(`❌ No encontrado técnico con código: ${codigo}\n`);
      rl.close();
      await sql.end();
      process.exit(1);
    }
    
    const u = usuarios[0];
    const checks = [];
    
    console.log('📋 DATOS DEL TÉCNICO:');
    console.log('-'.repeat(60));
    console.log(`ID: ${u.id}`);
    console.log(`Código: ${u.codigo_acceso}`);
    console.log(`Nombre: ${u.nombre}`);
    console.log(`Correo: ${u.correo}`);
    
    console.log('\n🔐 VALIDACIONES PARA LOGIN:');
    console.log('-'.repeat(60));
    
    // Check 1: Código exactamente 5 dígitos
    const codigoOk = /^\d{5}$/.test(u.codigo_acceso);
    checks.push(codigoOk);
    console.log(`${codigoOk ? '✅' : '❌'} Código: ${u.codigo_acceso} (${codigoOk ? '5 dígitos' : 'NO es 5 dígitos'})`);
    
    // Check 2: Activo = true
    const activoOk = u.activo === true;
    checks.push(activoOk);
    console.log(`${activoOk ? '✅' : '❌'} Activo: ${u.activo ? 'true' : 'false'}`);
    
    // Check 3: Fecha límite válida
    let fechaOk = true;
    if (u.fecha_limite === null) {
      console.log(`✅ Fecha Límite: NULL (sin límite)`);
    } else {
      fechaOk = new Date(u.fecha_limite) > new Date(u.fecha_actual);
      console.log(`${fechaOk ? '✅' : '❌'} Fecha Límite: ${u.fecha_limite} (${fechaOk ? 'VÁLIDA' : 'VENCIDA'})`);
    }
    checks.push(fechaOk);
    
    // Check 4: Estado corte = 'en_servicio'
    const estadoOk = u.estado_corte === 'en_servicio';
    checks.push(estadoOk);
    console.log(`${estadoOk ? '✅' : '❌'} Estado Corte: '${u.estado_corte}' (${estadoOk ? '' : 'Debe ser en_servicio'})`);
    
    console.log('\n' + '='.repeat(60));
    
    const todoOk = checks.every(c => c);
    if (todoOk) {
      console.log('\n✅ ¡TÉCNICO CONFIGURADO CORRECTAMENTE!');
      console.log(`\n📱 Puede iniciar sesión con código: ${u.codigo_acceso}\n`);
    } else {
      console.log('\n❌ TÉCNICO CON PROBLEMAS DE CONFIGURACIÓN');
      console.log('\nRevisa los campos marcados con ❌ arriba\n');
    }
    
    rl.close();
    await sql.end();
    process.exit(todoOk ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    await sql.end();
    process.exit(1);
  }
}

validarTecnico();
