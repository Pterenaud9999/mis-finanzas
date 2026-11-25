/* ================= Tema blanco / negro ================= */
function applyTheme(t){
  const r = document.documentElement;
  r.classList.toggle("th-light", t==="light");
  r.classList.toggle("th-dark", t==="dark" || t==="verde");
  r.classList.toggle("th-green", t==="verde");
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t==="verde" ? "#1c3a2c" : t==="dark" ? "#0f1115" : "#0f7b6c";
  const nx = {light:"verde", verde:"dark", dark:"light"}[t] || "verde";
  const b = $("theme-btn"); if (b){ b.setAttribute("aria-label", nx==="verde"?"Cambiar a fondo oscuro verde":nx==="dark"?"Cambiar a fondo negro":"Cambiar a fondo blanco"); b.innerHTML = nx==="light" ? "☀" : nx==="verde" ? '<i class="ti ti-leaf" aria-hidden="true"></i>' : "☾"; }
}
(function(){ let t="light"; try { t = localStorage.getItem("mf-theme") || "light"; } catch(e){} S.theme=t; applyTheme(t); })();

/* ================= Menú lateral ================= */
const VIEW_NAMES = {inicio:"Inicio", cuentas:"Cuentas", graficos:"Gráficos", categorias:"Categorías", despensa:"Despensa", balance:"Balance", calendario:"Calendario", wallet:"Wallet", presupuesto:"Presupuesto"};
function openDrawer(open){
  const d = $("drawer"); d.hidden = !open; document.body.classList.toggle("locked", open || S.sheet);
  if (open){ const t = cuentasTotals(); $("dr-bal").textContent = "Balance: " + fmt(t.total); d.querySelector("[data-nav]")?.focus(); }
}

