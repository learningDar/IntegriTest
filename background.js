importScripts("rules.js", "desktop.js");

const STORAGE_KEY = "monitorState";
const DEDUP_MS = 1200;
const NATIVE_HOST = "com.learningdar.exam_monitor";
const SERVICE_ORIGIN = "http://127.0.0.1:8787";
const RETRY_ALARM = "exam-monitor-delivery";
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
  FULLSCREEN_RESTORED: ["LOW", "Fullscreen entered or restored"],
  COPY_ATTEMPT: ["MEDIUM", "Copy attempted in Google Form"],
  PASTE_ATTEMPT: ["HIGH", "Paste attempted in Google Form"]
};
let operationQueue = Promise.resolve();
let nativePort = null;
let nativeRetryTimer = null;
let syncTimer = null;
let syncInFlight = null;
let syncAgain = false;

function exclusive(operation) {
  const next = operationQueue.then(operation, operation);
  operationQueue = next.catch(() => {});
  return next;
}

async function readState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return stored[STORAGE_KEY] || {
    activeSession: null, lastSession: null, incidents: [], desktopStatus: "IDLE"
  };
}

async function writeState(state, triggerSync = true) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  if (triggerSync && state.pairing && (state.activeSession?.remote || state.lastSession?.remote)) scheduleSync();
}

function scheduleSync() {
  if (syncTimer) return;
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncRemote().catch(console.error);
  }, 100);
}

