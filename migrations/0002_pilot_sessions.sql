CREATE TABLE pilot_sessions (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  questionnaire_json TEXT NOT NULL,
  trials_json TEXT NOT NULL,
  score_json TEXT NOT NULL,
  feedback_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX pilot_sessions_test_id_created_at_idx ON pilot_sessions(test_id, created_at);
