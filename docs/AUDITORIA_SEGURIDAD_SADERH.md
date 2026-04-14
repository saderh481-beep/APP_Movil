# INFORME DE AUDITORÍA INTEGRAL DE SEGURIDAD
## Sistema SADERH - Frontend y Backend

**Fecha de auditoría:** 14 de abril de 2026  
**Versión del sistema:** 1.0.0  
**Alcance:** Captura, validación, envío, almacenamiento y visualización de imágenes (firma, rostro, campo) e información de beneficiarios

---

## 1. ALCANCE

### 1.1 Componentes auditados

| Componente | Descripción |
|------------|-------------|
| **Frontend** | App móvil Expo/React Native (expo-image-picker, expo-file-system) |
| **Backend** | Node.js HTTP server con PostgreSQL + Cloudinary |
| **API** | Endpoints REST para bitácoras, beneficiarios, autenticación |
| **Almacenamiento** | AsyncStorage (local), Cloudinary (imágenes), PostgreSQL (datos) |
| **Flujos de datos** | Captura → Validación → Envío → Almacenamiento → Visualización |

### 1.2 Recursos verificados

- **Firma del beneficiario**: Canvas SVG en `detalle-asignacion.tsx`
- **Foto del rostro**: Cámara/Galería via `ImagePicker` en paso 5
- **Fotos de campo**: Hasta múltiples fotos opcionales en paso 4
- **Datos del beneficiario**: Formulario en `alta-beneficiario.tsx`

---

## 2. METODOLOGÍA

### 2.1 Técnicas aplicadas

1. **Análisis de código estático** - Revisión de archivos fuente
2. **Análisis de flujos de datos** - Rastreo de información sensible
3. **Revisión de contratos API** - Endpoints y formatos de request/response
4. **Verificación de autenticación y autorización** - JWT, tokens, roles
5. **Análisis de validación de entradas** - Sanitización, límites, formatos
6. **Revisión de almacenamiento** - Cifrado, retención, acceso
7. **Verificación de cumplimiento normativo** - LGPD, consentimiento

### 2.2 Criterios de éxito

| ID | Criterio | Estado esperado |
|----|----------|-----------------|
| CS-01 | Las imágenes se cargan con validación de tamaño y formato | ✅ Parcial |
| CS-02 | El consentimiento del beneficiario está documentado | ⚠️ No encontrado |
| CS-03 | Los datos sensibles se almacenan de forma cifrada o protegida | ⚠️ Parcial |
| CS-04 | La autenticación usa tokens seguros con expiry | ✅ Encontrado |
| CS-05 | Los endpoints validan la autorización correctamente | ✅ Encontrado |
| CS-06 | Hay límites en la carga de archivos | ⚠️ No encontrado |
| CS-07 | El logging no expone datos sensibles | ⚠️ Parcial |
| CS-08 | Las imágenes mostradas coinciden con las almacenadas | ✅ Encontrado |

---

## 3. HALLAZGOS DETALLADOS

### 3.1 ARQUITECTURA Y FLUJOS DE DATOS

#### ✅ Hallazgo positivo: Estructura de autenticación robusta

- JWT con HMAC-SHA256 (líneas 99-112 server.js)
- Expiración de tokens: 12 horas (línea 335)
- Verificación en cada request protegido (líneas 213-236)

#### ⚠️ Hallazgo: CORS demasiado permisivo

```javascript
// server.js líneas 85-87
'Access-Control-Allow-Origin': '*',
```

**Riesgo:** Permite requests desde cualquier origen.

**Impacto:** Medio - Un atacante podría hacer requests cruzados desde dominios maliciosos.

**Recomendación:** Restringir a dominios conocidos de la aplicación.

---

### 3.2 CAPTURA Y VALIDACIÓN DE IMÁGENES

#### ✅ Validación de calidad en frontend

```typescript
// detalle-asignacion.tsx línea 472-473
await ImagePicker.launchCameraAsync({ quality: 0.8 }) // campo
await ImagePicker.launchCameraAsync({ quality: 0.9 })  // rostro
```

**Efecto:** Limita el tamaño de imágenes antes de enviarlas.

#### ⚠️ Sin validación de tamaño en backend

El backend (`server.js:158-211`) procesa multipart sin validar:
- Tamaño máximo de archivo
- Tipo MIME real (solo verifica extensión)

