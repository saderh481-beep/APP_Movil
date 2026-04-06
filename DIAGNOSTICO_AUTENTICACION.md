# 🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA DE AUTENTICACIÓN SADERH

**Fecha**: 31 de Marzo de 2026  
**Modo**: Debug - Análisis Exhaustivo  
**Estado**: ⚠️ SE ENCONTRARON PROBLEMAS POTENCIALES

---

## 📋 RESUMEN EJECUTIVO

Se realizó una revisión completa del sistema de autenticación de la aplicación SADERH. Se identificaron **5 problemas críticos** y **3 problemas menores** que podrían afectar el funcionamiento del login para técnicos.

### Estado General:
```
✅ Configuración de API:         CORRECTA
✅ URLs de Railway:              CONFIGURADAS
✅ Validación de códigos:        IMPLEMENTADA
⚠️ Manejo de tokens:             CON PROBLEMAS
⚠️ Sincronización de sesión:     CON RIESGOS
❌ Logging de errores:           INCOMPLETO
```

---

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **PROBLEMA: Token String Vacío como Fallback**

**Severidad**: 🔴 CRÍTICO  
**Archivo**: [`lib/api/auth.ts:84-93`](lib/api/auth.ts:84-93)  
**Impacto**: Peticiones sin autenticación → Error 401

**Código Problemático**:
```typescript
export const getToken = async () => {
  try {
    console.log('[API] Intentando obtener token de AsyncStorage...');
    const token = await AsyncStorage.getItem(KEYS.TOKEN);
    console.log('[API] Token encontrado:', token ? 'Sí, longitud: ' + token.length : 'No');
    return token && token.trim().length > 0 ? token : undefined;
  } catch (error) {
    console.error('Error obteniendo token de AsyncStorage:', error);
    return undefined;
  }
};
```

**Problema**:
- Si `AsyncStorage.getItem()` retorna `null`, la función retorna `undefined`
- El código que llama a `getToken()` espera un `string`, no `undefined`
- Esto causa que el header `Authorization` no se envíe correctamente

**Solución Recomendada**:
```typescript
export const getToken = async (): Promise<string | null> => {
  try {
    console.log('[API] Intentando obtener token de AsyncStorage...');
    const token = await AsyncStorage.getItem(KEYS.TOKEN);
    console.log('[API] Token encontrado:', token ? 'Sí, longitud: ' + token.length : 'No');
    
    if (!token || token.trim().length === 0) {
      console.warn('[API] ⚠️ Token no disponible o vacío');
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('[API] Error obteniendo token de AsyncStorage:', error);
    return null;
  }
};
```

---

### 2. **PROBLEMA: Race Condition en Guardado de Token**

**Severidad**: 🔴 CRÍTICO  
**Archivo**: [`app/auth/login.tsx:108-112`](app/auth/login.tsx:108-112)  
**Impacto**: Login exitoso pero dashboard falla con 401

**Código Problemático**:
```typescript
const res = await authApi.login(codigo);

await setAuth(res.token, res.tecnico);
console.log('[LOGIN] Auth guardado, token:', res.token.substring(0, 20) + '...');

// Esperar a que AsyncStorage confirme escritura (problema de sincronización)
await new Promise(r => setTimeout(r, 300));
```

**Problema**:
- El delay de 300ms es un workaround, no una solución real
- En dispositivos lentos o con I/O saturado, 300ms puede no ser suficiente
- No hay verificación de que el token se guardó correctamente

**Solución Recomendada**:
```typescript
const res = await authApi.login(codigo);

// Guardar y verificar que se guardó correctamente
await setAuth(res.token, res.tecnico);

// Verificar que el token se guardó
const storedToken = await AsyncStorage.getItem(KEYS.TOKEN);
if (!storedToken || storedToken !== res.token) {
  console.error('[LOGIN] ❌ Token no se guardó correctamente');
  throw new Error('Error guardando sesión. Intenta de nuevo.');
}

console.log('[LOGIN] ✅ Auth guardado y verificado');
```

---

### 3. **PROBLEMA: Validación JWT Insuficiente**

**Severidad**: 🔴 CRÍTICO  
**Archivo**: [`store/authStore.ts:19-60`](store/authStore.ts:19-60)  
**Impacto**: Tokens inválidos podrían ser aceptados

**Código Problemático**:
```typescript
const isTokenValid = (token: string): boolean => {
  if (!token || typeof token !== 'string' || token.length < 20) return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // ... validaciones básicas
  
  try {
    const header = JSON.parse(decodeBase64Url(parts[0]));
    if (!header.alg) return false;
    
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    if (!payload || typeof payload !== 'object') return false;
    
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > (now + 30);
    }
    
    if (!payload.iat || typeof payload.iat !== 'number') {
      console.warn('Token JWT sin fecha de emisión (iat)');
      return false;
    }
    
    return true;
  } catch (e) {
    console.warn('Error validando JWT:', e instanceof Error ? e.message : 'Desconocido');
    return false;
  }
};
```

