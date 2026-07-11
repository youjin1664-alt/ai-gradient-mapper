/* ==========================================================================
   state.js — single source of truth for the app's mutable state.
   Other modules read/write through this object rather than passing
   long parameter lists around.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.state = {
  // Source image, downscaled to CONFIG.MAX_IMAGE_DIM, sampled for color.
  sourceImageData: null, // ImageData
  sourceWidth: 0,
  sourceHeight: 0,
  hasImage: false,
  fileName: "",

  // User-editable palette: [{ name, hex }]
  palette: AGM.DEFAULT_PALETTE.map((c) => ({ ...c })),
  selectedPaletteIndex: 0,

  // Render control values (see CONFIG.CONTROL_DEFS for bounds).
  settings: { ...AGM.DEFAULT_SETTINGS },

  // Generated render units. Split so palette-only or opacity/softness-only
  // changes can skip the expensive sampling step (see circleEngine.js).
  baseCircles: [], // [{ x, y, radius, srgb:{r,g,b} }] — depends on image+geometry settings
  circles: [], // baseCircles + { color:{r,g,b} } resolved against current palette

  // View state
  zoom: 1,
};

AGM.state.reset = function () {
  this.sourceImageData = null;
  this.sourceWidth = 0;
  this.sourceHeight = 0;
  this.hasImage = false;
  this.fileName = "";
  this.settings = { ...AGM.DEFAULT_SETTINGS };
  this.baseCircles = [];
  this.circles = [];
  this.zoom = 1;
};
