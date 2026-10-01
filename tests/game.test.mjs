import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { CONFIG as C, PRODUCTS, BRAND } from '../config.js';
import { segmentHitsCircle, applyHit, comboPoints, toWorld } from '../mechanics.js';
function setup(touch=false) {
 const listeners={}, nodes={}, frames=[];let clock=0,timerId=0;const timers=new Map();
 const context=new Proxy({}, {get:(t,k)=>t[k]??(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 const bounds={left:100,top:100,width:750,height:540};
 const node=()=>({style:{},dataset:{},classList:{toggle(){}},offsetHeight:40,clientWidth:550,clientHeight:180,hidden:false,textContent:'',captures:new Set(),events:{},getContext:()=>context,getBoundingClientRect:()=>bounds,addEventListener(k,fn){this.events[k]=fn},setAttribute(k,v){this[k]=v},setPointerCapture(id){this.captures.add(id)},hasPointerCapture(id){return this.captures.has(id)},releasePointerCapture(id){this.captures.delete(id)},focus(){this.focused=true}});
 const document={hidden:false,body:node(),querySelector:s=>nodes[s]??(nodes[s]=node()),addEventListener:(k,f)=>listeners[k]=f};
 const window={setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,at:clock+delay});return id},clearTimeout(id){timers.delete(id)},visualViewport:{height:900,addEventListener(){}},addEventListener:(k,f)=>listeners[k]=f};
 const scope={document,window,innerHeight:900,devicePixelRatio:2,getComputedStyle:()=>({paddingTop:'16'}),matchMedia:q=>({matches:touch&&q.includes('coarse')}),performance:{now:()=>clock},requestAnimationFrame:fn=>frames.push(fn),C,PRODUCTS,segmentHitsCircle,applyHit,comboPoints,toWorld,drawProduct(){},drawBomb(){},sfx:new Proxy({},{get:(t,k)=>k==='isMuted'?()=>false:()=>{}}),Math};
 let src=readFileSync(new URL('../game.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 src+='\n globalThis.api={start,update,frame,fit,spawn, get data(){return {state,score,remaining,objects,pieces,labels,trail,pointer,combo,mode}},seed(bombs=[]){objects=[300,500,700].map((x,i)=>({x,y:360,vx:0,vy:0,rotation:0,spin:0,radius:49,scale:1,bomb:bombs.includes(i),product:PRODUCTS[i],hit:false}))},setScore(n){score=n}};';
 vm.runInNewContext(src,scope);
 const canvas=nodes['#game'];
 const emit=(type,x,y,extra={})=>canvas.events[type]({pointerId:1,pointerType:touch?'touch':'mouse',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:bounds.left+x*bounds.width/1000,clientY:bounds.top+y*bounds.height/720,preventDefault(){},...extra});
 return {api:scope.api,emit,canvas,nodes,document,listeners,bounds,advance(ms){clock+=ms;for(const [id,t] of timers){if(t.at<=clock){timers.delete(id);t.fn()}}},setTime:n=>clock=n};
}
test('start contains only its requested visible UI; gameplay reveals HUD',()=>{
 const {api,nodes}=setup();assert.equal(nodes['.hud'].hidden,true);assert.equal(nodes['.instruction-strip>span'].hidden,true);assert.equal(nodes['.result-screen'].hidden,true);
 api.start();assert.equal(nodes['.hud'].hidden,false);assert.equal(nodes['.start-screen'].hidden,true);assert.equal(api.data.remaining,30);
});
test('mouse hover never slices; capture, fast drag, once-only hits and end-of-stroke combos',()=>{
 const {api,emit,canvas}=setup();api.start();api.seed();
 emit('pointermove',850,360,{buttons:0});assert.equal(api.data.score,0);
 emit('pointerdown',150,360);assert.equal(canvas.hasPointerCapture(1),true);
 emit('pointermove',850,360);assert.equal(api.data.score,30);assert.equal(api.data.pieces.length,6);
 emit('pointermove',450,360);assert.equal(api.data.score,30);
 emit('pointerup',450,360);assert.equal(api.data.score,40);assert.equal(canvas.hasPointerCapture(1),false);
 assert.equal(api.data.labels.filter(x=>x.combo).length,1);
});
test('bomb subtracts 20, floors at zero, and never ends the round',()=>{
 const {api,emit}=setup();api.start();api.seed([0]);api.setScore(10);
 emit('pointerdown',200,360);emit('pointermove',350,360);emit('pointerup',350,360);
 assert.equal(api.data.score,0);assert.equal(api.data.state,'playing');assert.equal(api.data.combo,0);
 api.seed([0]);api.setScore(50);emit('pointerdown',200,360);emit('pointermove',350,360);emit('pointerup',350,360);assert.equal(api.data.score,30);
});
test('touch and pen input, cancellation, and secondary pointers',()=>{
 const {api,emit,canvas}=setup(true);assert.equal(api.data.mode,'touch');api.start();api.seed();
 emit('pointerdown',150,360);emit('pointermove',550,360,{pointerId:2});assert.equal(api.data.score,0);
 emit('pointermove',550,360);emit('pointercancel',550,360);assert.equal(api.data.score,25);assert.equal(api.data.pointer,null);assert.equal(canvas.hasPointerCapture(1),false);
 api.start();api.seed();emit('pointerdown',200,360,{pointerType:'pen'});emit('pointermove',350,360,{pointerType:'pen'});emit('pointerup',350,360,{pointerType:'pen'});assert.equal(api.data.score,10);assert.equal(api.data.mode,'pen');
});
test('30 seconds ends the round; restart clears every transient state',()=>{
 const {api,emit,nodes}=setup();api.start();api.seed();emit('pointerdown',150,360);emit('pointermove',550,360);
 api.update(29.99);assert.equal(api.data.state,'playing');api.update(.02);assert.equal(api.data.state,'result');assert.equal(api.data.score,25);assert.equal(nodes['#restart'].focused,true);
 api.start();assert.equal(api.data.score,0);assert.equal(api.data.remaining,30);assert.equal(api.data.pointer,null);assert.equal(api.data.combo,0);
 for(const k of ['objects','pieces','labels','trail'])assert.equal(api.data[k].length,0);
});
test('hidden tab pauses clock and simulation, resumes without a jump',()=>{
 const {api,document,listeners,setTime}=setup();api.start();api.frame(1000);assert.equal(api.data.remaining,29);
 document.hidden=true;setTime(1000);listeners.visibilitychange();api.frame(100000);assert.equal(api.data.remaining,29);
 document.hidden=false;setTime(100000);listeners.visibilitychange();api.frame(101000);assert.equal(api.data.remaining,28);
});
test('orientation/resize keeps round and correct pointer coordinates',()=>{
 const {api,bounds,emit}=setup();api.start();api.update(2);api.seed();bounds.width=300;bounds.height=216;bounds.left=10;api.fit();assert.equal(api.data.remaining,28);
 emit('pointerdown',150,360);emit('pointermove',550,360);emit('pointerup',550,360);assert.equal(api.data.score,25);
});
test('launches reach the playfield and missed objects are cleaned up',()=>{
 const {api}=setup();api.start();api.spawn();for(const o of api.data.objects){const peak=o.y-o.vy*o.vy/(2*C.gravity);assert.ok(peak<360);assert.ok(o.x>=100&&o.x<=900)}
 api.update(4);assert.equal(api.data.score,0);assert.equal(api.data.objects.length,0);
});
test('hard swipe deadline survives movement, awards combo once, and requires release',()=>{
 const {api,emit,advance,nodes,canvas}=setup();api.start();api.seed();
 emit('pointerdown',150,360);emit('pointermove',550,360);
 advance(350);assert.equal(api.data.combo,2);
 emit('pointermove',560,360);advance(150);
 assert.equal(api.data.score,25);assert.equal(api.data.combo,0);assert.equal(api.data.trail.length,0);
 assert.equal(nodes['.instruction-strip>span'].textContent,'Release to swipe again.');
 assert.equal(canvas.hasPointerCapture(1),true);
 emit('pointermove',850,360);assert.equal(api.data.score,25);
 emit('pointerup',850,360);assert.equal(api.data.score,25);assert.equal(api.data.pointer,null);
 emit('pointerdown',600,360);emit('pointerup',850,360);assert.equal(api.data.score,35);
});
test('stationary touch expires and lifting restores instructions',()=>{
 const {api,emit,advance,nodes}=setup(true);api.start();api.seed();emit('pointerdown',150,360);
 advance(500);assert.equal(nodes['.instruction-strip>span'].textContent,'Lift to swipe again.');
 emit('pointerup',850,360);assert.equal(api.data.score,0);
 assert.equal(nodes['.instruction-strip>span'].textContent,'Slice products. Avoid bombs.');
});
test('release enforces time limit even before timeout callback runs',()=>{
 const {api,emit,setTime}=setup();api.start();api.seed();emit('pointerdown',150,360);
 setTime(500);emit('pointerup',850,360);assert.equal(api.data.score,0);
});
test('release movement respects remaining distance allowance',()=>{
 const {api,emit}=setup();api.start();
 emit('pointerdown',0,100);emit('pointermove',1000,100);api.seed();
 emit('pointerup',300,360);assert.equal(api.data.score,0);assert.equal(api.data.pointer,null);
});
test('restart cancels old swipe deadline',()=>{
 const {api,emit,advance,nodes}=setup();api.start();emit('pointerdown',150,360);advance(250);
 api.start();emit('pointerdown',150,360);advance(250);
 assert.equal(nodes['.instruction-strip>span'].textContent,'Slice products. Avoid bombs.');
 advance(250);assert.equal(nodes['.instruction-strip>span'].textContent,'Release to swipe again.');
});
