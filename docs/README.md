# SADERH — App Móvil
**Sistema de Gestión de Campo · Gobierno del Estado de Hidalgo**

---

## ✅ Instalación

```bash
rmdir /s /q node_modules
del package-lock.json
npm install --legacy-peer-deps
npx expo start --clear
```

**Código de acceso demo:** `00000` (exactamente 5 dígitos)

---

## 🔑 Versiones exactas (crítico)

Este proyecto usa las versiones que `expo doctor` indica para Expo SDK 55:

| Paquete | Versión | Nota |
|---------|---------|------|
| `expo` | ~55.0.0 | SDK base |
| `expo-router` | ~55.0.7 | Routing |
| `react` | 19.2.0 | Exacta |
| `react-native` | 0.83.2 | Exacta |
| `react-native-reanimated` | ~4.2.1 | Animaciones |

⚠️ **NO instalar:** `react-native-url-polyfill`, `@supabase/supabase-js` — causan error `PlatformConstants`

---

## 🔐 Autenticación

- **Método:** Código de acceso (5 dígitos exactos)
- **Token:** JWT validado con verificación de expiración
- **Almacenamiento:** `AsyncStorage` (desarrollo) o `expo-secure-store` (producción)
- **TTL configurado:** 30s antes de expiración

---

## 📡 Sincronización Offline

- **Cola máxima:** 100 items o 10MB
- **Expiración:** 7 días sin sincronizar
- **Caché:** Persistente en `AsyncStorage`
- **Auto-sync:** Cada 20 segundos cuando online

---

## ⚙️ Configuración Producción

Crea `.env` (copia `.env.example`):
```env
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_APP_API_URL=https://campo-api-app-campo-saas.up.railway.app
EXPO_PUBLIC_WEB_API_URL=https://campo-api-web-campo-saas.up.railway.app
EXPO_PUBLIC_SUPABASE_URL=https://gvuzyszsflujzinykqom.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-aqui
```

---

## 📁 Estructura

```
app/auth/splash.tsx           ← Animación entrada
app/auth/conexion.tsx         ← Config servidor (URL manual)
app/auth/login.tsx            ← PASO 1: Login 5 dígitos
app/tabs/dashboard.tsx        ← PASO 2: Lista asignaciones
app/tabs/alta-beneficiario.tsx ← PASO 2b: Agregar beneficiarios
app/tabs/informacion.tsx      ← Perfil + configuración
app/stack/detalle-asignacion  ← PASOS 3, 4, 5: Bitácora
lib/api.ts                    ← Todos los endpoints + sync

lib/responsive.ts             ← Responsividad multi-pantalla
constants/Colors.ts           ← Paleta guinda #8B0000
store/authStore.ts            ← Estado global (Zustand)
types/models.ts               ← Tipos TypeScript completos
```

---

## 🏗️ Compilar APK Android

```bash
npm install -g eas-cli && eas login
eas init  # Solo primera vez
eas build -p android --profile development   # APK desarrollo
eas build -p android --profile apk           # APK interno (instalable)
eas build -p android --profile production    # AAB para Play Store
```

---

## 🐛 Debugging y Diagnóstico

### Ver logs en tiempo real
```bash
npx expo start --clear
# Luego presionar 'a' para Android o 'i' para iOS
```

### Verificar estado de sincronización (código consola)
```javascript
// En el console del dev tools:
import AsyncStorage from '@react-native-async-storage/async-storage';
const stats = await AsyncStorage.getItem('@saderh:offline_queue');
console.log('Cola offline:', stats ? JSON.parse(stats).length : 0, 'items');
```

### Limpiar estado local (para testing)
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
// Limpiar todo
await AsyncStorage.clear();
// Refreshear app
```

### Verificar Tokens JWT
```javascript
const token = await AsyncStorage.getItem('@saderh:token');
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
console.log('Token payload:', payload);
console.log('Expira en:', new Date(payload.exp * 1000));
```

---

## ✅ Auditoría de Sistema (Marzo 2026)

### Estado Verificado
- ✅ **TypeScript:** Configuración correcta, sin errores de tipos
- ✅ **Autenticación:** JWT validado con expiración
- ✅ **API endpoints:** Todos mapeados correctamente
- ✅ **Sincronización offline:** Implementada y testeable
- ✅ **Permisos:** Android/iOS correctamente configurados
- ✅ **Validación de entrada:** Código exactamente 5 dígitos
- ✅ **offlineQueue:** Límites implementados (100 items, 10MB)

### Mejoras Realizadas
1. Fortalecida validación JWT (header, payload, signature)
2. Mejorado manejo de timeouts de red (20s)
3. Creada utilidad `secure-storage.ts` para tokens
4. Agregada expiración de items offline (7 días)
5. Implementados límites de cola offline
6. Corregida validación de códigos (5 dígitos exactos)
7. Eliminado archivo duplicado `gitingnore`

---

## 📋 Requerimientos de Red

| Endpoint | Timeout | Método |
|----------|---------|--------|
| `/auth/tecnico` | 20s | POST |
| `/mis-actividades` | 20s | GET |
| `/mis-beneficiarios` | 20s | GET |
| `/bitacoras` | 30s | POST |
| `/bitacoras/:id/fotos-*` | 30s | POST |
| `/sync` | 30s | POST |

---

## 🔗 URLs por Entorno

| Entorno | URL |
|---------|-----|
| Desarrollo | `https://campo-api-app-campo-saas.up.railway.app` |
| Producción | `https://campo-api-app-campo-saas.up.railway.app` |

**Nota:** Ambas apuntan al servidor Railway. Configurable en pantalla de conexión.

---

## 📞 Soporte Técnico

- **Coordinador:** Contactar para reset de código de acceso
- **API Down:** Usar modo offline, sincroniza automáticamente cuando regrese conexión
- **Token expirado:** Se limpia automáticamente tras logout
