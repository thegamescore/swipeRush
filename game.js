import { CONFIG as C, PRODUCTS } from './config.js';
import { drawProduct, drawBomb } from './art.js';
import { segmentHitsCircle, applyHit, comboPoints, toWorld } from './mechanics.js';
const $ = s => document.querySelector(s);
const card=$('.game-card'), canvas=$('#game'), ctx=canvas.getContext('2d'), guide=$('#guide'), gc=guide.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let mode=matchMedia('(any-pointer: coarse)').matches && !matchMedia('(hover: hover) and (pointer: fine)').matches ? 'touch':'mouse';
let state='start', score=0, remaining=C.duration, objects=[], pieces=[], labels=[], trail=[], pointer=null, combo=0, lastPoint=null, spawnIn=.35, elapsed=0, previous=0, impact=0;
const rand=(a,b)=>a+Math.random()*(b-a);
function inputMode(type) { if(!type)return;mode=type;$('#input-guide').textContent=type==='mouse'?'Click and drag to slice products.':type==='pen'?'Press and drag to slice products.':'Swipe your finger to slice products.'; }
inputMode(mode);
window.addEventListener('pointerdown',e=>inputMode(e.pointerType),{passive:true});
window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&mode!=='mouse')inputMode('mouse')},{passive:true});
function fit() {
  card.style.width='';
  const strips=$('.status-strip').offsetHeight+$('.instruction-strip').offsetHeight+2;
  const available=window.visualViewport?.height || innerHeight;
  const outerPadding=parseFloat(getComputedStyle(document.body).paddingTop)*2;
  const maxWidth=Math.max(180,(available-outerPadding-strips)/.72);
  card.style.width=`min(760px, 100%, ${maxWidth}px)`;
  const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,3);
  canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
  ctx.setTransform(canvas.width/1000,0,0,canvas.height/720,0,0);
  guide.width=Math.round(guide.clientWidth*dpr);guide.height=Math.round(guide.clientHeight*dpr);
}
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);fit();
function hud(){ $('#score').textContent=score;$('#timer').textContent=Math.ceil(remaining);$('.time-stat').classList.toggle('urgent',remaining<=5); }
function setState(next){state=next;card.dataset.state=next;$('.start-screen').hidden=next!=='start';$('.result-screen').hidden=next!=='result';$('.hud').hidden=next!=='playing';$('.instruction-strip>span').hidden=next!=='playing';canvas.style.pointerEvents=next==='playing'?'auto':'none';}
function release(){const id=pointer;pointer=null;lastPoint=null;combo=0;if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
function start(){release();score=0;remaining=C.duration;elapsed=0;spawnIn=.25;objects=[];pieces=[];labels=[];trail=[];impact=0;previous=performance.now();setState('playing');hud();$('#announcement').textContent='Round started. 30 seconds.';}
$('#start').addEventListener('click',start);$('#restart').addEventListener('click',start);
function finishStroke(){if(combo>=2){const bonus=comboPoints(combo,C);score+=bonus;labels.push({x:Math.max(120,Math.min(880,lastPoint?.x||500)),y:Math.max(90,Math.min(620,lastPoint?.y||350)),text:`Combo ×${combo}  +${bonus}`,life:1.05,max:1.05,combo:true});hud()}release();}
function finish(){finishStroke();remaining=0;objects=[];pieces=[];labels=[];trail=[];impact=0;setState('result');$('#final-score').textContent=score;$('#announcement').textContent=`Round complete. Final score ${score}.`;$('#restart').focus({preventScroll:true});}
function spawn(){
  const progress=elapsed/C.duration,count=progress<.22?2:Math.random()<.45?3:2;
  const center=rand(300,700),spacing=rand(135,165),bombIndex=elapsed>3&&Math.random()<.24+progress*.17?Math.floor(Math.random()*count):-1;
  for(let i=0;i<count;i++){
    const product=PRODUCTS[Math.floor(Math.random()*PRODUCTS.length)],x=Math.max(100,Math.min(900,center+(i-(count-1)/2)*spacing));
    objects.push({x,y:795+i*rand(0,14),vx:(500-x)*.13+rand(-28,28),vy:rand(-1010,-920),rotation:rand(-.3,.3),spin:rand(-.65,.65),radius:bombIndex===i?39:49,scale:mode==='mouse'?1:1.15,bomb:bombIndex===i,product,hit:false});
  }
  spawnIn=rand(1.15,1.5)-progress*.55;
}
function slice(a,b){
  for(const o of objects){
    if(o.hit||!segmentHitsCircle(a,b,{...o,radius:o.radius*o.scale},mode==='mouse'?4:15))continue;
    o.hit=true;score=applyHit(score,o.bomb,C);
    if(o.bomb){impact=.23;labels.push({x:o.x,y:o.y-25,text:'−20',life:.7,max:.7,bomb:true});}
    else {
      combo++;labels.push({x:o.x,y:o.y-25,text:'+10',life:.65,max:.65});
      for(const side of [-1,1])pieces.push({...o,side,life:.7,max:.7,vx:o.vx+side*100,vy:-75,spin:side*1.8,opened:o.product.effect==='open'});
    }
    hud();
  }
  pieces=pieces.slice(-40);labels=labels.slice(-16);
}
function point(e){return toWorld(e.clientX,e.clientY,canvas.getBoundingClientRect())}
canvas.addEventListener('pointerdown',e=>{
  if(state!=='playing'||pointer!==null||!e.isPrimary||e.button!==0)return;
  e.preventDefault();inputMode(e.pointerType);pointer=e.pointerId;combo=0;lastPoint=point(e);trail=[];canvas.setPointerCapture(pointer);
});
canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==pointer||state!=='playing')return;
  if(e.pointerType==='mouse'&&!(e.buttons&1)){finishStroke();return;}
  e.preventDefault();
  const events=e.getCoalescedEvents?.();
  for(const sample of events?.length?events:[e]){const p=point(sample);if(lastPoint&&Math.hypot(p.x-lastPoint.x,p.y-lastPoint.y)>.2){slice(lastPoint,p);trail.push({...lastPoint,life:.14},{...p,life:.14});lastPoint=p;}}
  trail=trail.slice(-36);
});
canvas.addEventListener('pointerup',e=>{if(e.pointerId===pointer){const p=point(e);if(lastPoint&&Math.hypot(p.x-lastPoint.x,p.y-lastPoint.y)>.2)slice(lastPoint,p);lastPoint=p;finishStroke()}});
canvas.addEventListener('pointercancel',e=>{if(e.pointerId===pointer)finishStroke()});
canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===pointer)finishStroke()});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{previous=performance.now();if(document.hidden&&pointer!==null)finishStroke()});
window.addEventListener('blur',()=>{if(pointer!==null)finishStroke()});
function drawObject(c,o){c.save();c.translate(o.x,o.y);c.rotate(o.rotation);c.scale(o.scale,o.scale);if(o.bomb)drawBomb(c);else drawProduct(c,o.product.id,o.product.color);c.restore()}
function update(dt){
  remaining=Math.max(0,remaining-dt);elapsed+=dt;if(remaining<=0){finish();return}hud();spawnIn-=dt;if(spawnIn<=0)spawn();
  for(const o of objects){o.x+=o.vx*dt;o.y+=o.vy*dt+.5*C.gravity*dt*dt;o.vy+=C.gravity*dt;o.rotation+=o.spin*dt;}
  objects=objects.filter(o=>!o.hit&&o.y<880&&o.x>-130&&o.x<1130);
  for(const p of pieces){p.x+=p.vx*dt;p.y+=p.vy*dt+.5*C.gravity*dt*dt;p.vy+=C.gravity*dt;p.rotation+=p.spin*dt;p.life-=dt;}
  pieces=pieces.filter(p=>p.life>0);
  for(const l of labels){l.y-=35*dt;l.life-=dt;}labels=labels.filter(l=>l.life>0);
  for(const p of trail)p.life-=dt;trail=trail.filter(p=>p.life>0);impact=Math.max(0,impact-dt);
}
function render(){
  ctx.clearRect(0,0,1000,720);
  if(state!=='playing')return;
  // Four quiet corner marks frame the active space without introducing scenery.
  ctx.strokeStyle='#ffffff09';ctx.lineWidth=1.5;ctx.beginPath();
  for(const [x,y,sx,sy] of [[30,30,1,1],[970,30,-1,1],[30,690,1,-1],[970,690,-1,-1]]){ctx.moveTo(x,y+sy*12);ctx.lineTo(x,y);ctx.lineTo(x+sx*12,y)}ctx.stroke();
  for(const o of objects)drawObject(ctx,o);
  for(const p of pieces){ctx.save();ctx.globalAlpha=Math.min(1,p.life/.3);ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.scale(p.scale,p.scale);ctx.beginPath();if(p.opened){ctx.rect(-100,p.side<0?-100:-15,200,p.side<0?70:115)}else{ctx.rect(p.side<0?-100:0,-100,100,200)}ctx.clip();drawProduct(ctx,p.product.id,p.product.color);ctx.restore();}
  for(let i=1;i<trail.length;i++){if(i%2===0)continue;ctx.globalAlpha=Math.min(trail[i].life/.14,1);ctx.strokeStyle='#b7a0ff';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(trail[i-1].x,trail[i-1].y);ctx.lineTo(trail[i].x,trail[i].y);ctx.stroke();ctx.strokeStyle='#f6f0ff';ctx.lineWidth=2;ctx.stroke()}ctx.globalAlpha=1;
  for(const l of labels){ctx.globalAlpha=Math.min(1,l.life/.2);ctx.fillStyle=l.bomb?'#e6bcae':l.combo?'#cbb8ff':'#f5f3fc';ctx.font=`${l.combo?'600 25':'500 22'}px system-ui`;ctx.textAlign='center';ctx.fillText(l.text,l.x,l.y)}ctx.globalAlpha=1;
  if(impact>0){ctx.fillStyle=`rgba(219,167,154,${impact*.18})`;ctx.fillRect(0,0,1000,720)}
}
function drawGuide(now){
  const c=gc;c.setTransform(guide.width/1000,0,0,guide.height/330,0,0);c.clearRect(0,0,1000,330);
  const phase=reduced.matches?.8:(now/1000%3.8)/3.8,cut=phase>.39&&phase<.8,fade=cut?Math.max(0,1-(phase-.45)*2.7):1,spread=cut?(phase-.39)*95:0;
  c.strokeStyle='#b7a0ff18';c.lineWidth=2;c.setLineDash([4,10]);c.beginPath();c.ellipse(371,182,242,91,-.1,0,Math.PI*2);c.stroke();c.setLineDash([]);
  for(const [i,x,y,rotation] of [[0,255,165,-.16],[1,500,145,.14]]){
    for(const side of [-1,1]){c.save();c.globalAlpha=fade;c.translate(x+side*spread,y+spread*.45);c.rotate(rotation+side*spread*.003);c.scale(1.25,1.25);c.beginPath();c.rect(side<0?-100:0,-100,100,200);c.clip();drawProduct(c,PRODUCTS[i].id,PRODUCTS[i].color);c.restore();}
  }
  c.strokeStyle='#ffffff0d';c.lineWidth=2;c.beginPath();c.moveTo(687,91);c.lineTo(687,239);c.stroke();
  c.save();c.translate(802,166);c.rotate(.15);drawBomb(c);c.restore();
  c.strokeStyle='#d5c7df80';c.lineWidth=2;c.beginPath();c.arc(851,221,14,0,Math.PI*2);c.moveTo(841,231);c.lineTo(861,211);c.stroke();
  const move=Math.max(0,Math.min(1,(phase-.13)/.32)),px=143+move*420,py=223-move*100;
  if(phase>.13&&phase<.67){c.globalAlpha=phase>.5?1-(phase-.5)/.17:1;c.strokeStyle='#b7a0ff';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(Math.max(143,px-230),223-(Math.max(143,px-230)-143)/4.2);c.lineTo(px,py);c.stroke();c.strokeStyle='#eee5ff';c.lineWidth=1.5;c.stroke();c.globalAlpha=1;}
  c.save();c.translate(px,py);c.fillStyle='#f5f3fc';c.strokeStyle='#171b2a';c.lineWidth=3;c.lineJoin='round';
  if(mode==='mouse'){const p=new Path2D('M0 0 5 41 16 31 25 48 35 42 25 26 40 23Z');c.fill(p);c.stroke(p);c.strokeStyle='#b7a0ff';c.lineWidth=2;c.beginPath();c.arc(1,0,12,-2.7,-.7);c.stroke();}
  else {c.strokeStyle='#eee8ff';c.fillStyle='#26263d';const p=new Path2D('M-6 13V-5Q-6-15 3-15Q12-15 12-5V17Q22 10 29 18Q40 14 44 26Q52 27 51 40L44 64H7L-13 36Q-19 23-9 23L1 31');c.fill(p);c.stroke(p);c.strokeStyle='#b7a0ff';c.beginPath();c.arc(3,-5,22,3.1,6.2);c.stroke();}
  c.restore();
}
function frame(now){const dt=Math.max(0,(now-previous)/1000);previous=now;if(!document.hidden){if(state==='playing')update(dt);render();if(state==='start')drawGuide(now)}requestAnimationFrame(frame)}
setState('start');requestAnimationFrame(frame);
