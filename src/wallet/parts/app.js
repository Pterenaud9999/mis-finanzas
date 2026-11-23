const STATUS = [["abierto","Abierto"],["apartado50","Apartado 50%"],["apartado","Apartado"],["riesgo","En riesgo"],["pagado","Pagado"]];
const FRECS = [["quincenal","Cada quincena"],["mensual","Cada mes"],["extra","Extraordinario"]];
const S = {cards:[], periods:[], plans:[], budget:null, wallet:null, bdraft:null, tab:"TDC", wf:"uso", picking:false,
  sel:null, sheet:false, yr:"todo", openP:null, editing:false, editRow:null, addRow:null, chDate:null, newPer:false,
  confirmDel:null, confirmRow:null, ruleEdit:false, budgetEdit:false, scrollBottom:false, trash:[], trashOpen:false, confirmTrash:null, apDraft:null};
let db = null;

const $ = id => document.getElementById(id);
const fmt = n => (n<0?"-":"") + "$" + Math.abs(+n||0).toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt0 = n => (n<0?"-":"") + "$" + Math.round(Math.abs(+n||0)).toLocaleString("es-MX");
const esc = s => String(s ?? "").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const parseD = s => { const [y,m,d]=String(s).split("-").map(Number); return new Date(y,(m||1)-1,d||1); };
const today = (()=>{const d=new Date(); d.setHours(0,0,0,0); return d;})();
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayISO = iso(today);
const dayDiff = s => Math.round((parseD(s)-today)/86400000);
const MES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const dShort = s => { const d=parseD(s); return d.getDate()+" "+MES[d.getMonth()]; };
const dLong = s => { const d=parseD(s); return d.getDate()+" "+MES[d.getMonth()]+" "+d.getFullYear(); };
const monthAdd = (ym,n) => { const [y,m]=ym.split("-").map(Number); const d=new Date(y,m-1+n,1); return MES[d.getMonth()]+" "+d.getFullYear(); };
const total = p => (p.items||[]).reduce((a,i)=>a+(+i.monto||0),0);
const card = id => S.cards.find(c=>c.id===id);
const cname = c => c ? (c.nombre+(c.producto?" "+c.producto:"")) : "";

// Próxima fecha a partir de la última conocida: mismo día cada mes
function nextDate(s){
  if (!s) return null;
  const base = parseD(s);
  if (base >= today) return {fecha:s, estimada:false};
  const day = base.getDate();
  for (let k=1;k<=60;k++){
    const y = base.getFullYear(), m = base.getMonth()+k;
    const last = new Date(y,m+1,0).getDate();
    const d = new Date(y,m,Math.min(day,last));
    if (d >= today) return {fecha:iso(d), estimada:true};
  }
  return null;
}

$("today").textContent = today.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"}) +
  " · " + (today.getDate()<=15 ? "1ª" : "2ª") + " quincena";

function statusSelect(p, small){
  return `<select class="pill${small?" xs":""} st-${esc(p.status)}" data-period="${esc(p.id)}" aria-label="Estado del pago">` +
    STATUS.map(([v,l])=>`<option value="${v}"${v===p.status?" selected":""}>${l}</option>`).join("") + `</select>`;
}
function dueTag(p){
  const n = dayDiff(p.due);
  if (p.status==="pagado") return `<span class="tag">Vence ${dShort(p.due)}</span>`;
  if (n<0) return `<span class="tag late">Vencido hace ${-n} d</span>`;
  if (n===0) return `<span class="tag late">Vence hoy</span>`;
  return `<span class="tag${n<=5?" late":""}">Vence ${dShort(p.due)} · ${n} d</span>`;
}
function cardUsage(c){
  const unpaid = S.periods.filter(p=>p.card===c.id && p.status!=="pagado").reduce((a,p)=>a+total(p),0);
  const msi = S.plans.filter(p=>p.card===c.id && p.kind==="msi").reduce((a,p)=>a+Math.max(0,(p.total-p.pagados))*p.cuota,0);
  const hasD = c.dispBanco!=null && c.dispBanco!=="", hasS = c.saldoBanco!=null && c.saldoBanco!=="";
  const used = hasS ? +c.saldoBanco : hasD ? (c.limite||0)-(+c.dispBanco) : unpaid+msi;
  const disp = hasD ? +c.dispBanco : (c.limite||0)-used;
  return {used, disp, banco: hasS||hasD, pct: c.limite ? used/c.limite : 0};
}
const usageColor = pct => pct<.3 ? "var(--ok)" : pct<.6 ? "var(--warn)" : "var(--bad)";
const isUso = c => c.enUso !== false;

/* ---------- Resumen y próximos pagos ---------- */
function renderSummary(){
  const open = S.periods.filter(p=>p.status!=="pagado" && dayDiff(p.due)<=45);
  const due = open.reduce((a,p)=>a+total(p),0);
  const set = open.reduce((a,p)=>a+(p.status==="apartado"?total(p):p.status==="apartado50"?total(p)/2:0),0);
  $("t-due").textContent = fmt0(due); $("t-set").textContent = fmt0(set); $("t-gap").textContent = fmt0(due-set);
  $("t-gap-w").classList.toggle("bad", due-set>0);
}
function renderNext(){
  const list = S.periods.filter(p=>p.status!=="pagado" && total(p)>0).sort((a,b)=>parseD(a.due)-parseD(b.due));
  $("next").innerHTML = list.length ? list.map(p=>{
    const c = card(p.card)||{nombre:p.card,color:"#888"};
    return `<div class="row"><button class="linkbtn t" data-open="${esc(p.card)}"><span class="dot" style="background:${esc(c.color)}"></span> ${esc(c.nombre)} <span class="sub">${esc(c.producto||"")}</span> <span aria-hidden="true" class="sub">›</span></button>
      <div class="m num">${fmt(total(p))}</div><div class="s">${statusSelect(p)} ${dueTag(p)}</div></div>`;
  }).join("") : `<p class="empty">No hay pagos pendientes.</p>`;
}

