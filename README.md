# Google Forms Exam Integrity Monitor

## PROJECT OVERVIEW

A planned Chrome extension and small Windows companion will record examination activity during a Google Forms session. It will produce a timestamped incident report for a teacher to review. Phase 0 establishes the scope and project workflow; monitoring code is not yet implemented.

## PROBLEM STATEMENT

A Google Forms exam alone provides limited visibility into tab changes, other webpages, and desktop apps. The project aims to make observable activity reviewable without claiming that an event proves cheating.

## PROJECT OBJECTIVES

- Demonstrate a monitored Google Forms session and an exportable incident timeline.
- Detect another Chrome webpage and a ChatGPT page opened or activated during the session.
- Identify Word, Notepad, and a supported PDF reader when they become the Windows foreground app; identify a PDF in Chrome when observable.
- Preserve evidence labels and limitations so an instructor can interpret events fairly.

## SYSTEM FEATURES

**Required MVP, planned:** start/end session, tab and webpage events, ChatGPT hostname classification, foreground Word/Notepad/PDF-reader classification, Chrome PDF identification, form focus/visibility/fullscreen and copy/paste attempts, local incident timeline, and JSON export. Question timing, screenshot-key detection, resize events, and CSV export are deferred until the required demonstrations pass.

## SYSTEM ARCHITECTURE / COMPONENTS

The planned Manifest V3 extension has a Google Forms content script, a service worker for session and browser events, and a popup for control and reporting. A C# Windows native messaging host supplies foreground app categories. `chrome.storage.local` holds local sessions and incidents. No remote backend is planned for this deadline.

## SYSTEM WORKFLOW

The student opens a supported Google Form, starts monitoring in the popup, and takes the exam. The extension records observable browser events; the Windows host reports foreground app categories. The student ends the session, then the report can be reviewed and exported. Incidents are review prompts, not automatic findings.

## TOOLS & TECHNOLOGIES

Planned: Google Chrome, Chrome Extension Manifest V3, vanilla JavaScript/HTML/CSS, Chrome storage and native messaging APIs, Windows, and a minimal C# host compiled with the available .NET Framework compiler. Git and GitHub hold the project source.

## INSTALLATION / SETUP

Phase 0 contains project documentation only. Unpacked extension loading, native host compilation and registration, and exact prerequisites will be documented after those components are built and tested. Do not use this repository as a working monitor yet.

## USER GUIDE

Pending implementation and Phase 1/2 verification. The intended controls are Start Examination, End Examination, incident timeline, host status, and Export JSON.

## QUALITY ASSURANCE & TESTING

Phase gates and required demonstrations are defined in `GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md`. Testing will cover correct session attachment, event deduplication, persistence, export validity, desktop-host interruption, privacy boundaries, and no incidents after ending.

## TEST RESULTS

Phase 0 local checks (October 10, 2026): all five project skills passed `quick_validate.py` with UTF-8 enabled; a content check confirmed all 14 requested README headings and the six priority monitoring areas in the MVP context. No application tests have run because monitoring code is not yet implemented. Record dated commands, manual scenarios, outcomes, and unresolved defects here after each later phase passes.

## LIMITATIONS

Opening ChatGPT does not prove its use. A foreground app event does not prove a document was opened or read. Another browser or device, unsupported PDF viewer, and some Chrome PDF locations may be unobservable. The local report is a prototype record, not tamper-proof evidence.

## CONCLUSION

Pending completion and testing of the browser and desktop phases.

## APPENDICES

- [Authoritative MVP context](GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md)
- Original context: Git `main`
- Project workflows: `.agents/skills/` and `AGENTS.md`
