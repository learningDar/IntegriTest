<p align="center"><img src="public/brand/integritest-mark.svg" width="176" alt="IntegriTest laptop and eye icon"></p>

<h1 align="center">IntegriTest</h1>

<p align="center">Google Forms exam activity records for professor review.</p>

<p align="center"><img alt="Local monitor verified" src="https://img.shields.io/badge/local_monitor-verified-445b9f"> <img alt="Teacher service local checks" src="https://img.shields.io/badge/teacher_service-local_checks-6b668d"> <img alt="Remote flow pending" src="https://img.shields.io/badge/remote_flow-pending-666666"> <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-a5b4fc"></a></p>

<p align="center"><a href="#installation--setup">Setup</a> · <a href="#user-guide">Professor guide</a> · <a href="#system-architecture--components">Architecture</a> · <a href="#limitations">Limitations</a></p>

<p align="center"><strong>Phase 3:</strong> local teacher demo in progress · HTTPS and separate-device verification pending</p>

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

The extension service worker validates session boundaries and retries delivery. The C# native host sends categories and timestamps, without document contents or window titles. D1 keeps names and IDs in assignment/session metadata; incident rows keep only approved activity fields. The Worker currently runs locally; HTTPS delivery remains unverified.

## SYSTEM WORKFLOW

1. The professor publishes a Google Form and registers its respondent `viewform` link in the teacher view.
2. The professor imports a class `.xlsx` whose first sheet has **Student ID** and **Name** headers. The browser previews and validates it, then sends only confirmed names and IDs. For a late arrival, the professor can enter a name with an optional Student ID; a name-only entry receives an internal ID. Existing ID-only assignments remain compatible.
3. Assigning a class to an exam generates fresh one-use codes, shown once for copying or a plain-text download. The professor shares each code privately.
4. A student pairs the extension, opens the registered Form from the popup, and starts. The service receives incidents and heartbeats; the dashboard refreshes every 10 seconds. A connection gap means contact was missed.
5. Observed submission confirmation ends a paired session. A technical issue can be marked as an early stop; local-only sessions retain manual End. The professor downloads the service JSON and matches the roster entry with the separate Google Forms response manually.

A code identifies an assigned roster entry, **not a verified physical person**. The Form needs no Student ID question for pairing.

## TOOLS & TECHNOLOGIES

Chrome Manifest V3, JavaScript/HTML/CSS, Chrome storage/alarms/native messaging, Windows and a C# foreground host, Cloudflare Workers and D1, Wrangler, a pinned bundled `read-excel-file` reader, Node.js tests, Git, and GitHub. The project is [MIT licensed](LICENSE).

## INSTALLATION / SETUP

**Verified local baseline (`main`):** Load the repository folder at `chrome://extensions` as an unpacked extension. Run `native-host/install.ps1` with the Chrome extension ID, then reload the extension and refresh the Form. See [manual browser](tests/MANUAL_BROWSER.md) and [desktop](tests/MANUAL_DESKTOP.md) steps.

**Phase 3 local build (`feat/phase3-teacher-monitoring`):**

