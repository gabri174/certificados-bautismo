const json = (data, status = 200, extraHeaders = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extraHeaders } });

const ORIGIN = "https://autom.ensupresencia.eu";
const SESSION_COOKIE = "cert_admin_session";
const SESSION_TTL = 60 * 60 * 12;

function cors(response) {
  response.headers.set("access-control-allow-origin", ORIGIN);
  response.headers.set("access-control-allow-credentials", "true");
  response.headers.set("access-control-allow-headers", "content-type");
  response.headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  return response;
}

async function readBody(request) {
  try { return await request.json(); } catch { return null; }
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function sameSecret(value, secret) {
  const a = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value || ""))));
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(secret || ""))));
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function createSession(secret) {
  const payload = `${Date.now() + SESSION_TTL * 1000}`;
  return `${payload}.${await hmac(payload, secret)}`;
}

async function validSession(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match) return false;
  const [expires, signature] = match[1].split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = await hmac(expires, env.ADMIN_PASSWORD);
  return sameSecret(signature, expected);
}

function sessionHeaders(session) {
  return { "set-cookie": `${SESSION_COOKIE}=${session}; Max-Age=${SESSION_TTL}; Path=/; HttpOnly; Secure; SameSite=Lax` };
}

function clearSessionHeaders() {
  return { "set-cookie": `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax` };
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

    if (url.pathname === "/") return env.ASSETS.fetch(new Request(new URL("/generar.html", request.url), request));
    if (url.pathname === "/admin" || url.pathname === "/admin/") return env.ASSETS.fetch(new Request(new URL("/admin.html", request.url), request));

    if (url.pathname === "/editor" || url.pathname === "/editor/") {
      const name = cleanName(url.searchParams.get("name"));
      const certificateId = cleanName(url.searchParams.get("certificate"));
      const page = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
      if (!name) return page;
      const safeName = JSON.stringify(name);
      const safeCertificate = JSON.stringify(certificateId);
      return new HTMLRewriter().on("body", { element(element) { element.append(`<script>(function(){const name=${safeName},certificateId=${safeCertificate};window.__GENERATED_CERTIFICATE__={id:certificateId,name};function apply(){const input=document.querySelector('input[data-key="name"]');if(!input)return false;input.value=name;input.dispatchEvent(new Event('input',{bubbles:true}));return true;}if(!apply()){let n=0;const t=setInterval(()=>{if(apply()||++n>50)clearInterval(t)},100);}})();</script>`, { html: true }); } }).transform(page);
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/admin/login" && request.method === "POST") {
          const body = await readBody(request);
          if (!env.ADMIN_PASSWORD) return cors(json({ error: "La contraseña de administración todavía no está configurada en Cloudflare." }, 503));
          if (!(await sameSecret(body?.password, env.ADMIN_PASSWORD))) return cors(json({ error: "Contraseña incorrecta." }, 401));
          const session = await createSession(env.ADMIN_PASSWORD);
          return cors(json({ ok: true }, 200, sessionHeaders(session)));
        }

        if (url.pathname === "/api/admin/session" && request.method === "GET") return cors(json({ authenticated: await validSession(request, env) }));
        if (url.pathname === "/api/admin/logout" && request.method === "POST") return cors(json({ ok: true }, 200, clearSessionHeaders()));

        const protectedRoute = ["/api/certificates", "/api/certificates/bulk", "/api/templates"].includes(url.pathname) && request.method !== "GET" || url.pathname === "/api/certificates" && request.method === "GET";
        if (protectedRoute && !(await validSession(request, env))) return cors(json({ error: "No autorizado" }, 401));

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
          const body = await readBody(request);
          const templateId = cleanName(body?.template_id || "bautismo-clasico");
          const names = Array.isArray(body?.names) ? [...new Set(body.names.map(cleanName).filter(name => name.length >= 3))] : [];
          if (!names.length) return cors(json({ error: "No se encontraron nombres válidos." }, 400));
          if (names.length > 500) return cors(json({ error: "La carga máxima es de 500 nombres por archivo." }, 400));
          const statements = names.map(name => { const id = newId("cert"); const data = { name, status: "generated", source: "bulk", template_id: templateId }; return env.DB.prepare("INSERT INTO certificates (id, template_id, data_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)").bind(id, templateId, JSON.stringify(data)); });
          await env.DB.batch(statements);
          return cors(json({ ok: true, created: names.length, names }));
        }

        if (url.pathname === "/api/templates" && request.method === "GET") {
          const rows = await env.DB.prepare("SELECT id, name, data_json, created_at, updated_at FROM templates ORDER BY name").all();
          return cors(json(rows.results.map(row => ({ ...row, data: JSON.parse(row.data_json) }))));
        }

        if (url.pathname === "/api/templates" && request.method === "POST") {
          const body = await readBody(request);
          if (!body?.id || !body?.name || !body?.data) return cors(json({ error: "id, name y data son obligatorios" }, 400));
          await env.DB.prepare(`INSERT INTO templates (id, name, data_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET name=excluded.name, data_json=excluded.data_json, updated_at=CURRENT_TIMESTAMP`).bind(body.id, body.name, JSON.stringify(body.data)).run();
          return cors(json({ ok: true, id: body.id }));
        }

        if (url.pathname === "/api/certificates" && request.method === "GET") {
          const rows = await env.DB.prepare("SELECT id, template_id, data_json, created_at, updated_at FROM certificates ORDER BY created_at DESC").all();
          return cors(json(rows.results.map(row => ({ ...row, data: JSON.parse(row.data_json) }))));
        }

        if (url.pathname === "/api/certificates" && request.method === "POST") {
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
