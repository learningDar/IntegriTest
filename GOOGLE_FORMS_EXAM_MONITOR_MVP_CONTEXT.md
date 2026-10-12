# IntegriTest — MVP Context

> This is the authoritative project scope for the Monday evening, October 12, 2026 demonstration (Asia/Manila). The original proposal is preserved in Git on `main`. Phases 1 and 2 passed on the development machine. Finish and test each remaining phase before moving to the next; do not present planned remote behavior as working.

## Purpose and success criterion

Build a small examination-integrity prototype for a Google Forms respondent page. It records observable browser and Windows foreground activity as timestamped incidents for teacher review. An incident is not proof of cheating. Opening ChatGPT is observable; whether the student used it is not.

The tested local implementation uses a Chrome Manifest V3 extension, vanilla HTML/CSS/JavaScript, `chrome.storage.local`, and a small Windows native messaging host. Phase 3 adds a teacher service and automatic incident delivery so a teacher can review sessions from another device. There is no machine learning, webcam, microphone, screenshot capture, or answer collection in this deadline.

## Required MVP demonstrations

| Request | Observable signal | Incident/report wording |
| --- | --- | --- |
| Google Forms | Start and end a session on a supported respondent page | Exam session started/ended |
| Opening another webpage | New tab or navigation to and activation of another page in Chrome | Webpage opened or activated; hostname only |
| Using ChatGPT | `chatgpt.com` (and verified aliases) opened or activated in Chrome | ChatGPT page opened or activated; usage unproven |
| Opening Word | `WINWORD.EXE` becomes the Windows foreground process | Microsoft Word became active |
| Opening Notes | Windows `notepad.exe` becomes the foreground process | Notepad became active |
| Opening PDF | A PDF is identifiable in Chrome or a supported dedicated PDF reader becomes foreground | PDF opened in Chrome / PDF reader became active |

Desktop events mean the application became foreground, not that a document was opened or read. Initial dedicated-reader mapping should include Acrobat Reader/Acrobat, Foxit PDF Reader, and SumatraPDF, with each installed demo reader verified before claiming support. Edge or an unrecognized viewer is reported as generic external activity unless reliable PDF identification is demonstrated. An ordinary Chrome focus-loss event must never be labeled Word, Notepad, or PDF without native-host evidence.

## Other required behavior

- The popup starts and ends exactly one active local session, displays monitoring status and a chronological incident timeline, and exports that session as valid JSON.
- Monitor tab creation/activation, form visibility and focus loss/restoration, fullscreen exit/restoration, and copy/paste attempts on the form.
- Persist session state and incidents in `chrome.storage.local` across popup closure. Deduplicate closely related browser and native events so one action gives one understandable incident where possible.
- Record a monitoring interruption if the native host disconnects while an exam is active. Continue browser monitoring and make the missing desktop signal visible in the report.
- Keep incident payloads to category, timestamp, and needed hostname, plus the existing event contract fields. Phase 3 may add pseudonymous participant/session IDs and authentication/connection metadata needed to deliver and review reports. Do not save full URLs, page titles, window titles, file paths, question text, answers, typed content, screenshots, or full browsing history.
- Classify incidents for review; never auto-fail an examinee. Ended sessions must receive no further exam incidents.
- In Phase 3, send the same minimal incident data to a teacher service automatically, show live session and connection status to the teacher, and retain local JSON export as a fallback. A missed heartbeat is a monitoring gap, not a cheating verdict.

Question timing, screenshot-key detection, window-resize detection, CSV export, configurable rules, countdowns, scores, and advanced analytics remain outside the required MVP. The Phase 3 teacher view is limited to participant/session status, incident timeline, and monitoring gaps. Do not add optional features before its gate passes.

## Architecture and data contract

```text
Google Forms respondent page → content script ┐
Chrome tabs/windows events → MV3 service worker ├→ chrome.storage.local → popup/timeline/JSON
Windows foreground app → native messaging host ┘
```

Phase 3 extends this tested local path: the extension queues session events and sends them to an authenticated teacher service, which stores only the minimal report data and exposes a teacher-only session list and incident timeline. Use localhost for the first gate and HTTPS for the deployed gate. Local capture and JSON export continue if the service is temporarily unreachable. The teacher view is a review interface, not a live screen feed.

- `content.js`: form-specific visibility, focus, fullscreen, and copy/paste events. It sends no student answer content.
- `background.js`: session state, browser tab/window signals, domain classification, native-host connection, deduplication, and storage.
- `popup.html`, `popup.css`, `popup.js`: session controls, host status, incident report, and JSON export.
- Windows host: a minimal C# executable compiled with the available .NET Framework `csc.exe`. It identifies only the foreground process category and sends that category with a timestamp through Chrome native messaging. A setup script registers its host manifest for the unpacked extension ID under the current user's registry hive.

Use the existing incident fields and add `source`, optional `appCategory`, and optional `hostname`:

```json
{
  "id": "event-id",
  "sessionId": "session-id",
  "timestamp": "ISO-8601 timestamp",
  "type": "DESKTOP_APP_ACTIVE",
  "severity": "MEDIUM",
  "details": "Microsoft Word became active",
  "durationMs": null,
  "questionNumber": null,
  "domainCategory": null,
  "source": "WINDOWS_HOST",
  "appCategory": "WORD",
  "hostname": null
}
```

