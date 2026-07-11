/* ==========================================================================
   exporter.js — PNG, transparent PNG and SVG export.
   Re-renders the cached circle list (state.circles) at native resolution
   into an offscreen canvas so exports always match the live preview,
   independent of the current on-screen zoom level.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.exporter = (function () {
  const { state, circleEngine, utils } = AGM;

  function exportPNG() {
    exportRaster(true, "ai-gradient-mapper.png");
  }

  function exportTransparentPNG() {
    exportRaster(false, "ai-gradient-mapper-transparent.png");
  }

  function exportRaster(withBackground, filename) {
    if (!state.hasImage) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = state.sourceWidth;
    offscreen.height = state.sourceHeight;
    const ctx = offscreen.getContext("2d");

    circleEngine.paintCircles(
      ctx,
      state.circles,
      state.sourceWidth,
      state.sourceHeight,
      state.settings.opacity,
      state.settings.edgeSoftness,
      withBackground
    );

    offscreen.toBlob((blob) => {
      if (blob) utils.downloadBlob(blob, filename);
    }, "image/png");
  }

  function exportSVG() {
    if (!state.hasImage) return;

    const width = state.sourceWidth;
    const height = state.sourceHeight;
    const alpha = utils.clamp(state.settings.opacity / 100, 0.1, 1);
    const softness = utils.clamp(state.settings.edgeSoftness, 0, 100);
    const useBlur = softness > 2;
    // Blur radius approximated from the average circle radius so soft
    // edges scale sensibly with circle size.
    const avgRadius =
      state.circles.reduce((sum, c) => sum + c.radius, 0) / Math.max(1, state.circles.length);
    const blurStdDev = (softness / 100) * avgRadius * 0.35;

    const parts = [];
    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    );
    parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`);

    if (useBlur) {
      parts.push(
        `<defs><filter id="softEdge" x="-50%" y="-50%" width="200%" height="200%">` +
          `<feGaussianBlur stdDeviation="${blurStdDev.toFixed(2)}"/></filter></defs>`
      );
      parts.push(`<g filter="url(#softEdge)">`);
    } else {
      parts.push(`<g>`);
    }

    for (let i = 0; i < state.circles.length; i++) {
      const c = state.circles[i];
      parts.push(
        `<circle cx="${round2(c.x)}" cy="${round2(c.y)}" r="${round2(c.radius)}" ` +
          `fill="rgb(${c.color.r},${c.color.g},${c.color.b})" fill-opacity="${alpha.toFixed(2)}"/>`
      );
    }

    parts.push(`</g>`);
    parts.push(`</svg>`);

    const blob = new Blob([parts.join("\n")], { type: "image/svg+xml" });
    utils.downloadBlob(blob, "ai-gradient-mapper.svg");
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  return { exportPNG, exportTransparentPNG, exportSVG };
})();
