# Construye la PWA en la raíz del repositorio a partir de src/wallet/index.html (ya compilado).
# Uso: cd src/wallet && python3 parts/build.py && cd ../pwa && python3 build_pwa.py
import shutil, os, time
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))
s=open(os.path.join(HERE,'..','wallet','index.html')).read()
head=open(os.path.join(HERE,'head.html')).read()
import re as _re
s=_re.sub(r'<link[^>]*(fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr\.net)[^>]*>\n?','',s)
s=s.replace('</head>', head+'</head>',1)
s=s.replace('<script>','<script src="vendor/supabase.js"></script>\n<script src="shim.js"></script>\n<script>',1)
t='const timer = setTimeout(()=>{ $("sync").textContent = "Sin conexión a tus datos todavía"; }, 10000);'
assert t in s; s=s.replace(t, t.replace('{ $("sync")','{ if (!window.MF_PWA) $("sync")'))
import re
s=re.sub(r'<div class="dr-av">[^<]*</div><div><b>[^<]*</b>','<div class="dr-av"><img src="icon-192.png" alt="" style="width:100%;height:100%;border-radius:inherit"></div><div><b>Mis finanzas</b>',s,count=1)
open(os.path.join(ROOT,'index.html'),'w').write(s)
for f in ['shim.js','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable.png','apple-touch-icon.png']: shutil.copy(os.path.join(HERE,f), os.path.join(ROOT,f))
shutil.copytree(os.path.join(HERE,'vendor'), os.path.join(ROOT,'vendor'), dirs_exist_ok=True)
open(os.path.join(ROOT,'sw.js'),'w').write(open(os.path.join(HERE,'sw.js')).read().replace('__VER__', time.strftime('%Y%m%d%H%M%S')))
open(os.path.join(ROOT,'.nojekyll'),'w').write('')
shutil.copytree(os.path.join(HERE,'ocr'), os.path.join(ROOT,'ocr'), dirs_exist_ok=True)
print('PWA lista en', ROOT)
