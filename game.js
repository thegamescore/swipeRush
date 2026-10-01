import { CONFIG as C, PRODUCTS, BRAND } from "./config.js";
import { drawProduct, drawBomb } from "./art.js";
import {
  segmentHitsCircle,
  applyHit,
  comboPoints,
  toWorld,
} from "./mechanics.js";
import { sfx } from "./audio.js";
const $ = (s) => document.querySelector(s);
const card = $(".game-card"),
  canvas = $("#game"),
  ctx = canvas.getContext("2d"),
  guide = $("#guide"),
  gc = guide.getContext("2d");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let mode =
  matchMedia("(any-pointer: coarse)").matches &&
  !matchMedia("(hover: hover) and (pointer: fine)").matches
    ? "touch"
    : "mouse";
const full = matchMedia(
  "(max-width: 1024px), (pointer: coarse) and (hover: none)",
);
const MAX_SWIPE_DURATION = 500;
const MAX_SWIPE_LENGTH = Math.hypot(C.width, C.height);
let W = C.width,
  state = "start",
  score = 0,
  remaining = C.duration,
  objects = [],
  pieces = [],
  labels = [],
  trail = [],
  pointer = null,
  combo = 0,
  lastPoint = null,
  swipeTimer = null,
  swipeStarted = 0,
  swipeExpired = false,
  swipeDistance = 0,
  spawnIn = 0.35,
  elapsed = 0,
  previous = 0,
  impact = 0,
  sparks = [],
  flashes = [],
  shake = 0,
  lastTick = 0,
  lastWhoosh = 0;
