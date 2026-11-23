/* ================= Registro de transacción (como en tu app) ================= */
const TK_BASE = [["fv","Frutas y verduras","#2fbf4f"],["prot","Proteína","#c0392b"],["lac","Lácteos","#4d8cf0"],["aba","Abarrotes y granos","#b07d2b"],["beb","Bebidas","#2bb5c4"],["snk","Snacks, dulces y pan","#e67e22"],["limp","Limpieza","#16a085"],["hog","Hogar","#7f8c8d"],["hig","Higiene personal","#9b59b6"],["otro","Otro","#9aa1ad"]];
const TK_COLORS = ["#8e44ad","#d35400","#27ae60","#2980b9","#c2185b","#f39c12","#00897b","#5d4037"];
const TK_OLD = {verdura:"fv",hogar:"aba",limpieza:"limp",innecesario:"snk"};
const tkList = () => [...TK_BASE.slice(0,-1), ...((S.superCfg?.tipos)||[]), TK_BASE[TK_BASE.length-1]];
const tkKey = c => TK_OLD[c]||c;
const tkName = c => { c = tkKey(c); if (String(c).startsWith("nuevo:")) return c.slice(6); return (tkList().find(x=>x[0]===c)||["","Otro"])[1]; };
const tkColor = c => (tkList().find(x=>x[0]===tkKey(c))||["","","#9aa1ad"])[2];
const normKey = s => String(s||"").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Z0-9]/g,"");
const TIENDAS = ["Chedraui","Soriana","Mega Soriana","Walmart","Bodega Aurrera","Sam's Club","Costco","Super Aki","City Market","Oxxo","Mercado"];
const MONEDAS = ["MXN","USD","EUR","Otra"];
const PARA = ["Yo","Esposa","Ambos","Otro"];
const DESP_CATS = ["Despensa","Verduras"];
const r2 = v => Math.round(v*100)/100;
const fotoSrc = id => window.MF_fotoSrc ? window.MF_fotoSrc(id) : "/_blob/"+id;
const UNIDADES = ["pz","kg","g","L","ml","paq"];

function detVals(cats, k){
  const s = new Set(); allMonths().forEach(ym=>monthItems(ym).forEach(x=>{ if (x.det && x.det[k] && (!cats || cats.includes(x.cat))) s.add(String(x.det[k])); })); return [...s].sort();
}
const rf = (k,l) => ({k, l, dl:()=>detVals(null,k)});
const isVuelo = d => d.tipo==="Vuelo";
const DET = {
  "Alimentación": {titulo:"Restaurante (opcional)", f:[{k:"lugar",l:"Lugar",dl:()=>detVals(["Alimentación"],"lugar")},{k:"cuenta",l:"Consumo",ty:"num",sum:1},{k:"propina",l:"Propina",ty:"num",sum:1}]},
  "Viaje": {titulo:"Detalle del viaje", f:[{k:"tipo",l:"Tipo",ty:"chips",o:["Vuelo","Hospedaje","Otro"]},
    {k:"aerolinea",l:"Aerolínea",show:isVuelo,dl:()=>[...new Set(["Viva Aerobus","Volaris","Aeroméxico",...detVals(null,"aerolinea")])]},
    rf("origen","Origen"), rf("destino","Destino"), {k:"fviaje",l:"Fecha del viaje",ty:"date"}, {k:"para",l:"Para quién",ty:"chips",o:PARA},
    {k:"tarifa",l:"Tarifa (vuelo)",ty:"num",sum:1,show:isVuelo},{k:"tua",l:"TUA",ty:"num",sum:1,show:isVuelo},{k:"seguro",l:"Seguro",ty:"num",sum:1,show:isVuelo},
    {k:"asiento",l:"Asiento",ty:"num",sum:1,show:isVuelo},{k:"equipaje",l:"Equipaje",ty:"num",sum:1,show:isVuelo},{k:"otros",l:"Otros cargos",ty:"num",sum:1,show:isVuelo}]},
  "Transporte": {titulo:"Detalle del transporte", f:[{k:"tipo",l:"Tipo",ty:"chips",o:["ADO","ADO GL","ADO Platino","OCC","Mayab","Tren Maya","Metro","Otro"]},
    {k:"otro",l:"Especifica",show:d=>d.tipo==="Otro"}, rf("origen","Origen"), rf("destino","Destino"), {k:"para",l:"Para quién",ty:"chips",o:PARA}]},
  "Taxi": {titulo:"Detalle del taxi", f:[{k:"tipo",l:"Servicio",ty:"chips",o:["DiDi","Taxi","InDrive","Uber","Otro"]}, rf("origen","Origen"), rf("destino","Destino")]},
  "Renta de auto": {titulo:"Detalle de la renta", f:[{k:"vehiculo",l:"Tipo de vehículo",ty:"chips",o:["Sedán","Camioneta","Pick up","Otro"]},{k:"otro",l:"Especifica",show:d=>d.vehiculo==="Otro"},
    {k:"marca",l:"Marca",dl:()=>detVals(null,"marca")},{k:"modelo",l:"Modelo",dl:()=>detVals(null,"modelo")},{k:"placa",l:"Placa",dl:()=>detVals(null,"placa")},
    {k:"arrendadora",l:"Arrendadora",dl:()=>[...new Set(["Avis","Hertz","Europcar","America Car Rental","Mex Rent a Car",...detVals(null,"arrendadora")])]},{k:"dias",l:"Días",ty:"num"}]},
  "Gasolina": {titulo:"Carga de gasolina", f:[{k:"comb",l:"Combustible",ty:"chips",o:["Magna","Premium","Diésel"]},{k:"litros",l:"Litros",ty:"num"},{k:"precio",l:"Precio por litro",ty:"num"},
    {k:"odo",l:"Odómetro (km, opcional)",ty:"num"},{k:"placa",l:"Placa / vehículo",dl:()=>detVals(null,"placa")}]},
  "Agua": {titulo:"Tipo de agua", f:[{k:"tipo",l:"Tipo",ty:"chips",o:["Garrafón","Embotellada"]},{k:"cant",l:"Cantidad",ty:"num"}]},
  "Salud": {titulo:"Detalle de salud", f:[{k:"tipo",l:"Tipo",ty:"chips",o:["Consulta médica","Medicamentos","Insumos","Estudios clínicos","Otro"]},{k:"lugar",l:"Lugar / médico",dl:()=>detVals(["Salud"],"lugar")}]},
};

let assetsNS = null, sampleNS = null, sampleImg = false;
(async()=>{ try{ assetsNS = await claude.use("assets"); }catch(e){} try{ sampleNS = await claude.use("sample"); if (sampleNS){ const l = await sampleNS.limits().catch(()=>null); sampleImg = !!l?.images; } }catch(e){} if (S.tx) renderTx(); })();

function evalAmount(s){
  const t = String(s||"").replace(/,/g,"").replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-").trim();
  if (!t) return NaN; if (!/^[\d+\-*/().\s]+$/.test(t)) return NaN;
  try { const v = Function('"use strict";return ('+t+')')(); return Number.isFinite(v) ? r2(v) : NaN; } catch(e){ return NaN; }
}
function freqCats(t){
  const from = iso(new Date(today.getFullYear(), today.getMonth()-6, 1)), cnt = {};
  itemsRange(from, "9999-12-31").forEach(x=>{ if (x.t===t) cnt[x.cat]=(cnt[x.cat]||0)+1; });
  return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(e=>e[0]).slice(0,7);
}
function commentSugs(cat, t){
  const cnt = {}; allMonths().forEach(ym=>monthItems(ym).forEach(x=>{ if (x.t===t && x.cat===cat && x.n) cnt[x.n]=(cnt[x.n]||0)+1; }));
  return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(e=>e[0]).slice(0,20);
}
function allTags(){ const s = new Set(); allMonths().forEach(ym=>monthItems(ym).forEach(x=>(x.tags||[]).forEach(g=>s.add(g)))); return [...s].sort(); }
function addMonthsISO(d, n, day){ const b = parseD(d); const y = b.getFullYear(), m = b.getMonth()+n, dd = day||b.getDate();
  return iso(new Date(y, m, Math.min(dd, new Date(y, m+1, 0).getDate()))); }
