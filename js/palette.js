/* ==========================================================================
   palette.js — palette editor UI: color chips (picker + hex), add/delete/
   reset. Any palette change triggers a cheap "recolor" pass (stage 2+3
   only — circle positions/radii are untouched).
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.palette = (function () {
  const { state, utils, canvasView } = AGM;

  let gridEl, addBtn, deleteBtn, resetBtn;

  function init() {
    gridEl = document.getElementById("paletteGrid");
    addBtn = document.getElementById("addColorBtn");
    deleteBtn = document.getElementById("deleteColorBtn");
    resetBtn = document.getElementById("resetPaletteBtn");

    addBtn.addEventListener("click", addColor);
    deleteBtn.addEventListener("click", deleteSelectedColor);
    resetBtn.addEventListener("click", resetPalette);

    render();
  }

  function render() {
    gridEl.innerHTML = "";
    state.palette.forEach((color, index) => {
      gridEl.appendChild(buildChip(color, index));
    });
    updateDeleteButtonState();
  }

  function buildChip(color, index) {
    const chip = document.createElement("div");
    chip.className = "color-chip" + (index === state.selectedPaletteIndex ? " is-selected" : "");
    chip.title = color.name || "";

    const swatch = document.createElement("input");
    swatch.type = "color";
    swatch.className = "color-chip__swatch";
    swatch.value = utils.isValidHex(color.hex) ? color.hex : "#000000";

    const hexInput = document.createElement("input");
    hexInput.type = "text";
    hexInput.className = "color-chip__hex";
    hexInput.value = color.hex.toUpperCase();
    hexInput.maxLength = 7;
    hexInput.spellcheck = false;

    // Chrome/Firefox fire "input" continuously while the picker is open
    // (live preview) and "change" once on commit. Safari only ever fires
    // "change" for <input type="color"> — listen to both so the pick is
    // always applied, and guard against double-processing the same value.
    const applySwatchValue = () => {
      if (swatch.value.toUpperCase() === state.palette[index].hex.toUpperCase()) return;
      updateColor(index, swatch.value);
      hexInput.value = swatch.value.toUpperCase();
    };
    swatch.addEventListener("input", applySwatchValue);
    swatch.addEventListener("change", applySwatchValue);

    hexInput.addEventListener("change", () => {
      let val = hexInput.value.trim();
      if (!val.startsWith("#")) val = `#${val}`;
      if (utils.isValidHex(val)) {
        updateColor(index, val);
        swatch.value = val;
        hexInput.value = val.toUpperCase();
      } else {
        // Revert invalid input rather than silently accepting a bad value.
        hexInput.value = state.palette[index].hex.toUpperCase();
      }
    });

    chip.addEventListener("click", () => selectChip(index));

    chip.appendChild(swatch);
    chip.appendChild(hexInput);
    return chip;
  }

  function selectChip(index) {
    state.selectedPaletteIndex = index;
    Array.from(gridEl.children).forEach((chip, i) => {
      chip.classList.toggle("is-selected", i === index);
    });
  }

  function updateColor(index, hex) {
    state.palette[index].hex = hex.toUpperCase();
    canvasView.recolor();
  }

  function addColor() {
    const newColor = { name: "Custom", hex: "#CCCCCC" };
    const insertAt = utils.clamp(state.selectedPaletteIndex + 1, 0, state.palette.length);
    state.palette.splice(insertAt, 0, newColor);
    state.selectedPaletteIndex = insertAt;
    render();
    canvasView.recolor();
  }

  function deleteSelectedColor() {
    if (state.palette.length <= 1) return; // keep at least one color
    const index = utils.clamp(state.selectedPaletteIndex, 0, state.palette.length - 1);
    state.palette.splice(index, 1);
    state.selectedPaletteIndex = utils.clamp(index, 0, state.palette.length - 1);
    render();
    canvasView.recolor();
  }

  function resetPalette() {
    state.palette = AGM.DEFAULT_PALETTE.map((c) => ({ ...c }));
    state.selectedPaletteIndex = 0;
    render();
    canvasView.recolor();
  }

  function updateDeleteButtonState() {
    deleteBtn.disabled = state.palette.length <= 1;
  }

  return { init, render };
})();
