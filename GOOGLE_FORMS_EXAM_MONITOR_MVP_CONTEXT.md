# Google Forms Exam Integrity Monitor — MVP Project Context

> Use this document as the authoritative context for this project. Read it before proposing or implementing changes. The deadline is **Monday evening**, giving the team roughly **2–3 days**. Favor a small working prototype over a large incomplete system.

## 1. Project Overview

We are building a lightweight examination-integrity monitoring prototype primarily for examinations delivered through Google Forms.

The system should record behaviors that may indicate an examination-policy violation. It must not automatically declare that a student cheated. It should generate a timestamped incident report for teacher review.

The first version will be a **Google Chrome extension**. It should work on Google Forms respondent pages and monitor browser-level behavior during an active examination session.

## 2. Deadline and Development Rule

- Start: Saturday
- Target completion: Monday evening
- Available time: approximately 2–3 days
- Primary rule: **Do not over-engineer the project.**
- Complete and test one phase before beginning the next phase.
- Do not introduce a database, authentication system, desktop application, machine learning, or complex framework unless the current phase is already complete and stable.
- Use plain HTML, CSS, and JavaScript wherever possible.

## 3. Honest Scope

### What the MVP can detect

- Leaving the Google Form tab
- Activating or creating another Chrome tab
- Opening known AI or online-document websites in Chrome
- The examination page losing visibility or focus
- Exiting fullscreen
- Minimizing or resizing the examination window
- Copy and paste attempts inside the Google Form
- Common screenshot-key attempts while the form is focused
- Approximate active time spent on each question
- Start and end of the examination session

### What the MVP cannot reliably detect

- The exact desktop application opened after Chrome loses focus
- Whether the student specifically opened Notepad, Microsoft Word, or a desktop PDF reader
- Every type of screenshot or screen-recording method
- Use of another browser, phone, tablet, virtual machine, or second computer
- A student photographing the screen using an external device
- Definitive proof of cheating

For the prototype, opening another desktop application should be reported as **“Examination window lost focus”** or **“Possible external application activity.”** Specific desktop-application detection belongs to a future Windows companion application.

## 4. Target Platform

- Browser: Google Chrome
- Examination interface: Google Forms
- Extension standard: Chrome Extension Manifest V3
- Development language: Vanilla JavaScript
- Storage for the first version: `chrome.storage.local`
- Report format: On-screen incident timeline plus JSON or CSV export
- Operating system for demonstration: Windows 10 or Windows 11

## 5. Minimal Architecture

```text
Google Form respondent page
        |
        v
Content script
  - page visibility
  - fullscreen state
  - resize/focus events
  - copy/paste attempts
  - question interaction timing
        |
        v
Extension service worker
  - tab creation/activation
  - active URL classification
  - examination session state
  - incident recording
        |
        v
chrome.storage.local
        |
        v
Extension popup/report
  - start/end examination
  - monitoring status
  - incident timeline
  - JSON/CSV export
```

The MVP does not require a remote backend. Local storage is acceptable for the classroom demonstration. A backend may be introduced only in a later phase if the core monitoring features already work.

## 6. Feature Development Phases

## Phase 1 — Core Monitoring MVP

**Deadline target: Saturday to Sunday morning**

This phase must be completed before any optional work.

### Required features

1. Extension loads only on supported Google Forms respondent URLs.
2. Popup contains a `Start Examination` button.
3. Starting an examination creates a unique local session ID and start timestamp.
4. Student identifier and examination name may be entered manually before starting.
5. Starting requests fullscreen mode from the Google Form page.
6. Record when the form becomes hidden or visible.
7. Record when the form window loses or regains focus.
8. Record fullscreen exit and re-entry.
9. Record major window resizing during an active examination.
10. Record active-tab changes and new-tab creation.
11. Record the active domain when permitted.
12. Classify known AI and document domains.
13. Record copy and paste attempts.
14. Record common screenshot-key attempts such as `PrintScreen` when detectable.
15. Provide an `End Examination` action.
16. Save all incidents in `chrome.storage.local`.

### Required incident fields

```json
{
  "id": "event-id",
  "sessionId": "session-id",
  "timestamp": "ISO-8601 timestamp",
  "type": "TAB_SWITCHED",
  "severity": "MEDIUM",
  "details": "Student activated another browser tab",
  "durationMs": null,
  "questionNumber": null,
  "domainCategory": null
}
```

### Suggested event types

```text
EXAM_STARTED
EXAM_ENDED
FORM_HIDDEN
FORM_VISIBLE
WINDOW_FOCUS_LOST
WINDOW_FOCUS_RESTORED
FULLSCREEN_EXITED
FULLSCREEN_RESTORED
WINDOW_RESIZED
TAB_CREATED
TAB_SWITCHED
AI_SITE_OPENED
DOCUMENT_SITE_OPENED
COPY_ATTEMPT
PASTE_ATTEMPT
SCREENSHOT_KEY_ATTEMPT
QUESTION_FOCUSED
QUESTION_CHANGED
MONITORING_INTERRUPTED
```

