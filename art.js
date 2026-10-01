const shape = (c, path, fill, stroke, width=2) => { const p = new Path2D(path); if(fill){c.fillStyle=fill;c.fill(p)} if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(p)} };
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
    c.fillStyle='#54867f';c.fillRect(-12,6,24,3);c.fillStyle='#9db5aa';c.fillRect(-8,15,16,2);
  } else {
    shape(c,'M-46-30 7-49 48-27-6-7Z','#f2cfac');
    shape(c,'M-46-30-6-7-6 51-46 27Z','#c9906d');
    shape(c,'M-6-7 48-27 48 30-6 51Z',color);
    shape(c,'M-26-37 15-15 15 3 28-2 28-20-13-42Z','#f6e7cf');
    shape(c,'M6 18 35 8 35 24 6 34Z','#faebd9');
    shape(c,'M12 23 28 17',null,'#ba9478',2);
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
