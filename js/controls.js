/* ==========================================================================
   controls.js — builds the bottom "Render Controls" slider panel from
   CONFIG.CONTROL_DEFS and wires live updates. Slider changes are routed to
   one of three pipeline stages — a full regenerate (geometry settings), a
   recolor (palette-related settings like colorMix), or a cheap repaint
   (opacity/edge softness) — each coalesced to one call per animation frame
   so fast dragging stays smooth.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.controls = (function () {
  const { state, CONFIG, canvasView, utils } = AGM;

  let gridEl;
  // Regenerate is shared with maskPainter.js so a slider drag and a brush
  // stroke in the same frame collapse into a single regenerate call.
  const scheduleRegenerate = () => canvasView.scheduleRegenerate();
  const scheduleRecolor = utils.rafThrottle(() => canvasView.recolor());
  const scheduleRepaint = utils.rafThrottle(() => canvasView.repaint());

  function init() {
    gridEl = document.getElementById("controlsGrid");
    gridEl.innerHTML = "";
    CONFIG.CONTROL_DEFS.forEach((def) => gridEl.appendChild(buildControl(def)));
  }

  function buildControl(def) {
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
    input.id = `ctrl-${def.key}`;

    const requiresRegenerate = CONFIG.REGENERATE_KEYS.includes(def.key);
    const requiresRecolor = CONFIG.RECOLOR_KEYS.includes(def.key);

    input.addEventListener("input", () => {
      const num = parseFloat(input.value);
      state.settings[def.key] = num;
      value.textContent = formatValue(num, def.unit);
      if (requiresRegenerate) {
        scheduleRegenerate();
      } else if (requiresRecolor) {
        scheduleRecolor();
      } else {
        scheduleRepaint();
      }
    });

    wrap.appendChild(labelRow);
    wrap.appendChild(input);
    return wrap;
  }

  function formatValue(v, unit) {
    return `${Math.round(v)}${unit}`;
  }

  /** Resets slider DOM to match state.settings (used by the Reset action). */
  function syncFromState() {
    CONFIG.CONTROL_DEFS.forEach((def) => {
      const input = document.getElementById(`ctrl-${def.key}`);
      if (!input) return;
      input.value = state.settings[def.key];
      const valueEl = input.parentElement.querySelector(".control__value");
      if (valueEl) valueEl.textContent = formatValue(state.settings[def.key], def.unit);
    });
  }

  return { init, syncFromState };
})();
