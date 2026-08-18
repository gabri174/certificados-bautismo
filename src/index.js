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

function newId(prefix = "cert") {
  return `${prefix}_${crypto.randomUUID()}`;
}

function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 160);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    if (url.pathname === "/") {
      return env.ASSETS.fetch(new Request(new URL("/generar.html", request.url), request));
    }

    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return env.ASSETS.fetch(new Request(new URL("/admin.html", request.url), request));
    }

    if (url.pathname === "/editor" || url.pathname === "/editor/") {
      const name = cleanName(url.searchParams.get("name"));
      const certificateId = cleanName(url.searchParams.get("certificate"));
      const page = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
      if (!name) return page;
      const safeName = JSON.stringify(name);
      const safeCertificate = JSON.stringify(certificateId);
      return new HTMLRewriter().on("body", {
        element(element) {
          element.append(`<script>(function(){const name=${safeName},certificateId=${safeCertificate};window.__GENERATED_CERTIFICATE__={id:certificateId,name};function apply(){const input=document.querySelector('input[data-key="name"]');if(!input)return false;input.value=name;input.dispatchEvent(new Event('input',{bubbles:true}));return true;}if(!apply()){let n=0;const t=setInterval(()=>{if(apply()||++n>50)clearInterval(t)},100);}})();</script>`, { html: true });
        }
      }).transform(page);
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/generate" && request.method === "POST") {
          const body = await readBody(request);
          const name = cleanName(body?.name);
          const templateId = cleanName(body?.template_id || "bautismo-clasico");
          if (name.length < 3) return cors(json({ error: "El nombre completo es obligatorio." }, 400));
          if (name.length > 160) return cors(json({ error: "El nombre es demasiado largo." }, 400));
          const id = newId("cert");
          const data = { name, status: "generated", source: "individual", template_id: templateId };
          await env.DB.prepare("INSERT INTO certificates (id, template_id, data_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)").bind(id, templateId, JSON.stringify(data)).run();
          return cors(json({ ok: true, id, name }));
        }

        if (url.pathname === "/api/certificates/bulk" && request.method === "POST") {
          if (!authorized(request, env)) return cors(json({ error: "No autorizado" }, 401));
          const body = await readBody(request);
          const templateId = cleanName(body?.template_id || "bautismo-clasico");
          const names = Array.isArray(body?.names) ? [...new Set(body.names.map(cleanName).filter(name => name.length >= 3))] : [];
          if (!names.length) return cors(json({ error: "No se encontraron nombres válidos." }, 400));
          if (names.length > 500) return cors(json({ error: "La carga máxima es de 500 nombres por archivo." }, 400));
          const statements = names.map(name => {
            const id = newId("cert");
            const data = { name, status: "generated", source: "bulk", template_id: templateId };
            return env.DB.prepare("INSERT INTO certificates (id, template_id, data_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)").bind(id, templateId, JSON.stringify(data));
          });
          await env.DB.batch(statements);
          return cors(json({ ok: true, created: names.length, names }));
        }

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
