// Seed + strokes use 1000-wide coords, scaled to live world width.
// Run against a locally running Chrome CDP endpoint. No browser package required.
// Usage: node tests/browser.mjs ws://127.0.0.1:PORT/devtools/browser/ID
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const endpoint=process.argv[2];
const baseURL=process.argv[3] || 'http://localhost:5173/';
if(!endpoint) throw new Error('Pass the Chrome browser WebSocket URL (agent-browser get cdp-url).');
const ws=new WebSocket(endpoint),pending=new Map();let sequence=0,session;
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
function command(method,params={},sid=session){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}))})}
const source=await readFile(new URL('../game.js',import.meta.url),'utf8');
const instrumented=source.replace("if(state==='playing')update(dt)","if(state==='playing'&&!window.__qaFreeze)update(dt)")+`
window.__qaFreeze=true;
window.qa={start,update,render,get data(){return {state,score,remaining,pointer,combo,objects:objects.length,pieces:pieces.length,trail:trail.length,labels:labels.length,mode}}, seed(bombs=[]){spawnIn=Infinity;objects=[300,500,700].map((x,i)=>({x:x*W/1000,y:360,vx:0,vy:0,rotation:0,spin:0,radius:49,scale:1,bomb:bombs.includes(i),product:PRODUCTS[i],hit:false}));render()}, setScore(n){score=n;hud()},setTime(n){remaining=n;hud()}};
`;
ws.onmessage=async event=>{
 const message=JSON.parse(event.data);
 if(message.id){const p=pending.get(message.id);pending.delete(message.id);if(message.error)p.reject(new Error(JSON.stringify(message.error)));else p.resolve(message.result)}
 else if(message.method==='Fetch.requestPaused'){
  await command('Fetch.fulfillRequest',{requestId:message.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript'}],body:Buffer.from(instrumented).toString('base64')},message.sessionId);
 }
};
const {targetId}=await command('Target.createTarget',{url:'about:blank'},null);
({sessionId:session}=await command('Target.attachToTarget',{targetId,flatten:true},null));
const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(expression){for(let i=0;i<80;i++){if(await evaluate(expression))return;await delay(50)}throw new Error('Timeout: '+expression)}
async function metrics(width,height,touch=false){await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:touch});await command('Emulation.setTouchEmulationEnabled',{enabled:touch,maxTouchPoints:1});await delay(80)}
const rect=()=>evaluate('document.querySelector(".game-card").getBoundingClientRect().toJSON()');
async function screenshot(name){const {data}=await command('Page.captureScreenshot',{format:'png'});await writeFile('/tmp/'+name+'.png',Buffer.from(data,'base64'))}
async function position(x,y){return evaluate(`(()=>{const r=document.querySelector('#game').getBoundingClientRect();return {x:r.left+${x}*r.width/1000,y:r.top+${y}*r.height/720}})()`)}
async function mouse(type,x,y,buttons=0){await command('Input.dispatchMouseEvent',{type,...await position(x,y),button:type==='mouseMoved'?'none':'left',buttons,clickCount:type==='mouseMoved'?0:1})}
async function stroke(to=850){await mouse('mouseMoved',150,360);await mouse('mousePressed',150,360,1);await mouse('mouseMoved',to,360,1);await mouse('mouseReleased',to,360)}
try {
 await command('Page.enable');await command('Runtime.enable');await metrics(1280,900);
 await command('Fetch.enable',{patterns:[{urlPattern:'*/game.js',requestStage:'Request'}]});
 await command('Page.navigate',{url:baseURL});await waitFor('!!window.qa');
 const initial=await rect();assert.equal(initial.width,760);
 assert.equal(await evaluate('document.querySelectorAll(".start-screen button").length'),1);
 await screenshot('swipe-rush-desktop');
 await evaluate('qa.start();qa.seed()');
 await mouse('mouseMoved',850,360);assert.equal(await evaluate('qa.data.score'),0);
 await mouse('mousePressed',150,360,1);
 assert.equal(await evaluate('document.querySelector("#game").hasPointerCapture(qa.data.pointer)'),true);
 await mouse('mouseMoved',850,360,1);assert.equal(await evaluate('qa.data.score'),30);
 await mouse('mouseMoved',150,360,1);assert.equal(await evaluate('qa.data.score'),30);
 await mouse('mouseReleased',150,360);assert.equal(await evaluate('qa.data.score'),40);
 assert.equal(await evaluate('qa.data.pointer'),null);
 console.log('PASS native mouse capture, hover rejection, fast swipe, once-only scoring, and combo');
 await evaluate('qa.start();qa.seed([0]);qa.setScore(10)');await mouse('mousePressed',200,360,1);await mouse('mouseMoved',350,360,1);await mouse('mouseReleased',350,360);
 assert.equal(await evaluate('qa.data.score'),0);assert.equal(await evaluate('qa.data.state'),'playing');
 await evaluate('qa.seed([0]);qa.setScore(50)');await mouse('mousePressed',200,360,1);await mouse('mouseMoved',350,360,1);await mouse('mouseReleased',350,360);
 assert.equal(await evaluate('qa.data.score'),30);console.log('PASS live bomb penalty and zero floor');
 await evaluate('qa.setTime(.01);qa.update(.02)');assert.equal(await evaluate('qa.data.state'),'result');assert.deepEqual(await rect(),initial);
 await evaluate('document.querySelector("#restart").click()');const reset=await evaluate('qa.data');assert.equal(reset.remaining,30);assert.equal(reset.score,0);for(const k of ['objects','pieces','trail','labels','combo'])assert.equal(reset[k],0);assert.equal(reset.pointer,null);assert.deepEqual(await rect(),initial);
 console.log('PASS completion, restart reset, and stable card dimensions');
 await metrics(393,852,true);await command('Page.reload',{ignoreCache:true});await waitFor('!!window.qa');
 assert.equal(await evaluate('qa.data.mode'),'touch');assert.match(await evaluate('document.querySelector("#input-guide").textContent'),/^Swipe your finger/);
 await screenshot('swipe-rush-touch');await evaluate('qa.start();qa.seed()');
 const a=await position(150,360),b=await position(850,360);
 await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});await command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:1}]});await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await evaluate('qa.data.score'),40);assert.equal(await evaluate('qa.data.pointer'),null);
 await evaluate('qa.start();qa.seed()');await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});await command('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:1}]});await command('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await evaluate('qa.data.pointer'),null);
 console.log('PASS native emulated touch, touch guide, combo, and cancellation');
 await evaluate('qa.setTime(17)');await metrics(844,390,true);assert.equal(await evaluate('qa.data.remaining'),17);const landscape=await rect();assert.ok(landscape.bottom<=390);await evaluate('qa.seed()');await stroke();assert.equal(await evaluate('qa.data.score'),80);await screenshot('swipe-rush-landscape-play');
 console.log('PASS orientation change preserves round and pointer coordinates');
 // Final run uses the unchanged production module and wall-clock timing.
 await command('Fetch.disable');await metrics(1280,900,false);await command('Page.reload',{ignoreCache:true});await waitFor('document.querySelector("#start") && !document.querySelector("#start").disabled');await delay(200);
 assert.equal(await evaluate('typeof window.qa'),'undefined');
 await evaluate('document.querySelector("#start").click()');const began=Date.now();
 while(Date.now()-began<31500){if(await evaluate('document.querySelector(".game-card").dataset.state')==='result')break;await mouse('mousePressed',100,400,1);await mouse('mouseMoved',900,400,1);await mouse('mouseReleased',900,400);await delay(120)}
 assert.equal(await evaluate('document.querySelector(".game-card").dataset.state'),'result');const duration=Date.now()-began;assert.ok(duration>=29500&&duration<31500);assert.ok(Number(await evaluate('document.querySelector("#final-score").textContent'))>0);await screenshot('swipe-rush-results');
 console.log('PASS unmodified 30-second production round with live mouse swipes ('+duration+'ms)');
 console.log('All browser checks passed. Screenshots saved to /tmp/swipe-rush-*.png');
} finally {await command('Target.closeTarget',{targetId},null);ws.close()}
