export type CategoryKey = "conceptA" | "conceptB" | "attributeA" | "attributeB";
export type Side = "left" | "right";
export type TrialCondition = "target" | "attribute" | "compatible" | "incompatible" | "reversedTarget";
export type TrialPhase = "training" | "practice" | "critical";

export interface CategoryDefinition {
  label: string;
  items: string[];
}

export interface QuestionnaireQuestion {
  id: string;
  prompt: string;
  type: "text" | "number" | "select";
  options: string[];
  required: boolean;
}

export interface TestDefinition {
  name: string;
  description: string;
  conceptA: CategoryDefinition;
  conceptB: CategoryDefinition;
  attributeA: CategoryDefinition;
  attributeB: CategoryDefinition;
  questionnaire: QuestionnaireQuestion[];
}

export interface Trial {
  block: number;
  condition: TrialCondition;
  phase: TrialPhase;
  stimulus: string;
  categoryKey: CategoryKey;
  leftLabel: string;
  rightLabel: string;
  correctSide: Side;
  responseSide: Side;
  latencyMs: number;
  correct: boolean;
}

export interface ScoreResult {
  dScore: number | null;
  compatibleMeanMs: number | null;
  incompatibleMeanMs: number | null;
  errorRate: number;
  fastRate: number;
  valid: boolean;
  warnings: string[];
  interpretation: string;
}

export interface TestRecord {
  id: string;
  name: string;
  description: string;
  definition: TestDefinition;
  createdAt: string;
  responseCount: number;
  averageDScore: number | null;
}

export interface ResponseRecord {
  id: string;
  testId: string;
  participantId: string;
  questionnaire: Record<string, string>;
  trials: Trial[];
  score: ScoreResult;
  createdAt: string;
}
