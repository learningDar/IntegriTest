---
name: exam-monitor-docu
description: Update this project's README and supporting documentation after a tested phase passes or implemented behavior makes documentation inaccurate.
---

# Exam monitor documentation

Keep the public-facing README concise. Store detailed verification in `docs/TEST_EVIDENCE.md`. Treat implementation and test evidence as the source of truth; the project context defines intended scope.

- After each phase passes testing and QA, update the relevant README features, architecture, workflow, setup, user guide, limitations, and conclusion sections in one focused pass. Do not add QA or test-results sections back to the README.
- Record the phase, date, environment, exact checks, outcomes, and known gaps in `docs/TEST_EVIDENCE.md`. Mark planned or unverified behavior honestly in the README status.
- Describe the current local workflow and planned Phase 3 remote workflow separately until the remote gate passes. Move final QA evidence to Phase 4 without relabeling older test results as remote tests.
- Keep installation and demonstration steps executable by another team member. Do not fabricate test results or claim desktop identification from Chrome focus loss alone.
- README edits are also allowed when useful between phase gates; the gate is a documentation checkpoint, not an authorization restriction.
- Keep the README concise and synchronized with the context and current code; avoid repetitive edits that add no new verified information.
