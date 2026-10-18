(() => {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem("integritest-theme") || localStorage.getItem("exam-monitor-theme"); } catch { /* Storage may be disabled. */ }
  root.dataset.theme = saved === "dark" || saved === "light" ? saved : "dark";

  function syncButton() {
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    const dark = root.dataset.theme === "dark";
    button.textContent = dark ? "Light mode" : "Dark mode";
    button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    button.setAttribute("aria-pressed", String(dark));
  }
  function initializeButton() {
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    button.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem("integritest-theme", root.dataset.theme); } catch { /* Continue without persistence. */ }
      syncButton();
    });
    syncButton();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeButton, { once: true });
  else initializeButton();
})();
