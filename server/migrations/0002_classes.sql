CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE class_students (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  PRIMARY KEY (class_id, student_id)
);

ALTER TABLE join_codes ADD COLUMN student_name TEXT;
ALTER TABLE sessions ADD COLUMN student_name TEXT;