/* ---------- Wallet ---------- */
function visibleCards(){
  let list = S.cards.filter(c=>c.tipo===S.tab).sort((a,b)=>(a.orden||0)-(b.orden||0));
  if (S.wf==="uso") list = list.filter(isUso);
  else if (S.wf==="sin") list = list.filter(c=>!isUso(c));
  else { const v = S.wallet?.visibles||[];
    if (v.includes("__none_"+S.tab)) list = [];
    else if (list.some(c=>v.includes(c.id))) list = list.filter(c=>v.includes(c.id)); }
  return list;
}
function cardFace(c){
  const u = cardUsage(c);
  const badges = `${c.congelada?'<span class="wbadge">Congelada</span>':""}${c.contactless?'<svg class="ctl" viewBox="0 0 24 24" aria-label="Contactless activado"><path d="M8 6c3 3.5 3 8.5 0 12M12 4c4 5 4 11 0 16M16 2c5 6 5 14 0 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>':""}`;
  const bottom = c.tipo==="TDC"
    ? `<div><div class="wsmall">${u.banco?"Saldo (banco)":"Comprometido"}</div><div class="wbig num">${fmt0(u.used)}</div></div>
       <div style="text-align:right"><div class="wsmall">Línea ${fmt0(c.limite||0)}</div><div class="wsmall">Uso ${Math.round(u.pct*100)}%</div></div>`
    : `<div><div class="wsmall">Saldo</div><div class="wbig num">${c.saldo!=null?fmt0(c.saldo):"Sin capturar"}</div></div>
       <div style="text-align:right" class="wsmall">${esc(c.uso||"")}</div>`;
  return `<div class="wtop"><div><div class="wname">${esc(c.nombre)}</div><div class="wsmall">${esc(c.producto||"")}</div></div><div class="wright">${badges}<span class="wkind">${esc(c.tipo)}</span></div></div>
    ${c.tipo==="TDC"?'<div class="chip"></div>':""}<div class="wbot">${bottom}</div>`;
}
function renderStack(){
  ["uso","sin","mostrar"].forEach(k=>$("wf-"+k).setAttribute("aria-pressed", S.wf===k));
  const list = visibleCards(), view = S.wallet?.vista || "chica";
  ["chica","grande","lista"].forEach(k=>$("wv-"+k).setAttribute("aria-pressed", view===k));
  $("stack").className = "stack v-"+view;
  if (view==="lista"){
    $("stack").innerHTML = list.map(c=>{ const u=cardUsage(c);
      const right = c.tipo==="TDC" ? `<span class="num"><b>${fmt0(u.used)}</b> <span class="sub">/ ${fmt0(c.limite||0)}</span></span>` : `<b class="num">${c.saldo!=null?fmt0(c.saldo):"—"}</b>`;
      return `<button class="lrow" data-card="${esc(c.id)}"><span class="lsw" style="background:${esc(c.fondo||c.color)}"></span><span class="lname">${esc(cname(c))}${c.congelada?' <span class="chipst under">Congelada</span>':""}</span>${right}</button>`;}).join("")
      || `<p class="empty">No hay tarjetas con este filtro.</p>`;
  } else
  $("stack").innerHTML = list.map(c=>`<button class="wcard${c.tintaOscura?" dark-ink":""}${c.congelada?" frozen":""}" data-card="${esc(c.id)}" style="background:${esc(c.fondo||c.color)}" aria-label="Abrir ${esc(cname(c))}">${cardFace(c)}</button>`).join("")
    || `<p class="empty">No hay tarjetas con este filtro.</p>`;
  // Selector de "Solo mostrar"
  if (S.wf==="mostrar" && S.picking){
    const all = S.cards.filter(c=>c.tipo===S.tab).sort((a,b)=>(a.orden||0)-(b.orden||0));
    const v = S.wallet?.visibles||[];
    $("picker").innerHTML = `<div class="panel picker"><div class="sec-head"><b>Elige qué tarjetas mostrar</b><span class="actions"><button class="btn sm" data-act="pickall">Todas</button><button class="btn sm" data-act="picknone">Ninguna</button></span></div>
      <div class="pick-grid">${all.map(c=>`<label class="pick"><input type="checkbox" data-pick="${esc(c.id)}" ${v.includes("__none_"+S.tab)?"":(!all.some(x=>v.includes(x.id))||v.includes(c.id))?"checked":""}> <span class="dot" style="background:${esc(c.color)}"></span> ${esc(cname(c))}</label>`).join("")}</div>
      <div class="actions"><button class="btn sm primary" data-act="pickdone">Listo</button></div></div>`;
  } else $("picker").innerHTML = S.wf==="mostrar" ? `<button class="btn sm" data-act="pickopen">Elegir tarjetas…</button>` : "";
  // Resumen al pie
  const all = S.cards.filter(c=>c.tipo===S.tab);
  if (S.tab==="TDC"){
    const lin = all.reduce((a,c)=>a+(+c.limite||0),0);
    const used = all.reduce((a,c)=>a+cardUsage(c).used,0);
    $("w-foot").innerHTML = `<div class="kv num"><div><span>Tarjetas de crédito</span><b>${all.length} <span class="sub">(${all.filter(isUso).length} en uso)</span></b></div>
      <div><span>Línea total</span><b>${fmt0(lin)}</b></div><div><span>Disponible total</span><b>${fmt0(lin-used)}</b></div></div>`;
  } else {
    const s = all.reduce((a,c)=>a+(+c.saldo||0),0);
    $("w-foot").innerHTML = `<div class="kv num"><div><span>Cuentas de débito</span><b>${all.length}</b></div><div><span>Saldo capturado</span><b>${fmt0(s)}</b></div><div><span>Sin saldo capturado</span><b>${all.filter(c=>c.saldo==null).length}</b></div></div>`;
  }
}

