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
loadEnvFile('backend/.env');
loadEnvFile('backend/.env.production');
loadEnvFile('backend/.env.railway');

const PORT = Number(process.env.PORT || 3002);
const JWT_SECRET = process.env.JWT_SECRET || '';
const rawDbUrl = process.env.DATABASE_URL || '';
const DATABASE_URL = (rawDbUrl || '').replace('postgresql://', 'postgres://');

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const CLOUDINARY_PRESET_IMAGENES = process.env.CLOUDINARY_PRESET_IMAGENES || '';

console.log('[START] DB:', Boolean(DATABASE_URL), '| JWT:', Boolean(JWT_SECRET), '| Cloudinary:', Boolean(CLOUDINARY_CLOUD_NAME));

const uploadToCloudinary = async (base64Data, publicId, preset) => {
  if (!CLOUDINARY_CLOUD_NAME || !preset) {
    throw new Error('Cloudinary no configurado en el servidor');
  }
  
  const formData = new URLSearchParams();
  formData.append('file', base64Data);
  formData.append('upload_preset', preset);
  formData.append('public_id', publicId);
  
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al subir a Cloudinary: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  return result.secure_url;
};

const sql = DATABASE_URL ? postgres(DATABASE_URL, {
  ssl: DATABASE_URL.includes('localhost') ? undefined : 'require',
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
}) : null;

const isDemoMode = !sql;

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

const readMultipartForm = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=(.+)$/);
      if (!boundaryMatch) {
        reject(new Error('Content-Type multipart no válido'));
        return;
      }
      const boundary = boundaryMatch[1];
      const parts = body.toString('binary').split(`--${boundary}`);
      const files = [];
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed || trimmed === '--') continue;
        const headerEnd = trimmed.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;
        const headerBlock = trimmed.slice(0, headerEnd);
        const content = trimmed.slice(headerEnd + 4, trimmed.length - 2);
        const nameMatch = headerBlock.match(/name="([^"]+)"/);
        const fileNameMatch = headerBlock.match(/filename="([^"]+)"/);
        if (!nameMatch) continue;
        const fieldname = nameMatch[1];
        if (fileNameMatch) {
          const originalname = fileNameMatch[1];
          const buffer = Buffer.from(content, 'binary');
          files.push({ fieldname, originalname, buffer });
        }
      }
      resolve({ files });
    });
    req.on('error', reject);
  });

