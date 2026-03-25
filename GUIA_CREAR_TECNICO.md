# 📱 Guía: Crear Nuevo Técnico para Login

## ✅ Opción 1: Usar el Script (Recomendado)

```bash
node create-tecnico.js
```

Este script te pedirá:
- Código de acceso (5 dígitos)
- Nombre completo
- Correo

Y **automáticamente** configurará los campos correctos.

---

## ✅ Opción 2: SQL Directo (Si accedes a pgAdmin/psql)

### Para UN NUEVO técnico:

```sql
INSERT INTO usuarios (
  codigo_acceso,
  nombre,
  correo,
  activo,
  fecha_limite,
  estado_corte
)
VALUES (
  '12345',              -- IMPORTANTE: Exactamente 5 dígitos
  'Nombre del Técnico',
  'tecnico@example.com',
  true,                 -- IMPORTANTE: Debe ser true
  NULL,                 -- IMPORTANTE: NULL = sin límite de fecha
  'en_servicio'         -- IMPORTANTE: Debe ser 'en_servicio'
);
```

### Reemplaza estos valores:
- `'12345'` → Tu código de 5 dígitos
- `'Nombre del Técnico'` → Nombre completo
- `'tecnico@example.com'` → Correo del técnico

---

## ⚠️ CAMPOS CRÍTICOS PARA LOGIN:

| Campo | Valor Correcto | Por qué |
|-------|---|---|
| `codigo_acceso` | **Exactamente 5 dígitos** | Backend valida length === 5 |
| `activo` | **true** | Solo usuarios activos pueden login |
| `fecha_limite` | **NULL** (o fecha futura) | NULL = sin limite, permite login |
| `estado_corte` | **'en_servicio'** | Debe ser este exact string |

---

## ✅ Verificar que el nuevo técnico pueda login:

Después de crear el técnico:

```bash
node test-login-complete.js
```

O prueba directamente en la app con el código que creaste.

---

## 🚨 Errores Comunes:

❌ **"Código inválido o expirado"**
- Código no tiene exactamente 5 dígitos
- El usuario no está activo (activo = false)

❌ **"periodo_vencido"**
- estado_corte no es 'en_servicio'
- fecha_limite es menor a la fecha actual

✅ **Solución**: Usa el script `node create-tecnico.js` para evitar estos errores.
