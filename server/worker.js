const encoder = new TextEncoder();
const COOKIE = "teacher_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const GAP_MS = 90 * 1000;
const TYPES = new Set([
  "EXAM_STARTED", "EXAM_ENDED", "WEBPAGE_OPENED", "TAB_SWITCHED",
  "AI_SITE_OPENED", "PDF_OPENED", "FORM_HIDDEN", "FORM_VISIBLE",
  "WINDOW_FOCUS_LOST", "WINDOW_FOCUS_RESTORED", "FULLSCREEN_EXITED",
  "FULLSCREEN_RESTORED", "COPY_ATTEMPT", "PASTE_ATTEMPT",
  "MONITORING_INTERRUPTED", "DESKTOP_APP_ACTIVE"
]);
const CATEGORIES = new Set(["WORD", "NOTEPAD", "PDF_READER"]);
const SEVERITIES = new Set(["LOW", "MEDIUM", "HIGH"]);
const SOURCES = new Set(["CHROME", "WINDOWS_HOST"]);
const END_REASONS = new Set(["MANUAL", "FORM_SUBMISSION_OBSERVED"]);
const LABELS = {
  EXAM_STARTED: "Exam session started",
  EXAM_ENDED: "Exam session ended",
  WEBPAGE_OPENED: "Another webpage opened or activated",
  TAB_SWITCHED: "Another Chrome tab became active",
  AI_SITE_OPENED: "ChatGPT page opened or activated; usage is unverified",
  PDF_OPENED: "PDF opened or activated in Chrome",
  FORM_HIDDEN: "Google Form became hidden",
  FORM_VISIBLE: "Google Form became visible",
  WINDOW_FOCUS_LOST: "Examination window lost focus",
  WINDOW_FOCUS_RESTORED: "Examination window regained focus",
  FULLSCREEN_EXITED: "Fullscreen exited",
  FULLSCREEN_RESTORED: "Fullscreen entered or restored",
  COPY_ATTEMPT: "Copy attempted in Google Form",
  PASTE_ATTEMPT: "Paste attempted in Google Form",
  MONITORING_INTERRUPTED: "Monitoring was interrupted"
};

