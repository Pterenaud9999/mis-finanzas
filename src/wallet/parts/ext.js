/* ================= Navegación ================= */
const VIEWS = ["inicio","cuentas","graficos","categorias","despensa","balance","calendario","wallet","presupuesto"];
function showView(){
  const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "inicio";
  document.querySelectorAll("[data-view]").forEach(el=>el.hidden = !el.dataset.view.split(" ").includes(v));
  document.querySelectorAll("[data-nav]").forEach(b=>{ if (b.closest("#drawer")) b.setAttribute("aria-current", b.dataset.nav===v ? "page" : "false"); });
  const nm = $("ab-name"); if (nm) nm.textContent = ({inicio:"Inicio",cuentas:"Cuentas",graficos:"Gráficos",categorias:"Categorías",despensa:"Despensa",balance:"Balance",calendario:"Calendario",wallet:"Wallet",presupuesto:"Presupuesto"})[v];
  const ab = $("ab-total"); if (ab) ab.hidden = v!=="inicio";
}
window.addEventListener("hashchange", ()=>{ showView(); window.scrollTo(0,0); });
document.addEventListener("click", e=>{ const b=e.target.closest("[data-nav]"); if(!b) return; location.hash = b.dataset.nav; });
showView();

/* ================= Balance ================= */
const AP_TIPOS = [["libre","Libre"],["pagar","Para pagar"],["emergencias","Emergencias"],["salud","Salud"],["otro","Otro apartado"],["vales","Vales / restringido"]];
function apTipo(a){
  if (a.tipo) return a.tipo;
  const n = String(a.nombre||"").toLowerCase();
  if (n.includes("emergen")) return "emergencias";
  if (n.includes("salud")) return "salud";
  if (n.includes("pagar") || n.includes("deuda")) return "pagar";
  return "otro";
}
function ctaTipo(c){
  if (c.d) return c.d;
  const n = String(c.n||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  if (n.includes("emergen")) return "emergencias";
  if (n.includes("salud")) return "salud";
  if (/deuda|prestamo|diferido|adelanto/.test(n)) return "pagar";
  if (/plerk|vales/.test(n)) return "vales";
  if (/ahorro|fondo|gbm|maestr|ppr|rendimiento|cumple/.test(n)) return "otro";
  return "libre";
}
function balanceCalc(){
  const tdd = S.cards.filter(c=>c.tipo==="TDD");
  const ctl = (S.ctas?.list)||[], useCards = !ctl.length, esEf = c=>ctaEn(c)==="efectivo";
  let cash = useCards || !ctl.some(esEf) ? (S.cash?.items||[]).reduce((a,x)=>a+(+x.saldo||0),0) : 0;
  let digital=0, emerg=0, salud=0, otros=0, vales=0, pagarAp=0;
  if (!useCards) ctl.forEach(c=>{ const t = ctaTipo(c); if (t==="fuera") return; const v = ctaSaldo(c);
    if (esEf(c)) cash += v; else digital += v;
    if (t==="emergencias") emerg+=v; else if (t==="salud") salud+=v; else if (t==="pagar") pagarAp+=v; else if (t==="vales") vales+=v; else if (t==="otro") otros+=v; });
  if (useCards) tdd.forEach(c=>{
    const s = +c.saldo||0; digital += s;
    const ap = c.apartados||[]; const sumAp = ap.reduce((a,x)=>a+(+x.saldo||0),0);
    const libreCta = Math.max(0, s - sumAp);
    const dest = c.destino || "libre";
    if (dest==="emergencias") emerg += libreCta; else if (dest==="vales") vales += libreCta; else if (dest==="salud") salud += libreCta;
    ap.forEach(x=>{ const t=apTipo(x), v=+x.saldo||0;
      if (t==="emergencias") emerg+=v; else if (t==="salud") salud+=v; else if (t==="pagar") pagarAp+=v; else if (t==="vales") vales+=v; else if (t==="otro") otros+=v; });
  });
  const unpaid = S.periods.filter(p=>p.status!=="pagado");
  const deudaTDC = unpaid.reduce((a,p)=>a+faltante(p),0);
  const apartadoTDC = unpaid.reduce((a,p)=>a+(p.status==="apartado"?total(p):p.status==="apartado50"?total(p)/2:0),0);
  const msi = S.plans.filter(p=>p.kind==="msi" && !p.movId).reduce((a,p)=>a+Math.max(0,p.total-p.pagados)*p.cuota,0);
  const prest = S.plans.filter(p=>p.kind==="prestamo").reduce((a,p)=>a+(+p.saldo||0),0);
  const totalDinero = cash + digital;
  const paraPagar = Math.max(apartadoTDC, pagarAp);
  const libre = totalDinero - paraPagar - emerg - salud - otros - vales;
  return {cashCta:!useCards && ctl.some(esEf), cash, digital, totalDinero, paraPagar, emerg, salud, otros, vales, libre, deudaTDC, apartadoTDC, faltaApartar:Math.max(0,deudaTDC-apartadoTDC), msi, prest, deuda:deudaTDC+msi+prest};
}
function renderBalance(){
  const b = balanceCalc();
  const parts = [["Para pagar TDC",b.paraPagar,"var(--info)"],["Emergencias",b.emerg,"var(--bad)"],["Salud",b.salud,"var(--ok)"],["Otros apartados",b.otros,"var(--half)"],["Vales despensa",b.vales,"#c2408f"],["Libre",Math.max(0,b.libre),"var(--muted)"]];
  const tot = Math.max(1, parts.reduce((a,p)=>a+p[1],0));
  let h = `<div class="bal-top"><div><span class="sub">Dinero total</span><b class="bal-big num">${fmt(b.totalDinero)}</b></div>
    <div class="bal-split num"><span>Efectivo <b>${fmt(b.cash)}</b></span><span>Digital <b>${fmt(b.digital)}</b></span></div></div>
    <div class="stacked" role="img" aria-label="Distribución de tu dinero">${parts.map(p=>`<i style="width:${p[1]/tot*100}%;background:${p[2]}"></i>`).join("")}</div>
    <div class="bal-grid num">${parts.map(p=>`<div><span><span class="dot" style="background:${p[2]}"></span> ${p[0]}</span><b${p[0]==="Libre"&&b.libre<0?' style="color:var(--bad)"':""}>${fmt(p[0]==="Libre"?b.libre:p[1])}</b></div>`).join("")}</div>
    <div class="bal-debt"><div class="sec-head"><b>Deuda</b><b class="num" style="color:var(--bad)">${fmt(b.deuda)}</b></div>
    <div class="bal-grid num"><div><span>Estados de cuenta por pagar</span><b>${fmt(b.deudaTDC)}</b></div><div><span>Falta apartar</span><b${b.faltaApartar>0?' style="color:var(--bad)"':""}>${fmt(b.faltaApartar)}</b></div>
    <div><span>Meses por facturar</span><b>${fmt(b.msi)}</b></div><div><span>Préstamos</span><b>${fmt(b.prest)}</b></div></div></div>
    <div class="sec-head"><span class="sub">Neto (dinero − deuda)</span><b class="num" style="color:${b.totalDinero-b.deuda<0?"var(--bad)":"var(--ok)"}">${fmt(b.totalDinero-b.deuda)}</b></div>
    <p class="sub" style="margin:4px 0 0">Saldos tomados de Cuentas: se actualizan solos con tus gastos, ingresos, transferencias y pagos de tarjetas.</p>
    <div class="actions">${b.cashCta?"":`<button class="btn sm" data-act="cashedit">${S.cashEdit?"Cerrar":"Editar efectivo"}</button>`}<button class="btn sm" data-act="aptags">${S.apTags?"Cerrar":"Clasificar cuentas"}</button></div>`;
  if (S.cashEdit){
    const it = S.cashDraft;
    h += `<div class="panel" style="background:var(--bg)"><table class="bt"><tbody>${it.map((x,i)=>`<tr><td><input id="cs-n-${i}" aria-label="Nombre" data-cash="${i}" data-k="nombre" value="${esc(x.nombre)}"></td><td style="width:110px"><input id="cs-s-${i}" aria-label="Monto" type="number" step="0.01" data-cash="${i}" data-k="saldo" value="${x.saldo??""}"></td><td class="x"><button class="iconbtn" data-act="delcash" data-i="${i}" aria-label="Quitar">×</button></td></tr>`).join("")}</tbody></table>
      <div class="actions"><button class="btn sm" data-act="addcash">+ Agregar</button><button class="btn sm primary" data-act="savecash">Guardar</button></div></div>`;
  }
  if (S.apTags){
    const rows = [], ctl = (S.ctas?.list)||[];
    if (ctl.length) ctl.forEach((c,i)=>rows.push(`<tr><td>${esc(c.n)} <span class="sub num">${fmt(ctaSaldo(c))}</span></td><td><select data-ctatag="${i}" aria-label="Tipo de cuenta">${[...AP_TIPOS,["fuera","No contar en Balance"]].map(([v,l])=>`<option value="${v}"${ctaTipo(c)===v?" selected":""}>${l}</option>`).join("")}</select></td></tr>`));
    else S.cards.filter(c=>c.tipo==="TDD").forEach(c=>{
      rows.push(`<tr><td><b>${esc(cname(c))}</b> <span class="sub">(saldo libre de la cuenta)</span></td><td><select data-dest="${esc(c.id)}" aria-label="Destino">${AP_TIPOS.filter(t=>["libre","emergencias","salud","vales"].includes(t[0])).map(([v,l])=>`<option value="${v}"${(c.destino||"libre")===v?" selected":""}>${l}</option>`).join("")}</select></td></tr>`);
      (c.apartados||[]).forEach((a,i)=>rows.push(`<tr><td style="padding-left:16px">${esc(a.nombre)} <span class="sub num">${fmt(a.saldo)}</span></td><td><select data-aptag="${esc(c.id)}" data-i="${i}" aria-label="Tipo de apartado">${AP_TIPOS.filter(t=>t[0]!=="libre").map(([v,l])=>`<option value="${v}"${apTipo(a)===v?" selected":""}>${l}</option>`).join("")}</select></td></tr>`));
    });
    h += `<div class="panel" style="background:var(--bg)"><p class="sub" style="margin:0">${(S.ctas?.list||[]).length?"Indica para qué es cada cuenta (lo propuse por su nombre). “No contar” la saca del Balance.":"Indica para qué es cada apartado."}  “Para pagar” no se suma dos veces: se compara con lo que marcaste como apartado en tus estados de cuenta.</p><table class="bt"><tbody>${rows.join("")}</tbody></table></div>`;
  }
  $("balance").innerHTML = h;
}

/* ================= Pagos por quincena ================= */
const ymOf = d => d.slice(0,7);
const ymLabel = ym => { const [y,m]=ym.split("-").map(Number); return MES[m-1]+" "+y; };
const ymAdd = (ym,n) => { const [y,m]=ym.split("-").map(Number); const d=new Date(y,m-1+n,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const curYM = todayISO.slice(0,7);
function estDates(base, ym){ // fecha estimada en un mes dado, a partir del día de una fecha base
  if (!base) return null; const day = parseD(base).getDate(); const [y,m]=ym.split("-").map(Number);
  const last = new Date(y,m,0).getDate(); return `${ym}-${String(Math.min(day,last)).padStart(2,"0")}`;
}
function missingCuts(ym){
  if (ym < curYM) return [];
  return S.cards.filter(c=>c.tipo==="TDC" && isUso(c) && c.fechaLimite).filter(c=>{
    const est = estDates(c.fechaLimite, ym); if (!est || est < c.fechaLimite) return false;
    return !S.periods.some(p=>p.card===c.id && Math.abs(dayDiff(p.due)-dayDiff(est))<=10);
  }).map(c=>({c, est:estDates(c.fechaLimite, ym)}));
}
function renderQuincenas(){
  const start = ymAdd(curYM, (S.qOff||0)-2);
  const months = Array.from({length:6},(_,k)=>ymAdd(start,k));
  const stars = S.pagosCfg?.star||{};
  const rows = months.map(ym=>{
    const ps = S.periods.filter(p=>ymOf(p.due)===ym && total(p)>0);
    const q1 = ps.filter(p=>+p.due.slice(8)<=15), q2 = ps.filter(p=>+p.due.slice(8)>15);
    const sum = a => a.reduce((x,p)=>x+total(p),0);
    const pag = ps.reduce((x,p)=>x+(p.status==="pagado"?total(p):pagado(p)),0);
    const miss = missingCuts(ym);
    const star = stars[ym] || miss.length>0;
    return {ym,q1,q2,s1:sum(q1),s2:sum(q2),tot:sum(ps),pag,pend:sum(ps)-pag,miss,star,manual:!!stars[ym]};
  });
  let h = `<div class="sec-head"><button class="btn sm" data-act="qprev" aria-label="Meses anteriores">‹</button><span class="sub">${ymLabel(months[0])} – ${ymLabel(months[5])}</span><button class="btn sm" data-act="qnext" aria-label="Meses siguientes">›</button></div>
    <div style="overflow-x:auto"><table class="qt num"><thead><tr><th>Mes</th><th>1–15</th><th>16–fin</th><th>Total</th><th>Pagado</th><th>Pendiente</th></tr></thead><tbody>` +
    rows.map(r=>`<tr class="${r.ym===curYM?"cur":""}"><td><button class="linkbtn" data-act="qstar" data-ym="${r.ym}" title="Marcar si faltan cortes">${ymLabel(r.ym)}${r.star?' <b class="star">*</b>':""}</button></td>
      <td><button class="qcell" data-act="qopen" data-ym="${r.ym}" data-q="1">${fmt0(r.s1)}</button></td><td><button class="qcell" data-act="qopen" data-ym="${r.ym}" data-q="2">${fmt0(r.s2)}</button></td>
      <td><b>${fmt0(r.tot)}${r.star?"*":""}</b></td><td>${fmt0(r.pag)}</td><td${r.pend>0?' style="color:var(--bad)"':""}>${fmt0(r.pend)}</td></tr>`).join("") + `</tbody></table></div>
    <p class="sub" style="margin:0">* faltan cortes por registrar. Se marca solo cuando una tarjeta en uso no tiene periodo ese mes; toca el mes para ponerlo o quitarlo a mano.</p>`;
  if (S.qSel){
    const r = rows.find(x=>x.ym===S.qSel.ym) || {q1:[],q2:[],miss:[]};
    const list = (S.qSel.q==="1"?r.q1:r.q2).slice().sort((a,b)=>a.due.localeCompare(b.due));
    const miss = (r.miss||[]).filter(m=>(S.qSel.q==="1") === (+m.est.slice(8)<=15));
    h += `<div class="panel" style="background:var(--bg)"><div class="sec-head"><b>${S.qSel.q==="1"?"1 al 15":"16 a fin de mes"} de ${ymLabel(S.qSel.ym)}</b><button class="btn sm" data-act="qclose">Cerrar</button></div>
      ${list.map(p=>{const c=card(p.card)||{}; return `<div class="row"><button class="linkbtn t" data-open="${esc(p.card)}"><span class="dot" style="background:${esc(c.color||"#888")}"></span> ${esc(cname(c))} ›</button><div class="m num">${fmt(p.status==="pagado"?total(p):faltante(p))}</div><div class="s">${statusSelect(p,true)} <span class="tag">Vence ${dShort(p.due)}</span></div></div>`;}).join("") || '<p class="empty">Sin pagos registrados.</p>'}
      ${miss.map(m=>`<div class="row"><span class="t"><span class="dot" style="background:${esc(m.c.color)}"></span> ${esc(cname(m.c))}</span><span class="m sub">* falta corte</span><div class="s"><span class="tag">Pago estimado ${dShort(m.est)}</span></div></div>`).join("")}</div>`;
  }
  $("quincenas").innerHTML = h;
}

/* ================= Calendario ================= */
function calEvents(ym){
  const ev = {};
  const add = (d,o) => { (ev[d]=ev[d]||[]).push(o); };
  S.periods.filter(p=>ymOf(p.due)===ym && total(p)>0).forEach(p=>add(p.due,{k:"pago",p,c:card(p.card)}));
  S.cards.filter(c=>c.tipo==="TDC" && (isUso(c) || c.fechaCorte)).forEach(c=>{
    const ec = estDates(c.fechaCorte, ym);
    if (ec && ec >= (c.fechaCorte||"")) add(ec,{k:"corte",c,est:ec!==c.fechaCorte});
    if (ym >= curYM){ const el = estDates(c.fechaLimite, ym);
      if (el && el >= (c.fechaLimite||"") && !S.periods.some(p=>p.card===c.id && Math.abs(dayDiff(p.due)-dayDiff(el))<=10)) add(el,{k:"est",c}); }
  });
  return ev;
}
function renderCal(){
  const ym = S.calYM || curYM, [y,m] = ym.split("-").map(Number);
  const first = new Date(y,m-1,1), days = new Date(y,m,0).getDate(), lead = (first.getDay()+6)%7;
  const ev = calEvents(ym);
  let h = `<div class="sec-head"><button class="btn sm" data-act="calprev" aria-label="Mes anterior">‹</button><b>${["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][m-1]} ${y}</b><button class="btn sm" data-act="calnext" aria-label="Mes siguiente">›</button></div>
    <div class="cal">${["L","M","M","J","V","S","D"].map(d=>`<div class="cal-h">${d}</div>`).join("")}${"<div></div>".repeat(lead)}`;
  for (let d=1; d<=days; d++){
    const ds = `${ym}-${String(d).padStart(2,"0")}`, e = ev[ds]||[];
    const pagos = e.filter(x=>x.k==="pago"), amt = pagos.reduce((a,x)=>a+total(x.p),0);
    const worst = pagos.some(x=>x.p.status==="riesgo")?"riesgo":pagos.some(x=>x.p.status==="abierto")?"abierto":pagos.some(x=>x.p.status==="apartado50")?"apartado50":pagos.some(x=>x.p.status==="apartado")?"apartado":pagos.length?"pagado":"";
    h += `<button class="cal-d${ds===todayISO?" today":""}${S.calDay===ds?" sel":""}${worst?" bg-"+worst:""}" data-act="calday" data-d="${ds}" aria-label="${d} ${MES[m-1]}${e.length?", "+e.length+" eventos":""}">
      <span class="cn">${d}</span>${amt?`<span class="ca num">${fmt0(amt)}</span>`:""}<span class="cdots">${e.filter(x=>x.k!=="pago").map(x=>`<i class="${x.k}" style="background:${esc(x.c.color)}"></i>`).join("")}</span></button>`;
  }
  h += `</div><div class="cal-leg sub"><span><i class="lg pago"></i> Pago (color = estado)</span><span><i class="lg corte"></i> Corte</span><span><i class="lg est"></i> Pago estimado sin registrar</span></div>`;
  const sel = S.calDay && ev[S.calDay];
  const list = S.calDay ? (sel||[]) : Object.entries(ev).sort().flatMap(([d,a])=>a.map(x=>({...x,d})));
  h += `<div class="panel" style="background:var(--bg)"><b>${S.calDay?dLong(S.calDay):"Todo el mes"}</b>` + (list.length ? list.map(x=>{
    const d = x.d || S.calDay, c = x.c||{};
    const what = x.k==="pago" ? `Pago · <b class="num">${fmt(total(x.p))}</b> ${statusSelect(x.p,true)}` : x.k==="corte" ? `Corte${x.est?' <span class="est">estimado</span>':""}` : `Pago estimado <span class="est">falta registrar</span>${c.pagoNoInt?` · último ${fmt(c.pagoNoInt)}`:""}`;
    return `<div class="row"><button class="linkbtn t" data-open="${esc(c.id)}"><span class="dot" style="background:${esc(c.color||"#888")}"></span> ${esc(cname(c))} ›</button><span class="m sub">${dShort(d)}</span><div class="s">${what}</div></div>`;
  }).join("") : `<p class="empty">Sin eventos.</p>`) + `</div>`;
  $("calendar").innerHTML = h;
}

/* ================= Movimientos ================= */
const HIST = {months:{}, meta:{catsG:[],catsI:[],cuentas:[]}, loaded:false};
(window.MF_loadHist ? window.MF_loadHist() : fetch("data/hist.json").then(r=>r.json())).then(j=>{ Object.assign(HIST, j, {loaded:true}); renderMovs(); renderGraficos(); renderCuentas(); renderCategorias(); renderDespensa(); updAb(); }).catch(()=>{ HIST.failed=true; renderMovs(); });
const toObj = a => Array.isArray(a) ? {id:a[0],t:a[1],f:a[2],cat:a[3],cta:a[4],m:a[5],n:a[6]} : a;
function monthItems(ym){ const db_ = S.movDb[ym]; return (db_ ? db_.items : (HIST.months[ym]||[]).map(toObj)); }
function allMonths(){ return [...new Set([...Object.keys(HIST.months), ...Object.keys(S.movDb), curYM])].sort(); }
function catList(t){ const base = t==="i" ? HIST.meta.catsI : HIST.meta.catsG; const extra = new Set(); Object.values(S.movDb).forEach(d=>d.items.forEach(x=>{ if(x.t===t) extra.add(x.cat); })); return [...new Set([...base,...extra,...(S.catCfg?.nuevas?.[t]||[])])].sort((a,b)=>a.localeCompare(b,"es")); }
const DIAS = ["dom","lun","mar","mié","jue","vie","sáb"];
const MESL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const CAT_COLORS = ["#2fbf4f","#d92b2b","#19d85a","#5c9e3a","#f2c21b","#1f2ee0","#6aa8ff","#ff7a1a","#7ad3d0","#e6e61a","#ff4d6d","#a64dff","#ff8fa3","#3fa34d","#c9a227","#0e8f94"];
const CAT_ICONS = {
 g:{'"Invitar"':["🤝","#e85fd6"],'"Para comidas"':["🍗","#e6b800"],"Accesorios o juegos":["🎮","#ff8f7a"],"Actividades":["⛺","#b84de6"],"Agua":["💧","#5b9bff"],
  "Alimentación":["🧺","#5cc8c4"],"Antro":["🍺","#e6b800"],"Apuesta":["🎲","#d92b2b"],"Arlette / CASA":["🏡","#ff8f7a"],"Baño público":["🚻","#e57fd6"],"Bebidas":["🍷","#b84de6"],
  "Boda":["💍","#9e9e9e"],"Casa":["🏠","#e8336d"],"Caseta peaje":["🛣️","#17c252"],"CFE":["💡","#5c9e3a"],"Cine":["🍿","#d92b2b"],"Compras online":["💻","#e6b800"],
  "Cooperación":["🤲","#4da3e6"],"Corte de cabello":["✂️","#b8c814"],"Criptomonedas":["📈","#d6c200"],"DEPORTES":["🏀","#8f9eff"],"Despensa":["🛒","#6dbb45"],
  "Disposición de efectivo":["💵","#17c252"],"Educación":["🎓","#5b9bff"],"Estacionamiento":["🅿️","#e6b800"],"Estadio":["🏟️","#2a3ae0"],"Familia":["👨‍👩‍👦","#f0b44a"],
  "FESTIVIDADES":["🎉","#5c9e3a"],"GAS":["🔥","#ff8f7a"],"Gasolina":["⛽","#17c252"],"Gorda":["🐾","#e85fd6"],"Hospedaje":["🏨","#e6b800"],"Imprevisto":["❓","#4fb8e0"],
  "Internet":["🖥️","#9ccc4a"],"Inversiones":["📊","#d6c200"],"Juegos":["🎲","#5b9bff"],"KEY CAPITAL":["🛵","#5c9e3a"],"Lavandería":["🧼","#5b9bff"],"Libros":["📖","#4da3e6"],
  "Mi love":["💜","#b84de6"],"Otros":["❔","#ff4d4d"],"Papelería":["📄","#e6b800"],"Paquito":["🐶","#ff7a3a"],"Perdido":["🛡️","#d92b2b"],"Prestamo":["💸","#17c252"],
  "Propina":["🪙","#17c252"],"Préstamos":["💸","#17c252"],"Regalo":["🎁","#17c252"],"RELIGIÓN":["🕯️","#e83030"],"RENTA":["💰","#2a3ae0"],"Renta de auto":["🚗","#3b4fe0"],
  "Ropa":["👕","#17c252"],"Saldo":["📱","#2a3ae0"],"Salud":["🩺","#6b3fe0"],"Seguro":["📋","#3b4fe0"],"SMARTPHONES":["📱","#9a20e0"],"Souvenirs":["🛍️","#17c252"],
  "Spotify":["🎤","#ff8f7a"],"Streaming":["🎬","#e83030"],"Tarjeta de crédito":["💳","#9a20e0"],"Taxi":["🚕","#e6b800"],"Transporte":["🚌","#ff8f7a"],
  "Trámites gubernamentales":["🏛️","#e6b800"],"Turismo":["🚢","#b8d414"],"Un gusto":["🍔","#e8336d"],"Verduras":["🍎","#d92b2b"],"Viaje":["✈️","#ff7a1a"]},
 i:{"Aguinaldo":["💰","#e6b800"],"Ahorros":["💰","#8ba87a"],"Bistec":["🔄","#17c252"],"Bono":["💰","#2a6fd1"],"CASA":["🏠","#e85fd6"],"CASHBACK":["💵","#17c252"],
  "Criptos":["🌐","#d6c200"],"Encontrado":["🪙","#17c252"],"Honorarios":["👔","#17a84a"],"Interés":["🏦","#7cc44a"],"Love":["💜","#b84de6"],"Manutención Paquito":["🐾","#4da3e6"],
  "Otros":["❔","#7cc44a"],"Prestamo":["🤝","#17c252"],"Prima vacacional":["💰","#5c9e3a"],"Reembolso":["🔁","#17c252"],"Regalo":["🎁","#e8336d"],"Salario":["💵","#4da3e6"],
  "SAT":["🧾","#5b9bff"],"Utilidades":["💵","#5b9bff"],"Venta":["🏷️","#e6b800"]}
};
function catIcon(c,t){ const tt=t||S.mvT||"g", o=S.catCfg?.[tt]?.[c]; if (o) return o; const m = CAT_ICONS[tt]||{}; const base = m[c] || CAT_ICONS.g[c] || CAT_ICONS.i[c] || null;
  const ti = (TI_CAT[tt]||{})[c] || TI_CAT.g[c] || TI_CAT.i[c]; if (base) return [ti ? "ti-"+ti : base[0], base[1]]; return ti ? ["ti-"+ti, null] : null; }
function icHTML(v, alt){ return v && /^ti-[a-z0-9-]+$/.test(v) ? `<i class="ti ${v}" aria-hidden="true"></i>` : esc(v || alt || ""); }

function catColor(c,t){ const ic=catIcon(c,t); if (ic && ic[1]) return ic[1]; let h=0; for (const ch of String(c)) h=(h*31+ch.charCodeAt(0))>>>0; return CAT_COLORS[h%CAT_COLORS.length]; }
function mvPickHTML(mode){
  return mode==="periodo"
      ? `<form class="f" data-form="mvper"><label class="chk full" for="mp-all"><input type="checkbox" id="mp-all" ${S.mvAll?"checked":""}> Todos (todo el historial)</label>
         <label for="mp-from">Desde<input id="mp-from" type="date" value="${esc(S.mvFrom||todayISO.slice(0,4)+"-01-01")}"></label>
         <label for="mp-to">Hasta<input id="mp-to" type="date" value="${esc(S.mvTo||todayISO)}"></label>
         <div class="actions full"><button class="btn primary" type="submit">OK</button><button class="btn" type="button" data-act="mvpickclose">Cancelar</button></div></form>`
      : `<form class="f" data-form="mvdate"><label class="full" for="md-d">Ir a la fecha<input id="md-d" type="date" value="${esc(S.mvDate||todayISO)}"></label>
         <div class="actions full"><button class="btn primary" type="submit">OK</button><button class="btn" type="button" data-act="mvtoday">Hoy</button><button class="btn" type="button" data-act="mvpickclose">Cancelar</button></div></form>`;
}
function mvRange(){
  const mode = S.mvMode||"mes", d = parseD(S.mvDate||todayISO);
  if (mode==="dia"){ const s=iso(d); return {from:s,to:s,label:(s===todayISO?"Hoy, ":"")+`${d.getDate()} de ${MESL[d.getMonth()].toLowerCase()} (${DIAS[d.getDay()]})`}; }
  if (mode==="semana"){ const a=new Date(d); a.setDate(d.getDate()-((d.getDay()+6)%7)); const b=new Date(a); b.setDate(a.getDate()+6);
    return {from:iso(a),to:iso(b),label:`${a.getDate()} ${MES[a.getMonth()]} – ${b.getDate()} ${MES[b.getMonth()]}${a.getFullYear()!==today.getFullYear()?" "+a.getFullYear():""}`}; }
  if (mode==="mes"){ const a=new Date(d.getFullYear(),d.getMonth(),1), b=new Date(d.getFullYear(),d.getMonth()+1,0); return {from:iso(a),to:iso(b),label:`${MESL[d.getMonth()]} de ${d.getFullYear()}`}; }
  if (mode==="ano"){ return {from:`${d.getFullYear()}-01-01`,to:`${d.getFullYear()}-12-31`,label:String(d.getFullYear())}; }
  if (S.mvAll || !S.mvFrom) { const ms=allMonths(); return {from:ms[0]+"-01",to:"9999-12-31",label:`Todo (desde ${ymLabel(ms[0])})`,all:true}; }
  const to = S.mvTo||todayISO;
  return {from:S.mvFrom,to,label:`desde ${dShort(S.mvFrom)} hasta ${dLong(to)}`};
}
function mvShift(n){
  const mode = S.mvMode||"mes", d = parseD(S.mvDate||todayISO);
  if (mode==="dia") d.setDate(d.getDate()+n);
  else if (mode==="semana") d.setDate(d.getDate()+7*n);
  else if (mode==="mes") d.setMonth(d.getMonth()+n, 1);
  else if (mode==="ano") d.setFullYear(d.getFullYear()+n, 0, 1);
  S.mvDate = iso(d);
}
function itemsRange(from,to){
  const out=[]; allMonths().forEach(ym=>{ if (ym+"-31" < from || ym+"-01" > to) return; monthItems(ym).forEach(x=>{ if (x.f>=from && x.f<=to) out.push(x); }); }); return out;
}
function donut(parts, totalV, empty){
  const R=70, C=2*Math.PI*R; let off=0;
  const segs = parts.map(([c,v])=>{ const len = v/totalV*C; const gap = parts.length>1 ? Math.min(2, len*.3) : 0;
    const s = `<circle r="${R}" cx="100" cy="100" fill="none" stroke="${catColor(c)}" stroke-width="34" stroke-dasharray="${Math.max(0,len-gap)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)"/>`; off += len; return s; }).join("");
  return `<svg viewBox="0 0 200 200" class="donut" role="img" aria-label="Distribución por categoría">
    <circle r="${R}" cx="100" cy="100" fill="none" stroke="var(--line)" stroke-width="34"/>${segs}
    <circle r="48" cx="100" cy="100" fill="none" stroke="var(--muted)" stroke-width="1" stroke-dasharray="4 4" opacity=".5"/>
    ${empty?`<text x="100" y="96" text-anchor="middle" class="dn-s">${empty[0]}</text><text x="100" y="114" text-anchor="middle" class="dn-s">${empty[1]}</text>`
      :`<text x="100" y="106" text-anchor="middle" class="dn-t" style="font-size:${fmt(totalV).length>10?14:17}px">${fmt(totalV).replace("$","")} $</text>`}</svg>`;
}
function renderMovs(){
  const box = $("movs"); if (!box) return;
  if (!HIST.loaded && !HIST.failed){ box.innerHTML = `<p class="empty">Cargando historial…</p>`; return; }
  const t = S.mvT||"g", mode = S.mvMode||"mes", r = mvRange();
  const items = itemsRange(r.from, r.to).filter(x=>x.t===t);
  const totalV = items.reduce((a,x)=>a+x.m,0);
  const byCat = {}; items.forEach(x=>{ (byCat[x.cat]=byCat[x.cat]||{v:0,list:[]}); byCat[x.cat].v+=x.m; byCat[x.cat].list.push(x); });
  const cats = Object.entries(byCat).sort((a,b)=>b[1].v-a[1].v);
  const word = t==="g"?"gastos":"ingresos";
  const emptyTxt = {dia:["No hubo",word+" hoy"],semana:["Sin "+word,"esta semana"],mes:["Sin "+word,"este mes"],ano:["Sin "+word,"este año"],periodo:["Sin "+word,"en el periodo"]}[mode];
  if (mode==="dia" && S.mvDate && S.mvDate!==todayISO) emptyTxt[1] = word+" este día";
  let h = `<div class="mv-tabs" role="tablist"><button role="tab" data-act="mvt" data-v="g" aria-selected="${t==="g"}">Gastos</button><button role="tab" data-act="mvt" data-v="i" aria-selected="${t==="i"}">Ingresos</button></div>
    <div class="mv-card"><div class="mv-modes">${[["dia","Día"],["semana","Semana"],["mes","Mes"],["ano","Año"],["periodo","Período"]].map(([v,l])=>`<button data-act="mvmode" data-v="${v}" aria-pressed="${mode===v}">${l}</button>`).join("")}</div>
    <div class="mv-nav">${mode!=="periodo"?`<button class="btn sm" data-act="mvprev" aria-label="Anterior">‹</button>`:"<span></span>"}
      <button class="linkbtn mv-label" data-act="mvpick">${esc(r.label)}</button>
      ${mode!=="periodo"?`<button class="btn sm" data-act="mvnext" aria-label="Siguiente">›</button>`:"<span></span>"}</div>`;
  if (S.mvPicking && !S.trfView) h += mvPickHTML(mode);
  h += `<div class="mv-donut">${donut(cats.map(([c,o])=>[c,o.v]), totalV||1, totalV?null:emptyTxt)}<button class="fab" data-act="madd" aria-label="Agregar movimiento">+</button></div></div>`;
  if (S.movEdit && S.movEdit.nuevo) h += movForm(S.movEdit);
  h += `<div class="mv-list">` + cats.map(([c,o])=>{
    const open = S.mvOpenCat===c;
    let row = `<button class="mv-cat" data-act="mvcat" data-c="${esc(c)}" aria-expanded="${open}"><span class="mv-ic" style="background:${catColor(c)}">${catIcon(c)?icHTML(catIcon(c)[0]):esc(c.slice(0,1).toUpperCase())}</span><span class="mv-cn">${esc(c)}</span><span class="mv-pc">${Math.round(o.v/totalV*100)} %</span><span class="mv-am num">${fmt(o.v).replace("$","")} $</span></button>`;
    if (open) row += `<div class="mv-items">` + o.list.slice().sort((a,b)=>b.f.localeCompare(a.f)).map(x=> (S.movEdit && S.movEdit.id===x.id) ? movForm(S.movEdit)
      : `<button class="mrow" data-act="medit" data-id="${esc(x.id)}" data-f="${esc(x.f)}"><span class="mcat">${dShort(x.f)}${x.f.slice(0,4)!==todayISO.slice(0,4)?" "+x.f.slice(2,4):""}</span><span class="mn">${esc(x.n||x.cat)}<span class="sub"> · ${esc(x.cta)}</span></span><span class="num ${x.t==="i"?"inc":""}">${fmt(x.m)}</span></button>`).join("") + `</div>`;
    return `<div class="mv-catw${open?" open":""}">${row}</div>`;
  }).join("") + `</div>`;
  if (HIST.failed) h += `<p class="warnline">No se pudo cargar el historial; solo ves lo capturado aquí.</p>`;
  box.innerHTML = h;
}

function movForm(x){
  const cats = catList(x.t), ctas = ctaNames();
  return `<form class="f mform" data-form="mov"><label for="mv-t">Tipo<select id="mv-t"><option value="g"${x.t==="g"?" selected":""}>Gasto</option><option value="i"${x.t==="i"?" selected":""}>Ingreso</option></select></label>
    <label for="mv-f">Fecha<input id="mv-f" type="date" required value="${esc(x.f)}"></label>
    <label for="mv-cat">Categoría<input id="mv-cat" list="dl-cat" required value="${esc(x.cat||"")}"><datalist id="dl-cat">${cats.map(c=>`<option value="${esc(c)}">`).join("")}</datalist></label>
    <label for="mv-m">Monto<input id="mv-m" type="number" step="0.01" min="0" required inputmode="decimal" value="${x.m??""}"></label>
    <label class="full" for="mv-cta">Cuenta<input id="mv-cta" list="dl-cta" required value="${esc(x.cta||"")}"><datalist id="dl-cta">${ctas.map(c=>`<option value="${esc(c)}">`).join("")}</datalist></label>
    <label class="full" for="mv-n">Comentario<input id="mv-n" maxlength="120" value="${esc(x.n||"")}"></label>
    <div class="actions full"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-act="mcancel">Cancelar</button>${x.nuevo?"":`<button class="btn danger" type="button" data-act="mdel">${S.mConfirm?"Confirmar eliminar":"Eliminar"}</button>`}</div></form>`;
}
async function writeMonth(ym, items){ await db.doc("mov/"+ym).set({items: items.map(x=>{ const o={id:x.id,t:x.t,f:x.f,cat:x.cat,cta:x.cta,m:x.m,n:x.n||""}; ["tags","pago","meses","tdc","fotos","ticket","det","mci","cuotas","orig"].forEach(k=>{ if (x[k]!=null) o[k]=JSON.parse(JSON.stringify(x[k])); }); return o; })}); }

/* ================= Eventos de las secciones nuevas ================= */
document.addEventListener("click", async e=>{
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  const handled = ["cashedit","aptags","addcash","delcash","savecash","qprev","qnext","qopen","qclose","qstar","calprev","calnext","calday","mvt","mvmode","mvprev","mvnext","mvpick","mvpickclose","mvtoday","mvcat","mcancel","mdel"];
  if (!handled.includes(act)) return;
  e.stopImmediatePropagation();
  const readCash = ()=>document.querySelectorAll("[data-cash]").forEach(el=>{ const i=+el.dataset.cash; if(S.cashDraft[i]) S.cashDraft[i][el.dataset.k] = el.type==="number"?(el.value===""?0:parseFloat(el.value)):el.value; });
  switch(act){
    case "cashedit": S.cashEdit=!S.cashEdit; S.cashDraft=(S.cash?.items||[]).map(x=>({...x})); renderBalance(); return;
    case "aptags": S.apTags=!S.apTags; renderBalance(); return;
    case "addcash": readCash(); S.cashDraft.push({nombre:"Efectivo",saldo:0}); renderBalance(); return;
    case "delcash": readCash(); S.cashDraft.splice(+a.dataset.i,1); renderBalance(); return;
    case "savecash": readCash(); if (db) await save(()=>db.doc("config/efectivo").set({items:S.cashDraft.map(x=>({nombre:String(x.nombre||"Efectivo"),saldo:+x.saldo||0}))})); S.cashEdit=false; renderBalance(); return;
    case "qprev": S.qOff=(S.qOff||0)-3; S.qSel=null; renderQuincenas(); return;
    case "qnext": S.qOff=(S.qOff||0)+3; S.qSel=null; renderQuincenas(); return;
    case "qopen": S.qSel={ym:a.dataset.ym,q:a.dataset.q}; renderQuincenas(); return;
    case "qclose": S.qSel=null; renderQuincenas(); return;
    case "qstar": { const ym=a.dataset.ym, st={...(S.pagosCfg?.star||{})}; if (st[ym]) delete st[ym]; else st[ym]=true; S.pagosCfg={...(S.pagosCfg||{}),star:st}; renderQuincenas(); if (db) await save(()=>db.doc("config/pagos").set(S.pagosCfg)); return; }
    case "calprev": S.calYM=ymAdd(S.calYM||curYM,-1); S.calDay=null; renderCal(); return;
    case "calnext": S.calYM=ymAdd(S.calYM||curYM,1); S.calDay=null; renderCal(); return;
    case "calday": S.calDay = S.calDay===a.dataset.d ? null : a.dataset.d; renderCal(); return;
    case "mvt": S.mvT=a.dataset.v; S.mvOpenCat=null; S.movEdit=null; renderMovs(); return;
    case "mvmode": S.mvMode=a.dataset.v; S.mvOpenCat=null; S.movEdit=null; S.mvPicking = a.dataset.v==="periodo" && !S.mvFrom && !S.mvAll; if (a.dataset.v!=="periodo") S.mvDate = S.mvDate||todayISO; renderMovs(); return;
    case "mvprev": mvShift(-1); S.mvOpenCat=null; S.movEdit=null; renderMovs(); return;
    case "mvnext": mvShift(1); S.mvOpenCat=null; S.movEdit=null; renderMovs(); return;
    case "mvpick": S.mvPicking=!S.mvPicking; renderMovs(); return;
    case "mvpickclose": S.mvPicking=false; renderMovs(); return;
    case "mvtoday": S.mvDate=todayISO; S.mvPicking=false; renderMovs(); return;
    case "mvcat": S.mvOpenCat = S.mvOpenCat===a.dataset.c ? null : a.dataset.c; S.movEdit=null; renderMovs(); return;
    case "madd": S.mConfirm=false; S.movEdit={nuevo:true,t:S.mvT||"g",f:(S.mvMode==="dia"&&S.mvDate)?S.mvDate:todayISO,cat:"",cta:"",m:null,n:""}; renderMovs(); $("mv-cat")?.focus(); return;
    case "medit": { S.mConfirm=false; const x=monthItems(a.dataset.f.slice(0,7)).find(y=>y.id===a.dataset.id); S.movEdit={...x}; renderMovs(); return; }
    case "mcancel": S.movEdit=null; renderMovs(); return;
    case "mdel": {
      if (!S.mConfirm){ S.mConfirm=true; renderMovs(); return; }
      const x=S.movEdit, ym=x.f.slice(0,7), rest=monthItems(ym).filter(y=>y.id!==x.id);
      if (db) await save(async()=>{ await toTrash({tipo:"mov", ym, data:{id:x.id,t:x.t,f:x.f,cat:x.cat,cta:x.cta,m:x.m,n:x.n||""}}); await writeMonth(ym, rest); });
      S.movEdit=null; S.mConfirm=false; return;
    }
  }
}, true);
document.addEventListener("submit", async e=>{
  if (e.target.dataset.form!=="mov") return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (!db) return;
  const x = S.movEdit, ymOld = x.nuevo ? null : x.f.slice(0,7);
  const it = {id: x.nuevo ? "m"+Date.now().toString(36)+Math.random().toString(36).slice(2,5) : x.id, t:$("mv-t").value, f:$("mv-f").value, cat:$("mv-cat").value.trim(), cta:$("mv-cta").value.trim(), m:Math.round(parseFloat($("mv-m").value)*100)/100, n:$("mv-n").value.trim()};
  if (!it.f || !it.cat || !it.cta || !(it.m>=0)) return;
  const ymNew = it.f.slice(0,7);
  await save(async()=>{
    if (!x.nuevo && ymNew!==ymOld) await writeMonth(ymOld, monthItems(ymOld).filter(y=>y.id!==it.id));
    const base = monthItems(ymNew).filter(y=>y.id!==it.id);
    await writeMonth(ymNew, [...base, it].sort((a,b)=>a.f.localeCompare(b.f)));
  });
  S.movEdit=null; renderMovs();
}, true);
document.addEventListener("submit", e=>{
  const k = e.target.dataset.form; if (k!=="mvper" && k!=="mvdate") return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (k==="mvdate"){ S.mvDate = $("md-d").value || todayISO; }
  else { S.mvAll = $("mp-all").checked; S.mvFrom = $("mp-from").value; S.mvTo = $("mp-to").value; if (S.mvTo && S.mvFrom && S.mvTo < S.mvFrom){ const t0=S.mvFrom; S.mvFrom=S.mvTo; S.mvTo=t0; } }
  S.mvPicking=false; S.mvOpenCat=null; renderMovs();
}, true);

document.addEventListener("change", async e=>{
  if (e.target.id==="mv-t"){ const dl=$("dl-cat"); if (dl) dl.innerHTML = catList(e.target.value).map(c=>`<option value="${esc(c)}">`).join(""); return; }
  const ct = e.target.closest("[data-ctatag]");
  if (ct && db && S.ctas){ const list = S.ctas.list.map(x=>({...x})); list[+ct.dataset.ctatag].d = ct.value; await save(()=>db.doc("config/cuentas").set({...S.ctas, list})); return; }
  const d = e.target.closest("[data-dest]");
  if (d && db){ await save(()=>db.doc("cards/"+d.dataset.dest).update({destino:d.value})); return; }
  const t = e.target.closest("[data-aptag]");
  if (t && db){ const c=card(t.dataset.aptag); const ap=(c.apartados||[]).map(x=>({...x})); ap[+t.dataset.i].tipo=t.value; await save(()=>db.doc("cards/"+c.id).update({apartados:ap})); }
});
