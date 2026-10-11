---
name: exam-monitor-frontend
description: Implement or change the Google Forms content script, extension popup, or Phase 3 teacher view.
---

# Exam monitor frontend

Read the project context for supported Forms pages, event labels, and privacy limits. Use vanilla HTML, CSS, and JavaScript for the MVP.

- The Forms content script reports only observable visibility, focus, fullscreen, and copy/paste signals. Do not read or save answers, question text, or clipboard contents.
- The popup must make active/inactive and native-host status clear, support start/end, show the session timeline, and export valid JSON.
- Explain incidents as observations. Use “ChatGPT page opened or activated” and “Word became active,” never “student used ChatGPT” or “student cheated.”
- Render stored/user text safely and keep controls usable with keyboard and visible status messages.
- Do not keep session state only in popup memory. Reopening the popup must restore the report from extension storage.
- In Phase 3, show pairing and remote delivery status in the popup. The teacher view shows authorized sessions, incident timelines, and connection gaps without a cheating verdict or student answer content.

For each change, state its phase, run relevant checks, and provide exact Chrome manual test steps. Hand a completed phase to `$exam-monitor-qa`, then `$exam-monitor-docu` for verified README updates.
