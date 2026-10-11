# Google Forms Exam Integrity Monitor

## PROJECT OVERVIEW

The Chrome extension records observable activity during a Google Forms session and produces a timestamped incident report for teacher review. The browser phase passed a hands-on Chrome demonstration on October 10, 2026. The Windows companion is implemented and passes automated checks; its live Chrome acceptance gate remains pending.

## PROBLEM STATEMENT

A Google Forms exam alone provides limited visibility into tab changes, other webpages, and desktop apps. The project aims to make observable activity reviewable without claiming that an event proves cheating.

## PROJECT OBJECTIVES

- Demonstrate a monitored Google Forms session and an exportable incident timeline.
- Detect another Chrome webpage and a ChatGPT page opened or activated during the session.
- Identify Word, Notepad, and a supported PDF reader when they become the Windows foreground app; identify a PDF in Chrome when observable.
- Preserve evidence labels and limitations so an instructor can interpret events fairly.

## SYSTEM FEATURES

**Browser phase, verified in Chrome:** start/end session, tab and webpage events, ChatGPT hostname classification, form focus and fullscreen events, copy/paste attempts, a local incident timeline, and JSON export. A new **Start in fullscreen** checkbox keeps the original fullscreen behavior by default and allows a normal Chrome window; this choice has passed automated checks and awaits a fresh Chrome check. **Windows phase, implemented and awaiting live acceptance:** foreground categories for Word, Notepad, and mapped PDF readers; host connection status and interruption events. Chrome PDF URL classification has been observed in a partial live report. Question timing, screenshot-key detection, resize events, and CSV export are deferred.

## SYSTEM ARCHITECTURE / COMPONENTS

The Manifest V3 extension has a Google Forms content script, a service worker for session and browser events, and a popup for control and reporting. `chrome.storage.local` holds local sessions and incidents. A C# native messaging host polls the Windows foreground process and sends only an app category and timestamp to the service worker. The host has no independent report storage. There is no remote backend.

## SYSTEM WORKFLOW

The student opens a supported Google Form, starts monitoring in the popup, and takes the exam. The extension records observable browser events; the Windows host reports foreground app categories. The student ends the session, then the report can be reviewed and exported. Incidents are review prompts, not automatic findings.

## TOOLS & TECHNOLOGIES

Google Chrome, Chrome Extension Manifest V3, vanilla JavaScript/HTML/CSS, Chrome storage and native messaging APIs, Windows, a minimal C# host compiled with the .NET Framework compiler, Node.js built-in test runner, Git, and GitHub.

## INSTALLATION / SETUP

Open `chrome://extensions` in Chrome, enable Developer mode, choose **Load unpacked**, and select this repository folder. Copy the unpacked extension ID. From PowerShell in the repository root, run `powershell -NoProfile -ExecutionPolicy Bypass -File native-host\install.ps1 -ExtensionId YOUR_EXTENSION_ID`, replacing `YOUR_EXTENSION_ID` with that ID. The script compiles the host with `C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe`, writes an ignored native host manifest, and registers it under the current user's Chrome native messaging registry key. Reload the extension and refresh the Form after a code or permission change. Open a Google Forms respondent URL ending in `/viewform`, then use the pinned popup. The control page can also be opened at `chrome-extension://YOUR_EXTENSION_ID/popup.html` in another tab while exactly one supported Form is open. The Windows setup has been compiled and registered on the development machine; live extension-to-host connection is still awaiting acceptance.

## USER GUIDE

On a supported Google Form respondent page, open the popup. **Start in fullscreen** is checked by default; uncheck it before **Start Examination** to keep Chrome tabs and window controls visible. In fullscreen, Ctrl+Tab changes Chrome tabs and F11 exits fullscreen; changes are recorded. The popup shows session and desktop connection status plus the incident timeline. Bring another webpage, ChatGPT, Word, Notepad, or a supported PDF reader to the foreground to produce observable signals. **End Examination** closes recording, and **Export JSON** downloads the local report. Desktop app signals mean an app became active, not that a document was read. An incident is an observation for review, not a cheating verdict.

## QUALITY ASSURANCE & TESTING

Phase gates and required demonstrations are defined in `GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md`. Run `node --test tests/browser.test.js tests/host.test.js` for repeatable extension and native-host checks. Use `tests/MANUAL_BROWSER.md` and `tests/MANUAL_DESKTOP.md` for the required Chrome and Windows acceptance checks. Automated checks do not replace the live desktop gate.

