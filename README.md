# Google Forms Exam Integrity Monitor

## PROJECT OVERVIEW

The Chrome extension records observable activity during a Google Forms session and produces a timestamped incident report for teacher review. The browser phase passed a hands-on Chrome demonstration on October 10, 2026, and its webpage, ChatGPT, and Chrome PDF signals passed a fresh `v0.1.2` regression run on October 11. The Windows companion and full desktop acceptance gate passed on October 11 with Adobe Acrobat as the verified PDF reader. Phase 3 will add automatic delivery and a teacher view, starting with a local demo and then deployment; remote monitoring is not implemented yet.

## PROBLEM STATEMENT

A Google Forms exam alone provides limited visibility into tab changes, other webpages, and desktop apps. The current local report also depends on a student sending the JSON file afterward, so a remote teacher cannot see an active session or a missing report. The project aims to make observable activity reviewable without claiming that an event proves cheating.

## PROJECT OBJECTIVES

- Demonstrate a monitored Google Forms session and an exportable incident timeline.
- Detect another Chrome webpage and a ChatGPT page opened or activated during the session.
- Identify Word, Notepad, and a supported PDF reader when they become the Windows foreground app; identify a PDF in Chrome when observable.
- Preserve evidence labels and limitations so an instructor can interpret events fairly.
- In Phase 3, deliver incidents automatically to a teacher-only view and make missing connections visible while retaining local export.

## SYSTEM FEATURES

**Browser phase, verified in Chrome:** start/end session, tab and webpage events, ChatGPT hostname classification, Chrome PDF URL classification, form focus and fullscreen events, copy/paste attempts, a local incident timeline, and JSON export. **Start in fullscreen** is checked by default; unchecking it starts a normal Chrome window. A normal-window session was used in the October 11 live regression run, and fullscreen transitions passed automated checks. **Windows phase, verified on this machine:** foreground categories for Microsoft Word, Windows Notepad, and Adobe Acrobat; native-host connection, interruption, and recovery. **Phase 3, planned:** student pairing, automatic minimal-event upload with retry, teacher-only session and incident view, and connection-gap status. Foxit and SumatraPDF mappings exist in code but have not been demonstrated on this machine. Question timing, screenshot-key detection, resize events, and CSV export are deferred.

## SYSTEM ARCHITECTURE / COMPONENTS

The tested Manifest V3 extension has a Google Forms content script, a service worker for session and browser events, and a popup for control and reporting. `chrome.storage.local` holds local sessions and incidents. A C# native messaging host polls the Windows foreground process and sends only an app category and timestamp to the service worker. The host has no independent report storage. The planned Phase 3 path adds a teacher service, durable minimal-event storage, automatic extension delivery, and a teacher-only web view. That remote path does not exist in the current build.

## SYSTEM WORKFLOW

Currently, the student opens a supported Google Form, starts monitoring in the popup, and takes the exam. The extension records observable browser events; the Windows host reports foreground app categories. The student ends the session, exports JSON, and sends it to the teacher. In Phase 3, the student will pair with an exam code before starting; the extension will deliver events automatically while preserving local export, and the teacher will review sessions and connection gaps in a separate view. Incidents are review prompts, not automatic findings.

## TOOLS & TECHNOLOGIES

Google Chrome, Chrome Extension Manifest V3, vanilla JavaScript/HTML/CSS, Chrome storage and native messaging APIs, Windows, a minimal C# host compiled with the .NET Framework compiler, Node.js built-in test runner, Git, and GitHub. Phase 3 will add a teacher web service and server-side storage; their exact technology and host will be documented when implemented.

## INSTALLATION / SETUP

Open `chrome://extensions` in Chrome, enable Developer mode, choose **Load unpacked**, and select this repository folder. Copy the unpacked extension ID. From PowerShell in the repository root, run `powershell -NoProfile -ExecutionPolicy Bypass -File native-host\install.ps1 -ExtensionId YOUR_EXTENSION_ID`, replacing `YOUR_EXTENSION_ID` with that ID. The script compiles the host with `C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe`, writes an ignored native host manifest, and registers it under the current user's Chrome native messaging registry key. Reload the extension and refresh the Form after a code or permission change; confirm the popup header shows the version in `manifest.json`. Open a Google Forms respondent URL ending in `/viewform`, then use the pinned popup. The control page can also be opened at `chrome-extension://YOUR_EXTENSION_ID/popup.html` in another tab while exactly one supported Form is open. The development machine's extension ID is `ohhphckdheaeodppedfkbnljdfdoechd`; its host registration and live connection were verified on October 11.