/* ================= Cuentas (como en tu app) ================= */
const BASE_CTAS = "2026-11-19";
function ctaColor(n){
  const s = n.toUpperCase();
  if (s.startsWith("EFECTIVO")) return "#17c252";
  if (s.includes("DEUDA") && !s.startsWith("MP")) return "#5c9e3a";
  if (s.startsWith("MP")) return "#4d8cf0";
  if (s.startsWith("NU") || s.includes("(NU)")) return "#820ad1";
  if (s.startsWith("OPEN")) return "#3b3f47";
  if (s.startsWith("HSBC")) return "#db0011";
  if (s.startsWith("MIFEL")) return "#2b4f8f";
  if (s.startsWith("BBVA")) return "#1464a5";
  if (s.startsWith("UALA")) return "#4f7bff";
  if (s.startsWith("GBM")) return "#e6b800";
  if (s.includes("PLERK")) return "#e46fb4";
  return "#7a8190";
}
function ctaIcon(n){ const s=n.toUpperCase(); const k = s.startsWith("EFECTIVO")?"cash":s.includes("DEUDA")?"building-bank":(s.includes("AHORRO")||s.includes("EMERGENCIA")||s.includes("MAESTR"))?"pig-money":s.startsWith("GBM")||s.includes("PPR")?"chart-line":s.includes("SALUD")?"heart-rate-monitor":"wallet"; return `<i class="ti ti-${k}" aria-hidden="true"></i>`; }
function trfItems(){ const out=[]; Object.values(S.trfDb||{}).forEach(d=>(d.items||[]).forEach(x=>out.push(x))); return out; }
function ctaIs(c){ const al = c.alias||[]; return v => v===c.n || (al.length>0 && al.includes(v)); }
function ctaSaldo(c){
  let s = +c.s||0; const es = ctaIs(c);
  allMonths().forEach(ym=>{ if (ym < BASE_CTAS.slice(0,7)) return; monthItems(ym).forEach(x=>{ if (x.f>BASE_CTAS && es(x.cta) && !x.tdc) s += x.t==="i" ? x.m : -x.m; }); });
  S.periods.forEach(p=>(p.pagos||[]).forEach(g=>{ if (g.f>BASE_CTAS && es(g.cta)) s -= +g.m||0; }));
  trfItems().forEach(x=>{ if (x.f>BASE_CTAS){ if (es(x.de)) s -= x.m; if (es(x.a)) s += x.m; } });
  return Math.round(s*100)/100;
}
function cuentasTotals(){
  const list = (S.ctas?.list)||[]; let total=0, todas=0;
  list.forEach(c=>{ const v=ctaSaldo(c); todas+=v; if (c.t) total+=v; });
  return {total, todas};
}
function ctaNames(){ const l=(S.ctas?.list)||[]; return l.length ? l.map(c=>c.n) : HIST.meta.cuentas; }
function renderCuentas(){
  const box = $("cuentas"); if (!box) return;
  const list = (S.ctas?.list)||[], tt = cuentasTotals();
  if (S.trfView){ renderTrfHist(); return; }
  let h = `<div class="ct-head"><span class="sub">Total</span><b class="bal-big num">${fmt(tt.total)}</b><span class="sub num">Todas las cuentas: ${fmt(tt.todas)}</span></div>
    <div class="ct-acts"><button class="ct-act" data-act="trfhist"><span>🕘</span>Historial de transferencias</button><button class="ct-act" data-act="trfnew"><span>⇄</span>Nueva transferencia</button></div>`;
  if (S.trfEdit) h += trfForm(S.trfEdit);
  if (S.ctaEdit && S.ctaEdit.nuevo) h += ctaForm(S.ctaEdit);
  h += `<div class="actions"><button class="btn sm${S.ctaUbi?" primary":""}" data-act="ctaubi">📍 ${S.ctaUbi?"Listo":"Ubicar cuentas"}</button></div>`;
  if (S.ctaUbi){
    const grupos = [...tddCards().map(c=>c.id), "efectivo", ""];
    h += `<p class="sub" style="margin:0">Elige en qué tarjeta de débito real o en efectivo está cada cuenta. Cada grupo debe coincidir con el saldo de esa tarjeta en tu banco.</p>` + grupos.map(g=>{ const its = list.map((c,i)=>({c,i})).filter(o=>ctaEn(o.c)===g); if (!its.length && g==="") return "";
      const tot = its.reduce((a,o)=>a+(o.c.t?ctaSaldo(o.c):0),0), todas = its.reduce((a,o)=>a+ctaSaldo(o.c),0);
      return `<div class="ubi-g"><div class="sec-head"><b>${g==="efectivo"?"💵 ":g?"💳 ":"❔ "}${esc(ctaEnName(g))}</b><b class="num">${fmt(tot)}${Math.abs(todas-tot)>=0.005?` <small class="sub">(con ⊘: ${fmt(todas)})</small>`:""}</b></div>${its.map(o=>`<div class="ubi-r"><span>${esc(o.c.n)}</span><span class="num">${fmt(ctaSaldo(o.c))}</span><select data-ctaen="${o.i}" aria-label="Dónde está ${esc(o.c.n)}">${ctaEnOpts(g)}</select></div>`).join("") || '<p class="sub" style="margin:4px 0">Sin cuentas.</p>'}</div>`; }).join("");
    box.innerHTML = h; return;
  }
  const row = (c,i)=>{ const v=ctaSaldo(c);
    return `<button class="ct-row" data-act="ctaedit" data-i="${i}"><span class="ct-ic" style="background:${ctaColor(c.n)}">${ctaIcon(c.n)}</span><span class="ct-n">${esc(c.n)}</span>${c.t?"":'<span class="ct-hid" title="No suma al total" aria-label="No suma al total">⊘</span>'}<span class="num ct-v${v<0?" neg":""}">${fmt(v)}</span></button>`; };
  const rowW = (c,i)=>`<div class="ct-rw${S.ctaSel===i?" sel":""}">${row(c,i)}${S.ctaSel===i?`<button type="button" class="ct-ed" data-act="ctaedit" data-i="${i}" data-go="1" aria-label="Editar ${esc(c.n)}">✏️</button><button type="button" class="ct-x" data-act="ctax" data-i="${i}" aria-label="Eliminar ${esc(c.n)}">×</button>`:""}</div>${S.ctaEdit && !S.ctaEdit.nuevo && S.ctaEdit.i===i ? `<div class="ct-delin" id="ct-inl">${S.ctaDelIn ? ctaDelHTML(S.ctaEdit) : ctaForm(S.ctaEdit) + (S.ctaLed ? ctaLedgerHTML(S.ctaEdit) : "")}</div>` : ""}`;
  if (S.ctaMove) h += ctaMoveHTML();
  h += `<p class="sub ct-tip">Mantén presionada una cuenta y arrástrala para cambiarla de lugar.</p>`;
  h += [...tddCards().map(c=>c.id), "efectivo", ""].map(g=>{
    const its = list.map((c,i)=>({c,i})).filter(o=>ctaEn(o.c)===g); if (!its.length && g==="") return "";
    const tot = its.reduce((a,o)=>a+(o.c.t?ctaSaldo(o.c):0),0), todas = its.reduce((a,o)=>a+ctaSaldo(o.c),0);
    return `<div class="ct-grp" data-g="${esc(g)}"><div class="ct-gh"><span>${g==="efectivo"?"💵":g?"💳":"❔"} ${esc(ctaEnName(g))}</span><span class="ct-gt"><span class="num">${fmt(tot)}</span>${Math.abs(todas-tot)>=0.005?`<small class="num">con ⊘: ${fmt(todas)}</small>`:""}</span></div><div class="ct-list">${its.map(o=>rowW(o.c,o.i)).join("") || '<p class="sub ct-empty">Suelta aquí una cuenta</p>'}</div></div>`;
  }).join("") + `
    <div class="actions"><button class="btn sm" data-act="ctanew">+ Agregar cuenta</button></div>
    <p class="sub" style="margin:0">⊘ = no suma al total (igual que el ojo tachado de tu app). Saldos al ${dLong(BASE_CTAS)}; desde ahí se actualizan con tus movimientos y transferencias.</p>`;
  box.innerHTML = h;
  if (S.ctaScroll){ S.ctaScroll=false; const f=document.getElementById("ct-inl"); if (f){ const r=f.getBoundingClientRect(); if (r.bottom>innerHeight-20 || r.top<60) f.scrollIntoView({block:"nearest", behavior:"smooth"}); } }
}
function ctaForm(x){
  return `<form class="f mform ct-fc" data-form="cta"><label class="full" for="ct-n">Nombre<input id="ct-n" required maxlength="60" value="${esc(x.n||"")}"></label>
    <label for="ct-s">Saldo actual<input id="ct-s" type="number" step="0.01" inputmode="decimal" value="${x.nuevo?"":ctaSaldo(x)}"></label>
    <label for="ct-en">¿Dónde está?<select id="ct-en">${ctaEnOpts(x.nuevo?"":ctaEn(x))}</select></label>
    <label class="chk full" for="ct-t"><input type="checkbox" id="ct-t" ${x.t?"checked":""}> Suma al total</label>
    <div class="actions full"><button class="btn sm primary" type="submit">Guardar</button><button class="btn sm" type="button" data-act="ctacancel">Cancelar</button>${x.nuevo||S.ctaConfirm?"":`<button class="btn sm danger" type="button" data-act="ctadel">Eliminar</button><button class="linkbtn ct-ledbtn" type="button" data-act="ctaled">${S.ctaLed?"Ocultar movimientos":"Ver movimientos"}</button>`}</div>${!x.nuevo && S.ctaConfirm ? ctaDelHTML(x) : ""}</form>`;
}
function trfForm(x){
  const opts = ctaNames().map(n=>`<option value="${esc(n)}">`).join("");
  return `<form class="f mform" data-form="trf"><datalist id="dl-ctas">${opts}</datalist>
    <label class="full" for="tr-de">Transfiere de una cuenta<input id="tr-de" list="dl-ctas" required value="${esc(x.de||"")}"></label>
    <label class="full" for="tr-a">Transfiere a una cuenta<input id="tr-a" list="dl-ctas" required value="${esc(x.a||"")}"></label>
    <label for="tr-m">Cantidad (MXN)<input id="tr-m" type="number" step="0.01" min="0.01" required inputmode="decimal" value="${x.m??""}"></label>
    <label for="tr-f">Fecha<input id="tr-f" type="date" required value="${esc(x.f||todayISO)}"></label>
    <label class="full" for="tr-n">Comentario<input id="tr-n" maxlength="120" value="${esc(x.n||"")}"></label>
    <div class="actions full"><button class="btn primary" type="submit">${x.nuevo?"Añadir":"Guardar"}</button><button class="btn" type="button" data-act="trfcancel">Cancelar</button>${x.nuevo?"":`<button class="btn danger" type="button" data-act="trfdel">${S.trfConfirm?"Confirmar eliminar":"Eliminar"}</button>`}</div></form>`;
}
function renderTrfHist(){
  const mode = S.mvMode||"mes", r = mvRange();
  const items = trfItems().filter(x=>x.f>=r.from && x.f<=r.to).sort((a,b)=>b.f.localeCompare(a.f));
  const byDay = {}; items.forEach(x=>(byDay[x.f]=byDay[x.f]||[]).push(x));
  let h = `<div class="sec-head"><button class="btn sm" data-act="trfback">← Cuentas</button><b>Transferencias</b><button class="btn sm primary" data-act="trfnew">+</button></div>
    <div class="mv-card"><div class="mv-modes">${[["dia","Día"],["semana","Semana"],["mes","Mes"],["ano","Año"],["periodo","Período"]].map(([v,l])=>`<button data-act="mvmode" data-v="${v}" aria-pressed="${mode===v}">${l}</button>`).join("")}</div>
    <div class="mv-nav">${mode!=="periodo"?`<button class="btn sm" data-act="mvprev" aria-label="Anterior">‹</button>`:"<span></span>"}<button class="linkbtn mv-label" data-act="mvpick">${esc(r.label)}</button>${mode!=="periodo"?`<button class="btn sm" data-act="mvnext" aria-label="Siguiente">›</button>`:"<span></span>"}</div></div>`;
  if (S.mvPicking) h += mvPickHTML(mode);
  if (S.trfEdit) h += trfForm(S.trfEdit);
  h += Object.entries(byDay).map(([d,arr])=>`<div class="mday"><div class="mday-h"><span>${dLong(d)}</span></div>` + arr.map(x=>
    `<button class="tr-row" data-act="trfedit" data-id="${esc(x.id)}" data-f="${esc(x.f)}"><span class="tr-arrow">↓</span><span><span>${esc(x.de)}</span><br><span class="sub">${esc(x.a)}</span>${x.n?`<br><span class="sub">${esc(x.n)}</span>`:""}</span><span class="num">${fmt(x.m)}</span></button>`).join("") + `</div>`).join("")
    || `<p class="empty">Sin transferencias en este periodo. Las anteriores al ${dLong(BASE_CTAS)} siguen en tu app.</p>`;
  $("cuentas").innerHTML = h;
}
async function writeTrfMonth(ym, items){ await db.doc("trf/"+ym).set({items}); }
const trfMonth = ym => ((S.trfDb||{})[ym]?.items||[]).map(x=>({...x}));

