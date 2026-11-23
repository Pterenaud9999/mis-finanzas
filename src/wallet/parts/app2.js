/* ================= Tema blanco / negro ================= */
function applyTheme(t){
  document.documentElement.classList.toggle("th-light", t==="light");
  document.documentElement.classList.toggle("th-dark", t==="dark");
  const b = $("theme-btn"); if (b){ b.setAttribute("aria-label", t==="dark"?"Cambiar a fondo blanco":"Cambiar a fondo negro"); b.textContent = t==="dark" ? "☀" : "☾"; }
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
function ctaIcon(n){ const s=n.toUpperCase(); return s.startsWith("EFECTIVO")?"💵":s.includes("DEUDA")?"🏦":(s.includes("AHORRO")||s.includes("EMERGENCIA")||s.includes("MAESTR"))?"🐷":s.startsWith("GBM")||s.includes("PPR")?"📈":"💳"; }
function trfItems(){ const out=[]; Object.values(S.trfDb||{}).forEach(d=>(d.items||[]).forEach(x=>out.push(x))); return out; }
function ctaSaldo(c){
  let s = +c.s||0;
  allMonths().forEach(ym=>{ if (ym < BASE_CTAS.slice(0,7)) return; monthItems(ym).forEach(x=>{ if (x.f>BASE_CTAS && x.cta===c.n && !x.tdc) s += x.t==="i" ? x.m : -x.m; }); });
  S.periods.forEach(p=>(p.pagos||[]).forEach(g=>{ if (g.f>BASE_CTAS && g.cta===c.n) s -= +g.m||0; }));
  trfItems().forEach(x=>{ if (x.f>BASE_CTAS){ if (x.de===c.n) s -= x.m; if (x.a===c.n) s += x.m; } });
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
  if (S.ctaEdit) h += ctaForm(S.ctaEdit);
  h += `<div class="ct-list">` + list.map((c,i)=>{ const v=ctaSaldo(c);
    return `<button class="ct-row" data-act="ctaedit" data-i="${i}"><span class="ct-ic" style="background:${ctaColor(c.n)}">${ctaIcon(c.n)}</span><span class="ct-n">${esc(c.n)}</span>${c.t?"":'<span class="ct-hid" title="No suma al total" aria-label="No suma al total">⊘</span>'}<span class="num ct-v${v<0?" neg":""}">${fmt(v)}</span></button>`; }).join("") + `</div>
    <div class="actions"><button class="btn sm" data-act="ctanew">+ Agregar cuenta</button></div>
    <p class="sub" style="margin:0">⊘ = no suma al total (igual que el ojo tachado de tu app). Saldos al ${dLong(BASE_CTAS)}; desde ahí se actualizan con tus movimientos y transferencias.</p>`;
  box.innerHTML = h;
}
function ctaForm(x){
  return `<form class="f mform" data-form="cta"><label class="full" for="ct-n">Nombre<input id="ct-n" required maxlength="60" value="${esc(x.n||"")}"></label>
    <label for="ct-s">Saldo actual<input id="ct-s" type="number" step="0.01" value="${x.nuevo?"":ctaSaldo(x)}"></label>
    <label class="chk" for="ct-t" style="align-self:end"><input type="checkbox" id="ct-t" ${x.t?"checked":""}> Suma al total</label>
    <div class="actions full"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-act="ctacancel">Cancelar</button>${x.nuevo?"":`<button class="btn sm" type="button" data-act="ctaup">↑</button><button class="btn sm" type="button" data-act="ctadown">↓</button><button class="btn danger" type="button" data-act="ctadel">${S.ctaConfirm?"Confirmar eliminar":"Eliminar"}</button>`}</div></form>`;
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
    return `<div class="mv-catw"><div class="mv-cat"><span class="mv-ic" style="background:${catColor(c,t)}">${ic?ic[0]:esc(c[0])}</span><span class="mv-cn">${esc(c)}</span><span class="mv-pc">${Math.round(v/tot*100)} %</span><span class="mv-am num">${fmt(v).replace("$","")} $</span></div></div>`; }).join("") || '<p class="empty">Sin registros.</p>'; };
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
    <label for="cg-e">Ícono (emoji)<input id="cg-e" maxlength="8" value="${esc(S.catEdit.e||"")}"></label>
    <label for="cg-c">Color<input id="cg-c" type="color" value="${esc(S.catEdit.c||"#4d8cf0")}"></label>
    ${S.catEdit.nuevo?"":`<p class="full sub" style="margin:0">El nombre de una categoría con historial no se cambia aquí para no separar tus registros.</p>`}
    <div class="actions full"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-act="catcancel">Cancelar</button></div></form>`;
  h += `<div class="cat-grid">` + cats.map(c=>{ const ic=catIcon(c,t); return `<button class="cat-cell" data-act="catedit" data-c="${esc(c)}"><span class="cat-ic" style="background:${catColor(c,t)}">${ic?ic[0]:esc(c[0])}</span><span class="cat-n">${esc(c)}</span></button>`; }).join("") +
    `<button class="cat-cell" data-act="catnew"><span class="cat-ic" style="background:#f8c11c;color:#15171c">+</span><span class="cat-n">Crear</span></button></div>`;
  box.innerHTML = h;
}

/* ================= Eventos ================= */
document.addEventListener("click", async e=>{
  const nav = e.target.closest("[data-nav]"); if (nav && !$("drawer").hidden) openDrawer(false);
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  const mine = ["drawer","drawerclose","theme","trfhist","trfback","trfnew","trfedit","trfcancel","trfdel","ctaedit","ctanew","ctacancel","ctadel","ctaup","ctadown","grt","grp","grsel","ctt","catedit","catnew","catcancel"];
  if (!mine.includes(act)) return;
  e.stopImmediatePropagation();
  const i = a.dataset.i!=null ? +a.dataset.i : null;
  switch(act){
    case "drawer": openDrawer(true); return;
    case "drawerclose": openDrawer(false); return;
    case "theme": { const t = S.theme==="dark"?"light":"dark"; S.theme=t; applyTheme(t); try{ localStorage.setItem("mf-theme",t); }catch(err){} return; }
    case "trfhist": S.trfView=true; S.trfEdit=null; renderCuentas(); return;
    case "trfback": S.trfView=false; S.trfEdit=null; renderCuentas(); return;
    case "trfnew": S.trfConfirm=false; S.trfEdit={nuevo:true,f:todayISO}; renderCuentas(); $("tr-de")?.focus(); return;
    case "trfedit": { S.trfConfirm=false; const x = trfMonth(a.dataset.f.slice(0,7)).find(y=>y.id===a.dataset.id); S.trfEdit={...x}; renderCuentas(); return; }
    case "trfcancel": S.trfEdit=null; renderCuentas(); return;
    case "trfdel": { if (!S.trfConfirm){ S.trfConfirm=true; renderCuentas(); return; }
      const x=S.trfEdit, ym=x.f.slice(0,7); if (db) await save(async()=>{ await toTrash({tipo:"trf", ym, data:{...x}}); await writeTrfMonth(ym, trfMonth(ym).filter(y=>y.id!==x.id)); });
      S.trfEdit=null; S.trfConfirm=false; return; }
    case "ctaedit": S.ctaConfirm=false; S.ctaEdit={...S.ctas.list[i], i}; renderCuentas(); return;
    case "ctanew": S.ctaEdit={nuevo:true,n:"",s:0,t:false}; renderCuentas(); return;
    case "ctacancel": S.ctaEdit=null; renderCuentas(); return;
    case "ctaup": case "ctadown": { const l=S.ctas.list.map(x=>({...x})), k=S.ctaEdit.i, j=act==="ctaup"?k-1:k+1; if (j<0||j>=l.length) return; [l[k],l[j]]=[l[j],l[k]]; S.ctaEdit.i=j; if (db) await save(()=>db.doc("config/cuentas").set({...S.ctas, list:l})); return; }
    case "ctadel": { if (!S.ctaConfirm){ S.ctaConfirm=true; renderCuentas(); return; }
      const l=S.ctas.list.filter((_,k)=>k!==S.ctaEdit.i).map(x=>({...x})); if (db) await save(()=>db.doc("config/cuentas").set({...S.ctas, list:l})); S.ctaEdit=null; return; }
    case "grt": S.grT=a.dataset.v; renderGraficos(); return;
    case "grp": S.grP=a.dataset.v; S.grSel=null; S.grScrollEnd=true; renderGraficos(); return;
    case "grsel": S.grSel=i; { const sc=$("gscroll"), keep=sc?sc.scrollLeft:0; renderGraficos(); const sc2=$("gscroll"); if (sc2) sc2.scrollLeft=keep; } return;
    case "ctt": S.ctT=a.dataset.v; S.catEdit=null; renderCategorias(); return;
    case "catedit": { const c=a.dataset.c, ic=catIcon(c,S.ctT||"g"); S.catEdit={n:c, e:ic?ic[0]:"", c:catColor(c,S.ctT||"g")}; renderCategorias(); window.scrollTo(0,0); return; }
    case "catnew": S.catEdit={nuevo:true,n:"",e:"🏷️",c:"#4d8cf0"}; renderCategorias(); window.scrollTo(0,0); return;
    case "catcancel": S.catEdit=null; renderCategorias(); return;
  }
}, true);
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
    if (x.nuevo) l.push({n, s:deseado||0, t});
    else { const old=l[x.i]; const actual=ctaSaldo(old); l[x.i]={...old, n, t, s:Math.round(((+old.s||0)+(deseado-actual))*100)/100}; }
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
