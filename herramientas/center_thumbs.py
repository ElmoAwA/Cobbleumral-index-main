# Centra cada miniatura según sus píxeles visibles y recorta las de las escenas de la portada.
import sys,glob,os
from PIL import Image
web=sys.argv[1]; n=0
for f in glob.glob(web+'/cobblemon/i/*.webp'):
    im=Image.open(f).convert('RGBA'); b=im.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
    if not b: print('vacia',f); continue
    W,H=im.size; x=(W-(b[2]-b[0]))//2; y=(H-(b[3]-b[1]))//2
    if abs(x-b[0])<2 and abs(y-b[1])<2: continue
    o=Image.new('RGBA',im.size,(0,0,0,0)); o.paste(im.crop(b),(x,y)); o.save(f,'WEBP',quality=88); n+=1
print('centradas',n)
os.makedirs(web+'/assets/escena',exist_ok=True)
for k in sys.argv[2:]:
    im=Image.open(f'{web}/cobblemon/i/{k}.webp').convert('RGBA'); b=im.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
    im.crop(b).save(f'{web}/assets/escena/{k}.webp','WEBP',quality=90); print(k,im.crop(b).size)
