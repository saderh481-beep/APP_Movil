# 🛠️ GUÍA DE CORRECCIONES - TypeScript Errors

## Errores a corregir para compilación

### 1. CRÍTICO: tsconfig.json

**Archivo:** `tsconfig.json`

**Problema:** Referencia a 'bun-types' que no existe

**Solución:**
```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "allowJs": true,
    "target": "ES2020",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "types": ["react-native", "node"]
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", "build"]
}
```

---

### 2. CRÍTICO: dashboard.tsx - Línea 191

**Problema:** `a.fecha_limite` puede ser undefined

**Ubicación:** `app/tabs/dashboard.tsx:191`

**Código actual:**
```typescript
prox: fil.filter(a => a.fecha_limite > fmt(man) && !a.completado),
```

**Error:**
```
"a.fecha_limite" es posibleamente "undefined".
```

**Solución - Opción A (Recomendado):**
```typescript
prox: fil.filter(a => (a.fecha_limite ?? '') > fmt(man) && !a.completado),
```

**Solución - Opción B (Mejor mantenibilidad):**
```typescript
prox: fil.filter(a => {
  const deadline = a.fecha_limite ?? a.created_at ?? new Date().toISOString();
  return deadline > fmt(man) && !a.completado;
}),
```

---

### 3. CRÍTICO: dashboard.tsx - Línea 199 y 221

**Problema:** El tipo 'undefined' no se puede usar como tipo de índice

**Ubicación:** `app/tabs/dashboard.tsx:199` y `:221`

**Código actual:**
```typescript
// Línea 199
const tc = TC[item.tipo_asignacion] ?? Colors.gray500;

// Línea 221
<View style={[s.pdot, { backgroundColor: PC[item.prioridad] }]} />
```

**Errores:**
```
El tipo 'undefined' no se puede usar como tipo de índice.
```

**Causa:** `item.tipo_asignacion` e `item.prioridad` pueden ser undefined

**Solución:**
```typescript
// Línea 199
const tc = TC[item.tipo_asignacion ?? 'actividad'] ?? Colors.gray500;

// Línea 221 - necesita ser
<View style={[s.pdot, { backgroundColor: PC[item.prioridad ?? 'MEDIA'] ?? Colors.gray500 }]} />
```

---

### 4. CRÍTICO: dashboard.tsx - Línea 214

**Problema:** Comparación con tipo undefined

**Ubicación:** `app/tabs/dashboard.tsx:214`

**Código actual:**
```typescript
<Text style={[s.badgeT, { color: tc }]}>
  {item.tipo_asignacion === 'BENEFICIARIO' ? 'Visita' : 'Actividad'}
</Text>
```

**Error:**
```
Esta comparación parece no intencionada porque los tipos 
"TipoAsignacion | undefined" y ""BENEFICIARIO"" no tienen superposición.
```

**Nota:** El tipo correcto es 'beneficiario' (minúscula), no 'BENEFICIARIO'

**Solución:**
```typescript
<Text style={[s.badgeT, { color: tc }]}>
  {(item.tipo_asignacion ?? 'actividad') === 'beneficiario' ? 'Visita' : 'Actividad'}
</Text>
```

---

### 5. CRÍTICO: connection-diagnostic.ts - Línea 82

**Problema:** null vs undefined incompatibilidad

**Ubicación:** `lib/connection-diagnostic.ts:82`

**Código actual:**
```typescript
const contentType = res.headers.get('content-type');
if (!contentType?.includes('application/json')) {
  return { ok: false, contentType, error: `Unexpected content-type: ${contentType}` };
}
```

**Error:**
```
El tipo 'string | null' no se puede asignar al tipo 'string | undefined'.
El tipo 'null' no se puede asignar al tipo 'string | undefined'.
```

**Causa:** `get()` devuelve `string | null`, pero el return espera `string | undefined`

**Solución:**
```typescript
const contentType = res.headers.get('content-type') ?? 'text/plain';
if (!contentType.includes('application/json')) {
  return { ok: false, contentType, error: `Unexpected content-type: ${contentType}` };
}
```

---

### 6. CRÍTICO: detalle-asignacion.tsx - Import faltante

**Problema:** No importa `DatosExtendidos`

**Ubicación:** `app/stack/detalle-asignacion.tsx:1-30`

**Líneas con error:** 229, 293 (usages)

**Código actual:**
```typescript
import { ActivityIndicator, Alert, ... } from 'react-native';
import { useAuthStore } from '@/store/authStore';
// ❌ Falta: import { DatosExtendidos }
```

**Error:**
```
No se encuentra el nombre 'DatosExtendidos'.
```

**Solución - Agregar al import:**
```typescript
import { 
  DatosExtendidos,  // ← AGREGAR
  Bitacora, 
  Usuario,
  Beneficiario,
  Asignacion 
} from '@/types/models';
```

**Verificación:** El tipo ya existe en `types/models.ts:38-51`

```typescript
export interface DatosExtendidos {
  tipo_cultivo?: string;
  etapa_fenologica?: string;
  salud_cultivo?: number;
  hay_incidentes?: boolean;
  tipo_incidente?: string;
  descripcion_incidente?: string;
  calidad_servicio?: number;
  calificacion_coordinacion?: number;
  cumplimiento_metas?: boolean;
  observaciones?: string;
}
```

---

## 📋 Checklist de correcciones

- [ ] Actualizar tsconfig.json (sin referencias a bun-types)
- [ ] Corregir dashboard.tsx línea 191 (fecha_limite ?? default)
- [ ] Corregir dashboard.tsx línea 199 (tipo_asignacion ?? default)
- [ ] Corregir dashboard.tsx línea 214 (comparar con 'beneficiario' minúscula)
- [ ] Corregir dashboard.tsx línea 221 (prioridad ?? default)
- [ ] Corregir connection-diagnostic.ts línea 82 (contentType ?? default)
- [ ] Agregar import de DatosExtendidos en detalle-asignacion.tsx
- [ ] Verificar que no hay errores: `npm install && npm run build`

## Tiempo estimado: 15-30 minutos

---

*Última actualización: 25 de marzo de 2026*
