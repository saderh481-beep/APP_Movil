# 🚀 Quick Start - SADERH App Móvil

## Instalación Rápida (5 minutos)

```bash
# 1. Instalar dependencias
npm install

# 2. Limpiar caché
npx expo start --clear

# 3. Escanear QR o presionar:
# - 'a' para Android Emulator
# - 'i' para iOS Simulator
```

## Login Inmediato

**Código de acceso demo:** `00000` (exactamente 5 dígitos)

---

## 📝 Uso de Validadores

```typescript
import { Validators } from '@/lib/validators';

// Validar código de acceso
const result = Validators.validateAccessCode('12345');
if (result.valid) {
  // Código válido
} else {
  console.log(result.error); // "El código debe tener exactamente 5 dígitos"
}

// Validar URL
const urlCheck = Validators.validateServerUrl('https://api.example.com');

// Validar JWT
const tokenCheck = Validators.validateJWT(token);
if (tokenCheck.valid) {
  console.log(tokenCheck.payload); // Acceder al payload
}
```

---

## 📊 Usar Sistema de Logging

```typescript
import { Logger, LogCategories } from '@/lib/logger';

// Log simple
Logger.info(LogCategories.AUTH, 'Usuario autenticado');

// Log con datos
Logger.warn(LogCategories.NETWORK, 'API lenta', { responseTime: 5000 });

// Log de error
Logger.error(LogCategories.API, 'Fallo en endpoint', error);

// Obtener historial de logs
const logs = Logger.getHistory();
const recentErrors = Logger.filter({ level: LogLevel.ERROR, since: new Date(Date.now() - 3600000) });

// Exportar para enviar a soporte
const report = Logger.export();
console.log(report); // JSON con timestamp y todos los logs
```

---

## 🔍 Ejecutar Diagnóstico

```typescript
import { Diagnostic } from '@/lib/diagnostic';

// Diagnóstico completo
const diag = await Diagnostic.runFullDiagnostic();
console.log('Estado del sistema:', diag.issues, diag.warnings);

// Generar reporte legible
const report = await Diagnostic.generateReport();
console.log(report);

/*
╔══════════════════════════════════════════════════════════════╗
║                   REPORTÉ DE DIAGNÓSTICO                    ║
║                        SADERH v1.0.0                         ║
╚══════════════════════════════════════════════════════════════╝

📱 DISPOSITIVO
  Brand: Samsung
  Model: SM-G991B
  OS: Android 13

🔧 APLICACIÓN
  Modo: Producción
  Storage: SecureStore (encrypted)

🌐 CONECTIVIDAD
  Online: ✅
  API Health: ✅

⏳ COLA OFFLINE
  Items pendientes: 5
  Tamaño: 2.34MB

✅ ESTADO: SISTEMA EN OPTIMAS CONDICIONES
*/
```

---

## 🔐 Almacenamiento Seguro

```typescript
import * as SecureStorage from '@/lib/secure-storage';

// Guardar token (encriptado en producción)
await SecureStorage.setItem('@app:token', myToken, true);

// Leer token
const token = await SecureStorage.getItem('@app:token', true);

// Información del storage
const info = SecureStorage.getStorageInfo();
console.log(info);
// { isDevelopment: false, useSecureStore: true, backendStorage: "SecureStore (encrypted)" }
```

---

## 📡 Sincronización Offline

```typescript
import { offlineQueue, syncApi } from '@/lib/api';

// Ver items pendientes
const pending = await offlineQueue.countPendingBitacoras();
console.log(`${pending} items pendientes`);

// Ver estadísticas
const stats = await offlineQueue.getStats();
console.log(stats);
// { count: 5, sizeMB: 2.34, config: {...} }

// Sincronizar manualmente
const result = await syncApi.sincronizarPendientes();
console.log(`Sincronizadas: ${result.sincronizadas}, Pendientes: ${result.pendientes}`);

// Verificar conectividad
const isOnline = await syncApi.healthCheck();
```

---

## 🔧 Comandos Útiles

```bash
# Limpiar caché y reinstalar
npm run start:clear

# Limpiar módulos
rm -rf node_modules && npm install

# Ver errores TypeScript
npx tsc --noEmit

# Test de compilación
npx tsc --strict --noEmit

# Build APK para testing
eas build -p android --profile development
```

---

## 🐛 Debugging en Consola

```javascript
// Ver token actual
const token = await AsyncStorage.getItem('@saderh:token');
console.log('Token:', token?.substring(0, 20) + '...');

// Ver usuario guardado
const usuario = await AsyncStorage.getItem('@saderh:usuario');
console.log('Usuario:', JSON.parse(usuario));

// Ver cola offline
const queue = await AsyncStorage.getItem('@saderh:offline_queue');
const items = JSON.parse(queue);
console.log(`${items.length} items en cola`);

// Limpiar completamente (⚠️ cuidado!)
await AsyncStorage.clear();
```

---

## 📱 Compilar para Producción

```bash
# Login en EAS
npm install -g eas-cli
eas login

# Configurar proyecto (primera vez)
eas init

# Compilar APK para Play Store
eas build -p android --profile production

# Compilar para testing interno
eas build -p android --profile apk
```

---

## 🎯 Flujo de Autenticación

1. **Pantalla de conexión** (`auth/conexion.tsx`)
   - Verifica conectividad al servidor
   - URL es configurable

2. **Login** (`auth/login.tsx`)
   - Ingresa código de 5 dígitos
   - Valida con `Validators.validateAccessCode()`
   - Token se guarda en SecureStore

3. **Dashboard** (`tabs/dashboard.tsx`)
   - Muestra lista de asignaciones
   - Sincroniza offline queue automáticamente
   - Health check cada 20 segundos

4. **Detalle Asignación** (`stack/detalle-asignacion.tsx`)
   - Crear bitácora
   - Adjuntar fotos
   - Guardar modo offline si no hay conexión

---

## 🔗 URLs de Configuración

| Entorno | URL |
|---------|-----|
| Producción | https://campo-api-app-campo-saas.up.railway.app |
| Desarrollo | Misma URL (configurable en pantalla de conexión) |

---

## 📞 Problemas Comunes

### "Token expirado"
→ Hacer logout y volver a login

### "Sin conexión"
→ Verificar WiFi
→ Revisar URL del servidor en pantalla de conexión
→ Ejecutar `Diagnostic.generateReport()`

### "App lenta en modo offline"
→ Normal - no hay caché de assets
→ Sincronizar cuando haya conexión

### "Código rechazado"
→ Debe ser exactamente 5 dígitos
→ Contactar coordinador para reset de código

---

## 📈 Próximas Auditorías

La próxima auditoría está programada para:
- **Fecha sugerida:** Dentro de 6 meses
- **Puntos a revisar:** Performance, nuevas deps, cambios de Expo

Usar este archivo como baseline de comparación.

---

**Última actualización:** 24 de marzo de 2026  
**Versión del proyecto:** 1.0.0  
**Estado:** Producción
