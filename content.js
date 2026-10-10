(() => {
  "use strict";
  if (!/^\/forms\/d\/(?:e\/)?[^/]+\/viewform\/?$/.test(location.pathname)) return;

  function report(type) {
    try {
      chrome.runtime.sendMessage({ kind: "CONTENT_EVENT", type }).catch(() => {
        // The extension may be reloading. No page data is retained here.
      });
    } catch {
      // An old content script can remain in the page after extension reload.
    }
  }

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
