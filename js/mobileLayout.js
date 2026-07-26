/* ==========================================================================
   mobileLayout.js — builds the mobile-only bottom control card (4 sliders +
   placeholder "Next" button) and relocates the existing #resetBtn onto the
   photo card, for the new mobile (<=768px) design. Purely additive: reads
   CONFIG.CONTROL_DEFS and calls canvasView.scheduleRegenerate() (the same
   shared scheduler controls.js/maskPainter.js already use) but never
   modifies controls.js, canvasView.js, circleEngine.js, or maskPainter.js.
   Total no-op on desktop/tablet.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.mobileLayout = (function () {
  const { state, CONFIG, canvasView } = AGM;

  // Must mirror style.css's mobile media query exactly.
  const MOBILE_QUERY = "(max-width: 768px), (max-height: 500px) and (orientation: landscape)";

  const scheduleRegenerate = () => canvasView.scheduleRegenerate();

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function init() {
    if (!isMobile()) return;
    moveResetButton();
    buildControls();
    initOnboarding();
  }

  // Wires the onboarding overlay's upload button to the same shared
  // #fileInput main.js's bindLeftPanel() already listens on — reusing it
  // (rather than a second file input) means the existing loadFile/
  // applyLoadedImage pipeline in main.js is the only place a photo actually
  // gets decoded. This just waits for main.js's "agm:imageReady" (dispatched
  // once that pipeline finishes) to hide the overlay and reveal the tool
  // underneath. once:true since mobile has no other upload entry point
  // after this — there's nothing left to re-hide.
  function initOnboarding() {
    const overlay = document.getElementById("mobileOnboarding");
    const btn = document.getElementById("mobileOnboardingUpload");
    const fileInput = document.getElementById("fileInput");
    if (!overlay || !btn || !fileInput) return;

    btn.addEventListener("click", () => fileInput.click());
    document.addEventListener(
      "agm:imageReady",
      () => overlay.classList.add("is-hidden"),
      { once: true }
    );
  }

  // Relocates (does not clone) the existing desktop reset button onto the
  // photo card — prepend on an already-attached node moves it and keeps its
  // existing click listener from main.js intact. Prepended (not appended)
  // to .pill-stage-wrapper so it's the first child in that flex column,
  // placing it above .canvas-frame (the circular canvas card) in normal
  // document flow — see style.css's mobile .pill-stage-wrapper rule, which
  // lays this out via flex gap rather than absolute positioning.
  function moveResetButton() {
    const resetBtn = document.getElementById("resetBtn");
    const stage = document.querySelector(".pill-stage-wrapper");
    if (resetBtn && stage) stage.prepend(resetBtn);
  }

  function buildControls() {
    const host = document.getElementById("mobileControlsCard");
    if (!host) return;

    const grid = document.createElement("div");
    grid.className = "mobile-controls-grid";

    ["circleSize", "density", "overlap"].forEach((key) => {
      const def = CONFIG.CONTROL_DEFS.find((d) => d.key === key);
      if (def) grid.appendChild(buildSimpleControl(def));
    });
    grid.appendChild(buildRandomControl());

    host.appendChild(grid);
    host.appendChild(buildNextButton());
  }

  // Mirrors controls.js's buildControl() markup (.control / .control__label-row
  // / .control__label / .control__value) so it inherits the exact same slider
  // styling with no new CSS. Reimplemented rather than reused because
  // controls.js's buildControl is a private closure fn, and controls.js
  // itself must stay untouched.
  function buildSimpleControl(def) {
    const wrap = document.createElement("div");
    wrap.className = "control";

    const labelRow = document.createElement("div");
    labelRow.className = "control__label-row";

    const label = document.createElement("span");
    label.className = "control__label";
    label.textContent = def.label;

    const value = document.createElement("span");
    value.className = "control__value";
    value.textContent = formatValue(state.settings[def.key], def.unit);

    labelRow.appendChild(label);
    labelRow.appendChild(value);

    const input = document.createElement("input");
    input.type = "range";
    input.min = def.min;
    input.max = def.max;
    input.step = def.step;
    input.value = state.settings[def.key];
    input.id = `ctrl-mobile-${def.key}`;

    input.addEventListener("input", () => {
      const num = parseFloat(input.value);
      state.settings[def.key] = num;
      value.textContent = formatValue(num, def.unit);
      scheduleRegenerate();
    });

    wrap.appendChild(labelRow);
    wrap.appendChild(input);
    return wrap;
  }

  // Combined Random control — one slider drives both randomSize and
  // randomPosition to the same value. Reuses randomSize's def for
  // min/max/step (identical to randomPosition's: 0-100/step 1). The
  // initial displayed value uses randomSize's default (30) rather than
  // randomPosition's (20) since the two differ and one slider can't show
  // both — the first drag unifies them.
  function buildRandomControl() {
    const def = CONFIG.CONTROL_DEFS.find((d) => d.key === "randomSize");

    const wrap = document.createElement("div");
    wrap.className = "control";

    const labelRow = document.createElement("div");
    labelRow.className = "control__label-row";

    const label = document.createElement("span");
    label.className = "control__label";
    label.textContent = "Random";

    const value = document.createElement("span");
    value.className = "control__value";
    value.textContent = formatValue(state.settings.randomSize, def.unit);

    labelRow.appendChild(label);
    labelRow.appendChild(value);

    const input = document.createElement("input");
    input.type = "range";
    input.min = def.min;
    input.max = def.max;
    input.step = def.step;
    input.value = state.settings.randomSize;
    input.id = "ctrl-mobile-random";

    input.addEventListener("input", () => {
      const num = parseFloat(input.value);
      state.settings.randomSize = num;
      state.settings.randomPosition = num;
      value.textContent = formatValue(num, def.unit);
      scheduleRegenerate();
    });

    wrap.appendChild(labelRow);
    wrap.appendChild(input);
    return wrap;
  }

  // Click behavior (entering the export view) is wired by js/mobileExport.js
  // via this id, not here — keeps the story-image/share pipeline out of this
  // file's scope.
  function buildNextButton() {
    const btn = document.createElement("button");
    btn.id = "mobileNextBtn";
    btn.className = "btn mobile-next-btn";
    btn.type = "button";
    btn.textContent = "Next";
    return btn;
  }

  function formatValue(v, unit) {
    return `${Math.round(v)}${unit}`;
  }

  return { init, isMobile };
})();
