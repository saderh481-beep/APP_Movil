import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "@/db";
import { redis } from "@/lib/redis";
import { authMiddleware } from "@/middleware/auth";
import type { JwtPayload } from "@/lib/jwt";

const app = new Hono<{
  Variables: {
    tecnico: JwtPayload
  }
}>();
app.use("*", authMiddleware);

const schemaNuevoBeneficiario = z.object({
  nombre_completo: z.string().min(2),
  curp: z.string().min(4).optional(),
  municipio: z.string().min(1),
  localidad: z.string().min(1),
  folio_saderh: z.string().optional(),
  cadena_productiva: z.string().optional(),
  telefono_contacto: z.string().optional(),
});

app.get("/mis-beneficiarios", async (c) => {
  const tecnico = c.get("tecnico");
  const beneficiarios = await sql`
    SELECT b.id, b.nombre, b.municipio, b.localidad, b.direccion, b.cp,
           b.telefono_principal, b.telefono_secundario, b.coord_parcela, b.activo,
           COALESCE((
             SELECT json_agg(json_build_object('id', cp.id, 'nombre', cp.nombre) ORDER BY cp.nombre)
             FROM beneficiario_cadenas bc
             JOIN cadenas_productivas cp ON cp.id = bc.cadena_id
             WHERE bc.beneficiario_id = b.id
               AND bc.activo = true
               AND cp.activo = true
           ), '[]'::json) AS cadenas
    FROM beneficiarios b
    WHERE b.activo = true
      AND EXISTS (
        SELECT 1
        FROM asignaciones_beneficiario ab
        WHERE ab.beneficiario_id = b.id
          AND ab.tecnico_id = ${tecnico.sub}
          AND ab.activo = true
      )
    ORDER BY b.nombre
  `;
  return c.json(beneficiarios);
});

app.get("/mis-actividades", async (c) => {
  const tecnico = c.get("tecnico");
  const actividades = await sql`
    SELECT a.id, a.nombre, a.descripcion, a.activo, a.created_by, a.created_at, a.updated_at
    FROM asignaciones_actividad aa
    JOIN actividades a ON a.id = aa.actividad_id
    WHERE aa.tecnico_id = ${tecnico.sub} AND aa.activo = true
    ORDER BY a.nombre
  `;
  return c.json(actividades);
});

app.get("/cadenas-productivas", async (c) => {
  const cached = await redis.get("cadenas:lista");
  if (cached) return c.json(JSON.parse(cached));

  const cadenas = await sql`
    SELECT id, nombre, descripcion, activo, created_by, created_at, updated_at 
    FROM cadenas_productivas WHERE activo = true ORDER BY nombre
  `;
  await redis.setex("cadenas:lista", 86400, JSON.stringify(cadenas));
  return c.json(cadenas);
});

app.post(
  "/beneficiarios",
  zValidator("json", schemaNuevoBeneficiario),
  async (c) => {
    const tecnico = c.get("tecnico");
    const body = c.req.valid("json");
    const reserved = await sql.reserve();

    try {
      await reserved`BEGIN`;

      const [nuevo] = await reserved`
        INSERT INTO beneficiarios (
          nombre,
          municipio,
          localidad,
          telefono_principal,
          tecnico_id
        ) VALUES (
          ${body.nombre_completo},
          ${body.municipio},
          ${body.localidad},
          ${body.telefono_contacto?.trim() || null},
          ${tecnico.sub}
        )
        RETURNING id, nombre, municipio, localidad, telefono_principal, tecnico_id, activo, created_at, updated_at
      `;

      await reserved`
        INSERT INTO asignaciones_beneficiario (tecnico_id, beneficiario_id, asignado_por)
        VALUES (${tecnico.sub}, ${nuevo.id}, ${tecnico.sub})
        ON CONFLICT (tecnico_id, beneficiario_id) WHERE activo = true DO NOTHING
      `;

      if (body.cadena_productiva?.trim()) {
        const [cadena] = await reserved`
          SELECT id
          FROM cadenas_productivas
          WHERE activo = true AND LOWER(nombre) = LOWER(${body.cadena_productiva.trim()})
          LIMIT 1
        `;

        if (cadena?.id) {
          await reserved`
            INSERT INTO beneficiario_cadenas (beneficiario_id, cadena_id, activo, asignado_en)
            VALUES (${nuevo.id}, ${cadena.id}, true, NOW())
            ON CONFLICT (beneficiario_id, cadena_id)
            DO UPDATE SET activo = true, asignado_en = NOW()
          `;
        }
      }

      await reserved`COMMIT`;
      return c.json(nuevo, 201);
    } catch (error) {
      await reserved`ROLLBACK`;
      throw error;
    } finally {
      reserved.release();
    }
  }
);

export default app;
