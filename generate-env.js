#!/usr/bin/env node

/**
 * Generador de variables de entorno seguras
 * Uso: node generate-env.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('🔐 GENERADOR DE VARIABLES DE ENTORNO SEGURAS');
console.log('='.repeat(80) + '\n');

// Generar JWT_SECRET seguro
function generateJWTSecret() {
  return crypto.randomBytes(64).toString('base64');
}

// Plantilla de .env
const envTemplate = `# ===============================================
# VARIABLES DE ENTORNO - BACKEND API APP
# ===============================================

# Base de datos PostgreSQL
# Formato: postgresql://usuario:contraseña@host:puerto/nombre_bd
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/saderh_db

# Redis para sesiones
# Formato: redis://[:contraseña@]host:puerto[/db]
REDIS_URL=redis://localhost:6379

# JWT Secret (Clave para firmar tokens)
# Generada: ${generateJWTSecret()}
JWT_SECRET=${generateJWTSecret()}

# Cloudinary (Para subir imágenes/PDFs)
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
CLOUDINARY_PRESET_IMAGENES=campo_imagenes
CLOUDINARY_PRESET_DOCS=campo_docs

# Servidor
PORT=3002
NODE_ENV=production

# ===============================================
# NOTAS IMPORTANTES:
# ===============================================
# 1. DATABASE_URL: En Railway, copiar de la sección PostgreSQL
# 2. REDIS_URL: En Railway, copiar de la sección Redis
# 3. JWT_SECRET: YA ESTÁ GENERADO ARRIBA (no cambiar)
# 4. CLOUDINARY_*: Obtener de https://cloudinary.com
# 5. NODE_ENV: Cambiar a 'development' para debugging
`;

console.log('📋 GENERADOR DE .env\n');
console.log('Esto generará un archivo .env con valores seguros.\n');

// Mostrar qué se va a generar
console.log('✅ JWT_SECRET (generado automáticamente):');
const jwtSecret = generateJWTSecret();
console.log(`   ${jwtSecret.substring(0, 50)}...\n`);

// Preguntar dónde guardar
const basePath = process.cwd();
const envPath = path.join(basePath, '.env.production');

console.log(`📁 Ubicación: ${envPath}\n`);

// Crear archivo
fs.writeFileSync(envPath, envTemplate);

console.log('✅ Archivo .env.production creado exitosamente!\n');

console.log('📝 INSTRUCCIONES DE CONFIGURACIÓN:\n');

console.log('PASO 1: Configurar Database (PostgreSQL)');
console.log('────────────────────────────────────────');
console.log('1. Ir a Railway Dashboard → PostgreSQL');
console.log('2. Copiar "Railway Provided URL"');
console.log('3. En .env.production, reemplazar DATABASE_URL');
console.log('   Ejemplo: postgresql://user:pass@host:5432/db\n');

console.log('PASO 2: Configurar Redis');
console.log('────────────────────────');
console.log('1. Ir a Railway Dashboard → Redis');
console.log('2. Copiar Redis URL');
console.log('3. En .env.production, reemplazar REDIS_URL');
console.log('   Ejemplo: redis://default:pass@host:6379\n');

console.log('PASO 3: Cloudinary (Opcional pero recomendado)');
console.log('──────────────────────────────────────────────');
console.log('1. Ir a https://cloudinary.com');
console.log('2. Crear cuenta o login');
console.log('3. Copiar Cloud Name, API Key, API Secret');
console.log('4. Reemplazar en CLOUDINARY_*\n');

console.log('PASO 4: Validar Configuración');
console.log('──────────────────────────────');
console.log('Ejecutar después de configurar:');
console.log('   node validate-env.js\n');

console.log('PASO 5: Deploy en Railway');
console.log('─────────────────────────');
console.log('1. Copiar variables de .env.production');
console.log('2. Ir a Railway → Project → Variables');
console.log('3. Agregar cada variable');
console.log('4. Deploy automático\n');

console.log('✨ VALIDACIÓN AUTOMÁTICA');
console.log('────────────────────────');
console.log('Después de configurar, ejecuta:');
console.log('   node validate-env.js');
console.log('\nEsto verificará que:');
console.log('   ✓ Variables están definidas');
console.log('   ✓ Formatos son válidos');
console.log('   ✓ Conexiones funcionan\n');

console.log('=' .repeat(80) + '\n');

console.log('✅ .env.production generado en:', envPath);
console.log('\n⚠️  IMPORTANTE: No compartir este archivo en Git!');
console.log('   Añadir a .gitignore: .env.production\n');

console.log('=' .repeat(80) + '\n');
