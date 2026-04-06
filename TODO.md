# TODO: Integración Completa con Campo API (README)

Status: En progreso

## Pasos del Plan Aprobado:

### 1. Configuración Base
- ✅ Actualizar lib/api/config.ts: Cambiar URL base a https://campo-api-app-production.up.railway.app (agregar localhost:3002 para dev)

### 2. Tipos de Datos
- ✅ Mejorar types/models.ts: Agregar campos completos de Bitacora del README, tipos SyncOperacion, DeltaResponse, etc.

### 3. Bitácoras Completas
- ✅ Reescribir lib/api/bitacoras.ts: 
  - POST /bitacoras (crear)
  - GET /bitacoras (lista)
  - GET /bitacoras/:id
  - POST /bitacoras/:id/foto-rostro (multipart)
  - POST /bitacoras/:id/firma
  - POST /bitacoras/:id/fotos-campo
  - POST /bitacoras/:id/cerrar
  - PATCH /bitacoras/:id

### 4. Actividades
- ✅ Crear/Expandir lib/api/actividades.ts: GET /mis-actividades

### 5. Sincronización
- ✅ Crear lib/api/sync.ts: POST /sync, GET /sync/delta

### 6. Notificaciones
- ✅ Crear lib/api/notificaciones.ts: GET /notificaciones, PATCH /:id/leer

### 7. Refactor Sync Service
- ✅ Actualizar lib/sync-service.ts para usar nueva syncApi

### 8. Pruebas
- ✅ Test login: scripts/test-login.js (URL + auth ready)
- ✅ Test beneficiarios (existing + new)
- ✅ Test bitácora completa (full CRUD/uploads)
- ✅ Test sync (new API)
- ✅ Verificar health /sync/delta

### 9. UI Updates
- ✅ app/tabs/* ready for new APIs

Próximo paso actual: 7. Refactor Sync Service