1. Run `npm.cmd install`, `npm.cmd run build:roster`, then `npm.cmd run db:local`.
2. Put `TEACHER_PASSWORD`, a random `SESSION_SECRET`, and `ALLOWED_EXTENSION_IDS=amlfomdhhaklmifkneplnngkbaabibgp` in an ignored `.dev.vars` file.
3. Run `npm.cmd run dev -- --ip 127.0.0.1 --port 8787`. Open the [local setup guide](http://127.0.0.1:8787/) and [professor workspace](http://127.0.0.1:8787/teacher.html).
4. Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-demo.ps1`. In Chrome's **Load unpacked** picker, select the inner `dist/integritest-v0.3.2/extension` folder containing `manifest.json`. Its expected ID is `amlfomdhhaklmifkneplnngkbaabibgp`. Install the bundled native host with that ID.

The v0.3.2 ZIP targets localhost. Its [SHA-256 file](public/downloads/integritest-v0.3.2.sha256) identifies the exact package. The local password is outside Git. A reachable HTTPS package will be built for its exact deployed origin after the local gate passes.

**HTTPS release after the local gate:** Cloudflare Workers and D1 are the selected host because the same Worker, static pages, scheduled cleanup, and D1 schema already run locally. Sign in with `npx wrangler login`, create `integritest` with `npx wrangler d1 create integritest`, replace the placeholder D1 ID in `wrangler.jsonc`, and apply migrations with `npx wrangler d1 migrations apply integritest --remote`. Set `TEACHER_PASSWORD`, `SESSION_SECRET`, and `ALLOWED_EXTENSION_IDS` with `npx wrangler secret put NAME`, then run `npx wrangler deploy`. Rebuild the package with `scripts/package-demo.ps1 -ServiceOrigin https://YOUR_WORKER_ORIGIN`, verify its checksum, and deploy the updated static assets. Pairing, delivery, gaps, ending, teacher access, and JSON privacy still require a separate Windows device before remote monitoring is called operational. See [Cloudflare's D1 local development](https://developers.cloudflare.com/d1/best-practices/local-development/) and [static assets](https://developers.cloudflare.com/workers/static-assets/binding/) guides.

| Host | Fit for this project |
| --- | --- |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/limits/) + [D1](https://developers.cloudflare.com/d1/platform/pricing/) | **Selected.** No service rewrite; Free allowances include 100,000 Worker requests/day, 5 million D1 rows read/day, 100,000 rows written/day, and 5 GB stored. This is an estimate of suitability for a controlled class demonstration, not a measured hosted result. |
| [Render Free](https://render.com/docs/free) | A service can sleep after 15 minutes idle; Free Postgres expires after 30 days. |
| Vercel + [Supabase Free](https://supabase.com/docs/guides/platform/free-project-pausing) | Requires splitting or rewriting the current Worker/D1 path; inactive Free projects can pause. |
| [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) | Can serve a guide, but cannot run the teacher API or database. |

The October 19 local demonstration needs no hosting payment or Chrome Web Store listing. Store publication is optional and requires a [one-time developer registration fee](https://developer.chrome.com/docs/webstore/register/). A later Cloudflare deployment can use the included `workers.dev` address and Free allowances; the Workers Paid plan starts at $5 USD/month. Free D1 queries fail after a daily read or write limit is reached. Measure D1 rows read by the table's 10-second aggregate query before a full-class rollout; the free-tier fit is an estimate, not a hosted result. See [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), and [workers.dev routing](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

## USER GUIDE

**Student:** Obtain a one-time code from the professor. Pair in the extension popup, open the registered Form link, choose whether to start in fullscreen, and select **Start Examination**. The popup has a saved dark/light choice and lists the newest local incident first. After submitting, check the status. If it stays Monitoring after confirmed submission, contact the professor. For a technical failure, **Report a problem and stop early** records a distinct early end. Local JSON export is a fallback if delivery fails.

**Professor:** Sign in at the [workspace](public/teacher.html). The setup pairs import/saved classes, register/choose exam, and selected exam/late additions. Paired cards match heights; saved lists scroll within their cards. Import a class workbook and inspect preview errors, register and select a published Form, then assign the class. For a late student, enter `Name` or `Name | Student ID`; the service supplies a distinct internal ID when omitted. Copy or download codes when shown. The full-width table refreshes every 10 seconds and shows each student's code state, start time, Low/Medium/High counts, connection status, latest activity, and event name. **View full report** opens a modal with newest incidents first and a JSON download; that exported JSON remains in ascending sequence. The raw code is shown only when issued. Match Form responses separately.

The [public setup page](public/index.html) explains installation and what is recorded. The published [10-question Systems Integration and Architecture practice Form](https://docs.google.com/forms/d/e/1FAIpQLSdOyiXOUU2YWqp2RFh6SR_-dPf8ZmixAjrT7bZ4EE0TnS7oVQ/viewform) can be used for activity demonstrations. Its answers are not collected by the extension.

## LIMITATIONS

The extension cannot observe another browser or device. A foreground app category does not reveal what was read or typed. Opening ChatGPT does not prove it was used. A connection gap cannot show activity during the gap. Anyone controlling an unmanaged device may disable monitoring; a code cannot verify physical identity. Dedicated PDF readers other than Adobe Acrobat need explicit verification. Report retention is 30 days after the service cleanup runs.

## CONCLUSION

The local monitor is demonstrable. Phase 3's roster, delivery, Form submission, outage recovery, professor table, report modal, and paired-session end control have local verification recorded in the private development documentation. Live gap display during an outage and the deployed separate-device flow remain before Phase 3 or remote monitoring can be presented as complete.

## APPENDICES

- [MVP context and phase gates](GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md)
- [Public release preparation](scripts/public-release/README.md)
- [MIT license](LICENSE)
- [Project skills](.agents/skills/)
