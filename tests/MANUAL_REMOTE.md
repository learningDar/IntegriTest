# Phase 3 teacher monitoring acceptance

Use assigned labels such as **Student 1** and **Student 2** with an editable practice Form containing a required **Student ID** question. The existing ten-question practice quiz does not yet have that question. Keep local `.dev.vars`, session credentials, join codes, and reports out of Git.

## Local setup

1. On `feat/phase3-teacher-monitoring`, run `npm.cmd install` and `npm.cmd run db:local`.
2. Create ignored `.dev.vars` with a strong `TEACHER_PASSWORD`, a random `SESSION_SECRET`, and `ALLOWED_EXTENSION_IDS=amlfomdhhaklmifkneplnngkbaabibgp`. Run `npm.cmd run dev -- --ip 127.0.0.1 --port 8787`.
3. Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-demo.ps1`. Check the ZIP SHA-256 against `public/downloads/exam-monitor-v0.2.0.sha256` and the public page at `http://127.0.0.1:8787/`. Click **Check connection** on that page and verify it reports the service version.
4. In a clean Chrome profile, load `dist/exam-monitor-v0.2.0/extension` as unpacked. Select the inner `extension` folder containing `manifest.json`, not the outer `exam-monitor-v0.2.0` folder. Confirm its ID is `amlfomdhhaklmifkneplnngkbaabibgp`. Register the native host with `powershell -NoProfile -ExecutionPolicy Bypass -File dist/exam-monitor-v0.2.0/native-host/install.ps1 -ExtensionId amlfomdhhaklmifkneplnngkbaabibgp`, then reload the extension.

## Student and teacher flow

1. Open `/teacher.html` in a separate browser context. Confirm the exam APIs reject an unsigned request and a wrong password. Sign in with the local password.
2. Create an exam with the published Form respondent `viewform` link and `Student 1` and `Student 2`. Confirm each code is displayed once, each ID appears as **Not paired**, a wrong code fails, and a used code cannot pair again. Switch between light and dark modes on the setup and professor pages and confirm the choice persists.
3. In the student Chrome profile, pair with the assigned code. Confirm the popup shows the assigned ID and the registered Form link. Try starting on a different Form and confirm it is refused. Return to the registered Form. Open another tab in the same window and confirm a warning appears without blocking Start.
4. Start monitoring with fullscreen unchecked. Confirm the teacher view shows **ACTIVE** and a recent last-contact time. Open a webpage, ChatGPT, and a Chrome PDF; bring Word, Notepad, and Adobe Acrobat to the foreground. Compare IDs, sequences, categories, timestamps, and hostnames in the teacher timeline and local export. No answers, document contents, full URLs, or paths should appear.
5. Stop the Worker temporarily. Continue a few browser actions. The popup must retain local events and show delivery pending/error. After more than 90 seconds, the teacher view should show **GAP** for the active session. Restart the Worker and use the popup retry button or wait for its 30-second alarm. Events should arrive once in order and the gap should clear.
6. On an incomplete Form, click Submit. Required-question validation should leave the session active. Complete the Form with dummy answers and submit. Confirm the `formResponse` confirmation page is observed, the popup ends the session, and the teacher report says `FORM_SUBMISSION_OBSERVED`. Repeat with a fresh code and click **End Examination** to verify `MANUAL`. If confirmation detection fails, use manual End and record the defect.
7. After End, visit another page and foreground Word. Neither teacher nor local report should gain another incident. Download the service JSON in the teacher view; compare event count to the visible timeline and verify no student JSON upload is needed. Match the assigned Student ID to the Form response separately.
8. Age a disposable local session and code beyond 30 days with `wrangler d1 execute --local`, invoke `http://127.0.0.1:8787/cdn-cgi/local/scheduled`, and verify incident, session, code, and unused exam rows were removed. Never run this manipulation against real data.

## HTTPS deployment gate

After Cloudflare sign-in, create a D1 database, put its real ID in `wrangler.jsonc`, apply migrations remotely, and set `TEACHER_PASSWORD`, `SESSION_SECRET`, and `ALLOWED_EXTENSION_IDS` as Worker secrets. Deploy the Worker. Rebuild the ZIP with `scripts/package-demo.ps1 -ServiceOrigin https://YOUR_WORKER_ORIGIN`, deploy again so the setup page serves that HTTPS package, and verify its checksum.

From a separate Windows device and browser context, repeat pairing, live browser and desktop delivery, contact-gap display, reconnection, ending, service JSON download, and teacher access checks. Record the actual origin, date, device, Chrome/extension version, event count, failures, and privacy inspection in the README. Do not mark Phase 3 passed from a localhost-only view.
