const $ = id => document.getElementById(id);
let selectedExam = null;
let selectedReport = null;
let reportFocusId = null;
let rosterPreview = null;
let refreshBusy = false;
let allExams = [];

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
  reportFocusId = null;
  if ($("report-modal").open) $("report-modal").close();
  selectedExam = null;
  selectedReport = null;
  rosterPreview = null;
  allExams = [];
  $("class-form").reset();
  $("exam-search").value = "";
  $("exam-match-count").textContent = "";
  $("student-search").value = "";
  $("session-filter").value = "ALL";
  $("student-match-count").textContent = "";
  $("save-class").disabled = true;
  for (const id of ["exam-list", "class-list", "selected-class", "roster-preview", "sessions", "timeline", "codes-text", "report-meta", "selected-form", "selected-title"])
    $(id).replaceChildren();
  $("codes-output").hidden = true;
  $("exam-detail").hidden = true;
  $("late-additions").hidden = true;
  $("monitoring-panel").hidden = true;
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
  return ({ MANUAL: "Manual end", FORM_SUBMISSION_OBSERVED: "Form submission observed",
    STUDENT_STOPPED_EARLY: "Stopped before confirmed submission" })[reason] || "Still open";
}
function eventName(session) {
  const type = session.latest_type;
  if (!type) return "—";
  if (type === "AI_SITE_OPENED") return "ChatGPT";
  if (type === "PDF_OPENED") return "Chrome PDF";
  if (type === "DESKTOP_APP_ACTIVE") return ({ WORD: "Word", NOTEPAD: "Notepad",
    PDF_READER: "PDF reader" })[session.latest_app_category] || "Desktop app";
  if (type === "WEBPAGE_OPENED") {
    if (/(^|\.)facebook\.com$/i.test(session.latest_hostname || "")) return "Facebook";
    return session.latest_hostname || "Webpage";
  }
  return ({ COPY_ATTEMPT: "Copy", PASTE_ATTEMPT: "Paste", EXAM_STARTED: "Start",
    EXAM_ENDED: "End", FORM_HIDDEN: "Form", FORM_VISIBLE: "Form",
    WINDOW_FOCUS_LOST: "Focus", WINDOW_FOCUS_RESTORED: "Focus",
    FULLSCREEN_EXITED: "Fullscreen", FULLSCREEN_RESTORED: "Fullscreen",
    MONITORING_INTERRUPTED: "Interruption", TAB_SWITCHED: "Tab" })[type] || type.replaceAll("_", " ");
}
function filterSessionRows() {
  const query = $("student-search").value.trim().toLocaleLowerCase();
  const status = $("session-filter").value;
  const rows = [...$("sessions").querySelectorAll("tr[data-student]")];
  let shown = 0;
  for (const row of rows) {
    const match = row.dataset.student.includes(query) && (status === "ALL" || row.dataset.status === status);
    row.hidden = !match;
    if (match) shown++;
  }
  $("sessions").querySelector("tr[data-empty]")?.remove();
  if (rows.length && !shown) {
    const row = element("tr");
    row.dataset.empty = "true";
    const cell = element("td", "empty-row", "No students match these filters.");
    cell.colSpan = 8;
    row.append(cell);
    $("sessions").append(row);
  }
  $("student-match-count").textContent = `${shown} of ${rows.length} students`;
}

function renderExamList() {
  const query = $("exam-search").value.trim().toLocaleLowerCase();
  const exams = allExams.filter(exam => exam.title.toLocaleLowerCase().includes(query));
  $("exam-match-count").textContent = `${exams.length} of ${allExams.length} exams`;
  $("exam-list").replaceChildren();
  if (!allExams.length) { $("exam-list").textContent = "No exam records yet. Register a Form above."; return; }
  if (!exams.length) { $("exam-list").textContent = "No exam titles match this search."; return; }
  for (const exam of exams) {
    const button = element("button", "exam-button");
    button.type = "button";
    button.dataset.examId = exam.id;
    button.append(element("strong", "", exam.title), element("span", "", new Date(exam.created_at).toLocaleDateString()));
    button.setAttribute("aria-current", String(selectedExam?.id === exam.id));
    button.addEventListener("click", () => selectExam(exam).catch(error => notice(error.message)));
    $("exam-list").append(button);
  }
}
async function loadExams() {
  const { exams } = await api("/api/teacher/exams");
  allExams = exams;
  renderExamList();
  return exams;
}

