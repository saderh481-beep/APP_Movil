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

    // GET /bitacoras - Listar todas las bitácoras del técnico
    if (req.method === 'GET' && url.pathname === '/bitacoras') {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const tecnicoId = auth.payload?.id ?? auth.payload?.sub ?? auth.payload?.tecnico_id;
      const estado = url.searchParams.get('estado');
      
      try {
        let query = sql`
          SELECT * FROM bitacoras 
          WHERE tecnico_id = ${tecnicoId}
        `;
        
        if (estado) {
          query = sql`${query} AND estado = ${estado}`;
        }
        
        query = sql`${query} ORDER BY created_at DESC LIMIT 50`;
        
        const bitacoras = await query;
        json(res, 200, { success: true, data: bitacoras, total: bitacoras.length });
      } catch (dbError) {
        console.error('[GET /bitacoras] Error DB:', dbError);
        json(res, 200, { success: true, data: [], total: 0 });
      }
      return;
    }

    // GET /bitacoras/:id - Obtener una bitácora por ID
    if (req.method === 'GET' && url.pathname.match(/^\/bitacoras\/[\w-]+$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      
      try {
        const bitacoras = await sql`
          SELECT * FROM bitacoras 
          WHERE id = ${bitacoraId}
          LIMIT 1
        `;
        
        if (!bitacoras.length) {
          json(res, 404, { error: 'Bitácora no encontrada' });
          return;
        }
        
        json(res, 200, { success: true, data: bitacoras[0] });
      } catch (dbError) {
        console.error('[GET /bitacoras/:id] Error DB:', dbError);
        json(res, 500, { error: 'Error al obtener bitácora' });
      }
      return;
    }

    // POST /bitacoras - Crear nueva bitácora
    if (req.method === 'POST' && url.pathname === '/bitacoras') {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const tecnicoId = auth.payload?.id ?? auth.payload?.sub ?? auth.payload?.tecnico_id;
      const body = await readBody(req);
      
      try {
        const id = body.id || `bitacora-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tipo = body.tipo || 'beneficiario';
        const beneficiarioId = body.beneficiario_id || null;
        const cadenaProductivaId = body.cadena_productiva_id || null;
        const actividadId = body.actividad_id || null;
        const fechaInicio = body.fecha_inicio || new Date().toISOString();
        const coordInicio = body.coord_inicio || null;
        
        const result = await sql`
          INSERT INTO bitacoras (
            id, tipo, estado, tecnico_id, beneficiario_id, 
            cadena_productiva_id, actividad_id, fecha_inicio, coord_inicio,
            created_at, updated_at
          ) VALUES (
            ${id}, ${tipo}, 'borrador', ${tecnicoId}, ${beneficiarioId},
            ${cadenaProductivaId}, ${actividadId}, ${fechaInicio}, ${coordInicio},
            NOW(), NOW()
          )
          RETURNING *
        `;
        
        json(res, 201, { success: true, id_bitacora: id, id: id, data: result[0] });
      } catch (dbError) {
        console.error('[POST /bitacoras] Error DB:', dbError);
        json(res, 500, { error: 'Error al crear bitácora' });
      }
      return;
    }

    // PATCH /bitacoras/:id - Actualizar bitácora
    if (req.method === 'PATCH' && url.pathname.match(/^\/bitacoras\/[\w-]+$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      const body = await readBody(req);
      
      try {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        const fields = [
          'coord_inicio', 'coord_fin', 'fecha_inicio', 'fecha_fin',
          'observaciones_coordinador', 'actividades_desc', 'recomendaciones',
          'comentarios_beneficiario', 'estado'
        ];
        
        for (const field of fields) {
          if (body[field] !== undefined) {
            const dbField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
            updates.push(`${dbField} = $${paramIndex}`);
            values.push(body[field]);
            paramIndex++;
          }
        }
        
        if (updates.length === 0) {
          json(res, 400, { error: 'No hay campos para actualizar' });
          return;
        }
        
        values.push(bitacoraId);
        
        const result = await sql`
          UPDATE bitacoras 
          SET ${sql(updates.join(', '))}, updated_at = NOW()
          WHERE id = $${paramIndex}
          RETURNING *
        `;
        
        if (!result.length) {
          json(res, 404, { error: 'Bitácora no encontrada' });
          return;
        }
        
        json(res, 200, { success: true, data: result[0] });
      } catch (dbError) {
        console.error('[PATCH /bitacoras/:id] Error DB:', dbError);
        json(res, 500, { error: 'Error al actualizar bitácora' });
      }
      return;
    }

    // POST /bitacoras/:id/cerrar - Cerrar bitácora
    if (req.method === 'POST' && url.pathname.match(/^\/bitacoras\/[\w-]+\/cerrar$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      const body = await readBody(req);
      
      try {
        const fechaFin = body.fecha_fin || new Date().toISOString();
        const coordFin = body.coord_fin || null;
        
        const result = await sql`
          UPDATE bitacoras 
          SET estado = 'cerrada', 
              fecha_fin = ${fechaFin}, 
              coord_fin = ${coordFin},
              updated_at = NOW()
          WHERE id = ${bitacoraId}
          RETURNING *
        `;
        
        if (!result.length) {
          json(res, 404, { error: 'Bitácora no encontrada' });
          return;
        }
        
        json(res, 200, { success: true, estado: 'cerrada', data: result[0] });
      } catch (dbError) {
        console.error('[POST /bitacoras/:id/cerrar] Error DB:', dbError);
        json(res, 500, { error: 'Error al cerrar bitácora' });
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/notificaciones') {
      await emptyProtected(req, res, []);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/asignaciones') {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const tecnicoId = auth.payload?.id ?? auth.payload?.sub ?? auth.payload?.tecnico_id;
      console.log('[GET /asignaciones] tecnicoId from token:', tecnicoId);

      try {
        // Obtener beneficiarios reales del tecnico
        const beneficiarios = await sql`
          SELECT 
            id, nombre_completo, curp, municipio, localidad, 
            folio_saderh, cadena_productiva, telefono_contacto,
            tecnico_id, activo, created_at, updated_at
          FROM beneficiarios 
          WHERE tecnico_id = ${tecnicoId} AND activo = true
          ORDER BY created_at DESC
        `;

        console.log('[GET /asignaciones] Beneficiarios found:', beneficiarios.length);

        // Convertir beneficiarios a formato de asignacion
        const asignaciones = beneficiarios.map((b) => ({
          id: b.id,
          id_asignacion: b.id,
          id_tecnico: b.tecnico_id,
          id_beneficiario: b.id,
          nombre: b.nombre_completo,
          descripcion: b.cadena_productiva ?? 'Seguimiento de beneficiario',
          tipo_asignacion: 'beneficiario',
          descripcion_actividad: 'Visita de seguimiento',
          prioridad: 'MEDIA',
          activo: b.activo,
          completado: false,
          fecha_limite: new Date().toISOString().split('T')[0],
          created_at: b.created_at,
          updated_at: b.updated_at,
          beneficiario: {
            id: b.id,
            id_beneficiario: b.id,
            nombre: b.nombre_completo,
            nombre_completo: b.nombre_completo,
            curp: b.curp,
            municipio: b.municipio,
            localidad: b.localidad,
            folio_saderh: b.folio_saderh,
            cadena_productiva: b.cadena_productiva,
            telefono_contacto: b.telefono_contacto,
            activo: b.activo,
          },
        }));

        json(res, 200, { success: true, asignaciones: asignaciones, total: asignaciones.length });
      } catch (dbError) {
        console.error('[GET /asignaciones] Error DB:', dbError);
        json(res, 200, { success: true, asignaciones: [], total: 0 });
      }
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
