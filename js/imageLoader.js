/* ==========================================================================
   imageLoader.js — turns an uploaded file into sampleable ImageData that
   exactly fills the fixed pill frame (CONFIG.FRAME_WIDTH x FRAME_HEIGHT),
   using object-fit:cover semantics (scaled + center-cropped, no distortion,
   no letterboxing), then force-converts it to grayscale.
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
      loadFromURL(url, file.name)
        .then(resolve, reject)
        .finally(() => URL.revokeObjectURL(url));
    });
  }

  // Same cover-fit-crop + grayscale pipeline as loadFile(), but starting
  // from an image URL instead of a File — used to auto-load the built-in
  // default/demo image exactly as if the user had uploaded it themselves.
  function loadFromURL(src, fileName) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = coverFitCrop(img, CONFIG.FRAME_WIDTH, CONFIG.FRAME_HEIGHT);
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          toGrayscale(imageData);
          ctx.putImageData(imageData, 0, 0);

          resolve({
            imageData,
            photoCanvas: canvas,
            width: canvas.width,
            height: canvas.height,
            fileName: fileName || src,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error("Could not load image: " + src));
      img.src = src;
    });
  }

  // Scales + center-crops `img` to exactly fill a FW x FH canvas with no
  // distortion and no empty space — the canvas equivalent of CSS
  // `object-fit: cover`.
  function coverFitCrop(img, frameWidth, frameHeight) {
    const targetRatio = frameWidth / frameHeight;
    const srcRatio = img.naturalWidth / img.naturalHeight;

    let sx, sy, sw, sh;
    if (srcRatio > targetRatio) {
      // Source is wider than the frame — crop the left/right edges.
      sh = img.naturalHeight;
      sw = sh * targetRatio;
      sx = (img.naturalWidth - sw) / 2;
      sy = 0;
    } else {
      // Source is taller/narrower than the frame — crop the top/bottom edges.
      sw = img.naturalWidth;
      sh = sw / targetRatio;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    }

    const canvas = document.createElement("canvas");
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, frameWidth, frameHeight);
    return canvas;
  }

  // In-place Rec.601 luminance desaturation. Alpha is left untouched.
  function toGrayscale(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = lum;
    }
  }

  return { loadFile, loadFromURL };
})();
