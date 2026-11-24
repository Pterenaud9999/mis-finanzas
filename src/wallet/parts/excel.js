/* ================= Exportar Excel (formato de tu Excel de TDC) ================= */
const XL_ST = { // colores tomados de GASTOS_17-10-26_0.xlsx
  abierto:   {fill:"FFFF00", font:"000000", lab:"Abierto"},
  apartado:  {fill:"5B9BD5", font:"FFFFFF", lab:"Apartado"},
  apartado50:{fill:"F4B183", font:"000000", lab:"Apartado 50%"},
  pagado:    {fill:"A9D08E", font:"000000", lab:"Pagado"},
  riesgo:    {fill:"FF7C80", font:"000000", lab:"En riesgo"},
  parcial:   {fill:"F4B183", font:"000000", lab:"Pago parcial"},
};
const XL_HDR = {fecha:"B4C6E7", rotulo:"FFD966", titulo:"00B050", deuda:"2F5597"};
let xlLib = null;
function xlLoad(){
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if (xlLib) return xlLib;
  const src = window.MF_PWA ? "vendor/exceljs.min.js" : "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
  return xlLib = new Promise((ok,ko)=>{ const s = document.createElement("script"); s.src = src; s.onload = ()=>ok(window.ExcelJS); s.onerror = ()=>{ xlLib = null; ko(new Error("No se pudo cargar el generador de Excel")); }; document.head.appendChild(s); });
}
/* Modelo de hoja simple → ExcelJS */
const XLM = { encode_cell: ({r,c}) => r+":"+c };
function xlNewSheet(){ return {cells:{}, merges:[], cols:[]}; }
function xlToExcel(wb, name, m){
  const ws = wb.addWorksheet(name, {views:[{showGridLines:true}]});
  m.cols.forEach((w,i)=>{ if (w) ws.getColumn(i+1).width = w.wch; });
  Object.entries(m.cells).forEach(([k, c])=>{
    const [r, col] = k.split(":").map(Number), cell = ws.getCell(r+1, col+1), st = c.s||{};
    cell.value = c.v;
    if (st.numFmt) cell.numFmt = st.numFmt;
    if (st.font) cell.font = {name:st.font.name, size:st.font.sz, bold:st.font.bold, color:{argb:"FF"+st.font.color.rgb}};
    if (st.fill) cell.fill = {type:"pattern", pattern:"solid", fgColor:{argb:"FF"+st.fill.fgColor.rgb}, bgColor:{indexed:64}};
    const b = {style:"thin", color:{argb:"FFBFBFBF"}}; cell.border = {top:b, left:b, bottom:b, right:b};
    if (st.alignment) cell.alignment = {vertical:"middle", horizontal:st.alignment.horizontal, wrapText:!!st.alignment.wrapText};
  });
  m.merges.forEach(g=>ws.mergeCells(g.s.r+1, g.s.c+1, g.e.r+1, g.e.c+1));
  return ws;
}
const xlTDC = () => S.cards.filter(c=>c.tipo==="TDC").sort((a,b)=>(a.orden||0)-(b.orden||0));
const xlPer = id => S.periods.filter(p=>p.card===id && p.due).sort((a,b)=>a.due.localeCompare(b.due));
const xlLabel = p => `Pago ${dLong(p.due)}`;

