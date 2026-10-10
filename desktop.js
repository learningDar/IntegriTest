(function (root) {
  "use strict";

  const LABELS = {
    WORD: "Microsoft Word became active",
    NOTEPAD: "Notepad became active",
    PDF_READER: "PDF reader became active"
  };
  const CATEGORIES = new Set([...Object.keys(LABELS), "OTHER"]);

  function validateHostMessage(message, now = Date.now()) {
    if (!message || typeof message !== "object" || Array.isArray(message) ||
        !["READY", "FOREGROUND_CHANGED"].includes(message.kind) ||
        typeof message.timestamp !== "string") return null;
    const parsed = Date.parse(message.timestamp);
    if (!Number.isFinite(parsed) || Math.abs(now - parsed) > 5 * 60 * 1000) return null;
    if (message.kind === "READY") return { kind: "READY", timestamp: new Date(parsed).toISOString() };
    if (!CATEGORIES.has(message.appCategory)) return null;
    return {
      kind: "FOREGROUND_CHANGED",
      appCategory: message.appCategory,
      timestamp: new Date(parsed).toISOString()
    };
  }

  const api = { LABELS, CATEGORIES, validateHostMessage };
  root.ExamDesktop = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
