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

Login demo: **`00000`**

---

## 🔑 Versiones exactas (crítico)

Este proyecto usa las versiones que `expo doctor` indica para Expo SDK 55:

| Paquete | Versión |
|---------|---------|
| `expo` | ~55.0.0 |
| `expo-router` | ~55.0.7 |
| `react` | 19.2.0 |
| `react-native` | 0.83.2 |
| `react-native-reanimated` | ~4.2.1 |

**NO instalar** `react-native-url-polyfill` ni `@supabase/supabase-js` en el cliente — causan el error `PlatformConstants`.

---

## ⚙️ Producción

Crea `.env` (copia `.env.example`):
```env
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_APP_API_URL=https://campo-api-app-campo-saas.up.railway.app
EXPO_PUBLIC_WEB_API_URL=https://campo-api-web-campo-saas.up.railway.app
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-aqui
```

---

## 📁 Estructura

```
app/auth/splash.tsx           ← Animación entrada
app/auth/conexion.tsx         ← Config servidor
app/auth/login.tsx            ← PASO 1: Login 5 dígitos
app/tabs/dashboard.tsx        ← PASO 2: Lista visitas
app/tabs/alta-beneficiario.tsx
app/tabs/informacion.tsx      ← Perfil + config
app/stack/detalle-asignacion  ← PASOS 3, 4 y 5
lib/api.ts                    ← Todos los endpoints
lib/demoData.ts               ← Datos demo
constants/Colors.ts           ← Paleta guinda #621132
```

---

## 🏗️ APK Android

```bash
npm install -g eas-cli && eas login
eas init
eas build -p android --profile apk          # APK interno (instalable)
eas build -p android --profile production   # AAB para Play Store
```