/* ---------- Pantalla "Exportar Excel" ---------- */
function xlOpen(){
  const cards = xlTDC();
  const sel = {}; cards.forEach(c=>{ const ps = xlPer(c.id); if (ps.length) sel[c.id] = {on: isUso(c), from: ps[0].id, to: ps[ps.length-1].id}; });
  const y = today.getFullYear();
  S.xl = {modo:"tarjetas", desde:`${y}-01-01`, hasta:todayISO, sel, hojas:{tdc:true, resumen:true, pagos:true, msi:true, gastos:true}, msg:""};
  let box = document.getElementById("xlx");
  if (!box){ box = document.createElement("div"); box.id = "xlx"; box.className = "sheet"; box.setAttribute("role","dialog"); box.setAttribute("aria-label","Exportar Excel"); document.body.appendChild(box); }
  box.hidden = false; document.body.classList.add("locked"); xlRender(); box.scrollTop = 0;
}
function xlClose(){ const b = document.getElementById("xlx"); if (b){ b.hidden = true; b.innerHTML = ""; } S.xl = null; if (!S.sheet && !S.tx) document.body.classList.remove("locked"); }
function xlRender(){
  const box = document.getElementById("xlx"), x = S.xl; if (!box || !x) return;
  const cards = xlTDC();
  let h = `<div class="sheet-in"><div class="sheet-top"><button class="btn" data-act="xlclose">←</button><b>Exportar Excel</b></div>
    <div class="tx-sec"><span class="sub">Elegir periodo</span></div>
    <div class="seg">${[["tarjetas","Por tarjetas y cortes"],["fechas","Por fechas"]].map(([v,l])=>`<button type="button" data-act="xlmodo" data-v="${v}" aria-pressed="${x.modo===v}">${l}</button>`).join("")}</div>`;
  if (x.modo==="fechas"){
    h += `<div class="det-grid"><label for="xl-desde"><span class="sub">Desde</span><input id="xl-desde" type="date" class="tx-in" value="${esc(x.desde)}"></label>
      <label for="xl-hasta"><span class="sub">Hasta</span><input id="xl-hasta" type="date" class="tx-in" value="${esc(x.hasta)}"></label></div>
      <p class="sub" style="margin:0">Incluye los cortes cuya fecha de pago cae en ese rango, en todas las tarjetas.</p>`;
  } else {
    h += `<div class="actions"><button type="button" class="btn sm" data-act="xlall" data-v="1">Todas</button><button type="button" class="btn sm" data-act="xlall" data-v="0">Ninguna</button><button type="button" class="btn sm" data-act="xlall" data-v="uso">Solo en uso</button></div>
      <div class="xl-cards">`;
    cards.forEach(c=>{
      const ps = xlPer(c.id), s = x.sel[c.id];
      if (!ps.length){ h += `<div class="xl-card off"><label><input type="checkbox" disabled> <b>${esc(cname(c))}</b></label><span class="sub">Sin cortes registrados</span></div>`; return; }
      const opt = (cur) => ps.map(p=>`<option value="${esc(p.id)}"${p.id===cur?" selected":""}>${esc(xlLabel(p))}</option>`).join("");
      const iF = ps.findIndex(p=>p.id===s.from), iT = ps.findIndex(p=>p.id===s.to), n = iT>=iF ? iT-iF+1 : 0;
      h += `<div class="xl-card${s.on?"":" off"}"><label><input type="checkbox" data-xlc="${esc(c.id)}" ${s.on?"checked":""}> <span class="xl-dot" style="background:${esc(c.color||"#888")}"></span><b>${esc(cname(c))}</b></label>
        <span class="sub">Desde ${dLong(ps[0].due)} · ${ps.length} cortes</span>`;
      if (s.on) h += `<div class="det-grid"><label><span class="sub">Desde el corte</span><select data-xlf="${esc(c.id)}">${opt(s.from)}</select></label>
          <label><span class="sub">Hasta el corte</span><select data-xlt="${esc(c.id)}">${opt(s.to)}</select></label></div>
          <span class="sub">${n ? `${n} corte${n>1?"s":""} seleccionado${n>1?"s":""}` : `<span style="color:var(--bad)">El corte inicial va después del final</span>`}</span>`;
      h += `</div>`;
    });
    h += `</div>`;
  }
  h += `<div class="tx-sec"><span class="sub">Hojas</span></div><div class="xl-hojas">${[["tdc","TDC'S"],["resumen","Resumen"],["pagos","Pagos"],["msi","MSI"],["gastos","Gastos"]].map(([k,l])=>`<label><input type="checkbox" data-xlh="${k}" ${x.hojas[k]?"checked":""}> ${l}</label>`).join("")}</div>
    ${x.msg?`<p class="sub" style="margin:0">${x.msg}</p>`:""}
    <div class="tx-foot"><button type="button" class="btn primary tx-save" data-act="xlgo" ${x.busy?"disabled":""}>${x.busy?"Generando…":"Generar Excel"}</button></div></div>`;
  const keep = box.scrollTop; box.innerHTML = h; box.scrollTop = keep;
}
function xlSelection(){
  const x = S.xl, out = [];
  xlTDC().forEach(c=>{
    const ps = xlPer(c.id); if (!ps.length) return;
    let use;
    if (x.modo==="fechas") use = ps.filter(p=>p.due>=x.desde && p.due<=x.hasta);
    else { const s = x.sel[c.id]; if (!s || !s.on) return; const iF = ps.findIndex(p=>p.id===s.from), iT = ps.findIndex(p=>p.id===s.to); use = iT>=iF ? ps.slice(iF, iT+1) : []; }
    if (use.length) out.push({c, ps:use});
  });
  return out;
}

