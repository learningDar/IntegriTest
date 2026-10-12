<table><tr><td width="112"><img src="public/brand/integritest-mark.svg" width="96" alt="IntegriTest laptop and eye mark"></td><td><h1>IntegriTest</h1><p>Google Forms exam activity records for professor review.</p></td></tr></table>

![Local monitor: verified](https://img.shields.io/badge/local_monitor-verified-445b9f) ![Teacher service: local checks](https://img.shields.io/badge/teacher_service-local_checks-6b668d) ![Remote flow: pending](https://img.shields.io/badge/remote_flow-pending-666666) [![License: MIT](https://img.shields.io/badge/license-MIT-a5b4fc)](LICENSE)

[Setup](#installation--setup) · [Professor guide](#user-guide) · [Architecture](#system-architecture--components) · [Test results](#test-results) · [Limitations](#limitations)

> **Status · October 12, 2026:** The v0.1.2 local Chrome and Windows monitor on `main` passed live checks. Phase 3 development is on `feat/phase3-teacher-monitoring`. Its v0.3.0 class roster and teacher APIs passed 22 local automated checks, including live requests to the local Worker. The new package still needs a full guided Chrome check; HTTPS and separate-device monitoring remain unverified. Incidents are observations, not cheating verdicts.

## PROJECT OVERVIEW

IntegriTest records observable activity during a Google Forms examination. A Chrome extension captures browser signals, a Windows companion classifies supported foreground apps, and a teacher service groups received incidents under an exam and assigned roster entry. The professor reviews the timeline and service-generated JSON.

## PROBLEM STATEMENT

Google Forms does not give a professor a record of tab changes or supported desktop apps during a quiz. The tested local monitor exports JSON, but remote review also needs automatic delivery and visible connection gaps. IntegriTest adds those records without claiming an incident proves misconduct.

## PROJECT OBJECTIVES

- Record a monitored Form session, another webpage, a ChatGPT page, a Chrome PDF, Word, Notepad, and a supported PDF reader when observable.
- Keep incident data to categories, timestamps, sources, app categories, and needed hostnames.
- Let a professor register a Form, reuse a class roster, issue one-time codes, and review activity by assigned name and ID.
- Deliver incidents during the exam, retry after an interruption, and retain a local JSON fallback.

## SYSTEM FEATURES

| Component | Behavior | Evidence |
| --- | --- | --- |
| Chrome extension | Start/end, tab and focus changes, fullscreen, copy/paste, local timeline and JSON, webpage/ChatGPT/PDF categories | v0.1.2 live gate passed; v0.3.0 guided gate pending |
| Windows companion | Foreground Word, Notepad, and verified Adobe Acrobat categories; disconnect signal | v0.1.2 live gate passed on the development machine |
| Professor service | Protected Form records, `.xlsx` classes, one-use codes, 10-second dashboard refresh, per-student timeline, JSON, 30-day cleanup | v0.3.0 local automated/API checks passed; full live and HTTPS gates pending |

The popup warns when other tabs are open in the same Chrome window. **Start in fullscreen** can be unchecked to keep window controls visible. A confirmed Form submission should end monitoring; **End Examination** remains available. Question timing, screenshot-key detection, CSV, and scoring are deferred.

## SYSTEM ARCHITECTURE / COMPONENTS

```mermaid
flowchart LR
    F[Google Form] --> E[Chrome MV3 extension]
    H[Windows native host] -->|App category + time| E
    E --> L[Local storage + JSON fallback]
    E -->|Queued incidents + heartbeat| W[Cloudflare Worker]
    W --> D[(D1)]
    D --> V[Protected professor view]
```

The extension service worker validates session boundaries and retries delivery. The C# native host sends categories and timestamps, without document contents or window titles. D1 keeps names and IDs in assignment/session metadata; incident rows keep only approved activity fields. The current service runs locally. The deployed arrow is a design until the HTTPS gate passes.

## SYSTEM WORKFLOW

1. The professor publishes a Google Form and registers its respondent `viewform` link in the teacher view.
2. The professor imports a class `.xlsx` whose first sheet has **Student ID** and **Name** headers. The browser previews and validates it, then sends only confirmed names and IDs. Manual ID-only assignments remain available.
3. Assigning a class to an exam generates fresh one-use codes, shown once for copying or a plain-text download. The professor shares each code privately.
4. A student pairs the extension, opens the registered Form from the popup, and starts. The service receives incidents and heartbeats; the dashboard refreshes every 10 seconds. A connection gap means contact was missed.
5. Observed submission confirmation or manual End closes the session. The professor downloads the service JSON and matches the roster entry with the separate Google Forms response manually.

A code identifies an assigned roster entry, **not a verified physical person**. The Form needs no Student ID question for pairing.

## TOOLS & TECHNOLOGIES

Chrome Manifest V3, JavaScript/HTML/CSS, Chrome storage/alarms/native messaging, Windows and a C# foreground host, Cloudflare Workers and D1, Wrangler, a pinned bundled `read-excel-file` reader, Node.js tests, Git, and GitHub. The project is [MIT licensed](LICENSE).

## INSTALLATION / SETUP

**Verified local baseline (`main`):** Load the repository folder at `chrome://extensions` as an unpacked extension. Run `native-host/install.ps1` with the Chrome extension ID, then reload the extension and refresh the Form. See [manual browser](tests/MANUAL_BROWSER.md) and [desktop](tests/MANUAL_DESKTOP.md) steps.

**Phase 3 local build (`feat/phase3-teacher-monitoring`):**

1. Run `npm.cmd install`, `npm.cmd run build:roster`, then `npm.cmd run db:local`.
2. Put `TEACHER_PASSWORD`, a random `SESSION_SECRET`, and `ALLOWED_EXTENSION_IDS=amlfomdhhaklmifkneplnngkbaabibgp` in an ignored `.dev.vars` file.
3. Run `npm.cmd run dev -- --ip 127.0.0.1 --port 8787`. Open the [local setup guide](http://127.0.0.1:8787/) and [professor workspace](http://127.0.0.1:8787/teacher.html).
4. Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-demo.ps1`. In Chrome's **Load unpacked** picker, select the inner `dist/integritest-v0.3.0/extension` folder containing `manifest.json`. Its expected ID is `amlfomdhhaklmifkneplnngkbaabibgp`. Install the bundled native host with that ID.

The v0.3.0 ZIP targets localhost. Its [SHA-256 file](public/downloads/integritest-v0.3.0.sha256) identifies the exact package. The local password is outside Git. A reachable HTTPS package will be built for its exact deployed origin after the local gate passes.

**HTTPS release after the local gate:** Cloudflare Workers and D1 are the selected host because the same Worker, static pages, scheduled cleanup, and D1 schema already run locally. Sign in with `npx wrangler login`, create `integritest` with `npx wrangler d1 create integritest`, replace the placeholder D1 ID in `wrangler.jsonc`, and apply migrations with `npx wrangler d1 migrations apply integritest --remote`. Set `TEACHER_PASSWORD`, `SESSION_SECRET`, and `ALLOWED_EXTENSION_IDS` with `npx wrangler secret put NAME`, then run `npx wrangler deploy`. Rebuild the package with `scripts/package-demo.ps1 -ServiceOrigin https://YOUR_WORKER_ORIGIN`, verify its checksum, and deploy the updated static assets. Pairing, delivery, gaps, ending, teacher access, and JSON privacy still require a separate Windows device before remote monitoring is called operational. See [Cloudflare's D1 local development](https://developers.cloudflare.com/d1/best-practices/local-development/) and [static assets](https://developers.cloudflare.com/workers/static-assets/binding/) guides.

| Host | Fit for this project |
| --- | --- |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/limits/) + [D1](https://developers.cloudflare.com/d1/platform/pricing/) | **Selected.** No service rewrite; Free allowances include 100,000 Worker requests/day, 5 million D1 rows read/day, 100,000 rows written/day, and 5 GB stored. This is an estimate of suitability for a controlled class demonstration, not a measured hosted result. |
| [Render Free](https://render.com/docs/free) | A service can sleep after 15 minutes idle; Free Postgres expires after 30 days. |
| Vercel + [Supabase Free](https://supabase.com/docs/guides/platform/free-project-pausing) | Requires splitting or rewriting the current Worker/D1 path; inactive Free projects can pause. |
| [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) | Can serve a guide, but cannot run the teacher API or database. |

## USER GUIDE

**Student:** Obtain a one-time code from the professor. Pair in the extension popup, open the registered Form link, choose whether to start in fullscreen, and select **Start Examination**. After submitting, check the status. If still Monitoring, select **End Examination**. Local JSON export is a fallback if delivery fails.

**Professor:** Sign in at the [workspace](public/teacher.html). Import a class workbook, inspect the preview and row errors, and save it. Register a published Form and assign the class to that exam. Copy or download the codes when shown. The dashboard refreshes while open; select a student to inspect the timeline and download the service JSON. Match Form responses separately.

The [public setup page](public/index.html) explains installation and what is recorded. The published [10-question Systems Integration and Architecture practice Form](https://docs.google.com/forms/d/e/1FAIpQLSdOyiXOUU2YWqp2RFh6SR_-dPf8ZmixAjrT7bZ4EE0TnS7oVQ/viewform) can be used for activity demonstrations. Its answers are not collected by the extension.

## QUALITY ASSURANCE & TESTING

Run `npm.cmd test`. With the local Worker running, set `SERVICE_TEST_URL=http://127.0.0.1:8787` and `SERVICE_TEST_PASSWORD` to the local teacher password to include API checks. Use [browser](tests/MANUAL_BROWSER.md), [desktop](tests/MANUAL_DESKTOP.md), and [remote](tests/MANUAL_REMOTE.md) manual steps for acceptance. Phase 4 combined QA waits for the Phase 3 remote gate.

## TEST RESULTS

| Check | Observed result |
| --- | --- |
| v0.1.2 Chrome and desktop gates | Passed on the development machine, including Word, Notepad, Adobe Acrobat, Chrome PDF, and host interruption |
| Interrupted v0.2.0 local teacher session | Paired and connected; service received 46 ordered incidents including webpage, ChatGPT, Chrome PDF, and Notepad; manual End recorded. The planned after-End webpage visit was not executed. |
| v0.3.0 automated tests with local Worker | **22/22 passed** on October 12, 2026, including class reuse, one-use codes, snapshots, privacy, retry, and end boundary |
| 30-day local retention check | A disposable old exam, code, session, and incident were removed by the scheduled handler; the earlier 46-event session remained |
| Local contact-gap check | An aged active session showed `GAP`; a heartbeat returned it to `CONNECTED` |
| Wrangler deployment dry run | Worker, D1 binding, and 13 current public assets bundled successfully; no deployment was made |
| v0.3.0 guided Chrome/Form and separate-device HTTPS gates | **Pending** |

<details><summary>Earlier test history</summary>

The local browser and Windows phases were demonstrated before the teacher service was added. The v0.2.0 live run established local pairing and delivery but did not complete the post-End page visit or Form submission checks. The automatic approval system reached a usage limit during that visit; it did not report an unsafe-action finding.

</details>

## LIMITATIONS

The extension cannot observe another browser or device. A foreground app category does not reveal what was read or typed. Opening ChatGPT does not prove it was used. A connection gap cannot show activity during the gap. Anyone controlling an unmanaged device may disable monitoring; a code cannot verify physical identity. Dedicated PDF readers other than Adobe Acrobat need explicit verification. Report retention is 30 days after the service cleanup runs.

## CONCLUSION

The local monitor is demonstrable. Phase 3's class roster and delivery service pass local automated checks, while the new guided Chrome flow and deployed remote operation still require acceptance before being presented as working remotely.

## APPENDICES

- [MVP context and phase gates](GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md)
- [Public release preparation](scripts/public-release/README.md)
- [MIT license](LICENSE)
- [Project skills](.agents/skills/)
