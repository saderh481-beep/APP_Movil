# GUÍA DE VERIFICACIÓN RÁPIDA
**Tiempo estimado**: 5 minutos

---

## PASO 1: Verificar estado_corte en BD (1 min)

Conecta a PostgreSQL en Railway:

```bash
# Opción A: psql CLI
psql postgresql://usuario:password@host:port/database

# Opción B: DBeaver / Adminer

# Query:
SELECT COUNT(*) as total, estado_corte, COUNT(*) as cantidad
FROM usuarios 
GROUP BY estado_corte
ORDER BY cantidad DESC;
```

**Resultado esperado AHORA** (confirmando el problema):
```
 count | estado_corte
-------|---------------
  6    | activo        ← ❌ AQUÍ ESTÁ EL PROBLEMA
  0    | en_servicio   ← ❌ Debería tener aquí
```

**Resultado esperado DESPUÉS del fix**:
```
 count | estado_corte
-------|---------------
  6    | en_servicio   ← ✅ CORRECTO
  0    | activo        ← ✅ Limpiado
```

---

## PASO 2: Aplicar Fix (1 min)

### OPCIÓN A: Cambiar en BD

```sql
UPDATE usuarios 
SET estado_corte = 'en_servicio'
WHERE estado_corte = 'activo';

-- Verificar:
SELECT COUNT(*), estado_corte FROM usuarios GROUP BY estado_corte;
```

### OPCIÓN B: Cambiar en Backend

Ubicar archivo: `/routes/auth.ts` (o similar en repo backend)

En la función de validación del login:
```javascript
// BUSCAR:
if (user.fecha_limite < new Date() || user.estado_corte !== 'en_servicio') {
  return res.status(401).json({ error: 'periodo_vencido' });
}

// CAMBIAR A:
if (user.fecha_limite < new Date() || 
    (user.estado_corte && !['en_servicio', 'activo'].includes(user.estado_corte))) {
  return res.status(401).json({ error: 'periodo_vencido' });
}

// O SIMPLEMENTE:
if (user.fecha_limite < new Date() || !user.activo) {
  return res.status(401).json({ error: 'periodo_vencido' });
}
```

---

## PASO 3: Resetear App (1 min)

En el dispositivo o emulador:

```bash
# Opción A: Ejecutar app de desarrollo
npm run android   # O run:ios

# Opción B: Limpiar caché app
# Android: Settings → Apps → [app] → Storage → Clear Cache/Data
# iOS: Settings → General → iPhone Storage → [app] → Delete → Reinstall
```

---

## PASO 4: Probar Login (2 min)

1. Abre la app
2. Ingresa código: `72147`
3. Espera a que cargue
4. Si antes mostraba "Error No autenticado" → Ahora debe mostrar: ✅ Asignaciones cargadas

---

## PASO 5: Verificar Logs (si falla aún)

En el terminal de desarrollo:

```bash
npm run android   # Ver logs en directo

# O en Android:
adb logcat | grep "saderh\|AUTH\|Error"
```

Buscar logs como:
```
✅ [HTTP 1/6] POST /auth/tecnico
✅ [HTTP SUCCESS] POST /auth/tecnico
✅ [HTTP 1/4] GET /mis-actividades
❌ [HTTP ERROR 401] No autenticado  ← Si sale esto, aún es BD
```

---

## PASO 6: Confirmar Fix Funcionó

Cuando funcione, verás en logs:
```
✅ [HTTP SUCCESS] GET /mis-actividades
✅ Se cargaron X asignaciones
✅ Login: OK
✅ Dashboard: 6 asignaciones
```

---

## ⚡ VERIFICACIÓN RÁPIDA ALTERNATIVA

Si prefiere no tocar BD, ejecuta este script en tu máquina con Node:

```bash
node test-auth-valid.js
```

Este script:
1. ✅ Intenta login con código 72147
2. ✅ Si OK, obtiene /mis-actividades CON token
3. ✅ Muestra exactamente dónde falla

**Resultado esperado ANTES del fix**:
```
✅ Status: 200 (Login exitoso)
✅ Token recibido: eyJ...
❌ Status: 401 (Asignaciones - ERROR)
❌ Error: No autenticado
```

**Resultado esperado DESPUÉS del fix**:
```
✅ Status: 200 (Login exitoso)
✅ Token recibido: eyJ...
✅ Status: 200 (Asignaciones - OK)
✅ Asignaciones encontradas: N
```

---

## 🎯 RESUMEN

| Paso | Acción | Tiempo |
|------|--------|--------|
| 1 | Verificar estado_corte en BD | 1 min |
| 2 | Actualizar BD o Backend | 1 min |
| 3 | Resetear app | 1 min |
| 4 | Probar login | 2 min |
| **Total** | | **5 min** |

---

## ❓ SI SIGUE FALLANDO

1. Verificar que BD actualización se completó:
   ```sql
   SELECT COUNT(*) FROM usuarios WHERE estado_corte = 'en_servicio';
   -- Debe mostrar: 6 (o número total de usuarios)
   ```

2. Limpiar caché en el app:
   ```bash
   rm -rf app/build
   npm install
   npm run android
   ```

3. Si cambió backend, asegurarse que esté deploy-ado:
   ```bash
   # En el repo del backend:
   git commit -am "Fix: Aceptar estado_corte='activo' temporal"
   git push   # Si usa CI/CD automático = auto deploy
   ```

4. Contactar soporte Railway si servidor está down

---

**Última actualización**: 25/03/2026
