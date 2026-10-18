const startButton = document.getElementById("start-button");
const endButton = document.getElementById("end-button");
const earlyStopButton = document.getElementById("early-stop-button");
const exportButton = document.getElementById("export-button");
const message = document.getElementById("message");
const statusBadge = document.getElementById("status-badge");
const sessionDetail = document.getElementById("session-detail");
const desktopDetail = document.getElementById("desktop-detail");
const fullscreenChoice = document.getElementById("fullscreen-choice");
const summary = document.getElementById("report-summary");
const incidentList = document.getElementById("incidents");
const pairButton = document.getElementById("pair-button");
const joinCode = document.getElementById("join-code");
const pairDetail = document.getElementById("pair-detail");
const deliveryDetail = document.getElementById("delivery-detail");
const tabWarning = document.getElementById("tab-warning");
const themeButton = document.getElementById("theme-toggle");
document.getElementById("build-version").textContent = `· v${chrome.runtime.getManifest().version}`;
let currentState = null;

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  themeButton.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  themeButton.setAttribute("aria-pressed", String(theme === "dark"));
}
chrome.storage.local.get("popupTheme").then(({ popupTheme }) => {
  applyTheme(popupTheme === "light" || popupTheme === "dark" ? popupTheme
    : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}).catch(() => applyTheme("light"));
themeButton.addEventListener("click", async () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(theme);
  try { await chrome.storage.local.set({ popupTheme: theme }); }
  catch { message.textContent = "Could not save the color preference."; }
});

async function request(kind, extra = {}) {
  const response = await chrome.runtime.sendMessage({ kind, ...extra });
  if (!response?.ok) throw new Error(response?.error || "Monitor did not respond.");
  return response.result;
}

function formatTime(iso) {
  return new Date(iso).toLocaleString();
}

function render(state) {
  currentState = state;
  const session = state.activeSession || state.lastSession;
  const active = Boolean(state.activeSession);
  pairButton.disabled = active;
  joinCode.disabled = active;
  document.getElementById("sync-button").disabled = !session?.remote;
  if (state.pairing) {
    pairDetail.replaceChildren();
    const assigned = state.pairing.studentName
      ? `${state.pairing.studentName} · ${state.pairing.studentId}` : state.pairing.studentId;
    const label = document.createTextNode(`Assigned: ${assigned} · ${state.pairing.examTitle} · `);
    const link = document.createElement("a");
    link.href = state.pairing.formUrl; link.target = "_blank"; link.rel = "noopener noreferrer";
    link.textContent = "Open registered Form";
    pairDetail.append(label, link);
  } else pairDetail.textContent = "Local-only mode. Enter a code to send incidents to the teacher service.";
  if (session?.remote) {
    const received = session.acknowledgedSequence || 0;
    const deliveryStatus = session.remoteError || (session.remoteEndAck ? "complete"
      : !session.remoteStartAck ? "connecting"
      : received < state.incidents.length ? "syncing"
      : active ? "up to date" : "finalizing");
    deliveryDetail.textContent = `Teacher delivery: ${deliveryStatus} · ${received}/${state.incidents.length} events received`;
  } else deliveryDetail.textContent = "";
  statusBadge.textContent = active ? "Monitoring" : "Inactive";
  statusBadge.classList.toggle("active", active);
  sessionDetail.textContent = session
    ? `${active ? "Started" : "Last session"}: ${formatTime(session.startedAt)} · ID ${session.id.slice(0, 8)}`
    : "Open a Google Form respondent page to start.";
  const desktopLabels = {
    IDLE: "Desktop monitor: idle",
    CONNECTING: "Desktop monitor: connecting",
    CONNECTED: "Desktop monitor: connected",
    DISCONNECTED: "Desktop monitor: disconnected; browser monitoring continues"
  };
  desktopDetail.textContent = desktopLabels[state.desktopStatus] || "Desktop monitor: status unavailable";
  startButton.disabled = active;
  if (active) fullscreenChoice.checked = state.activeSession.fullscreenRequested !== false;
  fullscreenChoice.disabled = active;
  endButton.disabled = !active || Boolean(session?.remote);
  const pairedActive = active && Boolean(session?.remote);
  earlyStopButton.hidden = !pairedActive;
  document.getElementById("end-guidance").hidden = !pairedActive;
  document.getElementById("end-guidance").textContent = pairedActive
    ? "Monitoring ends when the registered Form confirms submission. If you cannot finish because of a technical problem, report it to your professor; stopping early is marked separately in the report."
    : "";
  exportButton.disabled = !session;

  const incidents = state.incidents || [];
  const high = incidents.filter(item => item.severity === "HIGH").length;
  const medium = incidents.filter(item => item.severity === "MEDIUM").length;
  summary.textContent = session
    ? `${incidents.length} event${incidents.length === 1 ? "" : "s"} · ${high} high · ${medium} medium`
    : "No session recorded.";

  incidentList.replaceChildren();
  if (!incidents.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No incidents yet.";
    incidentList.append(empty);
    return;
  }
  for (const incident of incidents.slice().reverse()) {
    const item = document.createElement("li");
    const top = document.createElement("div");
    top.className = "incident-top";
    const type = document.createElement("span");
    type.textContent = `${incident.severity} · ${incident.type.replaceAll("_", " ")}`;
    const time = document.createElement("span");
    time.className = "incident-time";
    time.textContent = new Date(incident.timestamp).toLocaleTimeString();
    top.append(type, time);
    const detail = document.createElement("p");
    detail.className = "incident-detail";
    detail.textContent = incident.details;
    item.append(top, detail);
    if (incident.hostname) {
      const host = document.createElement("p");
      host.className = "incident-host";
      host.textContent = incident.hostname;
      item.append(host);
    }
    incidentList.append(item);
  }
}

