/* ==========================================================================
   config.js — static configuration & defaults
   Attaches to the shared global namespace `AGM` (no modules/bundler needed,
   so the app can be opened directly as a local file).
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.CONFIG = {
  // Longest edge (px) the source image is downscaled to before sampling.
  // Keeps circle counts and pixel reads bounded for smooth performance.
  MAX_IMAGE_DIM: 1200,

  // Hard ceiling on generated circles regardless of slider settings.
  MAX_CIRCLES: 45000,

  // Fixed RNG seed so jitter (random size/position) is stable across
  // re-renders that don't actually change the settings that use it.
  RNG_SEED: 1337,

  ZOOM_STEPS: [0.25, 0.5, 1, 2],
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 4,

  // Declarative slider definitions used to build the bottom "Render Controls"
  // panel and to validate/clamp values coming from state.
  CONTROL_DEFS: [
    { key: "circleSize", label: "Circle Size", min: 1, max: 80, step: 1, unit: "px" },
    { key: "density", label: "Density", min: 1, max: 100, step: 1, unit: "" },
    { key: "overlap", label: "Overlap", min: 0, max: 100, step: 1, unit: "" },
    { key: "opacity", label: "Opacity", min: 10, max: 100, step: 1, unit: "%" },
    { key: "randomSize", label: "Random Size", min: 0, max: 100, step: 1, unit: "" },
    { key: "randomPosition", label: "Random Position", min: 0, max: 100, step: 1, unit: "" },
    { key: "edgeSoftness", label: "Edge Softness", min: 0, max: 100, step: 1, unit: "" },
    { key: "colorMix", label: "Color Mix", min: 0, max: 100, step: 1, unit: "" },
  ],

  // Settings that require regenerating circle positions/radii (expensive).
  // Settings not in this list only require a cheap repaint.
  REGENERATE_KEYS: ["circleSize", "density", "overlap", "randomSize", "randomPosition"],

  // Settings that only require re-resolving palette colors (cheap — no
  // change to circle positions/radii).
  RECOLOR_KEYS: ["colorMix"],
};

AGM.DEFAULT_PALETTE = [
  { name: "Pink", hex: "#FFCEE8" },
  { name: "Hot Pink", hex: "#FF98ED" },
  { name: "Purple", hex: "#CE88FF" },
  { name: "Blue", hex: "#76A6FF" },
  { name: "Sky Blue", hex: "#0ED7FF" },
  { name: "Mint Blue", hex: "#4CFFF6" },
  { name: "Coral", hex: "#FF9276" },
  { name: "Orange", hex: "#FFB473" },
  { name: "Soft Yellow", hex: "#FCFFA6" },
  { name: "Lime", hex: "#B7FD7E" },
  { name: "Emerald", hex: "#00F18E" },
  { name: "Mint Green", hex: "#89FFDB" },
];

AGM.DEFAULT_SETTINGS = {
  circleSize: 18, // px, 1-80
  density: 50, // 1-100
  overlap: 50, // 0-100
  opacity: 85, // 10-100
  randomSize: 30, // 0-100
  randomPosition: 20, // 0-100
  edgeSoftness: 15, // 0-100
  colorMix: 35, // 0-100 — 0 = strict nearest-palette-color match, 100 = colors freely mixed/randomized
};
