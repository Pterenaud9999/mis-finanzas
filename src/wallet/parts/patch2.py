# --- pagos de periodos, parcial, adelantos, super ---
app=rep(app,'["riesgo","En riesgo"]','["riesgo","En riesgo"],["parcial","Pago parcial"]')
app=rep(app,'''  h += `<div class="blk-a"><button class="btn sm primary" data-act="addrow"''','''  h += pagosHTML(p);
  h += `<div class="blk-a"><button class="btn sm primary" data-act="addrow"''')
app=rep(app,'''<button class="btn sm" data-act="chdate" data-p="${id}">Cambiar fecha</button>''','''<button class="btn sm" data-act="paynew" data-p="${id}">💸 Registrar pago</button><button class="btn sm" data-act="chdate" data-p="${id}">Cambiar fecha</button>''')
app=rep(app,'''  el.className = el.className.replace(/st-\\w+/,"st-"+el.value);''','''  if (el.value==="pagado" && faltante(p)>0.009){ el.value = p.status; if (S.sel!==p.card || !S.sheet) openCard(p.card); S.openP = p.id; openPay(p,"total"); renderDetail(); return; }
  el.className = el.className.replace(/st-\\w+/,"st-"+el.value);''')
app=rep(app,'''  const unpaid = S.periods.filter(p=>p.card===c.id && p.status!=="pagado").reduce((a,p)=>a+total(p),0);
  const msi = S.plans.filter(p=>p.card===c.id && p.kind==="msi").reduce(''','''  const unpaid = S.periods.filter(p=>p.card===c.id && p.status!=="pagado").reduce((a,p)=>a+faltante(p),0);
  const msi = S.plans.filter(p=>p.card===c.id && p.kind==="msi" && !p.movId).reduce(''')
app=rep(app,'''  const due = open.reduce((a,p)=>a+total(p),0);''','''  const due = open.reduce((a,p)=>a+faltante(p),0);''')
app=rep(app,'''  const list = S.periods.filter(p=>p.status!=="pagado" && total(p)>0).sort(''','''  const list = S.periods.filter(p=>p.status!=="pagado" && faltante(p)>0 && (dayDiff(p.due)<=62 || p.status==="parcial")).sort(''')
app=rep(app,'''      <div class="m num">${fmt(total(p))}</div><div class="s">${statusSelect(p)}''','''      <div class="m num">${fmt(faltante(p))}${p.status==="parcial"?`<div class="sub">de ${fmt(total(p))}</div>`:""}</div><div class="s">${statusSelect(p)}''')
app=rep(app,'''    const resta = aport ? 0 : p.saldo!=null ?''','''    const resta = aport ? 0 : p.movId ? S.periods.filter(q=>q.status!=="pagado").reduce((a,q)=>a+(q.items||[]).filter(i=>i.movId===p.movId && !i.adelanto).reduce((s,i)=>s+(+i.monto||0),0),0) : p.saldo!=null ?''')
app=rep(app,'''      ${p.nota && p.total?`<div class="plan-m"><span>${esc(p.nota)}</span></div>`:""}</div>`;''','''      ${p.nota && p.total?`<div class="plan-m"><span>${esc(p.nota)}</span></div>`:""}
      ${p.intereses?`<div class="plan-m"><span>Precio ${fmt(p.neto)} · intereses ${fmt(p.intereses)} (${(p.intereses/p.neto*100).toFixed(1)} %)</span></div>`:""}
      ${(p.adelantos||[]).length?`<div class="plan-m"><span>Adelantos: ${p.adelantos.map(a=>`${dShort(a.f)} ${fmt0(a.m)}`).join(" · ")}</span></div>`:""}
      ${p.movId?`<div class="actions"><button class="btn sm" data-act="adel" data-p="${esc(p.id)}">Adelantar pagos</button></div>${S.adel===p.id?adelHTML(p):""}`:""}</div>`;''')
