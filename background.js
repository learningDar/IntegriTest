importScripts("rules.js");

const STORAGE_KEY = "monitorState";
const DEDUP_MS = 1200;
const ALLOWED_CONTENT_EVENTS = new Set([
  "FORM_HIDDEN", "FORM_VISIBLE", "FORM_FOCUS_LOST", "FORM_FOCUS_RESTORED",
  "FULLSCREEN_EXITED", "FULLSCREEN_RESTORED", "COPY_ATTEMPT", "PASTE_ATTEMPT"
]);
const CONTENT_LABELS = {
  FORM_HIDDEN: ["LOW", "Google Form became hidden"],
  FORM_VISIBLE: ["LOW", "Google Form became visible"],
  FORM_FOCUS_LOST: ["LOW", "Examination window lost focus"],
  FORM_FOCUS_RESTORED: ["LOW", "Examination window regained focus"],
  WINDOW_FOCUS_LOST: ["LOW", "Examination window lost focus"],
  WINDOW_FOCUS_RESTORED: ["LOW", "Examination window regained focus"],
  FULLSCREEN_EXITED: ["MEDIUM", "Fullscreen exited"],
  FULLSCREEN_RESTORED: ["LOW", "Fullscreen restored"],
  COPY_ATTEMPT: ["MEDIUM", "Copy attempted in Google Form"],
  PASTE_ATTEMPT: ["HIGH", "Paste attempted in Google Form"]
};
let operationQueue = Promise.resolve();

function exclusive(operation) {
  const next = operationQueue.then(operation, operation);
  operationQueue = next.catch(() => {});
  return next;
}

async function readState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return stored[STORAGE_KEY] || { activeSession: null, lastSession: null, incidents: [] };
}

async function writeState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function makeIncident(sessionId, type, severity, details, extras = {}) {
  return {
    id: crypto.randomUUID(),
    sessionId,
    timestamp: new Date().toISOString(),
    type,
    severity,
    details,
    durationMs: null,
    questionNumber: null,
    domainCategory: extras.domainCategory ?? null,
    source: "CHROME",
    appCategory: null,
    hostname: extras.hostname ?? null
  };
}

function addIncident(state, type, severity, details, extras = {}) {
  const session = state.activeSession;
  if (!session) return false;
  const previous = state.incidents[state.incidents.length - 1];
  const now = Date.now();
  if (previous && previous.type === type && previous.hostname === (extras.hostname ?? null) &&
      now - Date.parse(previous.timestamp) < DEDUP_MS) return false;
  state.incidents.push(makeIncident(session.id, type, severity, details, extras));
  return true;
}

async function status() {
  const state = await readState();
  return { ...state, desktopStatus: "PENDING_PHASE_2" };
}

async function startExam(tabId) {
  if (!Number.isInteger(tabId)) throw new Error("Open a Google Form respondent page first.");
  const tab = await chrome.tabs.get(tabId);
  if (!ExamRules.isSupportedFormUrl(tab.url)) throw new Error("Open a supported Google Form respondent page first.");

  const result = await exclusive(async () => {
    const state = await readState();
    if (state.activeSession) throw new Error("An examination is already active.");
    const session = {
      id: crypto.randomUUID(),
      formTabId: tab.id,
      windowId: tab.windowId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      fullscreenState: null
    };
    state.activeSession = session;
    state.lastSession = null;
    state.incidents = [];
    addIncident(state, "EXAM_STARTED", "LOW", "Exam session started");
    await writeState(state);
    return session;
  });

  let fullscreenError = null;
  try {
    await chrome.windows.update(result.windowId, { state: "fullscreen" });
    await checkFullscreen(result.windowId);
  } catch {
    fullscreenError = "Chrome could not enter fullscreen; enter it manually.";
  }
  return { ...(await status()), fullscreenError };
}

async function endExam() {
  return exclusive(async () => {
    const state = await readState();
    if (!state.activeSession) throw new Error("No examination is active.");
    addIncident(state, "EXAM_ENDED", "LOW", "Exam session ended");
    state.activeSession.endedAt = new Date().toISOString();
    state.lastSession = state.activeSession;
    state.activeSession = null;
    await writeState(state);
    return { ...state, desktopStatus: "PENDING_PHASE_2" };
  });
}

async function record(type, severity, details, extras) {
  return exclusive(async () => {
    const state = await readState();
    if (!addIncident(state, type, severity, details, extras)) return;
    await writeState(state);
  });
}

