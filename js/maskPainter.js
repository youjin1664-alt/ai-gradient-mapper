/* ==========================================================================
   maskPainter.js — circular brush painting that builds the generation mask.
   Circles are only ever generated where this mask has been painted (see
   circleEngine.sampleGrid's optional maskData parameter). Owns a private,
   never-in-DOM offscreen canvas; only its alpha channel matters.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.maskPainter = (function () {
  const { CONFIG, canvasView } = AGM;

  let maskCanvas, maskCtx;
  const brushSize = CONFIG.BRUSH_DEFAULT;
  let pointerDown = false;
  let lastX = 0;
  let lastY = 0;

  function init() {
    maskCanvas = document.createElement("canvas");
    maskCanvas.width = CONFIG.FRAME_WIDTH;
    maskCanvas.height = CONFIG.FRAME_HEIGHT;
    maskCtx = maskCanvas.getContext("2d");

    const artCanvas = canvasView.getCanvas();
    artCanvas.style.touchAction = "none";
    artCanvas.addEventListener("pointerdown", onPointerDown);
    artCanvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function toCanvasPoint(e) {
    const artCanvas = canvasView.getCanvas();
    const rect = artCanvas.getBoundingClientRect();
    // Scale against the *logical* FRAME_WIDTH/HEIGHT, not artCanvas.width/
    // height — canvasView now sizes that pixel buffer up by the device
    // pixel ratio for sharper rendering, but maskCanvas (like every other
    // draw call in this app) is still addressed in logical 0..FRAME_WIDTH
    // coordinates.
    const scaleX = CONFIG.FRAME_WIDTH / rect.width;
    const scaleY = CONFIG.FRAME_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function onPointerDown(e) {
    if (!AGM.state.hasImage) return;
    e.preventDefault();
    pointerDown = true;
    const p = toCanvasPoint(e);
    lastX = p.x;
    lastY = p.y;

    maskCtx.fillStyle = "#fff";
    maskCtx.beginPath();
    maskCtx.arc(p.x, p.y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();

    canvasView.scheduleRegenerate();
  }

  function onPointerMove(e) {
    if (!pointerDown) return;
    e.preventDefault();
    const p = toCanvasPoint(e);

    // A round-capped/joined stroke from the last point already paints the
    // equivalent of a filled circle at the new point, so no separate arc()
    // fill is needed here.
    maskCtx.strokeStyle = "#fff";
    maskCtx.lineWidth = brushSize;
    maskCtx.lineCap = "round";
    maskCtx.lineJoin = "round";
    maskCtx.beginPath();
    maskCtx.moveTo(lastX, lastY);
    maskCtx.lineTo(p.x, p.y);
    maskCtx.stroke();

    lastX = p.x;
    lastY = p.y;

    canvasView.scheduleRegenerate();
  }

  function onPointerUp() {
    if (!pointerDown) return;
    pointerDown = false;
    // Force one untouched regenerate to catch the final segment (the
    // throttled version may have been mid-flight when painting stopped).
    canvasView.regenerate();
  }

  function isPointerDown() {
    return pointerDown;
  }

  function getMaskImageData() {
    return maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  }

  function getMaskCanvas() {
    return maskCanvas;
  }

  function clearMask() {
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  }

  return {
    init,
    isPointerDown,
    getMaskImageData,
    getMaskCanvas,
    clearMask,
  };
})();