function cutInfo(c, f){ // periodo al que entra una compra con TDC
  if (!c) return null;
  if (c.fechaCorte && c.fechaLimite){
    const cd = parseD(c.fechaCorte).getDate(), ld = parseD(c.fechaLimite).getDate(), d = parseD(f);
    let cut = new Date(d.getFullYear(), d.getMonth(), Math.min(cd, new Date(d.getFullYear(), d.getMonth()+1, 0).getDate()));
    if (d > cut) cut = new Date(d.getFullYear(), d.getMonth()+1, Math.min(cd, new Date(d.getFullYear(), d.getMonth()+2, 0).getDate()));
    const lm = ld > cd ? cut.getMonth() : cut.getMonth()+1;
    const due = new Date(cut.getFullYear(), lm, Math.min(ld, new Date(cut.getFullYear(), lm+1, 0).getDate()));
    return {corte: iso(cut), due: iso(due), day: ld};
  }
  const open = S.periods.filter(p=>p.card===c.id && p.status!=="pagado" && p.due>=f).sort((a,b)=>a.due.localeCompare(b.due))[0];
  if (open) return {due: open.due, day: parseD(open.due).getDate()};
  const d = parseD(f); d.setDate(d.getDate()+30); return {due: iso(d), day: d.getDate()};
}
/* montos derivados del formulario */
function txMXN(x){
  const v = evalAmount(x.expr); if (!Number.isFinite(v)) return NaN;
  if ((x.mon||"MXN")==="MXN") return v;
  if (+x.real>0) return r2(+x.real);
  return +x.tc>0 ? r2(v*(+x.tc)) : NaN;
}
function cuotasOf(x, mxn){
  const n = Math.max(1, +x.meses||1), base = x.pago==="mci" ? (+x.conInt||mxn) : mxn;
  if (Array.isArray(x.cuotas) && x.cuotas.length===n) return x.cuotas.map(v=>+v||0);
  if (!Number.isFinite(base)) return [];
  const q = Math.floor(base/n*100)/100, arr = Array(n).fill(q); arr[n-1] = r2(base - q*(n-1)); return arr;
}
function openTx(x){
  S.tx = x ? JSON.parse(JSON.stringify(x)) : {nuevo:true, t:S.mvT||"g", expr:"", cta:"", cat:"", f:todayISO, tags:[], n:"", pago:"contado", meses:3, tdc:"", fotos:[], ticket:null, det:{}, mon:"MXN"};
  if (x){
    S.tx._f0 = x.f; S.tx.det = x.det||{}; S.tx.mon = x.orig?.mon||"MXN";
    if (x.orig){ S.tx.expr = String(x.orig.monto); S.tx.tc = x.orig.tc; S.tx.real = x.orig.real||""; S.tx.monOtra = x.orig.otra||""; } else S.tx.expr = String(x.m);
    if (x.mci) S.tx.conInt = x.mci.conInt;
    S.tx.pago = x.pago||"contado"; S.tx.meses = x.meses||3;
    if (x.ticket) S.tx.ticket = {...x.ticket, items:(x.ticket.items||[]).map(i=>({...i, c:tkKey(i.c), ok: i.ok!==false}))};
  }
  S.txMore=false; S.txCta=false; S.txConfirm=false; S.txMsg=""; S.txCuotas=false; S.txAsk=false; S.txPaidOk=false;
  renderTx(); readTx(); S.txSnap = JSON.stringify(S.tx); $("tx").scrollTop = 0; document.body.classList.add("locked");
}
function tryCloseTx(){
  readTx();
  if (S.tx && JSON.stringify(S.tx)!==S.txSnap && !S.txAsk){ S.txAsk = true; renderTx(); $("tx").scrollTop = 0; return; }
  closeTx();
}
function closeTx(){ S.tx=null; $("tx").innerHTML=""; $("tx").hidden=true; if (!S.sheet) document.body.classList.remove("locked"); }
function txValid(x){
  const m = txMXN(x);
  return !!(x.cat && (x.cta || x.tdc) && Number.isFinite(m) && m>0 && (x.t!=="g" || x.pago==="contado" || x.tdc) && (x.pago!=="mci" || +x.conInt>0));
}
function detHTML(x){
  const D = DET[x.cat]; if (!D || x.t!=="g") return "";
  const d = x.det = x.det||{};
  let h = `<div class="panel tx-det"><b>${esc(D.titulo)}</b><div class="det-grid">`;
  D.f.forEach(f=>{
    if (f.show && !f.show(d)) return;
    const id = "det-"+f.k;
    if (f.ty==="chips") h += `<div class="det-full"><span class="sub">${esc(f.l)}</span><div class="dchips">${f.o.map(o=>`<button type="button" class="dchip${d[f.k]===o?" on":""}" data-act="txdetchip" data-k="${f.k}" data-v="${esc(o)}" aria-pressed="${d[f.k]===o}">${esc(o)}</button>`).join("")}</div></div>`;
    else { const dl = f.dl ? f.dl() : [];
      h += `<label for="${id}"><span class="sub">${esc(f.l)}</span><input id="${id}" class="tx-in" data-det="${f.k}" ${f.ty==="num"?'type="number" step="0.01" inputmode="decimal"':f.ty==="date"?'type="date"':'maxlength="60"'} value="${esc(d[f.k]??"")}"${dl.length?` list="dl-${id}"`:""}>${dl.length?`<datalist id="dl-${id}">${dl.map(v=>`<option value="${esc(v)}">`).join("")}</datalist>`:""}</label>`; }
  });
  h += `</div>`;
  const val = evalAmount(x.expr);
  const sf = D.f.filter(f=>f.sum && (!f.show || f.show(d))), suma = r2(sf.reduce((a,f)=>a+(+d[f.k]||0),0));
  if (suma>0){
    h += `<p class="sub" style="margin:0">Suma del desglose: <b class="num">${fmt(suma)}</b>${x.cat==="Alimentación" && +d.cuenta>0 && +d.propina>0 ? ` · propina ${Math.round(d.propina/d.cuenta*100)} %`:""}`;
    if (!Number.isFinite(val) || Math.abs(suma-val)>0.009) h += ` <button type="button" class="btn sm" data-act="txusesum" data-v="${suma}">Usar como monto</button>`;
    h += `</p>`;
  }
  if (x.cat==="Gasolina"){
    const l = +d.litros, p = +d.precio;
    if (l>0 && p>0 && Number.isFinite(val) && Math.abs(l*p-val)>1) h += `<p class="tx-warn">Litros × precio = ${fmt(r2(l*p))}, no cuadra con el monto (${fmt(val)}). Puedes dejarlo así o <button type="button" class="linkbtn" data-act="txusesum" data-v="${r2(l*p)}">usar ${fmt(r2(l*p))}</button>.</p>`;
    if (+d.odo>0 && l>0){
      const prev = itemsRange("2000-01-01", x.f).filter(y=>y.cat==="Gasolina" && y.id!==x.id && y.det?.odo && (!d.placa || y.det.placa===d.placa) && (y.f<x.f || y.f===x.f && x.nuevo)).sort((a,b)=>b.f.localeCompare(a.f))[0];
      if (prev && +d.odo > +prev.det.odo){ const km = +d.odo - +prev.det.odo; h += `<p class="tx-hint">${km.toLocaleString("es-MX")} km desde la carga del ${dShort(prev.f)} · rendimiento <b>${(km/l).toFixed(1)} km/L</b></p>`; }
    }
  }
  if ((x.cat==="Taxi"||x.cat==="Transporte") && d.origen && d.destino){
    const k = (d.origen+"|"+d.destino).toLowerCase();
    const prev = itemsRange("2000-01-01","9999-12-31").filter(y=>y.cat===x.cat && y.id!==x.id && y.det && ((y.det.origen||"")+"|"+(y.det.destino||"")).toLowerCase()===k);
    if (prev.length){ const avg = prev.reduce((a,y)=>a+y.m,0)/prev.length, mn = Math.min(...prev.map(y=>y.m)), mx = Math.max(...prev.map(y=>y.m));
      h += `<p class="tx-hint">Esta ruta: ${prev.length} viaje${prev.length>1?"s":""} antes · promedio <b>${fmt(avg)}</b> (${fmt0(mn)} – ${fmt0(mx)})</p>`; }
  }
  return h + `</div>`;
}
function pagoHTML(x){
  const val = txMXN(x), c = x.tdc ? card(x.tdc) : null, ci = c ? cutInfo(c, x.f) : null;
  let h = `<div class="tx-sec"><span class="sub">Forma de pago</span></div>
    <div class="seg">${[["contado","Contado"],["msi","MSI"],["mci","Con intereses"]].map(([v,l])=>`<button type="button" data-act="txpago" data-v="${v}" aria-pressed="${x.pago===v}">${l}</button>`).join("")}</div>`;
  if (x.pago!=="contado"){
    if (!x.tdc) h += `<p class="tx-warn">Los meses requieren tarjeta de crédito: elígela en <b>Cuenta</b>.</p>`;
    h += `<div class="det-grid"><label for="tx-meses"><span class="sub">Meses</span><input id="tx-meses" data-tx="meses" type="number" min="2" max="48" class="tx-in" value="${x.meses||3}"></label>`;
    if (x.pago==="mci") h += `<label for="tx-conint"><span class="sub">Precio con intereses</span><input id="tx-conint" data-tx="conInt" type="number" step="0.01" inputmode="decimal" class="tx-in" value="${esc(x.conInt??"")}"></label>`;
    h += `</div>`;
    if (x.pago==="mci" && +x.conInt>0 && Number.isFinite(val)){
      const int = r2(x.conInt - val);
      h += `<p class="tx-hint">Precio neto <b>${fmt(val)}</b> · con intereses <b>${fmt(+x.conInt)}</b> · intereses <b>${fmt(int)}</b> (${(int/val*100).toFixed(1)} % en ${x.meses} meses)</p>`;
    }
    const cs = cuotasOf(x, val), base = x.pago==="mci" ? +x.conInt : val, suma = r2(cs.reduce((a,v)=>a+v,0));
    if (cs.length){
      h += `<div class="sec-head"><span class="sub">${cs.length} mensualidades${Array.isArray(x.cuotas)?" (editadas)":` de ${fmt(cs[0])}`}</span><button type="button" class="btn sm" data-act="txcuotas">${S.txCuotas?"Listo":"Editar mensualidades"}</button></div>`;
      if (S.txCuotas){
        h += `<div class="cuotas">${cs.map((v,i)=>`<label for="tx-cu-${i}"><span class="sub">${i+1}/${cs.length}${ci?` · ${dShort(addMonthsISO(ci.due,i,ci.day))}`:""}</span><input id="tx-cu-${i}" data-cuota="${i}" type="number" step="0.01" class="tx-in" value="${v}"></label>`).join("")}</div>`;
        if (Array.isArray(x.cuotas)) h += `<button type="button" class="linkbtn" data-act="txcuotasreset">Volver a mensualidades iguales</button>`;
      }
      if (Number.isFinite(base) && Math.abs(suma-base)>0.009) h += `<p class="tx-warn">Las mensualidades suman ${fmt(suma)} y el total es ${fmt(base)}.</p>`;
    }
  }
  if (c && Number.isFinite(val)){
    const cs = x.pago==="contado" ? [val] : cuotasOf(x, val);
    h += `<p class="tx-hint">Va a la Wallet: <b>${esc(cname(c))}</b>, pago del <b>${dLong(ci.due)}</b>${cs.length>1?` · ${cs.length} pagos, el último el ${dLong(addMonthsISO(ci.due,cs.length-1,ci.day))}`:""}. No descuenta de tus cuentas hasta que registres el pago.</p>`;
  }
  return h;
}
function renderTx(){
  if (S._txR) return;
  const box = $("tx"), x = S.tx; if (!x){ box.hidden=true; return; }
  const ae = document.activeElement, aeId = ae && box.contains(ae) && ae.matches("input,select,textarea") ? ae.id : null;
  let aeSel = null; try { aeSel = aeId ? ae.selectionStart : null; } catch(e){}
  if (ae && box.contains(ae)){ S._txR = true; try { ae.blur(); } finally { S._txR = false; } }
  box.hidden = false;
  const keep = box.scrollTop, val = evalAmount(x.expr), mxn = txMXN(x);
  const tdcs = S.cards.filter(c=>c.tipo==="TDC").sort((a,b)=>(isUso(b)-isUso(a))||((a.orden||0)-(b.orden||0)));
  const freq = freqCats(x.t); if (x.cat && !freq.includes(x.cat)) freq.unshift(x.cat);
  const catBtn = c => { const ic=catIcon(c,x.t); return `<button type="button" class="cat-cell${x.cat===c?" on":""}" data-act="txcat" data-c="${esc(c)}"><span class="cat-ic" style="background:${catColor(c,x.t)}">${ic?ic[0]:esc(c[0])}</span><span class="cat-n">${esc(c)}</span></button>`; };
  const ayer = iso(new Date(today.getFullYear(),today.getMonth(),today.getDate()-1)), antier = iso(new Date(today.getFullYear(),today.getMonth(),today.getDate()-2));
  const mon = x.mon||"MXN", tdc = x.tdc ? card(x.tdc) : null;
  let h = `<div class="sheet-in"><div class="sheet-top"><button class="btn" data-act="txclose">←</button><b>${x.nuevo?"Añadir transacción":"Modificar transacción"}</b></div>
    ${S.txAsk?`<div class="tx-warn" role="alert">¿Descartar los cambios? <div class="actions"><button type="button" class="btn sm danger" data-act="txdiscard">Descartar</button><button type="button" class="btn sm" data-act="txkeep">Seguir editando</button></div></div>`:""}
    <div class="mv-tabs" role="tablist"><button role="tab" data-act="txt" data-v="g" aria-selected="${x.t==="g"}">Gastos</button><button role="tab" data-act="txt" data-v="i" aria-selected="${x.t==="i"}">Ingresos</button></div>
    <div class="tx-amt"><input id="tx-expr" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${esc(x.expr)}" aria-label="Monto">
      <select id="tx-mon" data-tx="mon" class="tx-mon" aria-label="Moneda">${MONEDAS.map(m=>`<option${mon===m?" selected":""}>${m}</option>`).join("")}</select></div>
    <div class="tx-ops"><span class="sub num" id="tx-res">${x.expr && /[+\-−×÷*/()]/.test(x.expr.slice(1)) ? (Number.isFinite(val)?"= "+fmt(val):"Operación incompleta") : ""}</span></div>`;
  if (mon!=="MXN"){
    const code = mon==="Otra" ? (x.monOtra||"moneda") : mon;
    h += `<div class="panel tx-det"><div class="det-grid">${mon==="Otra"?`<label for="tx-mono"><span class="sub">Moneda</span><input id="tx-mono" data-tx="monOtra" class="tx-in" maxlength="6" value="${esc(x.monOtra||"")}" placeholder="GBP, BRL…"></label>`:""}
      <label for="tx-tc"><span class="sub">1 ${esc(code)} = ? MXN (ese día)</span><input id="tx-tc" data-tx="tc" type="number" step="0.0001" inputmode="decimal" class="tx-in" value="${esc(x.tc??"")}"></label>
      <label for="tx-real"><span class="sub">Cobrado por el banco (MXN, opcional)</span><input id="tx-real" data-tx="real" type="number" step="0.01" inputmode="decimal" class="tx-in" value="${esc(x.real??"")}"></label></div>
      ${Number.isFinite(val)&&+x.tc>0?`<p class="sub" style="margin:0">${fmt(val).replace("$","")} ${esc(code)} × ${x.tc} = <b class="num">${fmt(r2(val*x.tc))}</b>${+x.real>0?` · cobrado <b class="num">${fmt(+x.real)}</b> · diferencia <b class="num">${fmt(r2(x.real-val*x.tc))}</b> (comisión / tipo de cambio)`:""}</p>`:""}</div>`;
  }
  h += `<div class="tx-sec"><span class="sub">Cuenta</span><button type="button" class="linkbtn tx-pick" data-act="txcta">${tdc?`💳 ${esc(cname(tdc))} <span class="sub">(crédito)</span>`:x.cta?esc(x.cta):'<span style="color:var(--accent)">No se ha seleccionado</span>'}</button></div>`;
  if (S.txCta){
    h += `<div class="panel" style="background:var(--bg)"><b>Seleccione una cuenta</b><div class="ct-list">${((S.ctas?.list)||[]).map(c=>`<button type="button" class="ct-row" data-act="txctasel" data-n="${esc(c.n)}"><span class="ct-ic" style="background:${ctaColor(c.n)}">${ctaIcon(c.n)}</span><span class="ct-n">${esc(c.n)}</span><span></span><span class="num ct-v">${fmt(ctaSaldo(c))}</span></button>`).join("")}</div>`;
    if (x.t==="g") h += `<b>Tarjetas de crédito</b><div class="ct-list">${tdcs.map(c=>`<button type="button" class="ct-row" data-act="txtdcsel" data-id="${esc(c.id)}"><span class="ct-ic" style="background:${esc(c.color||"#888")}">💳</span><span class="ct-n">${esc(cname(c))}${isUso(c)?"":' <span class="sub">(sin uso)</span>'}</span><span></span><span class="num ct-v">${fmt(cardUsage(c).disp)}</span></button>`).join("")}</div>`;
    h += `</div>`;
  }
  h += `<div class="tx-sec"><span class="sub">Categorías${x.cat?"":' · <span style="color:var(--bad)">Tiene que seleccionar la categoría</span>'}</span></div>`;
  if (S.txMore){
    const q = (S.txQ||"").toLowerCase();
    h += `<input id="tx-q" type="search" placeholder="Buscar categoría" value="${esc(S.txQ||"")}" class="tx-in" aria-label="Buscar categoría"><div class="cat-grid">${catList(x.t).filter(c=>!q||c.toLowerCase().includes(q)).map(catBtn).join("")}</div>`;
  } else h += `<div class="cat-grid">${freq.slice(0,7).map(catBtn).join("")}<button type="button" class="cat-cell" data-act="txmore"><span class="cat-ic" style="background:var(--muted)">+</span><span class="cat-n">Más</span></button></div>`;
  h += detHTML(x);
  h += `<div class="tx-dates">${[[todayISO,"hoy"],[ayer,"ayer"],[antier,"hace dos días"]].map(([d,l])=>`<button type="button" class="tx-chip${x.f===d?" on":""}" data-act="txdate" data-d="${d}"><b>${parseD(d).getDate()}/${parseD(d).getMonth()+1}</b><span>${l}</span></button>`).join("")}
      <label class="tx-chip${[todayISO,ayer,antier].includes(x.f)?"":" on"}" for="tx-f">📅<input id="tx-f" type="date" value="${esc(x.f)}" aria-label="Otra fecha"></label></div>
    <label class="tx-sec" for="tx-n"><span class="sub">Comentario</span></label><input id="tx-n" class="tx-in" list="dl-com" maxlength="120" value="${esc(x.n||"")}" placeholder="${x.cat==="Taxi"?"DiDi, InDrive…":"Comentario"}"><datalist id="dl-com">${x.cat?commentSugs(x.cat,x.t).map(c=>`<option value="${esc(c)}">`).join(""):""}</datalist>`;
  if (x.t==="g") h += pagoHTML(x);
  // Fotos y ticket
  h += `<div class="tx-sec"><span class="sub">Foto del ticket${assetsNS?"":" (no disponible en esta vista)"}</span></div><div class="tx-fotos">${[0,1,2].map(i=>{ const id=(x.fotos||[])[i];
      return id ? `<div class="tx-foto"><img src="${esc(fotoSrc(id))}" data-foto="${esc(id)}" alt="Foto ${i+1} del gasto"><button type="button" class="iconbtn" data-act="txfotodel" data-i="${i}" aria-label="Quitar foto">×</button></div>`
        : `<label class="tx-foto add" for="tx-ph-${i}">+<input type="file" id="tx-ph-${i}" accept="image/*" data-ph="${i}" ${assetsNS?"":"disabled"} hidden></label>`; }).join("")}</div>
    ${assetsNS && (x.fotos||[]).length<3 ? `<div class="tx-paste" contenteditable="true" role="textbox" aria-label="Pegar imagen del ticket" data-paste>📋 Pegar imagen: <b>Ctrl+V</b> en PC, o mantén presionado aquí → <b>Pegar</b> en el celular</div>`:""}`;
  if (x.t==="g"){
    const isSuper = DESP_CATS.includes(x.cat) || x.ticket;
    h += `<div class="actions">${(x.fotos||[]).length && sampleNS && sampleImg ? `<button type="button" class="btn sm primary" data-act="txscan">📷 Leer ticket</button>`:""}${(x.fotos||[]).length && window.MF_OCR && !(sampleNS && sampleImg) ? `<button type="button" class="btn sm primary" data-act="txocr" ${S.txOcr?"disabled":""}>🔍 Leer foto</button>`:""}${isSuper||!DET[x.cat]?`<button type="button" class="btn sm" data-act="txtxt">📋 Pegar texto del ticket</button><button type="button" class="btn sm" data-act="txmanual">${x.ticket?"+ Agregar producto":"Desglosar a mano"}</button>`:""}</div>`;
    if (S.txTxt) h += `<div class="panel tx-det"><label for="tx-tktxt"><span class="sub">Copia el texto del ticket (AI Lens, Google Lens o Texto en vivo) y pégalo aquí</span></label>
      <textarea id="tx-tktxt" class="tx-in" rows="7" placeholder="2.000 Clara Hue Liq San 46.50 93.00 A&#10;0.440 Pepino Verde Kg 29.90 13.16 A&#10;…">${esc(S.txTxtVal||"")}</textarea>
      <div class="actions"><button type="button" class="btn sm primary" data-act="txparse">Separar productos</button><button type="button" class="btn sm" data-act="txtxt">Cancelar</button></div></div>`;
    if (S.txMsg) h += `<p class="sub" style="margin:0">${S.txMsg}</p>`;
    if (x.ticket) h += ticketHTML(x.ticket, mxn);
  } else if (S.txMsg) h += `<p class="sub" style="margin:0">${S.txMsg}</p>`;
  h += `<div class="tx-foot"><button type="button" class="btn primary tx-save" data-act="txsave" ${txValid(x)?"":"disabled"}>${x.nuevo?"Añadir":"Guardar"}</button>
    ${x.nuevo?"":`<button type="button" class="btn" data-act="txcopy">Copiar</button><button type="button" class="btn danger" data-act="txdel">${S.txConfirm?"¿Eliminar? Toca otra vez":"Eliminar"}</button>`}</div></div>`;
  box.innerHTML = h; box.scrollTop = keep;
  if (aeId){ const el = document.getElementById(aeId); if (el){ el.focus({preventScroll:true}); try { if (aeSel!=null) el.setSelectionRange(aeSel, aeSel); } catch(e){} } }
}
async function uploadFoto(file){
  if (!assetsNS || !S.tx || !file) return;
  readTx(); S.txMsg = "Subiendo foto…"; renderTx();
  try { const r = await assetsNS.upload(file); S.tx.fotos = [...(S.tx.fotos||[]), r.id].slice(0,3); S.txMsg = sampleNS && sampleImg && S.tx.t==="g" ? "Foto lista. Toca “Leer ticket”." : ""; }
  catch(err){ S.txMsg = "No se pudo subir la foto."; }
  renderTx();
}
document.addEventListener("paste", e=>{
  if (!S.tx) return;
  const f = [...(e.clipboardData?.items||[])].find(i=>i.type.startsWith("image/"))?.getAsFile();
  if (f){ e.preventDefault(); uploadFoto(f); }
  else if (e.target.closest?.("[data-paste]")){ e.preventDefault(); S.txMsg = "Lo que copiaste no es una imagen."; renderTx(); }
});
document.addEventListener("beforeinput", e=>{ if (e.target.closest?.("[data-paste]") && e.inputType!=="insertFromPaste") e.preventDefault(); });
const txLater = () => setTimeout(()=>{ if (S.tx) renderTx(); }, 0);
/* ---------- Ticket: checklist por tipo ---------- */
function ticketHTML(tk, total){
  const items = (tk.items||[]).map((it,i)=>({...it,i}));
  const sums = {}; let imp=0, inn=0, dieta=0;
  items.forEach(it=>{ const m=+it.m||0; sums[it.c]=(sums[it.c]||0)+m; if (it.imp) imp+=m; if (it.inn) inn+=m; if (it.d) dieta+=m; });
  const suma = r2(Object.values(sums).reduce((a,v)=>a+v,0)), desc = +tk.desc||0, neto = r2(suma-desc);
  const order = [...tkList().map(t=>t[0]), ...Object.keys(sums).filter(k=>!tkList().some(t=>t[0]===k))];
  const groups = order.filter(k=>items.some(it=>it.c===k));
  const pend = items.filter(it=>!it.ok).length;
  let h = `<div class="panel tk"><div class="sec-head"><b>Productos del ticket</b><span class="sub num">${fmt(neto)}${Number.isFinite(total)&&Math.abs(neto-total)>1?` <span style="color:var(--warn)">(difiere de ${fmt(total)})</span>`:""}</span></div>
    <div class="det-grid"><label for="tk-tienda"><span class="sub">Súper / tienda</span><input id="tk-tienda" data-tkh="tienda" class="tx-in" list="dl-tiendas" value="${esc(tk.tienda||"")}"><datalist id="dl-tiendas">${[...new Set([...TIENDAS,...superTiendas()])].map(t=>`<option value="${esc(t)}">`).join("")}</datalist></label>
      <label for="tk-desc"><span class="sub">Descuento (puntos / monedero)</span><input id="tk-desc" data-tkh="desc" type="number" step="0.01" class="tx-in" value="${esc(tk.desc??"")}"></label></div>
    <div class="stacked">${groups.map(k=>sums[k]>0?`<i style="width:${sums[k]/Math.max(suma,1)*100}%;background:${tkColor(k)}"></i>`:"").join("")}</div>
    <div class="tk-sum">${dieta?`<span>✅ Dieta <b class="num">${fmt0(dieta)}</b></span>`:""}${imp?`<span>⚡ Impulsiva <b class="num">${fmt0(imp)}</b></span>`:""}${inn?`<span>❌ Innecesaria <b class="num">${fmt0(inn)}</b></span>`:""}${desc?`<span>🏷️ Descuento <b class="num">−${fmt0(desc)}</b></span>`:""}</div>
    ${pend?`<p class="tx-warn" style="margin:0">${pend} producto${pend>1?"s":""} por confirmar. Palomea por grupo o uno por uno.</p>`:""}`;
  groups.forEach(k=>{
    const g = items.filter(it=>it.c===k), all = g.every(it=>it.ok), nuevo = String(k).startsWith("nuevo:");
    h += `<div class="tk-g"><div class="tk-gh" style="border-left-color:${tkColor(k)}"><label><input type="checkbox" data-tkall="${esc(k)}" ${all?"checked":""}> <b>${esc(tkName(k))}</b></label><span class="num sub">${fmt(sums[k]||0)}</span></div>`;
    if (nuevo) h += `<div class="tk-new">🆕 Nuevo tipo detectado: <b>${esc(k.slice(6))}</b> <button type="button" class="btn sm primary" data-act="tknewadd" data-k="${esc(k)}">Agregar tipo</button><button type="button" class="btn sm" data-act="tknewotro" data-k="${esc(k)}">Usar “Otro”</button></div>`;
    g.forEach(it=>{ const i = it.i;
      h += `<div class="tk-row${it.ok?"":" pend"}"><input type="checkbox" data-tk="${i}" data-k="ok" aria-label="Confirmar producto" ${it.ok?"checked":""}>
        <div class="tk-main"><input id="tk-p-${i}" aria-label="Producto" data-tk="${i}" data-k="p" value="${esc(it.p)}" placeholder="Producto">${it.raw?`<span class="sub tk-raw">${esc(it.raw)}</span>`:""}${it.rev?`<span class="tk-rev">⚠️ revisa cantidad y monto (precio leído ${fmt(it.precio||0)})</span>`:""}</div>
        <input id="tk-m-${i}" class="tk-m" aria-label="Monto" type="number" step="0.01" data-tk="${i}" data-k="m" value="${it.m}">
        <button type="button" class="iconbtn" data-act="tkdel" data-i="${i}" aria-label="Quitar producto">×</button>
          <div class="tk-ctl"><input id="tk-q-${i}" aria-label="Cantidad" data-tk="${i}" data-k="q" type="number" step="0.001" inputmode="decimal" value="${esc(it.q??"")}" placeholder="Cant."><select id="tk-u-${i}" aria-label="Unidad" data-tk="${i}" data-k="u" class="tk-u">${UNIDADES.map(u=>`<option${(it.u||"pz")===u?" selected":""}>${u}</option>`).join("")}</select><select id="tk-c-${i}" aria-label="Tipo" data-tk="${i}" data-k="c">${tkList().map(([kk,l])=>`<option value="${kk}"${it.c===kk?" selected":""}>${esc(l)}</option>`).join("")}${nuevo?`<option value="${esc(k)}" selected>${esc(k.slice(6))} (nuevo)</option>`:""}</select>
          ${[["d","✅","Va con la dieta"],["imp","⚡","Compra impulsiva"],["inn","❌","Innecesaria"]].map(([f,e,l])=>`<button type="button" class="tk-flag${it[f]?" on":""}" data-act="tkflag" data-i="${i}" data-f="${f}" aria-pressed="${!!it[f]}" title="${l}" aria-label="${l}">${e}</button>`).join("")}</div></div>`;
    });
    h += `</div>`;
  });
  return h + `<p class="sub" style="margin:0">Al guardar, los productos confirmados se recuerdan: la próxima vez se reconocen solos.</p></div>`;
}
function superTiendas(){ const s=new Set(); allMonths().forEach(ym=>monthItems(ym).forEach(x=>{ if (x.ticket?.tienda) s.add(x.ticket.tienda); })); return [...s]; }
function readTx(){
  const x = S.tx; if (!x) return;
  const g = id => document.getElementById(id);
  if (g("tx-expr")) x.expr = g("tx-expr").value;
  if (g("tx-n")) x.n = g("tx-n").value;
  if (g("tx-f") && g("tx-f").value) x.f = g("tx-f").value;
  document.querySelectorAll("[data-tx]").forEach(el=>{ const k = el.dataset.tx; x[k] = k==="meses" ? Math.max(2, Math.min(48, parseInt(el.value)||3)) : el.value; });
  if (Array.isArray(x.cuotas) && x.cuotas.length !== (+x.meses||1)) x.cuotas = null;
  const cu = document.querySelectorAll("[data-cuota]");
  if (cu.length){ const arr = [...cu].map(el=>parseFloat(el.value)||0), def = cuotasOf({...x, cuotas:null}, txMXN(x));
    if (arr.some((v,i)=>Math.abs(v-(def[i]||0))>0.009)) x.cuotas = arr; }
  x.det = x.det||{}; document.querySelectorAll("[data-det]").forEach(el=>{ x.det[el.dataset.det] = el.value; });
  document.querySelectorAll("[data-tkh]").forEach(el=>{ if (x.ticket) x.ticket[el.dataset.tkh] = el.value; });
  document.querySelectorAll("[data-tk]").forEach(el=>{ const it = x.ticket?.items?.[+el.dataset.tk]; if (!it) return; const k = el.dataset.k;
    it[k] = k==="ok" ? el.checked : (k==="m"||k==="q") ? (el.value===""?null:parseFloat(el.value)) : el.value; });
}
function catalogMatch(items){
  const prod = S.superCfg?.prod || {};
  return items.map(it=>{ const hit = it.raw && prod[normKey(it.raw)]; return hit ? {...it, p:hit.n, c:hit.c, u:it.u||hit.u, ok:true} : {...it, ok:false}; });
}
async function scanTicket(){
  const x = S.tx; if (!sampleNS || !(x.fotos||[]).length) return;
  S.txMsg = "Leyendo el ticket… (puede tardar unos segundos)"; renderTx();
  const isSuper = DESP_CATS.includes(x.cat) || !DET[x.cat];
  try {
    const blobs = await Promise.all(x.fotos.map(id=>fetch(fotoSrc(id)).then(r=>r.blob())));
    if (isSuper){
      const tipos = tkList().map(t=>`"${t[0]}" = ${t[1]}`).join("; ");
      const res = await sampleNS.json(`Eres un lector de tickets de supermercado en México. Lee la(s) foto(s) del ticket y responde SOLO con JSON:
{"tienda": string|null, "fecha": "YYYY-MM-DD"|null, "total": number|null, "descuento": number|null, "items": [{"raw": string, "p": string, "q": number|null, "u": "pz"|"kg"|"g"|"L"|"ml"|"paq", "m": number, "c": string, "d": boolean, "inn": boolean}]}
- "raw": el texto del renglón tal como aparece en el ticket (abreviado).
- "p": nombre común y claro del producto con su presentación, p. ej. "Huevo blanco 30 pz", "Leche entera 1 L", "Plátano".
- "q": cantidad tal como aparece en la columna CANT. (ej. 0.440, 2.000); si no aparece, null.
- "u": unidad de esa cantidad: "kg" si el producto se vende a granel o por peso (dice KG, granel, o la cantidad tiene decimales), "pz" para piezas; usa "g", "L", "ml" o "paq" solo si así se cobra.
- "m": importe final del renglón en MXN, ya con su descuento de renglón aplicado.
- "c": tipo de producto. Usa una de estas claves: ${tipos}. Si un producto claramente no encaja en ninguna, usa "nuevo:<Nombre del tipo>" (p. ej. "nuevo:Mascotas").
- "d": true si es alimento natural o saludable (verdura, fruta, proteína magra, lácteo natural, granos integrales).
- "inn": true solo para antojos evidentes (dulces, galletas, pan dulce, refresco, botanas, alcohol).
- "descuento": descuentos generales del ticket (puntos, monedero, cupones) como número positivo, o null.
No incluyas subtotal, IVA, cambio, forma de pago ni renglones de descuento general.`, {images: blobs, modelTier:"default"});
      const items = Array.isArray(res?.items) ? res.items.map(it=>({raw:String(it.raw||"").slice(0,60), p:String(it.p||"").slice(0,80), q:Number.isFinite(+it.q)&&it.q!==null?+it.q:null, u:UNIDADES.includes(it.u)?it.u:(it.q && it.q%1 ? "kg" : "pz"), m:r2(+it.m||0),
        c: (tkList().some(t=>t[0]===it.c) || String(it.c).startsWith("nuevo:")) ? String(it.c).slice(0,40) : "otro", d:!!it.d, inn:!!it.inn, imp:false})).filter(it=>it.p||it.raw) : [];
      x.ticket = {tienda: res?.tienda || x.ticket?.tienda || null, desc: +res?.descuento>0 ? r2(+res.descuento) : null, items: catalogMatch(items)};
      if (!x.expr && Number.isFinite(+res?.total)) x.expr = String(res.total);
      const known = x.ticket.items.filter(i=>i.ok).length;
      S.txMsg = items.length ? `Listo: ${items.length} productos${known?` (${known} ya conocidos)`:""}. Revisa y palomea.` : "No pude leer productos en la foto. Intenta con otra foto más nítida o desglosa a mano.";
    } else {
      const D = DET[x.cat], campos = D.f.map(f=>`"${f.k}": ${f.ty==="num"?"number|null":f.ty==="chips"?`uno de ${JSON.stringify(f.o)} o null`:f.ty==="date"?'"YYYY-MM-DD"|null':"string|null"} (${f.l})`).join(", ");
      const res = await sampleNS.json(`Lee la(s) foto(s) de este comprobante de "${x.cat}" en México y responde SOLO con JSON:
{"total": number|null, "fecha": "YYYY-MM-DD"|null, "det": {${campos}}}
Usa null en lo que no aparezca. Montos en la moneda del comprobante.`, {images: blobs, modelTier:"default"});
      const det = res?.det || {}; x.det = x.det||{}; let n=0;
      D.f.forEach(f=>{ const v = det[f.k]; if (v==null || v==="") return; if (f.ty==="chips" && !f.o.includes(v)) return; x.det[f.k] = f.ty==="num" ? +v : String(v).slice(0,60); n++; });
      if (!x.expr && Number.isFinite(+res?.total)) x.expr = String(res.total);
      S.txMsg = n ? `Listo: completé ${n} dato${n>1?"s":""} del comprobante. Revísalos.` : "No encontré datos legibles en la foto.";
    }
  } catch(e){
    S.txMsg = e?.code==="not_granted"||e?.code==="sampling_disabled" ? "La lectura de tickets no está permitida en esta vista." : e?.code==="rate_limited" ? "Demasiadas lecturas seguidas; intenta en un momento." : e?.code==="image_rejected" ? "La foto no se pudo usar; toma otra." : "No se pudo leer el ticket. Intenta de nuevo o desglósalo a mano.";
  }
  renderTx();
}
/* ---------- Texto del ticket (Lens / AI Lens / Texto en vivo) ---------- */
const TK_HEAD = [[/aves|carne|pollo|pescad|salchichon|embutid/i,"prot"],[/fruta|verdura/i,"fv"],[/lacteo|l[aá]cteos|refrigerad|quesos|yoghurt|yogur/i,"lac"],[/abarrote|despensa|granos|enlatad/i,"aba"],[/bebida|refresco|jugo|vino|licor|cerveza/i,"beb"],[/panader|galleta|dulce|botana|snack|confite/i,"snk"],[/limpieza|detergent/i,"limp"],[/perfumer|higiene|cuidado personal|farmacia/i,"hig"],[/hogar|ferreter|bazar/i,"hog"]];
const TK_KW = [[/pepino|zanahori|jitomat|tomate|cebolla|lechuga|brocol|calabaz|papa|chile|limon|platano|manzana|aguacate|fresa|naranja|pera|uva|espinaca|cilantro|apio|pimiento|nopal|elote|melon|sandia|papaya|pi[nñ]a|mango/i,"fv"],
  [/pollo|pechuga|huevo|hue\b|clara|atun|carne|res|cerdo|pescado|salmon|tilapia|jamon|pavo|camaron|molida|bistec/i,"prot"],
  [/leche|queso|qso|yog|yoplait|crema|mantequilla|lala|alpura|danone|griego/i,"lac"],
  [/arroz|frijol|avena|tortilla|pasta|aceite|harina|azucar|sal\b|cafe|atun lata|lenteja|garbanzo|cereal|granola/i,"aba"],
  [/agua|refresc|coca|jugo|bebida|cerveza|vino|te\b|electrolit/i,"beb"],
  [/galleta|pan\b|bimbo|dulce|chocolate|papas|sabritas|botana|gomit|helado|pastel|dona|marinela|gansito/i,"snk"],
  [/cloro|detergente|jabon|fabuloso|pinol|suaviz|lavatrast|escoba|trapeador|esponja|ariel|downy/i,"limp"],
  [/papel|servilleta|bolsa|foco|pila|aluminio|encendedor/i,"hog"],
  [/shampoo|champu|pasta dental|colgate|desodorante|rastrillo|toalla femen|crema corporal|cepillo/i,"hig"]];
