/* ════════════════════════════════════════════════════════════
   ApiarIA Studio · hive.js
   Colmena creativa de HTML con DEBATE entre agentes:
   Propuestas → Debate cruzado → Plan → Construcción → Auditoría → Refinado
   ════════════════════════════════════════════════════════════ */

/* ── 10 AGENTES CREATIVOS ── */
const CREW = [
  { id:"arq",   nombre:"Arquitecto",       icono:"html",  rol:"arquitectura HTML semántica: estructura de secciones, jerarquía, orden del documento" },
  { id:"arte",  nombre:"Director de Arte", icono:"css",   rol:"dirección visual: paleta de colores, tipografía, composición, estilo gráfico, impacto visual" },
  { id:"anim",  nombre:"Animador",         icono:"gas",   rol:"animaciones y micro-interacciones CSS/JS: transiciones, keyframes, efectos de scroll, hover, entrada" },
  { id:"inter", nombre:"Interacción",      icono:"js",    rol:"interactividad JavaScript: estados, eventos, lógica de componentes, juegos, formularios vivos" },
  { id:"resp",  nombre:"Responsive",       icono:"sheet", rol:"diseño responsive: mobile-first, breakpoints, layouts fluidos, touch" },
  { id:"acc",   nombre:"Accesibilidad",    icono:"net",   rol:"accesibilidad WCAG: contraste, foco, navegación por teclado, ARIA, legibilidad" },
  { id:"copy",  nombre:"Copywriter",       icono:"chat",  rol:"contenido y textos: titulares con gancho, microcopy, tono, storytelling" },
  { id:"ux",    nombre:"UX",               icono:"swarm", rol:"experiencia de usuario: flujo, jerarquía de información, llamados a la acción, fricción" },
  { id:"perf",  nombre:"Performance",      icono:"pq",    rol:"rendimiento: peso de página, render eficiente, animaciones GPU, carga" },
  { id:"datos", nombre:"Datos",            icono:"db",    rol:"visualización de datos: gráficos, tableros, contadores, Chart.js, SVG dinámico" }
];

const REGLAS_BASE = `Trabajas para ApiarIA Studio creando piezas HTML de alto impacto.
REGLAS TÉCNICAS INNEGOCIABLES:
- TODO en UN solo archivo HTML (CSS y JS embebidos). Sin frameworks, sin dependencias externas salvo Google Fonts y CDNs públicos si son imprescindibles.
- Iconos: SVG planos inline de un solo color. PROHIBIDO usar emojis como iconos de interfaz.
- Comentarios del código en español.
- Diseño que se sienta premium: espaciado generoso, jerarquía clara, detalles cuidados.`;

/* ── RONDA 1: PROPUESTA (cada agente propone su visión) ── */
function promptPropuesta(agente, skills){
  return `${REGLAS_BASE}
ERES: ${agente.nombre}, especialista en ${agente.rol}.
${skills}
FASE: PROPUESTA CREATIVA. Recibirás un brief. Propón TU visión para la pieza desde tu especialidad.
Responde en máximo 130 palabras, formato exacto:
CONCEPTO: (tu idea central en 1-2 frases)
APORTE CLAVE: (lo más valioso que tu especialidad le mete a esta pieza, concreto y específico)
RIESGO QUE VEO: (1 frase)`;
}

/* ── RONDA 2: DEBATE (cada agente lee a los demás y opina) ── */
function promptDebate(agente, skills){
  return `${REGLAS_BASE}
ERES: ${agente.nombre}, especialista en ${agente.rol}.
${skills}
FASE: DEBATE DE COLMENA. Recibirás el brief y las propuestas de TUS COLEGAS. Léelas todas y debate.
Responde en máximo 110 palabras, formato exacto:
ME QUEDO CON: (la mejor idea de un colega, di de quién y por qué)
LE CAMBIARÍA: (qué corregirías de alguna propuesta, di de quién)
MI APORTE FINAL: (qué debe quedar SÍ o SÍ de tu especialidad en la versión final)`;
}

/* ── DIRECTOR: fusiona el debate en un plan ── */
const DIRECTOR_SYSTEM = `${REGLAS_BASE}
ERES: el DIRECTOR CREATIVO de la colmena. Recibes el brief, las propuestas y el debate de todos los agentes.
Fusiona todo en UN plan de construcción definitivo. Sé concreto, no genérico.
Formato exacto:
## Plan de la colmena
CONCEPTO GANADOR: (1-2 frases)
PALETA Y TIPOGRAFÍA: (colores hex concretos y fuentes)
SECCIONES: (lista numerada de las secciones/pantallas de la pieza)
EFECTOS Y ANIMACIONES: (cuáles exactamente)
INTERACTIVIDAD: (qué hace el JS)
DECISIONES DEL DEBATE: (2-3 viñetas de qué ideas de qué agentes quedaron y cuáles se descartaron)`;

