/* ==========================================================================
   mobileOnboarding.js — full-screen "portrait only" notice shown on every
   mobile (<=768px) page load, dismissed by tapping the screen. Purely
   additive: only touches the standalone #mobileOnboarding overlay element,
   gated by matchMedia, so it never runs (and never interferes with
   anything) on desktop/tablet.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.mobileOnboarding = (function () {
  const MOBILE_QUERY = "(max-width: 768px)";

  function init() {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;

    const overlay = document.getElementById("mobileOnboarding");
    if (!overlay) return;

    overlay.classList.add("is-visible");
    overlay.addEventListener("click", dismiss, { once: true });

    function dismiss() {
      overlay.classList.remove("is-visible");
    }
  }

  return { init };
})();
