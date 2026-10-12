(() => {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem("exam-monitor-theme"); } catch { /* Storage may be disabled. */ }
  const prefersDark = matchMedia("(prefers-color-scheme: dark)");
  root.dataset.theme = saved === "dark" || saved === "light" ? saved : prefersDark.matches ? "dark" : "light";

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
      try { localStorage.setItem("exam-monitor-theme", root.dataset.theme); } catch { /* Continue without persistence. */ }
      syncButton();
    });
    syncButton();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeButton, { once: true });
  else initializeButton();
  prefersDark.addEventListener?.("change", event => {
    let hasChoice = false;
    try { hasChoice = Boolean(localStorage.getItem("exam-monitor-theme")); } catch { /* Use current choice. */ }
    if (!hasChoice) { root.dataset.theme = event.matches ? "dark" : "light"; syncButton(); }
  });
})();
