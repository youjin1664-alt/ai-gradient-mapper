/* ==========================================================================
   canvasView.js — owns the on-screen <canvas> element: sizing at native
   resolution, zoom (a pure CSS/display concern, independent of the actual
   pixel generation), and orchestrating the circleEngine pipeline stages.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.canvasView = (function () {
  const { state, circleEngine, utils, CONFIG } = AGM;

  let canvas, ctx, wrapper, stage, emptyEl, zoomReadout, zoomButtons;
  let lastZoomWasFit = true;

  function init() {
    canvas = document.getElementById("artCanvas");
    ctx = canvas.getContext("2d");
    wrapper = document.getElementById("canvasWrapper");
    stage = document.getElementById("canvasStage");
    emptyEl = document.getElementById("canvasEmpty");
    zoomReadout = document.getElementById("zoomReadout");
    zoomButtons = Array.from(document.querySelectorAll(".zoom-btn"));

    zoomButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const z = btn.dataset.zoom;
        setZoom(z === "fit" ? "fit" : parseFloat(z));
      });
    });

    // Blank canvas placeholder before any image is loaded.
    canvas.width = 900;
    canvas.height = 900;
    paintPlaceholder();
  }

  function paintPlaceholder() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  /** Called after a new image finishes loading. Sizes the canvas to the
   *  image's native (downscaled) resolution and runs the full pipeline. */
  function setImage(width, height) {
    canvas.width = width;
    canvas.height = height;
    stage.classList.add("has-image");
    setZoom("fit");
    regenerate();
  }

  function clearImage() {
    canvas.width = 900;
    canvas.height = 900;
    stage.classList.remove("has-image");
    paintPlaceholder();
    setZoom(1);
  }

  /** Stage 1+2+3 — full rebuild. Use when the image, geometry settings
   *  (circle size/density/overlap/random size/random position), or the
   *  circle count itself changes. */
  function regenerate() {
    if (!state.hasImage) return;
    state.baseCircles = circleEngine.sampleGrid(
      state.sourceImageData,
      state.sourceWidth,
      state.sourceHeight,
      state.settings
    );
    recolor();
  }

  /** Stage 2+3 — re-resolve palette colors and repaint. Use on palette edits. */
  function recolor() {
    if (!state.hasImage) return;
    state.circles = circleEngine.colorizeCircles(state.baseCircles, state.palette, state.settings.colorMix);
    repaint();
  }

  /** Stage 3 only — cheap repaint. Use on opacity/edge-softness changes. */
  function repaint() {
    if (!state.hasImage) {
      paintPlaceholder();
      return;
    }
    circleEngine.paintCircles(
      ctx,
      state.circles,
      state.sourceWidth,
      state.sourceHeight,
      state.settings.opacity,
      state.settings.edgeSoftness,
      true
    );
  }

  function setZoom(value) {
    lastZoomWasFit = value === "fit";
    let zoom = value;
    if (value === "fit") {
      zoom = computeFitZoom();
    }
    zoom = utils.clamp(zoom, CONFIG.MIN_ZOOM, CONFIG.MAX_ZOOM);
    state.zoom = zoom;

    canvas.style.width = `${Math.round(canvas.width * zoom)}px`;
    canvas.style.height = `${Math.round(canvas.height * zoom)}px`;

    zoomReadout.textContent = `${Math.round(zoom * 100)}%`;
    zoomButtons.forEach((btn) => {
      const isFit = value === "fit" && btn.dataset.zoom === "fit";
      const isExact = typeof value === "number" && parseFloat(btn.dataset.zoom) === value;
      btn.classList.toggle("is-active", isFit || isExact);
    });
  }

  function computeFitZoom() {
    const padding = 48;
    const availW = Math.max(50, wrapper.clientWidth - padding);
    const availH = Math.max(50, wrapper.clientHeight - padding);
    const scale = Math.min(availW / canvas.width, availH / canvas.height);
    return utils.clamp(scale, 0.05, CONFIG.MAX_ZOOM);
  }

  function getCanvas() {
    return canvas;
  }

  function refitIfNeeded() {
    if (lastZoomWasFit) setZoom("fit");
  }

  return {
    init,
    setImage,
    clearImage,
    regenerate,
    recolor,
    repaint,
    setZoom,
    getCanvas,
    refitIfNeeded,
  };
})();
