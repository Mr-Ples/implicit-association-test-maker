import type {
  CategoryKey,
  QuestionnaireQuestion,
  ScoreResult,
  Side,
  TestDefinition,
  Trial,
} from "./types";

const MIN_ITEMS = 2;
const DECLINE_TO_ANSWER = "Decline to answer";
const DEFAULT_QUESTIONNAIRE: QuestionnaireQuestion[] = [
  {
    id: "demographic-age",
    prompt: "Age",
    type: "select",
    options: ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65 or older", DECLINE_TO_ANSWER],
    required: false,
  },
  {
    id: "demographic-sex-identity",
    prompt: "Sex / identity",
    type: "select",
    options: ["Woman", "Man", "Non-binary", "Self-describe", DECLINE_TO_ANSWER],
    required: false,
  },
  {
    id: "demographic-ethnicity",
    prompt: "Ethnicity",
    type: "select",
    options: [
      "Asian",
      "Black or African American",
      "Hispanic or Latino/a/x",
      "Middle Eastern or North African",
      "Native American or Alaska Native",
      "Native Hawaiian or Pacific Islander",
      "White",
      "Multiracial",
      "Another identity",
      DECLINE_TO_ANSWER,
    ],
    required: false,
  },
];

const DEFAULT_QUESTIONNAIRE_IDS = new Set(DEFAULT_QUESTIONNAIRE.map((question) => question.id));

export function isDefaultQuestionnaireQuestion(id: string) {
  return DEFAULT_QUESTIONNAIRE_IDS.has(id);
}

export function defaultDefinition(): TestDefinition {
  return {
    name: "",
    description: "",
    conceptA: { label: "Concept A", items: ["Alpha", "Beta"] },
    conceptB: { label: "Concept B", items: ["Gamma", "Delta"] },
    attributeA: { label: "Good", items: ["Good", "Joy", "Excellent", "Positive", "Nice", "Great", "Like", "Happy", "Pleasant"] },
    attributeB: { label: "Bad", items: ["Bad", "Pain", "Negative", "Awful", "Unpleasant", "Terrible", "Dislike", "Sad", "Depressed"] },
    questionnaire: defaultQuestionnaire(),
  };
}

export function normalizeDefinition(input: unknown): TestDefinition {
  const value = input as Partial<TestDefinition>;
  const definition: TestDefinition = {
    name: cleanText(value.name, "Untitled IAT").slice(0, 120),
    description: cleanText(value.description, "").slice(0, 1200),
    conceptA: normalizeCategory(value.conceptA, "Concept A"),
    conceptB: normalizeCategory(value.conceptB, "Concept B"),
    attributeA: normalizeCategory(value.attributeA, "Attribute A"),
    attributeB: normalizeCategory(value.attributeB, "Attribute B"),
    questionnaire: normalizeQuestionnaire(value.questionnaire),
  };

  validateDefinition(definition);
  return definition;
}

export function validateDefinition(definition: TestDefinition) {
  const categories = [
    definition.conceptA,
    definition.conceptB,
    definition.attributeA,
    definition.attributeB,
  ];

  if (!definition.name.trim()) {
    throw new Error("Test name is required.");
  }

  for (const category of categories) {
    if (!category.label.trim()) {
      throw new Error("Every category needs a label.");
    }

    if (category.items.length < MIN_ITEMS) {
      throw new Error(`"${category.label}" needs at least ${MIN_ITEMS} stimuli.`);
    }
  }
}

export function createTrialPlan(definition: TestDefinition): Array<Omit<Trial, "responseSide" | "latencyMs" | "correct">> {
  const compatibleFirst = Math.random() < 0.5;
  const firstPairing = compatibleFirst ? "compatible" : "incompatible";
  const secondPairing = compatibleFirst ? "incompatible" : "compatible";
  const firstCombined = combinedBlockConfig(firstPairing, "normal", definition);
  const secondCombined = combinedBlockConfig(secondPairing, "reversed", definition);

  const blocks = [
    block(1, 20, ["conceptA", "conceptB"], conceptBlockConfig("normal", definition), "target", "training", definition),
    block(2, 20, ["attributeA", "attributeB"], attributeBlockConfig(definition), "attribute", "training", definition),
    block(3, 20, ["conceptA", "conceptB", "attributeA", "attributeB"], firstCombined, firstPairing, "practice", definition),
    block(4, 40, ["conceptA", "conceptB", "attributeA", "attributeB"], firstCombined, firstPairing, "critical", definition),
    block(5, 40, ["conceptA", "conceptB"], conceptBlockConfig("reversed", definition), "reversedTarget", "training", definition),
    block(6, 20, ["conceptA", "conceptB", "attributeA", "attributeB"], secondCombined, secondPairing, "practice", definition),
    block(7, 40, ["conceptA", "conceptB", "attributeA", "attributeB"], secondCombined, secondPairing, "critical", definition),
  ];

  return blocks.flat();
}

export function createPilotTrialPlan(definition: TestDefinition): Array<Omit<Trial, "responseSide" | "latencyMs" | "correct">> {
  return [
    block(1, 20, ["conceptA", "conceptB"], conceptBlockConfig("normal", definition), "target", "training", definition),
    block(2, 20, ["attributeA", "attributeB"], attributeBlockConfig(definition), "attribute", "training", definition),
  ].flat();
}

