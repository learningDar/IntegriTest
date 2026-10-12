const $ = id => document.getElementById(id);
let selectedExam = null;
let selectedReport = null;

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json();
  if (response.status === 401 && path !== "/api/teacher/login") {
    clearPrivateView();
    displayAuth(false);
  }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function notice(message) { $("notice").textContent = message; }
function jsonPost(value) { return { method: "POST", body: JSON.stringify(value) }; }
function displayAuth(signedIn) {
  $("login-panel").hidden = signedIn;
  $("teacher-panel").hidden = !signedIn;
}
function clearPrivateView() {
  selectedExam = null;
  selectedReport = null;
  for (const id of ["exam-list", "sessions", "timeline", "codes-text", "report-meta", "selected-form", "selected-title"])
    $(id).replaceChildren();
  $("codes-output").hidden = true;
  $("exam-detail").hidden = true;
  $("report-panel").hidden = true;
  $("empty-selection").hidden = false;
  $("download-report").removeAttribute("href");
}
function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}
function friendlyStatus(status) {
  return ({ NOT_PAIRED: "Not paired", PAIRED: "Paired", ACTIVE: "Active", ENDED: "Ended" })[status] || status;
}
function friendlyEnd(reason) {
  return ({ MANUAL: "Manual end", FORM_SUBMISSION_OBSERVED: "Form submission observed" })[reason] || "Still open";
}

async function loadExams() {
  const { exams } = await api("/api/teacher/exams");
  $("exam-list").replaceChildren();
  if (!exams.length) { $("exam-list").textContent = "No exam records yet. Register a Form above."; return exams; }
  for (const exam of exams) {
    const button = element("button", "exam-button");
    button.type = "button";
    button.dataset.examId = exam.id;
    button.append(element("strong", "", exam.title), element("span", "", new Date(exam.created_at).toLocaleDateString()));
    button.setAttribute("aria-current", String(selectedExam?.id === exam.id));
    button.addEventListener("click", () => selectExam(exam).catch(error => notice(error.message)));
    $("exam-list").append(button);
  }
  return exams;
}

async function selectExam(exam) {
  selectedExam = exam;
  selectedReport = null;
  $("empty-selection").hidden = true;
  $("exam-detail").hidden = false;
  $("report-panel").hidden = true;
  $("codes-output").hidden = true;
  $("codes-text").textContent = "";
  $("selected-title").textContent = exam.title;
  const link = element("a", "", "Open registered Form ↗");
  link.href = exam.form_url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  $("selected-form").replaceChildren(link);
  for (const button of $("exam-list").querySelectorAll("button"))
    button.setAttribute("aria-current", String(button.dataset.examId === exam.id));
  await loadSessions();
}

async function loadSessions() {
  if (!selectedExam) return;
  const examId = selectedExam.id;
  const { sessions } = await api(`/api/teacher/exams/${examId}/sessions`);
  if (selectedExam?.id !== examId) return;
  $("metric-assigned").textContent = sessions.length;
  $("metric-active").textContent = sessions.filter(s => s.status === "ACTIVE").length;
  $("metric-gap").textContent = sessions.filter(s => s.connection === "GAP").length;
  $("metric-ended").textContent = sessions.filter(s => s.status === "ENDED").length;
  $("sessions").replaceChildren();
  if (!sessions.length) { $("sessions").textContent = "No students assigned yet. Enter Student IDs above to create join codes."; return; }
  for (const session of sessions) {
    const card = element("article", "session-card");
    const top = element("div", "session-top");
    const badge = element("span", `badge ${session.status === "ACTIVE" ? "badge-active" : ""}`, friendlyStatus(session.status));
    top.append(element("strong", "", session.student_id), badge);
    const contact = session.connection === "GAP" ? "Connection gap"
      : session.connection === "CONNECTED" ? "Connected"
      : session.status === "PAIRED" ? "Paired, not started"
      : session.status === "NOT_PAIRED" ? "Waiting for pairing" : "Session ended";
    const meta = element("div", "session-meta");
    const contactLabel = element("span", session.connection === "GAP" ? "badge-gap" : "", contact);
    const last = session.last_contact ? new Date(session.last_contact).toLocaleString() : "No contact yet";
    meta.append(contactLabel, element("span", "", `Last contact: ${last}`),
      element("span", "", `${session.event_count || 0} events`));
    card.append(top, meta);
    if (session.end_reason) card.append(element("p", "small", friendlyEnd(session.end_reason)));
    if (session.id) {
      const button = element("button", "button-secondary", "Review timeline");
      button.type = "button";
      button.addEventListener("click", () => showReport(session.id).catch(error => notice(error.message)));
      card.append(button);
    }
    $("sessions").append(card);
  }
}

async function showReport(id) {
  const report = await api(`/api/teacher/sessions/${id}/report.json`);
  selectedReport = report;
  $("report-panel").hidden = false;
  $("report-meta").textContent = `${report.studentId} · ${friendlyStatus(report.session.status)} · ${report.incidents.length} events · ${friendlyEnd(report.session.endReason)}`;
  $("timeline").replaceChildren();
  if (!report.incidents.length) $("timeline").append(element("li", "timeline-item", "No incidents received yet."));
  for (const incident of report.incidents) {
    const item = element("li", "timeline-item");
    const time = element("time", "", new Date(incident.timestamp).toLocaleString());
    time.dateTime = incident.timestamp;
    item.append(time, element("strong", "", incident.details));
    const context = [incident.hostname, incident.appCategory].filter(Boolean).join(" · ");
    if (context) item.append(element("p", "", context));
    $("timeline").append(item);
  }
  $("report-panel").scrollIntoView({ behavior: "smooth" });
}

$("download-report").addEventListener("click", event => {
  if (!selectedReport) { event.preventDefault(); return; }
  const blob = new Blob([JSON.stringify(selectedReport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  event.currentTarget.href = url;
  event.currentTarget.download = `exam-report-${selectedReport.session.id.slice(0, 8)}.json`;
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await api("/api/teacher/login", jsonPost({ password: $("password").value }));
    $("password").value = "";
    displayAuth(true);
    const exams = await loadExams();
    if (exams.length) await selectExam(exams[0]);
    notice("Signed in.");
  } catch (error) { notice(error.message); }
});
$("logout").addEventListener("click", async () => {
  try {
    await api("/api/teacher/logout", jsonPost({}));
    clearPrivateView();
    displayAuth(false);
    notice("Signed out.");
  } catch (error) { notice(error.message); }
});
$("exam-form").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const { exam } = await api("/api/teacher/exams", jsonPost({ title: $("exam-title").value, formUrl: $("form-url").value }));
    $("exam-form").reset();
    await loadExams();
    await selectExam({ id: exam.id, title: exam.title, form_url: exam.formUrl });
    notice("Exam record created.");
  } catch (error) { notice(error.message); }
});
$("codes-form").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const studentIds = $("student-ids").value.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    const { codes } = await api(`/api/teacher/exams/${selectedExam.id}/codes`, jsonPost({ studentIds }));
    $("codes-text").textContent = codes.map(code => `${code.studentId}: ${code.code}`).join("\n");
    $("codes-output").hidden = false;
    $("student-ids").value = "";
    await loadSessions();
    notice("Codes created. Share each code privately.");
  } catch (error) { notice(error.message); }
});
$("refresh-sessions").addEventListener("click", () => loadSessions().then(() => notice("Activity refreshed.")).catch(error => notice(error.message)));
api("/api/teacher/me").then(async () => {
  displayAuth(true);
  const exams = await loadExams();
  if (exams.length) await selectExam(exams[0]);
}).catch(() => displayAuth(false));
