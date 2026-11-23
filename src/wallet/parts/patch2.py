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
