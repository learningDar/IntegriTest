# Project instructions

Read `GOOGLE_FORMS_EXAM_MONITOR_MVP_CONTEXT.md` before changing scope or code. The Monday evening MVP is an incident report for review, not an automatic cheating verdict. Keep incident data to categories, timestamps, and needed hostnames; Phase 3 may add pseudonymous session and connection metadata. Build a tested local teacher demo first, then verify a deployed HTTPS flow before claiming remote monitoring works. Final combined QA is Phase 4.

Use the repository skills in `.agents/skills/` for the relevant work:

- `$exam-monitor-backend` for the service worker, storage, Windows native host, and teacher service.
- `$exam-monitor-frontend` for the Forms content script, popup, and teacher view.
- `$exam-monitor-testing` for repeatable checks and test fixtures.
- `$exam-monitor-qa` for phase acceptance and demonstration review.
- `$exam-monitor-docu` when a phase passes its tests or project behavior changes enough to make the README inaccurate.

Finish and test a phase before moving to the next. Record actual test results in the README after each passed phase; never imply untested features work. Provide reproducible manual test steps with code changes.