async function handleTab(tabId) {
  const state = await readState();
  if (!state.activeSession) return;
  let tab;
  try { tab = await chrome.tabs.get(tabId); } catch { return; }
  if (!tab.url || tab.url === "about:blank" || tab.url === "chrome://newtab/") return;
  if (!tab.active || (tabId === state.activeSession.formTabId && ExamRules.isSupportedFormUrl(tab.url))) return;
  const signal = ExamRules.classifyTabUrl(tab.url);
  await record(signal.type, signal.severity, signal.details, signal);
}

async function checkFullscreen(windowId) {
  return exclusive(async () => {
    const state = await readState();
    if (!state.activeSession || state.activeSession.windowId !== windowId) return;
    let windowInfo;
    try { windowInfo = await chrome.windows.get(windowId); } catch { return; }
    const current = windowInfo.state === "fullscreen" ? "fullscreen" : "other";
    const previous = state.activeSession.fullscreenState;
    state.activeSession.fullscreenState = current;
    if (previous && previous !== current) {
      if (current === "fullscreen") addIncident(state, "FULLSCREEN_RESTORED", "LOW", "Fullscreen restored");
      else addIncident(state, "FULLSCREEN_EXITED", "MEDIUM", "Fullscreen exited");
    }
    await writeState(state);
  });
}

async function handleContent(type, sender) {
  if (!ALLOWED_CONTENT_EVENTS.has(type) || !sender.tab || !ExamRules.isSupportedFormUrl(sender.url)) return;
  const state = await readState();
  if (!state.activeSession || sender.tab.id !== state.activeSession.formTabId) return;

  if (type === "FORM_HIDDEN" || type === "FORM_VISIBLE") {
    await new Promise(resolve => setTimeout(resolve, 250));
    let tab;
    try { tab = await chrome.tabs.get(sender.tab.id); } catch { return; }
    if (!tab.active) return; // Tab switches are reported by the tabs API instead.
  }
  if (type === "FORM_FOCUS_LOST" || type === "FORM_FOCUS_RESTORED") {
    let windowInfo;
    try { windowInfo = await chrome.windows.get(sender.tab.windowId); } catch { return; }
    if (type === "FORM_FOCUS_LOST" && windowInfo.focused) return;
    if (type === "FORM_FOCUS_RESTORED" && !windowInfo.focused) return;
    type = type === "FORM_FOCUS_LOST" ? "WINDOW_FOCUS_LOST" : "WINDOW_FOCUS_RESTORED";
  }
  const [severity, details] = CONTENT_LABELS[type] || ["LOW", type.replaceAll("_", " ")];
  await record(type, severity, details);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      let result;
      if (sender.tab && message?.kind !== "CONTENT_EVENT") {
        throw new Error("Session controls are available only from the extension popup.");
      }
      switch (message?.kind) {
        case "GET_STATUS": result = await status(); break;
        case "START_EXAM": result = await startExam(message.tabId); break;
        case "END_EXAM": result = await endExam(); break;
        case "CONTENT_EVENT": await handleContent(message.type, sender); result = { ok: true }; break;
        default: throw new Error("Unknown message.");
      }
      sendResponse({ ok: true, result });
    } catch (error) {
      sendResponse({ ok: false, error: error.message || "Unexpected monitoring error." });
    }
  })();
  return true;
});

chrome.tabs.onActivated.addListener(({ tabId }) => { handleTab(tabId).catch(console.error); });
chrome.tabs.onCreated.addListener(tab => {
  if (tab.active) handleTab(tab.id).catch(console.error);
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) handleTab(tabId).catch(console.error);
});
chrome.tabs.onRemoved.addListener(tabId => {
  exclusive(async () => {
    const state = await readState();
    if (!state.activeSession || tabId !== state.activeSession.formTabId) return;
    addIncident(state, "MONITORING_INTERRUPTED", "HIGH", "Google Form tab closed during examination");
    await writeState(state);
  }).catch(console.error);
});
chrome.windows.onFocusChanged.addListener(async windowId => {
  try {
    const state = await readState();
    if (!state.activeSession) return;
    if (windowId === state.activeSession.windowId) {
      await record("WINDOW_FOCUS_RESTORED", "LOW", "Examination window regained focus");
    } else {
      await record("WINDOW_FOCUS_LOST", "LOW", "Examination window lost focus");
    }
  } catch (error) { console.error(error); }
});
chrome.windows.onBoundsChanged.addListener(windowInfo => {
  checkFullscreen(windowInfo.id).catch(console.error);
});