async function serviceRequest(path, credential, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(SERVICE_ORIGIN + path, {
      method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", ...(credential ? { authorization: `Bearer ${credential}` } : {}) },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Service returned ${response.status}.`);
    return data;
  } finally { clearTimeout(timeout); }
}

async function pairStudent(code) {
  const existing = await readState();
  if (existing.activeSession) throw new Error("End the active examination before pairing.");
  const pairing = await serviceRequest("/api/student/pair", null, { code: String(code || "").trim().toLowerCase() });
  await exclusive(async () => {
    const state = await readState();
    state.pairing = { ...pairing, used: false };
    state.lastSession = null;
    state.incidents = [];
    await writeState(state);
  });
  return status();
}

async function markRemote(update) {
  await exclusive(async () => {
    const state = await readState();
    const session = state.activeSession || state.lastSession;
    if (!session?.remote) return;
    Object.assign(session, update);
    await writeState(state, false);
  });
}

async function syncRemote() {
  if (syncInFlight) { syncAgain = true; return syncInFlight; }
  syncInFlight = (async () => {
    try {
      let state = await readState();
      let session = state.activeSession || state.lastSession;
      if (!session?.remote || !state.pairing || state.pairing.sessionId !== session.id) return;
      const credential = state.pairing.credential;
      if (!session.remoteStartAck) {
        await serviceRequest("/api/student/start", credential, {});
        await markRemote({ remoteStartAck: true, remoteError: null });
      }
      state = await readState(); session = state.activeSession || state.lastSession;
      let acknowledged = session.acknowledgedSequence || 0;
      while (true) {
        const pending = state.incidents.filter(item => item.sequence > acknowledged).slice(0, 50);
        if (!pending.length) break;
        const result = await serviceRequest("/api/student/events", credential, { incidents: pending });
        acknowledged = result.acknowledgedSequence;
        await markRemote({ acknowledgedSequence: acknowledged, remoteError: null });
        state = await readState(); session = state.activeSession || state.lastSession;
      }
      if (state.activeSession) {
        await serviceRequest("/api/student/heartbeat", credential, {});
        await markRemote({ lastDeliveryAt: new Date().toISOString(), remoteError: null });
      } else if (!session.remoteEndAck) {
        await serviceRequest("/api/student/end", credential, {
          reason: session.endReason || "MANUAL", lastSequence: acknowledged
        });
        await markRemote({ remoteEndAck: true, lastDeliveryAt: new Date().toISOString(), remoteError: null });
      }
    } catch (error) {
      await markRemote({ remoteError: error.message || "Service unavailable." });
    }
  })();
  try { await syncInFlight; } finally {
    syncInFlight = null;
    if (syncAgain) { syncAgain = false; scheduleSync(); }
  }
}

function makeIncident(sessionId, type, severity, details, extras = {}) {
  return {
    id: crypto.randomUUID(),
    sessionId,
    timestamp: extras.timestamp ?? new Date().toISOString(),
    type,
    severity,
    details,
    durationMs: null,
    questionNumber: null,
    domainCategory: extras.domainCategory ?? null,
    source: extras.source ?? "CHROME",
    appCategory: extras.appCategory ?? null,
    hostname: extras.hostname ?? null
  };
}

function addIncident(state, type, severity, details, extras = {}) {
  const session = state.activeSession;
  if (!session) return false;
  const previous = state.incidents[state.incidents.length - 1];
  const now = Date.now();
  if (previous && previous.type === type && previous.hostname === (extras.hostname ?? null) &&
      previous.source === (extras.source ?? "CHROME") &&
      previous.appCategory === (extras.appCategory ?? null) &&
      now - Date.parse(previous.timestamp) < DEDUP_MS) return false;
  const incident = makeIncident(session.id, type, severity, details, extras);
  incident.sequence = state.incidents.length + 1;
  if (previous && incident.timestamp < previous.timestamp) incident.timestamp = previous.timestamp;
  state.incidents.push(incident);
  return true;
}

async function status() {
  return readState();
}

async function startExam(tabId, useFullscreen = true) {
  if (!Number.isInteger(tabId)) throw new Error("Open a Google Form respondent page first.");
  const tab = await chrome.tabs.get(tabId);
  if (!ExamRules.isSupportedFormUrl(tab.url)) throw new Error("Open a supported Google Form respondent page first.");

  const result = await exclusive(async () => {
    const state = await readState();
    if (state.activeSession) throw new Error("An examination is already active.");
    if (state.pairing?.used) throw new Error("This join code has already been used. Request a new code.");
    if (state.pairing && new URL(tab.url).pathname.split("/").at(-2) !== state.pairing.formId)
      throw new Error("Open the Form registered for this join code.");
    const session = {
      id: state.pairing?.sessionId || crypto.randomUUID(),
      remote: Boolean(state.pairing),
      remoteStartAck: false,
      acknowledgedSequence: 0,
      formTabId: tab.id,
      windowId: tab.windowId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      fullscreenState: null,
      fullscreenRequested: Boolean(useFullscreen),
      windowFocusState: "FOCUSED",
      desktopInterruptionRecorded: false
    };
    state.activeSession = session;
    if (state.pairing) state.pairing.used = true;
    state.lastSession = null;
    state.incidents = [];
    state.desktopStatus = "CONNECTING";
    addIncident(state, "EXAM_STARTED", "LOW", "Exam session started");
    await writeState(state);
    return session;
  });

  let fullscreenError = null;
  try {
    await chrome.windows.update(result.windowId, {
      state: useFullscreen ? "fullscreen" : "normal"
    });
    await checkFullscreen(result.windowId);
  } catch {
    fullscreenError = useFullscreen
      ? "Chrome could not enter fullscreen; enter it manually."
      : "Chrome could not check fullscreen status.";
  }
  connectNativeHost();
  return { ...(await status()), fullscreenError };
}

async function endExam(reason = "MANUAL") {
  const ended = await exclusive(async () => {
    const state = await readState();
    if (!state.activeSession) throw new Error("No examination is active.");
    addIncident(state, "EXAM_ENDED", "LOW", "Exam session ended");
    state.activeSession.endedAt = new Date().toISOString();
    state.activeSession.endReason = reason;
    state.lastSession = state.activeSession;
    state.activeSession = null;
    state.desktopStatus = "IDLE";
    await writeState(state);
    return state;
  });
  disconnectNativeHost();
  if (ended.lastSession.remote) await syncRemote();
  return ended;
}

async function record(type, severity, details, extras) {
  return exclusive(async () => {
    const state = await readState();
    if (!addIncident(state, type, severity, details, extras)) return;
    await writeState(state);
  });
}

async function recordWindowFocus(focused) {
  return exclusive(async () => {
    const state = await readState();
    const session = state.activeSession;
    if (!session) return;
    if (!session.windowFocusState) session.windowFocusState = "FOCUSED";
    const next = focused ? "FOCUSED" : "UNFOCUSED";
    if (session.windowFocusState === next) return;
    session.windowFocusState = next;
    const type = focused ? "WINDOW_FOCUS_RESTORED" : "WINDOW_FOCUS_LOST";
    const [severity, details] = CONTENT_LABELS[type];
    addIncident(state, type, severity, details);
    await writeState(state);
  });
}

function scheduleNativeReconnect() {
  if (nativeRetryTimer) return;
  nativeRetryTimer = setTimeout(async () => {
    nativeRetryTimer = null;
    const state = await readState();
    if (state.activeSession && !nativePort) connectNativeHost();
  }, 5000);
}

async function markDesktopDisconnected() {
  await exclusive(async () => {
    const state = await readState();
    if (!state.activeSession) return;
    state.desktopStatus = "DISCONNECTED";
    if (!state.activeSession.desktopInterruptionRecorded) {
      addIncident(state, "MONITORING_INTERRUPTED", "HIGH",
        "Windows desktop monitoring disconnected; browser monitoring continues",
        { source: "WINDOWS_HOST" });
      state.activeSession.desktopInterruptionRecorded = true;
    }
    await writeState(state);
  });
}

async function handleNativeMessage(port, rawMessage) {
  if (port !== nativePort) return;
  const message = ExamDesktop.validateHostMessage(rawMessage);
  if (!message) return;
  await exclusive(async () => {
    const state = await readState();
    if (!state.activeSession) return;
    state.desktopStatus = "CONNECTED";
    state.activeSession.desktopInterruptionRecorded = false;
    if (message.kind === "FOREGROUND_CHANGED" && message.appCategory !== "OTHER") {
      addIncident(state, "DESKTOP_APP_ACTIVE", "MEDIUM",
        ExamDesktop.LABELS[message.appCategory], {
          source: "WINDOWS_HOST",
          appCategory: message.appCategory,
          timestamp: message.timestamp
        });
    }
    await writeState(state);
  });
}

function connectNativeHost() {
  if (nativePort) return;
  let port;
  try {
    port = chrome.runtime.connectNative(NATIVE_HOST);
  } catch {
    markDesktopDisconnected().catch(console.error);
    scheduleNativeReconnect();
    return;
  }
  nativePort = port;
  port.onMessage.addListener(message => {
    handleNativeMessage(port, message).catch(console.error);
  });
  port.onDisconnect.addListener(() => {
    if (port !== nativePort) return;
    nativePort = null;
    markDesktopDisconnected().catch(console.error);
    scheduleNativeReconnect();
  });
}

function disconnectNativeHost() {
  if (nativeRetryTimer) clearTimeout(nativeRetryTimer);
  nativeRetryTimer = null;
  const port = nativePort;
  nativePort = null;
  if (!port) return;
  try { port.postMessage({ kind: "STOP" }); } catch { /* Host may already be gone. */ }
  try { port.disconnect(); } catch { /* Host may already be gone. */ }
}

async function handleTab(tabId, navigatedUrl = null) {
  const state = await readState();
  if (!state.activeSession) return;
  let tab;
  try { tab = await chrome.tabs.get(tabId); } catch { return; }
  const url = navigatedUrl || tab.url;
  if (!url || url === "about:blank" || url === "chrome://newtab/") return;
  if (!navigatedUrl && !tab.active) return;
  if (tabId === state.activeSession.formTabId && ExamRules.isSupportedFormUrl(url)) return;
  const responseMatch = new URL(url).pathname.match(/^\/forms\/(?:u\/\d+\/)?d\/(?:e\/)?([^/]+)\/formResponse\/?$/);
  if (tabId === state.activeSession.formTabId && responseMatch &&
      responseMatch[1] === state.pairing?.formId) return;
  const signal = ExamRules.classifyTabUrl(url);
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
      if (current === "fullscreen") addIncident(state, "FULLSCREEN_RESTORED", "LOW", "Fullscreen entered or restored");
      else addIncident(state, "FULLSCREEN_EXITED", "MEDIUM", "Fullscreen exited");
    }
    await writeState(state);
  });
}