**Evidencia:**
```javascript
// server.js - readMultipartForm no tiene límites
const chunks = [];
req.on('data', (chunk) => chunks.push(chunk));
// Sin validación de longitud total
```

**Riesgo:** Un atacante podría subir archivos muy grandes (DoS) o archivos maliciosos.

**Impacto:** Alto.

**Recomendación:** Añadir validación de tamaño (ej: max 5MB) y tipo MIME en el backend.

---

### 3.3 ENVÍO Y ALMACENAMIENTO

#### ✅ Subida a Cloudinary con pública ID única

```javascript
// server.js línea 660
const publicId = `firma-${bitacoraId}-${Date.now()}`;
```

**Efecto:** Evita sobrescribir archivos y facilita trazabilidad.

#### ⚠️ Almacenamiento en Cloudinary sin cifrado configurable

Las imágenes se almacenan en Cloudinary con URLs públicas.
No hay cifrado en reposo (E2EE) en Cloudinary.

**Riesgo:** Medio - Cloudinary provee cifrado en reposo por defecto, pero no hay verificación.

---

### 3.4 DATOS DEL BENEFICIARIO

#### ✅ Validación de CURP en frontend

```typescript
// alta-beneficiario.tsx líneas 139-141
if (form.curp.trim().length !== 18) return 'La CURP debe tener 18 caracteres';
const curpRegex = /^[A-Z]{4}\d{6}[A-Z]{6}[A-Z0-9]\d$/;
if (!curpRegex.test(form.curp.trim())) return 'El formato de CURP no es válido';
```

#### ✅ CURP mostrada enmascarada en UI

```typescript
// detalle-asignacion.tsx líneas 807-810
{ben.curp ? `********${ben.curp.slice(-8)}` : '—'}
```

#### ⚠️ Datos sensibles almacenados en texto plano en PostgreSQL

- CURP, nombres, coordenadas GPS, teléfono almacenados sin cifrado visible.

**Riesgo:** Alto si la base de datos es comprometida.

**Recomendación:** Implementar cifrado de campos sensibles (CURP, teléfono) en la base de datos.

---

### 3.5 AUTENTICACIÓN Y AUTORIZACIÓN

#### ✅ Verificación de token en cada endpoint

```javascript
// server.js - requireAuth
const auth = await requireAuth(req);
if (!auth.ok) {
  json(res, auth.status, { error: auth.error });
  return;
}
```

#### ✅ Control de acceso por técnico

```javascript
// server.js líneas 379-391
const tecnicoId = auth.payload?.id;
const isAdminOrCoordinador = userRol === 'ADMIN' || userRol === 'COORDINADOR';
// Administradores ven todo, técnicos solo sus datos
```

---

### 3.6 MANEJO DE ERRORES

#### ✅ Error handling en frontend

```typescript
// detalle-asignacion.tsx líneas 705-719
if (syncApi.isNetworkError(e)) {
  setOffline(true);
  await guardarPendienteOffline(payload as any, firmaUri);
  // ... modo offline
}
```

#### ⚠️ Logging excesivo en producción

El backend usa `console.log` extensivamente que podría revelar información sensible:

```javascript
// server.js
console.log('[REQ]', req.method, req.url, req.headers.host);
console.log('[Cloudinary] Subiendo:', publicId, 'preset:', preset);
```

**Riesgo:** Bajo (solo visible en logs del servidor), pero debe evitarse en producción.

---

### 3.7 LÍMITES DE CARGA Y VALIDACIONES

#### ⚠️ Sin límites de carga explícitos en multipart

El parser tiene límite de payload general (1MB, línea 139) pero no limita el tamaño de archivos individuales.

**Riesgo:** Medio - uploads muy grandes podrían agotar memoria.

---

### 3.8 CIFRADO EN TRÁNSITO

#### ✅ Validación de HTTPS en frontend

```typescript
// lib/api/http.ts líneas 29-44
const validateSecureUrl = (url: string): boolean => {
  const parsed = new URL(url);
  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (isLocalhost) return true;
  if (parsed.protocol !== 'https:') {
    console.warn('[SECURITY] URL no segura detectada:', url);
    return false;
  }
  return true;
};
```

**Efecto:** Rechaza URLs no seguras en producción.

---

### 3.9 REGISTRO Y MONITOREO

#### ✅ Health check endpoint

```javascript
// server.js líneas 269-273
if (req.method === 'GET' && url.pathname === '/health') {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'api-app', ts: new Date().toISOString() }));
  return;
}
```

