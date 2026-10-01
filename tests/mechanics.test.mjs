import test from "node:test";
import assert from "node:assert/strict";
import {
  segmentHitsCircle,
  applyHit,
  comboPoints,
  toWorld,
} from "../mechanics.js";
import { CONFIG } from "../config.js";
test("a fast segment hits an intervening product even when endpoints miss", () => {
  assert.equal(
    segmentHitsCircle(
      { x: 0, y: 50 },
      { x: 900, y: 50 },
      { x: 450, y: 50, radius: 40 },
    ),
    true,
  );
  assert.equal(
    segmentHitsCircle(
      { x: 0, y: 95 },
      { x: 900, y: 95 },
      { x: 450, y: 50, radius: 40 },
    ),
    false,
  );
  assert.equal(
    segmentHitsCircle(
      { x: 0, y: 95 },
      { x: 900, y: 95 },
      { x: 450, y: 50, radius: 40 },
      15,
    ),
    true,
  );
});
test("score and combo rules include zero floor", () => {
  assert.equal(applyHit(0, false, CONFIG), 10);
  assert.equal(applyHit(10, true, CONFIG), 0);
  assert.equal(applyHit(70, true, CONFIG), 50);
  assert.equal(comboPoints(1, CONFIG), 0);
  assert.equal(comboPoints(2, CONFIG), 5);
  assert.equal(comboPoints(4, CONFIG), 15);
});
test("coordinates remain consistent across scale and orientation", () => {
  for (const [width, height] of [
    [756, 544.32],
    [350, 252],
    [300, 216],
  ])
    assert.deepEqual(
      toWorld(20 + width * 0.5, 40 + height * 0.5, {
        left: 20,
        top: 40,
        width,
        height,
      }),
      { x: 500, y: 360 },
    );
});
