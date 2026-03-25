#!/usr/bin/env node

/**
 * GUÍA VISUAL: AGREGAR VARIABLES A RAILWAY
 * Instrucciones paso a paso con ejemplos visuales
 */

console.log('\n' + '═'.repeat(80));
console.log('🚀 GUÍA: AGREGAR VARIABLES A RAILWAY ENVIRONMENT');
console.log('═'.repeat(80) + '\n');

console.log('⏱️  TIEMPO ESTIMADO: 5 minutos\n');

console.log('📋 PASO 1: Abrir Railway Dashboard');
console.log('─'.repeat(80));
console.log('1. Ve a: https://railway.app/dashboard');
console.log('2. Log in con tu cuenta (GitHub o Email)');
console.log('3. Verás tus proyectos\n');

console.log('📋 PASO 2: Seleccionar Proyecto');
console.log('─'.repeat(80));
console.log('1. Busca: "campo-saas" (o tu proyecto)');
console.log('2. Haz clic para abrirlo\n');

console.log('📋 PASO 3: Ir a Variables de Entorno');
console.log('─'.repeat(80));
console.log('En el proyecto, busca una de estas opciones:');
console.log('  └─ Settings → Environment');
console.log('  └─ Settings → Environment Variables');
console.log('  └─ Environment tab en la parte superior\n');

console.log('📋 PASO 4: Agregar Variables (UNA POR UNA)');
console.log('─'.repeat(80));
console.log('Para cada variable:\n');

console.log('┌─ VARIABLE 1: DATABASE_URL');
console.log('├─ Key: DATABASE_URL');
console.log('├─ Value: (copia abajo completa)');
console.log('├─ postgresql://postgres:knoayZQlVchOwjbIsrndCGBPpSqzvDzY@caboose.');
console.log('│  proxy.rlwy.net:21223/railway');
console.log('└─ Haz clic: ADD o SAVE\n');

console.log('┌─ VARIABLE 2: REDIS_URL');
console.log('├─ Key: REDIS_URL');
console.log('├─ Value: (copia abajo completa)');
console.log('├─ redis://default:SdekIELQIOJNBXLIUXHgDfHQhfqSwgqU@mainline.');
console.log('│  proxy.rlwy.net:26908');
console.log('└─ Haz clic: ADD o SAVE\n');

console.log('┌─ VARIABLE 3: JWT_SECRET');
console.log('├─ Key: JWT_SECRET');
console.log('├─ Value: (copia abajo completa)');
console.log('├─ x48Ii2AgVJHKS9Z2xS68H20jFquFZGnkgvpctbvNpHc5kWpJcznafj2FIxat');
console.log('│  7eYxu0Xnwa3VjZtn6g6V5of7FQ==');
console.log('└─ Haz clic: ADD o SAVE\n');

console.log('┌─ VARIABLE 4: PORT');
console.log('├─ Key: PORT');
console.log('├─ Value: 3002');
console.log('└─ Haz clic: ADD o SAVE\n');

console.log('┌─ VARIABLE 5: NODE_ENV');
console.log('├─ Key: NODE_ENV');
console.log('├─ Value: production');
console.log('└─ Haz clic: ADD o SAVE\n');

console.log('📋 PASO 5: Confirmar Variables');
console.log('─'.repeat(80));
console.log('Después de agregar todas, deberías ver:\n');

console.log('  ✓ DATABASE_URL');
console.log('  ✓ REDIS_URL');
console.log('  ✓ JWT_SECRET');
console.log('  ✓ PORT');
console.log('  ✓ NODE_ENV\n');

console.log('📋 PASO 6: Deploy Automático');
console.log('─'.repeat(80));
console.log('Railway iniciará automáticamente el deploy:');
console.log('  • Verás un "Build" en progreso');
console.log('  • Tarda 2-5 minutos');
console.log('  • Status pasará de naranja a verde ✅\n');

console.log('📋 PASO 7: Validar Todo Funciona');
console.log('─'.repeat(80));
console.log('Cuando el deploy termine (status verde), ejecuta:\n');
console.log('  node validate-api.js\n');

console.log('Deberías ver:\n');
console.log('  ✅ GET /health [200]');
console.log('  ✅ POST /auth/tecnico [401] ← YA NO 503!');
console.log('  ✅ GET /mis-beneficiarios [401]');
console.log('  ✅ GET /mis-actividades [401]');
console.log('  ✅ GET /cadenas-productivas [401]');
console.log('  ✅ GET /bitacoras [401]');
console.log('  ✅ GET /notificaciones [401]\n');

console.log('═'.repeat(80));
console.log('🎯 VALORES EXACTOS PARA COPIAR Y PEGAR');
console.log('═'.repeat(80) + '\n');

console.log('1️⃣ DATABASE_URL:');
console.log('─'.repeat(80));
console.log('postgresql://postgres:knoayZQlVchOwjbIsrndCGBPpSqzvDzY@caboose.proxy.rlwy.net:21223/railway\n');

console.log('2️⃣ REDIS_URL:');
console.log('─'.repeat(80));
console.log('redis://default:SdekIELQIOJNBXLIUXHgDfHQhfqSwgqU@mainline.proxy.rlwy.net:26908\n');

console.log('3️⃣ JWT_SECRET:');
console.log('─'.repeat(80));
console.log('x48Ii2AgVJHKS9Z2xS68H20jFquFZGnkgvpctbvNpHc5kWpJcznafj2FIxat7eYxu0Xnwa3VjZtn6g6V5of7FQ==\n');

console.log('4️⃣ PORT:');
console.log('─'.repeat(80));
console.log('3002\n');

console.log('5️⃣ NODE_ENV:');
console.log('─'.repeat(80));
console.log('production\n');

console.log('═'.repeat(80));
console.log('⚠️  IMPORTANTE');
console.log('═'.repeat(80) + '\n');

console.log('✓ Copia cada valor EXACTAMENTE como aparece arriba');
console.log('✓ No agregues espacios extra');
console.log('✓ No cambies mayúsculas/minúsculas');
console.log('✓ Railway es case-sensitive\n');

console.log('═'.repeat(80));
console.log('📞 SI ALGO FALLA');
console.log('═'.repeat(80) + '\n');

console.log('Si después del deploy sigue dando 503:\n');
console.log('  1. Ve al proyecto en Railway');
console.log('  2. Haz clic en el servicio (backend)');
console.log('  3. Ve a "Deployments"');
console.log('  4. Haz clic en el último deployment');
console.log('  5. Mira la sección "Logs"');
console.log('  6. Busca errores de conexión\n');

console.log('═'.repeat(80) + '\n');
