import { chromium } from 'playwright'; import fs from 'fs'; import path from 'path';
const three=fs.readFileSync('node_modules/three/build/three.min.js','utf8');
const cp=path.resolve('node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2');
const ps=path.resolve('node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2');
// 1) a POV render of the board with the real fonts injected
const b64=f=>"data:font/woff2;base64,"+fs.readFileSync(f).toString("base64");
const fontCss=`@font-face{font-family:"Chakra Petch";font-weight:700;src:url(${b64(cp)}) format("woff2")}@font-face{font-family:"IBM Plex Sans";font-weight:400 500;src:url(${b64(ps)}) format("woff2")}`;
fs.writeFileSync('/tmp/mutie_og.html',fs.readFileSync('index.html','utf8').replace('<style>','<style>'+fontCss));
const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:1});
await page.route('**/three.min.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:three}));
await page.goto('file:///tmp/mutie_og.html'); await page.waitForFunction(()=>window.MUTIE&&window.MUTIE.G);
await page.evaluate(()=>{ localStorage.clear(); window.MUTIE.unlockAll(); const X=window.MUTIE; X.G.squad=['blaster','bruiser','phaser']; X.startMission(0); });
await page.waitForFunction(()=>!window.MUTIE.G.busy,null,{timeout:60000});
await page.evaluate(()=>{ const X=window.MUTIE,G=X.G; const vex=G.units.find(u=>u.name==='Vex'); const es=G.units.filter(u=>u.side==='enemy'); es[0].x=vex.x+5; es[0].y=vex.y+1; es[0].alert=true; es[1].x=vex.x+6; es[1].y=vex.y-1; es[1].alert=true; es[2].x=vex.x+7; es[2].y=vex.y+3; es[2].alert=true; X.select(vex); document.getElementById('labels').style.display='none'; });
await page.waitForTimeout(2500);
await page.locator('#gl').screenshot({path:'og_board.png',timeout:120000});
// 2) compose the card
const board=fs.readFileSync('og_board.png').toString('base64');
const html=`<!doctype html><html><head><meta charset="utf-8"><style>
${fontCss}
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#07040D;font-family:"IBM Plex Sans",sans-serif;color:#EFEAF7}
.bg{position:absolute;inset:0;background:url(data:image/png;base64,${board}) center 42%/cover no-repeat}
.veil{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,4,13,.96) 0%,rgba(7,4,13,.88) 38%,rgba(7,4,13,.35) 62%,rgba(7,4,13,.15) 100%),linear-gradient(180deg,rgba(7,4,13,.35),rgba(7,4,13,0) 30%,rgba(7,4,13,0) 70%,rgba(7,4,13,.6))}
.glow{position:absolute;left:-120px;top:-80px;width:820px;height:820px;background:radial-gradient(circle,rgba(138,77,255,.32),rgba(138,77,255,0) 62%)}
.glow2{position:absolute;left:160px;top:160px;width:520px;height:520px;background:radial-gradient(circle,rgba(244,181,63,.20),rgba(244,181,63,0) 60%)}
.rule{position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,transparent,rgba(138,77,255,.9) 25%,rgba(244,181,63,.95) 60%,transparent)}
.wrap{position:absolute;left:72px;top:96px;width:620px}
.eyebrow{font-family:"Chakra Petch";font-weight:700;font-size:20px;letter-spacing:.32em;text-transform:uppercase;color:#C9A8FF;margin-bottom:6px}
h1{margin:0;font-family:"Chakra Petch";font-weight:700;font-size:168px;line-height:.9;letter-spacing:.06em;background:linear-gradient(180deg,#FFE7A3,#FFD76E 30%,#F4B53F 60%,#D9761A);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 26px rgba(244,181,63,.5))}
.tag{font-family:"Chakra Petch";font-weight:700;font-size:26px;letter-spacing:.3em;text-transform:uppercase;color:#EFEAF7;margin:22px 0 18px;text-shadow:0 2px 14px rgba(7,4,13,.95)}
.sub{font-size:23px;line-height:1.35;color:#D8CCEB;max-width:560px;text-shadow:0 2px 12px rgba(7,4,13,.95)}
.sub b{color:#FFD76E;font-weight:500}
.url{position:absolute;left:72px;bottom:44px;font-family:"Chakra Petch";font-weight:700;font-size:22px;letter-spacing:.2em;text-transform:uppercase;color:#9D91B5}
.url b{color:#FFD76E}
.chips{position:absolute;right:56px;bottom:44px;display:flex;gap:10px}
.chip{font-family:"Chakra Petch";font-weight:700;font-size:15px;letter-spacing:.14em;text-transform:uppercase;padding:9px 14px;border:1px solid rgba(138,77,255,.55);background:rgba(13,7,24,.78);color:#C9A8FF;backdrop-filter:blur(6px)}
</style></head><body>
<div class="bg"></div><div class="veil"></div><div class="glow"></div><div class="glow2"></div>
<div class="wrap"><div class="eyebrow">Field operations · Program Graft</div><h1>MUTIE</h1><div class="tag">Feared and hunted, the fight for survival starts with 3</div>
<div class="sub">Turn-based mutant tactics in your browser. Cover, flanking and clashing powers — <b>every shot shows its odds</b> before you commit.</div></div>
<div class="url">Play free at <b>mutie.lol</b></div>
<div class="chips"><span class="chip">10-mission campaign</span><span class="chip">Phone &amp; desktop</span><span class="chip">No install</span></div>
<div class="rule"></div>
</body></html>`;
fs.writeFileSync('/tmp/mutie_ogcard.html',html);
const p2=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
await p2.goto('file:///tmp/mutie_ogcard.html'); await p2.evaluate(()=>document.fonts.ready); await p2.waitForTimeout(300);
await p2.screenshot({path:'/home/claude/mutie/og.png',type:'png'});
await browser.close(); console.log('og.png', fs.statSync('/home/claude/mutie/og.png').size);
