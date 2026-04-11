# 🚀 GUÍA PARA ACTUALIZAR BACKEND EN RAILWAY

## Paso 1: Acceder al Dashboard de Railway
1. Ve a: https://railway.app/dashboard
2. Selecciona tu proyecto (campo-api-app-campo-saas)
3. Haz clic en el servicio del backend

## Paso 2: Abrir el Editor de Código
1. En el servicio del backend, haz clic en **"Edit"** o el ícono de código
2. Se abrirá el editor en línea

## Paso 3: Actualizar POST /bitacoras (CREAR)

Busca en el archivo la sección de **POST /bitacoras** (alrededor de la línea 420)

**REEMPLAZA el código de INSERT (líneas 440-457):**

```javascript
        const result = await sql`
          INSERT INTO bitacoras (
            id, tipo, estado, tecnico_id, beneficiario_id, 
            cadena_productiva_id, actividad_id, fecha_inicio, coord_inicio,
            actividades_desc, recomendaciones, comentarios_beneficiario,
            coordinacion_interinst, instancia_coordinada, proposito_coordinacion,
            observaciones_coordinador, calificacion, reporte, datos_extendidos,
            created_at, updated_at
          ) VALUES (
            ${id}, ${tipo}, 'borrador', ${tecnicoId}, ${beneficiarioId},
            ${cadenaProductivaId}, ${actividadId}, ${fechaInicio}, ${coordInicio},
            ${body.actividades_desc || null}, ${body.recomendaciones || null}, ${body.comentarios_beneficiario || null},
            ${body.coordinacion_interinst || false}, ${body.instancia_coordinada || null}, ${body.proposito_coordinacion || null},
            ${body.observaciones_coordinador || null}, ${body.calificacion || null}, ${body.reporte || null}, ${body.datos_extendidos ? JSON.stringify(body.datos_extendidos) : null},
            NOW(), NOW()
          )
          RETURNING *
        `;
```

## Paso 4: Actualizar PATCH /bitacoras (ACTUALIZAR)

Busca la sección de **PATCH /bitacoras/:id** (alrededor de la línea 467)

**REEMPLAZA el array de fields (líneas 483-489):**

```javascript
        const fields = [
          'coord_inicio', 'coord_fin', 'fecha_inicio', 'fecha_fin',
          'observaciones_coordinador', 'actividades_desc', 'recomendaciones',
          'comentarios_beneficiario', 'estado',
          'coordinacion_interinst', 'instancia_coordinada', 'proposito_coordinacion',
          'calificacion', 'reporte', 'datos_extendidos'
        ];
```

## Paso 5: Guardar y Desplegar

1. Haz clic en el botón **"Save"** o **"Deploy"**
2. Railway automáticamente redeplegará el servicio
3. Espera ~1-2 minutos hasta que el estado sea "Ready"

## Paso 6: Verificar que funciona

Ejecuta en la terminal:
```bash
curl -X GET https://campo-api-app-campo-saas.up.railway.app/health
```

Debería responder:
```json
{"status":"ok","service":"SADERH API","ts":"2026-01-01T00:00:00.000Z"}
```

---

## 📋 RESUMEN RÁPIDO

| Sección | Cambio |
|---------|--------|
| POST /bitacoras | Insertar 12 campos nuevos en el INSERT |
| PATCH /bitacoras/:id | Agregar 6 campos nuevos al array fields |

---

## ⚠️ IMPORTANTE: Notas sobre el código actual

El código ya está actualizado en tu máquina local. El problema es que Railway tiene la versión antigua. 

Si prefieres no editar manualmente en Railway, haz push a GitHub:
```bash
git add backend/server.js
git commit -m "fix: guardar todos los campos de bitacoras"
git push origin main
```

Railway detectará el cambio y redepleará automáticamente.