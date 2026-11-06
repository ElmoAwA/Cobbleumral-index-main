const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const [web]=process.argv.slice(2);(async()=>{
const dex=JSON.parse(fs.readFileSync(web+'/cobblemon/pokedex.json'));const keys=[...new Set(Object.values(dex).map(d=>d.m))];
const out=web+'/cobblemon/i';fs.mkdirSync(out,{recursive:true});
const todo=keys.filter(k=>!fs.existsSync(`${out}/${k}.webp`));let idx=0,fails=[];
const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
await Promise.all([0,1,2,3].map(async()=>{let p=await b.newPage({viewport:{width:340,height:340}});await p.goto('http://localhost:8765/thumbs.html');await p.waitForFunction('window.done');
while(idx<todo.length){const k=todo[idx++];try{const u=await p.evaluate(k=>shot(k),k);fs.writeFileSync(`${out}/${k}.webp`,Buffer.from(u.split(',')[1],'base64'))}catch(e){fails.push(k)}if(idx%100==0)console.log(idx,todo.length)}}));
console.log('fallos',fails);await b.close()})()
