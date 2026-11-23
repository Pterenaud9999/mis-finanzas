/* Mis finanzas — capa de datos fuera de Claude: Supabase + caché local (IndexedDB) + cola sin conexión */
(function(){
  const CFG = { url: "https://fsmnkedjwmwbtrqtlrbq.supabase.co", key: "sb_publishable_m8jjy2agGgHYAapY4aDt7Q_Fk-0SUdu" };
  window.MF_PWA = true;
  const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "mf-auth" } });
  const clone = v => v==null ? v : JSON.parse(JSON.stringify(v));

  /* ---------- IndexedDB mínima ---------- */
  const idb = (()=>{ let p; const open = () => p || (p = new Promise((ok,ko)=>{ const r = indexedDB.open("mis-finanzas", 1);
      r.onupgradeneeded = () => { r.result.createObjectStore("kv"); r.result.createObjectStore("fotos"); }; r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }));
    const tx = async (st, mode, fn) => { const d = await open(); return new Promise((ok,ko)=>{ const t = d.transaction(st, mode), s = t.objectStore(st); const r = fn(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => ko(t.error); }); };
    return { get:(st,k)=>tx(st,"readonly",s=>s.get(k)), put:(st,k,v)=>tx(st,"readwrite",s=>s.put(v,k)), del:(st,k)=>tx(st,"readwrite",s=>s.delete(k)), clear:st=>tx(st,"readwrite",s=>s.clear()) };
  })();

  /* ---------- Estado local ---------- */
  const L = { docs: {}, lastSync: null, outbox: [], user: null };
  let loaded = false, synced = false, saveT = null, syncing = false, pendingSync = false;
  const loadedP = (async()=>{ try { const st = await idb.get("kv","state"); if (st){ L.docs = st.docs||{}; L.lastSync = st.lastSync||null; L.outbox = st.outbox||[]; L.user = st.user||null; } } catch(e){} loaded = true; })();
  const persist = () => { clearTimeout(saveT); saveT = setTimeout(()=>{ idb.put("kv","state",{docs:L.docs,lastSync:L.lastSync,outbox:L.outbox,user:L.user}).catch(()=>{}); }, 250); };

  /* ---------- Suscriptores ---------- */
  const subsDoc = new Map(), subsCol = new Map();
  const colOf = path => { const i = path.indexOf("/"); return i<0 ? null : path.slice(0,i); };
  const snapDoc = path => { const d = L.docs[path]; const ok = d && !d.deleted; return { id: path.slice(path.indexOf("/")+1), exists: !!ok, data: () => ok ? clone(d.data) : undefined, metadata: { fromCache: !synced } }; };
  const snapCol = c => ({ docs: Object.keys(L.docs).filter(p=>colOf(p)===c && !L.docs[p].deleted && p.split("/").length===2).sort().map(p=>({ id:p.slice(c.length+1), exists:true, data:()=>clone(L.docs[p].data) })), metadata: { fromCache: !synced } });
  let notifyQ = new Set(), notifyT = null;
  const notify = paths => { paths.forEach(p=>notifyQ.add(p)); if (notifyT) return; notifyT = setTimeout(()=>{ notifyT = null; const q = notifyQ; notifyQ = new Set(); const cols = new Set();
      q.forEach(p=>{ (subsDoc.get(p)||[]).forEach(f=>{ try{ f(snapDoc(p)); }catch(e){ console.error(e); } }); cols.add(colOf(p)); });
      cols.forEach(c=>(subsCol.get(c)||[]).forEach(f=>{ try{ f(snapCol(c)); }catch(e){ console.error(e); } })); }, 0); };
  const notifyAll = () => { notify([...new Set([...Object.keys(L.docs), ...subsDoc.keys(), ...[...subsCol.keys()].map(c=>c+"/")])]); };

  /* ---------- Escrituras locales + cola ---------- */
  /* Combina cambios de dos dispositivos: base = última versión sincronizada */
  const eq = (a,b) => JSON.stringify(a)===JSON.stringify(b);
  const isObj = v => v && typeof v==="object" && !Array.isArray(v);
  function mergeArr(base, loc, srv){
    base = Array.isArray(base) ? base : [];
    const hasId = a => a.length && a.every(x=>isObj(x) && x.id!=null);
    if ((hasId(loc)||!loc.length) && (hasId(srv)||!srv.length) && (hasId(base)||!base.length) && (loc.length||srv.length)){
      const B = new Map(base.map(x=>[x.id,x])), Lm = new Map(loc.map(x=>[x.id,x])), Sm = new Map(srv.map(x=>[x.id,x])), out = [];
      const ids = [...new Set([...srv.map(x=>x.id), ...loc.map(x=>x.id)])];
      ids.forEach(id=>{ const b = B.get(id), l = Lm.get(id), sv = Sm.get(id);
        if (b && !l && (!sv || eq(sv,b))) return;            // borrado aquí
        if (b && !sv && (!l || eq(l,b))) return;             // borrado en otro dispositivo
        if (l && sv) out.push(b ? merge3(b,l,sv) : l); else out.push(l || sv); });
      return out;
    }
    const key = x => JSON.stringify(x), cnt = a => { const m = new Map(); a.forEach(x=>{ const k = key(x); m.set(k,(m.get(k)||0)+1); }); return m; };
    const cb = cnt(base), cs = cnt(srv), cl = cnt(loc), out = [];
    const removedBySrv = new Map(); cb.forEach((n,k)=>{ const r = n - (cs.get(k)||0); if (r>0) removedBySrv.set(k,r); });
    loc.forEach(x=>{ const k = key(x), r = removedBySrv.get(k)||0; if (r>0 && (cb.get(k)||0)>0){ removedBySrv.set(k,r-1); return; } out.push(x); });
    const addedBySrv = new Map(); cs.forEach((n,k)=>{ const a = n - (cb.get(k)||0); if (a>0) addedBySrv.set(k,a); });
    srv.forEach(x=>{ const k = key(x), a = addedBySrv.get(k)||0; if (a>0 && (cl.get(k)||0) - (cb.get(k)||0) < a){ out.push(x); addedBySrv.set(k,a-1); } });
    return out;
  }
  function merge3(base, loc, srv){
    if (eq(loc, base)) return srv; if (eq(srv, base) || eq(loc, srv)) return loc;
    if (Array.isArray(loc) && Array.isArray(srv)) return mergeArr(base, loc, srv);
    if (isObj(loc) && isObj(srv)){ const b = isObj(base) ? base : {}, o = {};
      new Set([...Object.keys(loc), ...Object.keys(srv)]).forEach(k=>{
        const inL = k in loc, inS = k in srv, inB = k in b;
        if (!inL && inB && (!inS || eq(srv[k], b[k]))) return; if (!inS && inB && (!inL || eq(loc[k], b[k]))) return;
        if (inL && inS) o[k] = merge3(b[k], loc[k], srv[k]); else o[k] = inL ? loc[k] : srv[k]; });
      return o; }
    return loc;
  }
  window.MF_merge3 = merge3;

  function localWrite(path, data, deleted){
    const prev = L.docs[path];
    L.docs[path] = { data: deleted ? {} : clone(data), deleted: !!deleted, updated_at: prev?.updated_at || null, base: prev ? (prev.local ? prev.base : clone(prev.data)) : undefined, local: true };
    L.outbox = L.outbox.filter(o=>o.path!==path); L.outbox.push({ path, data: deleted ? {} : clone(data), deleted: !!deleted });
    persist(); notify([path]); scheduleSync(400);
    if (!navigator.onLine) setTimeout(()=>setStatus(`Sin conexión · ${L.outbox.length} cambio${L.outbox.length>1?"s":""} por subir`), 50);
  }

  /* ---------- Sincronización ---------- */
  let syncT = null;
  function scheduleSync(ms){ clearTimeout(syncT); syncT = setTimeout(sync, ms||0); }
  function setStatus(t){ const el = document.getElementById("sync"); if (el) el.textContent = t; }
  async function sync(){
    if (syncing){ pendingSync = true; return; }
    if (!navigator.onLine || !L.user){ if (L.outbox.length) setStatus(`Sin conexión · ${L.outbox.length} cambio${L.outbox.length>1?"s":""} guardado${L.outbox.length>1?"s":""} en este dispositivo`); return; }
    syncing = true;
    try {
      // subir
      while (L.outbox.length){
        const batch = L.outbox.slice(0, 200);
        const { data: cur, error: e0 } = await sb.from("docs").select("path,data,deleted,updated_at").in("path", batch.map(o=>o.path)); if (e0) throw e0;
        const srvMap = new Map((cur||[]).map(r=>[r.path, r])), mergedPaths = [];
        const rows = batch.map(o=>{ const sv = srvMap.get(o.path), loc = L.docs[o.path];
          if (sv && loc && sv.updated_at !== loc.updated_at && !o.deleted && !sv.deleted){ // otro dispositivo cambió este documento
            const m = merge3(loc.base, o.data, sv.data); if (!eq(m, o.data)){ o.data = m; loc.data = clone(m); mergedPaths.push(o.path); } }
          return { owner: L.user.id, path: o.path, data: o.data, deleted: o.deleted }; });
        const { data, error } = await sb.from("docs").upsert(rows, { onConflict: "owner,path" }).select("path,updated_at");
        if (error) throw error;
        const sent = new Set(batch.map(o=>o.path));
        L.outbox = L.outbox.filter(o=>!sent.has(o.path) || !batch.includes(o));
        (data||[]).forEach(r=>{ const d = L.docs[r.path]; if (d && !L.outbox.some(o=>o.path===r.path)){ d.updated_at = r.updated_at; delete d.local; d.base = undefined; } });
        persist(); if (mergedPaths.length) notify(mergedPaths);
      }
      // bajar
      const changed = [];
      for (;;){
        let q = sb.from("docs").select("path,data,deleted,updated_at").order("updated_at", { ascending: true }).limit(1000);
        if (L.lastSync) q = q.gt("updated_at", L.lastSync);
        const { data, error } = await q; if (error) throw error;
        (data||[]).forEach(r=>{ if (!L.outbox.some(o=>o.path===r.path)){ const old = L.docs[r.path];
          const same = old && !!old.deleted===!!r.deleted && JSON.stringify(old.data)===JSON.stringify(r.data);
          L.docs[r.path] = { data: r.data, deleted: r.deleted, updated_at: r.updated_at }; if (!same) changed.push(r.path); } L.lastSync = r.updated_at; });
        if (!data || data.length < 1000) break;
      }
      const first = !synced; synced = true; persist();
      if (first) notifyAll(); else if (changed.length) notify(changed);
      if (changed.some(p=>p.startsWith("hist/")) && window.MF_histReady) location.reload();
      setStatus("Al día · " + new Date().toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" }));
    } catch(e){
      console.warn("sync", e);
      setStatus(navigator.onLine ? "No se pudo sincronizar: " + (e?.message || e?.code || e) + " (se reintentará)" : "Sin conexión · cambios guardados en este dispositivo");
      window.MF_lastError = e;
    } finally { syncing = false; if (pendingSync){ pendingSync = false; scheduleSync(300); } }
  }
  window.addEventListener("online", ()=>scheduleSync(200));
  document.addEventListener("visibilitychange", ()=>{ if (document.visibilityState==="visible") scheduleSync(200); });
  setInterval(()=>{ if (document.visibilityState==="visible") sync(); }, 60000);

  /* ---------- API compatible con claude.use("db") ---------- */
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const dbApi = {
    doc: path => ({
      onSnapshot(cb, err){ const a = subsDoc.get(path) || []; a.push(cb); subsDoc.set(path, a); setTimeout(()=>{ try{ cb(snapDoc(path)); }catch(e){ console.error(e); } }, 0);
        return () => { const b = subsDoc.get(path)||[]; subsDoc.set(path, b.filter(f=>f!==cb)); }; },
      async set(data){ localWrite(path, data, false); },
      async update(data){ const cur = L.docs[path]; if (!cur || cur.deleted) throw Object.assign(new Error("No existe"), {code:"not_found"}); localWrite(path, { ...cur.data, ...clone(data) }, false); },
      async delete(){ if (L.docs[path]) localWrite(path, {}, true); }
    }),
    collection: c => ({
      onSnapshot(cb, err){ const a = subsCol.get(c) || []; a.push(cb); subsCol.set(c, a); setTimeout(()=>{ try{ cb(snapCol(c)); }catch(e){ console.error(e); } }, 0);
        return () => { const b = subsCol.get(c)||[]; subsCol.set(c, b.filter(f=>f!==cb)); }; },
      async add(data){ const id = rid(); localWrite(c+"/"+id, data, false); return { id }; }
    })
  };

  /* ---------- Fotos (Supabase Storage + caché local) ---------- */
  const fotoURL = new Map(), fotoLoading = new Set();
  const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  function showFoto(id, url){ fotoURL.set(id, url); document.querySelectorAll(`img[data-foto="${CSS.escape(id)}"]`).forEach(im=>{ im.src = url; }); }
  async function loadFoto(id){
    if (fotoLoading.has(id)) return; fotoLoading.add(id);
    try {
      let b = await idb.get("fotos", id).catch(()=>null);
      if (!b && L.user){ const { data, error } = await sb.storage.from("fotos").download(L.user.id + "/" + id); if (!error && data){ b = data; idb.put("fotos", id, b).catch(()=>{}); } }
      if (b) showFoto(id, URL.createObjectURL(b));
    } finally { fotoLoading.delete(id); }
  }
  window.MF_fotoBlob = async id => { let b = await idb.get("fotos", id).catch(()=>null);
    if (!b && L.user){ const { data } = await sb.storage.from("fotos").download(L.user.id + "/" + id); b = data || null; } if (!b) throw new Error("sin foto"); return b; };
  window.MF_deleteFoto = async id => { idb.del("fotos", id).catch(()=>{}); const i = fotoQueue.indexOf(id); if (i>=0) fotoQueue.splice(i,1);
    const u = fotoURL.get(id); if (u){ URL.revokeObjectURL(u); fotoURL.delete(id); }
    if (L.user && navigator.onLine) await sb.storage.from("fotos").remove([L.user.id + "/" + id]).catch(()=>{}); };
  window.MF_fotoSrc = id => { if (fotoURL.has(id)) return fotoURL.get(id); loadFoto(id); return BLANK; };
  async function shrink(file){ // reduce fotos a ~1600 px JPEG
    try { const bmp = await createImageBitmap(file); const k = Math.min(1, 1600/Math.max(bmp.width, bmp.height));
      const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width*k); cv.height = Math.round(bmp.height*k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
      return await new Promise(ok=>cv.toBlob(b=>ok(b||file), "image/jpeg", 0.82)); } catch(e){ return file; }
  }
  const fotoQueue = [];
  async function pushFotos(){
    if (!navigator.onLine || !L.user) return;
    while (fotoQueue.length){ const id = fotoQueue[0]; const b = await idb.get("fotos", id).catch(()=>null);
      if (b){ const { error } = await sb.storage.from("fotos").upload(L.user.id + "/" + id, b, { upsert: true, contentType: b.type || "image/jpeg" }); if (error) break; }
      fotoQueue.shift(); idb.put("kv", "fotoQueue", fotoQueue).catch(()=>{}); }
  }
  idb.get("kv","fotoQueue").then(q=>{ if (Array.isArray(q)) fotoQueue.push(...q); }).catch(()=>{});
  window.addEventListener("online", ()=>pushFotos());
  const assetsApi = {
    async upload(file){ const b = await shrink(file); const id = "f" + rid() + ".jpg";
      await idb.put("fotos", id, b); showFoto(id, URL.createObjectURL(b));
      fotoQueue.push(id); idb.put("kv","fotoQueue",fotoQueue).catch(()=>{}); pushFotos();
      return { id, url: fotoURL.get(id) }; }
  };

  /* ---------- Lector de tickets sin internet (Tesseract) ---------- */
  async function prepOCR(blob){
    const bmp = await createImageBitmap(blob); const k = Math.max(1, Math.min(2.2, 1800/bmp.width));
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width*k); cv.height = Math.round(bmp.height*k);
    const g = cv.getContext("2d"); g.filter = "grayscale(1) contrast(1.6) brightness(1.05)"; g.drawImage(bmp, 0, 0, cv.width, cv.height); return cv;
  }
  window.MF_OCR = async (blob, prog) => {
    if (!window.Tesseract) await new Promise((ok,ko)=>{ const sc = document.createElement("script"); sc.src = "ocr/tesseract.min.js"; sc.onload = ok; sc.onerror = () => ko(new Error("No se pudo cargar el lector")); document.head.appendChild(sc); });
    const base = new URL("ocr/", location.href).href;
    const w = await window.Tesseract.createWorker("spa", 1, { workerPath: base+"worker.min.js", corePath: base, langPath: base, workerBlobURL: false,
      logger: m => { if (prog && m.status==="recognizing text") prog(m.progress); } });
    try { await w.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
      const { data } = await w.recognize(await prepOCR(blob)); return data.text || ""; }
    finally { w.terminate(); }
  };

  /* ---------- Historial 2022 → (docs hist/*) ---------- */
  window.MF_loadHist = async () => {
    await loadedP; await authP;
    if (!Object.keys(L.docs).some(p=>p.startsWith("hist/")) && navigator.onLine) await sync();
    const meta = L.docs["hist/meta"]?.data || { catsG:[], catsI:[], cuentas:[] }, months = {};
    Object.keys(L.docs).forEach(p=>{ if (p.startsWith("hist/m-") && !L.docs[p].deleted) months[p.slice(7)] = L.docs[p].data.rows || []; });
    window.MF_histReady = true; return { meta, months };
  };

  /* ---------- Importar respaldo ---------- */
  window.MF_import = async j => {
    Object.entries(j.docs).forEach(([p, d])=>{ L.docs[p] = { data: clone(d), deleted:false, updated_at:null, local:true }; L.outbox = L.outbox.filter(o=>o.path!==p); L.outbox.push({ path:p, data:clone(d), deleted:false }); });
    if (j.hist){ const add = (p,d)=>{ L.docs[p] = { data:d, deleted:false, updated_at:null, local:true }; L.outbox.push({ path:p, data:d, deleted:false }); };
      add("hist/meta", j.hist.meta || {}); Object.entries(j.hist.months||{}).forEach(([ym, rows])=>add("hist/m-"+ym, { rows })); }
    for (const [id, url] of Object.entries(j.fotos||{})){ try { const b = await (await fetch(url)).blob(); await idb.put("fotos", id, b); fotoQueue.push(id); } catch(e){} }
    idb.put("kv","fotoQueue",fotoQueue).catch(()=>{});
    await idb.put("kv","state",{docs:L.docs,lastSync:L.lastSync,outbox:L.outbox,user:L.user});
    await sync(); await pushFotos();
  };
  window.MF_logout = async () => { try { await sb.auth.signOut(); } catch(e){} await idb.clear("kv").catch(()=>{}); await idb.clear("fotos").catch(()=>{}); location.reload(); };

  /* ---------- Inicio de sesión ---------- */
  let authResolve; const authP = new Promise(r=>authResolve = r);
  function loginScreen(msg){
    const d = document.createElement("div"); d.id = "mf-login";
    d.innerHTML = `<form class="mf-login-box"><div class="mf-logo">💳</div><h1>Mis finanzas</h1><p class="sub">Inicia sesión una vez en este dispositivo.</p>
      <label>Correo<input id="mf-email" type="email" autocomplete="username" required></label>
      <label>Contraseña<input id="mf-pass" type="password" autocomplete="current-password" required></label>
      <p id="mf-err" role="alert">${msg||""}</p><button class="btn primary" type="submit">Entrar</button></form>`;
    document.body.appendChild(d);
    d.querySelector("form").addEventListener("submit", async e=>{ e.preventDefault(); const err = d.querySelector("#mf-err"); err.textContent = "Entrando…";
      const { data, error } = await sb.auth.signInWithPassword({ email: d.querySelector("#mf-email").value.trim(), password: d.querySelector("#mf-pass").value });
      if (error){ err.textContent = navigator.onLine ? "Correo o contraseña incorrectos." : "Necesitas internet para iniciar sesión la primera vez."; return; }
      if (L.user && L.user.id !== data.user.id){ L.docs = {}; L.outbox = []; L.lastSync = null; }
      L.user = { id: data.user.id, email: data.user.email }; persist(); d.remove(); authResolve(); scheduleSync(0); pushFotos(); });
  }
  (async()=>{
    await loadedP;
    let user = null; try { const { data } = await sb.auth.getSession(); user = data?.session?.user || null; } catch(e){}
    if (user){ L.user = { id: user.id, email: user.email }; persist(); authResolve(); scheduleSync(0); pushFotos(); }
    else if (L.user){ authResolve(); setStatus("Sin conexión · trabajando con tus datos guardados"); } // sesión guardada, sin red
    else loginScreen();
  })();
  sb.auth.onAuthStateChange((ev, session)=>{ if (ev==="SIGNED_OUT" && !navigator.onLine) return; if (session?.user && L.user?.id===session.user.id) scheduleSync(200); });

  window.claude = { use: async name => {
    if (name === "db"){ await loadedP; await authP; return dbApi; }
    if (name === "assets"){ await authP; return assetsApi; }
    return null;
  } };

  if ("serviceWorker" in navigator) window.addEventListener("load", ()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
})();
