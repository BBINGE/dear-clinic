(function () {
  "use strict";

  // 공통 main.js에서 이미 추적을 시작한 페이지에서는 중복 이벤트를 만들지 않는다.
  if (window.__dearCtaTrackingInitialized) return;
  window.__dearCtaTrackingInitialized = true;

  var destinations = [
    { match: "tel:", action: "phone" },
    { match: "m.booking.naver.com", action: "naver_booking" },
    { match: "talk.naver.com", action: "naver_talk" },
    { match: "blog.naver.com", action: "naver_blog" },
    { match: "instagram.com", action: "instagram" },
    { match: "be-deer.html", action: "be_deer" }
  ];

  window.dataLayer = window.dataLayer || [];

  function getAction(href) {
    for (var index = 0; index < destinations.length; index += 1) {
      if (href.indexOf(destinations[index].match) !== -1) {
        return destinations[index].action;
      }
    }
    return "";
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href]");
    if (!link) return;

    var href = link.getAttribute("href") || "";
    var action = link.dataset.trackAction || getAction(href);
    if (!action) return;

    var payload = {
      event: "dear_cta_click",
      cta_action: action,
      cta_label: (link.getAttribute("aria-label") || link.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
      cta_location: link.dataset.trackLocation || (link.closest(".quickmenu") ? "quickmenu" : link.closest("section") ? link.closest("section").className.split(" ")[0] : "navigation"),
      page_path: window.location.pathname,
      destination: href
    };

    window.dataLayer.push(payload);

    if (typeof window.gtag === "function") {
      window.gtag("event", "dear_cta_click", payload);
    }
  });
})();
