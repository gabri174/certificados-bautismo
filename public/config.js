// Cloudflare Worker API used by the ServerByt-hosted frontend.
window.CERTIFICADOS_API_URL = "https://bautismos.ensupresenciacrtv.workers.dev/api";

// Carga las mejoras visuales después de que app.js haya inicializado el editor.
document.addEventListener("DOMContentLoaded", () => {
  const script = document.createElement("script");
  script.src = "/guides.js?v=20260813";
  script.defer = true;
  document.body.appendChild(script);
});