/* ================= Gráficos ================= */
function grBuckets(p){
  const b = [];
  if (p==="ano"){ const y0 = +allMonths()[0].slice(0,4); for (let y=y0; y<=today.getFullYear(); y++) b.push({k:String(y), from:`${y}-01-01`, to:`${y}-12-31`, l:String(y)}); }
  if (p==="mes"){ for (let k=11;k>=0;k--){ const ym=ymAdd(curYM,-k); b.push({k:ym, from:ym+"-01", to:ym+"-31", l:MES[+ym.slice(5)-1]}); } }
  if (p==="semana"){ const a=new Date(today); a.setDate(a.getDate()-((a.getDay()+6)%7)); for (let k=11;k>=0;k--){ const s=new Date(a); s.setDate(a.getDate()-7*k); const e=new Date(s); e.setDate(s.getDate()+6); b.push({k:iso(s), from:iso(s), to:iso(e), l:`${s.getDate()}/${s.getMonth()+1}`}); } }
  if (p==="dia"){ for (let k=13;k>=0;k--){ const s=new Date(today); s.setDate(today.getDate()-k); b.push({k:iso(s), from:iso(s), to:iso(s), l:`${s.getDate()}`}); } }
  const all = itemsRange(b[0].from, b[b.length-1].to);
  b.forEach(x=>{ x.g={}; x.i={}; x.G=0; x.I=0; all.forEach(m=>{ if (m.f>=x.from && m.f<=x.to){ const o = m.t==="i"?x.i:x.g; o[m.cat]=(o[m.cat]||0)+m.m; if (m.t==="i") x.I+=m.m; else x.G+=m.m; } }); });
  return b;
}
function renderGraficos(){
  const box = $("graficos"); if (!box) return;
  if (!HIST.loaded){ box.innerHTML = `<p class="empty">Cargando…</p>`; return; }
  const T = S.grT||"general", P = S.grP||"ano", B = grBuckets(P);
  const sel = S.grSel!=null && S.grSel<B.length ? S.grSel : B.length-1;
  const COL = {I:"#5fa88a", G:"#e6b800", ben:"#4d8cf0", per:"#ff7a3a"};
  const W = 44, H = 180, padB = 22, n = B.length, width = Math.max(320, n*W+10);
  let max = 1;
  B.forEach(x=>{ max = Math.max(max, T==="general" ? Math.max(x.I,x.G) : T==="g" ? x.G : x.I); });
  const y = v => H - padB - (v/max)*(H-padB-14);
  let bars = "";
  B.forEach((x,k)=>{
    const x0 = 6 + k*W, on = k===sel;
    bars += `<g class="gb${on?" on":""}" data-act="grsel" data-i="${k}" role="button" tabindex="0" aria-label="${esc(x.l)}"><rect x="${x0}" y="0" width="${W-4}" height="${H}" fill="transparent"/>`;
    if (T==="general"){
      const net = x.I - x.G, bw = (W-10)/3;
      [[x.I,COL.I],[x.G,COL.G],[Math.abs(net), net>=0?COL.ben:COL.per]].forEach(([v,c],j)=>{ if (v>0) bars += `<rect x="${x0+2+j*bw}" y="${y(v)}" width="${bw-1}" height="${H-padB-y(v)}" fill="${c}" rx="1.5"/>`; });
    } else {
      const o = T==="g" ? x.g : x.i; let acc = 0;
      Object.entries(o).sort((a,b)=>b[1]-a[1]).forEach(([c,v])=>{ const top = y(acc+v), bot = y(acc); bars += `<rect x="${x0+6}" y="${top}" width="${W-16}" height="${Math.max(0,bot-top)}" fill="${catColor(c,T)}"/>`; acc += v; });
    }
    bars += `<text x="${x0+(W-4)/2}" y="${H-6}" text-anchor="middle" class="gl">${esc(x.l)}</text></g>`;
  });
  const s = B[sel], tipV = T==="general" ? s.I - s.G : T==="g" ? s.G : s.I;
  const xs = 6 + sel*W + (W-4)/2;
  const tip = `<g class="gtip"><rect x="${Math.min(width-96, Math.max(2, xs-46))}" y="2" width="92" height="20" rx="4"/><text x="${Math.min(width-50, Math.max(48, xs))}" y="16" text-anchor="middle">${fmt0(tipV)}</text></g>`;
  let h = `<div class="mv-tabs" role="tablist">${[["general","General"],["g","Gastos"],["i","Ingresos"]].map(([v,l])=>`<button role="tab" data-act="grt" data-v="${v}" aria-selected="${T===v}">${l}</button>`).join("")}</div>
    <div class="mv-card"><div class="mv-modes">${[["ano","por año"],["mes","por mes"],["semana","por semana"],["dia","por día"]].map(([v,l])=>`<button data-act="grp" data-v="${v}" aria-pressed="${P===v}">${l}</button>`).join("")}</div>
    <div class="gscroll" id="gscroll"><svg width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" class="gsvg" role="img" aria-label="Gráfica ${esc(VIEW_NAMES.graficos)}">
      <line x1="0" x2="${width}" y1="${H-padB}" y2="${H-padB}" class="gax"/>${bars}${tip}</svg></div>
    ${T==="general"?`<div class="cal-leg sub"><span><i class="lg" style="background:${COL.I};border:0"></i> ingresos</span><span><i class="lg" style="background:${COL.G};border:0"></i> gastos</span><span><i class="lg" style="background:${COL.ben};border:0"></i> beneficio</span><span><i class="lg" style="background:${COL.per};border:0"></i> pérdida</span></div>`:""}</div>`;
  const label = P==="mes" ? ymLabel(s.k) : P==="semana" ? `Semana del ${dShort(s.from)}` : P==="dia" ? dLong(s.k) : s.k;
  const list = (o,t)=>{ const tot = Object.values(o).reduce((a,v)=>a+v,0); return Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([c,v])=>{ const ic=catIcon(c,t);
    return `<div class="mv-catw"><div class="mv-cat"><span class="mv-ic" style="background:${catColor(c,t)}">${ic?icHTML(ic[0]):esc(c[0])}</span><span class="mv-cn">${esc(c)}</span><span class="mv-pc">${Math.round(v/tot*100)} %</span><span class="mv-am num">${fmt(v).replace("$","")} $</span></div></div>`; }).join("") || '<p class="empty">Sin registros.</p>'; };
  h += `<div class="sec-head"><b>${esc(label)}</b><span class="sub num">Ingresos ${fmt0(s.I)} · Gastos ${fmt0(s.G)}</span></div>`;
  if (T==="general") h += `<b class="sub">Ingresos</b><div class="mv-list">${list(s.i,"i")}</div><b class="sub">Gastos</b><div class="mv-list">${list(s.g,"g")}</div>`;
  else h += `<div class="mv-list">${list(T==="g"?s.g:s.i, T)}</div>`;
  box.innerHTML = h;
  const sc = $("gscroll"); if (sc && S.grScrollEnd!==false){ sc.scrollLeft = sc.scrollWidth; S.grScrollEnd=false; }
}

