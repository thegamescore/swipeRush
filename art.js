const shape = (c, path, fill, stroke, width=2) => { const p = new Path2D(path); if(fill){c.fillStyle=fill;c.fill(p)} if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(p)} };
function rounded(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function brandMark(c,x,y,size,color){c.save();c.fillStyle=color;c.font=`700 ${size}px Georgia,serif`;c.textAlign='center';c.fillText('gc_',x,y);c.restore()}
export function drawProduct(c, type, color) {
  c.lineJoin='round';c.lineCap='round';
  if(type==='sneaker') {
    shape(c,'M-57 13 -50-24 -30-16 -18-32 -2-8 17 1 43 7 Q58 11 59 27 L-57 27Z',color);
    shape(c,'M-57 17 Q-24 24 3 17 L57 19 59 29 Q4 39-59 28Z','#f0edf7');
    shape(c,'M-45-14-40 10-24 14-21-9Z','#ffffff28');
    shape(c,'M-8-11-20-4 M1-4-11 3 M11 1-1 9',null,'#f4efff',3.5);
    shape(c,'M-18 15 Q-1 16 20 7',null,'#746199',3);
    shape(c,'M-51 28 Q4 36 51 28',null,'#c7c0d7',1.5);
  } else if(type==='bottle') {
    c.fillStyle='#dde9e5';c.beginPath();c.roundRect(-17,-59,34,21,5);c.fill();
    c.fillStyle='#6eaaa2';c.fillRect(-13,-39,26,10);
    c.fillStyle=color;c.beginPath();c.roundRect(-32,-31,64,84,12);c.fill();
    c.fillStyle='#ffffff18';c.beginPath();c.roundRect(-25,-23,8,64,4);c.fill();
    c.fillStyle='#eff3e8';c.beginPath();c.roundRect(-25,-5,50,37,3);c.fill();
    brandMark(c,0,13,14,'#54867f');c.fillStyle='#9db5aa';c.fillRect(-8,15,16,2);
  } else if(type==='box') {
    shape(c,'M-46-30 7-49 48-27-6-7Z','#f2cfac');
    shape(c,'M-46-30-6-7-6 51-46 27Z','#c9906d');
    shape(c,'M-6-7 48-27 48 30-6 51Z',color);
    shape(c,'M-26-37 15-15 15 3 28-2 28-20-13-42Z','#f6e7cf');
    shape(c,'M6 18 35 8 35 24 6 34Z','#faebd9');
    shape(c,'M12 23 28 17',null,'#ba9478',2);
    brandMark(c,16,24,7,'#815b48');
  } else if(type==='headphones') {
    shape(c,'M-39 18V-10C-39-59 39-59 39-10V18',null,'#e5ddfa',13);
    shape(c,'M-39-10C-39-59 39-59 39-10',null,color,8);
    rounded(c,-49,-5,23,48,9,color);rounded(c,26,-5,23,48,9,color);
    rounded(c,-30,0,10,39,5,'#544372');rounded(c,20,0,10,39,5,'#544372');
    shape(c,'M-42 6V25 M42 6V25',null,'#ede9fe',2);
  } else if(type==='gamepad') {
    shape(c,'M-29-29Q-40-29-46-14L-59 26Q-63 44-48 46Q-40 47-27 27H27Q40 47 49 46Q63 44 59 26L46-14Q40-29 29-29Z',color);
    shape(c,'M-40-17Q-31-24-19-21M19-21Q31-24 40-17',null,'#ede9fe',4);
    rounded(c,-38,-10,9,27,2,'#665280');rounded(c,-47,-1,27,9,2,'#665280');
    for(const [x,y,fill] of [[33,-10,'#7760a1'],[43,0,'#64bdbd'],[23,0,'#f2e9db'],[33,10,'#a477ac']]){c.fillStyle=fill;c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill()}
    for(const x of [-13,13]){c.fillStyle='#8872aa';c.beginPath();c.arc(x,17,7,0,Math.PI*2);c.fill();}
    brandMark(c,0,-12,9,'#665280');
  } else if(type==='cap') {
    shape(c,'M-42 18V5C-43-51 34-54 42-5L44 18Z',color);
    shape(c,'M-42 18Q-9 0 44 18L61 25Q68 36 45 39Q6 40-42 27Z','#469bae');
    shape(c,'M-7-37Q8-14 6 12',null,'#b7eef0',2);
    rounded(c,-9,-42,14,6,3,'#469bae');
    brandMark(c,-20,2,13,'#123e52');
  } else if(type==='cup') {
    shape(c,'M-32-32H32L23 52H-23Z','#f8e5d5');
    shape(c,'M-30-10H30L26 30H-26Z',color);
    rounded(c,-37,-39,74,12,4,'#e0c8b7');rounded(c,-30,-46,60,10,4,'#f6e6da');
    shape(c,'M-19-21-14 43',null,'#ffffff55',3);
    brandMark(c,0,15,17,'#714a47');
  } else if(type==='tote') {
    shape(c,'M-21-26V-38C-21-64 21-64 21-38V-26',null,'#d2ece0',7);
    shape(c,'M-39-28H39L47 47Q0 61-47 47Z',color);
    shape(c,'M-29-16-33 38M29-16 33 38',null,'#79ac97',2);
    brandMark(c,0,15,20,'#3c7766');

  }
}
export function drawBomb(c) {
  c.lineCap='round';
  shape(c,'M9-36 Q3-59 20-57 Q35-55 29-69',null,'#d5c4a8',4);
  c.fillStyle='#777989';c.save();c.rotate(.22);c.fillRect(-12,-44,24,17);c.restore();
  c.fillStyle='#343949';c.beginPath();c.arc(0,0,39,0,Math.PI*2);c.fill();
  c.strokeStyle='#707385';c.lineWidth=2;c.stroke();
  shape(c,'M-23-11 Q-20-23-9-25',null,'#a4a6b5',4);
  shape(c,'M-9-8 9 10 M9-8-9 10',null,'#d4cedf',3);
  shape(c,'M29-76 29-83 M36-71 43-74 M21-73 17-79',null,'#e6bb91',2);
}
