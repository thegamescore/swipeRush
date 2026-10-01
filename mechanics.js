export function segmentHitsCircle(a, b, object, tolerance = 0) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((object.x - a.x) * dx + (object.y - a.y) * dy) / length)) : 0;
  return Math.hypot(object.x - a.x - t * dx, object.y - a.y - t * dy) <= object.radius + tolerance;
}
export function applyHit(score, bomb, rules) { return Math.max(0, score + (bomb ? -rules.bombPenalty : rules.productPoints)); }
export function comboPoints(count, rules) { return Math.max(0, count - 1) * rules.comboBonus; }
export function toWorld(clientX, clientY, bounds, width = 1000, height = 720) { return { x: (clientX - bounds.left) / bounds.width * width, y: (clientY - bounds.top) / bounds.height * height }; }
