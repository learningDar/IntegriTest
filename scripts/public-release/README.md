# IntegriTest

> **Preview status:** The local browser and Windows monitoring build has passed live checks. The v{{VERSION}} teacher-service package has passed automated and local API checks, but its live Chrome and hosted remote checks remain pending. This public export is prepared for later release; it is not yet a verified remote-monitoring deployment.

| Area | Status |
| --- | --- |
| Chrome and Windows local monitor | **Verified on the development machine** |
| Teacher service and setup pages | **Local checks passed** |
| Packaged Chrome and HTTPS remote flow | **Acceptance pending** |

**Start here:** [Setup page](index.html) · [Installation](#installation--setup) · [User guide](#user-guide) · [Limitations](#limitations)

## PROJECT OVERVIEW

This project records observable activity during a Google Forms examination so an instructor can review a timestamped incident report. It does not decide whether a student cheated.

## PROBLEM STATEMENT

Google Forms alone does not show an instructor when a student opens another webpage or brings a Windows application to the foreground. A local JSON report also depends on the student handing it over. The planned teacher service will receive incidents during the exam and show connection gaps.

## PROJECT OBJECTIVES

- Record a monitored Google Forms session and export a readable report.
- Identify webpage, ChatGPT page, Chrome PDF, Word, Notepad, and supported PDF-reader activity when observable.
- Let a professor register a Form, assign one-time join codes, and review reports under assigned Student IDs after the remote phase passes.

## SYSTEM FEATURES

The verified local monitor records session start/end, Chrome tab and focus changes, fullscreen changes, copy/paste attempts, and supported Windows foreground app categories. The v{{VERSION}} preview adds class rosters, pairing, queued delivery, a teacher view, a same-window tab warning, connection status, and an automatic end after an observed Form submission confirmation. Remote operation is still under test.

## SYSTEM ARCHITECTURE / COMPONENTS

A Chrome extension records browser events and stores incidents locally. A small Windows native messaging companion reports only supported foreground app categories and timestamps. The teacher-service preview uses a Cloudflare Worker and D1 database; the hosted service is not included in this public setup bundle.

## SYSTEM WORKFLOW

The professor registers an existing Google Form, imports a class roster with names and IDs, and assigns that class to the exam. Each student gets a fresh one-time code. The student pairs the extension, opens the registered Form, starts monitoring, and submits. The extension keeps a local report and attempts to deliver events to the teacher service. The professor matches the assigned roster entry with the separate Google Forms response. A join code does not verify a person's identity.

## TOOLS & TECHNOLOGIES

Google Chrome Manifest V3, JavaScript, Windows PowerShell, a C# native messaging host, and a Cloudflare Worker with D1 for the teacher-service preview.

## INSTALLATION / SETUP

1. Download [integritest-v{{VERSION}}.zip](integritest-v{{VERSION}}.zip) and compare its SHA-256 with [integritest-v{{VERSION}}.sha256](integritest-v{{VERSION}}.sha256).
2. Extract the ZIP. In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the `extension` folder inside `integritest-v{{VERSION}}`. This folder contains `manifest.json`; selecting the outer folder causes a missing-manifest error. Check that Chrome shows extension ID `amlfomdhhaklmifkneplnngkbaabibgp`.
3. In PowerShell from the extracted folder, run `powershell -NoProfile -ExecutionPolicy Bypass -File native-host\install.ps1 -ExtensionId amlfomdhhaklmifkneplnngkbaabibgp`. Reload the extension afterward.
4. Open the extension popup and pair with the one-time code from the professor. Open the Form link displayed by the popup.

**Current package targets `http://127.0.0.1:8787`.** Pairing requires the professor's local teacher service to be running on that computer. A separate-device setup link will be published after the HTTPS gate passes. The [static setup page](index.html) repeats the student steps.

## USER GUIDE

On the registered Form, open the extension popup and start monitoring. It warns about other tabs in the same Chrome window but does not block Start. Submit the Form, then check that monitoring ended; contact the professor if automatic ending does not occur; **Report a problem and stop early** is a marked fallback for technical failure. Export local JSON if teacher delivery fails. The teacher downloads the service-generated report from the protected teacher view when the service is available.

## QUALITY ASSURANCE & TESTING

The browser and Windows foreground phases were checked live on the development machine. The teacher-service preview passed automated extension and local API checks for class rosters; full live acceptance remains open. Live packaged-extension and separate-device HTTPS checks are pending; final combined QA follows those gates.

## TEST RESULTS

Local automated results are recorded in the private development README. Full live acceptance is pending. The earlier local browser and Windows live gates passed on October 10–11, 2026. No deployed remote result is claimed.

## LIMITATIONS

Opening ChatGPT does not prove use. A foreground app event does not prove a document was read. Another browser or device may be outside this monitor. A connection gap means contact was missing, not that misconduct occurred. The current ZIP needs a local teacher service and is not ready as a stand-alone remote service.

## CONCLUSION

The local incident monitor is demonstrable. The teacher-delivery preview still needs live Chrome and HTTPS acceptance before it can be presented as remote monitoring.

## APPENDICES

- [MIT license](LICENSE)

- [Student setup page](index.html)
- [Versioned setup ZIP](integritest-v{{VERSION}}.zip)
- [SHA-256 checksum](integritest-v{{VERSION}}.sha256)
