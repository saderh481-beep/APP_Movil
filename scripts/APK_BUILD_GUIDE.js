#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('📱 GUÍA COMPLETA: EXPORTAR APK CON EAS BUILD');
console.log('='.repeat(80) + '\n');

// Verificar archivos necesarios
console.log('✅ VERIFICANDO CONFIGURACIÓN...\n');

const archivos = [
  { nombre: 'eas.json', ruta: './eas.json', descripcion: 'Configuración de EAS' },
  { nombre: 'app.json', ruta: './app.json', descripcion: 'Configuración de Expo' },
  { nombre: 'package.json', ruta: './package.json', descripcion: 'Dependencias' },
  { nombre: 'tsconfig.json', ruta: './tsconfig.json', descripcion: 'TypeScript' }
];

archivos.forEach(archivo => {
  const existe = fs.existsSync(archivo.ruta);
  console.log(`${existe ? '✓' : '✗'} ${archivo.nombre.padEnd(20)} - ${archivo.descripcion}`);
});

console.log('\n' + '='.repeat(80));
console.log('📋 PASO 1: VERIFICAR CREDENCIALES');
console.log('='.repeat(80) + '\n');

console.log(`
Necesitas estar autenticado con tu cuenta de Expo/EAS.

Ejecuta:
  eas login

Se abrirá el navegador. Inicia sesión con tu cuenta:
  • Email: Tu correo de Expo
  • Contraseña: Tu contraseña de Expo

Si no tienes cuenta:
  Crear una en: https://expo.dev/signup
`);

console.log('\n' + '='.repeat(80));
console.log('🔧 PASO 2: INSTALAR DEPENDENCIAS');
console.log('='.repeat(80) + '\n');

console.log(`
Ejecuta en la terminal:
  npm install

Esto instala todas las dependencias necesarias.
`);

console.log('\n' + '='.repeat(80));
console.log('🏗️  PASO 3: COMPILAR EL APK');
console.log('='.repeat(80) + '\n');

console.log(`
Para compilar un APK para pruebas (RECOMENDADO PRIMERO):

  eas build --platform android --profile apk

Parámetros importantes:
  • --platform android    : Compila solo para Android
  • --profile apk         : Usa la configuración "apk" de eas.json
  • Sin --wait           : Puedes cerrar la terminal mientras se compila
  • --wait                : Espera a que termine (puede tomar 10-20 minutos)

Salida esperada:
  ✅ Build iniciado en EAS
  ✅ Se te proporciona una URL para monitorear el progreso
  ✅ Cuando termine, recibirás un enlace para descargar el APK


ALTERNATIVAS:

1. Para producción (App Bundle para Google Play Store):
   eas build --platform android --profile production

2. Para desarrollo con debugger:
   eas build --platform android --profile development

3. Para vista previa rápida:
   eas build --platform android --profile preview
`);

console.log('\n' + '='.repeat(80));
console.log('📥 PASO 4: DESCARGAR Y PROBAR EL APK');
console.log('='.repeat(80) + '\n');

console.log(`
Una vez que EAS termine la compilación:

1. La URL del APK aparecerá en la terminal
2. Descarga el APK en tu computadora
3. Transfiere a tu dispositivo Android o emulador

Para instalar en emulador:
  adb install /ruta/al/SADERH.apk

Para instalar en dispositivo físico:
  • Transfiere el APK al dispositivo
  • Toca el archivo para instalar
  • Acepta permisos

Para instalar desde tu PC (con USB):
  adb install /ruta/descargas/SADERH.apk


VERIFICAR EN DISPOSITIVO:
✅ Abre la app SADERH
✅ Inicia sesión con código: 12345 (o cualquier código válido)
✅ Verifica que se muestre el dashboard
✅ Prueba diferentes funciones
`);

console.log('\n' + '='.repeat(80));
console.log('🚀 MONITOREO DEL BUILD');
console.log('='.repeat(80) + '\n');

console.log(`
Durante la compilación, puedes:

1. Ver el progreso en tiempo real:
   eas build --platform android --profile apk --monitor

2. Ver builds anteriores:
   eas build:list

3. Descargar APK de builds anteriores:
   eas build:view <BUILD_ID>

4. Cancelar un build en progreso:
   Presiona Ctrl+C en la terminal (si usaste --wait)
   O desde: https://dash.expo.dev/projects
`);

console.log('\n' + '='.repeat(80));
console.log('⚙️  TROUBLESHOOTING COMÚN');
console.log('='.repeat(80) + '\n');

console.log(`
❌ Error: "No account found"
   → Ejecuta: eas login

❌ Error: "Port already in use"
   → Cierra otras instancias de React Native

❌ Error: "Build failed - dependency issue"
   → Ejecuta: npm install
   → Luego: npm cache clean --force

❌ Build lento
   → Es normal. EAS necesita compilar la app
   → Tiempo típico: 10-20 minutos

❌ APK muy grande (>100MB)
   → Normal para React Native + todas las dependencias
   → Reduce con: eas build --profile production


REVISAR LOGS:
  eas build:logs <BUILD_ID>
`);

console.log('\n' + '='.repeat(80));
console.log('✅ RESUMEN DE COMANDOS');
console.log('='.repeat(80) + '\n');

console.log(`
# Autenticarse
eas login

# Instalar dependencias
npm install

# Compilar APK (RECOMENDADO PRIMERO - para pruebas)
eas build --platform android --profile apk --wait

# Compilar para producción (Google Play Store)
eas build --platform android --profile production --wait

# Ver lista de builds
eas build:list

# Ver APK de build anterior
eas build:download <BUILD_ID>

# Monitorear build en progreso
eas build:logs <BUILD_ID>
`);

console.log('\n' + '='.repeat(80));
console.log('💡 TIPS IMPORTANTES');
console.log('='.repeat(80) + '\n');

console.log(`
1. ✅ Primero compila con --profile apk (más rápido, para pruebas)
2. ✅ Espera a que el build termine antes de cerrar terminal
3. ✅ Guarda el APK en una carpeta segura (para redistribución)
4. ✅ Verifica que el backend API esté activo antes de probar
5. ✅ Abre el APK en múltiples dispositivos para testing
6. ✅ Los siguientes builds serán más rápidos
7. ✅ No necesitas abrir VS Code durante la compilación


CREDENCIALES EN LA APP:
  Backend URL: https://campo-api-app-campo-saas.up.railway.app
  Usuarios: Usa códigos de 5 dígitos registrados en BD
  Ejemplo: 12345, 48165, 61853 (técnicos de prueba)
`);

console.log('\n' + '='.repeat(80));
console.log('🎉 ¡LISTO PARA COMPILAR!');
console.log('='.repeat(80) + '\n');

process.exit(0);
