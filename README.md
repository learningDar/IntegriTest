<p align="center"><img src="public/brand/integritest-mark.svg" width="176" alt="IntegriTest laptop and eye icon"></p>

<h1 align="center">IntegriTest</h1>

<p align="center">Google Forms exam activity records for professor review.</p>

<p align="center"><img alt="Local monitor verified" src="https://img.shields.io/badge/local_monitor-v0.1.2_verified-445b9f"> <img alt="Remote flow in development" src="https://img.shields.io/badge/remote_flow-in_development-666666"> <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-a5b4fc"></a></p>

<p align="center"><a href="#installation--setup">Setup</a> · <a href="#user-guide">User guide</a> · <a href="#system-architecture--components">Architecture</a> · <a href="#limitations">Limitations</a></p>

<p align="center"><strong>Stable:</strong> local v0.1.2 monitor · <strong>Phase 3:</strong> teacher view in development</p>

## PROJECT OVERVIEW

IntegriTest records observable browser and supported Windows foreground activity during a Google Forms examination. This stable build stores incidents locally, displays a timeline, and exports JSON for professor review. The teacher service is being developed on `feat/phase3-teacher-monitoring`; it is not part of this build.

## PROBLEM STATEMENT

Google Forms does not show a professor when the exam window loses focus, another webpage opens, or a supported desktop app comes forward. A local report gives reviewable context, though delivery currently depends on the student sending the exported JSON.

## PROJECT OBJECTIVES

- Demonstrate a monitored Form session and a readable, exportable timeline.
- Record webpage, ChatGPT page, Chrome PDF, Word, Notepad, and supported PDF-reader signals when observable.
- Keep activity fields limited to categories, timestamps, sources, app categories, and needed hostnames.

## SYSTEM FEATURES

The extension offers start/end controls, tab and focus signals, fullscreen changes, copy/paste attempts, local incident storage, a timeline, and JSON export. The Windows companion classifies foreground Word, Notepad, and Adobe Acrobat. A PDF in Chrome is classified through browser activity. **Start in fullscreen** is optional; uncheck it to keep Chrome controls visible. Question timing, screenshot-key detection, CSV, and scoring are deferred.

## SYSTEM ARCHITECTURE / COMPONENTS

| Input | Component | Output |
| --- | --- | --- |
| Google Form and Chrome tab activity | Chrome Manifest V3 extension | Category-only browser incidents |
| Windows foreground application | C# native messaging host → extension | App category and timestamp |
| Extension incidents | Chrome local storage | On-screen timeline and JSON export |

The extension service worker handles browser events and session boundaries. The native host reports a category without document contents, window titles, or file paths. Phase 3's Worker/D1 architecture is documented on its development branch and requires its own acceptance gate.

## SYSTEM WORKFLOW

The student opens a supported Google Form, starts monitoring from the extension, completes the quiz, ends monitoring, exports JSON, and sends the report to the professor. The professor reviews the events alongside the separate Form response. A recorded event does not establish intent or identity.

## TOOLS & TECHNOLOGIES

Google Chrome Manifest V3, JavaScript/HTML/CSS, Chrome storage and native messaging APIs, Windows, a C# foreground host compiled with the installed .NET Framework compiler, PowerShell, Node.js tests, Git, and GitHub. The project is [MIT licensed](LICENSE).

## INSTALLATION / SETUP

1. In Chrome, open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose this repository folder. Copy the extension ID shown by Chrome.
2. In PowerShell at the repository root, run `powershell -NoProfile -ExecutionPolicy Bypass -File native-host\install.ps1 -ExtensionId YOUR_EXTENSION_ID`.
3. Reload the extension, refresh the Form respondent page, and open the popup. Check that it shows v0.1.2 and **Desktop monitor: connected** when the companion is available.

See the [browser test steps](tests/MANUAL_BROWSER.md) and [desktop test steps](tests/MANUAL_DESKTOP.md) for a reproducible walkthrough.

## USER GUIDE

Open a supported Form respondent page, choose whether to start in fullscreen, then select **Start Examination**. Visit the quiz as normal. The popup shows status and an incident timeline. Select **End Examination** and **Export JSON** when finished. Send the JSON to the professor using the agreed class process; this stable build has no teacher upload or live view.

The published [10-question Systems Integration and Architecture practice Form](https://docs.google.com/forms/d/e/1FAIpQLSdOyiXOUU2YWqp2RFh6SR_-dPf8ZmixAjrT7bZ4EE0TnS7oVQ/viewform) is available for a local demonstration. Use nonpersonal answers; the extension does not capture them.

## LIMITATIONS

The extension cannot observe another browser or device. A foreground app signal does not prove that a document was read. Opening ChatGPT does not prove it was used. Unsupported PDF readers may appear only as external activity. Local JSON can be cleared or altered by someone controlling the device; remote delivery is under development.

## CONCLUSION

The stable local monitor provides a tested incident report for review. Remote professor access and automatic delivery need the Phase 3 local and HTTPS gates before release.

## APPENDICES

- [MVP context](GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md)
- [Browser manual check](tests/MANUAL_BROWSER.md)
- [Windows manual check](tests/MANUAL_DESKTOP.md)
- [MIT license](LICENSE)
