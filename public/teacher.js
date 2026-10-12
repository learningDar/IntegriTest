const $ = id => document.getElementById(id);
let selectedExam = null;
let selectedReport = null;
async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function notice(text) { $("notice").textContent = text; }
function jsonPost(value) { return { method: "POST", body: JSON.stringify(value) }; }
function displayAuth(signedIn) { $("login-panel").hidden = signedIn; $("teacher-panel").hidden = !signedIn; }
async function loadExams() {
  const { exams } = await api("/api/teacher/exams");
  $("exam-list").replaceChildren();
  if (!exams.length) { $("exam-list").textContent = "No exams yet."; return; }
  for (const exam of exams) {
    const button = document.createElement("button");
    button.className = "exam-button secondary";
    button.textContent = `${exam.title} · ${new Date(exam.created_at).toLocaleDateString()}`;
    button.addEventListener("click", () => selectExam(exam));
    $("exam-list").append(button);
  }
}
async function selectExam(exam) {
  selectedExam = exam;
  $("exam-detail").hidden = false;
  $("report-panel").hidden = true;
  $("selected-title").textContent = exam.title;
  const link = document.createElement("a"); link.href = exam.form_url; link.textContent = "Open registered Form";
  link.target = "_blank"; link.rel = "noopener noreferrer";
  $("selected-form").replaceChildren(link);
  await loadSessions();
}
async function loadSessions() {
  if (!selectedExam) return;
  const { sessions } = await api(`/api/teacher/exams/${selectedExam.id}/sessions`);
  $("sessions").replaceChildren();
  if (!sessions.length) { $("sessions").textContent = "No student sessions yet."; return; }
  for (const session of sessions) {
    const row = document.createElement("div"); row.className = "session";
    const title = document.createElement("strong"); title.textContent = `${session.student_id} · ${session.status}`;
    const contact = document.createElement("p");
    contact.className = session.connection === "GAP" ? "gap" : session.connection === "CONNECTED" ? "connected" : "neutral";
    contact.textContent = `Contact: ${session.connection} · Last: ${session.last_contact ? new Date(session.last_contact).toLocaleString() : "never"}`;
    const detail = document.createElement("p");
    detail.textContent = `${session.event_count} events · End: ${session.end_reason || "pending"}`;
    row.append(title,contact,detail);
    if (session.id) {
      const button = document.createElement("button"); button.textContent = "Review report";
      button.addEventListener("click", () => showReport(session.id));
      row.append(button);
    }
    $("sessions").append(row);
  }
}
async function showReport(id) {
  const report = await api(`/api/teacher/sessions/${id}/report.json`);
  selectedReport = report;
  $("report-panel").hidden = false;
  $("report-meta").textContent = `${report.studentId} · ${report.session.status} · ${report.incidents.length} events · End: ${report.session.endReason || "pending"}`;
  $("timeline").replaceChildren();
  for (const incident of report.incidents) {
    const item = document.createElement("li"); item.className = "timeline-item";
    item.textContent = `${new Date(incident.timestamp).toLocaleString()} · ${incident.type} · ${incident.details}${incident.hostname ? ` · ${incident.hostname}` : ""}`;
    $("timeline").append(item);
  }
  $("report-panel").scrollIntoView({ behavior: "smooth" });
}
$("download-report").addEventListener("click", event => {
  if (!selectedReport) { event.preventDefault(); return; }
  const blob = new Blob([JSON.stringify(selectedReport,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  event.currentTarget.href = url;
  event.currentTarget.download = `exam-report-${selectedReport.session.id.slice(0,8)}.json`;
  setTimeout(() => URL.revokeObjectURL(url),1000);
});
$("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  try { await api("/api/teacher/login",jsonPost({password:$("password").value})); $("password").value=""; displayAuth(true); await loadExams(); notice("Signed in."); }
  catch (error) { notice(error.message); }
});
$("logout").addEventListener("click", async () => { await api("/api/teacher/logout",jsonPost({})); displayAuth(false); selectedExam=null; notice("Signed out."); });
$("exam-form").addEventListener("submit", async event => {
  event.preventDefault();
  try { const {exam}=await api("/api/teacher/exams",jsonPost({title:$("exam-title").value,formUrl:$("form-url").value}));
    $("exam-form").reset(); await loadExams(); await selectExam({id:exam.id,title:exam.title,form_url:exam.formUrl}); notice("Exam created."); }
  catch(error){ notice(error.message); }
});
$("codes-form").addEventListener("submit", async event => {
  event.preventDefault();
  try { const studentIds=$("student-ids").value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const {codes}=await api(`/api/teacher/exams/${selectedExam.id}/codes`,jsonPost({studentIds}));
    $("codes-text").textContent=codes.map(c=>`${c.studentId}: ${c.code}`).join("\n");
    $("codes-output").hidden=false; $("student-ids").value=""; notice("Codes created. Save them now."); }
  catch(error){ notice(error.message); }
});
$("refresh-sessions").addEventListener("click",()=>loadSessions().catch(e=>notice(e.message)));
api("/api/teacher/me").then(async()=>{displayAuth(true);await loadExams();}).catch(()=>displayAuth(false));
