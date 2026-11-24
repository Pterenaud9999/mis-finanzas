/* ================= Configuración del dispositivo + efecto "ola" en la Wallet ================= */
const CFG_DEF = {ola:true, intensidad:2, sonido:true, volumen:0.25};
function cfgGet(){ try { return {...CFG_DEF, ...JSON.parse(localStorage.getItem("mf-cfg")||"{}")}; } catch(e){ return {...CFG_DEF}; } }
function cfgSet(k, v){ const c = cfgGet(); c[k] = v; try { localStorage.setItem("mf-cfg", JSON.stringify(c)); } catch(e){} return c; }
const OLA_P = {1:{a:1.4, w:1.6, s:.02, l:"Sutil"}, 2:{a:2.6, w:2.2, s:.04, l:"Normal"}, 3:{a:4.2, w:2.8, s:.07, l:"Marcada"}};

/* ---------- Sonido de cartas (sintetizado, sin archivos) ---------- */
let olaAC = null;
function olaTic(force){
  const c = cfgGet(); if (!force && !c.sonido) return;
  try {
    olaAC = olaAC || new (window.AudioContext||window.webkitAudioContext)();
    if (olaAC.state==="suspended") olaAC.resume();
    const t = olaAC.currentTime, len = Math.floor(olaAC.sampleRate*0.04), b = olaAC.createBuffer(1, len, olaAC.sampleRate), d = b.getChannelData(0);
    for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 3);
    const src = olaAC.createBufferSource(); src.buffer = b;
    const f = olaAC.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2300 + Math.random()*900; f.Q.value = .9;
    const g = olaAC.createGain(); g.gain.setValueAtTime(Math.max(0.02, +c.volumen||0.25), t); g.gain.exponentialRampToValueAtTime(.001, t+.045);
    src.connect(f).connect(g).connect(olaAC.destination); src.start(t);
  } catch(e){}
}

/* ---------- Ola ---------- */
const OLA = {on:false, timer:null, y0:0, x0:0, top:-1, cards:[], base:40, h:0, lastOpen:0};
function olaCards(){ return [...document.querySelectorAll("#stack .wcard")]; }
function olaLayout(fy){
  const p = OLA_P[cfgGet().intensidad] || OLA_P[2], els = OLA.cards, n = els.length; if (!n) return;
  if (fy==null){ els.forEach(e=>{ e.style.transform = ""; e.style.zIndex = ""; }); return; }
  const tops0 = OLA.tops0, base = OLA.base;
  let best = 0, top = -1;
  const ex = els.map((e,i)=>{ const dist = (fy - (tops0[i] + base/2)) / base; const v = Math.exp(-dist*dist/p.w); if (v>best && fy>=tops0[i]-base){ best = v; top = i; } return base*p.a*v; });
  const total = ex.reduce((a,v)=>a+v,0), frac = Math.min(1, Math.max(0, fy / Math.max(1, OLA.h)));
  let cum = 0;
  els.forEach((e,i)=>{ const shift = Math.max(-tops0[i], cum - total*frac); cum += ex[i];
    const lift = Math.max(0, 1 - Math.abs((fy - (tops0[i]+base/2))/base)/1.2);
    e.style.transform = `translate3d(0,${Math.round(shift)}px,0) scale(${(1+p.s*lift).toFixed(3)})`; e.style.zIndex = String(i+1); });
  if (top!==-1 && top!==OLA.top){ OLA.top = top; olaTic(); }
}
function olaStart(clientY){
  const st = $("stack"); if (!st || st.classList.contains("v-lista")) return false;
  OLA.cards = olaCards(); if (OLA.cards.length < 2) return false;
  OLA.cards.forEach(e=>{ e.style.transform = ""; });
  const r0 = st.getBoundingClientRect().top; OLA.tops0 = OLA.cards.map(e=>e.getBoundingClientRect().top - r0);
  OLA.base = Math.max(24, OLA.tops0[1] - OLA.tops0[0]); OLA.h = st.offsetHeight; OLA.top = -1; OLA.on = true;
  st.classList.add("ola-on"); olaLayout(clientY - st.getBoundingClientRect().top); return true;
}
function olaMove(clientY){ if (OLA.on) olaLayout(clientY - $("stack").getBoundingClientRect().top); }
function olaEnd(open){
  if (!OLA.on) return; OLA.on = false; OLA.lastOpen = Date.now();
  const id = OLA.top>=0 && OLA.cards[OLA.top] ? OLA.cards[OLA.top].dataset.card : null;
  $("stack")?.classList.remove("ola-on"); olaLayout(null);
  if (open && id) setTimeout(()=>openCard(id), 120);
}
/* Gesto: presionar sobre la pila y deslizar (dedo o mouse). La pila no desplaza la página
   mientras la ola está activa; para desplazarte usa el área fuera de las tarjetas. */
let olaRAF = 0, olaY = null, olaX = null;
function olaInside(x, y){ const r = OLA.stRect; if (!r) return false; const bottom = r.top + OLA.tops0[OLA.tops0.length-1] + (OLA.cards[OLA.cards.length-1]?.offsetHeight||0);
  return x >= r.left && x <= r.right && y >= r.top - 10 && y <= bottom + 10; }
function olaQueue(x, y){ olaX = x; olaY = y; if (!olaRAF) olaRAF = requestAnimationFrame(()=>{ olaRAF = 0; if (!OLA.on || olaY==null) return;
  if (olaInside(olaX, olaY)){ OLA.out = false; olaLayout(olaY - OLA.stTop); } else if (!OLA.out){ OLA.out = true; OLA.top = -1; OLA.cards.forEach(e=>{ e.style.transform = ""; }); } }); }