## TEST RESULTS

Phase 0 local checks (October 10, 2026): all five project skills passed `quick_validate.py` with UTF-8 enabled; a content check confirmed all 14 requested README headings and the six priority monitoring areas in the MVP context.

Phase 1 automated checks (October 10, 2026; Windows, Node.js 22.19.0): `node --test tests/browser.test.js` passed 9/9 checks covering URL classification, session lifecycle, deduplication, privacy fields, content-script validation and invalidation handling, control-page authorization, monitored-tab navigation, blank-tab counting, Form-tab interruption, window focus and fullscreen transitions, persistence across a simulated service worker restart, and parseable JSON report shape. `node --check` passed for the changed extension JavaScript.

Phase 1 manual gate (October 10, 2026; Windows, Chrome 154.0.8037.98): the unpacked extension loaded with a visible service worker. A supported Google Form started and ended from the toolbar popup; a second Start was disabled while active, and the two-event control run had one `EXAM_STARTED` and one `EXAM_ENDED`. A longer run recorded `example.com` as a webpage and `chatgpt.com` as a page opened or activated with usage unverified; it also recorded tab switches, fullscreen exit/restoration, copy, paste, and window focus loss/restoration. The active session and timeline survived a control-page reload and extension reload. A completed 20-event JSON export parsed successfully: all incidents had the same session ID, ordered ISO timestamps, valid severities, `CHROME` source, null app categories, and only the two hostnames. It contained no Form path, ChatGPT path, or dummy answer text. After End, webpage, ChatGPT, copy, paste, and focus actions left the count at 20. No duplicate event was observed for each single action. Phase 1 passed its browser gate.

During testing, Chrome showed an `Extension context invalidated` error from a Form content script left open across an extension reload. The content script now catches that synchronous error; the Form was refreshed before the copy/paste retest. A separate clean-reload check of that fix is pending.

Phase 2 implementation checks (October 11, 2026; Windows, Node.js 22.19.0): `node --test tests/browser.test.js tests/host.test.js` passed 12/12. The extension tests covered native message validation, category-only incident fields, end-of-session boundaries, host disconnect/interruption, and continued browser recording. The host test compiled the C# executable, read its length-prefixed `READY` and `FOREGROUND_CHANGED` frames, confirmed the category-only fields, and sent `STOP` for a clean exit. The generated host manifest allows this development machine's unpacked extension ID, and the current-user Chrome registry entry points to it.

Phase 2 partial live report review (October 11, 2026): a locally exported 28-incident session contained Windows-host events for Word and Notepad, a Chrome PDF event for `www.w3.org`, one native-host interruption, and another Word event after the interruption. All incidents shared the session ID and were chronological; the JSON contained no full URLs or Windows file paths. It did not contain a `PDF_READER` incident, so the dedicated-reader demonstration is still pending. Repeated `WINDOW_FOCUS_LOST` events without intervening restoration exposed a duplicate-signal defect. The service worker now records focus transitions. The export also contained internal tab and window IDs; the report builder now omits them. A fresh Chrome run is needed to verify these fixes and the remaining desktop gate.

Browser adjustment checks (October 11, 2026; Windows, Node.js 22.19.0): `node --test tests/browser.test.js tests/host.test.js` passed 13/13 after adding the normal-window option. The new check confirms a normal start keeps Chrome's window state normal while later fullscreen entry and exit still create incidents. `node --check` passed for the changed JavaScript. The updated popup and browser flow await a hands-on Chrome run.

## LIMITATIONS

Opening ChatGPT does not prove its use. A foreground app event does not prove a document was opened or read. Another browser or device, unsupported PDF viewer, and some Chrome PDF locations may be unobservable. The local report is a prototype record, not tamper-proof evidence.

## CONCLUSION

The browser phase is ready for the MVP demonstration. The Windows component is implemented, but its live acceptance gate remains pending.

## APPENDICES

- [Authoritative MVP context](GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md)
- Original context: Git `main`
- Project workflows: `.agents/skills/` and `AGENTS.md`
- Browser manual check: `tests/MANUAL_BROWSER.md`
- Desktop manual check: `tests/MANUAL_DESKTOP.md`