/* ---------- Detalle de tarjeta (pantalla completa) ---------- */
function rowForm(pid,it){
  const del = it ? `<button class="btn danger" type="button" data-act="delrow" data-p="${esc(pid)}" data-i="${it.i}">${S.confirmRow===pid+":"+it.i?"Confirmar eliminar":"Eliminar"}</button>` : "";
  return `<form class="f" data-form="row" data-p="${esc(pid)}" data-i="${it?it.i:""}">
    <label class="full" for="rf-concepto">Concepto<input id="rf-concepto" required maxlength="80" value="${esc(it?.concepto||"")}"></label>
    <label for="rf-fecha">Fecha de compra<input id="rf-fecha" type="date" value="${esc(it?.fecha||todayISO)}"></label>
    <label for="rf-monto">Monto<input id="rf-monto" type="number" step="0.01" min="0" required inputmode="decimal" value="${it?it.monto:""}"></label>
    <div class="actions full"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-act="cancel">Cancelar</button>${del}</div></form>`;
}
function periodTab(p){
  const open = S.openP===p.id, id = esc(p.id);
  const items = (p.items||[]).map((it,i)=>({...it,i})).sort((a,b)=>(a.fecha||"").localeCompare(b.fecha||""));
  let h = `<div class="ptab${open?" open":""}"><button class="ptab-h bg-${esc(p.status)}" data-act="togglep" data-p="${id}" aria-expanded="${open}">
    <span class="pd">${dLong(p.due)}${p.fechaRevisar?' <span class="rev" title="Fecha por revisar">!</span>':""}</span>
    <span class="pn">${items.length} mov.</span><span class="pm num">${fmt(total(p))}</span></button>`;
  if (!open) return h + `</div>`;
  h += `<div class="ptab-b"><div class="ptab-st">${statusSelect(p,true)}${p.fechaRevisar?'<span class="chipst under">Fecha por revisar</span>':""}</div><table class="xt">` + items.map(it =>
    (S.editRow && S.editRow.p===p.id && S.editRow.i===it.i)
      ? `<tr><td colspan="3" class="ef-cell">${rowForm(p.id,it)}</td></tr>`
      : `<tr class="r" tabindex="0" data-act="editrow" data-p="${id}" data-i="${it.i}"><td class="d">${it.fecha?dShort(it.fecha):"—"}</td><td>${esc(it.concepto)}</td><td class="n num">${fmt(+it.monto)}</td></tr>`).join("") + `</table>`;
  if (!items.length) h += `<div class="ef sub">Sin gastos en este periodo.</div>`;
  if (S.addRow===p.id) h += `<div class="ef">${rowForm(p.id,null)}</div>`;
  if (S.chDate===p.id) h += `<form class="f ef" data-form="chdate" data-p="${id}"><label for="cd-date">Nueva fecha límite<input id="cd-date" type="date" required value="${esc(p.due)}"></label>
    <div class="actions" style="align-items:flex-end"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-act="cancel">Cancelar</button></div></form>`;
  h += `<div class="blk-a"><button class="btn sm primary" data-act="addrow" data-p="${id}">+ Agregar gasto</button><button class="btn sm" data-act="chdate" data-p="${id}">Cambiar fecha</button>
    <button class="btn sm danger" data-act="delper" data-p="${id}">${S.confirmDel===p.id?"Confirmar eliminar":"Eliminar periodo"}</button></div></div>`;
  return h + `</div>`;
}
function infoGrid(c){
  const u = cardUsage(c), nc = nextDate(c.fechaCorte), nl = nextDate(c.fechaLimite);
  const f = (x)=> x ? `${dLong(x.fecha)}${x.estimada?' <span class="est">estimada</span>':""}` : "Por capturar";
  const yn = v => v==null ? "—" : v ? "Sí" : "No";
  return `<div class="info">
    <div><span>Línea de crédito</span><b class="num">${fmt0(c.limite||0)}</b></div>
    <div><span>Saldo utilizado${u.banco?"":" (calculado)"}</span><b class="num">${fmt0(u.used)}</b></div>
    <div><span>Crédito disponible${c.dispBanco!=null&&c.dispBanco!==""?"":" (calculado)"}</span><b class="num">${fmt0(u.disp)}</b></div>
    <div><span>Saldo al corte</span><b class="num">${c.saldoCorte!=null?fmt(c.saldoCorte):"—"}</b></div>
    <div><span>Pago para no generar intereses</span><b class="num">${c.pagoNoInt!=null?fmt(c.pagoNoInt):"—"}</b></div>
    <div><span>Próximo corte</span><b>${f(nc)}</b></div>
    <div><span>Próximo pago límite</span><b>${f(nl)}</b></div>
    <div><span>Beneficio</span><b>${esc(c.beneficio||"—")}</b></div>
    <div><span>Contactless</span><b>${yn(c.contactless)}</b></div>
    <div><span>Congelada</span><b>${yn(c.congelada)}</b></div>
    <div><span>Estado</span><b>${isUso(c)?"En uso":"Sin uso"}</b></div></div>`;
}
function renderDetail(){
  const c = card(S.sel), box = $("detail");
  if (!c || !S.sheet){ box.innerHTML=""; box.className=""; document.body.classList.remove("locked"); return; }
  box.className = "sheet"; box.setAttribute("role","dialog"); box.setAttribute("aria-label","Detalle de "+cname(c));
  document.body.classList.add("locked");
  const keep = box.scrollTop, pl = $("plist"), keepL = pl ? pl.scrollTop : 0;
  let h = `<div class="sheet-in"><div class="sheet-top"><button class="btn" data-act="closesheet">← Wallet</button><span class="mini" style="background:${esc(c.fondo||c.color)}"></span><b>${esc(cname(c))}</b></div><div class="panel">`;
  if (c.tipo==="TDC"){
    const u = cardUsage(c);
    const plans = S.plans.filter(p=>p.card===c.id);
    const all = S.periods.filter(p=>p.card===c.id).sort((a,b)=>parseD(a.due)-parseD(b.due) || (a.fila||9999)-(b.fila||9999));
    const years = [...new Set(all.map(p=>p.due.slice(0,4)))].sort().reverse();
    const per = all.filter(p=> S.yr==="todo" ? true : S.yr==="pend" ? p.status!=="pagado" : p.due.startsWith(S.yr));
    h += `<div class="bar" role="img" aria-label="Uso ${Math.round(u.pct*100)}%"><i style="width:${Math.min(100,u.pct*100)}%;background:${usageColor(u.pct)}"></i></div>` + infoGrid(c);
    if (c.historialLimite?.length) h += `<div class="sub">Aumentos de línea: ${c.historialLimite.map(x=>`${dShort(x.fecha)} ${x.fecha.slice(0,4)}: ${fmt0(x.de)} → ${fmt0(x.a)}`).join(" · ")}</div>`;
    if (plans.length) h += `<div class="sub">Diferidos: ${plans.map(p=>`${esc(p.nombre)} ${p.pagados}/${p.total}`).join(" · ")}</div>`;
    h += `<div class="actions"><button class="btn sm" data-act="editcard">${S.editing?"Cerrar edición":"Editar tarjeta"}</button></div>`;
    if (S.editing) h += cardForm(c);
    h += `<div class="sec-head"><h2 style="font-size:16px">Pagos por fecha límite</h2><button class="btn sm" data-act="newper">+ Nuevo periodo</button></div>
      <div class="sec-head"><label class="sub" for="yr-filter">Mostrar <select id="yr-filter" class="pill" style="background-color:var(--bg);color:var(--ink)">
        <option value="todo"${S.yr==="todo"?" selected":""}>Todo</option><option value="pend"${S.yr==="pend"?" selected":""}>Pendientes</option>
        ${years.map(y=>`<option value="${y}"${S.yr===y?" selected":""}>${y}</option>`).join("")}</select></label>
        <span class="sub num">${all.length} periodos · ${fmt0(all.reduce((a,p)=>a+total(p),0))}</span></div>`;
    if (S.newPer) h += `<form class="f" data-form="newper"><label for="np-date">Fecha límite de pago<input id="np-date" type="date" required></label>
      <div class="actions" style="align-items:flex-end"><button class="btn primary" type="submit">Crear</button><button class="btn" type="button" data-act="cancel">Cancelar</button></div></form>`;
    h += `<div class="sub" style="margin-bottom:-6px">↑ más antiguos · más recientes ↓</div><div class="plist" id="plist">${per.map(periodTab).join("") || `<p class="empty">${all.length?"No hay periodos con este filtro.":"Sin periodos. Crea uno con “Nuevo periodo”."}</p>`}</div>`;
  } else {
    h += `<div class="info"><div><span>Saldo</span><b class="num">${c.saldo!=null?fmt(c.saldo):"Sin capturar"}</b></div><div><span>Uso</span><b>${esc(c.uso||"—")}</b></div><div><span>Beneficio</span><b>${esc(c.beneficio||"—")}</b></div>
      <div><span>Contactless</span><b>${c.contactless==null?"—":c.contactless?"Sí":"No"}</b></div><div><span>Congelada</span><b>${c.congelada?"Sí":"No"}</b></div><div><span>Estado</span><b>${isUso(c)?"En uso":"Sin uso"}</b></div></div>
      ${apartadosHTML(c)}
      <div class="actions"><button class="btn sm" data-act="editcard">${S.editing?"Cerrar edición":"Editar cuenta"}</button></div>`;
    if (S.editing) h += cardForm(c);
  }
  box.innerHTML = h + `</div></div>`;
  box.scrollTop = keep;
  const nl = $("plist");
  if (nl){ nl.scrollTop = S.scrollBottom ? nl.scrollHeight : keepL; S.scrollBottom = false; }
}
function apartadosHTML(c){
  const ap = c.apartados||[]; if (!ap.length) return "";
  const sum = ap.reduce((a,x)=>a+(+x.saldo||0),0), libre = (+c.saldo||0)-sum;
  return `<div><div class="sec-head"><b>Apartados</b><span class="sub num">${fmt(sum)} apartado · ${fmt(libre)} sin asignar</span></div>
    <table class="num"><tbody>${ap.map(x=>`<tr><td>${esc(x.nombre)}</td><td>${fmt(+x.saldo||0)}</td></tr>`).join("")}
    <tr><td><b>Sin asignar</b></td><td><b>${fmt(libre)}</b></td></tr></tbody></table></div>`;
}
function cardForm(c){
  const chk = (id,v,l)=>`<label class="chk" for="${id}"><input type="checkbox" id="${id}" ${v?"checked":""}> ${l}</label>`;
  return `<form class="f" data-form="card">` + (c.tipo==="TDC"
    ? `<label for="e-lim">Línea de crédito<input id="e-lim" type="number" step="100" min="0" value="${c.limite??""}"></label>
       <label for="e-saldo">Saldo utilizado (banco)<input id="e-saldo" type="number" step="0.01" min="0" placeholder="Opcional" value="${c.saldoBanco??""}"></label>
       <label for="e-disp">Crédito disponible (banco)<input id="e-disp" type="number" step="0.01" placeholder="Opcional" value="${c.dispBanco??""}"></label>
       <label for="e-scorte">Saldo al corte<input id="e-scorte" type="number" step="0.01" placeholder="Opcional" value="${c.saldoCorte??""}"></label>
       <label for="e-pni">Pago para no generar intereses<input id="e-pni" type="number" step="0.01" placeholder="Opcional" value="${c.pagoNoInt??""}"></label>
       <label for="e-corte">Última fecha de corte<input id="e-corte" type="date" value="${esc(c.fechaCorte||"")}"></label>
       <label for="e-flim">Última fecha límite de pago<input id="e-flim" type="date" value="${esc(c.fechaLimite||"")}"></label>`
    : `<label for="e-saldo">Saldo total de la cuenta<input id="e-saldo" type="number" step="0.01" value="${c.saldo??""}"></label>
       <div class="full"><div class="sub">Apartados / cajitas dentro de esta cuenta</div><table class="bt"><tbody>${(S.apDraft||[]).map((a,i)=>`<tr><td><input id="ap-n-${i}" aria-label="Nombre del apartado" data-ap="${i}" data-k="nombre" value="${esc(a.nombre)}"></td><td style="width:110px"><input id="ap-s-${i}" aria-label="Saldo del apartado" type="number" step="0.01" data-ap="${i}" data-k="saldo" value="${a.saldo??""}"></td><td class="x"><button type="button" class="iconbtn" data-act="delap" data-i="${i}" aria-label="Quitar apartado">×</button></td></tr>`).join("")}</tbody></table>
       <button type="button" class="btn sm" data-act="addap">+ Agregar apartado</button></div>`) +
    `<label for="e-ben">Beneficio<input id="e-ben" maxlength="40" value="${esc(c.beneficio||"")}"></label>
     <label class="full" for="e-uso">Uso<input id="e-uso" maxlength="60" value="${esc(c.uso||"")}"></label>
     <div class="full chks">${chk("e-enuso",isUso(c),"En uso")}${chk("e-ctl",c.contactless,"Contactless activado")}${chk("e-frz",c.congelada,"Congelada")}</div>
     <p class="full sub" style="margin:0">Si cambias la línea de crédito, el aumento queda registrado con la fecha de hoy. Deja los campos “banco” vacíos para que se calculen solos.</p>
     <div class="actions full"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-act="cancel">Cancelar</button></div></form>`;
}

