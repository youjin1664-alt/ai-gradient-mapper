/* ==========================================================================
   mobileOnboarding.js — one-time full-screen "portrait only" notice shown
   on the very first mobile (<=768px) visit. Purely additive: only touches
   the standalone #mobileOnboarding overlay element, gated by matchMedia +
   localStorage, so it never runs (and never interferes with anything) on
   desktop/tablet.
   ========================================================================== */

window.AGM = window.AGM || {};

AGM.mobileOnboarding = (function () {
  const STORAGE_KEY = "agm_mobile_onboarding_seen";
  const MOBILE_QUERY = "(max-width: 768px)";

  function init() {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;

    let seen = false;
    try {
      seen = !!localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      // localStorage unavailable (e.g. private mode) — fail open, show once
      // per page load rather than throwing.
    }
    if (seen) return;

    const overlay = document.getElementById("mobileOnboarding");
    if (!overlay) return;

    overlay.classList.add("is-visible");
    overlay.addEventListener("click", dismiss, { once: true });

    function dismiss() {
      overlay.classList.remove("is-visible");
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch (e) {
        // Ignore — worst case it shows again next visit.
      }
    }
  }

  return { init };
})();
