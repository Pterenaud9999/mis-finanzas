# Construye la PWA en la raíz del repositorio a partir de src/wallet/index.html (ya compilado).
# Uso: cd src/wallet && python3 parts/build.py && cd ../pwa && python3 build_pwa.py
import shutil, os, time
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))
s=open(os.path.join(HERE,'..','wallet','index.html')).read()
head=open(os.path.join(HERE,'head.html')).read()
s=s.replace('</head>', head+'</head>',1)
s=s.replace('<script>','<script src="vendor/supabase.js"></script>\n<script src="shim.js"></script>\n<script>',1)
t='const timer = setTimeout(()=>{ $("sync").textContent = "Sin conexión a tus datos todavía"; }, 10000);'
assert t in s; s=s.replace(t, t.replace('{ $("sync")','{ if (!window.MF_PWA) $("sync")'))
import re
s=re.sub(r'<div class="dr-av">[^<]*</div><div><b>[^<]*</b>','<div class="dr-av">💳</div><div><b>Mis finanzas</b>',s,count=1)
open(os.path.join(ROOT,'index.html'),'w').write(s)
for f in ['shim.js','manifest.webmanifest','icon-192.png','icon-512.png']: shutil.copy(os.path.join(HERE,f), os.path.join(ROOT,f))
os.makedirs(os.path.join(ROOT,'vendor'),exist_ok=True); shutil.copy(os.path.join(HERE,'vendor','supabase.js'), os.path.join(ROOT,'vendor','supabase.js'))
open(os.path.join(ROOT,'sw.js'),'w').write(open(os.path.join(HERE,'sw.js')).read().replace('__VER__', time.strftime('%Y%m%d%H%M%S')))
open(os.path.join(ROOT,'.nojekyll'),'w').write('')
print('PWA lista en', ROOT)