/* ================= Categorías ================= */
function renderCategorias(){
  const box = $("categorias"); if (!box) return;
  const t = S.ctT||"g", cats = catList(t);
  let h = `<div class="mv-tabs" role="tablist"><button role="tab" data-act="ctt" data-v="g" aria-selected="${t==="g"}">Gastos</button><button role="tab" data-act="ctt" data-v="i" aria-selected="${t==="i"}">Ingresos</button></div>`;
  if (S.catEdit) h += `<form class="f mform" data-form="cat"><label class="full" for="cg-n">Nombre<input id="cg-n" required maxlength="40" value="${esc(S.catEdit.n||"")}" ${S.catEdit.nuevo?"":"readonly"}></label>
    <div class="full cg-prev"><span class="cat-ic big" style="background:${esc(S.catEdit.c||"#4d8cf0")}">${icHTML(S.catEdit.e, (S.catEdit.n||"?")[0])}</span>
      <input type="hidden" id="cg-e" value="${esc(S.catEdit.e||"")}"><label for="cg-c">Color<input id="cg-c" type="color" value="${esc(S.catEdit.c||"#4d8cf0")}"></label></div>
    <div class="full cg-pal">${CG_PAL.map(c=>`<button type="button" class="cg-sw${S.catEdit.c===c?" on":""}" style="background:${c}" data-act="catcol" data-v="${c}" aria-label="Color ${c}"></button>`).join("")}</div>
    <div class="full cg-cat"><label for="cg-q"><span class="sub">Catálogo de íconos</span><input id="cg-q" type="search" placeholder="Buscar (comida, carro, dinero…)" value="${esc(S.catQ||"")}"></label>${catalogHTML(S.catQ, S.catEdit.e)}</div>
    ${S.catEdit.nuevo?"":`<p class="full sub" style="margin:0">El nombre de una categoría con historial no se cambia aquí para no separar tus registros.</p>`}
    <div class="actions full"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-act="catcancel">Cancelar</button></div></form>`;
  h += `<div class="cat-grid">` + cats.map(c=>{ const ic=catIcon(c,t); return `<button class="cat-cell" data-act="catedit" data-c="${esc(c)}"><span class="cat-ic" style="background:${catColor(c,t)}">${ic?icHTML(ic[0]):esc(c[0])}</span><span class="cat-n">${esc(c)}</span></button>`; }).join("") +
    `<button class="cat-cell" data-act="catnew"><span class="cat-ic" style="background:#f8c11c;color:#15171c">+</span><span class="cat-n">Crear</span></button></div>`;
  box.innerHTML = h;
}

const CG_PAL = ["#e53935","#ff7043","#ffb300","#fdd835","#c0ca33","#7cb342","#43a047","#17c252","#26a69a","#00acc1","#29b6f6","#1e88e5","#3949ab","#5e35b1","#8e24aa","#d81b60","#ec407a","#8d6e63","#78909c","#546e7a","#2a3ae0","#9a20e0","#e6b800","#5cc8c4"];
let TI_ALL = null;
function tiAll(){ if (TI_ALL) return TI_ALL; const s = new Set();
  try { for (const sh of document.styleSheets){ let rules; try { rules = sh.cssRules; } catch(e){ continue; } for (const r of rules||[]){ const m = r.selectorText && r.selectorText.match(/^\.ti-([a-z0-9-]+)::?before$/); if (m) s.add(m[1]); } } } catch(e){}
  return TI_ALL = [...s]; }
