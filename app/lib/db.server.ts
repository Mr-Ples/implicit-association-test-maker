import { scoreTrials } from "./iat";
import type { ResponseRecord, TestDefinition, TestRecord, Trial } from "./types";

type TestRow = {
  id: string;
  name: string;
  description: string;
  definition_json: string;
  created_at: string;
};

type ResponseRow = {
  id: string;
  test_id: string;
  participant_id: string;
  questionnaire_json: string;
  trials_json: string;
  score_json: string;
  created_at: string;
};

export async function listTests(db: D1Database): Promise<TestRecord[]> {
  const tests = await db
    .prepare("SELECT id, name, description, definition_json, created_at FROM tests ORDER BY created_at DESC")
    .all<TestRow>();
  const responses = await db.prepare("SELECT test_id, score_json FROM responses").all<{ test_id: string; score_json: string }>();
  const grouped = new Map<string, number[]>();

  for (const row of responses.results ?? []) {
    const score = JSON.parse(row.score_json) as { dScore: number | null };
    if (typeof score.dScore === "number") {
      grouped.set(row.test_id, [...(grouped.get(row.test_id) ?? []), score.dScore]);
    }
  }

  return (tests.results ?? []).map((row) => {
    const scores = grouped.get(row.id) ?? [];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      definition: JSON.parse(row.definition_json) as TestDefinition,
      createdAt: row.created_at,
      responseCount: scores.length,
      averageDScore: scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : null,
    };
  });
}

export async function getTest(db: D1Database, id: string) {
  const row = await db
    .prepare("SELECT id, name, description, definition_json, created_at FROM tests WHERE id = ?")
    .bind(id)
    .first<TestRow>();

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    definition: JSON.parse(row.definition_json) as TestDefinition,
    createdAt: row.created_at,
  };
}

export async function createTest(db: D1Database, definition: TestDefinition) {
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO tests (id, name, description, definition_json) VALUES (?, ?, ?, ?)")
    .bind(id, definition.name, definition.description, JSON.stringify(definition))
    .run();
  return id;
}

export async function saveResponse(
  db: D1Database,
  testId: string,
  participantId: string,
  questionnaire: Record<string, string>,
  trials: Trial[],
) {
  const score = scoreTrials(trials);
  const responseId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO responses (id, test_id, participant_id, questionnaire_json, trials_json, score_json) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(responseId, testId, participantId, JSON.stringify(questionnaire), JSON.stringify(trials), JSON.stringify(score))
    .run();
  return { responseId, score };
}

export async function getResponse(db: D1Database, id: string): Promise<ResponseRecord | null> {
  const row = await db.prepare("SELECT * FROM responses WHERE id = ?").bind(id).first<ResponseRow>();
  return row ? mapResponse(row) : null;
}

export async function listResponsesForTest(db: D1Database, testId: string): Promise<ResponseRecord[]> {
  const rows = await db
    .prepare("SELECT * FROM responses WHERE test_id = ? ORDER BY created_at DESC")
    .bind(testId)
    .all<ResponseRow>();

  return (rows.results ?? []).map(mapResponse);
}

function mapResponse(row: ResponseRow): ResponseRecord {
  return {
    id: row.id,
    testId: row.test_id,
    participantId: row.participant_id,
    questionnaire: JSON.parse(row.questionnaire_json) as Record<string, string>,
    trials: JSON.parse(row.trials_json) as Trial[],
    score: JSON.parse(row.score_json) as ReturnType<typeof scoreTrials>,
    createdAt: row.created_at,
  };
}