async function loadClasses() {
  const { classes } = await api("/api/teacher/classes");
  $("class-list").replaceChildren();
  $("selected-class").replaceChildren();
  if (!classes.length) $("class-list").textContent = "No classes saved yet.";
  for (const entry of classes) {
    const row = element("div", "class-row");
    row.append(element("span", "", `${entry.name} · ${entry.student_count} students`));
    const remove = element("button", "button-secondary", "Delete");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      if (!confirm(`Delete class ${entry.name}? Historical exam assignments will remain.`)) return;
      try {
        await api(`/api/teacher/classes/${entry.id}`, { method: "DELETE" });
        await loadClasses();
        notice("Class deleted. Existing exam records were preserved.");
      } catch (error) { notice(error.message); }
    });
    row.append(remove);
    $("class-list").append(row);
    const option = element("option", "", `${entry.name} · ${entry.student_count} students`);
    option.value = entry.id;
    $("selected-class").append(option);
  }
  return classes;
}
function showCodes(codes) {
  $("codes-text").textContent = codes.map(({ name, studentId, code }) =>
    `${name ? name + " · " : ""}${studentId} · ${code}`).join("\n");
  $("codes-output").hidden = false;
  $("codes-heading").focus();
}

async function selectExam(exam) {
  reportFocusId = null;
  if ($("report-modal").open) $("report-modal").close();
  selectedExam = exam;
  selectedReport = null;
  $("student-search").value = "";
  $("session-filter").value = "ALL";
  $("exam-detail").hidden = false;
  $("late-additions").hidden = false;
  $("monitoring-panel").hidden = false;
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
  if (!sessions.length) {
    const row = element("tr");
    const cell = element("td", "empty-row", "No students assigned yet. Import a class or enter IDs above to create join codes.");
    cell.colSpan = 8;
    row.append(cell);
    $("sessions").append(row);
    $("student-match-count").textContent = "0 of 0 students";
    return;
  }
  for (const session of sessions) {
    const row = element("tr");
    row.dataset.student = `${session.student_name || ""} ${session.student_id}`.toLocaleLowerCase();
    row.dataset.status = session.connection === "GAP" ? "GAP" : session.status;
    const studentCell = element("td");
    studentCell.append(element("strong", "", session.student_name || session.student_id));
    if (session.student_name) studentCell.append(element("span", "cell-sub", session.student_id));
    const codeCell = element("td");
    codeCell.append(element("span", `code-state ${session.code_status === "USED" ? "code-used" : ""}`,
      session.code_status === "USED" ? "Used" : "Issued"));
    const startedCell = element("td", "time-cell", session.started_at
      ? new Date(session.started_at).toLocaleString() : "Not started");
    const countsCell = element("td");
    const counts = element("div", "severity-counts");
    for (const [level, count] of [["low", session.low_count], ["medium", session.medium_count], ["high", session.high_count]])
      counts.append(element("span", `severity-count severity-${level}`, `${level[0].toUpperCase()} ${count || 0}`));
    countsCell.append(counts);
    const statusCell = element("td");
    const statusText = session.end_reason === "STUDENT_STOPPED_EARLY" ? "Ended early" : friendlyStatus(session.status);
    statusCell.append(element("span", `badge ${session.connection === "GAP" || session.end_reason === "STUDENT_STOPPED_EARLY"
      ? "badge-gap" : session.status === "ACTIVE" ? "badge-active" : ""}`, statusText));
    const contact = session.connection === "GAP" ? "Connection gap"
      : session.connection === "CONNECTED" ? "Connected"
      : session.status === "PAIRED" ? "Waiting to start"
      : session.status === "NOT_PAIRED" ? "Waiting for pairing" : friendlyEnd(session.end_reason);
    statusCell.append(element("span", "cell-sub", contact));
    if (session.last_contact) statusCell.append(element("span", "cell-sub", `Last contact ${new Date(session.last_contact).toLocaleTimeString()}`));
    const activityCell = element("td", "activity-cell");
    activityCell.append(element("span", "", session.end_reason === "STUDENT_STOPPED_EARLY" && session.latest_type === "EXAM_ENDED"
      ? "Monitoring stopped before confirmed submission" : session.latest_details || "No event received"));
    if (session.latest_at) activityCell.append(element("span", "cell-sub", new Date(session.latest_at).toLocaleTimeString()));
    const eventCell = element("td");
    eventCell.append(element("span", "event-name", eventName(session)));
    const reportCell = element("td");
    if (session.id) {
      const button = element("button", "button-secondary", "View full report");
      button.type = "button";
      button.dataset.reportId = session.id;
      button.addEventListener("click", () => showReport(session.id).catch(error => notice(error.message)));
      reportCell.append(button);
    }
    row.append(studentCell, codeCell, startedCell, countsCell, statusCell, activityCell, eventCell, reportCell);
    $("sessions").append(row);
  }
  filterSessionRows();
}

