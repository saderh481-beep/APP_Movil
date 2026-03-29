#!/usr/bin/env node

/**
 * Guía Interactiva para Obtener URLs de Railway
 * Paso a paso para extraer DATABASE_URL y REDIS_URL
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚂 OBTENER URLs DE RAILWAY');
  console.log('='.repeat(80) + '\n');

  console.log('Este script te guiará para obtener las URLs necesarias de Railway.\n');

  console.log('📋 REQUISITOS:\n');
  console.log('✓ Cuenta de Railway.app');
  console.log('✓ Proyecto "campo-saas" creado');
  console.log('✓ PostgreSQL Plugin instalado');
  console.log('✓ Redis Plugin instalado\n');

  const hasAccount = await question('¿Ya tienes una cuenta de Railway? (s/n): ');

  if (hasAccount.toLowerCase() !== 's') {
    console.log('\n1. Ve a https://railway.app');
    console.log('2. Sign up con GitHub o Email');
    console.log('3. Crea nuevo proyecto');
    console.log('4. Regresa aquí cuando esté listo\n');
    rl.close();
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('PASO 1: OBTENER DATABASE_URL');
  console.log('='.repeat(80) + '\n');

  console.log('Instrucciones:\n');
  console.log('1. Ve a: https://railway.app/dashboard');
  console.log('2. Selecciona tu proyecto "campo-saas"');
  console.log('3. Localiza el plugin "PostgreSQL"');
  console.log('4. Ve a la pestaña "Plugins"');
  console.log('5. En PostgreSQL, busca "Connection" o "URL"');
  console.log('6. Copia el valor que comienza con "postgresql://"\n');

  const dbUrl = await question('Pega la DATABASE_URL de Railway: ');

  if (!dbUrl.startsWith('postgresql://')) {
    console.log('\n⚠️ URL no válida. Debería empezar con "postgresql://"\n');
  } else {
    console.log('✅ DATABASE_URL válida\n');
  }

  console.log('\n' + '='.repeat(80));
  console.log('PASO 2: OBTENER REDIS_URL');
  console.log('='.repeat(80) + '\n');

  console.log('Instrucciones:\n');
  console.log('1. En el mismo proyecto de Railway');
  console.log('2. Localiza el plugin "Redis"');
  console.log('3. Ve a la pestaña "Connect"');
  console.log('4. Busca la variable REDIS_URL');
  console.log('5. Copia el valor que comienza con "redis://"\n');

  const redisUrl = await question('Pega la REDIS_URL de Railway: ');

  if (!redisUrl.startsWith('redis://')) {
    console.log('\n⚠️ URL no válida. Debería empezar con "redis://"\n');
  } else {
    console.log('✅ REDIS_URL válida\n');
  }

  console.log('\n' + '='.repeat(80));
  console.log('CONFIGURAR .env.production');
  console.log('='.repeat(80) + '\n');

  const fs = require('fs');
  const path = require('path');

  const envPath = path.join(process.cwd(), '.env.production');

  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Actualizar DATABASE_URL
    if (dbUrl.startsWith('postgresql://')) {
      envContent = envContent.replace(
        /DATABASE_URL=.*/,
        `DATABASE_URL=${dbUrl}`
      );
    }

    // Actualizar REDIS_URL
    if (redisUrl.startsWith('redis://')) {
      envContent = envContent.replace(
        /REDIS_URL=.*/,
        `REDIS_URL=${redisUrl}`
      );
    }

    // Guardar archivo actualizado
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Archivo .env.production actualizado\n');

    console.log('📋 VARIABLES CONFIGURADAS:');
    console.log(`   DATABASE_URL: ${dbUrl.substring(0, 50)}...`);
    console.log(`   REDIS_URL: ${redisUrl.substring(0, 50)}...\n`);
  }

  console.log('PRÓXIMO PASO: Sube las variables a Railway\n');

  console.log('1. Ve a: https://railway.app/dashboard');
  console.log('2. Proyecto → Settings → Environment');
  console.log('3. Copia estas variables:\n');

  console.log(`   DATABASE_URL=${dbUrl}\n`);
  console.log(`   REDIS_URL=${redisUrl}\n`);

  console.log('4. Pégalas en el "Environment"');
  console.log('5. Deploy automático comenzará\n');

  console.log('PARA VALIDAR:');
  console.log('   Ejecuta: node validate-env.js\n');

  console.log('=' .repeat(80) + '\n');

  rl.close();
}

main().catch(console.error);
