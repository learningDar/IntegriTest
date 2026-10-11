# Phase 1 Chrome acceptance check

Use a practice Google Form with no real student answers. Load this repository as an unpacked extension from `chrome://extensions` in Developer mode. Record the Chrome version, date, and the observed result for every item before accepting Phase 1.

After each code update, click Reload on the extension card, refresh the Form, and reopen the monitor popup. Confirm the header displays the version in `manifest.json` (currently `v0.1.2`) before starting a new session. Open the test sites in a tab during the active session; a new tab may remain in the background, but its URL update should be recorded. Activate the tab as a separate check for duplicates.

1. Open the respondent `.../viewform` page. Leave **Start in fullscreen** checked, then start in the popup. Verify Monitoring, an `EXAM_STARTED` event, and fullscreen. Try Start again and confirm a second session is refused.
2. Open or activate an unrelated website, then `https://chatgpt.com/`. Confirm one readable incident for each, with only hostname stored. The ChatGPT wording must say the page was opened or activated and must not claim it was used.
3. Open a new tab, switch between it and the Form, move focus out of and back into Chrome, exit and restore fullscreen, then copy and paste dummy text on the Form. Check the matching event types and look for duplicates from a single action.
4. Close and reopen the popup; confirm the same session and timeline remain. Reload the extension/service worker and check the same data remains.
5. Export JSON, parse it, and compare session ID, event count, order, timestamps, severity, source, hostname, and null app category with the popup. Inspect the file for absence of full URLs, queries, answers, titles, paths, and clipboard text.
6. End Examination. Repeat webpage, ChatGPT, focus, copy, and paste actions. Confirm the incident count stays fixed and only one `EXAM_ENDED` event exists.
7. Start a new practice session with **Start in fullscreen** unchecked. Confirm Chrome tabs and window controls remain visible. Enter fullscreen with F11, then exit with F11; confirm both transitions appear in the timeline. End the session.

Use `node --test tests/browser.test.js` for the repeatable checks. Browser automation tests do not replace the observations above.