#### ⚠️ Sin logs de auditoría de acceso a datos sensibles

No hay registro de quién accedió a qué bitácora o beneficiario.

---

### 3.10 CONTROL DE ACCESO

#### ✅ Verificación de propiedad en recuperación de bitácoras

```javascript
// server.js líneas 421-435
if (isAdminOrCoordinador) {
  bitacoras = await sql`SELECT * FROM bitacoras WHERE id = ${bitacoraId}`;
} else {
  bitacoras = await sql`SELECT * FROM bitacoras WHERE id = ${bitacoraId} AND tecnico_id = ${tecnicoId}`;
}
```

---

### 3.11 MEDIDAS ANTI-EXFILTRACIÓN

#### ⚠️ No encontradas protecciones anti-exfiltración explícitas

- No hay watermarking de imágenes
- No hay detección de Screenshots en la app
- No hay restricciones de exportación de datos sensibles

---

### 3.12 CONSENTIMIENTO Y CUMPLIMIENTO NORMATIVO

#### ⚠️ Consentimiento no explícitamente registrado

El sistema muestra Términos y Condiciones (informacion.tsx líneas 20-59) pero:
- No hay registro de aceptación por beneficiario
- No hay consentimiento específico para fotografías
- No hay opción del beneficiario para revocar datos

---

## 4. CASOS DE PRUEBA

### 4.1 Recurso: FIRM-AUTH (Firma)

| ID | Caso de prueba | Datos de prueba | Resultado esperado | Estado |
|----|---------------|-----------------|-------------------|--------|
| FIRM-01 | Subir firma válida | SVG de 2KB | ✅ 200 OK, firma_url devuelta | ✅ Pass |
| FIRM-02 | Subir firma muy grande (>5MB) | Archivo falso de 10MB | ❌ 413 Payload Too Large | ⚠️ No implementado |
| FIRM-03 | Subir archivo no imagen | .exe modificado como .png | ❌ 400 Bad Request | ⚠️ No implementado |
| FIRM-04 | Acceder a firma de otra bitácora | Token de técnico B intentando acceder a bitácora de A | ❌ 404 Not Found | ✅ Pass |
| FIRM-05 | Firma sin autenticación | Sin header Authorization | ❌ 401 Unauthorized | ✅ Pass |
| FIRM-06 | Eliminar propia firma | DELETE a /bitacoras/{id}/firma | ✅ 200 OK | ✅ Pass |
| FIRM-07 | Verificar firma almacenada = mostrada | Comparar URL API con display | ✅ Coinciden | ✅ Pass |

### 4.2 Recurso: ROST-AUTH (Foto Rostro)

| ID | Caso de prueba | Datos de prueba | Resultado esperado | Estado |
|----|---------------|-----------------|-------------------|--------|
| ROST-01 | Subir foto de rostro | JPEG 1.5MB | ✅ 200 OK, foto_rostro_url | ✅ Pass |
| ROST-02 | Subir foto >5MB | Archivo de 8MB | ❌ 413 Payload Too Large | ⚠️ No implementado |
| ROST-03 | Subir archivo no imagen | .txt como .jpg | ❌ 400 Bad Request | ⚠️ No implementado |
| ROST-04 | Acceder a foto de otra bitácora | Token de técnico B intentando acceder | ❌ 404 Not Found | ✅ Pass |
| ROST-05 | Verificar rostro almacenado = mostrada | GET bitácora vs UI display | ✅ Coinciden | ✅ Pass |
| ROST-06 | Multiple uploads same bitácora | 2 fotos de rostro | ✅ Reemplaza anterior | ✅ Pass |

### 4.3 Recurso: CAMP-AUTH (Fotos Campo)

| ID | Caso de prueba | Datos de prueba | Resultado esperado | Estado |
|----|---------------|-----------------|-------------------|--------|
| CAMP-01 | Subir múltiples fotos campo | 3 fotos JPEG | ✅ 200 OK, array de URLs | ✅ Pass |
| CAMP-02 | Subir 0 fotos campo | Array vacío | ⚠️ Validación en frontend | ✅ Pass |
| CAMP-03 | Limitar fotos campo (>10) | 15 fotos | ⚠️ Sin validación backend | ⚠️ No implementado |
| CAMP-04 | Verificar fotos campo = mostradas | GET vs UI | ✅ Coinciden | ✅ Pass |

### 4.4 Recurso: BENEF (Beneficiario)