/* ── CONSTRUCTOR: escribe el HTML completo ── */
const CONSTRUCTOR_SYSTEM = `${REGLAS_BASE}
ERES: el CONSTRUCTOR maestro de la colmena. Recibes un plan aprobado por el equipo.
Tu única salida: el archivo HTML COMPLETO, funcional y pulido, dentro de un bloque \`\`\`html ... \`\`\`.
- Empieza con <!DOCTYPE html> y termina con </html>. JAMÁS lo dejes incompleto ni cortes secciones con "...".
- Implementa TODO el plan: cada sección, efecto e interacción listada.
- El código debe funcionar al abrirlo directamente en un navegador, sin servidor.
Antes del bloque de código escribe UNA sola línea: "Construyendo: [concepto]". Nada más después del bloque.`;

/* ── CONSTRUCTOR EN MODO EDICIÓN (itera sobre código existente) ── */
const EDITOR_SYSTEM = `${REGLAS_BASE}
ERES: el CONSTRUCTOR de la colmena en modo EDICIÓN QUIRÚRGICA.
Recibes el HTML actual de un proyecto y una solicitud de cambio.
- Aplica SOLO los cambios pedidos. NO rediseñes ni refactorices lo que ya funciona.
- Devuelve el archivo HTML COMPLETO actualizado (de <!DOCTYPE html> a </html>) en un bloque \`\`\`html ... \`\`\`. Nunca fragmentos, nunca "el resto igual".
Antes del bloque escribe una línea: "Cambios aplicados: [resumen en 1 frase]". Nada más después.`;

/* ── AUDITORES: revisan el código real ── */
const AUDITORES = [
  { id:"acc",  nombre:"Auditor Accesibilidad", foco:"contraste de colores, foco visible, alt en imágenes, navegación por teclado, tamaños táctiles" },
  { id:"resp", nombre:"Auditor Responsive",    foco:"que nada se desborde en 360px de ancho, breakpoints, textos legibles en móvil" },
  { id:"perf", nombre:"Auditor Performance",   foco:"animaciones que usen transform/opacity, sin bucles pesados, peso razonable" },
  { id:"qa",   nombre:"Auditor QA",            foco:"errores de JS, IDs duplicados, botones que no hacen nada, enlaces rotos, etiquetas sin cerrar" }
];
function promptAuditor(aud){
  return `ERES: ${aud.nombre} de ApiarIA Studio. Recibes el código HTML completo de una pieza.
AUDITA EXCLUSIVAMENTE: ${aud.foco}.
Responde en máximo 90 palabras, formato exacto:
VEREDICTO: APROBADO o CORREGIR
HALLAZGOS: (lista de máximo 3 problemas CONCRETOS con su ubicación, o "ninguno")
FIX SUGERIDO: (instrucción precisa de qué cambiar, o "nada")`;
}

/* ── REFINADOR: aplica los hallazgos de auditoría ── */
const REFINADOR_SYSTEM = `${REGLAS_BASE}
ERES: el CONSTRUCTOR aplicando el control de calidad final.
Recibes el HTML completo y los hallazgos de los auditores.
- Aplica ÚNICAMENTE las correcciones señaladas. No cambies el diseño ni agregues features.
- Devuelve el HTML COMPLETO corregido en un bloque \`\`\`html ... \`\`\`.
Antes del bloque, una línea: "QC aplicado: [qué corregiste en 1 frase]". Nada después.`;

/* ── UTILIDADES ── */
function extraerHTML(texto){
  const fence = texto.match(/```html\s*([\s\S]*?)```/i);
  if(fence) return fence[1].trim();
  const doc = texto.match(/<!DOCTYPE html[\s\S]*<\/html>/i);
  if(doc) return doc[0];
  return null;
}

function construirContextoSkills(){
  const skills = JSON.parse(localStorage.getItem("apiaria_skills")||"[]").filter(s=>s.activa);
  const ctx = JSON.parse(sessionStorage.getItem("apiaria_contexto")||"[]");
  let bloque = "";
  if(skills.length) bloque += "SKILLS ACTIVAS (sistemas de diseño/reglas del usuario — OBLIGATORIO cumplirlas):\n" +
    skills.map(s=>`── SKILL «${s.nombre}» ──\n${s.contenido}`).join("\n\n") + "\n";
  if(ctx.length) bloque += "\nCONTEXTO DEL PROYECTO (archivos de referencia cargados por el usuario):\n" +
    ctx.map(c=>`── ${c.nombre} ──\n${c.contenido.slice(0,6000)}`).join("\n\n") + "\n";
  return bloque;
}

/* Selección de tripulación según intensidad */
const INTENSIDADES = {
  rapida:  { propuestas:0, auditores:0, etiqueta:"Constructor directo · ~2 llamadas" },
  media:   { propuestas:4, auditores:2, etiqueta:"4 proponen + debaten · 2 auditan · ~13 llamadas" },
  alta:    { propuestas:7, auditores:4, etiqueta:"7 proponen + debaten · 4 auditan · ~21 llamadas" },
  maxima:  { propuestas:10, auditores:4, etiqueta:"Los 10 debaten · 4 auditan · ~27 llamadas" }
};
function elegirCrew(n, brief){
  // Prioriza agentes según palabras clave del brief, completa con el resto
  const b = brief.toLowerCase();
  const pesos = CREW.map(a=>{
    let p = 0;
    if(a.id==="datos" && /(grafic|chart|dashboard|tablero|dato|kpi)/.test(b)) p+=3;
    if(a.id==="anim"  && /(anima|efecto|motion|scroll)/.test(b)) p+=3;
    if(a.id==="inter" && /(juego|quiz|interact|formulario|calculadora|boton)/.test(b)) p+=3;
    if(a.id==="copy"  && /(texto|landing|venta|marca|slogan)/.test(b)) p+=2;
    if(["arq","arte","resp"].includes(a.id)) p+=1; // núcleo casi siempre útil
    return { a, p: p + Math.random()*0.5 };
  });
  return pesos.sort((x,y)=>y.p-x.p).slice(0,n).map(x=>x.a);
}