function catalogHTML(q, sel){
  const btn = n => `<button type="button" class="cg-ic${sel==="ti-"+n?" on":""}" data-act="catico" data-v="ti-${n}" aria-label="${n}"><i class="ti ti-${n}" aria-hidden="true"></i></button>`;
  q = (q||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  if (q){ const terms = [q, ...Object.entries(TI_ES).filter(([k])=>k.startsWith(q)||q.startsWith(k)).flatMap(([,v])=>v.split(" "))];
    const all = tiAll().length ? tiAll() : Object.values(TI_CATALOGO).flat();
    const score = n => Math.min(...terms.map(t=>{ const seg = n.split("-"); return n===t?0 : seg[0]===t?1 : seg.includes(t)?2 : n.includes(t)?4 : 9; })) + (/^(brand|currency)-/.test(n)?3:0);
    const res = all.map(n=>[n,score(n)]).filter(([,v])=>v<9).sort((x,y)=>x[1]-y[1]||x[0].length-y[0].length).map(([n])=>n).slice(0,120);
    return res.length ? `<div class="cg-grid">${res.map(btn).join("")}</div>` : `<p class="sub">Sin resultados. Prueba otra palabra.</p>`; }
  return Object.entries(TI_CATALOGO).map(([sec, l])=>`<div class="cg-sec">${esc(sec)}</div><div class="cg-grid">${l.map(btn).join("")}</div>`).join("");
}

/* ================= Eventos ================= */
document.addEventListener("click", async e=>{
  const nav = e.target.closest("[data-nav]"); if (nav && !$("drawer").hidden) openDrawer(false);
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  const mine = ["drawer","drawerclose","theme","trfhist","trfback","trfnew","trfedit","trfcancel","trfdel","ctaedit","ctax","ctaled","ctaubi","ctadelmove","ctadelno","ctanew","ctacancel","ctadel","ctaup","ctadown","grt","grp","grsel","ctt","catedit","catnew","catcancel","catico","catcol"];
  if (!mine.includes(act)) return;
  e.stopImmediatePropagation();
  const i = a.dataset.i!=null ? +a.dataset.i : null;
  switch(act){
    case "drawer": openDrawer(true); return;
    case "drawerclose": openDrawer(false); return;
    case "theme": { const t = {light:"verde", verde:"dark", dark:"light"}[S.theme] || "verde"; S.theme=t; applyTheme(t); try{ localStorage.setItem("mf-theme",t); }catch(err){} return; }
    case "trfhist": S.trfView=true; S.trfEdit=null; S.mvPicking=false; renderCuentas(); return;
    case "trfback": S.trfView=false; S.trfEdit=null; S.mvPicking=false; renderCuentas(); return;
    case "trfnew": S.trfConfirm=false; S.trfEdit={nuevo:true,f:todayISO}; renderCuentas(); $("tr-de")?.focus(); return;
    case "trfedit": { S.trfConfirm=false; const x = trfMonth(a.dataset.f.slice(0,7)).find(y=>y.id===a.dataset.id); S.trfEdit={...x}; renderCuentas(); return; }
    case "trfcancel": S.trfEdit=null; renderCuentas(); return;
    case "trfdel": { if (!S.trfConfirm){ S.trfConfirm=true; renderCuentas(); return; }
      const x=S.trfEdit, ym=x.f.slice(0,7); if (db) await save(async()=>{ await toTrash({tipo:"trf", ym, data:{...x}}); await writeTrfMonth(ym, trfMonth(ym).filter(y=>y.id!==x.id)); });
      S.trfEdit=null; S.trfConfirm=false; return; }
    case "ctaubi": S.ctaUbi=!S.ctaUbi; S.ctaEdit=null; renderCuentas(); return;
    case "ctaled": S.ctaLed=!S.ctaLed; renderCuentas(); return;
    case "ctax": S.ctaSel=null; S.ctaEdit={...S.ctas.list[i], i}; S.ctaConfirm=true; S.ctaDelIn=true; renderCuentas(); return;
    case "ctaedit": if (!a.dataset.go && S.ctaSel!==i){ S.ctaSel=i; S.ctaDelIn=false; S.ctaEdit=null; renderCuentas(); return; }
      S.ctaSel=null; S.ctaDelIn=false; S.ctaConfirm=false; S.ctaLed=false; S.ctaScroll=true; S.ctaEdit={...S.ctas.list[i], i}; renderCuentas(); return;
    case "ctanew": S.ctaEdit={nuevo:true,n:"",s:0,t:false}; renderCuentas(); return;
    case "ctacancel": S.ctaEdit=null; renderCuentas(); return;
    case "ctaup": case "ctadown": { const l=S.ctas.list.map(x=>({...x})), k=S.ctaEdit.i, j=act==="ctaup"?k-1:k+1; if (j<0||j>=l.length) return; [l[k],l[j]]=[l[j],l[k]]; S.ctaEdit.i=j; if (db) await save(()=>db.doc("config/cuentas").set({...S.ctas, list:l})); return; }
    case "ctadel": { if (!S.ctaConfirm){ S.ctaConfirm=true; renderCuentas(); return; }
      await ctaBorrar(S.ctaEdit, null); return; }
    case "ctadelmove": { const dest = $("ctd-dest")?.value; if (!dest){ $("ctd-dest")?.focus(); return; } await ctaBorrar(S.ctaEdit, dest); return; }
    case "ctadelno": S.ctaConfirm=false; if (S.ctaDelIn){ S.ctaDelIn=false; S.ctaEdit=null; } renderCuentas(); return;
    case "grt": S.grT=a.dataset.v; renderGraficos(); return;
    case "grp": S.grP=a.dataset.v; S.grSel=null; S.grScrollEnd=true; renderGraficos(); return;
    case "grsel": S.grSel=i; { const sc=$("gscroll"), keep=sc?sc.scrollLeft:0; renderGraficos(); const sc2=$("gscroll"); if (sc2) sc2.scrollLeft=keep; } return;
    case "ctt": S.ctT=a.dataset.v; S.catEdit=null; renderCategorias(); return;
    case "catedit": { const c=a.dataset.c, ic=catIcon(c,S.ctT||"g"); S.catEdit={n:c, e:ic?ic[0]:"", c:catColor(c,S.ctT||"g")}; renderCategorias(); window.scrollTo(0,0); return; }
    case "catnew": S.catEdit={nuevo:true,n:"",e:"ti-tag",c:"#4d8cf0"}; S.catQ=""; renderCategorias(); window.scrollTo(0,0); return;
    case "catcancel": S.catEdit=null; renderCategorias(); return;
    case "catico": case "catcol": { const n = $("cg-n")?.value; if (n!=null) S.catEdit.n = n; const co = $("cg-c")?.value; if (co) S.catEdit.c = co;
      if (act==="catico") S.catEdit.e = a.dataset.v; else S.catEdit.c = a.dataset.v; const y = window.scrollY; renderCategorias(); window.scrollTo(0,y); return; }
  }
}, true);
document.addEventListener("input", e=>{ if (e.target.id==="cg-q"){ S.catQ = e.target.value; clearTimeout(S._cq); S._cq = setTimeout(()=>{ const n=$("cg-n")?.value; if (n!=null && S.catEdit) S.catEdit.n=n; const co=$("cg-c")?.value; if (co && S.catEdit) S.catEdit.c=co; const y=window.scrollY; renderCategorias(); window.scrollTo(0,y); const q=$("cg-q"); if(q){ q.focus(); q.setSelectionRange(q.value.length,q.value.length);} },250); } });
document.addEventListener("keydown", e=>{
  if (e.key==="Escape" && !$("drawer").hidden){ openDrawer(false); }
  if ((e.key==="Enter"||e.key===" ") && e.target.matches("g.gb")){ e.preventDefault(); S.grSel=+e.target.dataset.i; renderGraficos(); }
});
document.addEventListener("submit", async e=>{
  const k = e.target.dataset.form; if (!["trf","cta","cat"].includes(k)) return;
  e.preventDefault(); e.stopImmediatePropagation(); if (!db) return;
  if (k==="trf"){
    const x=S.trfEdit, it={id: x.nuevo ? "t"+Date.now().toString(36)+Math.random().toString(36).slice(2,5) : x.id, de:$("tr-de").value.trim(), a:$("tr-a").value.trim(), m:Math.round(parseFloat($("tr-m").value)*100)/100, f:$("tr-f").value, n:$("tr-n").value.trim()};
    if (!it.de || !it.a || !(it.m>0) || !it.f || it.de===it.a) return;
    const ymNew=it.f.slice(0,7), ymOld = x.nuevo ? null : x.f.slice(0,7);
    await save(async()=>{ if (ymOld && ymOld!==ymNew) await writeTrfMonth(ymOld, trfMonth(ymOld).filter(y=>y.id!==it.id)); await writeTrfMonth(ymNew, [...trfMonth(ymNew).filter(y=>y.id!==it.id), it].sort((a,b)=>a.f.localeCompare(b.f))); });
    S.trfEdit=null; renderCuentas(); return;
  }
  if (k==="cta"){
    const x=S.ctaEdit, l=((S.ctas?.list)||[]).map(y=>({...y}));
    const n=$("ct-n").value.trim(), deseado=parseFloat($("ct-s").value||"0"), t=$("ct-t").checked; if (!n) return;
    const en=$("ct-en")?$("ct-en").value:undefined;
    if (x.nuevo) l.push({n, s:deseado||0, t, ...(en!=null?{en}:{})});
    else { const old=l[x.i]; const actual=ctaSaldo(old); l[x.i]={...old, n, t, s:Math.round(((+old.s||0)+(deseado-actual))*100)/100}; if (en!=null) l[x.i].en=en; if (n!==old.n) l[x.i].alias=[...new Set([...(old.alias||[]), old.n])]; }
    await save(()=>db.doc("config/cuentas").set({...(S.ctas||{}), list:l})); S.ctaEdit=null; renderCuentas(); return;
  }
  if (k==="cat"){
    const t=S.ctT||"g", n=$("cg-n").value.trim(), em=$("cg-e").value.trim(), co=$("cg-c").value; if (!n) return;
    const cfg = JSON.parse(JSON.stringify(S.catCfg||{g:{},i:{},nuevas:{g:[],i:[]}}));
    cfg[t]=cfg[t]||{}; cfg[t][n]=[em||n[0],co]; cfg.nuevas=cfg.nuevas||{g:[],i:[]}; cfg.nuevas[t]=cfg.nuevas[t]||[];
    if (S.catEdit.nuevo && !catList(t).includes(n)) cfg.nuevas[t].push(n);
    await save(()=>db.doc("config/cats").set(cfg)); S.catEdit=null; renderCategorias(); return;
  }
}, true);

/* ---- Tarjetas de débito ligadas a Cuentas ---- */
function tddNorm(t){ return String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); }
function tddAuto(c, x){
  const nm = tddNorm(cname(c)+" "+(c.banco||"")), n = tddNorm(x.n);
  if (/mercado ?pago|\bmp\b/.test(nm)) return /^mp\b|mercado ?pago/.test(n);
  if (/open ?bank/.test(nm)) return /^open ?bank|^open\b/.test(n);
  const w = (nm.match(/[a-z]{3,}/g)||[]).filter(t=>!["tarjeta","debito","cuenta","nomina","card"].includes(t))[0];
  return !!w && new RegExp("\\b"+w+"\\b").test(n) && !/deuda/.test(n);
}
function tddCards(){ return S.cards.filter(c=>c.tipo!=="TDC").sort((a,b)=>(a.orden||0)-(b.orden||0)); }
function ctaEn(x){
  if (x.en!=null) return x.en;
  if (/efectivo/i.test(x.n||"")) return "efectivo";
  const cs = tddCards();
  const ex = cs.find(c=>Array.isArray(c.ctas) && c.ctas.includes(x.n)); if (ex) return ex.id;
  const au = cs.find(c=>!Array.isArray(c.ctas) && tddAuto(c, x)); return au ? au.id : "";
}
function ctaEnName(en){ if (en==="efectivo") return "Efectivo"; const c = en && card(en); return c ? cname(c) : "Sin asignar"; }
function ctaEnOpts(sel){ return `<option value=""${!sel?" selected":""}>Sin asignar</option><option value="efectivo"${sel==="efectivo"?" selected":""}>💵 Efectivo</option>${tddCards().map(c=>`<option value="${esc(c.id)}"${sel===c.id?" selected":""}>💳 ${esc(cname(c))}</option>`).join("")}`; }
function tddCtas(c){
  const list = (S.ctas?.list)||[]; if (!list.length || c.tipo==="TDC") return [];
  return list.filter(x=>ctaEn(x)===c.id);
}
function tddSaldo(c, todas){ const l = tddCtas(c); return l.length ? Math.round(l.reduce((a,x)=>a+((todas||x.t)?ctaSaldo(x):0),0)*100)/100 : (c.saldo!=null ? +c.saldo : null); }
function tddLinkHTML(c){
  if (!((S.ctas?.list)||[]).length) return "";
  const l = tddCtas(c);
  return `<div class="full sub">El saldo de esta tarjeta es la suma de las cuentas que le asignes en <b>Cuentas → 📍 Ubicar cuentas</b>${l.length?` (ahora: ${l.length} cuenta${l.length>1?"s":""}, ${fmt(tddSaldo(c))})`:""}.</div>`;
}
function tddCtasHTML(c){
  const l = tddCtas(c); if (!l.length) return "";
  return `<div><div class="sec-head"><b>Cuentas</b><span class="sub num">${fmt(tddSaldo(c))} suman al total${Math.abs(tddSaldo(c,true)-tddSaldo(c))>=0.005?` · con ⊘: ${fmt(tddSaldo(c,true))}`:""}</span></div>
    <table class="num"><tbody>${l.filter(x=>Math.abs(ctaSaldo(x))>=0.005).map(x=>`<tr><td>${esc(x.n)}${x.t?"":' <span class="sub" title="No suma al total">⊘</span>'}</td><td>${fmt(ctaSaldo(x))}</td></tr>`).join("")}</tbody></table>${l.some(x=>Math.abs(ctaSaldo(x))<0.005)?`<div class="sub">${l.filter(x=>Math.abs(ctaSaldo(x))<0.005).length} cuentas más en $0.00</div>`:""}</div>`;
}