/* ---------- Construcción del libro ---------- */
const xlB = {style:"thin", color:{rgb:"BFBFBF"}};
const xlBorder = {top:xlB, bottom:xlB, left:xlB, right:xlB};
function xlCell(v, o={}){
  const isD = v && typeof v==="object" && v.__d!=null;
  if (typeof v==="number") v = Math.round(v*100)/100;
  const c = isD ? {v:v.__d, t:"n"} : {v: v==null ? "" : v, t: typeof v==="number" ? "n" : "s"};
  const s = {font:{name:"Calibri", sz:o.sz||11, bold:!!o.b, color:{rgb:o.fc||"000000"}}, border:xlBorder, alignment:{vertical:"center", horizontal:o.al||(c.t==="n"?"right":"left"), wrapText:!!o.wrap}};
  if (o.fill) s.fill = {patternType:"solid", fgColor:{rgb:o.fill}};
  if (c.t==="n") s.numFmt = isD ? "dd-mmm-yy" : (o.fmt || "#,##0.00");
  if (isD) s.alignment.horizontal = o.al || "center";
  c.s = s; return c;
}
const xlDate = iso => { if (!iso) return ""; const d = parseD(iso); return {__d: Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899,11,30))/86400000)}; };
function xlSheetTDC(sel){
  const m = xlNewSheet(), merges = m.merges, cols = m.cols; let maxR = 0;
  const put = (r, c, cell) => { m.cells[XLM.encode_cell({r, c})] = cell; if (r>maxR) maxR = r; };
  put(0, 1, xlCell("TARJETAS DE CRÉDITO", {b:true, sz:18, fill:XL_HDR.titulo, fc:"FFFFFF", al:"center"}));
  merges.push({s:{r:0,c:1}, e:{r:0,c:Math.max(1, sel.length*4-2)}});
  sel.forEach(({c, ps}, k)=>{
    const c0 = 1 + k*4, u = cardUsage(c);
    cols[c0] = {wch:11}; cols[c0+1] = {wch:34}; cols[c0+2] = {wch:13}; cols[c0+3] = {wch:3};
    const hex = String(c.color||"#1F4E3D").replace("#","").slice(0,6).toUpperCase();
    put(1, c0, xlCell(cname(c).toUpperCase(), {b:true, sz:13, fill:hex, fc:"FFFFFF", al:"center"})); merges.push({s:{r:1,c:c0}, e:{r:1,c:c0+2}});
    const info = [["FECHA DE CORTE", c.fechaCorte ? xlDate(c.fechaCorte) : ""],["FECHA DE LÍMITE", c.fechaLimite ? xlDate(c.fechaLimite) : ""],["LÍMITE DE CRÉDITO", +c.limite||0],["DISPONIBLE", +u.disp||0],["SALDO USADO", +u.used||0]];
    info.forEach(([l,v],i)=>{ put(2+i, c0, xlCell(l, {b:true, fill:XL_HDR.rotulo})); merges.push({s:{r:2+i,c:c0}, e:{r:2+i,c:c0+1}}); put(2+i, c0+1, xlCell("", {fill:XL_HDR.rotulo})); put(2+i, c0+2, xlCell(v, {b:true})); });
    put(8, c0, xlCell("DEUDAS", {b:true, fill:XL_HDR.deuda, fc:"FFFFFF", al:"center"})); merges.push({s:{r:8,c:c0}, e:{r:8,c:c0+2}});
    let r = 10;
    ps.forEach(p=>{
      const st = XL_ST[p.status] || XL_ST.abierto;
      put(r, c0, xlCell(xlDate(p.due), {b:true, fill:XL_HDR.fecha, al:"center"}));
      put(r, c0+1, xlCell(`Fecha de pago · ${st.lab}`, {b:true, fill:XL_HDR.fecha}));
      put(r, c0+2, xlCell(total(p), {b:true, fill:XL_HDR.fecha}));
      r++;
      put(r, c0, xlCell("TOTAL", {b:true, fill:st.fill, fc:st.font})); put(r, c0+1, xlCell(p.status!=="pagado" && pagado(p) ? `Pagado ${fmt(pagado(p))} · faltan ${fmt(faltante(p))}` : "", {fill:st.fill, fc:st.font}));
      put(r, c0+2, xlCell(total(p), {b:true, fill:st.fill, fc:st.font})); r++;
      (p.items||[]).slice().sort((a,b)=>(a.fecha||"").localeCompare(b.fecha||"")).forEach(it=>{
        const pag = p.status==="pagado" || it.pagoId; const f = pag ? XL_ST.pagado : st;
        put(r, c0, xlCell(it.fecha ? xlDate(it.fecha) : "", {fill:f.fill, fc:f.font, al:"center"}));
        put(r, c0+1, xlCell((it.concepto||"") + (it.pagoId && p.status!=="pagado" ? " ✓" : ""), {fill:f.fill, fc:f.font}));
        put(r, c0+2, xlCell(+it.monto||0, {fill:f.fill, fc:f.font})); r++;
      });
      r++;
    });
  });
  cols[0] = {wch:3}; for (let i=0;i<cols.length;i++) if (!cols[i]) cols[i] = {wch:3};
  return m;
}
function xlTable(head, rows, widths){
  const m = xlNewSheet();
  [head.map(t=>xlCell(t, {b:true, fill:XL_HDR.deuda, fc:"FFFFFF", al:"center"})), ...rows.map(r=>r.map(v=>xlCell(v)))].forEach((r,i)=>r.forEach((c,j)=>{ m.cells[i+":"+j] = c; }));
  m.cols = widths.map(w=>({wch:w})); return m;
}
async function xlGenerate(){
  const x = S.xl; if (!x || x.busy) return;
  const sel = xlSelection();
  if (!sel.length && (x.hojas.tdc || x.hojas.pagos || x.hojas.msi)){ x.msg = "Elige al menos una tarjeta con cortes."; xlRender(); return; }
  if (!Object.values(x.hojas).some(Boolean)){ x.msg = "Elige al menos una hoja."; xlRender(); return; }
  x.busy = true; x.msg = "Preparando el archivo…"; xlRender();
  try {
    const EJ = await xlLoad(), wb = new EJ.Workbook(); wb.creator = "Mis finanzas"; wb.created = new Date();
    const add = (m, name) => xlToExcel(wb, name, m);
    const allP = sel.flatMap(s=>s.ps);
    const dues = allP.map(p=>p.due).sort();
    const desde = x.modo==="fechas" ? x.desde : (dues[0] ? addMonthsISO(dues[0], -2) : x.desde);
    const hasta = x.modo==="fechas" ? x.hasta : (dues[dues.length-1] || x.hasta);
    if (x.hojas.tdc && sel.length) add(xlSheetTDC(sel), "TDC'S");
    if (x.hojas.resumen){
      const rows = xlTDC().map(c=>{ const u = cardUsage(c), nx = xlPer(c.id).filter(p=>p.status!=="pagado"&&faltante(p)>0)[0];
        return [cname(c), isUso(c)?"Sí":"No", +c.limite||0, +u.disp||0, +u.used||0, nx?xlDate(nx.due):"", nx?faltante(nx):0, c.fechaCorte?xlDate(c.fechaCorte):""]; });
      add(xlTable(["Tarjeta","En uso","Línea","Disponible","Saldo usado","Próximo pago","Monto por pagar","Fecha de corte"], rows, [26,8,13,13,13,14,15,14]), "Resumen");
    }
    if (x.hojas.pagos){
      const rows = []; allP.forEach(p=>(p.pagos||[]).forEach(g=>rows.push([xlDate(g.f), cname(card(p.card)), xlDate(p.due), g.cta, ({total:"Total",minimo:"Mínimo",otro:"Otro monto",concepto:"Por concepto"})[g.tipo]||g.tipo||"", (g.conceptos||[]).join(", "), +g.m||0])));
      rows.sort((a,b)=>(a[0].__d||0)-(b[0].__d||0));
      add(xlTable(["Fecha","Tarjeta","Corte (pago)","Desde la cuenta","Tipo","Conceptos","Monto"], rows, [12,24,13,24,13,30,13]), "Pagos");
    }
    if (x.hojas.msi){
      const ids = new Set(sel.map(s=>s.c.id));
      const rows = S.plans.filter(p=>p.kind==="msi" && (!p.card || ids.has(p.card))).map(p=>{
        let tot = p.total||0, pag = p.pagados||0, resta = (tot-pag)*(+p.cuota||0);
        if (p.movId){ const its = S.periods.flatMap(q=>(q.items||[]).filter(i=>i.movId===p.movId && !i.adelanto).map(i=>[q.status==="pagado", +i.monto||0])); tot = its.length; pag = its.filter(i=>i[0]).length; resta = its.filter(i=>!i[0]).reduce((a,i)=>a+i[1],0); }
        return [p.nombre||"", p.card?cname(card(p.card)):"", +p.cuota||0, pag, tot, Math.max(0,tot-pag), resta, +p.intereses||0]; });
      add(xlTable(["Compra","Tarjeta","Mensualidad","Pagadas","Total","Faltan","Saldo por pagar","Intereses"], rows, [30,24,13,9,8,8,15,12]), "MSI");
    }
    if (x.hojas.gastos){
      const rows = itemsRange(desde, hasta).sort((a,b)=>a.f.localeCompare(b.f)).map(it=>[xlDate(it.f), it.t==="g"?"Gasto":"Ingreso", it.cat, it.cta||"", it.n||"", it.t==="g" ? -(+it.m||0) : (+it.m||0), it.tdc ? (({contado:"Contado",msi:"MSI",mci:"Con intereses"})[it.pago||"contado"]) : ""]);
      add(xlTable(["Fecha","Tipo","Categoría","Cuenta","Comentario","Monto","Forma de pago"], rows, [12,9,22,26,30,13,14]), "Gastos");
    }
    const fname = `mis-finanzas-${x.modo==="fechas"?x.desde+"_a_"+x.hasta:"tdc-"+todayISO}.xlsx`;
    const out = await wb.xlsx.writeBuffer();
    const blob = new Blob([out], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const file = new File([blob], fname, {type:blob.type});
    x.busy = false;
    if (navigator.canShare && navigator.canShare({files:[file]})){
      try { await navigator.share({files:[file], title:"Mis finanzas (Excel)"}); x.msg = "Excel listo."; xlRender(); return; }
      catch(e){ if (e?.name==="AbortError"){ x.msg = "Cancelado."; xlRender(); return; } }
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    x.msg = `Excel descargado: ${fname}`; xlRender();
  } catch(e){ x.busy = false; x.msg = "No se pudo generar: " + (e?.message||e); xlRender(); }
}

document.addEventListener("click", e=>{
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (act==="xlopen"){ e.stopImmediatePropagation(); if (typeof openDrawer==="function") openDrawer(false); xlOpen(); return; }
  if (!S.xl || !["xlclose","xlmodo","xlall","xlgo"].includes(act)) return;
  e.stopImmediatePropagation();
  if (act==="xlclose") return xlClose();
  if (act==="xlmodo"){ S.xl.modo = a.dataset.v; S.xl.msg = ""; return xlRender(); }
  if (act==="xlall"){ xlTDC().forEach(c=>{ const s = S.xl.sel[c.id]; if (s) s.on = a.dataset.v==="uso" ? isUso(c) : a.dataset.v==="1"; }); return xlRender(); }
  if (act==="xlgo") return xlGenerate();
}, true);
document.addEventListener("change", e=>{
  const x = S.xl; if (!x) return; const t = e.target;
  if (t.dataset.xlc){ x.sel[t.dataset.xlc].on = t.checked; return xlRender(); }
  if (t.dataset.xlf){ x.sel[t.dataset.xlf].from = t.value; return xlRender(); }
  if (t.dataset.xlt){ x.sel[t.dataset.xlt].to = t.value; return xlRender(); }
  if (t.dataset.xlh){ x.hojas[t.dataset.xlh] = t.checked; return; }
  if (t.id==="xl-desde"){ x.desde = t.value; return; }
  if (t.id==="xl-hasta"){ x.hasta = t.value; return; }
});
document.addEventListener("keydown", e=>{ if (e.key==="Escape" && S.xl){ e.stopImmediatePropagation(); xlClose(); } }, true);