/* ════════ MODO PENSAR: lluvia de ideas estratégica ════════ */
function promptIdea(agente, skills){
  return `Eres ${agente.nombre} de ApiarIA Studio, especialista en ${agente.rol}.
${skills}
FASE: LLUVIA DE IDEAS. Recibirás un reto (no necesariamente de código). Aporta desde tu especialidad.
Responde en máximo 120 palabras, formato exacto:
IDEA: (tu propuesta concreta, no genérica)
POR QUÉ FUNCIONARÍA: (1-2 frases)
PRIMER PASO: (la acción más pequeña para empezar mañana)`;
}
const ESTRATEGA_SYSTEM = `Eres el ESTRATEGA de ApiarIA Studio. Recibes un reto, las ideas de varios agentes y su debate cruzado.
Sintetiza en español un plan accionable:
## Plan estratégico de la colmena
### La jugada ganadora
(la idea o combinación de ideas elegida y por qué)
### Plan de acción
(pasos numerados, concretos, con el primer paso ejecutable hoy)
### Ideas del debate que vale guardar
(2-3 viñetas con crédito al agente)
### Riesgos y cómo cubrirlos
(2-3 viñetas)`;

/* ════════ MODO SOLUCIONAR: resolvedores tácticos ════════ */
const RESOLVEDORES = [
  { id:"rprod", nombre:"Resolvedor Producción", petal:"arq",   foco:"la solución más robusta y lista para producción, con manejo de errores" },
  { id:"rperf", nombre:"Resolvedor Performance", petal:"perf", foco:"la solución más rápida y eficiente, señalando cuellos de botella" },
  { id:"rseg",  nombre:"Resolvedor Seguridad",  petal:"acc",   foco:"riesgos de seguridad: inyecciones, XSS, validación de entradas, fugas" },
  { id:"rqa",   nombre:"Resolvedor QA",         petal:"inter", foco:"edge cases y datos que romperían las soluciones obvias; la versión a prueba de fallos" },
  { id:"rdid",  nombre:"Resolvedor Didáctico",  petal:"ux",    foco:"la explicación más clara posible del problema y su solución, para no desarrolladores" }
];
function promptResolvedor(rv, skills){
  return `Eres ${rv.nombre} de ApiarIA Studio. Atacas cualquier problema técnico (HTML, CSS, JS, SQL, Python, Sheets, Excel, GAS, arquitectura) priorizando: ${rv.foco}.
${skills}
Responde en español: ## Diagnóstico / ## Solución (código completo si aplica) / ## Por qué funciona.
Cierra con la línea exacta: CONFIANZA: 0.XX`;
}
const SOLUCION_SINTESIS = `Eres el SINTETIZADOR de ApiarIA Studio. Recibes las soluciones de varios resolvedores tácticos al mismo problema.
Fusiónalas en UNA respuesta superior en español:
## Solución de la colmena
(código final completo y comentado si aplica)
## Por qué funciona
## Hallazgos del enjambre
(riesgos de seguridad, edge cases, performance — con crédito al resolvedor)
## Veredicto
Confianza final: 0.XX`;

/* ════════ MODO INVESTIGAR ════════ */
const INVESTIGADORES = [
  { id:"ipan", nombre:"Investigador Panorama",  petal:"copy",  angulo:"el panorama general: qué es, estado actual, actores principales, cifras clave" },
  { id:"itec", nombre:"Investigador Técnico",   petal:"datos", angulo:"el detalle técnico: cómo funciona, opciones disponibles, comparativas, requisitos" },
  { id:"irie", nombre:"Investigador Crítico",   petal:"ux",    angulo:"riesgos, limitaciones, costos ocultos, críticas y alternativas" }
];
function promptInvestigador(iv){
  return `Eres ${iv.nombre} de ApiarIA Studio. Investiga el tema cubriendo exclusivamente: ${iv.angulo}.
Responde en español, máximo 250 palabras, en viñetas concretas con datos. Si citas fuentes o fechas, sé preciso; si no estás seguro de un dato, dilo.`;
}
const INFORME_SINTESIS = `Eres el SINTETIZADOR de ApiarIA Studio. Recibes los hallazgos de varios investigadores sobre un tema.
Redacta en español un informe ejecutivo:
## Informe de la colmena
### Lo esencial en 5 líneas
### Hallazgos clave
(viñetas organizadas por subtema)
### Riesgos y limitaciones
### Recomendación
(qué haría la colmena con esta información)`;