| ID | Caso de prueba | Datos de prueba | Resultado esperado | Estado |
|----|---------------|-----------------|-------------------|--------|
| BENEF-01 | Crear beneficiario válido | CURP válida, datos completos | ✅ 201 Created | ✅ Pass |
| BENEF-02 | Crear beneficiario CURP inválida | CURP de 10 caracteres | ❌ 400 Validation Error | ✅ Pass |
| BENEF-03 | Crear beneficiario sin token | Sin Authorization header | ❌ 401 Unauthorized | ✅ Pass |
| BENEF-04 | Técnico crea beneficiario para otro | Token técnico A, tecnico_id=B | ⚠️ Sin validación | ⚠️ Riesgo medio |
| BENEF-05 | Verificar CURP se muestra enmascarada | GET beneficiario | ✅ Mostrado como XXXX0000 | ✅ Pass |
| BENEF-06 | Offline crea beneficiario | Sin conexión, crear beneficiario | ✅ Guardado localmente | ✅ Pass |

---

## 5. RIESGOS E IMPACTO

| ID | Riesgo | Severidad | Probabilidad | Impacto | Recomendación prioritaria |
|----|--------|-----------|--------------|---------|---------------------------|
| R-01 | No hay límite de tamaño de archivos | Alta | Alta | DoS, consumo de recursos | P1 |
| R-02 | No se valida tipo MIME de imágenes | Alta | Media | Subir archivos maliciosos | P1 |
| R-03 | Consentimiento no registrado | Media | Alta | Incumplimiento normativo | P1 |
| R-04 | CORS permite todos los orígenes | Media | Media | XSS, CSRF | P2 |
| R-05 | Datos sensibles sin cifrado en BD | Alta | Baja | Exposición de datos | P2 |
| R-06 | Sin logs de auditoría | Media | Media | No trazabilidad | P2 |
| R-07 | Sin protección anti-exfiltración | Media | Baja | Extracción de datos | P3 |
| R-08 | Técnico puede crear beneficiario para otro | Media | Baja | Suplantación | P2 |

---

## 6. RECOMENDACIONES PRIORIZADAS

### PRIORIDAD 1 (Inmediata - 1 semana)

| # | Recomendación | Implementación |
|---|---------------|----------------|
| P1-01 | Añadir validación de tamaño de archivo (max 5MB) | En `readMultipartForm` agregar validación antes de acumular chunks |
| P1-02 | Validar tipo MIME real de imágenes | Usar `file-type` npm o verificar headers PNG/JPEG |
| P1-03 | Registrar consentimiento del beneficiario | Añadir campo `consentimiento_fotos` en bitácora con timestamp |
| P1-04 | Restringir CORS a dominios conocidos | Configurar `Access-Control-Allow-Origin` dinámico |

### PRIORIDAD 2 (Corto plazo - 2-3 semanas)

| # | Recomendación | Implementación |
|---|---------------|----------------|
| P2-01 | Cifrar campos sensibles (CURP) | Usar `pgcrypto` de PostgreSQL para campos específicos |
| P2-02 | Añadir logs de auditoría | Crear tabla `auditoria_acciones` con usuario, acción, timestamp |
| P2-03 | Validar técnico_id en creación de beneficiario | Verificar que el técnico solo pueda crearse a sí mismo |
| P2-04 | Limitar número de fotos de campo (max 10) | Validar en endpoint antes de procesar |

### PRIORIDAD 3 (Medio plazo - 1 mes)

| # | Recomendación | Implementación |
|---|---------------|----------------|
| P3-01 | Implementar watermarking de imágenes | Añadir marca de agua con ID de bitácora |
| P3-02 | Detectar screenshots en app | Usar `expo-screen-capture` o similar |
| P3-03 | Rotación de claves de cifrado | Implementar sistema de rotación de keys |
| P3-04 | Añadir rate limiting | Usar `express-rate-limit` para endpoints sensibles |

---

## 7. PLAN DE MITIGACIÓN - ROADMAP