async function showReport(id) {
  const report = await api(`/api/teacher/sessions/${id}/report.json`);
  if (!selectedExam || report.exam.id !== selectedExam.id) return;
  selectedReport = report;
  reportFocusId = id;
  $("report-meta").textContent = `${report.studentName ? report.studentName + " · " : ""}${report.studentId} · ${friendlyStatus(report.session.status)} · ${report.incidents.length} events · ${friendlyEnd(report.session.endReason)}`;
  $("timeline").replaceChildren();
  if (!report.incidents.length) $("timeline").append(element("li", "timeline-item", "No incidents received yet."));
  for (const incident of [...report.incidents].sort((a, b) => b.sequence - a.sequence)) {
    const item = element("li", "timeline-item");
    const time = element("time", "", new Date(incident.timestamp).toLocaleString());
    time.dateTime = incident.timestamp;
    item.append(time, element("strong", "", incident.details));
    const context = [incident.hostname, incident.appCategory].filter(Boolean).join(" · ");
    if (context) item.append(element("p", "", context));
    $("timeline").append(item);
  }
  if (!$("report-modal").open) {
    $("report-modal").showModal();
    $("close-report").focus();
  }
  $("report-modal-body")?.scrollTo(0, 0);
}

$("close-report").addEventListener("click", () => $("report-modal").close());
$("refresh-report").addEventListener("click", () => {
  if (reportFocusId) showReport(reportFocusId).catch(error => notice(error.message));
});
$("report-modal").addEventListener("close", () => {
  const id = reportFocusId;
  reportFocusId = null;
  selectedReport = null;
  if (id && !$("teacher-panel").hidden) {
    const button = [...document.querySelectorAll("button[data-report-id]")]
      .find(item => item.dataset.reportId === id && !item.closest("[hidden]"));
    (button || $("student-search")).focus();
  }
});

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
    await loadClasses();
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
$("exam-search").addEventListener("input", renderExamList);
$("student-search").addEventListener("input", filterSessionRows);
$("session-filter").addEventListener("change", filterSessionRows);
$("exam-form").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const { exam } = await api("/api/teacher/exams", jsonPost({ title: $("exam-title").value, formUrl: $("form-url").value }));
    $("exam-form").reset();
    $("exam-search").value = "";
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
    showCodes(codes);
    $("student-ids").value = "";
    await loadSessions();
    notice("Codes created. Share each code privately.");
  } catch (error) { notice(error.message); }
});
$("roster-file").addEventListener("change", async event => {
  rosterPreview = null;
  $("save-class").disabled = true;
  $("roster-preview").replaceChildren();
  try {
    const result = await RosterReader.readRosterFile(event.target.files[0]);
    const heading = element("p", "", `${result.students.length} student rows found`);
    $("roster-preview").append(heading);
    const list = element("ol", "preview-list");
    for (const student of result.students) list.append(element("li", "", `${student.name} · ${student.studentId}`));
    $("roster-preview").append(list);
    for (const message of result.errors) $("roster-preview").append(element("p", "row-error", message));
    if (!result.errors.length) {
      rosterPreview = result.students;
      $("save-class").disabled = false;
    }
  } catch (error) { $("roster-preview").textContent = error.message; }
});
$("class-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!rosterPreview) return;
  try {
    await api("/api/teacher/classes", jsonPost({ name: $("class-name").value, students: rosterPreview }));
    rosterPreview = null;
    $("class-form").reset();
    $("save-class").disabled = true;
    $("roster-preview").replaceChildren();
    await loadClasses();
    notice("Class saved. Select an exam to generate its codes.");
  } catch (error) { notice(error.message); }
});
$("assign-class-form").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const { codes } = await api(`/api/teacher/exams/${selectedExam.id}/assign-class`,
      jsonPost({ classId: $("selected-class").value }));
    showCodes(codes);
    await loadSessions();
    notice("Codes created. Share each code privately; they appear only once.");
  } catch (error) { notice(error.message); }
});
$("copy-codes").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("codes-text").textContent); notice("Codes copied."); }
  catch { notice("Copy was unavailable; select the text to copy it."); }
});
$("download-codes").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([$("codes-text").textContent + "\n"], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `integritest-codes-${selectedExam.id.slice(0, 8)}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("refresh-sessions").addEventListener("click", () => loadSessions().then(() => notice("Activity refreshed.")).catch(error => notice(error.message)));
setInterval(async () => {
  if ($("teacher-panel").hidden || document.hidden || !selectedExam || refreshBusy) return;
  refreshBusy = true;
  try {
    await loadSessions();
  } catch (error) { notice(error.message); }
  finally { refreshBusy = false; }
}, 10_000);
api("/api/teacher/me").then(async () => {
  displayAuth(true);
  await loadClasses();
  const exams = await loadExams();
  if (exams.length) await selectExam(exams[0]);
}).catch(() => displayAuth(false));
