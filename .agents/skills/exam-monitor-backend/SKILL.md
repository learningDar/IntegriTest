---
name: exam-monitor-backend
description: Implement or change this project's Chrome service worker, incident storage, Windows native host, or Phase 3 teacher service.
---

# Exam monitor backend

Read the project context before changing session logic or event data. The tested local baseline uses `background.js`, `chrome.storage.local`, and a C# native messaging host. Phase 3 adds automatic delivery to a teacher service.

- Keep one active session and attach incidents only while it is active. Persist state before acknowledging start/end; handle service worker restarts and native-host disconnects.
- Use the context's incident contract. Normalize timestamps and categories at the service worker boundary; deduplicate one user action across related tab, focus, and native signals.
- Store only hostnames for browser activity and categories for desktop activity. Never persist full URLs, window titles, file paths, answers, or typed content.
- Classify `chatgpt.com` as a ChatGPT page signal, not proof of use. Label unsupported desktop activity as generic focus loss or an interruption.
- Keep the host small: foreground process classification, timestamp, native messaging protocol, and no independent report storage. Validate content-script origin and host message shapes.
- Build the native host with the available .NET Framework compiler and document per-user host registration after the unpacked extension ID is known.
- For Phase 3, authenticate teacher reads and student session writes, queue minimal incidents locally for retry, deduplicate on the server by incident ID, and distinguish a missed heartbeat from an exam incident. Preserve local JSON export and never send answers, full URLs, document names, or executable paths.

For each change, state the phase and acceptance scenario, run the relevant checks, and give exact manual reproduction steps. Ask `$exam-monitor-qa` to review a completed phase gate before `$exam-monitor-docu` records the result.
