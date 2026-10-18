# Internal verification record

## QUALITY ASSURANCE & TESTING

Run `npm.cmd test`. With the local Worker running, set `SERVICE_TEST_URL=http://127.0.0.1:8787` and `SERVICE_TEST_PASSWORD` to the local teacher password to include API checks. Use [browser](tests/MANUAL_BROWSER.md), [desktop](tests/MANUAL_DESKTOP.md), and [remote](tests/MANUAL_REMOTE.md) manual steps for acceptance. Phase 4 combined QA waits for the Phase 3 remote gate.

## TEST RESULTS

| Check | Observed result |
| --- | --- |
| v0.1.2 Chrome and desktop gates | Passed on the development machine, including Word, Notepad, Adobe Acrobat, Chrome PDF, and host interruption |
| v0.2.0 local teacher session and after-End check | Paired and connected; service received 46 ordered incidents including webpage, ChatGPT, Chrome PDF, and Notepad; manual End recorded. On October 12, a later Chrome visit to `iana.org` left the ended service session at 46 incidents. |
| v0.3.0 automated tests with local Worker | **22/22 passed** on October 12, 2026, including class reuse, one-use codes, snapshots, privacy, retry, and end boundary |
| 30-day local retention check | A disposable old exam, code, session, and incident were removed by the scheduled handler; the earlier 46-event session remained |
| Local contact-gap check | An aged active session showed `GAP`; a heartbeat returned it to `CONNECTED` |
| Wrangler deployment dry run | Worker, D1 binding, and 13 current public assets bundled successfully; no deployment was made |
| v0.3.0 live local student flow | Student 1 paired and connected; the service received 46 unique, ordered incidents including a webpage, ChatGPT, Chrome PDF, Notepad, Word, and Adobe Acrobat before manual End. Student 3's incomplete Form showed validation errors and stayed Monitoring; its completed practice Form ended automatically with `FORM_SUBMISSION_OBSERVED` and 41 unique, ordered incidents. A later page visit left the service report at 41. Service JSON contained approved incident fields and no answer text, full URLs, or document paths. |
| v0.3.0 live professor flow | Password-protected view showed Student 3's ended status, 41-event timeline, and service JSON link. A dummy `.xlsx` preview kept text ID `0012`, the class saved, and assigning it generated one-use codes and Student 1/Student 2 rows. Exam-title search narrowed 77 local test records to the selected exam. |
| v0.3.0 actual outage recovery | Student 4's `www.iana.org` event was captured on October 12 at 11:48:50 UTC while port 8787 had no listener and received by D1 on October 13 at 04:26:35 UTC after Chrome and the service returned. The ended session has 89 incidents with 89 unique IDs and sequences 1–89. The teacher's gap label during this outage was not observed live. |
| v0.3.1 automated and professor UI checks | **23/23 passed** with the local Worker on October 13, including refusal of normal End before confirmation, a separate early-stop reason, severity counts, latest-event fields, and one-use code state. The professor table and full-report action were inspected in Chrome in dark and light modes. |
| v0.3.1 paired-session early stop | Student 5 paired and started with the Windows monitor connected. Normal End was disabled and the marked problem-stop control was available. The student used that control before submitting. The professor table showed **Ended early** and **Stopped before confirmed submission**. D1 stored `STUDENT_STOPPED_EARLY` with 16 incidents, 16 unique IDs, and sequences 1–16. Opening `www.iana.org` after End left the report at 16 incidents. |
| v0.3.2 local automated check | **23/23 passed** with the local Worker on October 18. The end-acknowledgement test now waits within a bounded interval instead of assuming a fixed 250 ms response. The package contains manifest version 0.3.2 and its ZIP matches the published SHA-256. |
| v0.3.2 guided professor UI check | On October 18, the setup showed one auto-height card per step at desktop and 390 px width. The full-width monitoring table showed code state, counts, status, latest activity, and event label; search and status filter changed visible rows correctly. Student 3's 41-event report opened in a modal with newest events first. Close and Escape returned keyboard focus to the report button. Dark and light views were inspected. A duplicate modal scrollbar and focus loss during table refresh were fixed during this check. |
| Phase 3 grouped setup and late additions | On October 18, the local Worker passed **24/24** automated checks, including name-only and explicit-ID late additions, duplicate rejection, one-use pairing, and report privacy. Two dummy late students were created through the local professor UI: one received an internal ID and one kept `STU009`. After the compact layout pass, paired cards measured 299, 332, and 302 px high at desktop width. Saved exams scrolled within a 128 px list without overlapping rows; the class list's measured row height and gap allow five rows within its 218 px limit. At 390 px width, cards stacked without horizontal overflow. A live five-class list check remains pending. |
| Separate-device HTTPS gate | **Pending.** No hosted service or remote device test has been run. |

<details><summary>Earlier test history</summary>

The local browser and Windows phases were demonstrated before the teacher service was added. The v0.2.0 live run established local pairing and delivery, and a later post-End page visit left the service report unchanged. The v0.3.0 guided Chrome/Form and professor checks above are partial local gate evidence. The automatic approval system reached a usage limit during the original after-End visit; it did not report an unsafe-action finding.

</details>