/* ---- Historial por cuenta ---- */
function ctaLedger(c){
  const rows = [], es = ctaIs(c);
  allMonths().forEach(ym=>{ if (ym < BASE_CTAS.slice(0,7)) return; monthItems(ym).forEach(x=>{ if (x.f>BASE_CTAS && es(x.cta) && !x.tdc) rows.push({f:x.f, d:(x.n||x.cat)+(x.n?` · ${x.cat}`:""), m: x.t==="i" ? +x.m : -x.m, k:x.t==="i"?"Ingreso":"Gasto"}); }); });
  S.periods.forEach(p=>(p.pagos||[]).forEach(g=>{ if (g.f>BASE_CTAS && es(g.cta)) rows.push({f:g.f, d:"Pago "+cname(card(p.card)||{nombre:p.card})+` (vence ${dShort(p.due)})`, m:-(+g.m||0), k:"Pago TDC"}); }));
  trfItems().forEach(x=>{ if (x.f>BASE_CTAS){ if (es(x.de)) rows.push({f:x.f, d:"Transferencia a "+x.a, m:-x.m, k:"Transferencia"}); if (es(x.a)) rows.push({f:x.f, d:"Transferencia de "+x.de, m:+x.m, k:"Transferencia"}); } });
  rows.sort((a,b)=>a.f.localeCompare(b.f)); let s = +c.s||0; rows.forEach(r=>{ s = Math.round((s+r.m)*100)/100; r.s = s; });
  return rows;
}
function ctaLedgerHTML(c){
  const rows = ctaLedger(c), lim = (()=>{ const d=parseD(todayISO); d.setDate(d.getDate()-45); return iso(d); })();
  const fuera = [];
  allMonths().slice(-3).forEach(ym=>monthItems(ym).forEach(x=>{ if (x.cta===c.n && !x.tdc && x.f<=BASE_CTAS && x.f>=lim) fuera.push(x); }));
  S.periods.forEach(p=>(p.pagos||[]).forEach(g=>{ if (g.cta===c.n && g.f<=BASE_CTAS && g.f>=lim) fuera.push({f:g.f, n:"Pago "+cname(card(p.card)||{nombre:p.card}), m:g.m}); }));
  const sinPago = S.periods.filter(p=>p.status==="pagado" && !(p.pagos||[]).length && p.due>=lim);
  let h = `<div class="panel led"><div class="sec-head"><b>Movimientos de ${esc(c.n)}</b><span class="sub">desde el ${dLong(BASE_CTAS)}</span></div>
    <table class="xt num"><tbody><tr><td class="d">${dShort(BASE_CTAS)}</td><td>Saldo inicial</td><td class="n"></td><td class="n"><b>${fmt(+c.s||0)}</b></td></tr>
    ${rows.map(r=>`<tr><td class="d">${dShort(r.f)}</td><td>${esc(r.d)} <span class="sub">· ${r.k}</span></td><td class="n" style="color:${r.m<0?"var(--bad)":"var(--ok)"}">${r.m<0?"−":"+"}${fmt(Math.abs(r.m))}</td><td class="n">${fmt(r.s)}</td></tr>`).join("")}
    </tbody></table>${rows.length?"":'<p class="sub">Ningún movimiento ha tocado esta cuenta desde esa fecha.</p>'}`;
  if (fuera.length) h += `<div class="tx-warn">⚠️ Estos movimientos usan esta cuenta pero tienen fecha del ${dLong(BASE_CTAS)} o antes, así que <b>no se descuentan</b> (se asume que ya estaban en el saldo inicial):<ul>${fuera.map(x=>`<li>${dShort(x.f)} · ${esc(x.n||x.cat)} · ${fmt(+x.m)}</li>`).join("")}</ul></div>`;
  if (sinPago.length) h += `<div class="tx-warn">ℹ️ Estados de cuenta marcados como pagados <b>sin registrar de qué cuenta salió el dinero</b> (no descuentan de ninguna cuenta):<ul>${sinPago.map(p=>`<li>${esc(cname(card(p.card)||{nombre:p.card}))} · vence ${dShort(p.due)} · ${fmt(total(p))}</li>`).join("")}</ul>Ábrelos en la Wallet y usa 💸 Registrar pago.</div>`;
  return h + `</div>`;
}