const requireAuth = async (req) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'No autenticado' };
  }

  // Demo mode - create a fake payload but still require the token format
  if (isDemoMode) {
    try {
      const payload = verifyJwt(auth.slice(7));
      return { ok: true, payload: { ...payload, demo: true }, demo: true };
    } catch {
      // Allow demo tokens in demo mode
      return { ok: true, payload: { sub: 'demo-001', id: 'demo-001', demo: true }, demo: true };
    }
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
    console.log('[REQ]', req.method, req.url, req.headers.host);
    
    if (!req.url) {
      json(res, 404, { error: 'Ruta no encontrada' });
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    console.log('[URL]', url.pathname);

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
      if (isDemoMode) {
        json(res, 200, { status: 'ok', service: 'api-app', mode: 'demo', ts: new Date().toISOString() });
        return;
      }
      await sql`select 1`;
      json(res, 200, { status: 'ok', service: 'api-app', ts: new Date().toISOString() });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/auth/tecnico') {
      const body = await readBody(req);
      const codigo = String(body.codigo || '').trim();

      // Demo mode - accept any 5-digit code
      if (isDemoMode) {
        if (!/^\d{5}$/.test(codigo)) {
          json(res, 401, { error: 'Código inválido' });
          return;
        }
        const demoToken = signJwt({
          sub: 'demo-001',
          id: 'demo-001',
          nombre: 'Técnico Demo',
          rol: 'tecnico',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
        });
        json(res, 200, { success: true, token: demoToken, tecnico: { id: 'demo-001', nombre: 'Técnico Demo', rol: 'tecnico' }, demo: true });
        return;
      }

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

      // Demo mode - return empty array
      if (isDemoMode || !sql) {
        json(res, 200, { success: true, data: [], total: 0, demo: true });
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
        
        const setClause = updates.map((u, i) => `${u} = $${i + 1}`).join(', ');
        
        const result = await sql`
          UPDATE bitacoras 
          SET ${sql(setClause)}, updated_at = NOW()
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

    // POST /bitacoras/:id/firma - Subir firma (multipart)
    if (req.method === 'POST' && url.pathname.match(/^\/bitacoras\/[\w-]+\/firma$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      
      try {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_PRESET_IMAGENES) {
          json(res, 503, { error: 'Cloudinary no configurado en el servidor' });
          return;
        }

        const { files } = await readMultipartForm(req);
        const firmaFile = files?.find(f => f.fieldname === 'firma');
        
        if (!firmaFile || !firmaFile.buffer) {
          json(res, 400, { error: 'No se recibió archivo de firma' });
          return;
        }

        const base64 = firmaFile.buffer.toString('base64');
        const ext = firmaFile.originalname?.split('.').pop() || 'png';
        const publicId = `firma-${bitacoraId}-${Date.now()}`;
        
        const firmaUrl = await uploadToCloudinary(base64, publicId, CLOUDINARY_PRESET_IMAGENES);
        
        const result = await sql`
          UPDATE bitacoras 
          SET firma_url = ${firmaUrl}, updated_at = NOW()
          WHERE id = ${bitacoraId}
          RETURNING *
        `;
        
        if (!result.length) {
          json(res, 404, { error: 'Bitácora no encontrada' });
          return;
        }
        
        json(res, 200, { success: true, firma_url: firmaUrl, data: result[0] });
      } catch (dbError) {
        console.error('[POST /bitacoras/:id/firma] Error:', dbError);
        json(res, 500, { error: 'Error al guardar firma' });
      }
      return;
    }

    // POST /bitacoras/:id/foto-rostro - Subir foto de rostro (multipart)
    if (req.method === 'POST' && url.pathname.match(/^\/bitacoras\/[\w-]+\/foto-rostro$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      
      try {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_PRESET_IMAGENES) {
          json(res, 503, { error: 'Cloudinary no configurado en el servidor' });
          return;
        }

        const { files } = await readMultipartForm(req);
        const fotoFile = files?.find(f => f.fieldname === 'foto');
        
        if (!fotoFile || !fotoFile.buffer) {
          json(res, 400, { error: 'No se recibió archivo de foto' });
          return;
        }

        const base64 = fotoFile.buffer.toString('base64');
        const ext = fotoFile.originalname?.split('.').pop() || 'jpg';
        const publicId = `rostro-${bitacoraId}-${Date.now()}`;
        
        const fotoUrl = await uploadToCloudinary(base64, publicId, CLOUDINARY_PRESET_IMAGENES);
        
        const result = await sql`
          UPDATE bitacoras 
          SET foto_rostro_url = ${fotoUrl}, updated_at = NOW()
          WHERE id = ${bitacoraId}
          RETURNING *
        `;
        
        if (!result.length) {
          json(res, 404, { error: 'Bitácora no encontrada' });
          return;
        }
        
        json(res, 200, { success: true, foto_rostro_url: fotoUrl, data: result[0] });
      } catch (dbError) {
        console.error('[POST /bitacoras/:id/foto-rostro] Error:', dbError);
        json(res, 500, { error: 'Error al guardar foto de rostro' });
      }
      return;
    }

    // POST /bitacoras/:id/fotos-campo - Subir fotos de campo (multipart)
    if (req.method === 'POST' && url.pathname.match(/^\/bitacoras\/[\w-]+\/fotos-campo$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      
      try {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_PRESET_IMAGENES) {
          json(res, 503, { error: 'Cloudinary no configurado en el servidor' });
          return;
        }

        const { files } = await readMultipartForm(req);
        const fotoFiles = files?.filter(f => f.fieldname === 'fotos' || f.fieldname === 'fotos[]') || [];
        
        if (!fotoFiles.length) {
          json(res, 400, { error: 'No se recibió ninguna foto' });
          return;
        }

        const urlsPromises = fotoFiles.map(async (fotoFile, i) => {
          const base64 = fotoFile.buffer.toString('base64');
          const ext = fotoFile.originalname?.split('.').pop() || 'jpg';
          const publicId = `campo-${bitacoraId}-${i}-${Date.now()}`;
          return uploadToCloudinary(base64, publicId, CLOUDINARY_PRESET_IMAGENES);
        });
        
        const fotosUrls = await Promise.all(urlsPromises);
        
        const result = await sql`
          UPDATE bitacoras 
          SET fotos_campo = ${JSON.stringify(fotosUrls)}, updated_at = NOW()
          WHERE id = ${bitacoraId}
          RETURNING *
        `;
        
        if (!result.length) {
          json(res, 404, { error: 'Bitácora no encontrada' });
          return;
        }
        
        json(res, 200, { success: true, fotos_campo: fotosUrls, data: result[0] });
      } catch (dbError) {
        console.error('[POST /bitacoras/:id/fotos-campo] Error:', dbError);
        json(res, 500, { error: 'Error al guardar fotos de campo' });
      }
      return;
    }

    // GET /cloudinary-config - Configuración pública de Cloudinary
    if (req.method === 'GET' && url.pathname === '/cloudinary-config') {
      if (!CLOUDINARY_CLOUD_NAME) {
        json(res, 200, { error: 'Cloudinary no configurado', configurado: false });
        return;
      }

      json(res, 200, {
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        uploadPreset: CLOUDINARY_PRESET_IMAGENES,
      });
      return;
    }

    // POST /bitacoras/:id/foto-rostro/signature - Obtener firma para subir foto de rostro
    if (req.method === 'POST' && url.pathname.match(/^\/bitacoras\/[\w-]+\/foto-rostro\/signature$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];

      if (!CLOUDINARY_CLOUD_NAME) {
        json(res, 503, { error: 'Cloudinary no está configurado en el servidor. Contacta al administrador.' });
        return;
      }

      if (!CLOUDINARY_PRESET_IMAGENES) {
        json(res, 503, { error: 'Cloudinary upload preset no configurado. Contacta al administrador.' });
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const publicId = `rostro-${bitacoraId}`;
      const signature = crypto
        .createHash('sha1')
        .update(`public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
        .digest('hex');

      json(res, 200, {
        signature,
        timestamp,
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        uploadPreset: CLOUDINARY_PRESET_IMAGENES,
        folder: 'bitacoras',
        publicId,
      });
      return;
    }

    // POST /bitacoras/:id/firma/signature - Obtener firma para subir firma
    if (req.method === 'POST' && url.pathname.match(/^\/bitacoras\/[\w-]+\/firma\/signature$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];

      if (!CLOUDINARY_CLOUD_NAME) {
        json(res, 503, { error: 'Cloudinary no está configurado en el servidor. Contacta al administrador.' });
        return;
      }

      if (!CLOUDINARY_PRESET_IMAGENES) {
        json(res, 503, { error: 'Cloudinary upload preset no configurado. Contacta al administrador.' });
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const publicId = `firma-${bitacoraId}`;
      const signature = crypto
        .createHash('sha1')
        .update(`public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
        .digest('hex');

      json(res, 200, {
        signature,
        timestamp,
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        folder: 'bitacoras',
        publicId,
      });
      return;
    }

    // POST /bitacoras/:id/fotos-campo/signature - Obtener firma para subir fotos de campo
    if (req.method === 'POST' && url.pathname.match(/^\/bitacoras\/[\w-]+\/fotos-campo\/signature$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      const index = parseInt(url.searchParams.get('index') || '0');

      if (!CLOUDINARY_CLOUD_NAME) {
        json(res, 503, { error: 'Cloudinary no está configurado en el servidor. Contacta al administrador.' });
        return;
      }

      if (!CLOUDINARY_PRESET_IMAGENES) {
        json(res, 503, { error: 'Cloudinary upload preset no configurado. Contacta al administrador.' });
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const publicId = `campo-${bitacoraId}-${index}`;
      const signature = crypto
        .createHash('sha1')
        .update(`public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
        .digest('hex');

      json(res, 200, {
        signature,
        timestamp,
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        folder: 'bitacoras',
        publicId,
      });
      return;
    }

    // POST /bitacoras/:id/foto-rostro/url - Guardar URL de foto de rostro
    if (req.method === 'POST' && url.pathname.match(/^\/bitacoras\/[\w-]+\/foto-rostro\/url$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      const body = await readBody(req);
      
      try {
        const urlFoto = body.url;
        
        if (!urlFoto) {
          json(res, 400, { error: 'No se recibió URL' });
          return;
        }
        
        const result = await sql`
          UPDATE bitacoras 
          SET foto_rostro_url = ${urlFoto}, updated_at = NOW()
          WHERE id = ${bitacoraId}
          RETURNING *
        `;
        
        if (!result.length) {
          json(res, 404, { error: 'Bitácora no encontrada' });
          return;
        }
        
        json(res, 200, { success: true, url: urlFoto, data: result[0] });
      } catch (dbError) {
        console.error('[POST /bitacoras/:id/foto-rostro/url] Error:', dbError);
        json(res, 500, { error: 'Error al guardar URL' });
      }
      return;
    }

    // POST /bitacoras/:id/firma/url - Guardar URL de firma
    if (req.method === 'POST' && url.pathname.match(/^\/bitacoras\/[\w-]+\/firma\/url$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      const body = await readBody(req);
      
      try {
        const urlFirma = body.url;
        
        if (!urlFirma) {
          json(res, 400, { error: 'No se recibió URL' });
          return;
        }
        
        const result = await sql`
          UPDATE bitacoras 
          SET firma_url = ${urlFirma}, updated_at = NOW()
          WHERE id = ${bitacoraId}
          RETURNING *
        `;
        
        if (!result.length) {
          json(res, 404, { error: 'Bitácora no encontrada' });
          return;
        }
        
        json(res, 200, { success: true, url: urlFirma, data: result[0] });
      } catch (dbError) {
        console.error('[POST /bitacoras/:id/firma/url] Error:', dbError);
        json(res, 500, { error: 'Error al guardar URL' });
      }
      return;
    }

    // POST /bitacoras/:id/fotos-campo/url - Guardar una URL de foto de campo
    if (req.method === 'POST' && url.pathname.match(/^\/bitacoras\/[\w-]+\/fotos-campo\/url$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      const body = await readBody(req);
      
      try {
        const urlFoto = body.url;
        
        if (!urlFoto) {
          json(res, 400, { error: 'No se recibió URL' });
          return;
        }
        
        const existing = await sql`
          SELECT fotos_campo FROM bitacoras WHERE id = ${bitacoraId}
        `;
        
        let fotos = [];
        if (existing[0]?.fotos_campo) {
          try {
            fotos = typeof existing[0].fotos_campo === 'string' 
              ? JSON.parse(existing[0].fotos_campo) 
              : existing[0].fotos_campo;
          } catch {
            fotos = [];
          }
        }
        
        fotos.push(urlFoto);
        
        const result = await sql`
          UPDATE bitacoras 
          SET fotos_campo = ${JSON.stringify(fotos)}, updated_at = NOW()
          WHERE id = ${bitacoraId}
          RETURNING *
        `;
        
        if (!result.length) {
          json(res, 404, { error: 'Bitácora no encontrada' });
          return;
        }
        
        json(res, 200, { success: true, url: urlFoto, fotos: fotos, data: result[0] });
      } catch (dbError) {
        console.error('[POST /bitacoras/:id/fotos-campo/url] Error:', dbError);
        json(res, 500, { error: 'Error al guardar URL' });
      }
      return;
    }

    // POST /bitacoras/:id/fotos-campo/urls - Guardar múltiples URLs de fotos de campo
    if (req.method === 'POST' && url.pathname.match(/^\/bitacoras\/[\w-]+\/fotos-campo\/urls$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      const body = await readBody(req);
      
      try {
        const urls = body.urls;
        
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
          json(res, 400, { error: 'No se recibió ninguna URL' });
          return;
        }
        
        const result = await sql`
          UPDATE bitacoras 
          SET fotos_campo = ${JSON.stringify(urls)}, updated_at = NOW()
          WHERE id = ${bitacoraId}
          RETURNING *
        `;
        
        if (!result.length) {
          json(res, 404, { error: 'Bitácora no encontrada' });
          return;
        }
        
        json(res, 200, { success: true, urls: urls, data: result[0] });
      } catch (dbError) {
        console.error('[POST /bitacoras/:id/fotos-campo/urls] Error:', dbError);
        json(res, 500, { error: 'Error al guardar URLs' });
      }
      return;
    }

    // DELETE /bitacoras/:id/foto-rostro - Eliminar foto de rostro
    if (req.method === 'DELETE' && url.pathname.match(/^\/bitacoras\/[\w-]+\/foto-rostro$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      
      try {
        const result = await sql`
          UPDATE bitacoras 
          SET foto_rostro_url = null, updated_at = NOW()
          WHERE id = ${bitacoraId}
          RETURNING *
        `;
        
        if (!result.length) {
          json(res, 404, { error: 'Bitácora no encontrada' });
          return;
        }
        
        json(res, 200, { success: true, data: result[0] });
      } catch (dbError) {
        console.error('[DELETE /bitacoras/:id/foto-rostro] Error:', dbError);
        json(res, 500, { error: 'Error al eliminar foto' });
      }
      return;
    }

    // DELETE /bitacoras/:id/firma - Eliminar firma
    if (req.method === 'DELETE' && url.pathname.match(/^\/bitacoras\/[\w-]+\/firma$/)) {
      const auth = await requireAuth(req);
      if (!auth.ok) {
        json(res, auth.status, { error: auth.error });
        return;
      }

      const bitacoraId = url.pathname.split('/')[2];
      
      try {
        const result = await sql`
          UPDATE bitacoras 
          SET firma_url = null, updated_at = NOW()
          WHERE id = ${bitacoraId}
          RETURNING *
        `;
        
        if (!result.length) {
          json(res, 404, { error: 'Bitácora no encontrada' });
          return;
        }
        
        json(res, 200, { success: true, data: result[0] });
      } catch (dbError) {
        console.error('[DELETE /bitacoras/:id/firma] Error:', dbError);
        json(res, 500, { error: 'Error al eliminar firma' });
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

      // Demo mode - return demo data
      if (isDemoMode || !sql) {
        json(res, 200, { 
          success: true, 
          asignaciones: [
            { id: 'demo-1', id_asignacion: 'demo-1', nombre: 'Beneficiario Demo 1', descripcion: 'Visita de seguimiento', tipo_asignacion: 'beneficiario', activo: true }
          ], 
          total: 1, 
          demo: true 
        });
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

// Keep process alive
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message);
  // Don't exit - try to keep running
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  // Don't exit - try to keep running
});
