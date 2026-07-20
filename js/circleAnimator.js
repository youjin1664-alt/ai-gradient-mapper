/* ==========================================================================
   circleAnimator.js — continuous, per-circle "twinkle" color animation.

   Purely a rendering-time overlay: it reads circle positions/radii from
   state.circles (produced entirely by circleEngine.js, untouched — this
   file never imports or modifies circle-packing, masking, or slider logic)
   and independently randomizes each circle's displayed color/alpha/scale
   over time, on its own randomized schedule. Runs its own
   requestAnimationFrame loop and drives canvasView.repaint() continuously
   so circles stay "alive" even when the user isn't interacting.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.circleAnimator = (function () {
  const CHANGE_INTERVAL_MIN = 800; // ms — fastest a circle can re-roll its color
  const CHANGE_INTERVAL_MAX = 4800; // ms — slowest
  const TWINKLE_DURATION_MIN = 400; // ms — length of the brief glow pulse
  const TWINKLE_DURATION_MAX = 900;
  const IDLE_ALPHA = 0.85;
  const PEAK_ALPHA = 1;
  const SETTLE_ALPHA = 0.85;
  const IDLE_SCALE = 1;
  const PEAK_SCALE = 1.08;

  let animStates = [];
  let running = false;

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  // Random color drawn only from the palette currently in use — repeats
  // are allowed (no "avoid last color" logic), matching a natural,
  // unweighted distribution.
  function pickPaletteColor() {
    const palette = AGM.state.palette;
    if (!palette || palette.length === 0) return { r: 255, g: 255, b: 255 };
    const entry = palette[Math.floor(Math.random() * palette.length)];
    return AGM.utils.hexToRgb(entry.hex);
  }

  function createState(now) {
    const interval = randRange(CHANGE_INTERVAL_MIN, CHANGE_INTERVAL_MAX);
    return {
      color: pickPaletteColor(),
      alpha: IDLE_ALPHA,
      scale: IDLE_SCALE,
      twinkleStart: -Infinity,
      twinkleDuration: 0,
      // Staggered independently per circle so nothing changes in lockstep.
      nextChangeAt: now + Math.random() * interval,
    };
  }

  /** Rebuilds per-circle animation state to match a freshly (re)generated
   *  circles array. When the circle count hasn't changed (e.g. a
   *  palette/colorMix-only recolor, which doesn't move or add/remove any
   *  circles) existing timers/colors are left alone so animation phase
   *  isn't reset by unrelated updates. */
  function sync(circles) {
    const now = performance.now();
    if (animStates.length !== circles.length) {
      animStates = circles.map(() => createState(now));
    }
    if (!running && circles.length > 0) start();
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function updateState(s, now) {
    if (now >= s.nextChangeAt) {
      s.color = pickPaletteColor();
      s.twinkleStart = now;
      s.twinkleDuration = randRange(TWINKLE_DURATION_MIN, TWINKLE_DURATION_MAX);
      s.nextChangeAt = now + randRange(CHANGE_INTERVAL_MIN, CHANGE_INTERVAL_MAX);
    }

    const elapsed = now - s.twinkleStart;
    if (elapsed >= 0 && elapsed < s.twinkleDuration) {
      const t = elapsed / s.twinkleDuration;
      if (t < 0.5) {
        const e = smoothstep(t / 0.5);
        s.alpha = IDLE_ALPHA + (PEAK_ALPHA - IDLE_ALPHA) * e;
        s.scale = IDLE_SCALE + (PEAK_SCALE - IDLE_SCALE) * e;
      } else {
        const e = smoothstep((t - 0.5) / 0.5);
        s.alpha = PEAK_ALPHA + (SETTLE_ALPHA - PEAK_ALPHA) * e;
        s.scale = PEAK_SCALE + (IDLE_SCALE - PEAK_SCALE) * e;
      }
    } else {
      s.alpha = SETTLE_ALPHA;
      s.scale = IDLE_SCALE;
    }
  }

  /** Draws the current animated frame. Mirrors circleEngine.paintCircle's
   *  existing hard/soft-edge logic (kept as a separate, small copy here so
   *  circleEngine.js itself is never touched), using each circle's own
   *  animated alpha/scale instead of one shared opacity value. `opacity`
   *  (0-100, from the Opacity slider) is applied as a multiplier on top of
   *  that per-circle twinkle alpha. */
  function drawFrame(ctx, width, height, edgeSoftness, opacity) {
    ctx.clearRect(0, 0, width, height);
    const circles = AGM.state.circles;
    if (!circles || circles.length === 0) return;

    const now = performance.now();
    const softness = AGM.utils.clamp(edgeSoftness, 0, 100);
    const opacityMul = AGM.utils.clamp(opacity, 0, 100) / 100;

    for (let i = 0; i < circles.length; i++) {
      const s = animStates[i];
      if (!s) continue;
      updateState(s, now);

      const circle = circles[i];
      const radius = Math.max(0.2, circle.radius * s.scale);
      const alpha = AGM.utils.clamp(s.alpha * opacityMul, 0, 1);

      if (softness <= 2) {
        ctx.beginPath();
        ctx.fillStyle = AGM.utils.rgba(s.color, alpha);
        ctx.arc(circle.x, circle.y, radius, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      const innerStop = AGM.utils.clamp(1 - softness / 100, 0, 0.98);
      const grad = ctx.createRadialGradient(
        circle.x,
        circle.y,
        Math.max(0, radius * innerStop),
        circle.x,
        circle.y,
        radius
      );
      grad.addColorStop(0, AGM.utils.rgba(s.color, alpha));
      grad.addColorStop(1, AGM.utils.rgba(s.color, 0));
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(circle.x, circle.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Each circle updates on its own independent timer (see updateState),
  // but the frame itself is still assembled and painted once per tick —
  // requestAnimationFrame drives smooth, GPU-friendly repaints rather than
  // per-circle timers/intervals fighting each other.
  function loop() {
    if (AGM.state.circles && AGM.state.circles.length > 0) {
      AGM.canvasView.repaint();
    }
    requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(loop);
  }

  return { sync, drawFrame, start };
})();
