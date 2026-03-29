# 🔧 GUÍA COMPLETA: ARREGLANDO VARIABLES DE ENTORNO

## 📊 Estado Actual

| Variable | Estado | Acción |
|----------|--------|--------|
| DATABASE_URL | ❌ Falta | Obtener de Railway PostgreSQL |
| REDIS_URL | ❌ Falta | Obtener de Railway Redis |
| JWT_SECRET | ✅ Generado | Ya está en .env.production |

---

## 🎯 Objetivo

Configurar las variables de entorno del **backend** en Railway para que `/auth/tecnico` deje de devolver 503.

---

## 📋 PLAN PASO A PASO

### PASO 1: Generar Archivo de Configuración
```bash
node generate-env.js
```
**Resultado**: Genera `.env.production` con JWT_SECRET automático
- ✅ DATABASE_URL = (placeholder)
- ✅ REDIS_URL = (placeholder)  
- ✅ JWT_SECRET = (Auto-generado, seguro)
- ✅ CLOUDINARY_* = (Placeholders)

---

### PASO 2: Obtener URLs de Railway

#### 2.1 Obtener DATABASE_URL (PostgreSQL)
1. Ve a https://railway.app/dashboard
2. Selecciona tu proyecto **campo-saas**
3. Ve a **Plugins** → **PostgreSQL**
4. Haz clic en **Connect**
5. Copia el valor de **Railway Provided URL**
   - Debe empezar con: `postgresql://`
   - Ej: `postgresql://<user>:<password>@<host>:<port>/<database>`

#### 2.2 Obtener REDIS_URL (Redis)
1. En el mismo proyecto
2. Ve a **Plugins** → **Redis**
3. Haz clic en **Connect**
4. Copia la **REDIS_URL**
   - Debe empezar con: `redis://`
   - Ej: `redis://:<password>@<host>:<port>`

---

### PASO 3: Actualizar .env.production

Abre el archivo `c:\Users\black\saderh-app\.env.production` y reemplaza:

```env
# ANTES:
DATABASE_URL=postgresql://reemplaza-con-url-de-railway

# DESPUÉS:
DATABASE_URL=postgresql://<user>:<pwd>@<host>:<port>/<db>

# ANTES:
REDIS_URL=redis://reemplaza-con-url-de-railway

# DESPUÉS:
REDIS_URL=redis://:<password>@<host>:<port>
```

---

### PASO 4: Validar Configuración Local

```bash
node validate-env.js
```

**Resultado esperado**:
```
✅ DATABASE_URL - OK
✅ REDIS_URL - OK
✅ JWT_SECRET - OK (65+ caracteres)
```

---

### PASO 5: Subir Variables a Railway

1. Ve a https://railway.app/dashboard
2. Selecciona proyecto **campo-saas**
3. Ve a **Settings** → **Environment Variables**
4. Copia CADA variable de `.env.production`:

```
DATABASE_URL = postgresql://<user>:<pwd>@<host>:<port>/<db>
REDIS_URL = redis://:<password>@<host>:<port>
JWT_SECRET = <contenido-completo-de-jwt-secret>
CLOUDINARY_CLOUD_NAME = <tu-cloud-name>
CLOUDINARY_API_KEY = <tu-api-key>
CLOUDINARY_API_SECRET = <tu-api-secret>
CLOUDINARY_PRESET_IMAGENES = <preset>
CLOUDINARY_PRESET_DOCS = <preset>
PORT = 3002
NODE_ENV = production
```

5. Haz clic en **Save** o similar
6. Railway iniciará **automáticamente** el deploy

---

### PASO 6: Esperar Recuperación del Servidor

```bash
node monitor-server.js
```

**Qué hace**:
- Cada 30 segundos prueba POST /auth/tecnico
- Detecta cuando devuelve algo diferente a 503
- Notifica cuando el servidor está listo

**Resultado esperado** (después de 2-5 minutos):
```
[✅] POST /auth/tecnico = 200 o 401
🎉 ¡SERVIDOR RECUPERADO!
```

---

### PASO 7: Validar Todos los Endpoints

```bash
node validate-api.js
```

