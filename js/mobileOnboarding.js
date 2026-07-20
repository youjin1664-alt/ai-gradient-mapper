/* ==========================================================================
   mobileOnboarding.js — full-screen "portrait/landscape only" notice shown
   on every mobile page load (portrait phones by width, or phones rotated
   to landscape). Dismissed by tapping the screen, or automatically the
   moment the device is physically rotated into landscape while it's still
   showing — if the page happens to *load* already in landscape, it stays
   up until tapped (rotating away isn't possible from there). Purely
   additive: only touches the standalone #mobileOnboarding overlay, gated
   by matchMedia, so it never runs on desktop/tablet.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.mobileOnboarding = (function () {
  // Must mirror style.css's mobile media query exactly (portrait phones by
  // width, plus phones rotated to landscape via the height+orientation
  // clause) so the overlay only ever shows when the mobile CSS is active.
  const MOBILE_QUERY = "(max-width: 768px), (max-height: 500px) and (orientation: landscape)";

  function init() {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;

    const overlay = document.getElementById("mobileOnboarding");
    if (!overlay) return;

    overlay.classList.add("is-visible");
    overlay.addEventListener("click", dismiss, { once: true });
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);

    function onViewportChange() {
      if (window.innerWidth > window.innerHeight) dismiss();
    }

    function dismiss() {
      overlay.classList.remove("is-visible");
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
    }
  }

  return { init };
})();
