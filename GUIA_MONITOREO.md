# ⏰ MONITOREO DEL SERVIDOR - Guía Completa

## 📍 URL ACTUAL CONFIGURADA EN LA APP

```
API URL: https://campo-api-app-campo-saas.up.railway.app
```

Esta URL está en: `lib/api.ts` línea 20

---

## 🎯 HAY 2 OPCIONES:

### Opción 1: El servidor está caído (es lo más probable)
- ✅ Esperar a que el team backend lo arregle
- ✅ Usar el monitor para detectar cuándo se recupera

### Opción 2: La URL es incorrecta
- Proporcionarme la URL correcta del servidor
- Verificar si funciona
- Actualizar la app automáticamente

---

## 📡 USAR MONITOR (Para detectar cuándo esté listo)

### En Terminal:
```bash
node monitor-server.js
```

Esto:
- ✅ Verifica cada 30 segundos si el servidor respondió
- ✅ Guarda logs en `server-monitor.log`
- ✅ Te alerta cuando se recupere: "✨ ¡SERVIDOR RECUPERADO! ✨"
- ✅ Puedes dejar corriendo, no bloquea nada

**Salida esperada:**
```
[25/3/2026 19:30:45] 🔴 Status: 503 (Aún no disponible)
[25/3/2026 19:31:15] 🔴 Status: 503 (Aún no disponible)
[25/3/2026 19:31:45] ✅ Status: 200 ✨ ¡SERVIDOR RECUPERADO! ✨
```

---

## 🔗 VERIFICAR UNA URL DIFERENTE (Si tienes otra URL)

Si el backend te da una URL alternativa:

### En Terminal:
```bash
node verify-url.js https://tu-url-alternativa.com
```

Ejemplo:
```bash
node verify-url.js https://api.production.tuservidor.com
node verify-url.js https://campo-api-prod.railway.app
```

Esto verifica:
- ✅ Si el servidor está en línea
- ✅ Si /health funciona
- ✅ Si /auth/tecnico responde
- ✅ Si otros endpoints están disponibles
- ✅ Te dice si esa es la URL correcta

---

## 🔄 SI LA URL ES DIFERENTE - Actualizar automáticamente

**Paso 1:** Verificar la URL alternativa
```bash
node verify-url.js https://otra-url.com
```

**Paso 2:** Si es correcta, dime y actualizo el código:
```bash
# Yo actualizaré lib/api.ts con la nueva URL
```

---

## 📋 CHECKLIST DE ACCIONES

Ahora mismo:

- [ ] **Opción A: Esperar** (Si crees que el servidor se va a reparar)
  ```bash
  node monitor-server.js
  # Esperar a ver "✨ ¡SERVIDOR RECUPERADO! ✨"
  ```

- [ ] **Opción B: Verificar URL alternativa** (Si tienes otra URL)
  ```bash
  node verify-url.js https://tu-url-alternativa
  # Si dice OK, me la pasas para actualizar
  ```

- [ ] **Opción C: Ambas** (Monitorear Y verificar alternativa)
  ```bash
  # En una terminal:
  node monitor-server.js
  
  # En otra terminal:
  node verify-url.js https://alternativa.com
  ```

---

## 📞 ¿QUÉ NECESITAS HACER?

### PASO 1: Cuéntame
- ¿Tienes una URL alternativa del servidor?
- ¿Debería esperar a que se recupere la URL actual?
- ¿O ambas?

### PASO 2: Yo actualizo
- Si necesitas URL diferente: actualizo `lib/api.ts`
- Recompilo TypeScript
- Todo listo

### PASO 3: Usuarios pueden entrar
- Cuando el servidor esté disponible
- La app reintenta automáticamente
- Funciona para todos con QR EXPO

---

## 🚨 IMPORTANTE

**La app ya tiene:**
- ✅ Reintentos automáticos (5 intentos)
- ✅ Exponential backoff (2s, 4s, 8s, 16s, 32s)
- ✅ Manejo de errores 503
- ✅ Mensajes claros al usuario

**Cuando el servidor esté OK:** 
- ✅ Los usuarios verán "Conectando..."
- ✅ Reintentará automáticamente
- ✅ ¡Funciona!

---

## 🎬 PRÓXIMOS PASOS

**¿Qué URL debo usar?** 

1. URL actual: `https://campo-api-app-campo-saas.up.railway.app` (está devolviendo 503)

2. ¿Tiene el backend una URL diferente?
3. Si no, esperar a que arreglen la actual

**Puedo:**
- ✅ Monitorear automáticamente
- ✅ Verificar URLs alternativas
- ✅ Actualizar el código si cambia
- ✅ Todo listo para usuarios