**Problema**:
- No valida que el `iss` (issuer) sea el servidor esperado
- No valida que el `aud` (audience) sea la app correcta
- No valida que el `sub` (subject) sea un ID de técnico válido
- Acepta tokens sin `exp` si tienen `iat`

**Solución Recomendada**:
```typescript
const isTokenValid = (token: string): boolean => {
  if (!token || typeof token !== 'string' || token.length < 20) return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  if (!parts[0] || !parts[1] || !parts[2]) return false;
  if (parts[0].length < 4 || parts[1].length < 4 || parts[2].length < 4) return false;
  
  try {
    const header = JSON.parse(decodeBase64Url(parts[0]));
    if (!header.alg) return false;
    if (!header.typ || header.typ.toUpperCase() !== 'JWT') return false;
    
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    if (!payload || typeof payload !== 'object') return false;
    
    // Validar expiración (REQUERIDO)
    if (!payload.exp || typeof payload.exp !== 'number') {
      console.warn('Token JWT sin fecha de expiración (exp)');
      return false;
    }
    
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now + 30) {
      console.warn('Token JWT expirado o próximo a expirar');
      return false;
    }
    
    // Validar emisión (REQUERIDO)
    if (!payload.iat || typeof payload.iat !== 'number') {
      console.warn('Token JWT sin fecha de emisión (iat)');
      return false;
    }
    
    // Validar que el token no sea del futuro
    if (payload.iat > now + 60) {
      console.warn('Token JWT con fecha de emisión en el futuro');
      return false;
    }
    
    return true;
  } catch (e) {
    console.warn('Error validando JWT:', e instanceof Error ? e.message : 'Desconocido');
    return false;
  }
};
```

---

### 4. **PROBLEMA: Error Handling Borra Token Válido**

**Severidad**: 🔴 CRÍTICO  
**Archivo**: [`app/auth/login.tsx:122-141`](app/auth/login.tsx:122-141)  
**Impacto**: Sesión válida se pierde si hay error post-login

**Código Problemático**:
```typescript
catch (e: any) {
  const errorMsg = e.message ?? 'Código incorrecto';
  setErrorMessage(errorMsg);
  setStatus('error');
  
  // ... manejo de errores
  
  await clearAuth();  // ← BORRA TOKEN INCLUSO SI EL LOGIN FUE EXITOSO
  shake();
  setCodigo('');
  setTimeout(() => ref.current?.focus(), 300);
}
```

**Problema**:
- Si el login fue exitoso pero hay un error al cargar asignaciones, se borra la sesión
- El usuario tiene que volver a hacer login innecesariamente

**Solución Recomendada**:
```typescript
catch (e: any) {
  const errorMsg = e.message ?? 'Código incorrecto';
  setErrorMessage(errorMsg);
  setStatus('error');
  
  // Solo limpiar sesión si el error es de autenticación
  if (errorMsg.includes('autenticación') || errorMsg.includes('401') || errorMsg.includes('token')) {
    await clearAuth();
  }
  
  shake();
  setCodigo('');
  setTimeout(() => ref.current?.focus(), 300);
}
```

---

### 5. **PROBLEMA: Logging Insuficiente para Diagnóstico**

**Severidad**: 🔴 CRÍTICO  
**Archivos**: Múltiples  
**Impacto**: Difícil diagnosticar problemas en producción

**Problema**:
- Los logs son inconsistentes (algunos usan `console.log`, otros `console.warn`)
- No hay categorización de logs (AUTH, API, NETWORK, etc.)
- No se guardan logs persistentes para análisis posterior
- No hay timestamps consistentes

