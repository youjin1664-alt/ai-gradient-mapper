/* ==========================================================================
   customCursor.js — replaces the system cursor with Cursor.svg, but only
   while hovering the pill preview image (#artCanvas); everywhere else the
   normal system cursor shows. Smoothly trails the real mouse position via
   requestAnimationFrame + vanilla JS (no framework in this project).
   Purely visual/additive: pointer-events:none, so it never touches the
   mask-painting, slider, or export interaction logic.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.customCursor = (function () {
  const { utils } = AGM;

  // Design reference: 1440px viewport -> 187x60 cursor, scaling linearly
  // with viewport width up to 2560px (1.77x / 332x107), never shrinking
  // below the 1440 baseline — then an overall 0.75x reduction on top.
  const REFERENCE_VIEWPORT = 1440;
  const MIN_SCALE = 1;
  const MAX_SCALE = 1.77;
  const GLOBAL_SCALE = 0.7;

  // Must mirror style.css's mobile media query. On mobile the cursor's base
  // size is already set to the spec'd 58x33.31px via CSS, so the desktop
  // viewport-width-based scale multiplier (tuned for 1440-2560px monitors)
  // is bypassed there — see applyScale().
  const MOBILE_QUERY = "(max-width: 768px), (max-height: 500px) and (orientation: landscape)";

  // Frame-rate-independent exponential smoothing, tuned to the requested
  // ~0.08-0.12s "catch up" feel regardless of the actual frame rate.
  const SMOOTHING_SECONDS = 0.1;

  let el, target;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let currentScale = 1;
  let visible = false;
  let lastFrameTime = null;

  function init() {
    el = document.getElementById("customCursor");
    target = document.getElementById("artCanvas");
    if (!el || !target) return;

    applyScale();
    window.addEventListener("resize", utils.debounce(applyScale, 100));

    // Only tracked/shown while the pointer is over the pill image itself —
    // everywhere else (panels, buttons, page background) uses the normal
    // system cursor. Pointer events (not mouse events) on purpose:
    // maskPainter.js's own pointermove handler calls e.preventDefault()
    // while actively dragging to paint, which per spec suppresses the
    // browser's synthesized mousemove compatibility event — so a
    // mousemove-based cursor would freeze in place for the entire drag.
    // pointermove isn't affected by another listener's preventDefault().
    target.addEventListener("pointerenter", onEnterTarget);
    target.addEventListener("pointermove", onMouseMove);
    target.addEventListener("pointerleave", onLeaveTarget);

    // On mobile there's no real hover — the "Drag" cursor should only show
    // during an active touch-drag on the canvas instead. Entirely additive:
    // never runs when the query doesn't match, so desktop's hover-based
    // behavior above is unaffected.
    if (window.matchMedia(MOBILE_QUERY).matches) {
      target.addEventListener("pointerdown", onMobilePointerDown);
      target.addEventListener("pointermove", onMobilePointerMove);
      window.addEventListener("pointerup", onMobilePointerUp);
      window.addEventListener("pointercancel", onMobilePointerUp);
    }

    requestAnimationFrame(loop);
  }

  function onMobilePointerDown(e) {
    targetX = currentX = e.clientX;
    targetY = currentY = e.clientY;
    setVisible(true);
  }

  function onMobilePointerMove(e) {
    if (!visible) return;
    targetX = e.clientX;
    targetY = e.clientY;
  }

  function onMobilePointerUp() {
    setVisible(false);
  }

  function onEnterTarget(e) {
    targetX = currentX = e.clientX;
    targetY = currentY = e.clientY;
    setVisible(true);
  }

  function onLeaveTarget() {
    setVisible(false);
  }

  function onMouseMove(e) {
    targetX = e.clientX;
    targetY = e.clientY;
  }

  function setVisible(v) {
    visible = v;
    el.style.opacity = v ? "1" : "0";
  }

  function applyScale() {
    if (window.matchMedia(MOBILE_QUERY).matches) {
      currentScale = 1;
      return;
    }
    currentScale = utils.clamp(window.innerWidth / REFERENCE_VIEWPORT, MIN_SCALE, MAX_SCALE) * GLOBAL_SCALE;
  }

  function loop(now) {
    if (lastFrameTime == null) lastFrameTime = now;
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    const factor = 1 - Math.exp(-dt / SMOOTHING_SECONDS);
    currentX += (targetX - currentX) * factor;
    currentY += (targetY - currentY) * factor;

    el.style.transform =
      `translate3d(${currentX}px, ${currentY}px, 0) ` + `translate(-50%, -50%) scale(${currentScale})`;

    requestAnimationFrame(loop);
  }

  return { init };
})();
