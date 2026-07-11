/* ==========================================================================
   main.js — application entry point. Wires DOM events for upload/export/
   reset and initializes the other modules in dependency order.
   ========================================================================== */

(function () {
  const { state, imageLoader, canvasView, palette, controls, exporter } = AGM;

  function init() {
    canvasView.init();
    palette.init();
    controls.init();
    bindLeftPanel();
    bindWindowResize();
  }

  function bindLeftPanel() {
    const fileInput = document.getElementById("fileInput");
    const uploadBtn = document.getElementById("uploadBtn");
    const fileMeta = document.getElementById("fileMeta");
    const resetBtn = document.getElementById("resetBtn");

    uploadBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;

      uploadBtn.disabled = true;
      fileMeta.textContent = "Loading…";

      try {
        const { imageData, width, height, fileName } = await imageLoader.loadFile(file);
        state.sourceImageData = imageData;
        state.sourceWidth = width;
        state.sourceHeight = height;
        state.hasImage = true;
        state.fileName = fileName;

        fileMeta.textContent = `${fileName} — ${width}×${height}`;
        canvasView.setImage(width, height);
      } catch (err) {
        fileMeta.textContent = err.message || "Could not load image.";
      } finally {
        uploadBtn.disabled = false;
        fileInput.value = "";
      }
    });

    resetBtn.addEventListener("click", () => {
      state.reset();
      controls.syncFromState();
      canvasView.clearImage();
      fileMeta.textContent = "No image loaded";
    });

    document.getElementById("exportPngBtn").addEventListener("click", () => {
      if (!guardHasImage()) return;
      exporter.exportPNG();
    });
    document.getElementById("exportTransparentBtn").addEventListener("click", () => {
      if (!guardHasImage()) return;
      exporter.exportTransparentPNG();
    });
    document.getElementById("exportSvgBtn").addEventListener("click", () => {
      if (!guardHasImage()) return;
      exporter.exportSVG();
    });
  }

  function guardHasImage() {
    if (!state.hasImage) {
      const fileMeta = document.getElementById("fileMeta");
      fileMeta.textContent = "Upload an image before exporting.";
      return false;
    }
    return true;
  }

  function bindWindowResize() {
    window.addEventListener(
      "resize",
      AGM.utils.debounce(() => {
        if (state.hasImage) canvasView.refitIfNeeded();
      }, 150)
    );
  }

  document.addEventListener("DOMContentLoaded", init);
})();
