# Google Forms Exam Integrity Monitor

## PROJECT OVERVIEW

The Chrome extension records observable activity during a Google Forms session and produces a timestamped incident report for teacher review. Browser code and automated checks are present; the required hands-on Chrome demonstration is pending. The Windows companion remains planned.

## PROBLEM STATEMENT

A Google Forms exam alone provides limited visibility into tab changes, other webpages, and desktop apps. The project aims to make observable activity reviewable without claiming that an event proves cheating.

## PROJECT OBJECTIVES

- Demonstrate a monitored Google Forms session and an exportable incident timeline.
- Detect another Chrome webpage and a ChatGPT page opened or activated during the session.
- Identify Word, Notepad, and a supported PDF reader when they become the Windows foreground app; identify a PDF in Chrome when observable.
- Preserve evidence labels and limitations so an instructor can interpret events fairly.

## SYSTEM FEATURES

**Browser phase, implemented but pending Chrome verification:** start/end session, tab and webpage events, ChatGPT hostname classification, Chrome PDF URL identification, form focus/visibility/fullscreen and copy/paste attempts, local incident timeline, and JSON export. Foreground Word/Notepad/PDF-reader classification remains planned for the Windows phase. Question timing, screenshot-key detection, resize events, and CSV export are deferred.

## SYSTEM ARCHITECTURE / COMPONENTS

The Manifest V3 extension has a Google Forms content script, a service worker for session and browser events, and a popup for control and reporting. `chrome.storage.local` holds local sessions and incidents. A C# Windows native messaging host is planned to supply foreground app categories. No remote backend is planned for this deadline.

## SYSTEM WORKFLOW

The student opens a supported Google Form, starts monitoring in the popup, and takes the exam. The extension records observable browser events; the Windows host reports foreground app categories. The student ends the session, then the report can be reviewed and exported. Incidents are review prompts, not automatic findings.

## TOOLS & TECHNOLOGIES

Current: Google Chrome, Chrome Extension Manifest V3, vanilla JavaScript/HTML/CSS, Chrome storage API, and Node.js built-in test runner. Planned: Windows, Chrome native messaging API, and a minimal C# host compiled with the available .NET Framework compiler. Git and GitHub hold the project source.

## INSTALLATION / SETUP

For a browser-phase trial, open `chrome://extensions` in Chrome, enable Developer mode, choose **Load unpacked**, and select this repository folder. Open a Google Forms respondent URL ending in `/viewform`, then use the extension popup. This procedure has not yet passed the manual Chrome gate. Native host compilation and registration steps will be added after the Windows component is built and tested. Do not rely on this prototype as a working exam monitor yet.

## USER GUIDE

On a supported Google Form respondent page, open the popup and select **Start Examination**. The popup shows the session status and incident timeline; **End Examination** closes recording, and **Export JSON** downloads the local report. Browser behavior is awaiting hands-on verification. The popup currently states that desktop monitoring is planned for Phase 2.

## QUALITY ASSURANCE & TESTING

Phase gates and required demonstrations are defined in `GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md`. Run `node --test tests/browser.test.js` for repeatable browser logic checks. Use `tests/MANUAL_BROWSER.md` for the required Chrome acceptance check. Desktop-host interruption and foreground-app testing follow in Phase 2.

## TEST RESULTS

Phase 0 local checks (October 10, 2026): all five project skills passed `quick_validate.py` with UTF-8 enabled; a content check confirmed all 14 requested README headings and the six priority monitoring areas in the MVP context.

Phase 1 automated checks (October 10, 2026; Windows, Node.js 22.19.0): `node --test tests/browser.test.js` passed 6/6 checks covering URL classification, session lifecycle, deduplication, privacy fields, content-script validation, monitored-tab navigation, blank-tab counting, Form-tab interruption, persistence across a simulated service worker restart, and parseable JSON report shape. `node --check` passed for the extension JavaScript, and the manifest parsed as JSON. Hands-on Chrome scenarios remain pending, so Phase 1 has not passed its gate.

## LIMITATIONS

Opening ChatGPT does not prove its use. A foreground app event does not prove a document was opened or read. Another browser or device, unsupported PDF viewer, and some Chrome PDF locations may be unobservable. The local report is a prototype record, not tamper-proof evidence.

## CONCLUSION

Pending hands-on browser verification and completion and testing of the desktop phase.

## APPENDICES

- [Authoritative MVP context](GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md)
- Original context: Git `main`
- Project workflows: `.agents/skills/` and `AGENTS.md`
- Browser manual check: `tests/MANUAL_BROWSER.md`
