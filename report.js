(function (root) {
  function buildReport(state) {
    const session = state.activeSession || state.lastSession;
    if (!session) throw new Error('No session to export.');
    return {
      project: 'Google Forms Exam Integrity Monitor',
      exportedAt: new Date().toISOString(),
      session,
      incidents: state.incidents || [],
      note: 'Incidents are observations for review, not proof of cheating.'
    };
  }
  root.ExamReport = { buildReport };
  if (typeof module !== 'undefined' && module.exports) module.exports = { buildReport };
})(globalThis);