document.addEventListener("pointerdown", e=>{
  if (!cfgGet().ola || (e.pointerType==="mouse" && e.button!==0)) return;
  const st = e.target.closest && e.target.closest("#stack"); if (!st || st.classList.contains("v-lista")) return;
  OLA.pid = e.pointerId; OLA.y0 = e.clientY; OLA.x0 = e.clientX; OLA.moved = false;
  OLA.stTop = st.getBoundingClientRect().top;
});
document.addEventListener("pointermove", e=>{
  if (OLA.pid!==e.pointerId) return;
  if (!OLA.on){
    if (Math.abs(e.clientY-OLA.y0) < 6) return;
    if (!olaStart(OLA.y0)) { OLA.pid = null; return; }
    OLA.stRect = $("stack").getBoundingClientRect(); OLA.stTop = OLA.stRect.top; OLA.out = false;
    try { $("stack").setPointerCapture(e.pointerId); } catch(err){}
  }
  olaQueue(e.clientX, e.clientY);
});
const olaUp = e => { if (OLA.pid!==e.pointerId) return; OLA.pid = null; if (OLA.on) olaEnd(e.type==="pointerup" && olaInside(e.clientX, e.clientY)); };
document.addEventListener("pointerup", olaUp);
document.addEventListener("pointercancel", olaUp);
/* evita que el "clic" posterior abra otra tarjeta */
document.addEventListener("click", e=>{ if (Date.now()-OLA.lastOpen < 600 && e.target.closest("#stack")){ e.stopImmediatePropagation(); e.preventDefault(); } }, true);
document.addEventListener("contextmenu", e=>{ if (OLA.on) e.preventDefault(); });

/* ---------- Pantalla de Configuración ---------- */
function cfgOpen(){
  let box = document.getElementById("cfgx");
  if (!box){ box = document.createElement("div"); box.id = "cfgx"; box.className = "sheet"; box.setAttribute("role","dialog"); box.setAttribute("aria-label","Configuración"); document.body.appendChild(box); }
  box.hidden = false; document.body.classList.add("locked"); cfgRender();
}
function cfgClose(){ const b = document.getElementById("cfgx"); if (b){ b.hidden = true; b.innerHTML = ""; } if (!S.sheet && !S.tx && !S.xl) document.body.classList.remove("locked"); }
function cfgRender(){
  const box = document.getElementById("cfgx"); if (!box) return; const c = cfgGet();
  box.innerHTML = `<div class="sheet-in"><div class="sheet-top"><button class="btn" data-act="cfgclose">←</button><b>Configuración</b></div>
    <div class="panel cfg-sec"><b>Wallet</b>
      <label class="cfg-row"><span>Movimiento de ola al deslizar<span class="sub">Mantén presionada una tarjeta y desliza hacia arriba o abajo</span></span><input type="checkbox" id="cfg-ola" ${c.ola?"checked":""}></label>
      <div class="cfg-row ${c.ola?"":"off"}"><span>Intensidad de la ola</span><div class="seg sm">${[1,2,3].map(k=>`<button type="button" data-act="cfgint" data-v="${k}" aria-pressed="${c.intensidad===k}" ${c.ola?"":"disabled"}>${OLA_P[k].l}</button>`).join("")}</div></div>
      <label class="cfg-row ${c.ola?"":"off"}"><span>Sonido de cartas<span class="sub">En iPhone no suena si está en modo silencio</span></span><input type="checkbox" id="cfg-snd" ${c.sonido?"checked":""} ${c.ola?"":"disabled"}></label>
      <div class="cfg-row ${c.ola&&c.sonido?"":"off"}"><span>Volumen</span><input type="range" id="cfg-vol" min="0.05" max="0.6" step="0.05" value="${c.volumen}" ${c.ola&&c.sonido?"":"disabled"} style="flex:1;max-width:180px"><button type="button" class="btn sm" data-act="cfgtest" ${c.ola&&c.sonido?"":"disabled"}>Probar</button></div>
    </div>
    <p class="sub" style="margin:0">Estos ajustes se guardan solo en este dispositivo.</p></div>`;
}
document.addEventListener("click", e=>{
  const a = e.target.closest("[data-act]"); if (!a) return;
  if (a.dataset.act==="cfgopen"){ e.stopImmediatePropagation(); if (typeof openDrawer==="function") openDrawer(false); cfgOpen(); return; }
  if (!document.getElementById("cfgx") || document.getElementById("cfgx").hidden) return;
  if (a.dataset.act==="cfgclose"){ e.stopImmediatePropagation(); cfgClose(); }
  if (a.dataset.act==="cfgint"){ e.stopImmediatePropagation(); cfgSet("intensidad", +a.dataset.v); cfgRender(); }
  if (a.dataset.act==="cfgtest"){ e.stopImmediatePropagation(); olaTic(true); setTimeout(()=>olaTic(true),90); setTimeout(()=>olaTic(true),180); }
}, true);
document.addEventListener("change", e=>{
  if (e.target.id==="cfg-ola"){ cfgSet("ola", e.target.checked); cfgRender(); try { renderStack(); } catch(err){} }
  if (e.target.id==="cfg-snd"){ cfgSet("sonido", e.target.checked); cfgRender(); }
  if (e.target.id==="cfg-vol"){ cfgSet("volumen", +e.target.value); olaTic(true); }
});
document.addEventListener("keydown", e=>{ if (e.key==="Escape" && document.getElementById("cfgx") && !document.getElementById("cfgx").hidden){ e.stopImmediatePropagation(); cfgClose(); } }, true);
(function(){ const d = $("drawer")?.querySelector(".dr-foot"); if (!d) return;
  const b = document.createElement("button"); b.dataset.act = "cfgopen"; b.innerHTML = "<span>⚙️</span>Configuración"; d.before(b); })();
