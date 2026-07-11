/* ==========================================================================
   utils.js — small shared helpers: math, color conversion, seeded RNG.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.utils = (function () {

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }

  // Deterministic PRNG (mulberry32) so jitter is stable between repaints
  // that don't change the settings driving it.
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(m[1], 16),
      g: parseInt(m[2], 16),
      b: parseInt(m[3], 16),
    };
  }

  function rgbToHex(r, g, b) {
    const toHex = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  function isValidHex(hex) {
    return /^#?[a-f\d]{6}$/i.test(hex.trim());
  }

  function rgba(rgb, alpha) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
  }

  // Squared Euclidean distance in RGB space — cheap and sufficient for
  // nearest-palette-color matching at interactive speed.
  function colorDistSq(a, b) {
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    return dr * dr + dg * dg + db * db;
  }

  function nearestColor(rgb, paletteRgbList) {
    let best = paletteRgbList[0];
    let bestDist = Infinity;
    for (let i = 0; i < paletteRgbList.length; i++) {
      const d = colorDistSq(rgb, paletteRgbList[i]);
      if (d < bestDist) {
        bestDist = d;
        best = paletteRgbList[i];
      }
    }
    return best;
  }

  // Palette colors ordered closest-to-farthest from `rgb`. Used to build a
  // "candidate pool" for color-mixing: the nearest match plus its closest
  // neighbors, so mixed colors still relate loosely to the sampled pixel.
  function sortedByDistance(rgb, paletteRgbList) {
    return paletteRgbList
      .map((c) => ({ c, d: colorDistSq(rgb, c) }))
      .sort((a, b) => a.d - b.d)
      .map((entry) => entry.c);
  }

  function debounce(fn, wait) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Coalesces repeated calls into a single invocation per animation frame.
  function rafThrottle(fn) {
    let scheduled = false;
    return function (...args) {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        fn.apply(this, args);
      });
    };
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    clamp,
    lerp,
    makeRng,
    hexToRgb,
    rgbToHex,
    isValidHex,
    rgba,
    colorDistSq,
    nearestColor,
    sortedByDistance,
    debounce,
    rafThrottle,
    downloadBlob,
  };
})();