Browser events use `source: "CHROME"`, a hostname where relevant, and no app category. The host sends only `FOREGROUND_CHANGED` with `appCategory` (`WORD`, `NOTEPAD`, `PDF_READER`, or `OTHER`) and timestamp; the extension creates the persisted incident. Relevant browser incident types include `EXAM_STARTED`, `EXAM_ENDED`, `WEBPAGE_OPENED`, `TAB_SWITCHED`, `AI_SITE_OPENED`, `PDF_OPENED`, `FORM_HIDDEN`, `WINDOW_FOCUS_LOST`, `FULLSCREEN_EXITED`, `COPY_ATTEMPT`, `PASTE_ATTEMPT`, and `MONITORING_INTERRUPTED`. Severity is a review aid, not a verdict.

Use the `tabs` permission to inspect active tab hostnames and `nativeMessaging` for the Windows host. Validate messages from the Forms content script. Scope the content script to supported Forms respondent URLs; the service worker handles tab and window events only during an active session. The native host must use Chrome's length-prefixed UTF-8 JSON protocol. See [Chrome native messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging) and [service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).

## Phase deliverables and gates

### Phase 0 — project setup (first published branch)

Revise this context, add five project skills and `AGENTS.md`, initialize all requested README sections, validate the skill manifests and document consistency, then publish `feat/exam-monitor-mvp` to the private GitHub repository. This phase does not claim working monitoring or test results.

### Phase 1 — browser monitoring

Implement the Chrome extension, local session storage, popup, browser events, ChatGPT hostname classification, Chrome PDF identification where observable, timeline, and JSON export. Gate: load unpacked in Chrome and demonstrate start/end, webpage and ChatGPT detection, focus/fullscreen/copy-paste, persistence, deduplication, and valid export. Update README after the gate passes.

### Phase 2 — Windows foreground monitoring

Implement and register the C# native messaging host; classify Word, Notepad, and supported PDF readers; show host health and interruption. Gate: demonstrate each supported app on the demo machine, a PDF in Chrome, host disconnect, and no incidents after ending. Update README after the gate passes.

### Phase 3 — remote teacher monitoring

The professor publishes a Google Form, then registers its respondent link in a password-protected teacher view. A reusable class roster is imported from the first sheet of an .xlsx file with Student ID and Name columns, validated in the browser, and assigned to the exam. Each roster entry receives a fresh one-time join code. Manual ID-only assignment remains available. The Form does not need a Student ID question; the professor matches responses to roster entries separately. The student pairs the extension with that code and opens the registered Form. A warning lists other tabs in the same Chrome window without blocking Start. The teacher service issues a session credential, receives start/end, incident, and heartbeat messages, deduplicates retries by incident ID and sequence, and records last contact. The extension queues unsent events locally and retries after a connection gap. A confirmed Form submission ends monitoring automatically; failed validation does not, and manual End remains available. The teacher view refreshes every 10 seconds and lists unpaired, active, ended, and connection-gap sessions and shows incident timelines without full URLs, answers, document names, or automatic verdicts. The server creates the teacher JSON report; the student's local JSON is a delivery fallback. Records are removed after 30 days. Build and test a local teacher/student demo first, then deploy the same Worker and D1 schema to reachable HTTPS.

Gate: first verify the full student/teacher flow on a local server in separate browser contexts, including a fresh Chrome setup, failed Form validation, confirmed submission, manual End, app categories, and the public setup page. Then, from a separate device through a reachable HTTPS deployment, the teacher sees a paired student session appear without receiving a file, sees webpage/ChatGPT/Word/Notepad/PDF signals arrive, and sees a connection gap when the client stops contacting the server. Verify teacher access control, wrong/reused codes, duplicate/retried events, correct session boundaries, local capture while offline, recovery after reconnect, 30-day deletion, and server-side privacy fields. A local-only dashboard does not pass the remote gate. Record actual results in the README at each passed checkpoint; do not claim remote monitoring until the deployed gate passes.

### Phase 4 — final QA and presentation

Run the full browser, desktop, and remote scenario checklist on a prepared Google Form; fix false labels, duplicate incidents, access failures, and setup failures; capture reproducible test evidence in the README; rehearse the student and teacher demonstration. Stop feature additions several hours before the Monday evening presentation. If the remote gate is incomplete, show the passed local MVP and identify Phase 3 as pending.

## Limitations and testing rules

The extension cannot observe another browser or device. The native host sees the Windows foreground process, not what a student did inside it. A PDF in an unsupported reader, protected browser page, or `file://` location may be unclassifiable. Screenshot shortcuts are not reliable evidence and are deferred. Local storage can be cleared or altered by someone controlling the machine. Remote delivery will make absent reports and connection gaps visible, but it will not prove the student kept monitoring enabled or establish identity on an unmanaged device.

Test incidents against the correct session, confirm no recording before start or after end, and verify that the exported JSON matches the visible report. The testing skill owns repeatable checks; the QA skill performs the acceptance review; the documentation skill records only passed behavior and actual results. README edits remain allowed whenever useful, but passing a phase gate is the normal documentation checkpoint.