### Suggested severity rules

| Event | Severity |
|---|---|
| Focus loss shorter than 3 seconds | Low |
| Major resize or fullscreen exit | Medium |
| New or different tab activated | Medium |
| Online document platform opened | Medium |
| Known AI platform opened | High |
| Paste attempt | High |
| Screenshot-key attempt | High |
| Monitoring interrupted during examination | High |

Severity is only a review aid. It must not automatically fail the examinee.

## Phase 2 — Question Timing and Usable Report

**Deadline target: Sunday afternoon to Monday morning**

Begin only after Phase 1 works reliably.

### Question timing

- Detect interaction with Google Forms question containers.
- Assign questions an index based on their order on the page.
- Start timing when the student clicks, focuses, types in, or changes an input within a question.
- Stop the active timer when the student interacts with another question, the form becomes hidden, focus is lost, or the examination ends.
- Accumulate time when the student returns to a previous question.
- Record first interaction, latest interaction, active duration, and revisit count.
- Describe the result as **estimated active time per question**, not exact thinking time.
- Do not store question text or student answers unless explicitly required later.

### Popup/report requirements

- Display whether monitoring is active.
- Display the current student identifier and session ID.
- Display session start time and elapsed time.
- Display total incidents grouped by severity.
- Display a chronological incident list.
- Display estimated timing per question.
- Export the active or most recent session as JSON.
- Export CSV only if time remains.
- Provide a clear-data button with confirmation.

## Phase 3 — Optional Improvements

**Deadline target: Monday, only if Phases 1 and 2 are stable**

Choose only one or two:

- Configurable prohibited-domain list
- Configurable grace period for brief focus loss
- Cleaner report design
- CSV export
- Examination countdown timer
- Warning banner when a violation occurs
- Local offline event queue validation
- Simple summary score clearly labeled as an incident-risk score
- Basic Node/Express endpoint for receiving session reports

Do not sacrifice testing of the core features to complete Phase 3.

## Phase 4 — Future Work, Not for the Current Deadline

These features should appear in the documentation or presentation as future enhancements:

- Windows companion application written in C#/.NET
- Detection of the foreground desktop process
- Identification of Notepad, Word, PDF readers, and other browsers
- Better split-screen and multiple-monitor detection
- Stronger screenshot-shortcut detection
- Teacher web dashboard
- Multiple simultaneous examinees
- Authentication and role-based access
- Node/Express API and PostgreSQL database
- Centralized reports and real-time monitoring
- Institution-managed kiosk or secure-browser mode

Do not implement Phase 4 unless the user explicitly changes the deadline or scope.

## 7. Initial Prohibited-Domain Categories

Use a small configurable object. Compare hostnames, not full URLs.

```javascript
const prohibitedDomains = {
  "chatgpt.com": "AI_PLATFORM",
  "gemini.google.com": "AI_PLATFORM",
  "claude.ai": "AI_PLATFORM",
  "copilot.microsoft.com": "AI_PLATFORM",
  "perplexity.ai": "AI_PLATFORM",
  "docs.google.com": "DOCUMENT_PLATFORM",
  "drive.google.com": "DOCUMENT_PLATFORM",
  "office.com": "DOCUMENT_PLATFORM"
};
```

The active Google Forms domain must always be allowed. Do not store unnecessarily detailed browsing history. Store only the hostname and category needed for the incident report.

## 8. Recommended File Structure

```text
google-forms-exam-monitor/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.css
├── popup.js
├── options.html          # optional, Phase 3 only
├── options.js            # optional, Phase 3 only
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
└── docs/
    ├── TESTING_CHECKLIST.md
    └── LIMITATIONS.md
```

Keep logic separated by responsibility:

- `content.js`: events that happen inside the Google Form page
- `background.js`: browser tabs, windows, session coordination, and storage
- `popup.js`: user controls and report rendering

Do not introduce React, TypeScript, a bundler, a database, or a large folder structure for the initial version.

## 9. Suggested Team Workstreams

If several members are available, divide work by file ownership to avoid conflicts:

### Workstream A — Browser monitoring

- `manifest.json`
- `background.js`
- Tab creation and activation
- Domain classification
- Event persistence

### Workstream B — Google Forms monitoring

- `content.js`
- Visibility, focus, fullscreen, and resize events
- Copy/paste and screenshot-key attempts
- Question interaction timing

### Workstream C — Interface and validation