Remote teacher-service setup is pending Phase 3. The work order is a local student/teacher demo, then deployment to a reachable HTTPS host and a separate-device check. No teacher server address or account setup is available in the current build.

## USER GUIDE

On a supported Google Form respondent page, open the popup. **Start in fullscreen** is checked by default; uncheck it before **Start Examination** to keep Chrome tabs and window controls visible. In fullscreen, Ctrl+Tab changes Chrome tabs and F11 exits fullscreen; changes are recorded. The popup shows session and desktop connection status plus the incident timeline. Bring another webpage, ChatGPT, Word, Notepad, or a supported PDF reader to the foreground to produce observable signals. **End Examination** closes recording, and **Export JSON** downloads the local report. Desktop app signals mean an app became active, not that a document was read. An incident is an observation for review, not a cheating verdict.

For the current build, the student must send the exported JSON to the teacher; the teacher cannot monitor the session remotely yet. Phase 3 will replace that required handoff with automatic delivery and a teacher-only session view while keeping JSON export as a fallback.

For a short demonstration, use a practice Form with dummy content, confirm popup version `v0.1.2` and **Desktop monitor: connected**, and start with fullscreen unchecked. Open an unrelated webpage, `chatgpt.com`, and a Chrome PDF; then bring Word, Notepad, and Adobe Acrobat to the foreground one at a time. Return to the Form, review the timeline, end the exam, and export JSON. Show that the report contains hostnames and app categories rather than page paths, document names, or answers. Keep the host-disconnect test in `tests/MANUAL_DESKTOP.md` for QA rather than the short classroom demonstration.

## QUALITY ASSURANCE & TESTING

Phase gates and required demonstrations are defined in `GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md`. Run `node --test tests/browser.test.js tests/host.test.js` for repeatable extension and native-host checks. Use `tests/MANUAL_BROWSER.md` and `tests/MANUAL_DESKTOP.md` for the Chrome and Windows acceptance checks. Both live gates have passed on the development machine; repeat the manual checks on any new machine or extension ID. Phase 3 will add local and deployed remote-flow checks; final combined QA is now Phase 4.

## TEST RESULTS

Phase 0 local checks (October 10, 2026): all five project skills passed `quick_validate.py` with UTF-8 enabled; a content check confirmed all 14 requested README headings and the six priority monitoring areas in the MVP context.

Phase 1 automated checks (October 10, 2026; Windows, Node.js 22.19.0): `node --test tests/browser.test.js` passed 9/9 checks covering URL classification, session lifecycle, deduplication, privacy fields, content-script validation and invalidation handling, control-page authorization, monitored-tab navigation, blank-tab counting, Form-tab interruption, window focus and fullscreen transitions, persistence across a simulated service worker restart, and parseable JSON report shape. `node --check` passed for the changed extension JavaScript.

Phase 1 manual gate (October 10, 2026; Windows, Chrome 154.0.8037.98): the unpacked extension loaded with a visible service worker. A supported Google Form started and ended from the toolbar popup; a second Start was disabled while active, and the two-event control run had one `EXAM_STARTED` and one `EXAM_ENDED`. A longer run recorded `example.com` as a webpage and `chatgpt.com` as a page opened or activated with usage unverified; it also recorded tab switches, fullscreen exit/restoration, copy, paste, and window focus loss/restoration. The active session and timeline survived a control-page reload and extension reload. A completed 20-event JSON export parsed successfully: all incidents had the same session ID, ordered ISO timestamps, valid severities, `CHROME` source, null app categories, and only the two hostnames. It contained no Form path, ChatGPT path, or dummy answer text. After End, webpage, ChatGPT, copy, paste, and focus actions left the count at 20. No duplicate event was observed for each single action. Phase 1 passed its browser gate.

During testing, Chrome showed an `Extension context invalidated` error from a Form content script left open across an extension reload. The content script now catches that synchronous error; the Form was refreshed before the copy/paste retest. A separate clean-reload check of that fix is pending.

Phase 2 implementation checks (October 11, 2026; Windows, Node.js 22.19.0): `node --test tests/browser.test.js tests/host.test.js` passed 12/12. The extension tests covered native message validation, category-only incident fields, end-of-session boundaries, host disconnect/interruption, and continued browser recording. The host test compiled the C# executable, read its length-prefixed `READY` and `FOREGROUND_CHANGED` frames, confirmed the category-only fields, and sent `STOP` for a clean exit. The generated host manifest allows this development machine's unpacked extension ID, and the current-user Chrome registry entry points to it.

