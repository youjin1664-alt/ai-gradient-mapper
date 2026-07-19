/* ==========================================================================
   canvasView.js — owns the single visible pill-preview <canvas>, fixed at
   CONFIG.FRAME_WIDTH x CONFIG.FRAME_HEIGHT. Composites the render in this
   layer order every repaint:

     1. grayscale photo (cached bitmap, respects the pill/stadium clip)
     2. live-only mask paint indicator (never exported)
     3. mask-gated gradient circles (circleEngine, unchanged)
     4. pill frame rim

   exporter.js reuses compositeLayers() so the exported PNG is pixel-for-
   pixel the same stack, minus the live-only mask indicator.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.canvasView = (function () {
  const { state, circleEngine, utils, CONFIG } = AGM;

  const RIM_WIDTH = 3;

  let canvas, ctx, wrapper, stage;
  let circlesLayer, circlesLayerCtx;
  let imageLogoBitmap = null;

  const scheduleRegenerate = utils.rafThrottle(() => regenerate());

  function init() {
    canvas = document.getElementById("artCanvas");
    ctx = canvas.getContext("2d");
    wrapper = document.getElementById("canvasWrapper");
    stage = document.getElementById("canvasStage");

    canvas.width = CONFIG.FRAME_WIDTH;
    canvas.height = CONFIG.FRAME_HEIGHT;

    // circleEngine.paintCircles() always clears its target context first —
    // fine when it owned the whole canvas, but it would wipe out the photo
    // layer painted just before it in compositeLayers(). Giving it a
    // dedicated offscreen target keeps paintCircles() itself untouched.
    circlesLayer = document.createElement("canvas");
    circlesLayer.width = CONFIG.FRAME_WIDTH;
    circlesLayer.height = CONFIG.FRAME_HEIGHT;
    circlesLayerCtx = circlesLayer.getContext("2d");

    loadBitmap("images/image logo.svg", (bmp) => {
      imageLogoBitmap = bmp;
      repaint();
    });

    applyFitScale();
    repaint();

    window.addEventListener("resize", utils.debounce(applyFitScale, 150));
  }

  /** Called after a new image finishes cover-fit cropping. */
  function setImage(photoCanvas) {
    state.photoCanvas = photoCanvas;
    stage.classList.add("has-image");
    regenerate();
  }

  function clearImage() {
    state.photoCanvas = null;
    stage.classList.remove("has-image");
    if (AGM.maskPainter) AGM.maskPainter.clearMask();
    state.baseCircles = [];
    state.circles = [];
    if (AGM.circleAnimator) AGM.circleAnimator.sync(state.circles);
    repaint();
  }

  /** Stage 1+2+3 — full rebuild. Use when the image, mask, or geometry
   *  settings (circle size/density/overlap/random size/random position)
   *  change. */
  function regenerate() {
    if (!state.hasImage) return;
    const maskData = AGM.maskPainter ? AGM.maskPainter.getMaskImageData() : null;
    state.baseCircles = circleEngine.sampleGrid(
      state.sourceImageData,
      CONFIG.FRAME_WIDTH,
      CONFIG.FRAME_HEIGHT,
      state.settings,
      maskData
    );
    recolor();
  }

  /** Stage 2+3 — re-resolve palette colors and repaint. Use on palette edits. */
  function recolor() {
    if (!state.hasImage) {
      repaint();
      return;
    }
    state.circles = circleEngine.colorizeCircles(state.baseCircles, state.palette, state.settings.colorMix);
    if (AGM.circleAnimator) AGM.circleAnimator.sync(state.circles);
    repaint();
  }

  /** Stage 3 — cheap repaint. Use on edge-softness changes, and as the
   *  final step of regenerate()/recolor(). */
  function repaint() {
    compositeLayers(ctx, CONFIG.FRAME_WIDTH, CONFIG.FRAME_HEIGHT, { showMaskIndicator: true });
  }

  /** Draws the full layered composite into any 2D context at (width,height).
   *  Shared by the live canvas (with the live mask indicator) and the
   *  exporter (without it), so exports always match what's on screen. */
  function compositeLayers(targetCtx, width, height, { showMaskIndicator }) {
    targetCtx.clearRect(0, 0, width, height);

    targetCtx.save();
    pillPath(targetCtx, width, height, -RIM_WIDTH / 2);
    targetCtx.clip();

    drawPhotoLayer(targetCtx, width, height);

    if (showMaskIndicator && AGM.maskPainter && AGM.maskPainter.isPointerDown()) {
      targetCtx.save();
      targetCtx.globalAlpha = 0.28;
      targetCtx.drawImage(AGM.maskPainter.getMaskCanvas(), 0, 0, width, height);
      targetCtx.restore();
    }

    if (state.hasImage) {
      // Rendered onto a dedicated offscreen layer (drawFrame clears its
      // target first) then composited on top, so the photo layer just
      // drawn above survives untouched. circleAnimator owns the live
      // per-circle color/twinkle animation; circleEngine itself (circle
      // packing, masking) is untouched.
      AGM.circleAnimator.drawFrame(circlesLayerCtx, width, height, state.settings.edgeSoftness);
      targetCtx.drawImage(circlesLayer, 0, 0, width, height);
    }

    targetCtx.restore();

    drawFrameChrome(targetCtx, width, height);
  }

  function drawPhotoLayer(targetCtx, width, height) {
    if (state.photoCanvas) {
      targetCtx.drawImage(state.photoCanvas, 0, 0, width, height);
    } else {
      // Briefly shown only before the auto-loaded default demo image
      // (see main.js) finishes fetching/decoding on first page load.
      targetCtx.fillStyle = "#141414";
      targetCtx.fillRect(0, 0, width, height);
    }
  }

  function drawFrameChrome(targetCtx, width, height) {
    targetCtx.save();
    pillPath(targetCtx, width, height, -RIM_WIDTH / 2);
    targetCtx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    targetCtx.lineWidth = RIM_WIDTH;
    targetCtx.stroke();
    targetCtx.restore();

    // Stamped on any working photo — including the auto-loaded default
    // demo image (main.js loads it through the exact same pipeline as a
    // real upload), so behavior is identical before and after the user
    // swaps in their own photo.
    if (state.hasImage) drawCaption(targetCtx, width, height);
  }

  function drawCaption(targetCtx, width, height) {
    if (!imageLogoBitmap) return;
    const logoW = width * 0.2;
    const logoH = logoW * (imageLogoBitmap.height / imageLogoBitmap.width);
    const marginBottom = height * 0.043;
    const x = (width - logoW) / 2;
    const y = height - marginBottom - logoH;
    targetCtx.drawImage(imageLogoBitmap, x, y, logoW, logoH);
  }

  // True "stadium"/pill shape — straight top/bottom edges with fully
  // semicircular end caps (radius = height/2), matching the Figma layer
  // (a rectangle with corner-radius forced far past half its height,
  // rather than a mathematical ellipse). `inset` shrinks the shape
  // symmetrically on all sides (used to keep the rim stroke fully inside
  // the canvas bounds).
  function pillPath(targetCtx, width, height, inset) {
    const shrink = -(inset || 0);
    const x = shrink;
    const y = shrink;
    const w = width - shrink * 2;
    const h = height - shrink * 2;
    const r = h / 2;
    const cxLeft = x + r;
    const cxRight = x + w - r;
    const cy = y + r;

    targetCtx.beginPath();
    targetCtx.moveTo(cxLeft, y);
    targetCtx.lineTo(cxRight, y);
    targetCtx.arc(cxRight, cy, r, -Math.PI / 2, Math.PI / 2, false);
    targetCtx.lineTo(cxLeft, y + h);
    targetCtx.arc(cxLeft, cy, r, Math.PI / 2, -Math.PI / 2, false);
    targetCtx.closePath();
  }

  // Loads an image (raster or SVG) and hands back the decoded <img> once
  // ready — cached once by the caller, reused every repaint/export via
  // drawImage without re-fetching or re-decoding.
  function loadBitmap(src, onReady) {
    const img = new Image();
    img.onload = () => onReady(img);
    img.src = src;
  }

  // The pill always CSS-scales to fit its container — there is no manual
  // zoom mode. Internal pixel resolution stays fixed at FRAME_WIDTH/HEIGHT.
  function applyFitScale() {
    const padding = 0;
    const availW = Math.max(50, wrapper.clientWidth - padding);
    const availH = Math.max(50, wrapper.clientHeight - padding);
    const scale = utils.clamp(
      Math.min(availW / canvas.width, availH / canvas.height),
      CONFIG.MIN_ZOOM,
      CONFIG.MAX_ZOOM
    );
    canvas.style.width = `${Math.round(canvas.width * scale)}px`;
    canvas.style.height = `${Math.round(canvas.height * scale)}px`;
  }

  function getCanvas() {
    return canvas;
  }

  return {
    init,
    setImage,
    clearImage,
    regenerate,
    recolor,
    repaint,
    scheduleRegenerate,
    compositeLayers,
    applyFitScale,
    getCanvas,
  };
})();
