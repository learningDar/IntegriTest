(() => {
  "use strict";
  const formPage = /^\/forms\/(?:u\/\d+\/)?d\/(?:e\/)?[^/]+\/viewform\/?$/.test(location.pathname);
  const responsePage = /^\/forms\/(?:u\/\d+\/)?d\/(?:e\/)?[^/]+\/formResponse\/?$/.test(location.pathname);
  if (!formPage && !responsePage) return;

  function report(type) {
    try {
      chrome.runtime.sendMessage({ kind: "CONTENT_EVENT", type }).catch(() => {
        // The extension may be reloading. No page data is retained here.
      });
    } catch {
      // An old content script can remain in the page after extension reload.
    }
  }

  if (responsePage) {
    const confirm = () => {
      if (!document.querySelector("form") && !document.querySelector('input[type="submit"]'))
        report("FORM_SUBMISSION_CONFIRMED");
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", confirm, { once: true });
    else confirm();
    return;
  }
  document.addEventListener("submit", () => report("FORM_SUBMIT_ATTEMPT"), true);
  document.addEventListener("click", event => {
    const button = event.target.closest?.('[role="button"],button,input[type="submit"]');
    if (button && /^(submit|send)$/i.test((button.getAttribute("aria-label") || button.textContent || button.value || "").trim()))
      report("FORM_SUBMIT_ATTEMPT");
  }, true);
  document.addEventListener("visibilitychange", () => {
    report(document.hidden ? "FORM_HIDDEN" : "FORM_VISIBLE");
  });
  window.addEventListener("blur", () => report("FORM_FOCUS_LOST"));
  window.addEventListener("focus", () => report("FORM_FOCUS_RESTORED"));
  document.addEventListener("fullscreenchange", () => {
    report(document.fullscreenElement ? "FULLSCREEN_RESTORED" : "FULLSCREEN_EXITED");
  });
  document.addEventListener("copy", () => report("COPY_ATTEMPT"), true);
  document.addEventListener("paste", () => report("PASTE_ATTEMPT"), true);
})();