Phase 2 partial live report review (October 11, 2026): a locally exported 28-incident session contained Windows-host events for Word and Notepad, a Chrome PDF event for `www.w3.org`, one native-host interruption, and another Word event after the interruption. All incidents shared the session ID and were chronological; the JSON contained no full URLs or Windows file paths. It did not contain a `PDF_READER` incident. Repeated `WINDOW_FOCUS_LOST` events without intervening restoration exposed a duplicate-signal defect. The service worker now records focus transitions. The export also contained internal tab and window IDs; the report builder now omits them. The later browser and desktop regressions verified these fixes.

Browser adjustment checks (October 11, 2026; Windows, Node.js 22.19.0): `node --test tests/browser.test.js tests/host.test.js` passed 13/13 after adding the normal-window option. The new check confirms a normal start keeps Chrome's window state normal while later fullscreen entry and exit still create incidents. `node --check` passed for the changed JavaScript.

Browser regression and QA (October 11, 2026; Windows, unpacked Chrome extension `v0.1.2`): an earlier live export exposed missed ChatGPT and PDF events when their tabs were not active as URL updates arrived. The service worker now records URL navigations during the session even if the tab remains in the background. The follow-up `node --test tests/browser.test.js tests/host.test.js` passed 14/14, including a new background-navigation and after-End test. In a fresh session confirmed **Monitoring**, Chrome navigated to `example.com`, `chatgpt.com`, and a PDF at `www.w3.org`. The 8-event JSON export recorded exactly one `WEBPAGE_OPENED`, one `AI_SITE_OPENED`, and one `PDF_OPENED`, each with the expected hostname and before `EXAM_ENDED`. It had one Start and one End, ordered timestamps, one session ID, `CHROME` sources, null app categories, and session fields limited to `id`, `startedAt`, and `endedAt`. It contained no full URL, internal tab/window ID, PDF path, private ChatGPT path, or dummy Form answer. Focus loss/restoration followed state transitions rather than repeating consecutive loss events. The browser regression passed. A separate initial `v0.1.2` attempt did not reach **Monitoring** and was excluded from this result.

Phase 2 live gate (October 11, 2026; Windows, Chrome 154.0.8037.98, unpacked extension `v0.1.2`): the popup showed **Monitoring** and **Desktop monitor: connected**. Word became the foreground process before and after a test host termination; the host process restarted automatically. A 27-event JSON export recorded two `WORD`, one `NOTEPAD`, and three `PDF_READER` foreground events. Adobe Acrobat was the installed reader; each reader event means Acrobat became active, without claiming a document was opened. The report also contained two Chrome `PDF_OPENED` events for `www.w3.org`, one `MONITORING_INTERRUPTED` event with `WINDOWS_HOST` source, and a `WEBPAGE_OPENED` event after the interruption. After End, another webpage and Word activation added no incident. The popup summary matched the 27 exported events. QA confirmed one Start and one End, ordered timestamps, one session ID, no event after End, category-only desktop incidents, hostname-only browser incidents, and no full URLs, file paths, internal tab/window IDs, or dummy Form answer. The desktop gate passed on this machine.

Pre-remote baseline QA review (October 11, 2026; recorded before the phase change): the browser and desktop live reports together cover all six original demonstrations and the existing local MVP controls. The 8-event browser report contains the webpage, ChatGPT, and Chrome PDF labels; the 27-event desktop report contains Word, Notepad, Acrobat, host interruption/recovery, browser continuation, and the post-End boundary. Both reports use observation wording and pass the privacy-field checks above. `node --test tests/browser.test.js tests/host.test.js` passed 14/14 after the final local code change. A fresh practice Form should be used for presentation so no real application answers are visible. Phase 3 remote results and Phase 4 combined QA results are pending.

## LIMITATIONS

Opening ChatGPT does not prove its use. A foreground app event does not prove a document was opened or read. Another browser or device, unsupported PDF viewer, and some Chrome PDF locations may be unobservable. The current local report requires student export and handoff; students can withhold it or disable monitoring. Phase 3 can expose missing connections but cannot prove a student kept monitoring enabled or establish identity on an unmanaged device. The report is a prototype record, not tamper-proof evidence.

## CONCLUSION

The browser and Windows desktop phases are ready for a local demonstration on the development machine. Remote teacher monitoring is the next phase and will be tested locally before deployment. Final combined QA follows in Phase 4. The report records reviewable observations without making a cheating verdict.

## APPENDICES

- [Authoritative MVP context](GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md)
- Original context: Git `main`
- Project workflows: `.agents/skills/` and `AGENTS.md`
- Browser manual check: `tests/MANUAL_BROWSER.md`
- Desktop manual check: `tests/MANUAL_DESKTOP.md`
- Planned remote acceptance check: `tests/MANUAL_REMOTE.md`
