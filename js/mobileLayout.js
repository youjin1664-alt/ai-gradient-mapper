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

  function init() {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;
    moveResetButton();
    buildControls();
  }

  // Relocates (does not clone) the existing desktop reset button onto the
  // photo card — appendChild on an already-attached node moves it and keeps
  // its existing click listener from main.js intact. Appended to
  // .pill-stage-wrapper (not #canvasStage, which is nested inside the
  // circularly clip-path'd #canvasWrapper) so the button floating above the
  // circle never gets clipped along with it.
  function moveResetButton() {
    const resetBtn = document.getElementById("resetBtn");
    const stage = document.querySelector(".pill-stage-wrapper");
    if (resetBtn && stage) stage.appendChild(resetBtn);
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

  // Placeholder only — no click behavior yet, per spec (upload/export flow
  // for mobile is a future step).
  function buildNextButton() {
    const btn = document.createElement("button");
    btn.className = "btn mobile-next-btn";
    btn.type = "button";
    btn.textContent = "Next";
    return btn;
  }

  function formatValue(v, unit) {
    return `${Math.round(v)}${unit}`;
  }

  return { init };
})();
