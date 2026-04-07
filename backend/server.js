const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

const loadEnvFile = (filename) => {
  const filePath = path.resolve(__dirname, '..', filename);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex <= 0) continue;

    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
};

loadEnvFile('.env');
loadEnvFile('.env.production');
loadEnvFile('.env.railway');

const PORT = Number(process.env.PORT || 3002);
const JWT_SECRET = process.env.JWT_SECRET || '';
const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL no configurado');
}

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no configurado');
}

const sql = postgres(DATABASE_URL, {
  ssl: DATABASE_URL.includes('localhost') ? undefined : 'require',
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

const json = (res, status, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  });
  res.end(body);
};

const base64url = (input) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const signJwt = (payload) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${data}.${signature}`;
};

const verifyJwt = (token) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Token inválido');
  const [header, payload, signature] = parts;
  const expected = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  if (signature !== expected) throw new Error('Firma inválida');

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (decoded.exp && decoded.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Token expirado');
  }
  return decoded;
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Payload demasiado grande'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });

const requireAuth = async (req) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'No autenticado' };
  }

  try {
    const payload = verifyJwt(auth.slice(7));
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, status: 401, error: error instanceof Error ? error.message : 'Token inválido' };
  }
};

const emptyProtected = async (req, res, payload = []) => {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    json(res, auth.status, { error: auth.error });
    return;
  }
  json(res, 200, payload);
};

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      json(res, 404, { error: 'Ruta no encontrada' });
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      await sql`select 1`;
      json(res, 200, { status: 'ok', service: 'api-app', ts: new Date().toISOString() });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/auth/tecnico') {
      const body = await readBody(req);
      const codigo = String(body.codigo || '').trim();

      if (!/^\d{5}$/.test(codigo)) {
        json(res, 401, { error: 'Código inválido' });
        return;
      }

      const users = await sql`
        SELECT id, nombre, rol, codigo_acceso, estado_corte, fecha_limite
        FROM usuarios
        WHERE rol = 'tecnico'
          AND codigo_acceso = ${codigo}
        LIMIT 1
      `;

      if (!users.length) {
        json(res, 401, { error: 'Usuario no encontrado' });
        return;
      }

      const user = users[0];

      const estado = String(user.estado_corte || '').trim().toLowerCase();
      if (estado && !['activo', 'en_servicio'].includes(estado)) {
        json(res, 401, { error: 'periodo_vencido' });
        return;
      }

      if (user.fecha_limite && new Date(user.fecha_limite).getTime() < Date.now()) {
        json(res, 401, { error: 'periodo_vencido' });
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const token = signJwt({
        sub: String(user.id),
        id: String(user.id),
        nombre: String(user.nombre),
        rol: String(user.rol || 'tecnico'),
        iat: now,
        exp: now + 60 * 60 * 12,
      });

      json(res, 200, {
        success: true,
        token,
        tecnico: {
          id: String(user.id),
          nombre: String(user.nombre),
          rol: String(user.rol || 'tecnico'),
        },
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/mis-beneficiarios') {
      await emptyProtected(req, res, { success: true, beneficiarios: [], total: 0 });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/mis-actividades') {
      await emptyProtected(req, res, []);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/cadenas-productivas') {
      await emptyProtected(req, res, []);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/bitacoras') {
      await emptyProtected(req, res, []);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/notificaciones') {
      await emptyProtected(req, res, []);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/asignaciones') {
      await emptyProtected(req, res, { success: true, asignaciones: [], total: 0 });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/sync') {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const body = await readBody(req);
      const operaciones = Array.isArray(body.operaciones) ? body.operaciones : [];
      const resultados = operaciones.map((op) => ({
        sync_id: op?.payload?.sync_id || crypto.randomUUID(),
        operacion: op?.operacion || 'desconocida',
        exito: true,
      }));

      json(res, 200, { procesadas: resultados.length, resultados });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/sync/delta') {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      json(res, 200, {
        sync_ts: new Date().toISOString(),
        beneficiarios: [],
        actividades: [],
        cadenas: [],
      });
      return;
    }

    json(res, 404, { error: 'Ruta no encontrada' });
  } catch (error) {
    console.error('[API APP] Error:', error);
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[API APP] Escuchando en puerto ${PORT}`);
});
