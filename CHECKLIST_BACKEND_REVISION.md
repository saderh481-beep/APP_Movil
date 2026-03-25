# 🔧 CHECKLIST: QUÉ REVISAR EN EL BACKEND

**Basado en**: .env que proporcionaste + Problema 503 en /auth/tecnico

---

## ⚡ RESUMEN RÁPIDO

Tu `.env` requiere **4 componentes críticos**. Si uno falla, `/auth/tecnico` retorna **503**.

| Variable | Estado | Impacto |
|----------|--------|--------|
| DATABASE_URL | ❓ | Si falta → BD no funciona → 503 |
| REDIS_URL | ❓ | Si falta → Sesiones fallan → 503 |
| JWT_SECRET | ❓ | Si falta → Auth no genera token → 503 |
| CLOUDINARY_* | ⚠️ | Secundario, no debería bloquear auth |

**Tu problema**: Probablemente `DATABASE_URL` o `REDIS_URL` no está configurado, o están misconfigured.

---

## 📋 CHECKLIST DETALLADO

### 1️⃣ VERIFICAR .ENV EN PRODUCCIÓN

```bash
# SSH al servidor
ssh usuario@tu-servidor

# Ver .env (CUIDADO: contiene secretos)
cat /path/to/app/.env

# Verificar cada variable:
echo $DATABASE_URL
echo $REDIS_URL
echo $JWT_SECRET
echo $CLOUDINARY_CLOUD_NAME
```

**Deberías ver algo como:**
```
DATABASE_URL=postgresql://user:pass@host.railway.internal:5432/dbname
REDIS_URL=redis://default:pass@redis-host:6379
JWT_SECRET=<base64-string-seguro>
CLOUDINARY_CLOUD_NAME=tu-cloud
```

**Si ves algo vacío o incompleto → ESE ES EL PROBLEMA**

---

### 2️⃣ VERIFICAR POSTGRESQL (Base de Datos)

```bash
# Conectarse a la BD desde el servidor
psql "$DATABASE_URL"

# Si funciona, debería entrar a psql shell
# Verificar tabla usuarios:
SELECT COUNT(*) FROM usuarios;

# Debería retornar un número

# Ver estructura:
\d usuarios;

# Ver si hay registros activos:
SELECT id, nombre, codigo, activo, fecha_limite, estado_corte 
FROM usuarios LIMIT 5;
```

**Si psql NO funciona:**
- ❌ Problema: BD no alcanzable
- ❌ Causa: DATABASE_URL incorrecto o PostgreSQL caído
- ❌ Síntoma: /auth/tecnico retorna 503

---

### 3️⃣ VERIFICAR REDIS (Sesiones)

```bash
# Conectarse a Redis desde el servidor
redis-cli -u "$REDIS_URL"

# Si funciona, debería entrar a redis shell
# Ejecutar:
PING

# Debería responder: PONG

# Ver sesiones actuales:
KEYS session:*

# Ver una sesión específica:
GET session:cualquier_key
```

**Si redis-cli NO funciona:**
- ❌ Problema: Redis no alcanzable
- ❌ Causa: REDIS_URL incorrecto o Redis caído
- ❌ Síntoma: /auth/tecnico retorna 503

---

### 4️⃣ VERIFICAR JWT_SECRET

```bash
# Debería ser un string seguro (base64)
echo $JWT_SECRET

# Debería retornar algo largo como:
# abc123def456ghi789jkl012mno345pqr678stu901vwx234yz...

# Si está vacío → Problema
# Si es "REEMPLAZA_CON_UN_SECRETO_SEGURO" → Problema
```

**Si JWT_SECRET está vacío o placeholder:**
- ❌ Problema: Token JWT no puede generarse
- ❌ Síntoma: /auth/tecnico retorna 503

---

### 5️⃣ VERIFICAR CONEXIONES DESDE CÓDIGO

```javascript
// Pseudo-código en el backend auth.js
// Debería haber algo como:

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Si esto falta o está mal → query fallará
})

const redis = redis.createClient({
  url: process.env.REDIS_URL,
  // Si esto falta o está mal → sesión fallará
})

const token = jwt.sign(payload, process.env.JWT_SECRET);
// Si JWT_SECRET falta → error aquí
```

**Revisar logs:**
```bash
# Ver últimos 100 líneas de log
docker logs <container> --tail 100

# Buscar errores en auth:
docker logs <container> | grep -i auth

# Buscar errores en conexión:
docker logs <container> | grep -i "connect\|pool\|redis\|pgboss"
```

---

## 🔍 TEST ESPECÍFICO PARA /auth/tecnico

### Opción 1: Revisar el código

