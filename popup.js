const startButton = document.getElementById("start-button");
const endButton = document.getElementById("end-button");
const exportButton = document.getElementById("export-button");
const message = document.getElementById("message");
const statusBadge = document.getElementById("status-badge");
const sessionDetail = document.getElementById("session-detail");
const desktopDetail = document.getElementById("desktop-detail");
const fullscreenChoice = document.getElementById("fullscreen-choice");
const summary = document.getElementById("report-summary");
const incidentList = document.getElementById("incidents");
document.getElementById("build-version").textContent = `· v${chrome.runtime.getManifest().version}`;
let currentState = null;

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
  endButton.disabled = !active;
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
  try { render(await request("GET_STATUS")); }
  catch (error) { message.textContent = error.message; }
}

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
});
refresh();