/* ---------- Papelera ---------- */
function renderTrash(){
  const list = S.trash.slice().sort((a,b)=>(b.borrado||"").localeCompare(a.borrado||""));
  $("trash-count").textContent = list.length ? list.length+" elemento"+(list.length>1?"s":"") : "Vacía";
  if (!S.trashOpen){ $("trash").innerHTML = list.length?`<button class="btn sm" data-act="trashopen">Ver papelera</button>`:""; return; }
  $("trash").innerHTML = (list.length ? list.map(t=>{
    const c = card(t.card), d = t.data||{};
    const desc = t.tipo==="gasto" ? `${esc(d.concepto)} · ${fmt(+d.monto)} <span class="sub">(${esc(cname(c))}, pago ${t.due?dLong(t.due):"—"})</span>`
      : `Periodo ${d.due?dLong(d.due):""} · ${fmt(total(d))} <span class="sub">(${esc(cname(c))}, ${(d.items||[]).length} gastos)</span>`;
    return `<div class="trow"><div>${desc}<div class="sub">Eliminado el ${t.borrado?dLong(t.borrado.slice(0,10)):"—"}</div></div>
      <div class="actions"><button class="btn sm" data-act="restore" data-t="${esc(t.id)}">Restaurar</button>
      <button class="btn sm danger" data-act="purge" data-t="${esc(t.id)}">${S.confirmTrash===t.id?"Confirmar":"Eliminar definitivamente"}</button></div></div>`;
  }).join("") : `<p class="empty">La papelera está vacía.</p>`) + `<div class="actions"><button class="btn sm" data-act="trashclose">Ocultar</button></div>`;
}
async function toTrash(entry){ await db.collection("trash").add({...entry, borrado:new Date().toISOString()}); }

/* ---------- Diferidos ---------- */
function renderPlans(){
  const list = S.plans.slice().sort((a,b)=>(a.orden||0)-(b.orden||0));
  let rest = 0;
  $("plans").innerHTML = list.length ? list.map(p=>{
    const c = card(p.card), aport = p.kind==="aportacion";
    const resta = aport ? 0 : p.saldo!=null ? p.saldo : Math.max(0,p.total-p.pagados)*p.cuota;
    rest += resta;
    const pct = p.total ? p.pagados/p.total : 0;
    const fin = p.ultimoCargo && p.total ? monthAdd(p.ultimoCargo, p.total-p.pagados) : "—";
    return `<div class="plan"><div class="plan-h"><b>${esc(p.nombre)}</b><b class="num">${aport?"Aportación":fmt(resta)}</b></div>
      ${p.total?`<div class="bar"><i style="width:${pct*100}%;background:var(--accent)"></i></div>`:""}
      <div class="plan-m"><span>${p.total?`${p.pagados} de ${p.total} · `:""}${fmt(p.cuota)}/${esc(p.periodo||"mes")}${c?` · ${esc(cname(c))}`:""}</span><span>${p.total?`Termina ${fin}`:esc(p.nota||"")}</span></div>
      ${p.nota && p.total?`<div class="plan-m"><span>${esc(p.nota)}</span></div>`:""}</div>`;
  }).join("") : `<p class="empty">Sin diferidos registrados.</p>`;
  $("plans-total").textContent = list.length ? "Resta " + fmt0(rest) : "";
}