const rand = (a, b) => a + Math.random() * (b - a);
function inputMode(type) {
  if (!type) return;
  mode = type;
  $("#input-guide").textContent =
    type === "mouse"
      ? "One swipe at a time. Release and click to start again."
      : type === "pen"
        ? "One swipe at a time. Release and press again."
        : "One swipe at a time. Lift and touch again.";
}
inputMode(mode);
window.addEventListener("pointerdown", (e) => inputMode(e.pointerType), {
  passive: true,
});
window.addEventListener(
  "pointermove",
  (e) => {
    if (e.pointerType === "mouse" && mode !== "mouse") inputMode("mouse");
  },
  { passive: true },
);
function fit() {
  card.style.width = "";
  const r0 = canvas.getBoundingClientRect();
  // Tablet/mobile: card fills screen. World keeps 720 height, width follows screen shape.
  if (full.matches) {
    W = r0.height ? (C.height * r0.width) / r0.height : C.width;
    size(r0);
    return;
  }
  W = C.width;
  const strips =
    $(".status-strip").offsetHeight + $(".instruction-strip").offsetHeight + 2;
  const available = window.visualViewport?.height || innerHeight;
  const outerPadding =
    parseFloat(getComputedStyle(document.body).paddingTop) * 2;
  const maxWidth = Math.max(180, (available - outerPadding - strips) / 0.72);
  card.style.width = `min(760px, 100%, ${maxWidth}px)`;
  size(canvas.getBoundingClientRect());
}
function size(r) {
  const dpr = Math.min(devicePixelRatio || 1, 3);
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / C.height, 0, 0);
  guide.width = Math.round(guide.clientWidth * dpr);
  guide.height = Math.round(guide.clientHeight * dpr);
}
window.addEventListener("resize", fit);
window.visualViewport?.addEventListener("resize", fit);
fit();
const muteButton = $("#mute");
function syncMute() {
  const m = sfx.isMuted();
  muteButton.setAttribute("aria-pressed", String(m));
  muteButton.setAttribute("aria-label", m ? "Unmute sound" : "Mute sound");
  muteButton.title = m ? "Unmute sound (M)" : "Mute sound (M)";
}
function toggleMute() {
  sfx.setMuted(!sfx.isMuted());
  syncMute();
  sfx.click();
}
muteButton.addEventListener("click", toggleMute);
syncMute();
window.addEventListener("keydown", (e) => {
  if (
    (e.key === "m" || e.key === "M") &&
    !e.repeat &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey
  )
    toggleMute();
});
function hud() {
  $("#score").textContent = score;
  $("#timer").textContent = Math.ceil(remaining);
  $(".time-stat").classList.toggle("urgent", remaining <= 5);
}
function setState(next) {
  state = next;
  card.dataset.state = next;
  $(".start-screen").hidden = next !== "start";
  $(".result-screen").hidden = next !== "result";
  $(".hud").hidden = next !== "playing";
  $(".instruction-strip>span").hidden = true;
  canvas.style.pointerEvents = next === "playing" ? "auto" : "none";
}
function release() {
  swipeExpired = false;
  $(".instruction-strip>span").hidden = true;
  const id = pointer;
  pointer = null;
  lastPoint = null;
  swipeDistance = 0;
  combo = 0;
  if (swipeTimer !== null) {
    window.clearTimeout?.(swipeTimer);
    swipeTimer = null;
  }
  if (id !== null && canvas.hasPointerCapture(id))
    canvas.releasePointerCapture(id);
}
function start() {
  release();
  sfx.unlock();
  sfx.start();
  sparks = [];
  flashes = [];
  shake = 0;
  lastTick = 0;
  score = 0;
  remaining = C.duration;
  elapsed = 0;
  spawnIn = 0.25;
  objects = [];
  pieces = [];
  labels = [];
  trail = [];
  impact = 0;
  previous = performance.now();
  setState("playing");
  hud();
  $("#announcement").textContent = "Round started. 30 seconds.";
}
$("#start").addEventListener("click", start);
$("#restart").addEventListener("click", start);
function finishStroke(expired = false) {
  if (combo >= 2) {
    const bonus = comboPoints(combo, C);
    score += bonus;
    labels.push({
      x: Math.max(120, Math.min(W - 120, lastPoint?.x || W / 2)),
      y: Math.max(90, Math.min(620, lastPoint?.y || 350)),
      text: `Combo ×${combo}  +${bonus}`,
      life: 1.05,
      max: 1.05,
      combo: true,
      pop: 0.22,
    });
    sfx.combo(combo);
    hud();
  }
  if (expired) {
    swipeExpired = true;
    combo = 0;
    lastPoint = null;
    trail = [];
    if (swipeTimer !== null) {
      window.clearTimeout?.(swipeTimer);
      swipeTimer = null;
    }
    $(".instruction-strip>span").textContent =
      mode === "touch" ? "Lift to swipe again." : "Release to swipe again.";
    $(".instruction-strip>span").hidden = false;
  } else release();
}
function finish() {
  finishStroke();
  remaining = 0;
  objects = [];
  pieces = [];
  labels = [];
  trail = [];
  sparks = [];
  flashes = [];
  impact = 0;
  shake = 0;
  setState("result");
  sfx.end();
  $("#final-score").textContent = score;
  $("#announcement").textContent = `Round complete. Final score ${score}.`;
  $("#restart").focus({ preventScroll: true });
}
function spawn() {
  const progress = elapsed / C.duration,
    count = progress < 0.22 || W < 700 ? 2 : Math.random() < 0.45 ? 3 : 2;
  const margin = Math.min(100, W * 0.15),
    center = rand(W * 0.3, W * 0.7),
    spacing = Math.min(
      rand(135, 165),
      (W - 2 * margin) / Math.max(1, count - 1),
    ),
    bombIndex =
      elapsed > 3 && Math.random() < 0.24 + progress * 0.17
        ? Math.floor(Math.random() * count)
        : -1;
  for (let i = 0; i < count; i++) {
    const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)],
      x = Math.max(
        margin,
        Math.min(W - margin, center + (i - (count - 1) / 2) * spacing),
      );
    objects.push({
      x,
      y: 795 + i * rand(0, 14),
      vx: (W / 2 - x) * 0.13 + rand(-28, 28),
      vy: rand(-1010, -920),
      rotation: rand(-0.3, 0.3),
      spin: rand(-0.65, 0.65),
      radius: bombIndex === i ? 39 : 49,
      scale: mode === "mouse" ? 1 : 1.15,
      bomb: bombIndex === i,
      product,
      hit: false,
    });
  }
  spawnIn = rand(1.15, 1.5) - progress * 0.55;
}
// Particle burst. Juice droplets plus bright sparks.
function burst(x, y, color, count, speed, angle) {
  if (reduced.matches) count = Math.ceil(count / 3);
  for (let i = 0; i < count; i++) {
    const dir =
        angle === undefined
          ? rand(0, Math.PI * 2)
          : angle + rand(-0.55, 0.55) + (Math.random() < 0.5 ? 0 : Math.PI),
      v = rand(0.25, 1) * speed,
      life = rand(0.35, 0.75);
    sparks.push({
      x,
      y,
      vx: Math.cos(dir) * v,
      vy: Math.sin(dir) * v - 90,
      life,
      max: life,
      size: rand(2, 5.5),
      color,
    });
  }
}
function slice(a, b) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x),
    nx = -Math.sin(angle),
    ny = Math.cos(angle);
  for (const o of objects) {
    if (
      o.hit ||
      !segmentHitsCircle(
        a,
        b,
        { ...o, radius: o.radius * o.scale },
        mode === "mouse" ? 4 : 15,
      )
    )
      continue;
    o.hit = true;
    score = applyHit(score, o.bomb, C);
    if (o.bomb) {
      impact = 0.23;
      shake = 0.35;
      sfx.bomb();
      labels.push({
        x: o.x,
        y: o.y - 25,
        text: "−20",
        life: 0.7,
        max: 0.7,
        bomb: true,
        pop: 0.15,
      });
      burst(o.x, o.y, "#ffb36b", 26, 520);
      burst(o.x, o.y, "#8d90a6", 14, 260);
      flashes.push({ x: o.x, y: o.y, ring: true, life: 0.45, max: 0.45 });
    } else {
      combo++;
      sfx.slice(combo);
      labels.push({
        x: o.x,
        y: o.y - 25,
        text: "+10",
        life: 0.65,
        max: 0.65,
        pop: 0.15,
      });
      burst(o.x, o.y, o.product.color, 16, 420, angle + Math.PI / 2);
      burst(o.x, o.y, "#ffffff", 8, 560, angle);
      flashes.push({ x: o.x, y: o.y, angle, life: 0.24, max: 0.24 });
      for (const side of [-1, 1])
        pieces.push({
          ...o,
          side,
          cut: angle - o.rotation,
          life: 0.8,
          max: 0.8,
          vx: o.vx * 0.5 + side * nx * 150,
          vy: -110 + side * ny * 150,
          spin: o.spin + side * 2.2,
          opened: o.product.effect === "open",
        });
    }
    hud();
  }
  pieces = pieces.slice(-40);
  labels = labels.slice(-16);
  sparks = sparks.slice(-220);
  flashes = flashes.slice(-12);
}
function point(e) {
  return toWorld(
    e.clientX,
    e.clientY,
    canvas.getBoundingClientRect(),
    W,
    C.height,
  );
}
canvas.addEventListener("pointerdown", (e) => {
  if (state !== "playing" || pointer !== null || !e.isPrimary || e.button !== 0)
    return;
  e.preventDefault();
  inputMode(e.pointerType);
  pointer = e.pointerId;
  swipeExpired = false;
  swipeStarted = performance.now();
  combo = 0;
  swipeDistance = 0;
  lastPoint = point(e);
  trail = [{ ...lastPoint, life: 0.2 }];
  canvas.setPointerCapture(pointer);
  swipeTimer = window.setTimeout(() => {
    swipeTimer = null;
    if (pointer !== null && state === "playing") finishStroke(true);
  }, MAX_SWIPE_DURATION);
});
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerId !== pointer || state !== "playing") return;
  if (e.pointerType === "mouse" && !(e.buttons & 1)) {
    finishStroke();
    return;
  }
  e.preventDefault();
  moveStroke(e);
});
function moveStroke(e) {
  if (swipeExpired) return;
  if (performance.now() - swipeStarted >= MAX_SWIPE_DURATION) {
    finishStroke(true);
    return;
  }
  const events = e.getCoalescedEvents?.();
  let travel = 0,
    limitReached = false;
  for (const sample of events?.length ? events : [e]) {
    const target = point(sample),
      dx = target.x - lastPoint.x,
      dy = target.y - lastPoint.y,
      d = Math.hypot(dx, dy);
    if (d <= 0.2) continue;
    const step = Math.min(d, MAX_SWIPE_LENGTH - swipeDistance),
      p =
        step < d
          ? {
              x: lastPoint.x + (dx / d) * step,
              y: lastPoint.y + (dy / d) * step,
            }
          : target;
    if (step > 0) {
      slice(lastPoint, p);
      travel += step;
      swipeDistance += step;
      trail.push({ ...p, life: 0.2 });
      if (step > 18 && Math.random() < 0.35) burst(p.x, p.y, "#c4b5fd", 1, 90);
      lastPoint = p;
    }
    if (swipeDistance >= MAX_SWIPE_LENGTH) {
      limitReached = true;
      break;
    }
  }
  // Whoosh on fast flicks. Throttled so long drags don't drone.
  const now = performance.now();
  if (travel > 40 && now - lastWhoosh > 150) {
    sfx.swipe(travel);
    lastWhoosh = now;
  }
  trail = trail.slice(-48);
  if (limitReached) finishStroke(true);
}
canvas.addEventListener("pointerup", (e) => {
  if (e.pointerId === pointer) {
    moveStroke(e);
    finishStroke();
  }
});
canvas.addEventListener("pointercancel", (e) => {
  if (e.pointerId === pointer) finishStroke();
});
canvas.addEventListener("lostpointercapture", (e) => {
  if (e.pointerId === pointer) finishStroke();
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("visibilitychange", () => {
  previous = performance.now();
  if (document.hidden && pointer !== null) finishStroke();
});
window.addEventListener("blur", () => {
  if (pointer !== null) finishStroke();
});
function drawObject(c, o) {
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.rotation);
  c.scale(o.scale, o.scale);
  if (o.bomb) drawBomb(c);
  else drawProduct(c, o.product.id, o.product.color);
  c.restore();
}
function update(dt) {
  remaining = Math.max(0, remaining - dt);
  elapsed += dt;
  if (remaining <= 0) {
    finish();
    return;
  }
  hud();
  const sec = Math.ceil(remaining);
  if (sec <= 5 && sec !== lastTick) {
    lastTick = sec;
    sfx.tick();
  }
  spawnIn -= dt;
  if (spawnIn <= 0) spawn();
  for (const o of objects) {
    o.x += o.vx * dt;
    o.y += o.vy * dt + 0.5 * C.gravity * dt * dt;
    o.vy += C.gravity * dt;
    o.rotation += o.spin * dt;
  }
  objects = objects.filter(
    (o) => !o.hit && o.y < 880 && o.x > -130 && o.x < W + 130,
  );
  for (const p of pieces) {
    p.x += p.vx * dt;
    p.y += p.vy * dt + 0.5 * C.gravity * dt * dt;
    p.vy += C.gravity * dt;
    p.rotation += p.spin * dt;
    p.life -= dt;
  }
  pieces = pieces.filter((p) => p.life > 0);
  for (const l of labels) {
    l.y -= 35 * dt;
    l.life -= dt;
  }
  labels = labels.filter((l) => l.life > 0);
  for (const p of trail) p.life -= dt;
  trail = trail.filter((p) => p.life > 0);
  impact = Math.max(0, impact - dt);
  shake = Math.max(0, shake - dt);
  for (const s of sparks) {
    s.vx *= 1 - 2.2 * dt;
    s.vy = s.vy * (1 - 2.2 * dt) + C.gravity * 0.55 * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
  }
  sparks = sparks.filter((s) => s.life > 0);
  for (const f of flashes) f.life -= dt;
  flashes = flashes.filter((f) => f.life > 0);
}
function render() {
  ctx.clearRect(0, 0, W, C.height);
  if (state !== "playing") return;
  ctx.save();
  // Bomb shake. Decays fast.
  if (shake > 0 && !reduced.matches) {
    const k = shake * shake * 220;
    ctx.translate(rand(-k, k), rand(-k, k));
  }
  // Four quiet corner marks frame the active space without introducing scenery.
  ctx.strokeStyle = "#ffffff09";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const [x, y, sx, sy] of [
    [30, 30, 1, 1],
    [W - 30, 30, -1, 1],
    [30, 690, 1, -1],
    [W - 30, 690, -1, -1],
  ]) {
    ctx.moveTo(x, y + sy * 12);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * 12, y);
  }
  ctx.stroke();
  for (const o of objects) drawObject(ctx, o);
  for (const p of pieces) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 0.3);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.scale(p.scale, p.scale);
    ctx.beginPath();
    // Clip half along real swipe angle.
    if (p.opened) {
      ctx.rect(-100, p.side < 0 ? -100 : -15, 200, p.side < 0 ? 70 : 115);
    } else {
      ctx.rotate(p.cut);
      ctx.rect(-120, p.side < 0 ? -120 : 0, 240, 120);
      ctx.rotate(-p.cut);
    }
    ctx.clip();
    drawProduct(ctx, p.product.id, p.product.color);
    // Glowing cut edge fades out.
    const glow = Math.max(0, (p.life - p.max + 0.35) / 0.35);
    if (glow > 0 && !p.opened) {
      ctx.rotate(p.cut);
      ctx.globalAlpha = glow;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-62, 0);
      ctx.lineTo(62, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation = "lighter";
  for (const f of flashes) {
    const t = 1 - f.life / f.max;
    ctx.globalAlpha = 1 - t;
    if (f.ring) {
      ctx.strokeStyle = "#ffc58a";
      ctx.lineWidth = 10 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 40 + 170 * t, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.fillStyle = "#b7a0ff";
      ctx.beginPath();
      ctx.ellipse(0, 0, 90 + 120 * t, 9 * (1 - t) + 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(0, 0, 70 + 110 * t, 3 * (1 - t) + 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.lineCap = "round";
  for (const s of sparks) {
    const k = s.life / s.max;
    ctx.globalAlpha = k;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size * (0.4 + 0.6 * k);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * 0.035, s.y - s.vy * 0.035);
    ctx.stroke();
  }
  // Tapered neon blade. Thick at tip, thin at tail; three passes for glow.
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1],
      b = trail[i],
      k = Math.min(1, b.life / 0.2),
      w = (k * i) / trail.length;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(124,58,237,${0.32 * k})`;
    ctx.lineWidth = 4 + 22 * w;
    ctx.stroke();
    ctx.strokeStyle = `rgba(183,160,255,${0.7 * k})`;
    ctx.lineWidth = 2 + 9 * w;
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.95 * k})`;
    ctx.lineWidth = 1 + 3.5 * w;
    ctx.stroke();
  }
  if (pointer !== null && lastPoint) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  // Labels pop in with overshoot, then drift up.
  for (const l of labels) {
    const age = l.max - l.life,
      pop =
        l.pop && !reduced.matches
          ? 1 + 0.7 * Math.max(0, 1 - age / l.pop) ** 2
          : 1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, l.life / 0.2);
    ctx.translate(l.x, l.y);
    ctx.scale(pop, pop);
    ctx.fillStyle = l.bomb ? "#e6bcae" : l.combo ? "#cbb8ff" : "#f5f3fc";
    ctx.font = `${l.combo ? "600 25" : "500 22"}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(l.text, 0, 0);
    ctx.restore();
  }
  ctx.restore();
  if (impact > 0) {
    ctx.fillStyle = `rgba(219,167,154,${impact * 0.18})`;
    ctx.fillRect(0, 0, W, C.height);
  }
}
function drawGuide(now) {
  const c = gc;
  c.setTransform(guide.width / 1000, 0, 0, guide.height / 330, 0, 0);
  c.clearRect(0, 0, 1000, 330);
  const phase = reduced.matches ? 0.8 : ((now / 1000) % 3.8) / 3.8,
    cut = phase > 0.39 && phase < 0.8,
    fade = cut ? Math.max(0, 1 - (phase - 0.45) * 2.7) : 1,
    spread = cut ? (phase - 0.39) * 95 : 0;
  c.strokeStyle = `${BRAND.trail}18`;
  c.lineWidth = 2;
  c.setLineDash([4, 10]);
  c.beginPath();
  c.ellipse(371, 182, 242, 91, -0.1, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);
  for (const [i, x, y, rotation] of [
    [0, 255, 165, -0.16],
    [1, 500, 145, 0.14],
  ]) {
    for (const side of [-1, 1]) {
      c.save();
      c.globalAlpha = fade;
      c.translate(x + side * spread, y + spread * 0.45);
      c.rotate(rotation + side * spread * 0.003);
      c.scale(1.25, 1.25);
      c.beginPath();
      c.rect(side < 0 ? -100 : 0, -100, 100, 200);
      c.clip();
      drawProduct(c, PRODUCTS[i].id, PRODUCTS[i].color);
      c.restore();
    }
  }
  c.strokeStyle = "#ffffff0d";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(687, 91);
  c.lineTo(687, 239);
  c.stroke();
  c.save();
  c.translate(802, 166);
  c.rotate(0.15);
  drawBomb(c);
  c.restore();
  c.strokeStyle = "#d5c7df80";
  c.lineWidth = 2;
  c.beginPath();
  c.arc(851, 221, 14, 0, Math.PI * 2);
  c.moveTo(841, 231);
  c.lineTo(861, 211);
  c.stroke();
  const move = Math.max(0, Math.min(1, (phase - 0.13) / 0.32)),
    px = 143 + move * 420,
    py = 223 - move * 100;
  if (phase > 0.13 && phase < 0.67) {
    c.globalAlpha = phase > 0.5 ? 1 - (phase - 0.5) / 0.17 : 1;
    c.strokeStyle = BRAND.trail;
    c.lineWidth = 4;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(
      Math.max(143, px - 230),
      223 - (Math.max(143, px - 230) - 143) / 4.2,
    );
    c.lineTo(px, py);
    c.stroke();
    c.strokeStyle = "#eee5ff";
    c.lineWidth = 1.5;
    c.stroke();
    c.globalAlpha = 1;
  }
  c.save();
  c.translate(px, py);
  c.fillStyle = "#f5f3fc";
  c.strokeStyle = "#101729";
  c.lineWidth = 3;
  c.lineJoin = "round";
  if (mode === "mouse") {
    const p = new Path2D("M0 0 5 41 16 31 25 48 35 42 25 26 40 23Z");
    c.fill(p);
    c.stroke(p);
    c.strokeStyle = BRAND.trail;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(1, 0, 12, -2.7, -0.7);
    c.stroke();
  } else {
    c.strokeStyle = "#eee8ff";
    c.fillStyle = "#26263d";
    const p = new Path2D(
      "M-6 13V-5Q-6-15 3-15Q12-15 12-5V17Q22 10 29 18Q40 14 44 26Q52 27 51 40L44 64H7L-13 36Q-19 23-9 23L1 31",
    );
    c.fill(p);
    c.stroke(p);
    c.strokeStyle = BRAND.trail;
    c.beginPath();
    c.arc(3, -5, 22, 3.1, 6.2);
    c.stroke();
  }
  c.restore();
}
function frame(now) {
  const dt = Math.max(0, (now - previous) / 1000);
  previous = now;
  if (!document.hidden) {
    if (state === "playing") update(dt);
    render();
    if (state === "start") drawGuide(now);
  }
  requestAnimationFrame(frame);
}
setState("start");
requestAnimationFrame(frame);
