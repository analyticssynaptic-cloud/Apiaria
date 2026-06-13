/* ════════════════════════════════════════════════════════════
   ApiarIA v2 · providers.js
   Adaptadores unificados: Anthropic (Claude), Google (Gemini),
   Perplexity. Todos exponen la misma interfaz:
   llamarIA(proveedor, system, userMsg, maxTokens) → Promise<string>
   ════════════════════════════════════════════════════════════ */

const PROVEEDORES = {
  anthropic: {
    nombre: "Claude (Anthropic)",
    modeloDefault: "claude-haiku-4-5",       // barato, ideal para enjambres
    modeloSintesis: "claude-sonnet-4-5",     // potente, para sintetizar
    keyStorage: "apiaria_key_anthropic",
    urlKeys: "https://console.anthropic.com/settings/keys",
    prefijo: "sk-ant-"
  },
  gemini: {
    nombre: "Gemini (Google)",
    modeloDefault: "gemini-2.0-flash",       // tiene capa GRATUITA
    modeloSintesis: "gemini-2.0-flash",
    keyStorage: "apiaria_key_gemini",
    urlKeys: "https://aistudio.google.com/apikey",
    prefijo: "AIza"
  },
  perplexity: {
    nombre: "Perplexity",
    modeloDefault: "sonar",                  // con búsqueda web integrada
    modeloSintesis: "sonar",
    keyStorage: "apiaria_key_perplexity",
    urlKeys: "https://www.perplexity.ai/settings/api",
    prefijo: "pplx-"
  }
};

function getProviderKey(prov){ return localStorage.getItem(PROVEEDORES[prov].keyStorage) || ""; }
function setProviderKey(prov, key){
  if(key) localStorage.setItem(PROVEEDORES[prov].keyStorage, key.trim());
  else localStorage.removeItem(PROVEEDORES[prov].keyStorage);
}

/* ─────────── ANTHROPIC ─────────── */
async function llamarAnthropic(system, userMsg, maxTokens, modelo){
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getProviderKey("anthropic"),
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: modelo || PROVEEDORES.anthropic.modeloDefault,
      max_tokens: maxTokens,
      system, messages: [{ role: "user", content: userMsg }]
    })
  });
  if(!r.ok){ const e = await r.json().catch(()=>({})); throw new Error("Anthropic: " + (e?.error?.message || "HTTP "+r.status)); }
  const d = await r.json();
  return d.content.filter(b=>b.type==="text").map(b=>b.text).join("\n");
}

/* ─────────── GEMINI ─────────── */
async function llamarGemini(system, userMsg, maxTokens, modelo){
  const m = modelo || PROVEEDORES.gemini.modeloDefault;
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${getProviderKey("gemini")}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 }
      })
    }
  );
  if(!r.ok){ const e = await r.json().catch(()=>({})); throw new Error("Gemini: " + (e?.error?.message || "HTTP "+r.status)); }
  const d = await r.json();
  const partes = d?.candidates?.[0]?.content?.parts || [];
  const texto = partes.map(p=>p.text||"").join("\n");
  if(!texto) throw new Error("Gemini: respuesta vacía (posible bloqueo de seguridad)");
  return texto;
}

/* ─────────── PERPLEXITY ───────────
   Nota: la API de Perplexity NO permite llamadas directas desde
   navegador (CORS). Funciona vía un proxy CORS público de respaldo.
   Para producción seria, monta tu propio proxy (ver INSTRUCCIONES). */
async function llamarPerplexity(system, userMsg, maxTokens, modelo){
  const cuerpo = JSON.stringify({
    model: modelo || PROVEEDORES.perplexity.modeloDefault,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMsg }
    ]
  });
  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getProviderKey("perplexity")
  };
  let r;
  try {
    r = await fetch("https://api.perplexity.ai/chat/completions", { method:"POST", headers, body: cuerpo });
  } catch(_) {
    // Fallback vía proxy CORS público (solo para pruebas)
    r = await fetch("https://corsproxy.io/?url=" + encodeURIComponent("https://api.perplexity.ai/chat/completions"),
      { method:"POST", headers, body: cuerpo });
  }
  if(!r.ok){ const e = await r.json().catch(()=>({})); throw new Error("Perplexity: " + (e?.error?.message || "HTTP "+r.status)); }
  const d = await r.json();
  return d?.choices?.[0]?.message?.content || "";
}

/* ─────────── INTERFAZ UNIFICADA ─────────── */
async function llamarIA(proveedor, system, userMsg, maxTokens=1800, modelo=null){
  switch(proveedor){
    case "anthropic":  return llamarAnthropic(system, userMsg, maxTokens, modelo);
    case "gemini":     return llamarGemini(system, userMsg, maxTokens, modelo);
    case "perplexity": return llamarPerplexity(system, userMsg, maxTokens, modelo);
    default: throw new Error("Proveedor desconocido: " + proveedor);
  }
}

/* Pool de concurrencia: ejecuta N tareas con máximo K simultáneas
   (evita saturar límites de tasa de las APIs) */
async function poolParalelo(tareas, concurrencia, onProgreso){
  const resultados = new Array(tareas.length);
  let indice = 0, completadas = 0;
  async function worker(){
    while(indice < tareas.length){
      const i = indice++;
      resultados[i] = await tareas[i]().catch(e => ({ error: e.message }));
      completadas++;
      if(onProgreso) onProgreso(completadas, tareas.length, i, resultados[i]);
    }
  }
  await Promise.all(Array.from({length: Math.min(concurrencia, tareas.length)}, worker));
  return resultados;
}
