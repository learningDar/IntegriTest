<p align="center"><img src="public/brand/integritest-mark.svg" width="176" alt="IntegriTest laptop and eye icon"></p>

<h1 align="center">IntegriTest</h1>

<p align="center">Google Forms exam activity records for professor review.</p>

<p align="center"><img alt="Local monitor verified" src="https://img.shields.io/badge/local_monitor-verified-445b9f"> <img alt="Teacher service local checks" src="https://img.shields.io/badge/teacher_service-local_checks-6b668d"> <img alt="Remote flow pending" src="https://img.shields.io/badge/remote_flow-pending-666666"> <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-a5b4fc"></a></p>

<p align="center"><a href="#installation--setup">Setup</a> · <a href="USER_GUIDE.md">User guide</a> · <a href="#system-architecture--components">Architecture</a> · <a href="#limitations">Limitations</a></p>

<p align="center"><strong>main:</strong> v0.3.2 local checks passed · v0.3.3 HTTPS smoke checks passed · separate-device verification pending</p>

## PROJECT OVERVIEW

IntegriTest records observable activity during a Google Forms examination. A Chrome extension captures browser signals, a Windows companion classifies supported foreground apps, and a teacher service groups received incidents under an exam and assigned roster entry. The professor scans a live activity table and opens a full report when needed.

## PROBLEM STATEMENT

Google Forms does not give a professor a record of tab changes or supported desktop apps during a quiz. The tested local monitor exports JSON, but remote review also needs automatic delivery and visible connection gaps. IntegriTest adds those records without claiming an incident proves misconduct.

## PROJECT OBJECTIVES

- Record a monitored Form session, another webpage, a ChatGPT page, a Chrome PDF, Word, Notepad, and a supported PDF reader when observable.
- Keep incident data to categories, timestamps, sources, app categories, and needed hostnames.
- Let a professor register a Form, reuse a class roster, issue one-time codes, and review activity by assigned name and ID.
- Deliver incidents during the exam, retry after an interruption, and retain a local JSON fallback.

## SYSTEM FEATURES

| Component | Behavior |
| --- | --- |
| Chrome extension | Start/end, tab and focus changes, fullscreen, copy/paste, local timeline and JSON, webpage/ChatGPT/PDF categories; paired-session End guard, marked early stop, and popup dark/light toggle |
| Windows companion | Foreground Word, Notepad, and verified Adobe Acrobat categories; disconnect signal |
| Professor service | Protected Form records, `.xlsx` classes, one-use codes, 10-second dashboard refresh, student status and latest activity table, report modal on request, JSON, 30-day cleanup |

The popup warns when other tabs are open in the same Chrome window. **Start in fullscreen** is off by default so window controls remain visible; students can opt in. A confirmed Form submission ended monitoring in the tested practice Form. In v0.3.1, normal **End Examination** is unavailable during a paired session before confirmed submission; **Report a problem and stop early** is a marked fallback for technical failure. Local-only sessions retain manual End. This UI guard cannot stop a student from disabling the extension or closing Chrome. Question timing, screenshot-key detection, CSV, and scoring are deferred.

## SYSTEM ARCHITECTURE / COMPONENTS

| Input | Component | Output |
| --- | --- | --- |
| Google Form and Chrome tab activity | Chrome Manifest V3 extension | Category-only browser incidents |
| Windows foreground application | C# native messaging host → extension | App category and timestamp |
| Extension incident queue | Chrome local storage | On-screen timeline and JSON fallback |
| Queued incidents and heartbeats | Worker running locally → D1 | Protected professor view and service JSON |

The extension service worker validates session boundaries and retries delivery. The C# native host sends categories and timestamps, without document contents or window titles. D1 keeps names and IDs in assignment/session metadata; incident rows keep only approved activity fields. A Worker and D1 database have been deployed for a hosted pilot; separate-device HTTPS delivery remains unverified.

## SYSTEM WORKFLOW

1. The professor publishes a Google Form and registers its respondent `viewform` link in the teacher view.
2. The professor imports a class `.xlsx` whose first sheet has **Student ID** and **Name** headers. The browser previews and validates it, then sends only confirmed names and IDs. For a late arrival, the professor can enter a name with an optional Student ID; a name-only entry receives an internal ID. Existing ID-only assignments remain compatible.
3. Assigning a class to an exam generates fresh one-use codes, shown once for copying or a plain-text download. The professor shares each code privately.
4. A student pairs the extension, opens the registered Form from the popup, and starts. The service receives incidents and heartbeats; the dashboard refreshes every 10 seconds. A connection gap means contact was missed.
5. Observed submission confirmation ends a paired session. A technical issue can be marked as an early stop; local-only sessions retain manual End. The professor downloads the service JSON and matches the roster entry with the separate Google Forms response manually.

A code identifies an assigned roster entry, **not a verified physical person**. The Form needs no Student ID question for pairing.

## TOOLS & TECHNOLOGIES

Chrome Manifest V3, JavaScript/HTML/CSS, Chrome storage/alarms/native messaging, Windows and a C# foreground host, Cloudflare Workers and D1, Wrangler, a pinned bundled `read-excel-file` reader, Node.js build tools, Git, and GitHub. The project is [MIT licensed](LICENSE).

## INSTALLATION / SETUP

The [hosted setup page](https://integritest.dareugenio.workers.dev/) provides the current Windows and Chrome package, checksum, and installation steps. The same instructions, professor workflow, and local development commands are in [USER_GUIDE.md](USER_GUIDE.md). The deployed v0.3.3 package targets that exact HTTPS service; the separate-device exam test is still pending.

## USER GUIDE

Follow the repository [student and professor guide](USER_GUIDE.md) for setup, exam preparation, monitoring, and report review. The [10-question Systems Integration and Architecture practice Form](https://docs.google.com/forms/d/e/1FAIpQLSdOyiXOUU2YWqp2RFh6SR_-dPf8ZmixAjrT7bZ4EE0TnS7oVQ/viewform) is available for testing; the extension does not collect its answers.

## LIMITATIONS

- **Windows and Chrome only:** The extension and Windows companion have not been set up or verified on a phone. A student taking the Form on a phone is outside this monitoring flow; the professor should require the supported computer setup for this pilot.
- **Codes do not prove identity:** A one-time code is assigned to a roster entry, but someone who obtains another student's unused code could pair first and have activity recorded under that entry. Professors should share codes privately, verify the recipient separately, and match the Google Forms response to the roster.
- The extension cannot observe another browser or device. An unmanaged student device can disable monitoring. A connection gap shows lost contact, not what happened during the gap.
- A foreground app category does not reveal what was read or typed. Opening ChatGPT does not prove use. PDF readers other than Adobe Acrobat need explicit verification. Reports are retained for 30 days before scheduled cleanup.

## CONCLUSION

The local monitor is demonstrable. The hosted Worker and v0.3.3 download passed basic HTTP and access checks. The remaining Phase 3 gate is a separate-device HTTPS exam run plus hosted checks for code use, retry, session boundaries, access control, report privacy, and retention. Phase 4 combined QA follows that gate.

## APPENDICES

- [MIT license](LICENSE)
- [Student and professor user guide](USER_GUIDE.md)
- [Current package checksum](public/downloads/integritest-v0.3.3.sha256)
