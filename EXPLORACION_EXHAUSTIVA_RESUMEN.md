# 📊 EXPLORACIÓN EXHAUSTIVA - SADERH APP

**Generado:** 25 de marzo de 2026  
**Duración de análisis:** Profundo y detallado  
**Archivos analizados:** 50+  

---

## 🎯 RESUMEN EJECUTIVO

### Proyecto: SADERH App - Aplicación Móvil de Auditoría Rural

**Estado de Offline-Ready:** 🟡 **6.5/10** - PARCIALMENTE FUNCIONAL

| Aspecto | Status | Comentario |
|---------|--------|-----------|
| Detección de conexión | ✅ OK | Health check cada 20s |
| Cola offline | ✅ OK | 500 items, 50MB, 7 días |
| Sincronización automática | ✅ OK | Cuando vuelve conexión |
| Autenticación | ✅ OK | JWT con validación rigurosa |
| Almacenamiento de archivos | ✅ OK | AsyncStorage + expo-file-system |
| **Base de datos local** | ❌ FALTA | CRÍTICO: Solo AsyncStorage |
| Sincronización incremental | 🟡 PARCIAL | Existe delta, pero no persiste |
| Resolución de conflictos | ❌ FALTA | Riesgo de sobrescribir datos |
| Compresión de datos | ❌ FALTA | 50MB se llena rápido |
| Métricas de sync | 🟡 BÁSICO | Solo health check |

---

## 1️⃣ ARQUITECTURA GENERAL

### Stack Tecnológico

```
FRONTEND (React Native + Expo)
├── React Native 0.83.2
├── Expo Router 55.0.7
├── Zustand (estado global)
├── AsyncStorage (persistencia)
├── expo-secure-store (tokens)
├── expo-file-system (archivos)
└── Fetch API nativa

BACKEND (Inferido)
├── Node.js/Express (probablemente)
├── PostgreSQL (base de datos)
├── Redis (sesiones/cache)
└── Railway.app (hosting)

API BASE
└── https://campo-api-app-campo-saas.up.railway.app
```

### Estructura de Pantallas

```
Splash → ¿Sesión? →┐
                   ├─→ Conexión (seleccionar URL)
                   │       ↓
                   └─→ Login (código 5 dígitos)
                       ↓
DASHBOARD: 3 tabs
├── 📋 Visitas      (GET /mis-actividades)
├── 👤 Beneficiario (POST /beneficiarios)
└── ⚙️ Perfil       (Logout)
    ↓
Detalle de Asignación → Crear Bitácora
    ├─ Offline: guardar en queue
    └─ Online: POST /bitacoras + archivos
```

---

## 2️⃣ AUTENTICACIÓN Y TÉCNICOS

### Modelo de Técnico
```typescript
Usuario {
  id: string;
  nombre: string;
  rol: 'TECNICO' | 'COORDINADOR' | 'ADMIN' | 'SUPER_ADMIN';
  email?: string;
  fecha_limite?: string;
  estado_corte?: 'en_servicio' | 'corte_aplicado';
}
```

### Flujo de Login
1. **Pantalla de conexión** - Verificar URL del servidor
2. **Entrada de código** - 5 dígitos exactos (validado con regex `/^\d{5}$/`)
3. **POST /auth/tecnico** - Rate limiting (3 intentos / 5 min)
4. **Validar JWT** - Verificar estructura, exp, iat
5. **Guardar en AsyncStorage** - Token + Usuario

### Claves de Almacenamiento
| Clave | Contenido | TTL |
|-------|-----------|-----|
| `@saderh:token` | JWT token | Sesión |
| `@saderh:usuario` | Datos técnico | Sesión |
| `@saderh:conexion` | URL del servidor | ♾️ |
| `@saderh:offline_queue` | Bitácoras offline | 7 días |

---

## 3️⃣ DATOS Y ASIGNACIONES

### Entidades Principales

