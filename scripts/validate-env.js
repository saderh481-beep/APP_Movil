#!/usr/bin/env node

/**
 * Validador de Variables de Entorno
 * Verifica que todas las variables necesarias estén configuradas correctamente
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('✅ VALIDADOR DE VARIABLES DE ENTORNO');
console.log('='.repeat(80) + '\n');

// Leer .env.production
const envPath = path.join(process.cwd(), '.env.production');

if (!fs.existsSync(envPath)) {
  console.log('❌ No se encontró .env.production');
  console.log('   Ejecutar primero: node generate-env.js\n');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

// Parsear archivo .env
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match && !line.startsWith('#')) {
    const key = match[1].trim();
    const value = match[2].trim();
    if (key && value) {
      envVars[key] = value;
    }
  }
});

// Variables requeridas
const REQUIRED_VARS = {
  DATABASE_URL: { 
    pattern: /^postgresql:\/\//, 
    description: 'Conexión a PostgreSQL' 
  },
  REDIS_URL: { 
    pattern: /^redis:\/\//, 
    description: 'Conexión a Redis' 
  },
  JWT_SECRET: { 
    pattern: /.{20,}/, 
    description: 'Clave JWT (al menos 20 caracteres)' 
  },
  CLOUDINARY_CLOUD_NAME: { 
    pattern: /^[a-z]+$/, 
    description: 'Cloud name de Cloudinary' 
  },
};

const OPTIONAL_VARS = {
  CLOUDINARY_API_KEY: 'API Key de Cloudinary',
  CLOUDINARY_API_SECRET: 'API Secret de Cloudinary',
  CLOUDINARY_PRESET_IMAGENES: 'Preset para imágenes',
  CLOUDINARY_PRESET_DOCS: 'Preset para documentos',
  PORT: 'Puerto del servidor',
  NODE_ENV: 'Ambiente (production/development)',
};

console.log('🔍 VALIDANDO VARIABLES REQUERIDAS\n');

let allPassed = true;
let criticErrors = 0;

// Validar variables requeridas
for (const [varName, config] of Object.entries(REQUIRED_VARS)) {
  const value = envVars[varName];
  
  if (!value) {
    console.log(`❌ ${varName.padEnd(30)} - NO CONFIGURADA`);
    console.log(`   └─ ${config.description}`);
    allPassed = false;
    criticErrors++;
  } else if (!config.pattern.test(value)) {
    console.log(`⚠️ ${varName.padEnd(30)} - FORMATO INVÁLIDO`);
    console.log(`   └─ Valor: ${value.substring(0, 50)}...`);
    console.log(`   └─ ${config.description}`);
    allPassed = false;
  } else {
    console.log(`✅ ${varName.padEnd(30)} - OK`);
    if (varName === 'JWT_SECRET') {
      console.log(`   └─ Longitud: ${value.length} caracteres`);
    }
  }
}

console.log('\n🔍 VALIDANDO VARIABLES OPCIONALES\n');

for (const [varName, description] of Object.entries(OPTIONAL_VARS)) {
  const value = envVars[varName];
  
  if (!value || value.includes('tu-')) {
    console.log(`⚠️ ${varName.padEnd(30)} - NO CONFIGURADA`);
    console.log(`   └─ ${description}`);
  } else {
    console.log(`✅ ${varName.padEnd(30)} - OK`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('📊 RESUMEN DE VALIDACIÓN');
console.log('='.repeat(80) + '\n');

if (criticErrors > 0) {
  console.log(`❌ ${criticErrors} VARIABLE(S) CRÍTICA(S) SIN CONFIGURAR\n`);
  console.log('PASOS A SEGUIR:\n');
  
  console.log('1️⃣ CONFIGURAR DATABASE_URL (Requerido)');
  console.log('   ├─ Ir a: https://railway.app/dashboard');
  console.log('   ├─ Seleccionar: PostgreSQL Plugin');
  console.log('   ├─ Copiar: Railway Provided URL');
  console.log('   └─ Pegar en .env.production: DATABASE_URL=<URL>\n');

  console.log('2️⃣ CONFIGURAR REDIS_URL (Requerido)');
  console.log('   ├─ Ir a: https://railway.app/dashboard');
  console.log('   ├─ Seleccionar: Redis Plugin');
  console.log('   ├─ Copiar: Redis URL');
  console.log('   └─ Pegar en .env.production: REDIS_URL=<URL>\n');

  console.log('3️⃣ GENERAR JWT_SECRET (Ya está en el archivo)');
  console.log('   └─ Si necesitas regenerar: node generate-env.js\n');

  console.log('4️⃣ VALIDAR NUEVAMENTE');
  console.log('   └─ Ejecutar: node validate-env.js\n');

  console.log('5️⃣ DESPUÉS DE VALIDAR TODO');
  console.log('   ├─ Copiar cada variable de .env.production');
  console.log('   ├─ Ir a Railway → Project → Enviroment');
  console.log('   ├─ Agregar cada variable en Railway');
  console.log('   └─ Deploy automático\n');
} else {
  console.log('✅ TODAS LAS VARIABLES ESTÁN CORRECTAMENTE CONFIGURADAS\n');
  console.log('PRÓXIMO PASO: Subir variables a Railway\n');
  console.log('1. Ir a https://railway.app/dashboard');
  console.log('2. Proyecto → Settings → Environment');
  console.log('3. Agregar cada variable');
  console.log('4. Deploy automático\n');
}

console.log('=' .repeat(80) + '\n');

// Mostrar archivo actual
console.log('📄 ARCHIVO ACTUAL (.env.production):\n');
console.log(envContent.split('\n').map((line, i) => {
  if (line.startsWith('#')) return line;
  if (!line.includes('=')) return line;
  const [key, val] = line.split('=');
  if (val.includes('REEMPLAZA') || val.includes('tu-')) {
    return `${key}=⚠️ REQUIERE CONFIGURACIÓN`;
  }
  if (val.length > 40) {
    return `${key}=${val.substring(0, 40)}...`;
  }
  return line;
}).join('\n'));

console.log('\n' + '=' .repeat(80) + '\n');