function response(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}
function error(status, message) { return response({ error: message }, status); }
function hex(bytes) { return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
async function digest(value) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))); }
function token(bytes = 24) { const array = new Uint8Array(bytes); crypto.getRandomValues(array); return hex(array); }
function base64url(bytes) { return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, ""); }
async function signature(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
function cookieValue(request) {
  return (request.headers.get("cookie") || "").split(";").map(part => part.trim())
    .find(part => part.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
}
async function teacherAuthorized(request, env) {
  if (!env.SESSION_SECRET) return false;
  const value = cookieValue(request);
  if (!value) return false;
  const [expires, nonce, mac] = value.split(".");
  if (!expires || !nonce || !mac || Number(expires) < Date.now()) return false;
  return safeEqual(mac, await signature(expires + "." + nonce, env.SESSION_SECRET));
}
function teacherCookie(value, request, maxAge = 8 * 60 * 60) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/api/teacher; Max-Age=${maxAge}${secure}`;
}
function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
async function body(request) {
  if (Number(request.headers.get("content-length") || 0) > 32_768) throw new Error("Request too large.");
  const raw = await request.text();
  if (raw.length > 32_768) throw new Error("Request too large.");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected a JSON object.");
  return parsed;
}
function studentCors(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return {};
  const allowed = (env.ALLOWED_EXTENSION_IDS || "").split(",").map(s => s.trim());
  if (!origin.startsWith("chrome-extension://") || !allowed.includes(origin.slice(19))) return null;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "Origin"
  };
}
function canonicalFormLink(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "docs.google.com") return null;
    const match = url.pathname.match(/^\/forms\/(?:u\/\d+\/)?d\/(?:e\/)?([^/]+)\/viewform\/?$/);
    if (!match) return null;
    return { formId: match[1], formUrl: `${url.origin}/forms/d/${url.pathname.includes('/d/e/') ? 'e/' : ''}${match[1]}/viewform` };
  } catch { return null; }
}
function route(request) { return new URL(request.url).pathname; }
async function sessionFor(request, env) {
  const credential = request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{48})$/)?.[1];
  if (!credential) return null;
  return env.DB.prepare("SELECT * FROM sessions WHERE token_hash = ?").bind(await digest(credential)).first();
}
function incidentDetails(item) {
  if (item.type === "DESKTOP_APP_ACTIVE") return {
    WORD: "Microsoft Word became active",
    NOTEPAD: "Notepad became active",
    PDF_READER: "PDF reader became active"
  }[item.appCategory];
  if (item.type === "MONITORING_INTERRUPTED" && item.source === "WINDOWS_HOST")
    return "Windows desktop monitoring disconnected; browser monitoring continues";
  return LABELS[item.type];
}
function validateIncident(item) {
  if (!item || typeof item !== "object" || !/^[\w-]{8,80}$/.test(item.id || "") ||
      !Number.isInteger(item.sequence) || item.sequence < 1 || !TYPES.has(item.type) ||
      !SEVERITIES.has(item.severity) || !SOURCES.has(item.source) ||
      !Number.isFinite(Date.parse(item.timestamp))) return null;
  const appCategory = item.appCategory ?? null;
  const hostname = item.hostname ?? null;
  if (appCategory !== null && (!CATEGORIES.has(appCategory) || item.source !== "WINDOWS_HOST")) return null;
  if (item.type === "DESKTOP_APP_ACTIVE" && (!appCategory || hostname !== null)) return null;
  if (hostname !== null && (item.source !== "CHROME" || typeof hostname !== "string" ||
      hostname.length > 253 || !/^[a-z0-9.-]+$/.test(hostname))) return null;
  const details = incidentDetails(item);
  if (!details) return null;
  return {
    id: item.id, sequence: item.sequence, timestamp: new Date(item.timestamp).toISOString(),
    type: item.type, severity: item.severity, details, source: item.source,
    appCategory, hostname,
    domainCategory: typeof item.domainCategory === "string" && /^[A-Z_]{1,40}$/.test(item.domainCategory)
      ? item.domainCategory : null
  };
}
async function teacherApi(request, env, path) {
  if (path === "/api/teacher/login" && request.method === "POST") {
    if (!sameOrigin(request)) return error(403, "Invalid origin.");
    if (!env.TEACHER_PASSWORD || !env.SESSION_SECRET) return error(503, "Teacher login is not configured.");
    const input = await body(request);
    const expected = await digest(env.TEACHER_PASSWORD);
    const provided = await digest(String(input.password || ""));
    if (!safeEqual(expected, provided)) return error(401, "Incorrect password.");
    const expires = String(Date.now() + 8 * 60 * 60 * 1000);
    const value = expires + "." + token(12);
    return response({ ok: true }, 200, { "set-cookie": teacherCookie(value + "." + await signature(value, env.SESSION_SECRET), request) });
  }
  if (!await teacherAuthorized(request, env)) return error(401, "Teacher sign-in required.");
  if (request.method !== "GET" && !sameOrigin(request)) return error(403, "Invalid origin.");
  if (path === "/api/teacher/me" && request.method === "GET") return response({ authenticated: true });
  if (path === "/api/teacher/logout" && request.method === "POST")
    return response({ ok: true }, 200, { "set-cookie": teacherCookie("", request, 0) });
  if (path === "/api/teacher/exams" && request.method === "GET") {
    const result = await env.DB.prepare("SELECT id, title, form_url, created_at, status FROM exams ORDER BY created_at DESC").all();
    return response({ exams: result.results });
  }
  if (path === "/api/teacher/exams" && request.method === "POST") {
    const input = await body(request);
    const title = String(input.title || "").trim();
    const form = canonicalFormLink(input.formUrl);
    if (!title || title.length > 120 || !form) return error(400, "Enter a title and a Google Forms respondent link.");
    const exam = { id: crypto.randomUUID(), title, ...form, createdAt: new Date().toISOString() };
    await env.DB.prepare("INSERT INTO exams (id,title,form_id,form_url,created_at) VALUES (?,?,?,?,?)")
      .bind(exam.id, title, form.formId, form.formUrl, exam.createdAt).run();
    return response({ exam }, 201);
  }
  const codeMatch = path.match(/^\/api\/teacher\/exams\/([a-f0-9-]+)\/codes$/);
  if (codeMatch && request.method === "POST") {
    const exam = await env.DB.prepare("SELECT id, status FROM exams WHERE id = ?").bind(codeMatch[1]).first();
    if (!exam || exam.status !== "OPEN") return error(404, "Open exam not found.");
    const input = await body(request);
    const ids = input.studentIds;
    if (!Array.isArray(ids) || !ids.length || ids.length > 100 ||
        ids.some(id => typeof id !== "string" || !/^[A-Za-z0-9_-]{2,40}$/.test(id)) ||
        new Set(ids).size !== ids.length) return error(400, "Enter up to 100 unique student IDs.");
    const now = new Date().toISOString();
    const codes = [];
    for (const studentId of ids) {
      const code = token(8);
      try {
        await env.DB.prepare("INSERT INTO join_codes (code_hash,exam_id,student_id,created_at) VALUES (?,?,?,?)")
          .bind(await digest(code), exam.id, studentId, now).run();
      } catch { return error(409, "A student ID already has a code for this exam."); }
      codes.push({ studentId, code });
    }
    return response({ codes }, 201);
  }
  const sessionsMatch = path.match(/^\/api\/teacher\/exams\/([a-f0-9-]+)\/sessions$/);
  if (sessionsMatch && request.method === "GET") {
    const result = await env.DB.prepare(`SELECT s.id,c.student_id,COALESCE(s.status,'NOT_PAIRED') AS status,s.paired_at,s.started_at,
      s.ended_at,s.end_reason,s.last_contact,s.last_sequence,
      (SELECT COUNT(*) FROM incidents i WHERE i.session_id=s.id) AS event_count
      FROM join_codes c LEFT JOIN sessions s ON s.exam_id=c.exam_id AND s.student_id=c.student_id
      WHERE c.exam_id=? ORDER BY c.created_at DESC,c.student_id`).bind(sessionsMatch[1]).all();
    const sessions = result.results.map(s => ({
      ...s, connection: s.status === "ACTIVE"
        ? (!s.last_contact || Date.now() - Date.parse(s.last_contact) > GAP_MS ? "GAP" : "CONNECTED")
        : s.status
    }));
    return response({ sessions });
  }
  const reportMatch = path.match(/^\/api\/teacher\/sessions\/([a-f0-9-]+)\/report\.json$/);
  if (reportMatch && request.method === "GET") {
    const session = await env.DB.prepare(`SELECT s.*, e.title AS exam_title FROM sessions s
      JOIN exams e ON e.id=s.exam_id WHERE s.id=?`).bind(reportMatch[1]).first();
    if (!session) return error(404, "Session not found.");
    const events = await env.DB.prepare("SELECT * FROM incidents WHERE session_id=? ORDER BY sequence")
      .bind(session.id).all();
    const report = {
      project: "Google Forms Exam Integrity Monitor",
      exportedAt: new Date().toISOString(),
      exam: { id: session.exam_id, title: session.exam_title },
      studentId: session.student_id,
      session: {
        id: session.id, startedAt: session.started_at, endedAt: session.ended_at,
        endReason: session.end_reason, lastContact: session.last_contact,
        status: session.status
      },
      incidents: events.results.map(row => ({
        id: row.id, sessionId: session.id, sequence: row.sequence, timestamp: row.timestamp,
        receivedAt: row.received_at, type: row.type, severity: row.severity,
        details: row.details, source: row.source, appCategory: row.app_category,
        hostname: row.hostname, domainCategory: row.domain_category
      })),
      note: "Incidents are observations for review, not proof of cheating."
    };
    return response(report, 200, { "content-disposition": `attachment; filename="exam-report-${session.id.slice(0,8)}.json"` });
  }
  return error(404, "Teacher route not found.");
}
async function studentApi(request, env, path) {
  if (path === "/api/student/pair" && request.method === "POST") {
    const input = await body(request);
    if (!/^[a-f0-9]{16}$/.test(input.code || "")) return error(400, "Invalid join code.");
    const codeHash = await digest(input.code);
    const row = await env.DB.prepare(`SELECT c.*,e.title,e.form_id,e.form_url,e.status AS exam_status
      FROM join_codes c JOIN exams e ON e.id=c.exam_id WHERE c.code_hash=?`).bind(codeHash).first();
    if (!row || row.used_at || row.exam_status !== "OPEN") return error(403, "Code is invalid or already used.");
    const sessionId = crypto.randomUUID();
    const credential = token();
    const now = new Date().toISOString();
    let results;
    try { results = await env.DB.batch([
      env.DB.prepare("UPDATE join_codes SET used_at=? WHERE code_hash=? AND used_at IS NULL").bind(now, codeHash),
      env.DB.prepare(`INSERT INTO sessions
        (id,exam_id,student_id,token_hash,status,paired_at)
        SELECT ?,exam_id,student_id,?,?,? FROM join_codes WHERE code_hash=? AND used_at=?`)
        .bind(sessionId,await digest(credential),"PAIRED",now,codeHash,now)
    ]); } catch { return error(403, "Code is invalid or already used."); }
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1)
      return error(403, "Code is already used.");
    return response({
      sessionId, credential, examId: row.exam_id, examTitle: row.title,
      studentId: row.student_id, formId: row.form_id, formUrl: row.form_url
    }, 201);
  }
  const session = await sessionFor(request, env);
  if (!session) return error(401, "Session credential required.");
  if (path === "/api/student/start" && request.method === "POST") {
    if (session.status === "ACTIVE") return response({ ok: true });
    if (session.status !== "PAIRED") return error(409, "Session cannot be started.");
    const now = new Date().toISOString();
    await env.DB.prepare("UPDATE sessions SET status='ACTIVE',started_at=?,last_contact=? WHERE id=?")
      .bind(now,now,session.id).run();
    return response({ ok: true });
  }
  if (path === "/api/student/events" && request.method === "POST") {
    if (session.status !== "ACTIVE") return error(409, "Session is not active.");
    const input = await body(request);
    if (!Array.isArray(input.incidents) || !input.incidents.length || input.incidents.length > 50)
      return error(400, "Send 1 to 50 incidents.");
    let last = session.last_sequence;
    for (const raw of input.incidents) {
      const item = validateIncident(raw);
      if (!item) return error(400, "Invalid incident.");
      const existing = await env.DB.prepare("SELECT id,session_id,sequence FROM incidents WHERE id=?").bind(item.id).first();
      if (existing) {
        if (existing.session_id !== session.id || existing.sequence !== item.sequence)
          return error(409, "Incident ID conflict.");
        continue;
      }
      if (item.sequence !== last + 1) return error(409, "Incident sequence gap.");
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO incidents
          (id,session_id,sequence,timestamp,received_at,type,severity,details,source,app_category,hostname,domain_category)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(item.id,session.id,item.sequence,item.timestamp,now,item.type,item.severity,item.details,
            item.source,item.appCategory,item.hostname,item.domainCategory),
        env.DB.prepare("UPDATE sessions SET last_sequence=?,last_contact=? WHERE id=?").bind(item.sequence,now,session.id)
      ]);
      last = item.sequence;
    }
    return response({ acknowledgedSequence: last });
  }
  if (path === "/api/student/heartbeat" && request.method === "POST") {
    if (session.status !== "ACTIVE") return error(409, "Session is not active.");
    await env.DB.prepare("UPDATE sessions SET last_contact=? WHERE id=?").bind(new Date().toISOString(),session.id).run();
    return response({ ok: true });
  }
  if (path === "/api/student/end" && request.method === "POST") {
    const input = await body(request);
    if (!END_REASONS.has(input.reason) || !Number.isInteger(input.lastSequence))
      return error(400, "Invalid end request.");
    if (session.status === "ENDED") return response({ ok: true });
    if (session.status !== "ACTIVE" || session.last_sequence !== input.lastSequence)
      return error(409, "Send all incidents before ending.");
    const now = new Date().toISOString();
    await env.DB.prepare(`UPDATE sessions SET status='ENDED',ended_at=?,end_reason=?,last_contact=? WHERE id=?`)
      .bind(now,input.reason,now,session.id).run();
    return response({ ok: true });
  }
  return error(404, "Student route not found.");
}

export default {
  async fetch(request, env) {
    try {
      const path = route(request);
      if (path.startsWith("/api/teacher/")) return teacherApi(request, env, path);
      if (path.startsWith("/api/student/")) {
        const headers = studentCors(request, env);
        if (!headers) return error(403, "Extension origin is not allowed.");
        if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
        const result = await studentApi(request, env, path);
        const copied = new Response(result.body, result);
        Object.entries(headers).forEach(([name, value]) => copied.headers.set(name, value));
        return copied;
      }
      return env.ASSETS.fetch(request);
    } catch (cause) {
      if (cause instanceof SyntaxError) return error(400, "Invalid JSON.");
      if (cause?.message === "Request too large.") return error(413, cause.message);
      if (cause?.message === "Expected a JSON object.") return error(400, cause.message);
      console.error("Teacher service error", cause);
      return error(500, "Service error.");
    }
  },
  async scheduled(_event, env) {
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
    await env.DB.prepare("DELETE FROM incidents WHERE session_id IN (SELECT id FROM sessions WHERE COALESCE(ended_at,paired_at) < ?)")
      .bind(cutoff).run();
    await env.DB.prepare("DELETE FROM sessions WHERE COALESCE(ended_at,paired_at) < ?").bind(cutoff).run();
    await env.DB.prepare("DELETE FROM join_codes WHERE created_at < ?").bind(cutoff).run();
    await env.DB.prepare("DELETE FROM exams WHERE created_at < ? AND NOT EXISTS (SELECT 1 FROM sessions WHERE exam_id=exams.id)")
      .bind(cutoff).run();
  }
};