```
Beneficiario (personas con las que se trabaja)
├── ID, nombre, CURP, municipio, localidad
├── Teléfono, ubicación, cadena productiva
└── Relación: 1 técnico → N beneficiarios

Asignación (trabajo a realizar)
├── ID, tipo (beneficiario/actividad)
├── Beneficiario asociado, fecha límite
├── Descripción, prioridad, estado
└── Relación: 1 bienef → N asignaciones

Bitácora (registro de visita técnica)
├── ID, tecnico_id, beneficiario_id
├── Fecha inicio/fin, coordenadas
├── Foto rostro, firma, fotos campo
├── Estado (borrador/cerrada)
└── Relación: 1 asignación → 1+ bitácoras
```

### Endpoints de Datos

| Feature | Endpoint | Método | Headers |
|---------|----------|--------|---------|
| Mis actividades | `/mis-actividades` | GET | Bearer token |
| Mis beneficiarios | `/mis-beneficiarios` | GET | Bearer token |
| Cadenas | `/cadenas-productivas` | GET | Bearer token |
| Crear bitácora | `/bitacoras` | POST | Bearer token |
| Subir fotos | `/bitacoras/:id/fotos-*` | POST | Multipart |
| Cerrar visita | `/bitacoras/:id/cerrar` | POST | Bearer token |

---

## 4️⃣ FUNCIONALIDAD OFFLINE (CRÍTICA)

### Arquitectura Offline-First

```
Estado de Conexión
    ↓
┌─────────────────────────────────────────┐
│ Cada 20s: syncApi.healthCheck()         │
│ GET /health → ¿Servidor responde?       │
│ Resultado: setOffline(true/false)       │
└─────────────────────────────────────────┘
    ↓
    ├─ ONLINE ──────────────────┬─ OFFLINE ──────────────┐
    │                            │                        │
    v                            v                        v
Crear bitácora                 Mostrar alerta      Guardar en queue
POST /bitacoras          📱 OFFLINE             AsyncStorage
Upload fotos             Datos locales          offlineQueue.push()
Retorna ID                                      Guardar archivos
                                                en filesystem
    │                                                  │
    └──────────────────────┬──────────────────────────┘
                           │
                           ↓
                    ¿Conexión regresa?
                           │
                           ├─ SÍ ──→ Auto-sync
                           │         - Leer queue
                           │         - POST /bitacoras
                           │         - Upload files
                           │         - DELETE de queue
                           │
                           └─ NO ──→ Seguir guardando offline
```

### Configuración de Queue Offline

```typescript
const OFFLINE_QUEUE_CONFIG = {
  MAX_ITEMS: 500,                    // Máximo bitácoras offline
  MAX_SIZE_MB: 50,                   // Máximo tamaño total
  ITEM_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,  // 7 días
  QUEUE_WARNING_THRESHOLD: 0.8,      // Alerta 80%
};
```

### Indicadores en UI

```
┌────────────────────────────────────┐
│ Dashboard Indicators               │
├────────────────────────────────────┤
│ Conexión: ✅ ONLINE / 📱 OFFLINE   │
│ Pendientes: 📦 3 visitas           │
│ Capacidad: ████░░░░░░ 45%          │
│ Última sync: hace 2 minutos         │
└────────────────────────────────────┘
```

