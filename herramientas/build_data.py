# Exporta desde el jar de Cobblemon los datos, modelos y texturas que usa la web.
import json,re,glob,os,sys,shutil
root,out=sys.argv[1],sys.argv[2]
A=root+'/assets/cobblemon/'; B=A+'bedrock/pokemon/'
es=json.load(open(A+'lang/es_es.json',encoding='utf8')); en=json.load(open(A+'lang/en_us.json',encoding='utf8'))
def L(k,d=''): return es.get(k) or en.get(k) or d
geos={os.path.basename(f)[:-9]:f for f in glob.glob(B+'models/*/*.geo.json')}
geos.update({os.path.basename(f)[:-9]:f for f in glob.glob(B+'models/*/*/*.geo.json')})
posers={}
for f in glob.glob(B+'posers/**/*.json',recursive=True):
    try: json.load(open(f,encoding='utf8')); posers[os.path.basename(f)[:-5]]=f
    except Exception: print('poser con error, se ignora:',f)
anims={}
for f in glob.glob(B+'animations/**/*.animation.json',recursive=True):
    try:
        for k,v in json.load(open(f,encoding='utf8'))['animations'].items(): anims[k]=v
    except Exception: pass
res={}
for f in glob.glob(B+'resolvers/**/*.json',recursive=True):
    d=json.load(open(f,encoding='utf8')); res.setdefault(d['species'].split(':')[1],[]).append(d)
def resolve(sp,aspects):
    r={'model':None,'poser':None,'texture':None,'layers':[]}
    for d in sorted(res.get(sp,[]),key=lambda x:x.get('order',0)):
        for v in d.get('variations',[]):
            if all(a in aspects for a in v.get('aspects',[])):
                for k in('model','poser','texture'):
                    if v.get(k): r[k]=v[k]
                if 'layers' in v: r['layers']=v['layers']
    return r
def tex(t):
    if isinstance(t,dict): t=(t.get('frames') or [None])[0]
    return t
def tpath(t):
    t=tex(t)
    if not t or not isinstance(t,str): return None
    p=t.split(':')[-1]; src=A+p
    if not os.path.exists(src): return None
    rel=p.split('textures/pokemon/')[-1]; dst=out+'/t/'+rel
    os.makedirs(os.path.dirname(dst),exist_ok=True)
    if not os.path.exists(dst): shutil.copy(src,dst)
    return rel
def layer(r):
    for l in r['layers']:
        if l.get('name')!='alpha_eyes' and (l.get('emissive') or l.get('name')=='emissive'):
            return tpath(l.get('texture'))
def clean_bones(g):
    keep=[]
    for b in g['bones']:
        n={k:b[k] for k in('name','parent','pivot','rotation','cubes','mirror') if k in b}
        keep.append(n)
    return keep
norm=lambda x:re.sub(r'[^a-z0-9]','',x.lower())
idx={}
for k in anims:
    p=k.split('.')
    if len(p)>=3: idx.setdefault((norm(p[1]),p[2]),anims[k])
posers_n={norm(k):v for k,v in posers.items()}
def fallback(*names):
    for n in names:
        for clip in('ground_idle','idle','air_idle','water_idle','pose'):
            x=idx.get((norm(n),clip))
            if x: return [{k2:x[k2] for k2 in('animation_length','bones','loop') if k2 in x}]
    return []
def idle(poser):
    r=idle0(poser)
    if r: return r
    # Las formas regionales y algunos nombres con guion no coinciden con el archivo.
    return fallback(poser,poser.split('_')[0])
def idle0(poser):
    f=posers.get(poser) or posers_n.get(norm(poser))
    if not f: return []
    d=json.load(open(f,encoding='utf8')); ps=d.get('poses',{})
    pick=None
    for n,p in ps.items():
        if 'STAND' in p.get('poseTypes',[]): pick=p;break
    pick=pick or ps.get('standing') or next(iter(ps.values()),None)
    if not pick: return []
    o=[]
    for a in pick.get('animations',[]):
        m=re.search(r"q\.bedrock\w*\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]",a) if isinstance(a,str) else None
        if m:
            x=anims.get(f'animation.{m[1]}.{m[2]}') or idx.get((norm(m[1]),m[2]))
            if x: o.append({k2:x[k2] for k2 in('animation_length','bones','loop') if k2 in x})
    return o
os.makedirs(out+'/m',exist_ok=True)
dex={}; n=0
written={}
def write_model(sp,aspects):
    r=resolve(sp,aspects); s=resolve(sp,aspects+['shiny'])
    if not r['model']: return None
    m=r['model'].split(':')[-1].replace('.geo','')
    if m not in geos: return None
    t=tpath(r['texture'])
    if not t: return None
    g=json.load(open(geos[m],encoding='utf8'))['minecraft:geometry'][0]
    pz=(r['poser'] or m).split(':')[-1]
    key=m if not aspects or m not in written or written[m]==(t,) else m
    key=re.sub(r'[^a-z0-9_]','',sp+'_'+'_'.join(aspects)).rstrip('_') if aspects else sp
    obj={'w':g['description'].get('texture_width',64),'h':g['description'].get('texture_height',64),'t':t,'s':tpath(s['texture']),'e':layer(r),'es':layer(s),'b':clean_bones(g),'a':idle(pz)}
    json.dump(obj,open(f'{out}/m/{key}.json','w',encoding='utf8'),separators=(',',':'),ensure_ascii=False)
    return key
TY={'normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'}
def stats(b):
    return {k:b[j] for k,j in(('hp','hp'),('attack','attack'),('defense','defence'),('special-attack','special_attack'),('special-defense','special_defence'),('speed','speed'))}