export function scoreTrials(trials: Trial[]): ScoreResult {
  const usable = trials.filter((trial) => trial.condition === "compatible" || trial.condition === "incompatible");
  const fastCount = usable.filter((trial) => trial.latencyMs < 300).length;
  const fastRate = usable.length ? fastCount / usable.length : 0;
  const warnings: string[] = [];

  if (fastRate > 0.1) {
    warnings.push("More than 10% of scored trials were faster than 300 ms.");
  }

  const cleaned = usable.filter((trial) => trial.latencyMs >= 300 && trial.latencyMs <= 10000);
  if (cleaned.length < usable.length) {
    warnings.push("Trials below 300 ms or above 10,000 ms were excluded before scoring.");
  }

  const blockScores = new Map<string, number[]>();
  const groups = [
    "compatible-practice",
    "compatible-critical",
    "incompatible-practice",
    "incompatible-critical",
  ] as const;

  for (const group of groups) {
    const [condition, phase] = group.split("-") as [Trial["condition"], Trial["phase"]];
    const trialsInBlock = cleaned.filter((trial) => trial.condition === condition && trial.phase === phase);
    const correctLatencies = trialsInBlock.filter((trial) => trial.correct).map((trial) => trial.latencyMs);
    const replacement = mean(correctLatencies) ?? mean(trialsInBlock.map((trial) => trial.latencyMs)) ?? 0;
    blockScores.set(
      group,
      trialsInBlock.map((trial) => (trial.correct ? trial.latencyMs : replacement + 600)),
    );
  }

  const compatiblePractice = blockScores.get("compatible-practice") ?? [];
  const compatibleCritical = blockScores.get("compatible-critical") ?? [];
  const incompatiblePractice = blockScores.get("incompatible-practice") ?? [];
  const incompatibleCritical = blockScores.get("incompatible-critical") ?? [];
  const practiceSd = standardDeviation([...compatiblePractice, ...incompatiblePractice]);
  const criticalSd = standardDeviation([...compatibleCritical, ...incompatibleCritical]);
  const compatiblePracticeMean = mean(compatiblePractice);
  const compatibleCriticalMean = mean(compatibleCritical);
  const incompatiblePracticeMean = mean(incompatiblePractice);
  const incompatibleCriticalMean = mean(incompatibleCritical);

  let dScore: number | null = null;
  if (
    compatiblePracticeMean !== null &&
    compatibleCriticalMean !== null &&
    incompatiblePracticeMean !== null &&
    incompatibleCriticalMean !== null &&
    practiceSd &&
    criticalSd
  ) {
    dScore =
      ((incompatiblePracticeMean - compatiblePracticeMean) / practiceSd +
        (incompatibleCriticalMean - compatibleCriticalMean) / criticalSd) /
      2;
  } else {
    warnings.push("There were not enough valid trials to compute a D-score.");
  }

  const errorRate = usable.length ? usable.filter((trial) => !trial.correct).length / usable.length : 0;
  const compatibleMeanMs = mean([...compatiblePractice, ...compatibleCritical]);
  const incompatibleMeanMs = mean([...incompatiblePractice, ...incompatibleCritical]);

  return {
    dScore,
    compatibleMeanMs,
    incompatibleMeanMs,
    errorRate,
    fastRate,
    valid: dScore !== null && fastRate <= 0.1,
    warnings,
    interpretation: interpretDScore(dScore),
  };
}

export function scorePilotTrials(trials: Trial[]): ScoreResult {
  const fastCount = trials.filter((trial) => trial.latencyMs < 300).length;
  const errorCount = trials.filter((trial) => !trial.correct).length;

  return {
    dScore: null,
    compatibleMeanMs: null,
    incompatibleMeanMs: null,
    errorRate: trials.length ? errorCount / trials.length : 0,
    fastRate: trials.length ? fastCount / trials.length : 0,
    valid: true,
    warnings: [],
    interpretation: "Pilot review only",
  };
}

export function summarizePilotItems(trials: Trial[]) {
  const itemMap = new Map<string, {
    stimulus: string;
    categoryKey: Trial["categoryKey"];
    firstSeenIndex: number;
    seenCount: number;
    wrongCount: number;
    totalLatencyMs: number;
    averageLatencyMs: number;
  }>();

  trials.forEach((trial, index) => {
    const key = `${trial.categoryKey}:${trial.stimulus}`;
    const item = itemMap.get(key) ?? {
      stimulus: trial.stimulus,
      categoryKey: trial.categoryKey,
      firstSeenIndex: index,
      seenCount: 0,
      wrongCount: 0,
      totalLatencyMs: 0,
      averageLatencyMs: 0,
    };

    item.seenCount += 1;
    item.wrongCount += trial.correct ? 0 : 1;
    item.totalLatencyMs += trial.latencyMs;
    item.averageLatencyMs = item.totalLatencyMs / item.seenCount;
    itemMap.set(key, item);
  });

  return [...itemMap.values()].sort((a, b) => a.firstSeenIndex - b.firstSeenIndex);
}

