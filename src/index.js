const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const cors = (response) => {
  response.headers.set("access-control-allow-origin", "*");
  response.headers.set("access-control-allow-headers", "content-type, x-admin-token");
  response.headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  return response;
};

async function readBody(request) {
  try { return await request.json(); } catch { return null; }
}

function authorized(request, env) {
  return Boolean(env.ADMIN_TOKEN) && request.headers.get("x-admin-token") === env.ADMIN_TOKEN;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/templates" && request.method === "GET") {
          const rows = await env.DB.prepare("SELECT id, name, data_json, created_at, updated_at FROM templates ORDER BY name").all();
          return cors(json(rows.results.map(row => ({ ...row, data: JSON.parse(row.data_json) }))));
        }

        if (url.pathname === "/api/templates" && request.method === "POST") {
          if (!authorized(request, env)) return cors(json({ error: "No autorizado" }, 401));
          const body = await readBody(request);
          if (!body?.id || !body?.name || !body?.data) return cors(json({ error: "id, name y data son obligatorios" }, 400));
          await env.DB.prepare(`INSERT INTO templates (id, name, data_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET name=excluded.name, data_json=excluded.data_json, updated_at=CURRENT_TIMESTAMP`).bind(body.id, body.name, JSON.stringify(body.data)).run();
          return cors(json({ ok: true, id: body.id }));
        }

        if (url.pathname === "/api/certificates" && request.method === "GET") {
          if (!authorized(request, env)) return cors(json({ error: "No autorizado" }, 401));
          const rows = await env.DB.prepare("SELECT id, template_id, data_json, created_at, updated_at FROM certificates ORDER BY created_at DESC").all();
          return cors(json(rows.results.map(row => ({ ...row, data: JSON.parse(row.data_json) }))));
        }

        if (url.pathname === "/api/certificates" && request.method === "POST") {
          if (!authorized(request, env)) return cors(json({ error: "No autorizado" }, 401));
          const body = await readBody(request);
          if (!body?.id || !body?.template_id || !body?.data) return cors(json({ error: "id, template_id y data son obligatorios" }, 400));
          await env.DB.prepare(`INSERT INTO certificates (id, template_id, data_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET template_id=excluded.template_id, data_json=excluded.data_json, updated_at=CURRENT_TIMESTAMP`).bind(body.id, body.template_id, JSON.stringify(body.data)).run();
          return cors(json({ ok: true, id: body.id }));
        }

        return cors(json({ error: "Ruta API no encontrada" }, 404));
      } catch (error) {
        console.error(error);
        return cors(json({ error: "Error interno", detail: error.message }, 500));
      }
    }
    return env.ASSETS.fetch(request);
  }
};