### Endpoints de Sincronización

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/health` | GET | Verificar conexión |
| `/sync` | POST | Enviar operaciones offline |
| `/sync/delta` | GET | Obtener cambios incrementales |

---

## 5️⃣ COMPONENTES CLAVE

### Pantallas

| Pantalla | Ubicación | Función |
|----------|-----------|---------|
| Splash | `app/auth/splash.tsx` | Cargar sesión guardada |
| Conexión | `app/auth/conexion.tsx` | Seleccionar URL del servidor |
| Login | `app/auth/login.tsx` | Ingresar código técnico |
| Dashboard | `app/tabs/dashboard.tsx` | Listar asignaciones + sync |
| Detalle Asignación | `app/stack/detalle-asignacion.tsx` | Crear bitácora + fotos + firma |
| Beneficiario | `app/tabs/alta-beneficiario.tsx` | Crear beneficiario |
| Perfil | `app/tabs/informacion.tsx` | Datos técnico + logout |

### Store Global

```typescript
// useAuthStore (Zustand)
- token: string | null           // JWT
- tecnico: Usuario | null        // Datos técnico
- isAuthenticated: boolean       // ¿Logueado?
- isOffline: boolean             // ¿Sin conexión?
- setAuth(), clearAuth(), loadAuth(), setOffline()
```

### Cliente HTTP

```typescript
// lib/api.ts - Características
- Retry automático (exponential backoff)
- Timeout: 20 segundos
- Detección de errores de red
- Rate limiting en login (3/5min)
- Multipart file upload
- Validación strict de JWT
```

---

## 6️⃣ ENDPOINTS API (COMPLETO)

### Autenticación
```
POST   /auth/tecnico          Login
GET    /health                Health check
```

### Datos Maestros
```
GET    /mis-actividades       Asignaciones del técnico
GET    /mis-beneficiarios     Beneficiarios asignados
GET    /cadenas-productivas   Catálogo de cadenas
```

### Bitácoras (Visitas)
```
POST   /bitacoras             Crear bitácora
GET    /bitacoras             Listar bitácoras
GET    /bitacoras/:id         Detalle de bitácora
PATCH  /bitacoras/:id         Actualizar bitácora
POST   /bitacoras/:id/cerrar  Cerrar visita
POST   /bitacoras/:id/foto-rostro    Upload foto
POST   /bitacoras/:id/firma          Upload firma
POST   /bitacoras/:id/fotos-campo    Upload fotos
DELETE /bitacoras/:id         Eliminar bitácora
```

### Notificaciones
```
GET    /notificaciones        Listar notificaciones
PATCH  /notificaciones/:id/leer      Marcar leída
```

### Sincronización
```
POST   /sync                  Enviar operaciones offline
GET    /sync/delta            Obtener cambios incrementales
```

---

## 7️⃣ ¿QUÉ FALTA PARA SER VERDADERAMENTE OFFLINE-READY?

### 🔴 CRÍTICO (Bloquea producción)

#### 1. **Base de Datos Local SQLite**
```
PROBLEMA: Solo AsyncStorage (sin schema, sin índices)
SOLUCIÓN: Implementar WatermelonDB o SQLite directo
IMPACTO: Imposible escalar a 10K+ registros
```

#### 2. **Sincronización Incremental Persistida**
```
PROBLEMA: GET /sync/delta retorna cambios, pero no se guardan localmente
SOLUCIÓN: Guardar delta en SQLite, actualizar referencia last_sync
IMPACTO: Riesgo de datos desincronizados
```

#### 3. **Resolución de Conflictos**
```
PROBLEMA: No hay lógica de qué hacer si ambos lados modifican mismo registro
SOLUCIÓN: Implementar last-write-wins o CRDTs
IMPACTO: Posible pérdida de datos
```

#### 4. **Soft Delete Tracking**
```
PROBLEMA: No hay deleted_at, soft_delete en modelos
SOLUCIÓN: Agregar campos deleted_at y sync_id a todas las entidades
IMPACTO: Datos deletados reaparecen después de sync
```

### 🟡 IMPORTANTE (Mejora calidad)

#### 5. **Compresión de Imágenes**
```
PROBLEMA: 50MB se llena con ~500 fotos sin comprimir
SOLUCIÓN: Comprimir a WebP, max 1200x1200px
IMPACTO: Extiende capacidad 3-5x
```

#### 6. **Recovery de Fallos Parciales**
```
PROBLEMA: Si falla foto rostro, intenta todo de nuevo
SOLUCIÓN: Reintento granular por componente
IMPACTO: Menos reintentos innecesarios
```

#### 7. **Garbage Collection Automático**
```
PROBLEMA: Sin limpiar archivos huérfanos o datos expirados
SOLUCIÓN: Tareas de limpieza automáticas
IMPACTO: Evita llenar dispositivo
```

### 🟢 NICE-TO-HAVE (Futuro)

#### 8. **Paginación en Caché**
```
PROBLEMA: Cargar 10K beneficiarios → crash
SOLUCIÓN: Lazy loading + paginación
```

#### 9. **Métricas y Auditoría**
```
PROBLEMA: No hay historial de sincronizaciones
SOLUCIÓN: Guardar logs localmente + subir al servidor
```

#### 10. **Búsqueda Offline**
```
PROBLEMA: No se pueden buscar beneficiarios sin internet
SOLUCIÓN: Crear índices fulltext en SQLite
```

---

## 📋 CHECKLIST: PRODUCCIÓN OFFLINE-READY

### Fase 1: Esencial (Do-or-Die)
- [ ] Implementar SQLite local (WatermelonDB prioritario)
- [ ] Crear schema: bitacoras, beneficiarios, asignaciones, usuarios
- [ ] Persistir delta de `/sync/delta` en BD local
- [ ] Implementar last-write-wins para conflictos
- [ ] Agregar `sync_id` y `deleted_at` a modelos

### Fase 2: Robustez (Antes de MVP)
- [ ] Comprimir imágenes antes de guardar offline
- [ ] Implementar garbage collection diario
- [ ] Recovery granular de fallos parciales
- [ ] Dashboard de estado de sincronización
- [ ] Tests end-to-end: crear bitácora offline → sync → verificar servidor

### Fase 3: Optimización (Post-MVP)
- [ ] Índices fulltext para búsqueda
- [ ] Caché de paginación
- [ ] Logs persistentes en SQLite
- [ ] Telemetría de sincronización
- [ ] Compresión de archivos (`.tar.gz` para backups)

---

## 🔧 PRÓXIMOS PASOS RECOMENDADOS

### Inmediato (Semana 1)
1. Instalar WatermelonDB: `npm install @nozbe/watermelon`
2. Crear migrations de esquema SQLite
3. Migrar datos de AsyncStorage a SQLite
4. Validar consultas y performance

### Corto Plazo (Semanas 2-3)
1. Implementar persistencia de delta
2. Agregar soft delete (deleted_at)
3. Implementar resolution de conflictos
4. Tests de offline scenarios

### Mediano Plazo (Mes 1-2)
1. Compresión de imágenes
2. GC automático
3. Dashboard de sync status
4. Cobertura de tests al 80%

---

## 📊 ESTADO FINAL

| Métrica | Calificación | Objetivo |
|---------|-------------|----------|
| Offline-Ready | 6.5/10 | 9/10 |
| Escalabilidad | 4/10 | 8/10 |
| Robustez | 7/10 | 9/10 |
| Testing | 5/10 | 9/10 |

**Veredicto:** ✅ Apto MVP | ⚠️ Requiere mejoras antes de GA (General Availability)

---

## 📚 REFERENCIA RÁPIDA

### Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `lib/api.ts` | Cliente HTTP + endpoints + offlineQueue |
| `store/authStore.ts` | Estado de autenticación |
| `app/_layout.tsx` | Health check loop (20s) |
| `app/stack/detalle-asignacion.tsx` | Crear bitácora + lógica offline |
| `lib/diagnostic.ts` | Sistema de diagnóstico |
| `types/models.ts` | Tipos TypeScript |

### Comandos Útiles

```bash
# Verificar conexión API
await syncApi.healthCheck()

# Ver cola offline
const pending = await offlineQueue.countPendingBitacoras()

# Estadísticas
const stats = await offlineQueue.getStats()

# Limpiar todo (debug only)
await offlineQueue.clear()

# Ejecutar diagnóstico
await Diagnostic.runFullDiagnostic()
```

---

**Documento generado:** 25-03-2026  
**Para consultas:** Ver archivo completo en `/memories/session/exploracion-exhaustiva-saderh.md`
