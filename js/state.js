/* ==========================================================================
   state.js — single source of truth for the app's mutable state.
   Other modules read/write through this object rather than passing
   long parameter lists around.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.state = {
  // Grayscale, cover-fit-cropped ImageData at exactly CONFIG.FRAME_WIDTH x
  // CONFIG.FRAME_HEIGHT — sampled for color by circleEngine.
  sourceImageData: null, // ImageData
  // Cached <canvas> bitmap of the same grayscale image, used for fast
  // drawImage-based compositing (ctx.clip() has no effect on putImageData).
  photoCanvas: null,
  hasImage: false,
  fileName: "",

  // User-editable palette: [{ name, hex }]
  palette: AGM.DEFAULT_PALETTE.map((c) => ({ ...c })),
  selectedPaletteIndex: 0,

  // Render control values (see CONFIG.CONTROL_DEFS for bounds).
  settings: { ...AGM.DEFAULT_SETTINGS },

  // Generated render units. Split so palette-only changes can skip the
  // expensive sampling step (see circleEngine.js).
  baseCircles: [], // [{ x, y, radius, srgb:{r,g,b} }] — depends on image+mask+geometry settings
  circles: [], // baseCircles + { color:{r,g,b} } resolved against current palette
};

AGM.state.reset = function () {
  this.sourceImageData = null;
  this.photoCanvas = null;
  this.hasImage = false;
  this.fileName = "";
  this.settings = { ...AGM.DEFAULT_SETTINGS };
  this.baseCircles = [];
  this.circles = [];
};