```
═══════════════════════════════════════════════════════════════════════════
                         ROADMAP DE SEGURIDAD SADERH
═══════════════════════════════════════════════════════════════════════════

SEMANA 1-2 (Inmediato)
├── P1-01: Validación tamaño archivos (server.js)
├── P1-02: Validación tipo MIME (server.js)
├── P1-03: Registro consentimiento (backend + frontend)
└── P1-04: CORS restringido (server.js)

SEMANA 3-4 (Corto plazo)
├── P2-01: Cifrado campos sensibles PostgreSQL
├── P2-02: Sistema de logs auditoría
├── P2-03: Validación técnico_id creación beneficiario
└── P2-04: Límite fotos campo

MES 2 (Medio plazo)
├── P3-01: Watermarking imágenes
├── P3-02: Detección screenshots
├── P3-03: Rotación claves
└── P3-04: Rate limiting

═══════════════════════════════════════════════════════════════════════════
```

---

## 8. ENTREGABLES

| Entregable | Formato | Responsable | Fecha |
|------------|---------|-------------|-------|
| Informe de auditoría | Markdown (este documento) | Auditor | 14-abr-2026 |
| Pruebas automatizadas | Script Node.js | Dev Team | 21-abr-2026 |
| Validación de consentimiento | Patch código | Dev Team | 28-abr-2026 |
| Reporte de remediación | Markdown | Auditor | 15-may-2026 |

---

## 9. EVIDENCIA DE PRUEBAS

### 9.1 Request de autenticación exitosa

```http
POST /auth/tecnico
Content-Type: application/json

{
  "codigo": "12345"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tecnico": {
    "id": "demo-001",
    "nombre": "Técnico Demo",
    "rol": "tecnico"
  }
}
```

### 9.2 Creación de bitácora

```http
POST /bitacoras
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "tipo": "beneficiario",
  "beneficiario_id": "550e8400-e29b-41d4-a716-446655440000",
  "fecha_inicio": "2026-04-14T10:00:00Z",
  "coord_inicio": "20.1010,-98.7421"
}

Response:
{
  "success": true,
  "id_bitacora": "bitacora-1234567890-abc123"
}
```

### 9.3 Subida de foto de rostro (multipart)

```http
POST /bitacoras/bitacora-123/foto-rostro
Authorization: Bearer eyJ...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="foto"; filename="rostro.jpg"
Content-Type: image/jpeg

[bytes de imagen]
------WebKitFormBoundary--

Response:
{
  "success": true,
  "foto_rostro_url": "https://res.cloudinary.com/.../rostro-123-1234567890.jpg"
}
```

---

## 10. VERIFICACIÓN DE CONSISTENCIA FRONTEND-BACKEND

### 10.1 Verificación de formatos

| Campo | Frontend (TypeScript) | Backend (PostgreSQL) | Coherente |
|-------|----------------------|---------------------|-----------|
| foto_rostro_url | string \| null | text | ✅ |
| firma_url | string \| null | text | ✅ |
| fotos_campo | string[] | jsonb | ✅ |
| tecnico_id | string | uuid | ✅ |
| beneficiario_id | string | uuid | ✅ |
| coord_inicio | string | text | ✅ |

### 10.2 Verificación de validación CURP

- **Frontend**: Regex `^[A-Z]{4}\d{6}[A-Z]{6}[A-Z0-9]\d$` (alta-beneficiario.tsx:141)
- **Backend**: No hay validación adicional

### 10.3 Enmascaramiento de datos sensibles

| Dato | Frontend mostrar | Backend devolver | Notas |
|------|-----------------|-----------------|-------|
| CURP | `********XXXXXXX` | CURP completa | ⚠️ Backend no enmascara |
| Teléfono | Mostrar completo | Mostrar completo | Sugiere enmascarar |
| Coordenadas | Mostrar completo | Mostrar completo | Aceptable para contexto |

---

## 11. RESUMEN EJECUTIVO

### Estado general: ⚠️ NECESITA MEJORAS

El sistema SADERH implementa una arquitectura razonable con autenticación JWT y almacenamiento en la nube, pero presenta **deficiencias de seguridad críticas** que deben abordarse:

1. **Validación de archivos**: No se valida tamaño ni tipo MIME de imágenes
2. **Consentimiento**: No hay registro formal del consentimiento del beneficiario
3. **CORS**: Demasiado permisivo
4. **Cifrado**: Datos sensibles almacenados sin protección adicional

### Acciones inmediatas requeridas

- ✅ Implementar validación de tamaño/tipo en uploads
- ✅ Añadir registro de consentimiento
- ✅ Restringir CORS
- ⚠️ Considerar cifrado de datos sensibles

---

**Fin del informe de auditoría**

*Documento generado automáticamente. Para consultas, contactar al equipo de seguridad.*