def abil(lst):
    o=[]
    for a in lst:
        if a.startswith('$'): continue
        hid=a.startswith('h:'); a=a.replace('h:','')
        key='cobblemon.ability.'+a
        o.append({'n':L(key,a),'d':L(key+'.desc',''),'h':hid})
    return o
for f in sorted(glob.glob(root+'/data/cobblemon/species/*/*.json')):
    sp=os.path.basename(f)[:-5]; d=json.load(open(f,encoding='utf8'))
    base={'name':d['name'],'dex':d['nationalPokedexNumber'],'types':[x for x in(d.get('primaryType'),d.get('secondaryType')) if x],'stats':stats(d['baseStats']),'ab':abil(d.get('abilities',[])),'ht':d.get('height'),'wt':d.get('weight'),'desc':' '.join(L(x) for x in d.get('pokedex',[]))}
    if not d.get('implemented') and sp not in res:
        dex[sp]=dict(base,m=None)
        for fm in d.get('forms',[]):
            nm=fm.get('name','').lower()
            if fm.get('battleOnly') or 'gmax' in nm or 'mega' in nm: continue
            e=dict(base,m=None)
            if fm.get('primaryType'): e['types']=[x for x in(fm.get('primaryType'),fm.get('secondaryType')) if x]
            if fm.get('baseStats'): e['stats']=stats(fm['baseStats'])
            if fm.get('abilities'): e['ab']=abil(fm['abilities'])
            dex[re.sub(r"[^a-z0-9-]",'',sp+'-'+nm)]=e
        continue
    k=write_model(sp,[])
    if not k:
        for fm in d.get('forms',[]):
            asp=[a for a in fm.get('aspects',[]) if a!='gmax']
            if asp and not fm.get('battleOnly'):
                k=write_model(sp,asp)
                if k: break
    if not k:
        for fm in d.get('forms',[]):
            for a in fm.get('aspects',[]):
                other=a.replace('rapid_strike','single_strike')
                k=write_model(sp,[other])
                if k: break
            if k: break
    if not k:
        dex[sp]=dict(base,m=None); continue
    dex[sp]=dict(base,m=k)
    for fm in d.get('forms',[]):
        nm=fm.get('name','').lower(); asp=fm.get('aspects',[])
        if fm.get('battleOnly') or 'gmax' in nm or 'mega' in nm or not asp: continue
        fk=re.sub(r"[^a-z0-9-]",'',sp+'-'+nm)
        k2=write_model(sp,asp)
        if not k2: continue
        e=dict(base,m=k2)
        if fm.get('primaryType'): e['types']=[x for x in(fm.get('primaryType'),fm.get('secondaryType')) if x]
        if fm.get('baseStats'): e['stats']=stats(fm['baseStats'])
        if fm.get('abilities'): e['ab']=abil(fm['abilities'])
        if fm.get('height'): e['ht']=fm['height']
        if fm.get('weight'): e['wt']=fm['weight']
        if fm.get('pokedex'): e['desc']=' '.join(L(x) for x in fm['pokedex'])
        dex[fk]=e
# Movimientos: datos de combate del Showdown que trae Cobblemon, nombres de su traducción.
moves_js=open(sys.argv[3],encoding='utf8').read()
CAT={'Physical':'f','Special':'e','Status':'s'}
mov={}
for m in re.finditer(r'^  "?([a-z0-9]+)"?: \{\n(.*?)^  \},?$',moves_js,re.M|re.S):
    body=m[2]; g=lambda p:(re.search(r'^    '+p+r': (.+?),?$',body,re.M) or [None,None])[1]
    if not g('type'): continue
    acc=g('accuracy'); k=m[1]
    mov[k]={'n':L('cobblemon.move.'+k,g('name').strip('"')),'t':g('type').strip('"').lower(),'c':CAT.get(g('category').strip('"'),'s'),'p':int(g('basePower') or 0),'a':None if acc=='true' else int(acc),'pp':int(g('pp') or 0),'d':L('cobblemon.move.'+k+'.desc','')}
json.dump(mov,open(out+'/movimientos.json','w',encoding='utf8'),separators=(',',':'),ensure_ascii=False)
os.makedirs(out+'/ap',exist_ok=True)
def aprende(lista):
    o={'n':[],'tm':[],'tutor':[],'egg':[],'legacy':[]}; vistos=set()
    for x in lista:
        a,_,b=x.partition(':')
        if b not in mov or x in vistos: continue
        vistos.add(x)
        if a.isdigit(): o['n'].append([int(a),b])
        elif a in o: o[a].append(b)
    o['n'].sort(key=lambda e:(e[0],mov[e[1]]['n']))
    for k in('tm','tutor','egg','legacy'): o[k].sort(key=lambda e:mov[e]['n'])
    return o
for f in glob.glob(root+'/data/cobblemon/species/*/*.json'):
    sp=os.path.basename(f)[:-5]; d=json.load(open(f,encoding='utf8'))
    if sp in dex:
        dex[sp]['id']=sp; json.dump(aprende(d.get('moves',[])),open(f'{out}/ap/{sp}.json','w'),separators=(',',':'))
    for fm in d.get('forms',[]):
        fk=re.sub(r"[^a-z0-9-]",'',sp+'-'+fm.get('name','').lower())
        if fk in dex:
            dex[fk]['id']=fk; json.dump(aprende(fm.get('moves') or d.get('moves',[])),open(f'{out}/ap/{fk}.json','w'),separators=(',',':'))
print(len(mov),'movimientos')
json.dump(dex,open(out+'/pokedex.json','w',encoding='utf8'),separators=(',',':'),ensure_ascii=False)
print(len(dex),'entradas')
