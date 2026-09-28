// Family sight lines: Blast hover summary, Blink flank tiles (gold), Mender ally strip (exposure + result).
import { chromium } from 'playwright'; import fs from 'fs';
const three=fs.readFileSync('node_modules/three/build/three.min.js','utf8');
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1240,height:900}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.route('**/three.min.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:three}));
await page.goto('file://'+process.cwd()+'/index.html'); await page.waitForFunction(()=>window.MUTIE&&window.MUTIE.G);
await page.evaluate(()=>{ localStorage.clear(); window.MUTIE.unlockAll(); const X=window.MUTIE; X.G.squad=['blaster','phaser','mender']; X.startMission(0); });
await page.waitForFunction(()=>!window.MUTIE.G.busy,null,{timeout:60000});
const r=await page.evaluate(async ()=>{ const X=window.MUTIE,G=X.G; const out={}; const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const vex=G.units.find(u=>u.def.id==='blaster'), nix=G.units.find(u=>u.def.id==='phaser'), hal=G.units.find(u=>u.def.id==='mender'); const es=G.units.filter(u=>u.side==='enemy');
  const free=(x,y)=>x>=0&&y>=0&&x<16&&y<11&&G.grid[y][x]===0&&!G.units.some(u=>u.alive&&u.x===x&&u.y===y);
  // --- Blaster: two troopers behind a crate, one at 2 HP, 4 tiles from Vex
  const t1=es[0], t2=es[1]; for(const e of es.slice(2)){ e.x=15; e.y=10; e.alert=false; }
  const cx=vex.x+4, cy=vex.y; G.grid[cy][cx]=2; // crate
  t1.x=cx+1; t1.y=cy; t1.alert=true; t1.hp=2; t2.x=cx; t2.y=cy+1; t2.alert=true; t2.hp=6; t2.armor=0;
  X.select(vex); X.toggleView(); X.setMode('blast'); G.hover={x:cx,y:cy}; X.G.mode='blast';
  const bp=X.blastPreview(vex,{x:cx,y:cy}); out.blast={enemies:bp.enemies.length,kills:bp.kills.map(k=>k.name),crates:bp.crates,exposes:bp.exposes.map(e=>e.name),allies:bp.allies.length};
  // hint via a real hover
  const R3=X.R3; const gl=document.getElementById('gl'); const rect=gl.getBoundingClientRect(); let pt=null; for(let py=0;py<rect.height&&!pt;py+=6) for(let px=0;px<rect.width;px+=6){ const p=R3.pick({clientX:rect.left+px,clientY:rect.top+py}); if(p&&p.x===cx&&p.y===cy){ pt={x:rect.left+px+3,y:rect.top+py+3}; break; } }
  out.blastPt=pt; window.__pt=pt;
  return out; });
await page.mouse.move(r.blastPt.x,r.blastPt.y); await page.waitForTimeout(500);
r.blastHint=await page.evaluate(()=>document.getElementById('hint').textContent);
await page.screenshot({path:'shot_sight_blast.png',clip:{x:0,y:0,width:1240,height:760}});
// --- Phaser: blink mode, POV target = t2 (exposed side is +y). Expect gold tiles where a shot flanks it.
const r2=await page.evaluate(async ()=>{ const X=window.MUTIE,G=X.G; const out={}; const nix=G.units.find(u=>u.def.id==='phaser'); const es=G.units.filter(u=>u.side==='enemy'&&u.alert);
  X.select(nix); const t=es[1]; // t2
  const i=G.pov.list.findIndex(it=>it.u===t); G.pov.idx=i; G.pov.target=t; X.setMode('blink');
  const ft=X.flankTiles(nix); out.ref=ft.t&&ft.t.name; out.flankCount=ft.set.size; out.some=[...ft.set].slice(0,5);
  // every gold tile really flanks: hitChance from there says flanked
  out.allFlank=[...ft.set].every(k=>{ const [x,y]=k.split(',').map(Number); return X.hitChance(Object.assign({},nix,{x,y}),t).flanked; });
  // hover a gold tile
  const k=[...ft.set][0]; if(k){ const [x,y]=k.split(',').map(Number); const R3=X.R3; const gl=document.getElementById('gl'); const rect=gl.getBoundingClientRect(); for(let py=0;py<rect.height&&!out.pt;py+=6) for(let px=0;px<rect.width;px+=6){ const p=R3.pick({clientX:rect.left+px,clientY:rect.top+py}); if(p&&p.x===x&&p.y===y){ out.pt={x:rect.left+px+3,y:rect.top+py+3}; break; } } }
  out.hint0=document.getElementById('hint').textContent; return out; });
if(r2.pt){ await page.mouse.move(r2.pt.x,r2.pt.y); await page.waitForTimeout(500); r2.hint=await page.evaluate(()=>document.getElementById('hint').textContent); }
await page.screenshot({path:'shot_sight_blink.png',clip:{x:0,y:0,width:1240,height:760}});
// --- Mender: Halden's Mend strip — Vex wounded and exposed, Nix full
const r3=await page.evaluate(async ()=>{ const X=window.MUTIE,G=X.G; const out={}; const hal=G.units.find(u=>u.def.id==='mender'), vex=G.units.find(u=>u.def.id==='blaster'), nix=G.units.find(u=>u.def.id==='phaser');
  vex.hp=4; vex.marked=true; nix.hp=nix.maxHp-1; X.select(hal); X.setMode('mend');
  out.order=G.pov.list.map(it=>it.u.name+(it.ok?'':'(off)')); out.cards=[...document.querySelectorAll('#tstrip .tcard')].map(c=>c.textContent.replace(/\s+/g,' ').trim());
  out.res={vex:X.allyResult(hal,'mend',vex),nix:X.allyResult(hal,'mend',nix),ward:X.allyResult(hal,'ward',vex),stim:X.allyResult(hal,'stim',vex)};
  return out; });
await page.screenshot({path:'shot_sight_mend.png',clip:{x:0,y:0,width:1240,height:760}});
console.log(JSON.stringify({blast:r.blast,blastHint:r.blastHint,blink:r2,mend:r3},null,1));
console.log('errors',errors); await browser.close();