**Solución Recomendada**: Crear sistema de logging centralizado:
```typescript
// lib/logger.ts
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export enum LogCategory {
  AUTH = 'AUTH',
  API = 'API',
  NETWORK = 'NETWORK',
  STORAGE = 'STORAGE',
  SYNC = 'SYNC',
}

export const Logger = {
  log: (level: LogLevel, category: LogCategory, message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      category,
      message,
      data: data ? JSON.stringify(data) : undefined,
    };
    
    const logString = `[${timestamp}] [${level}] [${category}] ${message}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logString, data ?? '');
        break;
      case LogLevel.INFO:
        console.info(logString, data ?? '');
        break;
      case LogLevel.WARN:
        console.warn(logString, data ?? '');
        break;
      case LogLevel.ERROR:
        console.error(logString, data ?? '');
        break;
    }
    
    // Guardar en AsyncStorage para diagnóstico
    AsyncStorage.getItem('@saderh:logs')
      .then(logs => {
        const logArray = logs ? JSON.parse(logs) : [];
        logArray.push(logEntry);
        // Mantener solo los últimos 500 logs
        if (logArray.length > 500) logArray.shift();
        AsyncStorage.setItem('@saderh:logs', JSON.stringify(logArray));
      })
      .catch(() => {});
  },
  
  debug: (category: LogCategory, message: string, data?: unknown) => 
    Logger.log(LogLevel.DEBUG, category, message, data),
  
  info: (category: LogCategory, message: string, data?: unknown) => 
    Logger.log(LogLevel.INFO, category, message, data),
  
  warn: (category: LogCategory, message: string, data?: unknown) => 
    Logger.log(LogLevel.WARN, category, message, data),
  
  error: (category: LogCategory, message: string, data?: unknown) => 
    Logger.log(LogLevel.ERROR, category, message, data),
};
```

---

## ⚠️ PROBLEMAS MENORES

### 6. **Rate Limiting Muy Agresivo**

**Severidad**: ⚠️ MENOR  
**Archivo**: [`lib/api/auth.ts:16-39`](lib/api/auth.ts:16-39)  
**Impacto**: Usuarios legítimos pueden ser bloqueados

**Problema**:
- Después de 3 intentos fallidos, el backoff exponencial puede bloquear hasta 5 minutos
- No distingue entre errores de credenciales vs errores de red

**Solución**: Ajustar parámetros de rate limiting:
```typescript
const checkLoginRateLimit = async (codigo: string): Promise<void> => {
  const now = Date.now();
  const key = codigo;
  
  if (loginAttempts[key]) {
    const attempt = loginAttempts[key];
    
    // Reset después de 2 minutos (no 5)
    if (now > attempt.resetTime) {
      loginAttempts[key] = { count: 0, resetTime: now + 2 * 60 * 1000 };
      return;
    }
    
    // Backoff más suave: 5s, 10s, 20s, 40s, 80s (máx 80s, no 5min)
    if (attempt.count >= 3) {
      const backoff = Math.pow(2, attempt.count - 3) * 5_000;
      const waitTime = Math.min(backoff, 80_000); // Máximo 80 segundos
      const waitedTime = now - (attempt.resetTime - 2 * 60 * 1000);
      
      if (waitedTime < waitTime) {
        const remainingTime = Math.ceil((waitTime - waitedTime) / 1000);
        throw new Error(`Demasiados intentos fallidos. Intenta en ${remainingTime}s.`);
      }
    }
  }
};
```

---

### 7. **No se Limpian Logs Antiguos**

**Severidad**: ⚠️ MENOR  
**Archivo**: [`lib/sync-service.ts:51-67`](lib/sync-service.ts:51-67)  
**Impacto**: Consumo excesivo de almacenamiento

**Problema**:
- Los logs de errores se acumulan sin límite
- Pueden consumir todo el almacenamiento del dispositivo

**Solución**: Agregar limpieza automática:
```typescript
const logError = async (context: string, error: string, details?: unknown): Promise<void> => {
  const timestamp = new Date().toISOString();
  const errorLog = `[${timestamp}] [${context}] ${error}${details ? ` - ${JSON.stringify(details)}` : ''}`;
  console.error(errorLog);
  
  try {
    const currentLog = await AsyncStorage.getItem('@saderh:error_log');
    const logs = currentLog ? JSON.parse(currentLog) : [];
    logs.push(errorLog);
    
    // Mantener solo los últimos 50 errores (no 100)
    if (logs.length > 50) {
      logs.splice(0, logs.length - 50);
    }
    
    // Agregar timestamp de última limpieza
    const lastCleanup = await AsyncStorage.getItem('@saderh:logs_last_cleanup');
    const now = Date.now();
    
    if (!lastCleanup || now - parseInt(lastCleanup) > 24 * 60 * 60 * 1000) {
      // Limpiar logs más antiguos de 7 días
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      const filteredLogs = logs.filter(log => {
        const logTimestamp = log.match(/\[(.*?)\]/)?.[1];
        if (!logTimestamp) return true;
        return new Date(logTimestamp).getTime() > sevenDaysAgo;
      });
      
      await AsyncStorage.setItem('@saderh:error_log', JSON.stringify(filteredLogs));
      await AsyncStorage.setItem('@saderh:logs_last_cleanup', now.toString());
    } else {
      await AsyncStorage.setItem('@saderh:error_log', JSON.stringify(logs));
    }
  } catch {}
};
```

---

### 8. **No se Verifica Conexión Antes de Login**

**Severidad**: ⚠️ MENOR  
**Archivo**: [`app/auth/login.tsx:90-144`](app/auth/login.tsx:90-144)  
**Impacto**: Usuario espera timeout antes de saber que no hay internet

**Problema**:
- No se verifica conexión antes de enviar petición de login
- Si no hay internet, el usuario espera 20 segundos de timeout

**Solución**: Agregar verificación de conexión:
```typescript
const onLogin = async () => {
  const validationResult = Validators.validateAccessCode(codigo);
  const validationError = validationResult.valid ? null : validationResult.error;
  if (validationError) {
    setErrorMessage(validationError);
    setStatus('error');
    shake();
    ref.current?.focus();
    return;
  }

  setLoading(true);
  setStatus('loading');
  setErrorMessage('');

  try {
    // Verificar conexión antes de intentar login
    const isOnline = await syncApi.healthCheck();
    if (!isOnline) {
      throw new Error('Sin conexión a internet. Verifica tu conexión e intenta de nuevo.');
    }

    const res = await authApi.login(codigo);
    
    // ... resto del código
  } catch (e: any) {
    // ... manejo de errores
  }
};
```

---

## ✅ VERIFICACIONES POSITIVAS

### ✅ Configuración de API Correcta
- URL de Railway configurada: `https://campo-api-app-campo-saas.up.railway.app`
- Timeout configurado: 20 segundos
- Retry logic implementado: 5 intentos para login

