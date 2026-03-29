#!/usr/bin/env node

/**
 * GUÍA COMPLETA: EJECUTAR EXPO Y INICIAR SESIÓN
 * Instrucciones paso a paso para Android/iOS/Web
 */

console.log('\n' + '═'.repeat(80));
console.log('📱 GUÍA COMPLETA: EJECUTAR EXPO START');
console.log('═'.repeat(80) + '\n');

console.log('⏱️  TIEMPO ESTIMADO: 3-5 minutos\n');

console.log('═'.repeat(80));
console.log('PASO 1: Verificar Dependencias');
console.log('═'.repeat(80) + '\n');

console.log('Asegúrate de tener instalado:\n');
console.log('  ✓ Node.js (v18+)');
console.log('  ✓ npm o yarn');
console.log('  ✓ Expo CLI: npm install -g expo-cli\n');

console.log('Verifica:\n');
console.log('  $ node --version  (debe ser v18 o mayor)');
console.log('  $ npm --version\n');

console.log('═'.repeat(80));
console.log('PASO 2: Instalar Dependencias del Proyecto');
console.log('═'.repeat(80) + '\n');

console.log('Si es la primera vez:\n');
console.log('  cd c:\\Users\\black\\saderh-app');
console.log('  npm install\n');

console.log('El proceso tardará 2-3 minutos\n');

console.log('═'.repeat(80));
console.log('PASO 3: Verifica tu .env Local (Importante)');
console.log('═'.repeat(80) + '\n');

console.log('Abre c:\\Users\\black\\saderh-app\\.env y verifica:\n');

console.log('  EXPO_PUBLIC_DEMO_MODE=false');
console.log('  ↓');
console.log('  EXPO_PUBLIC_APP_API_URL=https://campo-api-app-campo-saas.up.railway.app\n');

console.log('Si DEMO_MODE=true, cambia a false\n');

console.log('═'.repeat(80));
console.log('PASO 4: Ejecutar Expo Start');
console.log('═'.repeat(80) + '\n');

console.log('En la terminal de VS Code o PowerShell:\n');

console.log('  cd c:\\Users\\black\\saderh-app');
console.log('  npx expo start\n');

console.log('Verás una salida como esta:\n');

console.log('  ┌──────────────────────────────────────────┐');
console.log('  │  Expo Go                                 │');
console.log('  │  https://expo.dev/                       │');
console.log('  │                                          │');
console.log('  │  [QR CODE]                               │');
console.log('  │                                          │');
console.log('  │  Scan QR code above ↑                    │');
console.log('  └──────────────────────────────────────────┘');
console.log('  \n  › Metro waiting on exp://192.168.x.x:8000\n');

console.log('═'.repeat(80));
console.log('PASO 5: Abrir en tu Dispositivo');
console.log('═'.repeat(80) + '\n');

console.log('OPCIÓN A: Android (Expo Go)');
console.log('─'.repeat(40));
console.log('  1. Abre "Expo Go" en tu teléfono Android');
console.log('  2. Haz clic: "Scan QR code"');
console.log('  3. Escanea el QR que aparece en la terminal');
console.log('  4. La app cargará automáticamente\n');

console.log('OPCIÓN B: iOS (Expo Go)');
console.log('─'.repeat(40));
console.log('  1. Abre "Expo Go" en tu iPhone');
console.log('  2. Haz clic: "Scan QR code" (iOS 11+)');
console.log('  3. Escanea el QR que aparece en la terminal');
console.log('  4. La app cargará automáticamente\n');

console.log('OPCIÓN C: Web (en tu laptop)');
console.log('─'.repeat(40));
console.log('  1. En la terminal, presiona: w');
console.log('  2. Se abre automáticamente en el navegador');
console.log('  3. http://localhost:8081 en Chrome/Firefox\n');

console.log('═'.repeat(80));
console.log('PASO 6: Iniciar Sesión');
console.log('═'.repeat(80) + '\n');

console.log('Cuando la app cargue:\n');

console.log('  1. Verás la pantalla de login (o splash)');
console.log('  2. Ingresa tu código de 5 dígitos');
console.log('     └─ Ej: 12345 (o el que te proporcionen)\n');