**Resultado esperado**:
```
✅ GET /health [200]
✅ POST /auth/tecnico [401/200]  ← Ya no 503
✅ GET /mis-beneficiarios [401]
✅ GET /mis-actividades [401]
✅ GET /cadenas-productivas [401]
✅ GET /bitacoras [401]
✅ GET /notificaciones [401]
✅ Todos funcionando

Resultado: 14/14 (100%)
```

---

## 🛠️ HERRAMIENTAS DISPONIBLES

### 1. `generate-env.js` - Generar Template
**Qué hace**: Crea `.env.production` con JWT_SECRET auto-generado
```bash
node generate-env.js
```
**Cuándo usar**: Primera vez o si necesitas regenerar JWT_SECRET

---

### 2. `validate-env.js` - Validar Configuración
**Qué hace**: Verifica que todas las variables sean correctas
```bash
node validate-env.js
```
**Cuándo usar**: Antes de subir a Railway
**Respuesta**: ✅ OK o ❌ señala qué falta

---

### 3. `get-railway-urls.js` - Obtener URLs Interactivo
**Qué hace**: Guía interactiva para obtener URLs de Railway
```bash
node get-railway-urls.js
```
**Cuándo usar**: Primera vez configurando Railway
**Benefit**: Te guía paso a paso

---

### 4. `config-master.js` - Maestro Completo
**Qué hace**: Muestra estado actual y próximos pasos
```bash
node config-master.js
```
**Cuándo usar**: Para ver estado general
**Respuesta**: Estado actual + instrucciones

---

### 5. `validate-api.js` - Probar Endpoints
**Qué hace**: Prueba los 14 endpoints contra el servidor
```bash
node validate-api.js
```
**Cuándo usar**: Después que Railway esté configurado
**Respuesta**: 14/14 endpoints y qué falta

---

### 6. `monitor-server.js` - Monitorear Recuperación  
**Qué hace**: Verifica /auth/tecnico cada 30 segundos
```bash
node monitor-server.js
```
**Cuándo usar**: Después de actualizar Railway
**Respuesta**: Notifica cuando ✅ servidor listo

---

## 🚨 PROBLEMAS COMUNES

### ❌ "No se encontró .env.production"
1. Ejecuta: `node generate-env.js`
2. Te creará el archivo automáticamente

### ❌ "validate-env.js dice que falta DATABASE_URL"
1. Necesitas obtener la URL de Railway
2. El archivo está creado pero con placeholders
3. Sigue el PASO 2 de arriba

### ❌ "Aún devuelve 503 después de subir a Railway"
1. Espera 2-5 minutos para que Railway haga deploy
2. Ejecuta: `node monitor-server.js`
3. Verifica que variables sean exactas en Railway

### ❌ "¿Cómo sé si JWT_SECRET es correcto?"
- Debe tener al menos 20 caracteres
- Debe ser base64 válido
- El generador usa: `crypto.randomBytes(64).toString('base64')`
- Cualquier cambio requiere que todos cierren sesión

---

## ✅ CHECKLIST FINAL

- [ ] Archivo `.env.production` existe
- [ ] DATABASE_URL obtenida de Railway
- [ ] REDIS_URL obtenida de Railway
- [ ] JWT_SECRET generado (64+ caracteres base64)
- [ ] Las 3 variables están en Railway
- [ ] Deploy completado en Railway
- [ ] Esperé 2-5 minutos
- [ ] `node validate-api.js` muestra 14/14 ✅
- [ ] Usuarios pueden hacer login

---

## 📞 PRÓXIMOS PASOS SI ALGO FALLA

1. Verifica logs de Railway en: https://railway.app/dashboard
2. Busca errores de conexión BD o Redis
3. Confirma credenciales exactas en Railway
4. Intenta copiar-pegar de nuevo las URLs
5. Si persiste el 503, probablemente error en PostgreSQL o Redis en Railway

---

## 🎯 TIEMPO ESTIMADO

- Obtener URLs: **5 minutos**
- Actualizar .env: **2 minutos**
- Validar local: **1 minuto**
- Subir a Railway: **2 minutos**
- Esperar deploy: **2-5 minutos**
- **Total: 12-15 minutos**

---

## 📊 RESULTADO ESPERADO

Una vez completado, el servidor responderá:
- ✅ GET /health [200]
- ✅ POST /auth/tecnico [200 o 401] (Ya no 503)
- ✅ Todos los usuarios pueden hacer login

La app móvil funcionará automáticamente, sin cambios de código.