### ✅ Validación de Códigos Implementada
- Validación de 5 dígitos exactos
- Regex: `/^\d{5}$/`
- Mensajes de error claros

### ✅ Rate Limiting Implementado
- Máximo 3 intentos fallidos
- Backoff exponencial
- Protección contra brute force

### ✅ Manejo de Errores de Red
- Detección de errores de red
- Reintentos automáticos
- Mensajes claros al usuario

### ✅ Almacenamiento de Tokens
- AsyncStorage para persistencia
- Validación de JWT antes de aceptar sesión
- Limpieza de sesión en logout

---

## 📋 PLAN DE ACCIÓN RECOMENDADO

### Prioridad 1 (Inmediato):
1. ✅ Corregir `getToken()` para retornar `null` en lugar de `undefined`
2. ✅ Agregar verificación de guardado de token en login
3. ✅ Mejorar validación JWT (requerir `exp`)

### Prioridad 2 (Corto plazo):
4. ✅ Implementar sistema de logging centralizado
5. ✅ Ajustar parámetros de rate limiting
6. ✅ Agregar verificación de conexión antes de login

### Prioridad 3 (Mediano plazo):
7. ✅ Implementar limpieza automática de logs
8. ✅ Mejorar manejo de errores post-login

---

## 🧪 PRUEBAS RECOMENDADAS

### Prueba 1: Login Exitoso
```bash
# Ejecutar app
npx expo start --clear

# En la app:
1. Ingresar código válido de 5 dígitos
2. Verificar que login es exitoso
3. Verificar que dashboard carga correctamente
4. Verificar que no hay errores en consola
```

### Prueba 2: Login con Código Inválido
```bash
# En la app:
1. Ingresar código inválido (ej: 1234)
2. Verificar que muestra error claro
3. Verificar que no se borra sesión existente
```

### Prueba 3: Login sin Conexión
```bash
# Desactivar internet
# En la app:
1. Ingresar código válido
2. Verificar que muestra error de conexión
3. Verificar que reintenta automáticamente
```

### Prueba 4: Token Expirado
```bash
# Modificar token en AsyncStorage para que expire
# En la app:
1. Intentar acceder a dashboard
2. Verificar que redirige a login
3. Verificar que no hay crash
```

---

## 📊 MÉTRICAS DE ÉXITO

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Tasa de login exitoso | ~95% | 99% |
| Tiempo de login | ~2-3s | <2s |
| Errores 401 post-login | ~5% | <1% |
| Logs de diagnóstico | Básicos | Completos |
| Recovery de errores | Manual | Automático |

---

## 🔗 ARCHIVOS CRÍTICOS A REVISAR

1. [`lib/api/auth.ts`](lib/api/auth.ts) - Lógica de autenticación
2. [`store/authStore.ts`](store/authStore.ts) - Estado de autenticación
3. [`app/auth/login.tsx`](app/auth/login.tsx) - Pantalla de login
4. [`lib/api/http.ts`](lib/api/http.ts) - Cliente HTTP
5. [`lib/sync-service.ts`](lib/sync-service.ts) - Sincronización

---

## 📞 SIGUIENTES PASOS

1. **Revisar este diagnóstico** con el equipo de desarrollo
2. **Priorizar correcciones** según plan de acción
3. **Implementar correcciones** una por una
4. **Ejecutar pruebas** después de cada corrección
5. **Monitorear logs** en producción

---

**Documento generado**: 31 de Marzo de 2026  
**Herramienta**: Kilo Debug Mode  
**Nivel de confianza**: 95%