console.log('  3. Presiona: "INICIAR SESIÓN"');
console.log('     └─ La app contactará al servidor\n');

console.log('  4. Espera 2-5 segundos:');
console.log('     └─ ✅ Si funciona: Acceso a Dashboard');
console.log('     └─ ❌ Si da error: Ver sección "Si Algo Falla"\n');

console.log('  5. Verás el Dashboard con:');
console.log('     └─ ✓ Alta de Beneficiario');
console.log('     └─ ✓ Informacion');
console.log('     └─ ✓ Bitácora (si hay permisos)\n');

console.log('═'.repeat(80));
console.log('TIPS IMPORTANTES');
console.log('═'.repeat(80) + '\n');

console.log('🔥 Hot Reload (Cambios en vivo)');
console.log('─'.repeat(40));
console.log('  • Si cambias código en VS Code');
console.log('  • La app se recarga automáticamente');
console.log('  • Presiona: r (en terminal) para reload manual\n');

console.log('🛑 Si se cuelga');
console.log('─'.repeat(40));
console.log('  • En terminal: Ctrl+C para detener');
console.log('  • Ejecuta de nuevo: npx expo start\n');

console.log('📡 Ver Logs');
console.log('─'.repeat(40));
console.log('  • Los logs de la app aparecen en la terminal');
console.log('  • Así puedes ver si hay errores\n');

console.log('═'.repeat(80));
console.log('🚨 SI ALGO FALLA');
console.log('═'.repeat(80) + '\n');

console.log('ERROR: "Cannot find module..."');
console.log('─'.repeat(40));
console.log('  Solución:\n');
console.log('    cd c:\\Users\\black\\saderh-app');
console.log('    rm -r node_modules');
console.log('    npm install\n');

console.log('ERROR: "EACCES: permission denied"');
console.log('─'.repeat(40));
console.log('  Solución:\n');
console.log('    npm cache clean --force');
console.log('    npm install\n');

console.log('ERROR: "Port 8081 already in use"');
console.log('─'.repeat(40));
console.log('  Solución:\n');
console.log('    npx expo start --port 8090');
console.log('    (o usa otro número de puerto)\n');

console.log('ERROR: QR Code no aparece');
console.log('─'.repeat(40));
console.log('  Solución:\n');
console.log('    • Verifica conexión de red');
console.log('    • Presiona: q (en terminal) para ver URL');
console.log('    • Copia la URL y pega en Expo Go\n');

console.log('ERROR: Login sigue dando error de conexión');
console.log('─'.repeat(40));
console.log('  Solución:\n');
console.log('    • Verifica: node validate-api.js');
console.log('    • Railway aún podría estar desplegando');
console.log('    • Espera 5 minutos más\n');

console.log('═'.repeat(80));
console.log('✅ ESTADO ACTUAL DEL SISTEMA');
console.log('═'.repeat(80) + '\n');

console.log('  ✅ App móvil: Lista para ejecutar');
console.log('  ✅ TypeScript: 0 errores');
console.log('  ✅ API Client: Configurado');
console.log('  ✅ Autenticación: Implementada\n');

console.log('  ⏳ Backend: Esperando variables en Railway');
console.log('     └─ Verifica: node validate-api.js\n');

console.log('═'.repeat(80));
console.log('📞 COMANDOS ÚTILES');
console.log('═'.repeat(80) + '\n');

console.log('# Ejecutar Expo');
console.log('npx expo start\n');

console.log('# Ejecutar en Web (presiona w en terminal)');
console.log('npx expo start --web\n');

console.log('# Ejecutar en Android (si tienes Android Studio)');
console.log('npx expo start --android\n');

console.log('# Ejecutar en iOS (si tienes Xcode en Mac)');
console.log('npx expo start --ios\n');

console.log('# Resetear todo');
console.log('npm install && npx expo start\n');

console.log('═'.repeat(80));
console.log('🎉 ¡LISTO PARA COMENZAR!');
console.log('═'.repeat(80) + '\n');

console.log('Ejecuta ahora en terminal:\n');
console.log('  $ npx expo start\n');

console.log('Luego escanea el QR con Expo Go en tu teléfono\n');

console.log('═'.repeat(80) + '\n');