async function handleContent(type, sender) {
  if (type === "FORM_SUBMIT_ATTEMPT" || type === "FORM_SUBMISSION_CONFIRMED") {
    await exclusive(async () => {
      const state = await readState();
      const session = state.activeSession;
      if (!session || sender.tab?.id !== session.formTabId || !session.remote) return;
      const expected = state.pairing?.formId;
      const match = new URL(sender.url).pathname.match(/^\/forms\/(?:u\/\d+\/)?d\/(?:e\/)?([^/]+)\/(viewform|formResponse)\/?$/);
      if (!match || match[1] !== expected) return;
      if (type === "FORM_SUBMIT_ATTEMPT" && match[2] === "viewform") {
        session.submitAttemptAt = Date.now(); await writeState(state);
      }
      if (type === "FORM_SUBMISSION_CONFIRMED" && match[2] === "formResponse" &&
          session.submitAttemptAt && Date.now() - session.submitAttemptAt < 120000) {
        session.submissionConfirmed = true; await writeState(state);
      }
    });
    if (type === "FORM_SUBMISSION_CONFIRMED" && (await readState()).activeSession?.submissionConfirmed)
      await endExam("FORM_SUBMISSION_OBSERVED");
    return;
  }
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
    await recordWindowFocus(type === "FORM_FOCUS_RESTORED");
    return;
  }
  const [severity, details] = CONTENT_LABELS[type] || ["LOW", type.replaceAll("_", " ")];
  await record(type, severity, details);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      let result;
      if (sender.tab && message?.kind !== "CONTENT_EVENT" &&
          sender.url !== chrome.runtime.getURL("popup.html")) {
        throw new Error("Session controls are available only from the extension popup.");
      }
      switch (message?.kind) {
        case "GET_STATUS": result = await status(); break;
        case "START_EXAM": result = await startExam(message.tabId, message.fullscreen !== false); break;
        case "END_EXAM": result = await endExam(); break;
        case "PAIR_STUDENT": result = await pairStudent(message.code); break;
        case "SYNC_NOW": await syncRemote(); result = await status(); break;
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
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) handleTab(tabId, changeInfo.url).catch(console.error);
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
    await recordWindowFocus(windowId === state.activeSession.windowId);
  } catch (error) { console.error(error); }
});
chrome.windows.onBoundsChanged.addListener(windowInfo => {
  checkFullscreen(windowInfo.id).catch(console.error);
});
if (chrome.alarms) {
  chrome.alarms.create(RETRY_ALARM, { periodInMinutes: 0.5 });
  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === RETRY_ALARM) syncRemote().catch(console.error);
  });
}

readState().then(state => {
  if (state.activeSession) connectNativeHost();
}).catch(console.error);
