/* ==========================================================================
   imageLoader.js — turns an uploaded file into sampleable ImageData.
   Downscales large images to CONFIG.MAX_IMAGE_DIM on the longest edge so
   sampling/rendering stays fast regardless of the original resolution.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.imageLoader = (function () {
  const { CONFIG } = AGM;

  function loadFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
        reject(new Error("Please upload a PNG, JPG or WEBP image."));
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        try {
          const { width, height } = fitDimensions(img.naturalWidth, img.naturalHeight);

          const offscreen = document.createElement("canvas");
          offscreen.width = width;
          offscreen.height = height;
          const ctx = offscreen.getContext("2d", { willReadFrequently: true });
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const imageData = ctx.getImageData(0, 0, width, height);
          resolve({ imageData, width, height, fileName: file.name });
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read this image file."));
      };

      img.src = url;
    });
  }

  function fitDimensions(w, h) {
    const maxDim = CONFIG.MAX_IMAGE_DIM;
    const longest = Math.max(w, h);
    if (longest <= maxDim) return { width: w, height: h };
    const scale = maxDim / longest;
    return {
      width: Math.max(1, Math.round(w * scale)),
      height: Math.max(1, Math.round(h * scale)),
    };
  }

  return { loadFile };
})();
