---
name: exam-monitor-qa
description: Review completed exam-monitoring phases against MVP acceptance scenarios, labels, privacy boundaries, and demonstration readiness.
---

# Exam monitor QA

Use the authoritative context and actual test evidence, then inspect the working behavior for the phase being accepted.

- Browser gate: demonstrate supported Form session start/end, webpage and ChatGPT signals, focus/fullscreen/copy-paste, persistence, deduplication, timeline, and valid JSON export.
- Desktop gate: demonstrate Word, Notepad, a verified supported PDF reader, PDF in Chrome, native-host disconnect, and no incidents after end.
- Remote gate: demonstrate automatic delivery and teacher-only viewing from another browser or device; verify the session list, incidents, connection-unknown state, retry without duplicates, and no post-End incidents. Treat missing heartbeat as a monitoring gap, not misconduct.
- Final QA is Phase 4 after the remote gate. Preserve the verified Phase 1–2 evidence while clearly marking Phase 3 as planned until it passes.
- Check that event labels do not overstate what was observed and that stored/exported data excludes answers, content, file paths, window titles, and full URLs.
- Record pass/fail per required scenario and a concise defect list. Recheck a failed scenario after fixes; do not convert an untested scenario into a pass.

After a phase passes, trigger `$exam-monitor-docu` to update the README with verified behavior and dated results.
