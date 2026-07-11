/* ==========================================================================
   circleEngine.js — the core algorithm.
   Turns sampled image pixels into "render units": colored circles.

   Pipeline (kept in three stages so slider changes only redo the work
   that's actually affected, which keeps live preview smooth):

     1. sampleGrid()   image + geometry settings -> baseCircles (x, y, radius, srgb)
     2. colorizeCircles() baseCircles + palette   -> circles (+ color)
     3. paintCircles()  circles + opacity/softness -> pixels on a canvas

   Only circle SIZE, DENSITY, OVERLAP, RANDOM SIZE and RANDOM POSITION
   require re-running stage 1. Palette edits (and COLOR MIX) only require
   stage 2. Opacity and Edge Softness only require stage 3 (a fast repaint).
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.circleEngine = (function () {
  const { utils, CONFIG } = AGM;

  /**
   * Stage 1 — sample the source image on a jittered grid and produce the
   * geometric description of every circle (position + radius + the raw
   * sampled color, before palette matching).
   */
  function sampleGrid(imageData, width, height, settings) {
    const rng = utils.makeRng(CONFIG.RNG_SEED);
    const { circleSize, density, overlap, randomSize, randomPosition } = settings;

    const spacing = computeSpacing(circleSize, density, width * height);
    const baseRadius = (circleSize / 2) * utils.lerp(0.6, 1.9, overlap / 100);

    const data = imageData.data;
    const circles = [];

    // Brick-offset grid: alternate rows are shifted half a spacing unit for
    // a more organic, less rigidly-gridded packing before jitter is added.
    let row = 0;
    for (let gy = spacing / 2; gy < height; gy += spacing, row++) {
      const rowOffset = row % 2 === 0 ? 0 : spacing / 2;
      for (let gx = spacing / 2 + rowOffset; gx < width; gx += spacing) {
        const jitterAmt = spacing * (randomPosition / 100) * 0.7;
        const px = utils.clamp(gx + (rng() * 2 - 1) * jitterAmt, 0, width - 1);
        const py = utils.clamp(gy + (rng() * 2 - 1) * jitterAmt, 0, height - 1);

        const ix = Math.round(px);
        const iy = Math.round(py);
        const idx = (iy * width + ix) * 4;
        const a = data[idx + 3];

        // Skip fully transparent source pixels so cut-out / transparent
        // PNGs don't get circles over empty regions.
        if (a < 10) continue;

        const sizeJitter = 1 + (rng() * 2 - 1) * (randomSize / 100) * 0.9;
        const radius = Math.max(0.4, baseRadius * sizeJitter);

        circles.push({
          x: px,
          y: py,
          radius,
          srgb: { r: data[idx], g: data[idx + 1], b: data[idx + 2] },
        });
      }
    }

    return circles;
  }

  // Grid spacing in px, derived from circle size + density, with a hard
  // cap on total circle count so extreme settings on large images stay smooth.
  function computeSpacing(circleSize, density, imageArea) {
    let spacing = circleSize * utils.lerp(2.4, 0.35, density / 100);
    spacing = Math.max(spacing, 1.5);

    const estimatedCount = imageArea / (spacing * spacing);
    if (estimatedCount > CONFIG.MAX_CIRCLES) {
      spacing = Math.sqrt(imageArea / CONFIG.MAX_CIRCLES);
    }
    return spacing;
  }

  /**
   * Stage 2 — resolve each circle's raw sampled color against the current
   * palette. Returns a new array (baseCircles are untouched so this can be
   * re-run cheaply whenever the palette or colorMix changes).
   *
   * `colorMix` (0-100) controls how strictly circles stick to their nearest
   * palette color: 0 = always the single closest match (clean color zones);
   * 100 = picked randomly from the whole palette (fully mixed/scattered
   * look). In between, each circle picks randomly among its N closest
   * palette colors, where N grows with colorMix — so mixing stays loosely
   * tied to the sampled pixel instead of turning into pure noise.
   */
  function colorizeCircles(baseCircles, palette, colorMix) {
    if (palette.length === 0) return baseCircles.map((c) => ({ ...c, color: { r: 0, g: 0, b: 0 } }));

    const paletteRgb = palette.map((c) => utils.hexToRgb(c.hex));
    const mix = utils.clamp(colorMix || 0, 0, 100) / 100;

    if (mix <= 0 || paletteRgb.length === 1) {
      return baseCircles.map((c) => ({
        x: c.x,
        y: c.y,
        radius: c.radius,
        srgb: c.srgb,
        color: utils.nearestColor(c.srgb, paletteRgb),
      }));
    }

    // Deterministic RNG so the mix pattern stays stable across repaints
    // that don't touch the palette or the colorMix value itself.
    const rng = utils.makeRng(CONFIG.RNG_SEED + 777);

    return baseCircles.map((c) => {
      const candidates = utils.sortedByDistance(c.srgb, paletteRgb);
      const poolSize = utils.clamp(Math.round(1 + mix * (candidates.length - 1)), 1, candidates.length);
      const pickIndex = Math.floor(rng() * poolSize);
      return {
        x: c.x,
        y: c.y,
        radius: c.radius,
        srgb: c.srgb,
        color: candidates[pickIndex],
      };
    });
  }

  /**
   * Stage 3 — paint resolved circles onto a 2D canvas context.
   * `opacity` is 10-100, `edgeSoftness` is 0-100.
   * `withBackground` fills white first (for the on-screen canvas and
   * regular PNG export); pass false for transparent exports.
   */
  function paintCircles(ctx, circles, width, height, opacity, edgeSoftness, withBackground) {
    ctx.clearRect(0, 0, width, height);

    if (withBackground) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    const alpha = utils.clamp(opacity / 100, 0.1, 1);
    const softness = utils.clamp(edgeSoftness, 0, 100);

    for (let i = 0; i < circles.length; i++) {
      paintCircle(ctx, circles[i], alpha, softness);
    }
  }

  function paintCircle(ctx, circle, alpha, softness) {
    const { x, y, radius, color } = circle;

    if (softness <= 2) {
      // Hard edge — plain filled arc, cheapest path.
      ctx.beginPath();
      ctx.fillStyle = utils.rgba(color, alpha);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Soft edge — radial gradient fading to transparent before the rim.
    const innerStop = utils.clamp(1 - softness / 100, 0, 0.98);
    const grad = ctx.createRadialGradient(x, y, Math.max(0, radius * innerStop), x, y, radius);
    grad.addColorStop(0, utils.rgba(color, alpha));
    grad.addColorStop(1, utils.rgba(color, 0));

    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  return { sampleGrid, colorizeCircles, paintCircles };
})();