document.addEventListener("change", async e=>{
  const t = e.target.closest?.("[data-ctaen]"); if (!t || !S.ctas) return;
  const l = S.ctas.list.map(x=>({...x})); l[+t.dataset.ctaen].en = t.value; S.ctas = {...S.ctas, list:l}; renderCuentas();
  if (db) await save(()=>db.doc("config/cuentas").set({...S.ctas, list:l}));
});

/* El historial de transferencias comparte la navegación de fechas con Inicio: refrescarlo también */
{ const rm = renderMovs; renderMovs = function(){ rm(); if (S.trfView && $("cuentas")) renderTrfHist(); }; }

/* ---- Eliminar cuenta sin perder registros ---- */
function ctaDelHTML(x){
  const c = S.ctas.list[x.i]; if (!c) return "";
  const v = ctaSaldo(c), otras = S.ctas.list.filter((_,k)=>k!==x.i);
  let h = `<div class="full ctd"><p class="ctd-info">🛈 Borrar esta cuenta <b>no eliminará</b> los gastos, ingresos, transferencias ni pagos ya registrados con ella: conservan su nombre y siguen en tu historial. Si te equivocas, la restauras desde la Papelera (al final de esta pantalla).</p>`;
  if (Math.abs(v) >= 0.005){
    h += `<div class="tx-warn" role="alert">⚠️ <b>${esc(c.n)}</b> tiene <b class="num">${fmt(v)}</b>. Si la borras así, ese dinero dejaría de contarse. ¿Lo mueves a otra cuenta antes?
      <label for="ctd-dest" style="display:block;margin-top:8px">Mover ${v<0?"(cubrir el negativo) desde":"a"}<select id="ctd-dest"><option value="">Elige una cuenta…</option>${otras.map(o=>`<option value="${esc(o.n)}">${esc(o.n)} · ${fmt(ctaSaldo(o))}</option>`).join("")}</select></label>
      <div class="actions"><button type="button" class="btn sm primary" data-act="ctadelmove">Mover ${fmt(Math.abs(v))} y eliminar</button><button type="button" class="btn sm" data-act="ctadelno">No eliminar</button></div>
      <p class="sub" style="margin:6px 0 0">Si el saldo está mal y en realidad es $0, corrige “Saldo actual” arriba y guarda antes de eliminar.</p></div>`;
  } else h += `<div class="actions"><button type="button" class="btn sm danger" data-act="ctadel">Sí, eliminar</button><button type="button" class="btn sm" data-act="ctadelno">No eliminar</button></div>`;
  return h + `</div>`;
}
async function ctaBorrar(x, dest){
  const c = S.ctas.list[x.i]; if (!c || !db) return;
  const v = ctaSaldo(c);
  if (Math.abs(v) >= 0.005 && !dest) { renderCuentas(); return; }
  const l = S.ctas.list.filter((_,k)=>k!==x.i).map(o=>({...o}));
  await save(async()=>{
    if (dest && Math.abs(v) >= 0.005){
      const ym = todayISO.slice(0,7), it = {id:"t"+Date.now().toString(36)+Math.random().toString(36).slice(2,5), de: v>0?c.n:dest, a: v>0?dest:c.n, m: Math.round(Math.abs(v)*100)/100, f: todayISO, n: "Saldo al eliminar la cuenta "+c.n};
      await writeTrfMonth(ym, [...trfMonth(ym), it].sort((a,b)=>a.f.localeCompare(b.f)));
    }
    await toTrash({tipo:"cta", i:x.i, data:{...c}});
    await db.doc("config/cuentas").set({...S.ctas, list:l});
  });
  S.ctaEdit = null; S.ctaConfirm = false; S.ctaDelIn = false; renderCuentas();
}

