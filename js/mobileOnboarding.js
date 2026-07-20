/* ==========================================================================
   mobileOnboarding.js — "portrait/landscape only" notice shown on every
   mobile (<=768px) page load, dismissed by tapping the screen. The dimmed
   backdrop is sized/positioned in JS to exactly match the live #artCanvas
   pill rect (not a static image), so it automatically matches the pill's
   actual on-screen shape whether the device is held in portrait or
   landscape — no separate hardcoded assets needed per orientation. Purely
   additive: only touches the standalone #mobileOnboarding overlay, gated
   by matchMedia, so it never runs on desktop/tablet.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.mobileOnboarding = (function () {
  const { utils } = AGM;
  // Must mirror style.css's mobile media query exactly (portrait phones by
  // width, plus phones rotated to landscape via the height+orientation
  // clause) so the overlay only ever shows when the mobile CSS is active.
  const MOBILE_QUERY = "(max-width: 768px), (max-height: 500px) and (orientation: landscape)";

  let overlay, backdrop, canvas;

  function init() {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;

    overlay = document.getElementById("mobileOnboarding");
    backdrop = document.getElementById("mobileOnboardingBackdrop");
    canvas = document.getElementById("artCanvas");
    if (!overlay || !backdrop || !canvas) return;

    positionBackdrop();
    window.addEventListener("resize", utils.debounce(positionBackdrop, 100));
    window.addEventListener("orientationchange", positionBackdrop);

    overlay.classList.add("is-visible");
    overlay.addEventListener("click", dismiss, { once: true });
  }

  function positionBackdrop() {
    if (!canvas || !backdrop) return;
    const rect = canvas.getBoundingClientRect();
    backdrop.style.left = rect.left + "px";
    backdrop.style.top = rect.top + "px";
    backdrop.style.width = rect.width + "px";
    backdrop.style.height = rect.height + "px";
  }

  function dismiss() {
    overlay.classList.remove("is-visible");
  }

  return { init };
})();