- `popup.html`, `popup.css`, and `popup.js`
- Start/end controls
- Incident timeline and summary
- Export function
- Manual testing and documentation

Before merging, agree on the event object structure and message names. Do not let each workstream create a different schema.

## 10. Development Schedule

### Saturday — Working skeleton

- Create extension structure and manifest.
- Confirm the extension loads through Chrome's unpacked-extension mode.
- Confirm the content script runs only on the target Google Form.
- Implement start/end session state.
- Implement storage and a basic popup.
- Implement visibility, focus, and fullscreen events.

### Sunday — Complete core features

- Implement tab creation and activation monitoring.
- Add AI/document domain classification.
- Add resize, copy, paste, and screenshot-key attempt events.
- Implement question interaction timing.
- Render the incident timeline and summary.
- Add JSON export.

### Monday — Stabilize and present

- Test every required scenario.
- Fix duplicate events and inaccurate state transitions.
- Improve labels and basic layout.
- Complete README, limitations, and testing checklist.
- Prepare a sample Google Form and scripted live demonstration.
- Stop adding features several hours before presentation or submission.

## 11. Manual Testing Checklist

The MVP is ready only when the following are demonstrated:

- [ ] Extension loads without manifest or console errors.
- [ ] Monitoring remains inactive until `Start Examination` is clicked.
- [ ] Starting creates one examination session.
- [ ] Events are attached to the correct session.
- [ ] Switching tabs records one understandable incident.
- [ ] Opening a known AI site records an `AI_SITE_OPENED` incident.
- [ ] Opening an online-document site records a document incident.
- [ ] Minimizing or obscuring the form records visibility/focus loss.
- [ ] Exiting fullscreen records an incident.
- [ ] Resizing the examination window records an incident without flooding the log.
- [ ] Copy and paste attempts are recorded.
- [ ] A detectable screenshot-key attempt is recorded.
- [ ] Interacting with different questions updates approximate timing.
- [ ] Ending the examination stops new examination incidents.
- [ ] Refreshing the popup does not erase the active session.
- [ ] The report remains available after reopening the popup.
- [ ] JSON export produces a readable valid file.
- [ ] Clear-data action asks for confirmation.

## 12. Implementation Guardrails for Codex

When working on this project:

1. Inspect the existing repository before creating or changing files.
2. State which phase and acceptance criterion the current task addresses.
3. Implement the smallest complete change possible.
4. Do not rewrite unrelated files.
5. Do not add dependencies unless the feature cannot reasonably be implemented with browser APIs.
6. Do not build the future Windows companion during the current deadline.
7. Do not build machine-learning cheating detection.
8. Do not claim that focus loss proves a particular application was opened.
9. Do not collect question text, answers, keystroke contents, full browsing history, screenshots, webcam recordings, or microphone recordings.
10. Deduplicate rapid browser events so one action does not produce many identical incidents.
11. Use a small grace period for accidental focus transitions where appropriate.
12. Preserve sessions across popup closure using `chrome.storage.local`.
13. After every change, provide exact manual testing steps.
14. Prefer clear code and comments over abstractions designed for hypothetical future scale.
15. If a requested feature is impossible through a Chrome extension, explain the limitation and propose a lightweight approximation instead of pretending it is reliable.

## 13. Definition of Done

The project is complete for the current deadline when:

1. The unpacked Chrome extension can start and end a monitored Google Forms session.
2. It records tab, visibility, focus, fullscreen, resize, prohibited-domain, copy/paste, and screenshot-key events that are technically detectable.
3. It records approximate active time per question.
4. It persists events locally and displays a readable report.
5. The report can be exported as JSON.
6. All major features have been manually tested using a prepared Google Form.
7. Known limitations are documented honestly.
8. The live demonstration can be completed without editing code.

## 14. Suggested Project Description

> The Google Forms Exam Integrity Monitor is a Chrome-extension prototype that records browser-based behaviors that may indicate examination-policy violations. It monitors tab changes, focus and visibility loss, fullscreen violations, prohibited websites, copy-and-paste attempts, screenshot-key attempts, and estimated active time per question. It generates an incident report for instructor review rather than automatically accusing or penalizing the examinee. Desktop-application identification and stronger device monitoring are reserved for a future Windows companion application.

## 15. Immediate First Task for Codex

Use this prompt after attaching this context:

```text
Read the attached project context and inspect the current workspace. Begin with Phase 1 only. If no project exists, create the minimal Manifest V3 Chrome-extension structure described in the context. Implement session start/end, shared incident storage, Google Forms page detection, visibility/focus monitoring, fullscreen monitoring, and a basic popup that shows monitoring status and recent incidents. Do not add React, TypeScript, a backend, a database, or desktop monitoring. After implementation, explain each file simply and give exact steps for loading and testing the unpacked extension in Chrome.
```

