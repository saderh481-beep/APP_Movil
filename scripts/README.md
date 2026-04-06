# 🛠️ Scripts de Diagnóstico y Pruebas - SADERH

Este directorio contiene scripts útiles para diagnosticar y probar el sistema de autenticación de SADERH.

## 📋 Scripts Disponibles

### 1. `diagnostico-auth.js` - Diagnóstico Completo
**Uso**: `node scripts/diagnostico-auth.js`

**Descripción**: Realiza un diagnóstico completo del sistema de autenticación, verificando:
- Health check del servidor
- Endpoint de autenticación
- Validación de tokens JWT
- Conexión general
- Otros endpoints protegidos

**Salida**: Reporte detallado con estado de cada componente y recomendaciones.

---

### 2. `test-login.js` - Prueba de Login
**Uso**: `node scripts/test-login.js [código]`

**Ejemplo**: `node scripts/test-login.js 00000`

**Descripción**: Prueba el login con un código específico y verifica:
- Formato del código (5 dígitos)
- Respuesta del servidor
- Validez del token JWT
- Datos del técnico

**Salida**: Resultado detallado del login con información del token.

---

### 3. `verificar-conexion.js` - Verificación de Conexión
**Uso**: `node scripts/verificar-conexion.js`

**Descripción**: Verifica la conexión con todos los endpoints del servidor:
- Health check
- Endpoint de autenticación
- Endpoints protegidos (sin token)

**Salida**: Estado de cada endpoint y diagnóstico general.

---

## 🚀 Guía de Uso Rápido

### Paso 1: Verificar Conexión
```bash
node scripts/verificar-conexion.js
```

Esto te dirá si el servidor está accesible y si los endpoints responden correctamente.

### Paso 2: Diagnóstico Completo
```bash
node scripts/diagnostico-auth.js
```

Esto te dará un reporte detallado del estado del sistema.

### Paso 3: Probar Login
```bash
node scripts/test-login.js 00000
```

Esto verificará que el login funciona con un código específico.

---

## 📊 Interpretación de Resultados

### ✅ Estado OK
- El componente funciona correctamente
- No se requiere acción

### ⚠️ Estado Warning
- El componente tiene advertencias
- Revisar detalles para posible acción

### ❌ Estado Error
- El componente tiene problemas críticos
- Requiere acción inmediata

---

## 🔧 Solución de Problemas Comunes

### Error 503 en /auth/tecnico
**Causa**: Problemas de configuración en el backend  
**Solución**:
1. Verificar `DATABASE_URL` en Railway
2. Verificar `REDIS_URL` en Railway
3. Verificar `JWT_SECRET` en Railway
4. Revisar logs del servidor

### Error de Conexión
**Causa**: Servidor inaccesible  
**Solución**:
1. Verificar conexión a internet
2. Verificar que la URL del servidor sea correcta
3. Verificar que el servidor esté en línea

### Token Inválido
**Causa**: Token JWT malformado o expirado  
**Solución**:
1. Verificar que el backend genere tokens válidos
2. Verificar que el token no esté expirado
3. Verificar que el token tenga la estructura correcta

---

## 📝 Notas

- Estos scripts requieren Node.js instalado
- Los scripts usan HTTPS para conectar con el servidor
- Los timeouts están configurados a 10 segundos
- Los colores en la salida son compatibles con terminales modernos

---

## 🔗 Enlaces Útiles

- [Documentación de Railway](https://docs.railway.app/)
- [Documentación de JWT](https://jwt.io/)
- [Documentación de Node.js](https://nodejs.org/)

---

**Última actualización**: 31 de Marzo de 2026  
**Versión**: 1.0.0