app=rep(app,"  db.collection(\"trash\").onSnapshot(","  db.doc(\"config/super\").onSnapshot(s=>{ S.superCfg = s.exists ? s.data() : {tipos:[], prod:{}}; renderDespensa(); if (S.tx) renderTx(); }, ()=>{});\n  db.collection(\"trash\").onSnapshot(")
app=rep(app,"""  $("plans").innerHTML = list.length ? list.map(p=>{""","""  $("plans").innerHTML = list.length ? list.map(p=>{
    if (p.movId){ const its = S.periods.flatMap(q=>(q.items||[]).filter(i=>i.movId===p.movId && !i.adelanto).map(i=>q.status==="pagado")); p = {...p, total: its.length, pagados: its.filter(Boolean).length}; }""")
app=rep(app,"""if (form.dataset.i==="") items.push(item); else items[+form.dataset.i] = item;""","""if (form.dataset.i==="") items.push(item); else items[+form.dataset.i] = {...items[+form.dataset.i], ...item};""")
app=rep(app,"""<td>${esc(it.concepto)}</td><td class="n num">${fmt(+it.monto)}</td></tr>`).join("") + `</table>`;""","""<td>${esc(it.concepto)}${it.pagoId?' <span class="paid-tag">✓ pagado</span>':""}</td><td class="n num${it.pagoId?" paid":""}">${fmt(+it.monto)}</td></tr>`).join("") + `</table>`;""")
app=rep(app,"function openCard(id){ const c=card(id); if(!c) return;","function openCard(id){ const c=card(id); if(!c) return; if (location.hash!==\"#wallet\"){ location.hash=\"wallet\"; showView(); }")
app=rep(app,"""else if (t.tipo==="mov") await writeMonth(t.ym, [...monthItems(t.ym).filter(y=>y.id!==t.data.id), t.data].sort((a,b)=>a.f.localeCompare(b.f)));""","""else if (t.tipo==="mov"){ await writeMonth(t.ym, [...monthItems(t.ym).filter(y=>y.id!==t.data.id), t.data].sort((a,b)=>a.f.localeCompare(b.f))); await addLinks(t.data); }""")
app=rep(app,"if (location.hash!==\"#wallet\"){ location.hash=\"wallet\"; showView(); }","S.backView = location.hash && location.hash!==\"#wallet\" ? location.hash.slice(1) : null; if (location.hash!==\"#wallet\"){ location.hash=\"wallet\"; showView(); }")
app=rep(app,'<button class="btn" data-act="closesheet">← Wallet</button>','<button class="btn" data-act="closesheet">← ${S.backView?({balance:"Balance",calendario:"Calendario",inicio:"Inicio",cuentas:"Cuentas"})[S.backView]||"Volver":"Wallet"}</button>')
app=rep(app,'    case "closesheet": S.sheet=false; resetForms(); break;','    case "closesheet": S.sheet=false; resetForms(); if (S.backView){ const v=S.backView; S.backView=null; location.hash=v; } break;')
app=rep(app,'  if (e.key==="Escape" && S.sheet){ S.sheet=false; resetForms(); renderDetail(); return; }','  if (e.key==="Escape" && S.sheet){ S.sheet=false; resetForms(); renderDetail(); if (S.backView){ const v=S.backView; S.backView=null; location.hash=v; } return; }')
app=rep(app,'const cname = c => c ? (c.nombre+(c.producto?" "+c.producto:"")) : "";','const cname = c => c ? (c.producto && c.producto.toLowerCase().startsWith(c.nombre.toLowerCase()) ? c.producto : c.nombre+(c.producto?" "+c.producto:"")) : "";')
app=rep(app,'''<div class="ptab-st">${statusSelect(p,true)}${p.fechaRevisar?'<span class="chipst under">Fecha por revisar</span>':""}''','''<div class="ptab-st">${statusSelect(p,true)}${p.fechaRevisar?'<span class="chipst under">Fecha por revisar</span>':""}${p.fechaEstimada?`<span class="chipst under">Fecha estimada · antes ${dLong(p.dueOriginal)}</span>`:""}''')
app=rep(app,'update({due, fechaRevisar:false})','update({due, fechaRevisar:false, fechaEstimada:false})')
# --- Sugerencias al borrar desde la Wallet gastos que también están en Inicio
app=rep(app,'''  const del = it ? `<button class="btn danger" type="button" data-act="delrow" data-p="${esc(pid)}" data-i="${it.i}">${S.confirmRow===pid+":"+it.i?"Confirmar eliminar":"Eliminar"}</button>` : "";''','''  const conf = it && S.confirmRow===pid+":"+it.i;
  const del = !it ? "" : (conf && it.movId) ? `<div class="full tx-warn" role="alert">💡 <b>Este gasto también está registrado en Inicio.</b> Si el gasto no existió, elimínalo de los dos lados. Si solo el banco no lo cobró en este periodo, quítalo solo de la Wallet.${/^\\d+\\/\\d+ /.test(it.concepto||"")?" <br>Al quitarlo de Inicio se borra la compra completa con todas sus mensualidades.":""}
      <div class="actions"><button class="btn sm danger" type="button" data-act="delrow" data-mode="ambos" data-p="${esc(pid)}" data-i="${it.i}">También de Inicio</button><button class="btn sm" type="button" data-act="delrow" data-mode="wallet" data-p="${esc(pid)}" data-i="${it.i}">Solo de la Wallet</button></div></div>`
    : `<button class="btn danger" type="button" data-act="delrow" data-p="${esc(pid)}" data-i="${it.i}">${conf?"Confirmar eliminar":"Eliminar"}</button>`;''')
