---
name: exam-monitor-testing
description: Add and run focused repeatable checks for exam sessions, incident classification, deduplication, storage, and export behavior.
---

# Exam monitor testing

Use the project context's phase gates as the test contract. Prefer small dependency-free Node checks for pure JavaScript logic and a short reproducible Chrome/Windows manual checklist for browser and foreground behavior.

- Test behavior with meaningful inputs: session start/end, correct session ID, hostname and app-category classification, deduplication, persistence, and JSON shape.
- Verify that browser-only focus loss never becomes a named desktop app and that incidents stop after exam end.
- For Phase 3, test session pairing, teacher access control, event retry/idempotency, heartbeat gaps, reconnect, offline local capture, correct end boundaries, and the exact server-side privacy fields. Demonstrate the teacher view from a separate browser or device; a local-only test does not pass the remote gate.
- Keep fixtures free of real student answers, browsing history, document names, and personal data.
- Report command, environment, result, and any skipped manual scenario. Do not mark a phase passed until required demonstrations are observed.

Send results to `$exam-monitor-qa` for gate review. Once a gate passes, `$exam-monitor-docu` records the evidence in the README.
