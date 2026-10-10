(function (root) {
  "use strict";

  function parseUrl(value) {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  }

  function isSupportedFormUrl(value) {
    const url = parseUrl(value);
    return Boolean(
      url &&
        url.protocol === "https:" &&
        url.hostname === "docs.google.com" &&
        /^\/forms\/d\/(?:e\/)?[^/]+\/viewform\/?$/.test(url.pathname)
    );
  }

  function classifyTabUrl(value) {
    const url = parseUrl(value);
    if (!url || !["https:", "http:"].includes(url.protocol)) {
      return {
        type: "TAB_SWITCHED",
        severity: "MEDIUM",
        details: "Another Chrome tab became active",
        domainCategory: null,
        hostname: null
      };
    }

    const hostname = url.hostname.toLowerCase();
    if (hostname === "chatgpt.com" || hostname.endsWith(".chatgpt.com") || hostname === "chat.openai.com") {
      return {
        type: "AI_SITE_OPENED",
        severity: "HIGH",
        details: "ChatGPT page opened or activated; usage is unverified",
        domainCategory: "AI_PLATFORM",
        hostname
      };
    }

    if (/\.pdf$/i.test(url.pathname)) {
      return {
        type: "PDF_OPENED",
        severity: "MEDIUM",
        details: "PDF opened or activated in Chrome",
        domainCategory: "PDF_DOCUMENT",
        hostname
      };
    }

    return {
      type: "WEBPAGE_OPENED",
      severity: "MEDIUM",
      details: "Another webpage opened or activated",
      domainCategory: "OTHER_WEBPAGE",
      hostname
    };
  }

  const api = { isSupportedFormUrl, classifyTabUrl };
  root.ExamRules = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