async function refresh() {
  try { render(await request("GET_STATUS")); await checkTabs(); }
  catch (error) { message.textContent = error.message; }
}

async function checkTabs() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const extra = tabs.filter(tab => !ExamRules.isSupportedFormUrl(tab.url) &&
      tab.url !== chrome.runtime.getURL("popup.html"));
    tabWarning.textContent = extra.length
      ? `Warning: ${extra.length} other tab${extra.length === 1 ? " is" : "s are"} open in this Chrome window. Close them before the exam if your professor requires it.`
      : "No other tabs are open in this Chrome window.";
  } catch { tabWarning.textContent = "Could not check other tabs."; }
}

pairButton.addEventListener("click", async () => {
  message.textContent = "";
  pairButton.disabled = true;
  try { render(await request("PAIR_STUDENT", { code: joinCode.value })); joinCode.value = ""; }
  catch (error) { message.textContent = error.message; await refresh(); }
});
document.getElementById("sync-button").addEventListener("click", async () => {
  try { render(await request("SYNC_NOW")); }
  catch (error) { message.textContent = error.message; }
});

startButton.addEventListener("click", async () => {
  message.textContent = "";
  startButton.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let formTab = tab;
    if (tab?.url === chrome.runtime.getURL("popup.html")) {
      const candidates = (await chrome.tabs.query({ url: "https://docs.google.com/forms/*" }))
        .filter(candidate => ExamRules.isSupportedFormUrl(candidate.url));
      if (candidates.length !== 1) {
        throw new Error("Keep exactly one Google Form respondent page open to start from this tab.");
      }
      [formTab] = candidates;
    }
    const result = await request("START_EXAM", {
      tabId: formTab?.id,
      fullscreen: fullscreenChoice.checked
    });
    render(result);
    if (result.fullscreenError) message.textContent = result.fullscreenError;
  } catch (error) {
    message.textContent = error.message;
    await refresh();
  }
});

endButton.addEventListener("click", async () => {
  message.textContent = "";
  endButton.disabled = true;
  try { render(await request("END_EXAM")); }
  catch (error) { message.textContent = error.message; await refresh(); }
});

earlyStopButton.addEventListener("click", async () => {
  if (!confirm("The Form has not confirmed submission. Stop monitoring and mark this session as ended early for professor review?")) return;
  message.textContent = "";
  earlyStopButton.disabled = true;
  try { render(await request("END_EXAM_EARLY")); }
  catch (error) { message.textContent = error.message; await refresh(); }
});

exportButton.addEventListener("click", () => {
  if (!currentState) return;
  const session = currentState.activeSession || currentState.lastSession;
  if (!session) return;
  const report = ExamReport.buildReport(currentState);
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `exam-incidents-${session.id.slice(0, 8)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.monitorState) refresh();
  if (area === "local" && changes.popupTheme) applyTheme(changes.popupTheme.newValue);
});
refresh();
