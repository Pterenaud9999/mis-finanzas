import sys
app=open('parts/app.js').read(); ext=open('parts/ext.js').read()
def rep(s,a,b):
    assert a in s, a[:70]; return s.replace(a,b)
app=rep(app,"trash:[], trashOpen:false, confirmTrash:null, apDraft:null};","trash:[], trashOpen:false, confirmTrash:null, apDraft:null, movDb:{}, cash:null, pagosCfg:null};")
app=rep(app,"function render(){ renderSummary(); renderNext(); renderStack(); renderDetail(); renderPlans(); renderBudget(); renderTrash(); }",
 "function render(){ renderSummary(); renderNext(); renderStack(); renderDetail(); renderPlans(); renderBudget(); renderTrash(); renderBalance(); renderQuincenas(); renderCal(); renderMovs(); }")
app=rep(app,'''    const desc = t.tipo==="gasto" ?''','''    const desc = t.tipo==="mov" ? `${esc(d.cat)} · ${d.t==="i"?"+":"−"}${fmt(+d.m)} <span class="sub">(movimiento del ${d.f?dLong(d.f):"—"}${d.n?", "+esc(d.n):""})</span>` : t.tipo==="gasto" ?''')
app=rep(app,'''        if (t.tipo==="periodo") await db.doc("periods/"+t.pid).set(t.data);''','''        if (t.tipo==="mov") await writeMonth(t.ym, [...monthItems(t.ym).filter(y=>y.id!==t.data.id), t.data].sort((a,b)=>a.f.localeCompare(b.f)));
        else if (t.tipo==="periodo") await db.doc("periods/"+t.pid).set(t.data);''')
app=rep(app,'''  db.collection("trash").onSnapshot(''','''  db.collection("mov").onSnapshot(s=>{ const o={}; s.docs.forEach(d=>o[d.id]=d.data()); S.movDb=o; renderMovs(); }, ()=>{});
  db.doc("config/efectivo").onSnapshot(s=>{ S.cash = s.exists ? s.data() : {items:[]}; renderBalance(); }, ()=>{});
  db.doc("config/pagos").onSnapshot(s=>{ S.pagosCfg = s.exists ? s.data() : {star:{}}; renderQuincenas(); }, ()=>{});
  db.collection("trash").onSnapshot(''')
app=rep(app,"renderBalance(); renderQuincenas(); renderCal(); renderMovs(); }","renderBalance(); renderQuincenas(); renderCal(); renderMovs(); renderCuentas(); renderGraficos(); renderCategorias(); renderDespensa(); updAb(); }")
app=rep(app,"    const desc = t.tipo===\"mov\" ?","    const desc = t.tipo===\"trf\" ? `Transferencia ${fmt(+d.m)} <span class=\"sub\">(${esc(d.de)} → ${esc(d.a)}, ${d.f?dLong(d.f):\"\"})</span>` : t.tipo===\"mov\" ?")
app=rep(app,"        if (t.tipo===\"mov\") await writeMonth(","        if (t.tipo===\"trf\") await writeTrfMonth(t.ym, [...trfMonth(t.ym).filter(y=>y.id!==t.data.id), t.data].sort((a,b)=>a.f.localeCompare(b.f)));\n        else if (t.tipo===\"mov\") await writeMonth(")
app=rep(app,"  db.collection(\"trash\").onSnapshot(","  db.doc(\"config/cuentas\").onSnapshot(s=>{ S.ctas = s.exists ? s.data() : {list:[]}; renderCuentas(); updAb(); }, ()=>{});\n  db.collection(\"trf\").onSnapshot(s=>{ const o={}; s.docs.forEach(d=>o[d.id]=d.data()); S.trfDb=o; renderCuentas(); updAb(); }, ()=>{});\n  db.doc(\"config/cats\").onSnapshot(s=>{ S.catCfg = s.exists ? s.data() : null; renderCategorias(); renderMovs(); }, ()=>{});\n  db.collection(\"trash\").onSnapshot(")
exec(open('parts/patch2.py',encoding='utf-8').read())
ext = ext + "\n" + open('parts/app2.js').read() + "\n" + open('parts/app3.js').read() + "\n" + open('parts/backup.js').read() + "\nfunction updAb(){ const b=$(\"ab-total\"); if (!b) return; const t=cuentasTotals(); b.innerHTML = `Total <b class=\"num\">${fmt(t.total)}</b>`; }\n"
marker="/* ---------- Datos ---------- */"
app=app.replace(marker, ext+"\n"+marker)
s=open('index.html').read()
a=s.index("<script>")+len("<script>"); b=s.index("</script>")
s=s[:a]+"\n"+app+s[b:]
open('index.html','w').write(s)