```javascript
// En tu endpoint POST /auth/tecnico
// Debería haber algo como:

app.post('/auth/tecnico', async (req, res) => {
  try {
    const { codigo } = req.body;
    
    // 1. Validar formato
    if (!codigo || !/^\d{5}$/.test(codigo)) {
      return res.status(401).json({ error: 'Codigo invalido' });
    }
    
    // 2. Buscar usuario en BD ← AQUÍ PUEDE FALLAR SI BD NO CONECTA
    const usuario = await pool.query(
      'SELECT * FROM usuarios WHERE codigo = $1',
      [codigo]
    );
    
    if (!usuario.rows.length) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    const user = usuario.rows[0];
    
    // 3. Validar que esté activo
    if (!user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }
    
    // 4. Validar período
    if (user.fecha_limite < new Date() || user.estado_corte !== 'en_servicio') {
      return res.status(401).json({ error: 'periodo_vencido' });
    }
    
    // 5. Generar token ← AQUÍ PUEDE FALLAR SI JWT_SECRET NO ESTÁ
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });
    
    // 6. Guardar sesión en Redis ← AQUÍ PUEDE FALLAR SI REDIS NO CONECTA
    await redis.set(`session:${token}`, JSON.stringify(user), 'EX', 86400);
    
    res.json({ token, tecnico: { id: user.id, nombre: user.nombre } });
  } catch (error) {
    console.error('Auth error:', error);
    // Si hay error no capturado → 500
    // Railway convierte errores internos a 503
    res.status(500).json({ error: 'Internal Server Error' });
  }
})
```

**Si algo falla → res.status(500) → Railway convierte a 503**

---

## 🚨 DIAGNÓSTICO PASO A PASO

### STEP 1: ¿PostgreSQL funciona?

```bash
# En el servidor:
psql "$DATABASE_URL" -c "SELECT 1;"

# Si retorna "1" → BD OK
# Si retorna error → BD FALLA ← Aquí está el problema
```

**Si devuelve error:**
- DATABASE_URL está mal
- PostgreSQL en Railway está caído
- Firewall bloquea conexión
- Credenciales expiradas

---

### STEP 2: ¿Redis funciona?

```bash
# En el servidor:
redis-cli -u "$REDIS_URL" ping

# Si retorna "PONG" → Redis OK
# Si retorna error → Redis FALLA ← Aquí está el problema
```

**Si devuelve error:**
- REDIS_URL está mal
- Redis en Railway está caído
- Credenciais expiradas

---

### STEP 3: ¿Variables están configuradas?

```bash
# En el servidor:
env | grep -E "DATABASE_URL|REDIS_URL|JWT_SECRET"

# Deberías ver 3 líneas no vacías
# Si alguna falta o está vacía → Problema
```

---

## 📞 SOLUCIÓN STEP BY STEP

### SI DATABASE_URL falla:

```bash
# 1. Verificar en Railway:
# Ir a: Railroad Dashboard → PostgreSQL → Connection Info
# Copiar Railway Provided URL

# 2. Actualizar .env:
DATABASE_URL="<la-url-de-railway>"

# 3. Testear:
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM usuarios;"

# 4. Redeploy
```

### SI REDIS_URL falla:

```bash
# 1. Verificar en Railway:
# Ir a: Railway Dashboard → Redis → Connection Info
# Copiar Redis URL

# 2. Actualizar .env:
REDIS_URL="<la-url-de-railway>"

# 3. Testear:
redis-cli -u "$REDIS_URL" ping

# 4. Redeploy
```

### SI JWT_SECRET falta:

```bash
# 1. Generar secreto seguro:
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# 2. Output: (algo largo como) abc123def456...

# 3. Actualizar .env:
JWT_SECRET="<lo-que-salió-en-paso-1>"

# 4. Redeploy
```

---

## ✅ CÓMO VERIFICAR QUE ESTÁ ARREGLADO

Use este comando:

```bash
# Después de arreglado:
curl -X POST https://campo-api-app-campo-saas.up.railway.app/auth/tecnico \
  -H "Content-Type: application/json" \
  -d '{"codigo":"12345"}'

# Debería retornar ALGUNO de estos (no 503):
# {"error":"Codigo invalido"}        ← 401 (esperado)
# {"error":"Usuario no encontrado"}   ← 401 (esperado)  
# {"token":"...", "tecnico":{...}}   ← 200 (éxito!)
```

**Si retorna 503 → Aún no está arreglado**

---

## 🎯 RESUMEN FINAL

**El problema:**
- `/auth/tecnico` retorna 503 mientras otros endpoints funcionan
- Causa probable: DATABASE_URL o REDIS_URL no están configurados correctamente

**Qué hacer:**
1. ✓ SSH al servidor
2. ✓ Verificar .env (todas las variables presentes)
3. ✓ Testear BD: `psql "$DATABASE_URL" -c "SELECT 1;"`
4. ✓ Testear Redis: `redis-cli -u "$REDIS_URL" ping`
5. ✓ Redeploy
6. ✓ Verificar: `/auth/tecnico` debería retornar 401 o 200, NO 503

**Cuando esté arreglado:**
- App reintenta automáticamente
- Usuarios pueden iniciar sesión

---

**Documento preparado para**: Backend Team  
**Última actualización**: 25/03/2026