/* ---------- Presupuesto ---------- */
const ingresoMes = b => b.ingresos ? b.ingresos.reduce((a,i)=>a+(i.frec==="quincenal"?2*(+i.monto||0):i.frec==="mensual"?(+i.monto||0):0),0) : (+b.ingresoMes||0);
function budgetStats(b){
  const ing = ingresoMes(b), buckets = (b.rule?.buckets)||[];
  const stats = buckets.map(k=>{
    const sum = b.items.filter(i=>bcats(k).includes(i.grupo)).reduce((a,i)=>a+(+i.mes||0),0);
    const pct = ing ? sum/ing*100 : 0;
    const st = pct < k.min-0.05 ? "under" : pct > k.max+0.05 ? "over" : "in-range";
    return {...k, sum, pct, st, target:ing*k.meta/100};
  });
  const sinGrupo = b.items.filter(i=>!buckets.some(k=>bcats(k).includes(i.grupo))).reduce((a,i)=>a+(+i.mes||0),0);
  const sum = b.items.reduce((a,i)=>a+(+i.mes||0),0);
  return {ing, stats, sinGrupo, sum, sobrante:ing-sum};
}
const CATS = [["nec","Necesidades"],["deu","Deudas"],["aho","Ahorro"],["gus","Gustos"]];
const PRESETS = {
  "deudas": {nombre:"Salir de deudas 45/20/20/15", desc:"Para tu etapa actual: pagar deuda cara sin dejar de ahorrar.", buckets:[
    {id:"nec",nombre:"Necesidades",cats:["nec"],meta:45,min:40,max:50,color:"#2457e6"},{id:"deu",nombre:"Deudas",cats:["deu"],meta:20,min:0,max:25,color:"#c0262d"},
    {id:"aho",nombre:"Ahorro",cats:["aho"],meta:20,min:15,max:30,color:"#1f8a4c"},{id:"gus",nombre:"Gustos",cats:["gus"],meta:15,min:10,max:20,color:"#d98a0b"}]},
  "503020": {nombre:"50/30/20", desc:"Clásica. Funciona cuando ya casi no hay deudas.", buckets:[
    {id:"nec",nombre:"Necesidades",cats:["nec"],meta:50,min:45,max:55,color:"#2457e6"},{id:"gus",nombre:"Gustos",cats:["gus"],meta:30,min:20,max:30,color:"#d98a0b"},
    {id:"aho",nombre:"Ahorro y deudas",cats:["aho","deu"],meta:20,min:20,max:35,color:"#1f8a4c"}]},
  "702010": {nombre:"70/20/10", desc:"Gastos de vida, ahorro y pago extra de deuda.", buckets:[
    {id:"vida",nombre:"Gastos de vida",cats:["nec","gus"],meta:70,min:60,max:70,color:"#2457e6"},{id:"aho",nombre:"Ahorro",cats:["aho"],meta:20,min:15,max:30,color:"#1f8a4c"},
    {id:"deu",nombre:"Deudas",cats:["deu"],meta:10,min:0,max:15,color:"#c0262d"}]},
  "8020": {nombre:"80/20 (págate primero)", desc:"Solo cuida que el 20% se ahorre antes de gastar.", buckets:[
    {id:"gas",nombre:"Gastos",cats:["nec","gus","deu"],meta:80,min:70,max:80,color:"#2457e6"},{id:"aho",nombre:"Ahorro",cats:["aho"],meta:20,min:20,max:40,color:"#1f8a4c"}]}
};
const bcats = k => k.cats && k.cats.length ? k.cats : [k.id];
const ST_LABEL = {"in-range":"En rango", over:"Arriba del rango", under:"Abajo del rango"};
const PALETTE = ["#2457e6","#c0262d","#1f8a4c","#d98a0b","#7a3fd1","#0e8f94"];
function draft(){
  if (!S.bdraft) S.bdraft = JSON.parse(JSON.stringify(S.budget));
  const d = S.bdraft;
  if (!d.rule) d.rule = {nombre:"Regla",buckets:[]};
  if (!d.ingresos) d.ingresos = [{concepto:"Ingreso",monto:(+d.ingresoMes||0)/2,frec:"quincenal"}];
  return d;
}
function renderBudget(){
  const b = S.bdraft || S.budget;
  if (!b){ $("budget").innerHTML = `<p class="empty">Sin presupuesto registrado.</p>`; return; }
  const {ing, stats, sinGrupo, sum, sobrante} = budgetStats(b);
  const metaSum = stats.reduce((a,k)=>a+(+k.meta||0),0);
  const groups = b.rule?.buckets||[];
  let h = "";
  // Ingresos
  const ingr = b.ingresos || [];
  h += `<div class="sec-head"><b>Ingresos</b><span class="sub num">Al mes ${fmt(ing)} · Quincena ${fmt(ing/2)}</span></div>`;
  if (S.budgetEdit){
    h += `<div style="overflow-x:auto"><table class="bt"><thead><tr><th>Concepto</th><th>Monto</th><th>Frecuencia</th><th class="x"></th></tr></thead><tbody>` +
      ingr.map((it,i)=>`<tr><td><input id="in-c-${i}" aria-label="Concepto" data-bf="inc" data-i="${i}" data-k="concepto" value="${esc(it.concepto)}"></td>
        <td style="width:100px"><input id="in-m-${i}" aria-label="Monto" type="number" step="0.01" min="0" data-bf="inc" data-i="${i}" data-k="monto" value="${it.monto}"></td>
        <td style="width:130px"><select id="in-f-${i}" aria-label="Frecuencia" data-bf="inc" data-i="${i}" data-k="frec">${FRECS.map(([v,l])=>`<option value="${v}"${v===it.frec?" selected":""}>${l}</option>`).join("")}</select></td>
        <td class="x"><button class="iconbtn" data-act="delinc" data-i="${i}" aria-label="Quitar ingreso">×</button></td></tr>`).join("") +
      `</tbody></table></div><div class="actions"><button class="btn sm" data-act="addinc">+ Agregar ingreso</button></div>`;
  } else {
    h += `<div style="overflow-x:auto"><table class="num"><thead><tr><th>Concepto</th><th>Monto</th><th>Frecuencia</th></tr></thead><tbody>${ingr.map(i=>`<tr><td>${esc(i.concepto)}</td><td>${fmt(i.monto)}</td><td>${esc((FRECS.find(f=>f[0]===i.frec)||["",""])[1])}</td></tr>`).join("")}</tbody></table></div>`;
    const ex = ingr.filter(i=>i.frec==="extra");
    if (ex.length) h += `<p class="sub" style="margin:0">Los extraordinarios (${fmt0(ex.reduce((a,i)=>a+(+i.monto||0),0))}) no se suman al ingreso mensual.</p>`;
  }
  // Regla
  h += `<div class="sec-head" style="margin-top:6px"><label class="sub" for="preset">Regla <select id="preset" class="pill" style="background-color:var(--bg);color:var(--ink)">
      ${Object.entries(PRESETS).map(([k,p])=>`<option value="${k}"${b.rule?.preset===k?" selected":""}>${esc(p.nombre)}</option>`).join("")}${b.rule?.preset?"":`<option selected value="">${esc(b.rule?.nombre||"Personalizada")}</option>`}</select></label>
    <button class="btn sm" data-act="ruleedit">${S.ruleEdit?"Cerrar":"Ajustar %"}</button></div>
    <p class="sub" style="margin:0">${esc(PRESETS[b.rule?.preset]?.desc||"Regla personalizada.")}${b.rule?.ajustada?" (ajustada)":""}</p>`;
  h += `<div class="stacked" role="img" aria-label="Distribución del ingreso">${stats.map(k=>`<i style="width:${Math.max(0,k.pct)}%;background:${esc(k.color)}"></i>`).join("")}${sinGrupo>0&&ing?`<i style="width:${sinGrupo/ing*100}%;background:var(--muted)"></i>`:""}</div>`;
  h += `<div>` + stats.map(k=>{
    const diff = k.target - k.sum;
    const adj = k.st==="in-range" ? "" : `<span>Para llegar a la meta: <b class="num">${diff>0?"+":"−"}${fmt0(Math.abs(diff))}</b> al mes</span>`;
    return `<div class="bkr"><div><span class="dot" style="background:${esc(k.color)}"></span> <b>${esc(k.nombre)}</b></div>
      <div class="num"><b>${fmt0(k.sum)}</b> <span class="sub">${k.pct.toFixed(1)}%</span></div>
      <div class="meta"><span class="chipst ${k.st}">${ST_LABEL[k.st]}</span><span>Meta ${k.meta}% (${k.min}–${k.max}%) · ${fmt0(k.target)}</span>${adj}</div></div>`;
  }).join("") + (sinGrupo>0?`<div class="bkr"><div><span class="dot" style="background:var(--muted)"></span> <b>Sin grupo</b></div><div class="num"><b>${fmt0(sinGrupo)}</b></div></div>`:"") + `</div>`;
  if (S.ruleEdit){
    h += `<div class="panel" style="background:var(--bg)"><label class="sub" for="rl-name">Nombre de la regla</label><input id="rl-name" data-bf="rulename" value="${esc(b.rule?.nombre||"")}" style="border:1px solid var(--line);border-radius:8px;padding:6px;background:var(--surface)">
      <div style="overflow-x:auto"><table class="bt"><thead><tr><th>Grupo</th><th>Meta %</th><th>Mín</th><th>Máx</th><th>Incluye</th></tr></thead><tbody>` +
      groups.map((k,i)=>`<tr><td><input id="rl-n-${i}" aria-label="Nombre del grupo" data-bf="rb" data-i="${i}" data-k="nombre" value="${esc(k.nombre)}"></td>
        <td><input id="rl-m-${i}" aria-label="Meta" type="number" step="1" min="0" max="100" data-bf="rb" data-i="${i}" data-k="meta" value="${k.meta}"></td>
        <td><input id="rl-a-${i}" aria-label="Mínimo" type="number" step="1" min="0" max="100" data-bf="rb" data-i="${i}" data-k="min" value="${k.min}"></td>
        <td><input id="rl-b-${i}" aria-label="Máximo" type="number" step="1" min="0" max="100" data-bf="rb" data-i="${i}" data-k="max" value="${k.max}"></td>
        <td class="sub">${bcats(k).map(c=>(CATS.find(x=>x[0]===c)||["",c])[1]).join(" + ")}</td></tr>`).join("") +
      `</tbody></table></div><div class="${metaSum===100?"sub":"warnline"}">Las metas suman ${metaSum}%${metaSum===100?"":" (deben sumar 100%)"}</div>
      <div class="actions"><button class="btn sm primary" data-act="savebudget">Guardar regla</button><button class="btn sm" data-act="canceldraft">Cancelar</button></div></div>`;
  }
  // Rubros
  h += `<div class="sec-head" style="margin-top:6px"><b>Rubros</b><button class="btn sm" data-act="budgetedit">${S.budgetEdit?"Cerrar edición":"Editar presupuesto"}</button></div>`;
  if (S.budgetEdit){
    h += `<div style="overflow-x:auto"><table class="bt"><thead><tr><th>Rubro</th><th>Mes</th><th>Tipo</th><th class="x"></th></tr></thead><tbody>` +
      b.items.map((it,i)=>`<tr><td><input id="b-r-${i}" aria-label="Rubro" data-bf="item" data-i="${i}" data-k="rubro" value="${esc(it.rubro)}"></td>
        <td style="width:96px"><input id="b-m-${i}" aria-label="Monto mensual" type="number" step="0.01" min="0" data-bf="item" data-i="${i}" data-k="mes" value="${it.mes}"></td>
        <td style="width:118px"><select id="b-g-${i}" aria-label="Grupo" data-bf="item" data-i="${i}" data-k="grupo"><option value="">Sin tipo</option>${CATS.map(([v,l])=>`<option value="${v}"${v===it.grupo?" selected":""}>${l}</option>`).join("")}</select></td>
        <td class="x"><button class="iconbtn" data-act="delitem" data-i="${i}" aria-label="Quitar rubro">×</button></td></tr>`).join("") +
      `</tbody></table></div><div class="actions"><button class="btn sm" data-act="additem">+ Agregar rubro</button><button class="btn sm primary" data-act="savebudget">Guardar presupuesto</button><button class="btn sm" data-act="canceldraft">Cancelar</button></div>`;
  } else {
    const gk = id => groups.find(k=>bcats(k).includes(id));
    h += `<div style="overflow-x:auto"><table class="num"><thead><tr><th>Rubro</th><th>Mes</th><th>Quincena</th><th>%</th></tr></thead><tbody>
      ${b.items.map(i=>{const g=gk(i.grupo);return `<tr><td><span class="dot" style="background:${esc(g?g.color:"var(--muted)")}"></span> ${esc(i.rubro)}</td><td>${fmt(+i.mes)}</td><td>${fmt(i.mes/2)}</td><td>${ing?(i.mes/ing*100).toFixed(1):0}%</td></tr>`;}).join("")}
      </tbody><tfoot><tr><td>Suma</td><td>${fmt(sum)}</td><td>${fmt(sum/2)}</td><td>${ing?(sum/ing*100).toFixed(1):0}%</td></tr>
      <tr><td>Sobrante</td><td>${fmt(sobrante)}</td><td>${fmt(sobrante/2)}</td><td>${ing?(sobrante/ing*100).toFixed(1):0}%</td></tr></tfoot></table></div>`;
  }
  $("budget").innerHTML = h;
}
function render(){ renderSummary(); renderNext(); renderStack(); renderDetail(); renderPlans(); renderBudget(); renderTrash(); }

