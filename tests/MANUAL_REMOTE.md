# Phase 3 remote teacher acceptance check (planned)

This checklist defines the next phase. No item is marked passed until its behavior is implemented and observed. Use a practice Google Form, pseudonymous participant labels, and dummy content. Do not commit credentials or exported student reports.

## Local demo checkpoint

1. Start the teacher service locally and open its teacher-only view in a separate browser context. Record the start command, server version, and local address.
2. Create an exam code. Pair the student extension with a pseudonymous label, start a monitored Form session, and confirm the teacher view shows that session without a manual JSON handoff.
3. Open an unrelated webpage, ChatGPT, and a Chrome PDF; bring Word, Notepad, and the verified PDF reader to the foreground. Compare the teacher timeline with the extension timeline and local JSON export. Check incident IDs, timestamps, sources, categories, and hostnames.
4. Stop the teacher service temporarily. Confirm local monitoring and JSON export continue, the teacher view later shows a connection gap, and queued incidents arrive once after reconnect.
5. End the exam. Repeat a browser and desktop action. Confirm no new exam incident appears in local or teacher reports, and the teacher view shows End.
6. Reject teacher-view access without teacher authentication and reject wrong or expired exam codes. Inspect server storage for the absence of full URLs, paths, titles, answers, clipboard contents, and executable names.

## Deployment gate

Deploy to a reachable HTTPS host. From a separate device, repeat pairing, live incident delivery, connection-gap display, End, and teacher access checks. A dashboard visible only on the development machine does not pass the remote gate. Record the host, setup, commands, date, environment, outcomes, and remaining gaps in the README after this gate passes.