export function interpretDScore(dScore: number | null) {
  if (dScore === null) return "Insufficient valid data";
  const strength = Math.abs(dScore) < 0.15 ? "little to no" : Math.abs(dScore) < 0.35 ? "slight" : Math.abs(dScore) < 0.65 ? "moderate" : "strong";
  const direction = dScore >= 0 ? "compatible-pair preference" : "incompatible-pair preference";
  return `${strength} ${direction}`;
}

function normalizeCategory(input: unknown, fallback: string) {
  const value = input as { label?: unknown; items?: unknown };
  return {
    label: cleanText(value?.label, fallback).slice(0, 80),
    items: normalizeItems(value?.items),
  };
}

function normalizeQuestionnaire(input: unknown): QuestionnaireQuestion[] {
  const customQuestions = Array.isArray(input) ? input : [];
  const normalized = customQuestions.slice(0, 24).map((question, index) => {
    const value = question as Partial<QuestionnaireQuestion>;
    const type = value.type === "number" || value.type === "select" || value.type === "text" ? value.type : "text";
    return {
      id: cleanText(value.id, `q-${index + 1}`),
      prompt: cleanText(value.prompt, `Question ${index + 1}`).slice(0, 240),
      type,
      options: type === "select" ? withDeclineOption(normalizeItems(value.options).slice(0, 11)) : [],
      required: Boolean(value.required),
    };
  });

  return [
    ...defaultQuestionnaire(),
    ...normalized.filter((question) => !DEFAULT_QUESTIONNAIRE_IDS.has(question.id)),
  ].slice(0, 24);
}

function defaultQuestionnaire() {
  return DEFAULT_QUESTIONNAIRE.map((question) => ({ ...question, options: [...question.options] }));
}

function withDeclineOption(options: string[]) {
  return options.includes(DECLINE_TO_ANSWER) ? options : [...options, DECLINE_TO_ANSWER];
}

function normalizeItems(input: unknown) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map((item) => cleanText(item, "")).filter(Boolean))].slice(0, 80);
}

function cleanText(input: unknown, fallback: string) {
  return typeof input === "string" && input.trim() ? input.trim() : fallback;
}

function block(
  blockNumber: number,
  count: number,
  categories: CategoryKey[],
  config: {
    sides: Partial<Record<CategoryKey, Side>>;
    leftLabel: string;
    rightLabel: string;
  },
  condition: Trial["condition"],
  phase: Trial["phase"],
  definition: TestDefinition,
) {
  const stimuli = categories.flatMap((categoryKey) =>
    definition[categoryKey].items.map((stimulus) => ({
      block: blockNumber,
      condition,
      phase,
      stimulus,
      categoryKey,
      leftLabel: config.leftLabel,
      rightLabel: config.rightLabel,
      correctSide: config.sides[categoryKey] ?? "left",
    })),
  );

  const trials: Array<Omit<Trial, "responseSide" | "latencyMs" | "correct">> = [];
  for (let index = 0; index < count; index += 1) {
    trials.push(stimuli[index % stimuli.length]);
  }

  return shuffle(trials);
}

function conceptBlockConfig(orientation: "normal" | "reversed", definition: TestDefinition) {
  const reversed = orientation === "reversed";
  return {
    sides: {
      conceptA: reversed ? "right" : "left",
      conceptB: reversed ? "left" : "right",
    } satisfies Partial<Record<CategoryKey, Side>>,
    leftLabel: reversed ? definition.conceptB.label : definition.conceptA.label,
    rightLabel: reversed ? definition.conceptA.label : definition.conceptB.label,
  };
}

function attributeBlockConfig(definition: TestDefinition) {
  return {
    sides: {
      attributeA: "left",
      attributeB: "right",
    } satisfies Partial<Record<CategoryKey, Side>>,
    leftLabel: definition.attributeA.label,
    rightLabel: definition.attributeB.label,
  };
}

function combinedBlockConfig(
  condition: "compatible" | "incompatible",
  orientation: "normal" | "reversed",
  definition: TestDefinition,
) {
  const normal = orientation === "normal";
  const leftConcept = normal ? "conceptA" : "conceptB";
  const rightConcept = normal ? "conceptB" : "conceptA";
  const leftAttribute =
    condition === "compatible"
      ? normal
        ? "attributeA"
        : "attributeB"
      : normal
        ? "attributeB"
        : "attributeA";
  const rightAttribute = leftAttribute === "attributeA" ? "attributeB" : "attributeA";

  return {
    sides: {
      [leftConcept]: "left",
      [leftAttribute]: "left",
      [rightConcept]: "right",
      [rightAttribute]: "right",
    } satisfies Partial<Record<CategoryKey, Side>>,
    leftLabel: `${definition[leftConcept].label} / ${definition[leftAttribute].label}`,
    rightLabel: `${definition[rightConcept].label} / ${definition[rightAttribute].label}`,
  };
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function mean(values: number[]) {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return null;
  const average = mean(values);
  if (average === null) return null;
  const variance = values.reduce((total, value) => total + (value - average) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}
