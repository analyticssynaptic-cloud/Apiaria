/* ════════════════════════════════════════════════════════════
   ApiarIA v2.1 · providers.js  (CORREGIDO)
   Cambios respecto a v2.0:
   1. Modelos Gemini actualizados a los que SÍ tienen capa
      gratuita vigente (gemini-2.5-flash-lite / gemini-2.5-flash).
   2. Cascada automática de modelos: si uno responde "quota
      limit: 0", se salta al siguiente de la lista.
   3. Regulador de velocidad (throttle) para la capa gratuita de
      Gemini: espacia las peticiones para respetar el límite RPM.
   4. Reintentos automáticos: si la API pide "retry in Xs",
      espera ese tiempo y reintenta (hasta 3 veces).
   ════════════════════════════════════════════════════════════ */

const PROVEEDORES = {
  anthropic: {
    nombre: "Claude (Anthropic)",
    modeloDefault: "claude-haiku-4-5",
    modeloSintesis: "claude-sonnet-4-5",
    keyStorage: "apiaria_key_anthropic",
    urlKeys: "https://console.anthropic.com/settings/keys",
    prefijo: "sk-ant-"
  },
  gemini: {
    nombre: "Gemini (Google)",
    // Cascada: se intenta en este orden. flash-lite tiene los
    // límites gratuitos más altos (≈15 RPM / 1.000 req día).
    modelosCascada: ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-flash-latest"],
    modeloDefault: "gemini-2.5-flash-lite",
    modeloSintesis: "gemini-2.5-flash",
    keyStorage: "apiaria_key_gemini",
    urlKeys: "https://aistudio.google.com/apikey",
    prefijo: "AIza"
  },
  perplexity: {
    nombre: "Perplexity",
    modeloDefault: "sonar",
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

/* ─────────── UTILIDADES DE RESILIENCIA ─────────── */
const dormir = ms => new Promise(r => setTimeout(r, ms));

// Extrae los segundos de espera de mensajes tipo "retry in 39.36s"
function extraerEspera(msg){
  const m = String(msg).match(/retry in ([0-9.]+)\s*s/i);
  if(m) return Math.ceil(parseFloat(m[1]) * 1000) + 500;
  return null;
}

/* Regulador de velocidad (throttle) por proveedor.
   Gemini capa gratuita ≈ 15 peticiones/minuto → 1 petición cada
   4.2 segundos como máximo de arranque. Las demás esperan turno. */
const THROTTLE_MS = { gemini: 4200, anthropic: 0, perplexity: 1200 };
const _ultimoTurno = { gemini: 0, anthropic: 0, perplexity: 0 };
async function tomarTurno(prov){
  const gap = THROTTLE_MS[prov] || 0;
  if(!gap) return;
  const ahora = Date.now();
  const turno = Math.max(ahora, _ultimoTurno[prov] + gap);
  _ultimoTurno[prov] = turno;
  const espera = turno - ahora;
  if(espera > 0) await dormir(espera);
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

/* ─────────── GEMINI (con cascada de modelos) ─────────── */
async function _geminiUnaVez(system, userMsg, maxTokens, modelo){
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${getProviderKey("gemini")}`,
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
  if(!r.ok){
    const e = await r.json().catch(()=>({}));
    const msg = e?.error?.message || ("HTTP " + r.status);
    const err = new Error("Gemini: " + msg);
    err.status = r.status;
    err.sinCuota = /limit:\s*0/.test(msg) || r.status === 404; // modelo sin capa gratuita o inexistente
    err.esperar = extraerEspera(msg);
    throw err;
  }
  const d = await r.json();
  const texto = (d?.candidates?.[0]?.content?.parts || []).map(p=>p.text||"").join("\n");
  if(!texto) throw new Error("Gemini: respuesta vacía (posible bloqueo de seguridad)");
  return texto;
}

async function llamarGemini(system, userMsg, maxTokens, modeloPreferido){
  const cascada = PROVEEDORES.gemini.modelosCascada;
  const lista = modeloPreferido
    ? [modeloPreferido, ...cascada.filter(m => m !== modeloPreferido)]
    : [...cascada];

  let ultimoError = null;
  for(const modelo of lista){
    for(let intento = 1; intento <= 3; intento++){
      await tomarTurno("gemini");
      try {
        return await _geminiUnaVez(system, userMsg, maxTokens, modelo);
      } catch(e){
        ultimoError = e;
        if(e.sinCuota) break;            // este modelo no sirve → siguiente de la cascada
        if(e.status === 429){            // límite de velocidad → esperar lo que pida y reintentar
          await dormir(e.esperar || 15000 * intento);
          continue;
        }
        if(e.status >= 500){ await dormir(2000 * intento); continue; }
        throw e;                          // otro error (key inválida, etc.) → no reintentar
      }
    }
  }
  throw ultimoError || new Error("Gemini: sin modelos disponibles");
}

/* ─────────── PERPLEXITY ─────────── */
async function llamarPerplexity(system, userMsg, maxTokens, modelo){
  await tomarTurno("perplexity");
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

/* Pool de concurrencia (sin cambios de interfaz).
   Nota: el throttle interno de cada proveedor ya regula el ritmo
   real, así que la concurrencia alta no rompe la capa gratuita. */
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
