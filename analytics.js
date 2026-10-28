/* Shared initialization: no patient fields or query strings in event payloads. */
(() => {
  if (window.rolimAnalyticsInitialized) return;
  window.rolimAnalyticsInitialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  const location = `${window.location.origin}${window.location.pathname}`;
  let referrer = "";
  try { referrer = document.referrer ? new URL(document.referrer).origin : ""; } catch { /* no referrer */ }
  window.gtag("js", new Date());
  window.gtag("set", { page_location: location, page_referrer: referrer });
  window.gtag("config", "G-Q1984RXJFE", { page_location: location, page_referrer: referrer });
  window.gtag("config", "AW-18046419710");
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=G-Q1984RXJFE";
  document.head.appendChild(script);
})();
