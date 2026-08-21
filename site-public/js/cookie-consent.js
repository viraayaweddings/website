(function () {
  var STORAGE_KEY = "viraaya_cookie_consent";
  var GA_ID = "G-8KV1YV2GD8";

  function readConsent() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function saveConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      /* ignore */
    }
  }

  function loadAnalytics() {
    if (window.__viraayaAnalyticsLoaded) return;
    window.__viraayaAnalyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag() {
        window.dataLayer.push(arguments);
      };

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    script.onload = function () {
      window.gtag("js", new Date());
      window.gtag("config", GA_ID, { anonymize_ip: true });
    };
    document.head.appendChild(script);
  }

  function removeBanner() {
    var banner = document.getElementById("viraaya-cookie-banner");
    if (banner) banner.remove();
  }

  function showBanner() {
    if (document.getElementById("viraaya-cookie-banner")) return;

    var banner = document.createElement("div");
    banner.id = "viraaya-cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.style.cssText =
      "position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:9999;max-width:42rem;margin:0 auto;padding:1rem 1.25rem;border-radius:12px;background:#0f172a;color:#fff;box-shadow:0 10px 30px rgba(15,23,42,.35);font:14px/1.5 system-ui,sans-serif;";

    banner.innerHTML =
      '<p style="margin:0 0 .75rem">We use optional analytics cookies to understand how the site is used. You can accept or reject them. See our <a href="/cookie-preference-policy/" style="color:#fde68a">cookie policy</a>.</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:.5rem">' +
      '<button type="button" data-consent="all" style="border:0;border-radius:999px;padding:.45rem 1rem;background:#f59e0b;color:#111;font-weight:600;cursor:pointer">Accept analytics</button>' +
      '<button type="button" data-consent="essential" style="border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:.45rem 1rem;background:transparent;color:#fff;cursor:pointer">Essential only</button>' +
      "</div>";

    banner.addEventListener("click", function (event) {
      var button = event.target.closest("[data-consent]");
      if (!button) return;
      var choice = button.getAttribute("data-consent");
      saveConsent(choice === "all" ? "all" : "essential");
      removeBanner();
      if (choice === "all") loadAnalytics();
    });

    document.body.appendChild(banner);
  }

  window.viraayaCookieConsent = {
    acceptAnalytics: function () {
      saveConsent("all");
      removeBanner();
      loadAnalytics();
    },
    essentialOnly: function () {
      saveConsent("essential");
      removeBanner();
    },
  };

  var consent = readConsent();
  if (consent === "all") loadAnalytics();
  else if (!consent) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showBanner);
    else showBanner();
  }
})();