app=rep(app,'''    <button class="btn sm danger" data-act="delper" data-p="${id}">${S.confirmDel===p.id?"Confirmar eliminar":"Eliminar periodo"}</button></div></div>`;''','''    <button class="btn sm danger" data-act="delper" data-p="${id}">${S.confirmDel===p.id?"Confirmar eliminar":"Eliminar periodo"}</button></div>${S.confirmDel===p.id && (p.items||[]).some(i=>i.movId) ? (()=>{ const n = (p.items||[]).filter(i=>i.movId).length;
      return `<div class="ef tx-warn" role="alert">💡 <b>Este periodo tiene ${n} gasto${n>1?"s":""} registrado${n>1?"s":""} también en Inicio.</b> ¿Qué hago con ${n>1?"ellos":"él"}? Si la fecha estaba mal, muévelos al siguiente periodo.
      <div class="actions"><button class="btn sm primary" data-act="delper" data-mode="mover" data-p="${id}">Mover al siguiente periodo</button><button class="btn sm danger" data-act="delper" data-mode="ambos" data-p="${id}">Eliminar también de Inicio</button><button class="btn sm" data-act="delper" data-mode="wallet" data-p="${id}">Solo quitar de la Wallet</button><button class="btn sm" data-act="cancel">Cancelar</button></div></div>`; })() : ""}</div>`;''')
app=rep(app,'''    case "delper":
      if (S.confirmDel!==pid){ S.confirmDel=pid; break; }
      if (db){ const {id, ...data} = JSON.parse(JSON.stringify(P)); await save(async()=>{ await toTrash({tipo:"periodo", card:P.card, pid, data}); await db.doc("periods/"+pid).delete(); }); }
      resetForms(); S.openP=null; break;''','''    case "delper": {
      if (S.confirmDel!==pid){ S.confirmDel=pid; break; }
      const linked = (P.items||[]).some(i=>i.movId), mode = a.dataset.mode;
      if (linked && !mode) break;
      if (db){ const {id, ...data} = JSON.parse(JSON.stringify(P)); await save(async()=>{
        if (mode==="mover"){
          const next = S.periods.filter(q=>q.card===P.card && q.id!==P.id && q.due>P.due).sort((x,y)=>x.due.localeCompare(y.due))[0];
          const moved = (P.items||[]).map(i=>({...i}));
          if (next) await db.doc("periods/"+next.id).update({items:[...(next.items||[]).map(i=>({...i})), ...moved]});
          else { const due = addMonthsISO(P.due, 1); await db.doc("periods/"+P.card+"-"+due).set({card:P.card, due, status:"abierto", items:moved, auto:true}); }
          await toTrash({tipo:"periodo", card:P.card, pid, data:{...data, items:[]}});
        } else {
          if (mode==="ambos") for (const mid of [...new Set((P.items||[]).filter(i=>i.movId).map(i=>i.movId))]) await delMovById(mid);
          await toTrash({tipo:"periodo", card:P.card, pid, data});
        }
        await db.doc("periods/"+pid).delete(); }); }
      resetForms(); S.openP=null; break; }''')
