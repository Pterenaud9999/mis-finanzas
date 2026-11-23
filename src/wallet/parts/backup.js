/* ================= Respaldo: exportar / importar ================= */
const BK_COLS = ["cards","periods","plans","trash","mov","trf"];
const BK_CFG = ["config/budget","config/wallet","config/efectivo","config/pagos","config/cuentas","config/cats","config/super","config/prefs"];
function bkOnce(ref){ return new Promise(res=>{ let done=false, un=null; un = ref.onSnapshot(s=>{ if (done) return; done=true; res(s); setTimeout(()=>{ try{ un&&un(); }catch(e){} },0); }, ()=>{ if (!done){ done=true; res(null); } }); }); }
const blobToDataURL = b => new Promise((ok,ko)=>{ const r = new FileReader(); r.onload=()=>ok(r.result); r.onerror=ko; r.readAsDataURL(b); });
async function exportBackup(){
  if (!db) return;
  $("sync").textContent = "Preparando respaldo…";
  const out = {v:1, app:"mis-finanzas", fecha:new Date().toISOString(), docs:{}, hist:{meta:HIST.meta, months:HIST.months}, fotos:{}};
  for (const c of BK_COLS){ const s = await bkOnce(db.collection(c)); (s?.docs||[]).forEach(d=>{ out.docs[c+"/"+d.id] = d.data(); }); }
  for (const p of BK_CFG){ const s = await bkOnce(db.doc(p)); if (s?.exists) out.docs[p] = s.data(); }
  const ids = new Set(); Object.entries(out.docs).forEach(([k,v])=>{ if (k.startsWith("mov/")) (v.items||[]).forEach(x=>(x.fotos||[]).forEach(id=>ids.add(id))); });
  for (const id of ids){ try { const b = window.MF_fotoBlob ? await window.MF_fotoBlob(id) : await fetch(fotoSrc(id)).then(r=>{ if(!r.ok) throw 0; return r.blob(); }); out.fotos[id] = await blobToDataURL(b); } catch(e){} }
  const fname = `mis-finanzas-respaldo-${todayISO}.json`, txt = JSON.stringify(out);
  let dl = null; try { dl = !window.MF_PWA && window.claude?.use ? await window.claude.use("downloads") : null; } catch(e){}
  if (dl){ try { await dl.save({filename:fname, data:txt}); $("sync").textContent = `Respaldo listo: ${Object.keys(out.docs).length} documentos, ${Object.keys(out.fotos).length} fotos`; } catch(e){ $("sync").textContent = "No se guardó el respaldo"; } return; }
  try { localStorage.setItem("mf-lastBackup", String(Date.now())); } catch(e){}
  document.getElementById("bk-toast")?.remove();
  const blob = new Blob([txt], {type:"application/json"});
  const file = new File([blob], fname, {type:"application/json"});
  if (window.MF_PWA && navigator.canShare && navigator.canShare({files:[file]})){
    try { await navigator.share({files:[file], title:"Respaldo Mis finanzas"}); $("sync").textContent = "Respaldo compartido"; return; }
    catch(e){ if (e?.name==="AbortError"){ $("sync").textContent = "Respaldo cancelado"; return; } }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fname;
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  $("sync").textContent = `Respaldo listo: ${Object.keys(out.docs).length} documentos, ${Object.keys(out.fotos).length} fotos`;
}
async function importBackup(file){
  if (!window.MF_import) return;
  try {
    const j = JSON.parse(await file.text());
    if (j.app!=="mis-finanzas" || !j.docs){ alert("Ese archivo no es un respaldo de Mis finanzas."); return; }
    if (!confirm(`Importar respaldo del ${String(j.fecha||"").slice(0,10)}: ${Object.keys(j.docs).length} documentos y ${Object.keys(j.fotos||{}).length} fotos. Los datos con el mismo nombre se reemplazan. ¿Continuar?`)) return;
    $("sync").textContent = "Importando…";
    await window.MF_import(j);
    $("sync").textContent = "Respaldo importado";
    setTimeout(()=>location.reload(), 600);
  } catch(e){ alert("No se pudo importar: "+(e?.message||e)); }
}
document.addEventListener("click", e=>{
  const a = e.target.closest("[data-act]"); if (!a) return;
  if (a.dataset.act==="bkexport"){ e.stopImmediatePropagation(); exportBackup(); }
  if (a.dataset.act==="bkimport"){ e.stopImmediatePropagation(); $("bk-file")?.click(); }
  if (a.dataset.act==="logout" && window.MF_logout){ e.stopImmediatePropagation(); if (confirm("¿Cerrar sesión en este dispositivo?")) window.MF_logout(); }
}, true);
document.addEventListener("change", async e=>{ if (e.target.id==="bk-fotos" && db){ S.prefs = {...(S.prefs||{}), fotosBorrar:e.target.value}; await db.doc("config/prefs").set(S.prefs); purgeFotos().catch(()=>{}); return; }
  if (e.target.id==="bk-file" && e.target.files?.[0]) importBackup(e.target.files[0]); });
/* Recordatorio semanal de respaldo */
setTimeout(()=>{ if (!window.MF_PWA) return; let last = 0; try { last = +localStorage.getItem("mf-lastBackup")||0; } catch(e){}
  const days = last ? Math.floor((Date.now()-last)/86400000) : null; if (days!==null && days<7) return;
  const t = document.createElement("div"); t.id = "bk-toast"; t.className = "bk-toast";
  t.innerHTML = `<span>${days===null?"Aún no tienes respaldo":"Hace "+days+" días de tu último respaldo"}. Guárdalo en Google Drive.</span><button class="btn sm primary" data-act="bkexport">Respaldar</button><button class="iconbtn" aria-label="Cerrar" onclick="this.parentNode.remove()">×</button>`;
  document.body.appendChild(t); }, 6000);

/* Fotos de tickets: borrado automático */
const fotosModo = () => (S.prefs && S.prefs.fotosBorrar) || "nunca";
async function purgeFotos(){
  if (!window.MF_deleteFoto || !db || !HIST.loaded) return;
  const modo = fotosModo(); if (modo==="nunca") return;
  const lim = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate()-30));
  for (const ym of allMonths()){
    const items = monthItems(ym); let ch = false;
    const out = items.map(x=>{
      if (!(x.fotos||[]).length) return x;
      const digit = x.ticket ? (x.ticket.items||[]).length && x.ticket.items.every(i=>i.ok) : !!x.det;
      const borrar = modo==="confirmar" ? digit : (modo==="30" && x.f < lim);
      if (!borrar) return x;
      x.fotos.forEach(id=>window.MF_deleteFoto(id)); ch = true; const y = {...x}; delete y.fotos; return y;
    });
    if (ch) await writeMonth(ym, out);
  }
}
window.MF_purgeFotos = purgeFotos;
setTimeout(()=>purgeFotos().catch(()=>{}), 8000);

(function(){ const d = $("drawer")?.querySelector(".dr-foot"); if (!d) return;
  const box = document.createElement("div");
  box.innerHTML = `<div class="dr-sep">Respaldo</div><button data-act="bkexport"><span>⬇️</span>Exportar respaldo</button>` +
    (window.MF_PWA ? `<label class="bk-pref">Fotos de tickets<select id="bk-fotos"><option value="nunca">Conservar siempre</option><option value="confirmar">Borrar al confirmar los datos</option><option value="30">Borrar después de 30 días</option></select></label><button data-act="bkimport"><span>⬆️</span>Importar respaldo</button><input type="file" id="bk-file" accept="application/json,.json" hidden><button data-act="logout"><span>🚪</span>Cerrar sesión</button>` : "");
  d.before(...box.childNodes); })();

(async()=>{ try { const d = await claude.use("db"); if (!d) return; d.doc("config/prefs").onSnapshot(sn=>{ S.prefs = sn.exists ? sn.data() : {}; const el = document.getElementById("bk-fotos"); if (el) el.value = fotosModo(); }); } catch(e){} })();
