CREATE TABLE exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  form_id TEXT NOT NULL,
  form_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE join_codes (
  code_hash TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id),
  student_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT,
  UNIQUE(exam_id, student_id)
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id),
  student_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  paired_at TEXT NOT NULL,
  started_at TEXT,
  ended_at TEXT,
  end_reason TEXT,
  last_contact TEXT,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  UNIQUE(exam_id, student_id)
);

CREATE TABLE incidents (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  sequence INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  received_at TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  details TEXT NOT NULL,
  source TEXT NOT NULL,
  app_category TEXT,
  hostname TEXT,
  domain_category TEXT,
  UNIQUE(session_id, sequence)
);

CREATE INDEX incidents_by_session ON incidents(session_id, sequence);
CREATE INDEX sessions_by_exam ON sessions(exam_id, paired_at);