function parseTicketText(txt){
  const num = s => { s = String(s).trim().replace(/\s(\d{2})$/,".$1").replace(/,(\d{2})$/,".$1").replace(/,/g,""); return parseFloat(s); };
  const lines = String(txt).split(/\r?\n/).map(l=>l.replace(/[|«»“”"'£€¡¿~^`]/g," ").replace(/\s+/g," ").trim()).filter(Boolean);
  let tienda = null, total = null, desc = null, tipo = null; const items = [];
  const T = ["Chedraui","Soriana","Walmart","Bodega Aurrera","Sam's Club","Costco","Super Aki","City Market","Oxxo","La Comer","HEB","Mega"];
  for (const l of lines.slice(0,8)){ const t = T.find(t=>l.toLowerCase().replace(/[^a-z]/g,"").includes(t.toLowerCase().replace(/[^a-z]/g,""))); if (t){ tienda = t; break; } }
  const AMT = String.raw`(\d{1,5}(?:[.,]\d{2}|\s\d{2}))\d?`;
  for (const l of lines){
    const L = l.toUpperCase();
    if (/TOTAL/.test(L) && !/SUBTOTAL|ARTICULOS|ARTÍCULOS|PRECIO|RTICULO/.test(L)){ const m = l.match(/(\d[\d,]*[.,]\d{2})\s*\S?\s*$/); if (m){ if (total==null) total = num(m[1]); break; } continue; }
    if (/R\.?F\.?C|RFC|SUCURSAL|C\.?P\.|RTICULO|PRECIO|TARJETA|AFILIACI|CAMBIO|\bIVA\b|FOLIO|OPERADOR|CONSTITUYENTES/.test(L)) continue;
    if (/DESCUENTO|AHORRO|MONEDERO|PUNTOS|BONIFIC/.test(L)){ const m = l.match(/(\d[\d,]*[.,]\d{2})/); if (m) desc = (desc||0) + num(m[1]); continue; }
    let pre=null, price=null, tot=null, m;
    if ((m = l.match(new RegExp(String.raw`^(.*?[A-Za-zÁÉÍÓÚÑáéíóúñ].*?)\s+(\d{1,4}[.,]\d{2})\s+` + AMT + String.raw`\s*[A-Z0-9]?\s*$`)))){ pre = m[1]; price = num(m[2]); tot = num(m[3]); }
    else if ((m = l.match(new RegExp(String.raw`^(.*?[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}.*?)\s+` + AMT + String.raw`\s*[A-Z]?\s*$`)))){ pre = m[1]; tot = num(m[2]); }
    else if (/^[A-Za-zÁÉÍÓÚÑáéíóúñ ,y]+$/.test(l) && l.length<45){ const h = TK_HEAD.find(([re])=>re.test(l)); if (h) tipo = h[1]; continue; }
    if (!pre || !Number.isFinite(tot) || tot<=0) continue;
    let q = null, d = pre; const qm = pre.match(/^(\S+)\s+(.*)$/);
    if (qm){ const qv = parseFloat(qm[1].replace(",",".")); if (/^\d{1,3}([.,]\d{1,3})?$/.test(qm[1]) && qv>0 && qv<100){ q = qv; d = qm[2]; } else if (!/[A-Za-z]{3}/.test(qm[1])) d = qm[2]; }
    d = d.replace(/^[^A-Za-zÁÉÍÓÚÑáéíóúñ]+/,"").trim(); if (d.replace(/[^A-Za-z]/g,"").length < 3) continue;
    let rev = false;
    if (price){ if (q==null){ q = Math.round(tot/price*1000)/1000; rev = true; }
      if (Math.abs(q*price - tot) > Math.max(0.6, tot*0.03)) rev = true; }
    const kw = TK_KW.find(([re])=>re.test(d)), c = kw ? kw[1] : (tipo||"otro");
    const u = /\bK[GA]\b|granel/i.test(d) || (q && q%1) ? "kg" : "pz";
    items.push({raw:d.slice(0,60), p:d.replace(/\b(KG|Kg|kg|Ka|ka)\b/,"").trim().slice(0,80), q:q||1, u, m:r2(tot), c, d:["fv","prot","lac"].includes(c), inn:c==="snk", imp:false, rev, precio:price||null});
  }
  return {tienda, total, desc: desc?r2(desc):null, items};
}
/* ---------- Ligas con la Wallet ---------- */
async function removeLinks(it){
  if (!it?.tdc) return;
  for (const p of S.periods.filter(p=>(p.items||[]).some(i=>i.movId===it.id))){
    const rest = (p.items||[]).filter(i=>i.movId!==it.id).map(i=>({...i}));
    if (!rest.length && p.auto && !(p.pagos||[]).length){ await db.doc("periods/"+p.id).delete(); S.periods = S.periods.filter(q=>q.id!==p.id); }
    else { await db.doc("periods/"+p.id).update({items:rest}); p.items = rest; }
  }
  const pl = S.plans.find(p=>p.movId===it.id); if (pl) await db.doc("plans/"+pl.id).delete();
}
async function addToPeriod(c, due, item){
  const p = S.periods.find(p=>p.card===c.id && p.due===due) || S.periods.find(p=>p.card===c.id && Math.abs(dayDiff(p.due)-dayDiff(due))<=3);
  if (p){ const items = [...(p.items||[]).map(i=>({...i})), item]; p.items = items; await db.doc("periods/"+p.id).update({items}); }
  else { const np = {card:c.id, due, status:"abierto", items:[item], auto:true}; S.periods.push({id:c.id+"-"+due, ...np}); await db.doc("periods/"+c.id+"-"+due).set(np); }
}
function paidMap(id){ const k = {}; S.periods.forEach(p=>(p.items||[]).forEach(i=>{ if (i.movId===id && i.pagoId && !i.adelanto) k[i.cuota||1] = i.pagoId; })); return k; }
async function addLinks(it, keep){
  if (it.t!=="g" || !it.tdc) return;
  const c = card(it.tdc), ci = cutInfo(c, it.f); if (!c || !ci) return;
  const n = it.pago!=="contado" && it.pago ? it.meses : 1;
  const cs = n>1 ? cuotasOf({pago:it.pago, meses:n, cuotas:it.cuotas, conInt:it.mci?.conInt}, it.m) : [it.m];
  const name = (it.n||it.cat) + (it.pago==="mci"?" (MCI)":"");
  for (let i=0;i<cs.length;i++){
    const due = addMonthsISO(ci.due, i, ci.day);
    const item = {fecha:it.f, concepto:(n>1?`${i+1}/${n} `:"")+name, monto:cs[i], movId:it.id, cuota:i+1};
    if (keep && keep[i+1]) item.pagoId = keep[i+1];
    await addToPeriod(c, due, item);
  }
  if (n>1){
    const pl = {nombre:name, kind:"msi", card:c.id, cuota:cs[0], pagados:0, total:n, ultimoCargo:addMonthsISO(ci.due,-1,ci.day).slice(0,7), movId:it.id, orden:50};
    if (it.pago==="mci"){ pl.intereses = r2(it.mci.conInt - it.m); pl.neto = it.m; }
    await db.doc("plans/msi-"+it.id).set(pl);
  }
}
function txItem(){
  const x = S.tx, it = {id: x.nuevo ? "m"+Date.now().toString(36)+Math.random().toString(36).slice(2,5) : x.id, t:x.t, f:x.f, cat:x.cat, m:txMXN(x), n:(x.n||"").trim()};
  const tdc = x.t==="g" && x.tdc ? card(x.tdc) : null;
  it.cta = tdc ? "TDC "+cname(tdc) : x.cta;
  if ((x.tags||[]).length) it.tags = x.tags.slice();
  if (tdc) it.tdc = x.tdc;
  if (x.t==="g" && x.pago!=="contado"){ it.pago = x.pago; it.meses = +x.meses||3; if (Array.isArray(x.cuotas)) it.cuotas = x.cuotas.map(v=>+v||0); if (x.pago==="mci") it.mci = {conInt:r2(+x.conInt)}; }
  if ((x.mon||"MXN")!=="MXN") it.orig = {mon:x.mon, monto:evalAmount(x.expr), tc:+x.tc||null, real:+x.real||null, otra:x.mon==="Otra"?(x.monOtra||"").toUpperCase():null};
  const D = DET[x.cat];
  if (D && x.t==="g"){ const det = {}; D.f.forEach(f=>{ if (f.show && !f.show(x.det||{})) return; const v = (x.det||{})[f.k]; if (v!=null && v!=="") det[f.k] = f.ty==="num" ? +v : String(v).trim(); }); if (Object.keys(det).length) it.det = det; }
  if ((x.fotos||[]).length) it.fotos = x.fotos.slice();
  if (x.t==="g" && x.ticket?.items?.length) it.ticket = {tienda:(x.ticket.tienda||"").trim()||null, desc:+x.ticket.desc||null, items:x.ticket.items.map(i=>({raw:i.raw||null, p:i.p,  q:i.q??null, u:i.u||"pz", m:+i.m||0, c:i.c, ok:!!i.ok, d:!!i.d, imp:!!i.imp, inn:!!i.inn}))};
  return it;
}
async function learnProducts(it){
  if (!it.ticket) return;
  const cfg = JSON.parse(JSON.stringify(S.superCfg||{tipos:[], prod:{}})); cfg.prod = cfg.prod||{}; cfg.tipos = cfg.tipos||[]; let ch = false;
  it.ticket.items.forEach(i=>{ if (i.ok && i.raw && i.p && !String(i.c).startsWith("nuevo:")){ const k = normKey(i.raw); if (!cfg.prod[k] || cfg.prod[k].n!==i.p || cfg.prod[k].c!==i.c || cfg.prod[k].u!==(i.u||"pz")){ cfg.prod[k] = {n:i.p, c:i.c, u:i.u||"pz"}; ch = true; } } });
  if (ch){ S.superCfg = cfg; await db.doc("config/super").set(cfg); }
}
async function addTipo(nombre){
  const cfg = JSON.parse(JSON.stringify(S.superCfg||{tipos:[], prod:{}})); cfg.tipos = cfg.tipos||[]; cfg.prod = cfg.prod||{};
  let t = tkList().find(t=>t[1].toLowerCase()===nombre.toLowerCase());
  if (!t){ t = ["u"+Date.now().toString(36), nombre, TK_COLORS[cfg.tipos.length % TK_COLORS.length]]; cfg.tipos.push(t); S.superCfg = cfg; if (db) await db.doc("config/super").set(cfg); }
  return t[0];
}

/* ================= Pagos de periodos TDC ================= */
const pagado = p => r2((p.pagos||[]).reduce((a,g)=>a+(+g.m||0),0));
const faltante = p => p.status==="pagado" ? 0 : Math.max(0, r2(total(p) - pagado(p)));
function pagosHTML(p){
  const pg = (p.pagos||[]).slice().sort((a,b)=>a.f.localeCompare(b.f)), id = esc(p.id);
  let h = "";
  if (pg.length){
    h += `<div class="pg"><div class="sub">Pagos registrados</div><table class="xt">${pg.map(g=>`<tr><td class="d">${dShort(g.f)}</td><td>${esc(g.cta)} <span class="sub">${g.tipo==="minimo"?"· mínimo":g.tipo==="otro"?"· parcial":g.tipo==="concepto"?"· "+esc((g.conceptos||[]).join(", ")):""}</span></td><td class="n num">${fmt(+g.m)}</td><td class="x"><button type="button" class="iconbtn" data-act="paydel" data-p="${id}" data-g="${esc(g.id)}" aria-label="Quitar pago">${S.payDel===g.id?"¿?":"×"}</button></td></tr>`).join("")}
      <tr><td></td><td><b>Pagado</b></td><td class="n num"><b>${fmt(pagado(p))}</b></td><td></td></tr></table>
      ${p.status!=="pagado" && faltante(p)>0 ? `<div class="sub">Faltan <b class="num">${fmt(faltante(p))}</b></div>`:""}</div>`;
  }
  if (S.payFor!==p.id) return h;
  const f = S.payForm || {}, ctas = (S.ctas?.list)||[];
  const tot = Math.max(0, r2(total(p)-pagado(p)));
  h += `<form class="f ef pay" data-form="pay" data-p="${id}"><b class="full">💸 Registrar pago${tot?` · faltan ${fmt(tot)}`:""}</b>
    <div class="seg full">${[["total","Total"],["concepto","Por concepto"],["minimo","Mínimo"],["otro","Otro"]].map(([v,l])=>`<button type="button" data-act="paytipo" data-v="${v}" aria-pressed="${f.tipo===v}">${l}</button>`).join("")}</div>
    ${f.tipo==="concepto"?`<div class="full pay-its">${(p.items||[]).map((it,i)=>({...it,i})).filter(it=>!it.pagoId).sort((a,b)=>(a.fecha||"").localeCompare(b.fecha||"")).map(it=>`<label class="pay-it"><input type="checkbox" data-payit="${it.i}" ${(f.sel||[]).includes(it.i)?"checked":""}><span>${it.fecha?dShort(it.fecha):""}</span><span>${esc(it.concepto)}</span><b class="num">${fmt(+it.monto)}</b></label>`).join("") || '<span class="sub">Todos los conceptos ya están pagados.</span>'}</div>`:""}
    ${f.tipo==="minimo"?`<label for="pay-min">Pago mínimo del estado de cuenta<input id="pay-min" type="number" step="0.01" value="${esc(p.minimo??"")}"></label>`:""}
    <label for="pay-m">Monto<input id="pay-m" type="number" step="0.01" inputmode="decimal" required value="${esc(f.m??"")}"></label>
    <label for="pay-f">Fecha<input id="pay-f" type="date" required value="${esc(f.f||todayISO)}"></label>
    <label class="full" for="pay-cta">Desde la cuenta<select id="pay-cta" required><option value="">Selecciona…</option>${ctas.map(c=>{ const s=ctaSaldo(c); return `<option value="${esc(c.n)}"${f.cta===c.n?" selected":""}>${esc(c.n)} · ${fmt(s)}</option>`; }).join("")}</select></label>`;
  if (f.warn) h += `<div class="full tx-warn" role="alert">⚠️ Si haces este pago, <b>${esc(f.cta)}</b> quedaría en <b class="num">${fmt(f.warn)}</b>. Revisa la cuenta o continúa si así lo planeaste.
      <div class="actions"><button type="button" class="btn sm" data-act="payrevisar">Revisar</button><button type="button" class="btn sm danger" data-act="paycontinuar">Continuar de todos modos</button></div></div>`;
  else h += `<div class="actions full"><button class="btn primary" type="submit">Registrar pago</button><button class="btn" type="button" data-act="paycancel">Cancelar</button>
      ${p.status!=="pagado"?`<button class="btn sm" type="button" data-act="paysin" data-p="${id}" title="Para pagos que ya descontaste en tus registros">Marcar pagado sin descontar</button>`:""}</div>`;
  return h + `</form>`;
}
function readPay(){ const f = S.payForm = S.payForm||{}; const g = id=>document.getElementById(id);
  if (g("pay-m")) f.m = g("pay-m").value; if (g("pay-f")) f.f = g("pay-f").value; if (g("pay-cta")) f.cta = g("pay-cta").value; if (g("pay-min")) f.min = g("pay-min").value; }
function openPay(p, tipo){
  S.payFor = p.id; S.payDel = null;
  const last = S.periods.filter(q=>q.card===p.card).flatMap(q=>q.pagos||[]).sort((a,b)=>b.f.localeCompare(a.f))[0];
  S.payForm = {tipo: tipo||"total", m: faltante(p)||"", f: todayISO, cta: last?.cta||""};
  if (tipo==="minimo") S.payForm.m = p.minimo||"";
}
async function doPay(p, force){
  readPay(); const f = S.payForm, m = r2(parseFloat(f.m));
  if (!(m>0) || !f.cta || !f.f) { renderDetail(); return; }
  const c = ((S.ctas?.list)||[]).find(c=>c.n===f.cta), after = c ? r2(ctaSaldo(c) - m) : 0;
  if (!force && after < 0){ f.warn = after; renderDetail(); return; }
  const gid = "g"+Date.now().toString(36), pago = {id:gid, f:f.f, cta:f.cta, m, tipo:f.tipo};
  const pagos = [...(p.pagos||[]).map(g=>({...g})), pago];
  const sum = r2(pagos.reduce((a,g)=>a+g.m,0)), upd = {pagos};
  if (f.tipo==="concepto" && (f.sel||[]).length){
    upd.items = (p.items||[]).map((it,i)=>(f.sel.includes(i) ? {...it, pagoId:gid} : {...it}));
    pago.conceptos = f.sel.map(i=>p.items[i]?.concepto).filter(Boolean);
  }
  upd.status = sum >= total(p) - 0.009 ? "pagado" : "parcial";
  if (f.tipo==="minimo" && +f.min>0) upd.minimo = +f.min;
  S.payFor = null; S.payForm = null;
  await save(()=>db.doc("periods/"+p.id).update(upd));
}

/* ================= Adelantos de mensualidades ================= */
function adelHTML(pl){
  const f = S.adelForm||{};
  return `<form class="f ef" data-form="adel" data-pl="${esc(pl.id)}"><b class="full">Adelantar pagos</b>
    <label for="ad-m">Monto<input id="ad-m" type="number" step="0.01" required value="${esc(f.m??"")}"></label>
    <label for="ad-f">Fecha<input id="ad-f" type="date" value="${esc(f.f||todayISO)}"></label>
    <div class="seg full">${[["plazo","Reducir plazo"],["cuota","Reducir mensualidad"]].map(([v,l])=>`<button type="button" data-act="adelmodo" data-v="${v}" aria-pressed="${(f.modo||"plazo")===v}">${l}</button>`).join("")}</div>
    <p class="sub full" style="margin:0">El adelanto se suma a tu próximo pago de la tarjeta. Después puedes editar cualquier mensualidad desde la Wallet.</p>
    <div class="actions full"><button class="btn primary" type="submit">Aplicar</button><button class="btn" type="button" data-act="adelcancel">Cancelar</button></div></form>`;
}
async function doAdel(pl){
  const g = id=>document.getElementById(id), A0 = r2(parseFloat(g("ad-m")?.value)), fecha = g("ad-f")?.value||todayISO, modo = S.adelForm?.modo||"plazo";
  if (!(A0>0)) return;
  const c = card(pl.card); if (!c) return;
  const fut = []; S.periods.filter(p=>p.card===c.id && p.status!=="pagado").sort((a,b)=>a.due.localeCompare(b.due))
    .forEach(p=>(p.items||[]).forEach((it,i)=>{ if (it.movId===pl.movId && !it.adelanto) fut.push({p, i, it}); }));
  if (!fut.length) return;
  const first = fut[0].p, rest = fut.slice(1); let A = A0;
  const changes = new Map(); const ch = p => { if (!changes.has(p.id)) changes.set(p.id, (p.items||[]).map(i=>({...i}))); return changes.get(p.id); };
  if (modo==="plazo"){
    for (let k=rest.length-1; k>=0 && A>0.009; k--){ const r = rest[k], items = ch(r.p), it = items[r.i];
      if (it.monto <= A + 0.009){ A = r2(A - it.monto); it._del = true; } else { it.monto = r2(it.monto - A); A = 0; } }
  } else if (rest.length){
    const per = Math.floor(A0/rest.length*100)/100; rest.forEach((r,k)=>{ const it = ch(r.p)[r.i]; const d = k===rest.length-1 ? r2(A0 - per*(rest.length-1)) : per; it.monto = Math.max(0, r2(it.monto - d)); }); A = 0;
  }
  const items0 = ch(first); items0.push({fecha, concepto:"Adelanto "+pl.nombre, monto:A0, movId:pl.movId, adelanto:true});
  S.adel = null; S.adelForm = null;
  await save(async()=>{
    for (const [id, items] of changes) await db.doc("periods/"+id).update({items: items.filter(i=>!i._del)});
    const left = rest.filter(r=>!changes.get(r.p.id)?.[r.i]?._del).length + 1;
    await db.doc("plans/"+pl.id).update({total: pl.pagados + left, adelantos: [...(pl.adelantos||[]), {f:fecha, m:A0, modo}]});
  });
  S.adel = null; S.adelForm = null;
}

document.addEventListener("submit", async e=>{
  const fm = e.target.closest("form[data-form='pay'],form[data-form='adel']"); if (!fm) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (fm.dataset.form==="pay"){ const p = S.periods.find(x=>x.id===fm.dataset.p); if (p) await doPay(p, false); }
  else { const pl = S.plans.find(x=>x.id===fm.dataset.pl); if (pl) await doAdel(pl); }
}, true);

document.addEventListener("click", async e=>{
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  const payActs = ["paynew","paytipo","paycancel","payrevisar","paycontinuar","paysin","paydel","adel","adelmodo","adelcancel"];
  if (payActs.includes(act)){
    e.stopImmediatePropagation();
    const p = S.periods.find(x=>x.id===(a.dataset.p||S.payFor));
    switch(act){
      case "paynew": if (p){ openPay(p); renderDetail(); } return;
      case "paytipo": readPay(); S.payForm.tipo = a.dataset.v; S.payForm.warn = null;
        if (p) S.payForm.m = a.dataset.v==="total" ? faltante(p) : a.dataset.v==="minimo" ? (p.minimo||"") : ""; S.payForm.sel = []; renderDetail(); return;
      case "paycancel": S.payFor=null; S.payForm=null; renderDetail(); return;
      case "payrevisar": readPay(); S.payForm.warn = null; renderDetail(); return;
      case "paycontinuar": if (p) await doPay(p, true); return;
      case "paysin": if (p){ S.payFor=null; S.payForm=null; await save(()=>db.doc("periods/"+p.id).update({status:"pagado", sinDescuento:true})); } return;
      case "paydel": { if (!p) return; if (S.payDel!==a.dataset.g){ S.payDel=a.dataset.g; renderDetail(); return; }
        const pagos = (p.pagos||[]).filter(g=>g.id!==a.dataset.g).map(g=>({...g})); S.payDel=null;
        const items = (p.items||[]).map(it=>{ const o = {...it}; if (o.pagoId===a.dataset.g) delete o.pagoId; return o; });
        const st = !pagos.length ? (p.status==="pagado"||p.status==="parcial" ? "abierto" : p.status) : r2(pagos.reduce((s,g)=>s+g.m,0)) >= total(p)-0.009 ? "pagado" : "parcial";
        await save(()=>db.doc("periods/"+p.id).update({pagos, items, status:st})); return; }
      case "adel": S.adel = S.adel===a.dataset.p ? null : a.dataset.p; S.adelForm = {modo:"plazo"}; renderPlans(); return;
      case "adelmodo": S.adelForm = {...(S.adelForm||{}), modo:a.dataset.v, m:document.getElementById("ad-m")?.value, f:document.getElementById("ad-f")?.value}; renderPlans(); return;
      case "adelcancel": S.adel=null; S.adelForm=null; renderPlans(); return;
    }
    return;
  }
  const mine = ["txclose","txdiscard","txkeep","txtxt","txparse","txocr","txt","txop","txcta","txctasel","txtdcsel","txcat","txmore","txdate","txtagdel","txpago","txfotodel","txscan","txmanual","tkdel","tkflag","tknewadd","tknewotro","txsave","txcopy","txdel","txdetchip","txusesum","txcuotas","txcuotasreset","madd","medit","despprev","despnext","despopen","desprng"];
  if (!mine.includes(act)) return;
  e.stopImmediatePropagation();
  if (act==="madd"){ openTx(null); if (S.mvMode==="dia" && S.mvDate) { S.tx.f = S.mvDate; renderTx(); } return; }
  if (act==="medit" || act==="despopen"){ const it = monthItems(a.dataset.f.slice(0,7)).find(y=>y.id===a.dataset.id); if (it) openTx(it); return; }
  if (act==="despprev"){ S.despOff = (S.despOff||0)-1; renderDespensa(); return; }
  if (act==="despnext"){ S.despOff = (S.despOff||0)+1; renderDespensa(); return; }
  if (act==="desprng"){ S.despRng = a.dataset.v; S.despOff = 0; renderDespensa(); return; }
  readTx(); const x = S.tx; if (!x) return;
  switch(act){
    case "txclose": tryCloseTx(); return;
    case "txdiscard": closeTx(); return;
    case "txkeep": S.txAsk=false; renderTx(); return;
    case "txt": x.t=a.dataset.v; x.cat=""; if (x.t==="i"){ x.tdc=""; x.pago="contado"; } renderTx(); return;
    case "txop": x.expr = (x.expr||"") + ({"−":"-","×":"*","÷":"/"}[a.dataset.v]||a.dataset.v); renderTx(); $("tx-expr")?.focus(); return;
    case "txcta": S.txCta=!S.txCta; renderTx(); return;
    case "txctasel": x.cta=a.dataset.n; x.tdc=""; S.txCta=false; renderTx(); return;
    case "txtdcsel": x.tdc=a.dataset.id; x.cta=""; S.txCta=false; renderTx(); return;
    case "txcat": x.cat=a.dataset.c; S.txMore=false; S.txQ=""; renderTx(); return;
    case "txmore": S.txMore=true; renderTx(); $("tx-q")?.focus(); return;
    case "txdate": x.f=a.dataset.d; renderTx(); return;
    case "txtagdel": x.tags.splice(+a.dataset.i,1); renderTx(); return;
    case "txpago": x.pago=a.dataset.v; x.cuotas=null; renderTx(); return;
    case "txcuotas": S.txCuotas=!S.txCuotas; renderTx(); return;
    case "txcuotasreset": x.cuotas=null; renderTx(); return;
    case "txdetchip": x.det=x.det||{}; x.det[a.dataset.k] = x.det[a.dataset.k]===a.dataset.v ? "" : a.dataset.v; renderTx(); return;
    case "txusesum": x.expr = String(a.dataset.v); renderTx(); return;
    case "txfotodel": x.fotos.splice(+a.dataset.i,1); renderTx(); return;
    case "txscan": await scanTicket(); return;
    case "txocr": {
      if (S.txOcr || !window.MF_OCR) return; S.txOcr = true; S.txMsg = "Preparando el lector… (la primera vez descarga unos 10 MB)"; renderTx();
      try {
        const id = x.fotos[x.fotos.length-1], blob = window.MF_fotoBlob ? await window.MF_fotoBlob(id) : await fetch(fotoSrc(id)).then(r=>r.blob());
        let last = -1; const txt = await window.MF_OCR(blob, p=>{ const v = Math.round(p*10); if (v!==last){ last = v; S.txMsg = `Leyendo la foto… ${v*10} %`; renderTx(); } });
        S.txOcr = false; S.txTxtVal = txt; readTx();
        const r = parseTicketText(txt);
        if (r.items.length){
          x.ticket = {tienda: r.tienda || x.ticket?.tienda || null, desc: r.desc || null, items: catalogMatch(r.items)};
          if (!x.expr && r.total) x.expr = String(r.total);
          const known = x.ticket.items.filter(i=>i.ok).length, suma = r2(r.items.reduce((a,i)=>a+i.m,0) - (r.desc||0));
          S.txMsg = `Leí ${r.items.length} productos${known?` (${known} ya conocidos)`:""}${r.total && Math.abs(suma-r.total)>0.5 ? ` · ⚠️ suman ${fmt(suma)} y el total es ${fmt(r.total)}: revisa montos o usa “Pegar texto” para corregir`:""}. Revisa y palomea.`;
        } else { S.txTxt = true; S.txMsg = "No pude separar productos. Corrige el texto leído abajo y toca “Separar productos”."; }
      } catch(e){ S.txOcr = false; S.txMsg = "No se pudo leer la foto: " + (e?.message||e); }
      renderTx(); return; }
    case "txtxt": S.txTxt = !S.txTxt; renderTx(); if (S.txTxt) $("tx-tktxt")?.focus(); return;
    case "txparse": { const r = parseTicketText($("tx-tktxt")?.value||"");
      if (!r.items.length){ S.txMsg = "No encontré productos en el texto. Revisa que incluya cantidades y precios, o mándame el texto para ajustar la lectura."; renderTx(); return; }
      x.ticket = {tienda: r.tienda || x.ticket?.tienda || null, desc: r.desc || null, items: catalogMatch(r.items)};
      if (!x.expr && r.total) x.expr = String(r.total);
      S.txTxt = false; const known = x.ticket.items.filter(i=>i.ok).length;
      S.txMsg = `Listo: ${r.items.length} productos${known?` (${known} ya conocidos)`:""}${r.total && Math.abs(r.items.reduce((a,i)=>a+i.m,0)-(r.desc||0)-r.total)>0.5?` · ⚠️ la suma no cuadra con el total ${fmt(r.total)}, revisa`:""}. Revisa y palomea.`;
      renderTx(); return; }
    case "txmanual": x.ticket = x.ticket || {tienda:x.n||null, items:[]}; x.ticket.items.push({p:"", m:0, q:1, u:"pz", c:"aba", ok:true, raw:null}); renderTx(); return;
    case "tkdel": x.ticket.items.splice(+a.dataset.i,1); renderTx(); return;
    case "tkflag": { const it = x.ticket.items[+a.dataset.i]; it[a.dataset.f] = !it[a.dataset.f]; renderTx(); return; }
    case "tknewadd": { const k = await addTipo(a.dataset.k.slice(6)); x.ticket.items.forEach(i=>{ if (i.c===a.dataset.k) i.c = k; }); renderTx(); return; }
    case "tknewotro": x.ticket.items.forEach(i=>{ if (i.c===a.dataset.k) i.c = "otro"; }); renderTx(); return;
    case "txcopy": { const c = {...JSON.parse(JSON.stringify(x)), nuevo:true, f:todayISO}; delete c.id; S.tx = c; S.txConfirm=false; renderTx(); $("tx").scrollTop=0; return; }
    case "txdel": {
      if (!S.txConfirm){ S.txConfirm=true; renderTx(); return; }
      const ym = x.f.slice(0,7), old = monthItems(ym).find(y=>y.id===x.id);
      if (db) await save(async()=>{ await toTrash({tipo:"mov", ym, data:{...old}}); await removeLinks(old); await writeMonth(ym, monthItems(ym).filter(y=>y.id!==x.id)); });
      closeTx(); return;
    }
    case "txsave": {
      if (!txValid(x) || !db) return;
      if (x.ticket) x.ticket.items = x.ticket.items.filter(i=>i.p || +i.m);
      const it = txItem();
      const ymOld = x.nuevo ? null : (x._f0||x.f).slice(0,7), ymNew = it.f.slice(0,7);
      const old = x.nuevo ? null : monthItems(ymOld).find(y=>y.id===it.id);
      const sig = y => JSON.stringify([y.t, y.f, y.m, y.tdc||"", y.pago||"", y.meses||"", y.cuotas||"", y.mci||""]);
      if (old && old.tdc && sig(old)===sig(it)){ // solo cambió texto: no tocar Wallet (conserva pagos)
        const nm = (it.n||it.cat) + (it.pago==="mci"?" (MCI)":"");
        await save(async()=>{
          await writeMonth(ymNew, monthItems(ymNew).map(y=>y.id===it.id ? it : y));
          for (const p of S.periods.filter(p=>(p.items||[]).some(i=>i.movId===it.id && !i.adelanto)))
            await db.doc("periods/"+p.id).update({items:(p.items||[]).map(i=>i.movId===it.id && !i.adelanto ? {...i, concepto:(i.cuota && it.meses>1 ? `${i.cuota}/${it.meses} ` : "")+nm} : {...i})});
          await learnProducts(it);
        });
        closeTx(); return;
      }
      const keep = old && old.tdc ? paidMap(old.id) : {};
      if (Object.keys(keep).length && old.m!==it.m && !S.txPaidOk){
        S.txPaidOk = true; S.txMsg = `⚠️ Este gasto ya tiene pagos registrados en la Wallet por ${fmt(old.m)}. El nuevo monto es ${fmt(it.m)}: revisa el pago del periodo después de guardar. Toca Guardar otra vez para confirmar.`;
        renderTx(); $("tx").scrollTop = $("tx").scrollHeight; return;
      }
      await save(async()=>{
        if (old) await removeLinks(old);
        if (ymOld && ymOld!==ymNew) await writeMonth(ymOld, monthItems(ymOld).filter(y=>y.id!==it.id));
        await writeMonth(ymNew, [...monthItems(ymNew).filter(y=>y.id!==it.id), it].sort((p,q)=>p.f.localeCompare(q.f)));
        await addLinks(it, keep);
        await learnProducts(it);
      });
      closeTx(); if (window.MF_purgeFotos) setTimeout(()=>window.MF_purgeFotos().catch(()=>{}), 1500); return;
    }
  }
}, true);
document.addEventListener("input", e=>{
  if (!S.tx) return;
  if (e.target.id==="tx-expr"){ const v = evalAmount(e.target.value); const r = $("tx-res"); S.tx.expr = e.target.value;
    if (r) r.textContent = /[+\-*/()×÷−]/.test(e.target.value.slice(1)) ? (Number.isFinite(v)?"= "+fmt(v):"Operación incompleta") : "";
    const b = document.querySelector(".tx-save"); if (b) b.disabled = !txValid(S.tx); }
  if (e.target.id==="tx-q"){ S.txQ = e.target.value; clearTimeout(S._tq); S._tq=setTimeout(()=>{ readTx(); renderTx(); const q=$("tx-q"); if(q){ q.focus(); q.setSelectionRange(q.value.length,q.value.length);} },200); }
});
document.addEventListener("change", async e=>{
  if (e.target.dataset?.payit!=null){ readPay(); const f = S.payForm, i = +e.target.dataset.payit, p = S.periods.find(x=>x.id===S.payFor);
    f.sel = e.target.checked ? [...new Set([...(f.sel||[]), i])] : (f.sel||[]).filter(j=>j!==i);
    f.m = r2(f.sel.reduce((a,j)=>a+(+p?.items?.[j]?.monto||0),0)) || ""; f.warn = null; renderDetail(); return; }
  if (e.target.id==="pay-cta" || e.target.id==="pay-min"){ readPay(); if (S.payForm){ S.payForm.warn=null; if (e.target.id==="pay-min") S.payForm.m = S.payForm.min; } renderDetail(); return; }
  if (!S.tx) return;
  const t = e.target;
  if (t.dataset.det==="litros" || t.dataset.det==="precio"){
    readTx(); const d = S.tx.det, l = +d.litros, p = +d.precio, v = txMXN(S.tx);
    if (l>0 && p>0 && !Number.isFinite(v)) S.tx.expr = String(r2(l*p));
    else if (t.dataset.det==="litros" && l>0 && Number.isFinite(v) && !(p>0)) d.precio = String(r2(v/l));
    txLater(); return;
  }
  if (t.dataset.tkall!=null){ readTx(); S.tx.ticket.items.forEach(i=>{ if (i.c===t.dataset.tkall) i.ok = t.checked; }); renderTx(); return; }
  if (["tx-f","tx-meses","tx-mon","tx-tc","tx-real","tx-conint","tx-mono"].includes(t.id) || t.matches("[data-tk],[data-det],[data-cuota],[data-tkh]")){ readTx(); txLater(); return; }
  if (t.id==="tx-tag"){ const v = t.value.trim(); if (v){ readTx(); S.tx.tags = [...new Set([...(S.tx.tags||[]), v])]; renderTx(); } return; }
  const ph = t.closest("[data-ph]");
  if (ph && ph.files?.[0]) await uploadFoto(ph.files[0]);
});
document.addEventListener("keydown", e=>{ if (e.key==="Escape" && S.tx){ e.stopImmediatePropagation(); tryCloseTx(); } }, true);
document.addEventListener("keydown", e=>{
  if (e.key==="Enter" && e.target.id==="tx-tag"){ e.preventDefault(); const v = e.target.value.trim(); if (v){ readTx(); S.tx.tags=[...new Set([...(S.tx.tags||[]), v])]; renderTx(); $("tx-tag")?.focus(); } }
});

/* ================= Despensa: análisis de tickets ================= */
const DESP_RNG = [["mes","Mes",1],["trim","Trimestre",3],["sem","Semestre",6],["ano","Año",12]];
function despRange(){
  const r = DESP_RNG.find(x=>x[0]===(S.despRng||"mes")), n = r[2], off = S.despOff||0;
  const y = today.getFullYear(), m = today.getMonth();
  const startM = n===12 ? new Date(y+off, 0, 1) : new Date(y, Math.floor(m/n)*n + off*n, 1);
  const end = new Date(startM.getFullYear(), startM.getMonth()+n, 0);
  const lab = n===1 ? ymLabel(iso(startM).slice(0,7)) : n===12 ? String(startM.getFullYear()) : `${ymLabel(iso(startM).slice(0,7))} – ${ymLabel(iso(end).slice(0,7))}`;
  return {from: iso(startM), to: iso(end), lab};
}
function renderDespensa(){
  const box = $("despensa"); if (!box) return;
  if (!HIST.loaded){ box.innerHTML = `<p class="empty">Cargando…</p>`; return; }
  const R = despRange();
  const items = itemsRange(R.from, R.to).filter(x=>x.t==="g" && DESP_CATS.includes(x.cat)).sort((a,b)=>b.f.localeCompare(a.f));
  const total = items.reduce((a,x)=>a+x.m,0), sums = {}; let imp=0, inn=0, dieta=0, clas=0, desc=0;
  const tiendas = {}, prods = {};
  items.forEach(x=>{
    const tk = x.ticket; if (!tk) return;
    desc += +tk.desc||0; const tn = tk.tienda||"Sin tienda";
    tiendas[tn] = tiendas[tn]||{m:0,n:0}; tiendas[tn].m += x.m; tiendas[tn].n++;
    (tk.items||[]).forEach(it=>{ const m = +it.m||0, c = tkKey(it.c); sums[c]=(sums[c]||0)+m; clas += m; if (it.imp) imp += m; if (it.inn) inn += m; if (it.d) dieta += m;
      const k = (it.p||"").trim(); if (!k) return; const pr = prods[k] = prods[k]||{n:0,m:0,q:0,fechas:[],tiendas:{},u:it.u||"pz"};
      pr.n++; pr.m += m; pr.q += +it.q||1; pr.fechas.push(x.f); const u = m/(+it.q||1); const tt = pr.tiendas[tn] = pr.tiendas[tn]||[]; tt.push(u); });
  });
  const sin = Math.max(0, total - clas + desc);
  const parts = [...Object.keys(sums).sort((a,b)=>sums[b]-sums[a]).map(k=>[tkName(k),sums[k],tkColor(k)]), ...(sin>0.5?[["Sin desglosar",sin,"var(--line)"]]:[])];
  let h = `<div class="seg">${DESP_RNG.map(([v,l])=>`<button type="button" data-act="desprng" data-v="${v}" aria-pressed="${(S.despRng||"mes")===v}">${l}</button>`).join("")}</div>
    <div class="sec-head"><button class="btn sm" data-act="despprev" aria-label="Anterior">‹</button><b>${esc(R.lab)}</b><button class="btn sm" data-act="despnext" aria-label="Siguiente">›</button></div>
    <div class="ct-head"><span class="sub">Despensa</span><b class="bal-big num">${fmt(total)}</b><span class="sub">${items.length} compras · ${items.filter(x=>x.ticket?.items?.length).length} desglosadas</span></div>
    <div class="stacked">${parts.map(p=>`<i style="width:${p[1]/Math.max(total+desc,clas,1)*100}%;background:${p[2]}"></i>`).join("")}</div>
    <div class="bal-grid num">${parts.map(p=>`<div><span><span class="dot" style="background:${p[2]}"></span> ${esc(p[0])}</span><b>${fmt(p[1])}</b></div>`).join("")}
      ${dieta?`<div><span>✅ Va con la dieta</span><b style="color:var(--ok)">${fmt(dieta)}</b></div>`:""}${imp?`<div><span>⚡ Impulsivas</span><b style="color:var(--bad)">${fmt(imp)}</b></div>`:""}${inn?`<div><span>❌ Innecesarias</span><b style="color:var(--bad)">${fmt(inn)}</b></div>`:""}${desc?`<div><span>🏷️ Descuentos por puntos</span><b style="color:var(--ok)">−${fmt(desc)}</b></div>`:""}</div>`;
  const tl = Object.entries(tiendas).sort((a,b)=>b[1].m-a[1].m);
  if (tl.length) h += `<div class="sec-head"><b>Por súper</b></div><table class="bt"><tbody>${tl.map(([t,v])=>`<tr><td>${esc(t)}</td><td class="num">${v.n} compras</td><td class="num">${fmt(v.m)}</td></tr>`).join("")}</tbody></table>`;
  const pl = Object.entries(prods).sort((a,b)=>b[1].m-a[1].m).slice(0,40);
  if (pl.length){
    h += `<div class="sec-head"><b>Productos</b><span class="sub">precio unitario · mejor súper · cada cuántos días</span></div><table class="bt tk-prod"><thead><tr><th>Producto</th><th>Veces</th><th>Gasto</th><th>Prom.</th><th>Más barato</th><th>Cada</th></tr></thead><tbody>`;
    pl.forEach(([k,v])=>{
      const best = Object.entries(v.tiendas).map(([t,us])=>[t, us.reduce((a,u)=>a+u,0)/us.length]).sort((a,b)=>a[1]-b[1]);
      const fs = [...new Set(v.fechas)].sort(), gap = fs.length>1 ? Math.round((parseD(fs[fs.length-1])-parseD(fs[0]))/86400000/(fs.length-1)) : null;
      h += `<tr><td>${esc(k)}</td><td class="num">${v.n}</td><td class="num">${fmt0(v.m)}</td><td class="num">${fmt(v.m/v.q)}<span class="sub">/${esc(v.u)}</span></td><td>${best.length>1?`${esc(best[0][0])} <span class="sub num">${fmt(best[0][1])}/${esc(v.u)}</span>`:`<span class="sub">${esc(best[0]?.[0]||"")}</span>`}</td><td class="num">${gap!=null?gap+" d":"—"}</td></tr>`;
    });
    h += `</tbody></table>`;
  }
  h += `<p class="sub" style="margin:0">Para desglosar una compra, ábrela, agrega la foto del ticket y toca “Leer ticket”, o desglósala a mano.</p>`;
  h += items.map(x=>`<button class="mrow" data-act="despopen" data-id="${esc(x.id)}" data-f="${esc(x.f)}"><span class="mcat">${dShort(x.f)}</span><span class="mn">${esc(x.ticket?.tienda||x.n||x.cat)}<span class="sub"> · ${x.ticket?.items?.length?"✓ desglosada":"sin desglose"}</span></span><span class="num">${fmt(x.m)}</span></button>`).join("") || `<p class="empty">Sin compras de despensa en este periodo.</p>`;
  box.innerHTML = h;
}
