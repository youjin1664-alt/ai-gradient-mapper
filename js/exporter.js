/* ==========================================================================
   exporter.js — bakes the full on-screen composite (pill frame, grayscale
   photo, mask-gated circles, Logo/footer caption) into a single PNG.
   Reuses canvasView.compositeLayers() so the export is pixel-for-pixel what
   the user sees, minus the live-only mask paint indicator.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.exporter = (function () {
  const { state, canvasView, CONFIG, utils } = AGM;

  function exportPNG() {
    if (!state.hasImage) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = CONFIG.FRAME_WIDTH;
    offscreen.height = CONFIG.FRAME_HEIGHT;
    const ctx = offscreen.getContext("2d");

    canvasView.compositeLayers(ctx, CONFIG.FRAME_WIDTH, CONFIG.FRAME_HEIGHT, {
      showMaskIndicator: false,
    });

    // toDataURL() is synchronous (unlike toBlob()'s async callback), so
    // everything up to and including the download below runs within the
    // click handler's original call stack — some browsers (Safari in
    // particular) silently drop downloads triggered from an async
    // callback. dataURLToBlob() then converts that synchronously into a
    // real Blob for a blob: URL, which Safari's `download` attribute
    // honors far more reliably than a raw data: URL (Safari tends to just
    // navigate to/display those instead of downloading them).
    const dataUrl = offscreen.toDataURL("image/png");
    const blob = utils.dataURLToBlob(dataUrl);
    utils.downloadBlob(blob, "ai-gradient-mapper.png");
  }

  return { exportPNG };
})();
