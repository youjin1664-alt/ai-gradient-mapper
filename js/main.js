/* ==========================================================================
   main.js — application entry point. Wires DOM events for upload/export/
   reset and initializes the other modules in dependency order.
   ========================================================================== */

(function () {
  const { state, imageLoader, canvasView, controls, exporter, maskPainter } = AGM;

  const DEFAULT_IMAGE_SRC = "images/chris-turgeon-AUmq5VsgL3g-unsplash.jpg";
  const DEFAULT_IMAGE_NAME = "chris-turgeon-AUmq5VsgL3g-unsplash.jpg";

  let fileMeta, uploadBtn;

  function init() {
    canvasView.init();
    maskPainter.init();
    controls.init();
    if (AGM.customCursor) AGM.customCursor.init();
    bindLeftPanel();
    loadDefaultImage();
  }

  function bindLeftPanel() {
    const fileInput = document.getElementById("fileInput");
    uploadBtn = document.getElementById("uploadBtn");
    fileMeta = document.getElementById("fileMeta");
    const resetBtn = document.getElementById("resetBtn");
    const exportBtn = document.getElementById("exportBtn");

    uploadBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;

      uploadBtn.disabled = true;
      fileMeta.textContent = "Loading…";

      try {
        const result = await imageLoader.loadFile(file);
        applyLoadedImage(result);
      } catch (err) {
        fileMeta.textContent = err.message || "Could not load image.";
      } finally {
        uploadBtn.disabled = false;
        fileInput.value = "";
      }
    });

    // Reset now just clears the painted mask (what "Clear Mask" used to
    // do) — it no longer touches the current photo or sliders. Starting
    // over with a different photo is done by uploading a new one.
    resetBtn.addEventListener("click", () => {
      maskPainter.clearMask();
      canvasView.regenerate();
    });

    exportBtn.addEventListener("click", () => {
      if (!guardHasImage()) return;
      try {
        exporter.exportPNG();
        fileMeta.textContent = "Downloaded ai-gradient-mapper.png";
        setTimeout(() => {
          if (fileMeta.textContent.startsWith("Downloaded")) fileMeta.textContent = state.fileName;
        }, 2500);
      } catch (err) {
        fileMeta.textContent = "Export failed: " + (err.message || "unknown error");
      }
    });
  }

  /** Applies an imageLoader result (from a real upload or the auto-loaded
   *  default) to state and the canvas — the two paths behave identically
   *  from this point on. */
  function applyLoadedImage({ imageData, photoCanvas, fileName }) {
    state.sourceImageData = imageData;
    state.hasImage = true;
    state.fileName = fileName;

    fileMeta.textContent = fileName;
    canvasView.setImage(photoCanvas);
  }

  // Loads the built-in demo image through the exact same cover-fit-crop +
  // grayscale pipeline as a real upload, and marks it as the working photo
  // (hasImage = true) so the mask/circle tools are immediately usable —
  // not just a static preview.
  function loadDefaultImage() {
    if (fileMeta) fileMeta.textContent = "Loading…";
    imageLoader
      .loadFromURL(DEFAULT_IMAGE_SRC, DEFAULT_IMAGE_NAME)
      .then(applyLoadedImage)
      .catch((err) => {
        if (fileMeta) fileMeta.textContent = err.message || "Could not load default image.";
      });
  }

  function guardHasImage() {
    if (!state.hasImage) {
      fileMeta.textContent = "Upload an image before exporting.";
      return false;
    }
    return true;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