/* ---- Arrastrar cuentas (mantener presionado) ---- */
function ctaMoveHTML(){
  const m = S.ctaMove, c = S.ctas.list[m.from]; if (!c) return "";
  return `<div class="tx-warn ct-mv" role="alert">↔️ Moviste <b>${esc(c.n)}</b> de <b>${esc(ctaEnName(m.de))}</b> a <b>${esc(ctaEnName(m.a))}</b>. ¿Quieres cambiarla de tarjeta?
    <div class="actions"><button type="button" class="btn sm primary" data-act="ctamvok">Sí, cambiar a ${esc(ctaEnName(m.a))}</button><button type="button" class="btn sm" data-act="ctamvno">No, dejarla donde estaba</button></div></div>`;
}
async function ctaReorder(from, toIdx, en){
  const l = S.ctas.list.map(x=>({...x})), [it] = l.splice(from,1);
  if (en!==undefined) it.en = en;
  l.splice(toIdx > from ? toIdx-1 : toIdx, 0, it);
  S.ctas = {...S.ctas, list:l}; renderCuentas(); updAb();
  if (db) await save(()=>db.doc("config/cuentas").set({...S.ctas, list:l}));
}
{
  const D = {t:null, on:false, row:null, ghost:null, x0:0, y0:0, dy:0, tgt:null, raf:0, sup:false};
  const clear = ()=>{ document.querySelectorAll(".ct-row.drop-b,.ct-row.drop-a,.ct-grp.drop-g").forEach(e=>e.classList.remove("drop-b","drop-a","drop-g")); };
  const end = ()=>{ clearTimeout(D.t); D.t=null; cancelAnimationFrame(D.raf); if (D.ghost) D.ghost.remove(); if (D.row) D.row.classList.remove("dragging"); clear(); D.on=false; D.ghost=null; D.row=null; document.body.classList.remove("ct-dragging"); };
  const findTarget = (x,y)=>{
    if (D.ghost) D.ghost.style.display="none"; const el = document.elementFromPoint(x,y); if (D.ghost) D.ghost.style.display="";
    const r = el?.closest?.("#cuentas .ct-row"); clear();
    if (r && r!==D.row){ const b=r.getBoundingClientRect(), after = y > b.top+b.height/2; r.classList.add(after?"drop-a":"drop-b"); return {i:+r.dataset.i, after, g:r.closest(".ct-grp")?.dataset.g ?? ""}; }
    const g = el?.closest?.("#cuentas .ct-grp"); if (g){ g.classList.add("drop-g"); return {g:g.dataset.g, i:null}; }
    return null;
  };
  const scrollLoop = ()=>{ if (!D.on) return; const m=60; if (D.cy < m) scrollBy(0,-12); else if (D.cy > innerHeight-m) scrollBy(0,12); D.raf = requestAnimationFrame(scrollLoop); };
  document.addEventListener("pointerdown", e=>{
    const r = e.target.closest?.("#cuentas .ct-row[data-i]"); if (!r || S.ctaUbi || S.trfView || e.button>0) return;
    D.x0=e.clientX; D.y0=e.clientY; D.cy=e.clientY;
    D.t = setTimeout(()=>{ D.t=null; D.on=true; D.row=r; const b=r.getBoundingClientRect(); D.dy=D.y0-b.top;
      D.ghost = r.cloneNode(true); D.ghost.classList.add("ct-ghost"); Object.assign(D.ghost.style,{left:b.left+"px",top:b.top+"px",width:b.width+"px"}); document.body.appendChild(D.ghost);
      r.classList.add("dragging"); document.body.classList.add("ct-dragging"); try{ navigator.vibrate?.(15); }catch(_){}
      try{ r.setPointerCapture?.(e.pointerId); }catch(_){}
      scrollLoop(); }, 450);
  });
  document.addEventListener("pointermove", e=>{
    if (D.t && Math.hypot(e.clientX-D.x0, e.clientY-D.y0) > 8){ clearTimeout(D.t); D.t=null; return; }
    if (!D.on) return; e.preventDefault(); D.cy=e.clientY;
    D.ghost.style.top = (e.clientY - D.dy)+"px"; D.tgt = findTarget(e.clientX, e.clientY);
  }, {passive:false});
  document.addEventListener("touchmove", e=>{ if (D.on) e.preventDefault(); }, {passive:false});
  const up = async e=>{
    if (D.t){ clearTimeout(D.t); D.t=null; return; }
    if (!D.on) return; const from = +D.row.dataset.i, tg = D.tgt; end(); D.sup = true; setTimeout(()=>D.sup=false, 350);
    if (!tg) return; const list = S.ctas.list, c = list[from], de = ctaEn(c);
    let to;
    if (tg.i==null){ const idx = list.map((x,k)=>k).filter(k=>ctaEn(list[k])===tg.g); to = idx.length ? idx[idx.length-1]+1 : list.length; }
    else to = tg.i + (tg.after?1:0);
    if (to===from || to===from+1){ if (tg.g===de) return; }
    if (tg.g!==de){ S.ctaMove = {from, to, de, a:tg.g}; renderCuentas(); document.querySelector(".ct-mv")?.scrollIntoView({block:"center", behavior:"smooth"}); return; }
    await ctaReorder(from, to);
  };
  document.addEventListener("pointerup", up); document.addEventListener("pointercancel", ()=>{ if (D.t){ clearTimeout(D.t); D.t=null; } if (D.on) end(); });
  document.addEventListener("click", e=>{ if (D.sup && e.target.closest?.("#cuentas .ct-row")){ e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  document.addEventListener("contextmenu", e=>{ if (e.target.closest?.("#cuentas .ct-row")) e.preventDefault(); });
  document.addEventListener("click", async e=>{
    const a = e.target.closest?.("[data-act=ctamvok],[data-act=ctamvno]"); if (!a) return; e.stopImmediatePropagation();
    const m = S.ctaMove; S.ctaMove = null;
    if (a.dataset.act==="ctamvok" && m) await ctaReorder(m.from, m.to, m.a); else renderCuentas();
  }, true);
}

document.addEventListener("click", e=>{ if (S.ctaSel==null || e.target.closest?.("#cuentas .ct-rw")) return; S.ctaSel=null; if ($("cuentas")) renderCuentas(); });