app=rep(app,'''    case "delrow": {
      const key = pid+":"+idx;
      if (S.confirmRow!==key){ S.confirmRow=key; break; }''','''    case "delrow": {
      const key = pid+":"+idx;
      if (S.confirmRow!==key){ S.confirmRow=key; break; }
      if (P.items[idx]?.movId){ if (!a.dataset.mode) break;
        if (a.dataset.mode==="ambos"){ if (db) await save(()=>delMovById(P.items[idx].movId)); resetForms(); break; } }''')
app=rep(app,'  $("stack").className = "stack v-"+view;','  $("stack").className = "stack v-"+view + ((()=>{ try { return cfgGet().ola; } catch(e){ return false; } })() ? " ola-tactil" : "");')
# --- Débito: saldo desde Cuentas ---
app=rep(app,'<div><div class="wsmall">Saldo</div><div class="wbig num">${c.saldo!=null?fmt0(c.saldo):"Sin capturar"}</div></div>','<div><div class="wsmall">Saldo</div><div class="wbig num">${tddSaldo(c)!=null?fmt0(tddSaldo(c)):"Sin capturar"}</div></div>')
app=rep(app,': `<b class="num">${c.saldo!=null?fmt0(c.saldo):"—"}</b>`;',': `<b class="num">${tddSaldo(c)!=null?fmt0(tddSaldo(c)):"—"}</b>`;')
app=rep(app,'const s = all.reduce((a,c)=>a+(+c.saldo||0),0);','const s = all.reduce((a,c)=>a+(+tddSaldo(c)||0),0);')
app=rep(app,'<b>${all.filter(c=>c.saldo==null).length}</b>','<b>${all.filter(c=>tddSaldo(c)==null).length}</b>')
app=rep(app,'<div><span>Saldo</span><b class="num">${c.saldo!=null?fmt(c.saldo):"Sin capturar"}</b></div>','<div><span>Saldo</span><b class="num">${tddSaldo(c)!=null?fmt(tddSaldo(c)):"Sin capturar"}</b></div>')
app=rep(app,'''function apartadosHTML(c){
  const ap = c.apartados||[]; if (!ap.length) return "";''','''function apartadosHTML(c){
  if (tddCtas(c).length) return tddCtasHTML(c);
  const ap = c.apartados||[]; if (!ap.length) return "";''')
app=rep(app,': `<label for="e-saldo">Saldo total de la cuenta<input id="e-saldo" type="number" step="0.01" value="${c.saldo??""}"></label>',': tddLinkHTML(c) + `<label for="e-saldo">Saldo manual (solo si no eliges cuentas arriba)<input id="e-saldo" type="number" step="0.01" value="${c.saldo??""}"></label>')
app=rep(app,'} else { upd.saldo = num("e-saldo"); readAp();','} else { upd.saldo = num("e-saldo"); if (document.querySelector("[data-tddcta]")) upd.ctas = [...document.querySelectorAll("[data-tddcta]:checked")].map(x=>x.dataset.tddcta); readAp();')
# --- Papelera: cuentas eliminadas ---
app=rep(app,'    const desc = t.tipo==="trf" ?','    const desc = t.tipo==="cta" ? `Cuenta <b>${esc(d.n)}</b> <span class="sub">(sus registros siguen en tu historial)</span>` : t.tipo==="trf" ?')
app=rep(app,'        if (t.tipo==="trf") await writeTrfMonth(','        if (t.tipo==="cta"){ const l=((S.ctas?.list)||[]).map(x=>({...x})); if (!l.some(x=>x.n===t.data.n)) l.splice(Math.min(t.i??l.length, l.length), 0, t.data); await db.doc("config/cuentas").set({...(S.ctas||{}), list:l}); }\n        else if (t.tipo==="trf") await writeTrfMonth(')
