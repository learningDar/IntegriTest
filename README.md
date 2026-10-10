# Google Forms Exam Integrity Monitor

## PROJECT OVERVIEW

The Chrome extension records observable activity during a Google Forms session and produces a timestamped incident report for teacher review. The browser phase passed a hands-on Chrome demonstration on October 10, 2026. The Windows companion remains planned.

## PROBLEM STATEMENT

A Google Forms exam alone provides limited visibility into tab changes, other webpages, and desktop apps. The project aims to make observable activity reviewable without claiming that an event proves cheating.

## PROJECT OBJECTIVES

- Demonstrate a monitored Google Forms session and an exportable incident timeline.
- Detect another Chrome webpage and a ChatGPT page opened or activated during the session.
- Identify Word, Notepad, and a supported PDF reader when they become the Windows foreground app; identify a PDF in Chrome when observable.
- Preserve evidence labels and limitations so an instructor can interpret events fairly.

## SYSTEM FEATURES

**Browser phase, verified in Chrome:** start/end session, tab and webpage events, ChatGPT hostname classification, form focus and fullscreen events, copy/paste attempts, a local incident timeline, and JSON export. Chrome PDF URL classification is implemented and covered by automated checks; its live demonstration is part of Phase 2. Foreground Word/Notepad/PDF-reader classification remains planned for the Windows phase. Question timing, screenshot-key detection, resize events, and CSV export are deferred.

## SYSTEM ARCHITECTURE / COMPONENTS

The Manifest V3 extension has a Google Forms content script, a service worker for session and browser events, and a popup for control and reporting. `chrome.storage.local` holds local sessions and incidents. A C# Windows native messaging host is planned to supply foreground app categories. No remote backend is planned for this deadline.

## SYSTEM WORKFLOW

The student opens a supported Google Form, starts monitoring in the popup, and takes the exam. The extension records observable browser events; the Windows host reports foreground app categories. The student ends the session, then the report can be reviewed and exported. Incidents are review prompts, not automatic findings.

## TOOLS & TECHNOLOGIES

Current: Google Chrome, Chrome Extension Manifest V3, vanilla JavaScript/HTML/CSS, Chrome storage API, and Node.js built-in test runner. Planned: Windows, Chrome native messaging API, and a minimal C# host compiled with the available .NET Framework compiler. Git and GitHub hold the project source.

## INSTALLATION / SETUP

For a browser-phase trial, open `chrome://extensions` in Chrome, enable Developer mode, choose **Load unpacked**, and select this repository folder. Open a Google Forms respondent URL ending in `/viewform`, then use the pinned extension popup. If the popup cannot be operated by an accessibility tool, the same control page can be opened at `chrome-extension://<extension-id>/popup.html` in another tab while exactly one supported Form is open. Find the unpacked extension ID on `chrome://extensions`. Refresh the Form after reloading the extension so its content script is current. Native host compilation and registration steps will be added after the Windows component is built and tested.

## USER GUIDE

On a supported Google Form respondent page, open the popup and select **Start Examination**. Chrome enters fullscreen; the popup shows the session status and incident timeline. **End Examination** closes recording, and **Export JSON** downloads the local report. The popup currently states that desktop monitoring is planned for Phase 2. An incident is an observation for review, not a cheating verdict.

## QUALITY ASSURANCE & TESTING

Phase gates and required demonstrations are defined in `GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md`. Run `node --test tests/browser.test.js` for repeatable browser logic checks. Use `tests/MANUAL_BROWSER.md` for the required Chrome acceptance check. Desktop-host interruption and foreground-app testing follow in Phase 2.

## TEST RESULTS

Phase 0 local checks (October 10, 2026): all five project skills passed `quick_validate.py` with UTF-8 enabled; a content check confirmed all 14 requested README headings and the six priority monitoring areas in the MVP context.

Phase 1 automated checks (October 10, 2026; Windows, Node.js 22.19.0): `node --test tests/browser.test.js` passed 9/9 checks covering URL classification, session lifecycle, deduplication, privacy fields, content-script validation and invalidation handling, control-page authorization, monitored-tab navigation, blank-tab counting, Form-tab interruption, window focus and fullscreen transitions, persistence across a simulated service worker restart, and parseable JSON report shape. `node --check` passed for the changed extension JavaScript.

Phase 1 manual gate (October 10, 2026; Windows, Chrome 154.0.8037.98): the unpacked extension loaded with a visible service worker. A supported Google Form started and ended from the toolbar popup; a second Start was disabled while active, and the two-event control run had one `EXAM_STARTED` and one `EXAM_ENDED`. A longer run recorded `example.com` as a webpage and `chatgpt.com` as a page opened or activated with usage unverified; it also recorded tab switches, fullscreen exit/restoration, copy, paste, and window focus loss/restoration. The active session and timeline survived a control-page reload and extension reload. A completed 20-event JSON export parsed successfully: all incidents had the same session ID, ordered ISO timestamps, valid severities, `CHROME` source, null app categories, and only the two hostnames. It contained no Form path, ChatGPT path, or dummy answer text. After End, webpage, ChatGPT, copy, paste, and focus actions left the count at 20. No duplicate event was observed for each single action. Phase 1 passed its browser gate.

During testing, Chrome showed an `Extension context invalidated` error from a Form content script left open across an extension reload. The content script now catches that synchronous error; the Form was refreshed before the copy/paste retest. A separate clean-reload check of that fix is pending.

## LIMITATIONS

Opening ChatGPT does not prove its use. A foreground app event does not prove a document was opened or read. Another browser or device, unsupported PDF viewer, and some Chrome PDF locations may be unobservable. The local report is a prototype record, not tamper-proof evidence.

## CONCLUSION

The browser phase is ready for the MVP demonstration. The Windows foreground-monitoring phase and its acceptance gate remain pending.

## APPENDICES

- [Authoritative MVP context](GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md)
- Original context: Git `main`
- Project workflows: `.agents/skills/` and `AGENTS.md`
- Browser manual check: `tests/MANUAL_BROWSER.md`
