/* ==========================================================================
   mobileExport.js — mobile-only "Next" flow: blurs the tool screen behind
   the finished circle and offers Download / Share of a 1080x1920 Instagram
   Story image (random palette background, circle-cropped artwork, "A
   Gentle Gaze, For Everything Else" caption in Pretendard, difference-
   blended white so it reads against any background color). Purely additive, same
   pattern as mobileLayout.js: reads canvasView.compositeLayers() and
   AGM.DEFAULT_PALETTE but never modifies canvasView.js or config.js.
   Total no-op on desktop/tablet.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.mobileExport = (function () {
  const { CONFIG, canvasView, utils } = AGM;

  const STORY_W = 1080;
  const STORY_H = 1920;
  const CIRCLE_D = 740;
  const CIRCLE_CY = 940;
  const CAPTION_TEXT = "A Gentle Gaze, For Everything Else";
  const CAPTION_Y = 1780;
  const CAPTION_MAX_FONT_PX = 42;
  const CAPTION_MIN_FONT_PX = 22;
  const CAPTION_MAX_WIDTH = STORY_W * 0.82;
  // Figma gives letter-spacing as -0.72px at an 18px font — kept as that
  // ratio (-4% of font size) rather than the literal -0.72px, since this
  // caption's own font-size is auto-fit per line 96 and doesn't render at
  // a literal 18px on the 1080-wide story canvas.
  const CAPTION_LETTER_SPACING_RATIO = -0.72 / 18;

  let pretendardReady = null;

  function init() {
    if (!AGM.mobileLayout || !AGM.mobileLayout.isMobile()) return;

    const nextBtn = document.getElementById("mobileNextBtn");
    const iconBtn = document.getElementById("mobileExportIconBtn");
    const shareBtn = document.getElementById("mobileShareBtn");
    if (!nextBtn) return;

    nextBtn.addEventListener("click", () => {
      document.body.classList.add("mobile-export-active");
    });

    if (iconBtn) iconBtn.addEventListener("click", () => handleDownload(iconBtn));
    if (shareBtn) shareBtn.addEventListener("click", () => handleShare(shareBtn));
  }

  // Loaded once and cached — repeat downloads/shares reuse the same
  // already-resolved promise instead of re-requesting the font.
  function ensurePretendardLoaded() {
    if (!pretendardReady) {
      pretendardReady = document.fonts
        .load(`500 ${CAPTION_MAX_FONT_PX}px Pretendard`)
        .then(() => document.fonts.ready);
    }
    return pretendardReady;
  }

  /** Renders the current artwork into a 1080x1920 story PNG and resolves
   *  with the Blob. Circle crop mirrors the mobile card's own: a centered
   *  square of the pill's shorter (height) dimension, undistorted. */
  async function buildStoryBlob() {
    const src = document.createElement("canvas");
    src.width = CONFIG.FRAME_WIDTH;
    src.height = CONFIG.FRAME_HEIGHT;
    canvasView.compositeLayers(src.getContext("2d"), CONFIG.FRAME_WIDTH, CONFIG.FRAME_HEIGHT, {
      showMaskIndicator: false,
    });

    const out = document.createElement("canvas");
    out.width = STORY_W;
    out.height = STORY_H;
    const ctx = out.getContext("2d");

    const bg = AGM.DEFAULT_PALETTE[Math.floor(Math.random() * AGM.DEFAULT_PALETTE.length)].hex;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, STORY_W, STORY_H);

    const cropSize = CONFIG.FRAME_HEIGHT;
    const cropX = (CONFIG.FRAME_WIDTH - cropSize) / 2;
    const cx = STORY_W / 2;
    const r = CIRCLE_D / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, CIRCLE_CY, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(src, cropX, 0, cropSize, cropSize, cx - r, CIRCLE_CY - r, CIRCLE_D, CIRCLE_D);
    ctx.restore();

    await ensurePretendardLoaded();
    ctx.save();
    ctx.globalCompositeOperation = "difference";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let fontPx = CAPTION_MAX_FONT_PX;
    ctx.font = `500 ${fontPx}px Pretendard`;
    while (ctx.measureText(CAPTION_TEXT).width > CAPTION_MAX_WIDTH && fontPx > CAPTION_MIN_FONT_PX) {
      fontPx -= 1;
      ctx.font = `500 ${fontPx}px Pretendard`;
    }
    // ctx.letterSpacing is a newer Canvas 2D addition (Chrome 99+, Safari
    // 17.4+) — unsupported browsers just silently keep the default 0,
    // a minor cosmetic-only fallback.
    if ("letterSpacing" in ctx) {
      ctx.letterSpacing = `${(fontPx * CAPTION_LETTER_SPACING_RATIO).toFixed(2)}px`;
    }
    ctx.fillText(CAPTION_TEXT, cx, CAPTION_Y);
    ctx.restore();

    return new Promise((resolve) => out.toBlob(resolve, "image/png"));
  }

  async function handleDownload(btn) {
    btn.disabled = true;
    try {
      const blob = await buildStoryBlob();
      utils.downloadBlob(blob, "a-gentle-gaze-story.png");
    } finally {
      btn.disabled = false;
    }
  }

  async function handleShare(btn) {
    btn.disabled = true;
    try {
      const blob = await buildStoryBlob();
      const file = new File([blob], "a-gentle-gaze-story.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: CAPTION_TEXT });
        } catch (err) {
          // AbortError just means the user dismissed the native share sheet.
          if (err && err.name !== "AbortError") utils.downloadBlob(blob, "a-gentle-gaze-story.png");
        }
      } else {
        utils.downloadBlob(blob, "a-gentle-gaze-story.png");
      }
    } finally {
      btn.disabled = false;
    }
  }

  return { init };
})();