/* ---------- Eventos ---------- */
function readAp(){ if (!S.apDraft) S.apDraft=[]; document.querySelectorAll("[data-ap]").forEach(el=>{ const i=+el.dataset.ap; if(S.apDraft[i]) S.apDraft[i][el.dataset.k] = el.type==="number" ? (el.value===""?null:parseFloat(el.value)) : el.value; }); }
function resetForms(){ S.editRow=null; S.addRow=null; S.chDate=null; S.newPer=false; S.editing=false; S.confirmDel=null; S.confirmRow=null; }
function openCard(id){ const c=card(id); if(!c) return; S.tab=c.tipo; S.sel=id; S.sheet=true; S.yr="todo"; S.openP=null; S.scrollBottom=true; resetForms();
  $("tab-tdc").setAttribute("aria-selected",S.tab==="TDC"); $("tab-tdd").setAttribute("aria-selected",S.tab==="TDD"); render(); $("detail").scrollTop=0; }
document.addEventListener("change", async e=>{
  const el = e.target.closest("select[data-period]");
  if (!el) return;
  const p = S.periods.find(x=>x.id===el.dataset.period);
  if (!p || !db) return;
  el.className = el.className.replace(/st-\w+/,"st-"+el.value);
  await save(()=>db.doc("periods/"+p.id).update({status:el.value}));
});
document.addEventListener("change", e=>{
  if (e.target.id==="yr-filter"){ S.yr=e.target.value; S.openP=null; S.scrollBottom=true; resetForms(); renderDetail(); }
  if (e.target.closest("[data-bf]") && e.target.type==="number") renderBudget();
});
document.addEventListener("change", async e=>{
  const el = e.target.closest("[data-pick]"); if (!el) return;
  const ids = [...document.querySelectorAll("[data-pick]")].filter(x=>x.checked).map(x=>x.dataset.pick);
  const allIds = S.cards.filter(c=>c.tipo===S.tab).map(c=>c.id);
  const other = (S.wallet?.visibles||[]).filter(id=>!allIds.includes(id));
  const mark = "__none_"+S.tab, base = other.filter(x=>x!==mark);
  const vis = ids.length===allIds.length ? base : ids.length ? [...base, ...ids] : [...base, mark];
  S.wallet = {...(S.wallet||{}), visibles: vis}; renderStack();
  if (db) await save(()=>db.doc("config/wallet").set({...S.wallet}));
});
document.addEventListener("change", async e=>{
  if (e.target.id!=="preset" || !e.target.value) return;
  const P0 = PRESETS[e.target.value]; const d = draft();
  d.rule = {nombre:P0.nombre, preset:e.target.value, ajustada:false, buckets:JSON.parse(JSON.stringify(P0.buckets))};
  d.ingresoMes = ingresoMes(d);
  if (db) await save(()=>db.doc("config/budget").set(d));
  S.bdraft=null; S.ruleEdit=false; S.budgetEdit=false; renderBudget();
});
document.addEventListener("input", e=>{
  const el = e.target.closest("[data-bf]"); if (!el) return;
  const d = draft(); const f = el.dataset.bf, i = +el.dataset.i, k = el.dataset.k;
  const val = el.type==="number" ? (el.value===""?0:parseFloat(el.value)) : el.value;
  if (f==="rulename") d.rule.nombre = val;
  if (f==="item") d.items[i][k] = val;
  if (f==="rb") d.rule.buckets[i][k] = val;
  if (f==="inc") d.ingresos[i][k] = val;
  if (el.tagName==="SELECT") renderBudget();
});
document.addEventListener("keydown", e=>{
  if (e.key==="Escape" && S.sheet){ S.sheet=false; resetForms(); renderDetail(); return; }
  if ((e.key==="Enter"||e.key===" ") && e.target.matches("tr.r")){ e.preventDefault(); e.target.click(); }
});
document.addEventListener("click", async e=>{
  if (e.target.closest("select,input,label.pick,label.chk")) return;
  const op = e.target.closest("[data-open]");
  if (op){ openCard(op.dataset.open); return; }
  const wc = e.target.closest("[data-card]");
  if (wc){ openCard(wc.dataset.card); return; }
  if (e.target.id==="tab-tdc"||e.target.id==="tab-tdd"){
    S.tab = e.target.id==="tab-tdc"?"TDC":"TDD"; S.sel=null; S.picking=false; resetForms();
    $("tab-tdc").setAttribute("aria-selected",S.tab==="TDC"); $("tab-tdd").setAttribute("aria-selected",S.tab==="TDD");
    render(); return;
  }
  const wv = e.target.closest("[data-wv]");
  if (wv){ S.wallet={...(S.wallet||{visibles:[]}), vista:wv.dataset.wv}; renderStack(); if (db) await save(()=>db.doc("config/wallet").set({...S.wallet})); return; }
  const wf = e.target.closest("[data-wf]");
  if (wf){ S.wf = wf.dataset.wf; S.picking = false; renderStack(); return; }
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act, pid = a.dataset.p, idx = a.dataset.i!==undefined && a.dataset.i!=="" ? +a.dataset.i : null;
  const P = pid ? S.periods.find(x=>x.id===pid) : null;
  switch(act){
    case "pickopen": S.picking=true; renderStack(); return;
    case "picknone": { const allIds=S.cards.filter(c=>c.tipo===S.tab).map(c=>c.id); const vis=[...(S.wallet?.visibles||[]).filter(id=>!allIds.includes(id)&&id!=="__none_"+S.tab),"__none_"+S.tab];
      S.wallet={...(S.wallet||{}),visibles:vis}; renderStack(); if (db) await save(()=>db.doc("config/wallet").set({...S.wallet})); return; }
    case "trashopen": S.trashOpen=true; renderTrash(); return;
    case "trashclose": S.trashOpen=false; S.confirmTrash=null; renderTrash(); return;
    case "restore": { const t=S.trash.find(x=>x.id===a.dataset.t); if(!t||!db) return;
      await save(async()=>{
        if (t.tipo==="periodo") await db.doc("periods/"+t.pid).set(t.data);
        else { const P2=S.periods.find(x=>x.id===t.pid);
          if (P2) await db.doc("periods/"+t.pid).update({items:[...(P2.items||[]).map(i=>({...i})), t.data]});
          else await db.doc("periods/"+t.pid).set({card:t.card, due:t.due||todayISO, status:"abierto", items:[t.data]}); }
        await db.doc("trash/"+t.id).delete(); });
      return; }
    case "purge": { const id=a.dataset.t; if (S.confirmTrash!==id){ S.confirmTrash=id; renderTrash(); return; }
      if (db) await save(()=>db.doc("trash/"+id).delete()); S.confirmTrash=null; return; }
    case "addap": readAp(); S.apDraft.push({nombre:"Nuevo apartado",saldo:0}); renderDetail(); return;
    case "delap": readAp(); S.apDraft.splice(idx,1); renderDetail(); return;
    case "pickdone": S.picking=false; renderStack(); return;
    case "pickall": { const allIds=S.cards.filter(c=>c.tipo===S.tab).map(c=>c.id); const vis=(S.wallet?.visibles||[]).filter(id=>!allIds.includes(id)&&id!=="__none_"+S.tab);
      S.wallet={...(S.wallet||{}),visibles:vis}; renderStack(); if (db) await save(()=>db.doc("config/wallet").set({...S.wallet})); return; }
    case "togglep": { const was=S.openP===pid; resetForms(); S.openP = was?null:pid; break; }
    case "editrow": resetForms(); S.editRow={p:pid,i:idx}; break;
    case "addrow": resetForms(); S.addRow=pid; break;
    case "chdate": resetForms(); S.chDate=pid; break;
    case "newper": resetForms(); S.newPer=true; break;
    case "editcard": { const was=S.editing; resetForms(); S.editing=!was; const c0=card(S.sel); S.apDraft=(c0?.apartados||[]).map(x=>({...x})); break; }
    case "cancel": resetForms(); break;
    case "closesheet": S.sheet=false; resetForms(); break;
    case "delper":
      if (S.confirmDel!==pid){ S.confirmDel=pid; break; }
      if (db){ const {id, ...data} = JSON.parse(JSON.stringify(P)); await save(async()=>{ await toTrash({tipo:"periodo", card:P.card, pid, data}); await db.doc("periods/"+pid).delete(); }); }
      resetForms(); S.openP=null; break;
    case "delrow": {
      const key = pid+":"+idx;
      if (S.confirmRow!==key){ S.confirmRow=key; break; }
      const items = (P.items||[]).filter((_,j)=>j!==idx).map(i=>({...i}));
      if (db) await save(async()=>{ await toTrash({tipo:"gasto", card:P.card, pid, due:P.due, data:{...P.items[idx]}}); await db.doc("periods/"+pid).update({items}); });
      resetForms(); break;
    }
    case "ruleedit": S.ruleEdit=!S.ruleEdit; if(!S.ruleEdit && !S.budgetEdit) S.bdraft=null; else draft(); renderBudget(); return;
    case "budgetedit": S.budgetEdit=!S.budgetEdit; if(!S.ruleEdit && !S.budgetEdit) S.bdraft=null; else draft(); renderBudget(); return;
    case "canceldraft": S.bdraft=null; S.ruleEdit=false; S.budgetEdit=false; renderBudget(); return;
    case "additem": draft().items.push({rubro:"Nuevo rubro",mes:0,grupo:""}); renderBudget(); return;
    case "delitem": draft().items.splice(idx,1); renderBudget(); return;
    case "addinc": draft().ingresos.push({concepto:"Nuevo ingreso",monto:0,frec:"quincenal"}); renderBudget(); return;
    case "delinc": draft().ingresos.splice(idx,1); renderBudget(); return;
    case "addbucket": { const d=draft(); const n=d.rule.buckets.length; d.rule.buckets.push({id:"g"+Date.now().toString(36),nombre:"Nuevo grupo",meta:0,min:0,max:10,color:PALETTE[n%PALETTE.length]}); renderBudget(); return; }
    case "delbucket": { const d=draft(); const k=d.rule.buckets[idx]; d.rule.buckets.splice(idx,1); d.items.forEach(i=>{ if(i.grupo===k.id) i.grupo=""; }); renderBudget(); return; }
    case "savebudget": {
      const d = draft();
      d.items = d.items.map(i=>({rubro:String(i.rubro||"").trim()||"Sin nombre", mes:Math.round((+i.mes||0)*100)/100, grupo:i.grupo||""}));
      d.ingresos = d.ingresos.map(i=>({concepto:String(i.concepto||"").trim()||"Ingreso", monto:Math.round((+i.monto||0)*100)/100, frec:i.frec||"quincenal"}));
      d.ingresoMes = ingresoMes(d);
      if (S.ruleEdit && d.rule.preset){ const P0=PRESETS[d.rule.preset]; d.rule.ajustada = JSON.stringify(P0.buckets.map(k=>[k.meta,k.min,k.max])) !== JSON.stringify(d.rule.buckets.map(k=>[+k.meta,+k.min,+k.max])); }
      d.rule.buckets = d.rule.buckets.map(k=>({...k, cats:bcats(k), meta:+k.meta||0, min:+k.min||0, max:Math.max(+k.max||0,+k.min||0)}));
      if (db) await save(()=>db.doc("config/budget").set(d));
      S.bdraft=null; S.ruleEdit=false; S.budgetEdit=false; renderBudget(); return;
    }
  }
  renderDetail();
});
document.addEventListener("submit", async e=>{
  e.preventDefault();
  if (!db) return;
  const form = e.target, kind = form.dataset.form, c = card(S.sel);
  if (kind==="row"){
    const pid = form.dataset.p, P = S.periods.find(x=>x.id===pid);
    const item = {fecha:$("rf-fecha").value||null, concepto:$("rf-concepto").value.trim(), monto:Math.round(parseFloat($("rf-monto").value)*100)/100};
    if (!item.concepto || !(item.monto>=0)) return;
    const items = (P.items||[]).map(i=>({...i}));
    if (form.dataset.i==="") items.push(item); else items[+form.dataset.i] = item;
    await save(()=>db.doc("periods/"+pid).update({items}));
  }
  if (kind==="chdate"){
    const due = $("cd-date").value; if (!due) return;
    await save(()=>db.doc("periods/"+form.dataset.p).update({due, fechaRevisar:false}));
  }
  if (kind==="newper"){
    const due = $("np-date").value; if (!due) return;
    const id = c.id+"-"+due;
    if (S.periods.find(x=>x.id===id)){ $("sync").textContent="Ya existe un periodo con esa fecha"; return; }
    await save(()=>db.doc("periods/"+id).set({card:c.id,due,status:"abierto",items:[]}));
    S.openP = id; S.scrollBottom = true;
  }
  if (kind==="card"){
    const num = id => { const v=$(id)?.value; return v===""||v==null ? null : parseFloat(v); };
    const upd = {beneficio:$("e-ben").value.trim(), uso:$("e-uso").value.trim(), enUso:$("e-enuso").checked, contactless:$("e-ctl").checked, congelada:$("e-frz").checked};
    if (c.tipo==="TDC"){
      upd.limite=num("e-lim"); upd.saldoBanco=num("e-saldo"); upd.dispBanco=num("e-disp"); upd.saldoCorte=num("e-scorte"); upd.pagoNoInt=num("e-pni");
      upd.fechaCorte=$("e-corte").value||null; upd.fechaLimite=$("e-flim").value||null;
      if (upd.limite!=null && c.limite!=null && upd.limite!==c.limite)
        upd.historialLimite = [...(c.historialLimite||[]).map(x=>({...x})), {fecha:todayISO, de:c.limite, a:upd.limite}];
    } else { upd.saldo = num("e-saldo"); readAp(); upd.apartados = (S.apDraft||[]).filter(x=>String(x.nombre||"").trim()).map(x=>({nombre:String(x.nombre).trim(), saldo:+x.saldo||0})); }
    await save(()=>db.doc("cards/"+c.id).update(upd));
  }
  const keepOpen = S.openP; resetForms(); S.openP = keepOpen; renderDetail();
});
async function save(fn){
  $("sync").textContent = "Guardando…";
  try { await fn(); $("sync").textContent = "Guardado"; }
  catch(err){
    try { await new Promise(r=>setTimeout(r,600+Math.random()*600)); await fn(); $("sync").textContent="Guardado"; }
    catch(e2){ $("sync").textContent = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo."; }
  }
}

/* ---------- Datos ---------- */
render();
(async ()=>{
  const timer = setTimeout(()=>{ $("sync").textContent = "Sin conexión a tus datos todavía"; }, 10000);
  try { db = await (window.claude && window.claude.use ? window.claude.use("db") : null); } catch(e){ db = null; }
  if (!db){ clearTimeout(timer); $("sync").textContent = "Abre la página con tu cuenta para ver tus datos"; return; }
  const got = new Set();
  const done = (k, snap) => { got.add(k); if (!snap.metadata.fromCache && got.size>=5){ clearTimeout(timer); $("sync").textContent = "Al día"; } render(); };
  const fail = () => { clearTimeout(timer); $("sync").textContent = "No se pudieron cargar los datos"; };
  db.collection("cards").onSnapshot(s=>{ S.cards = s.docs.map(d=>({id:d.id,...d.data()})); done("c",s); }, fail);
  db.collection("periods").onSnapshot(s=>{ S.periods = s.docs.map(d=>({id:d.id,...d.data()})); done("p",s); }, fail);
  db.collection("plans").onSnapshot(s=>{ S.plans = s.docs.map(d=>({id:d.id,...d.data()})); done("l",s); }, fail);
  db.doc("config/budget").onSnapshot(s=>{ S.budget = s.exists ? s.data() : null; done("b",s); }, fail);
  db.collection("trash").onSnapshot(s=>{ S.trash = s.docs.map(d=>({id:d.id,...d.data()})); renderTrash(); }, ()=>{});
  db.doc("config/wallet").onSnapshot(s=>{ S.wallet = s.exists ? s.data() : {visibles:[]}; done("w",s); }, fail);
})();
