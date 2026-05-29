import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { useEffect, useMemo, useState } from "react";
import type { Route } from "./+types/create";
import { createTest, getTest } from "~/lib/db.server";
import { defaultDefinition, normalizeDefinition } from "~/lib/iat";
import type { QuestionnaireQuestion, TestDefinition } from "~/lib/types";

const DRAFT_KEY = "iat-maker:draft:v1";

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const cloneId = url.searchParams.get("clone");
  const clone = cloneId ? await getTest(context.cloudflare.env.DB, cloneId) : null;
  return { clone };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const rawDefinition = formData.get("definition");

  try {
    const definition = normalizeDefinition(JSON.parse(String(rawDefinition ?? "{}")));
    const id = await createTest(context.cloudflare.env.DB, definition);
    return redirect(`/tests/${id}?created=1`);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "The test definition could not be saved.",
    };
  }
}

export default function CreateRoute() {
  const { clone } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [step, setStep] = useState<1 | 2>(1);
  const initialDefinition = clone
    ? {
        ...clone.definition,
        name: clone.definition.name ? `${clone.definition.name} copy` : "",
      }
    : defaultDefinition();
  const [definition, setDefinition] = useState<TestDefinition>(() => {
    return initialDefinition;
  });
  const [stimulusText, setStimulusText] = useState<Record<string, string>>(() => toStimulusText(initialDefinition));
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const definitionJson = useMemo(() => JSON.stringify(definition), [definition]);

  useEffect(() => {
    if (clone || typeof window === "undefined") {
      setHydrated(true);
      return;
    }

    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { step?: 1 | 2; definition?: TestDefinition };
        if (parsed.definition) setDefinition(parsed.definition);
        if (parsed.definition) setStimulusText(toStimulusText(parsed.definition));
        if (parsed.step === 1 || parsed.step === 2) setStep(parsed.step);
      } catch {
        // Ignore malformed cached drafts and fall back to the current state.
      }
    }

    setHydrated(true);
  }, [clone]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, definition, stimulusText }));
    }, 120);
    return () => window.clearTimeout(timer);
  }, [definition, step, hydrated, stimulusText]);

  function goNext() {
    try {
      const normalized = normalizeDefinition({
        ...definition,
        conceptA: { ...definition.conceptA, items: parseStimulusText(stimulusText.conceptA) },
        conceptB: { ...definition.conceptB, items: parseStimulusText(stimulusText.conceptB) },
        attributeA: { ...definition.attributeA, items: parseStimulusText(stimulusText.attributeA) },
        attributeB: { ...definition.attributeB, items: parseStimulusText(stimulusText.attributeB) },
      });
      setDefinition(normalized);
      setStimulusText(toStimulusText(normalized));
      setError(null);
      setStep(2);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Check the test definition before continuing.");
    }
  }

  function goBack() {
    setError(null);
    setStep(1);
  }

  function clearDraft() {
    window.localStorage.removeItem(DRAFT_KEY);
    setError(null);
    setStep(1);
    setDefinition(initialDefinition);
    setStimulusText(toStimulusText(initialDefinition));
  }

  return (
    <main className="shell create-shell">
      <section className="topbar">
        <div className="topbar-title">
          <p className="eyebrow">Create</p>
          <h1>Build an IAT study</h1>
        </div>
        <div className="top-actions">
          <Link className="button secondary" to="/">Back</Link>
        </div>
      </section>

      <section className="wizard">
        <div className="wizard-steps" aria-label="creation steps">
          <div className={step === 1 ? "wizard-step active" : "wizard-step"}>1. Test setup</div>
          <div className={step === 2 ? "wizard-step active" : "wizard-step"}>2. Questionnaire</div>
        </div>

        {error ? <div className="notice error">{error}</div> : null}
        {actionData?.error ? <div className="notice error">{actionData.error}</div> : null}

        {step === 1 ? (
          <section className="wizard-panel">
            <div className="section-heading">
              <h2>Test setup</h2>
              <p>Define the four categories and their stimuli. This is the part that becomes the actual IAT.</p>
            </div>

            <div className="info-grid">
              <article className="info-box">
                <h3>Target concepts</h3>
                <p>The two things you want to compare, like names, groups, products, or ideas.</p>
              </article>
              <article className="info-box">
                <h3>Attribute categories</h3>
                <p>The two poles that get paired with the concepts, like good/bad or pleasant/unpleasant.</p>
              </article>
            </div>

            <div className="builder-form">
              <label>
                Test name
                <input
                  value={definition.name}
                  onChange={(event) => setDefinition({ ...definition, name: event.target.value })}
                  placeholder="e.g. Career and family associations"
                />
              </label>
              <label>
                Short description
                <textarea
                  value={definition.description}
                  onChange={(event) => setDefinition({ ...definition, description: event.target.value })}
                  placeholder="Optional study note"
                />
              </label>

              <div className="category-grid">
                {(["conceptA", "conceptB", "attributeA", "attributeB"] as const).map((key) => (
                  <fieldset key={key} className="panel category-panel">
                    <legend>{categoryTitle(key)}</legend>
                    <p className="panel-help">{categoryHelp(key)}</p>
                    <label>
                      Label
                      <input
                        value={definition[key].label}
                        onChange={(event) =>
                          setDefinition({
                            ...definition,
                            [key]: { ...definition[key], label: event.target.value },
                          })
                        }
                      />
                    </label>
                    <label>
                      Stimuli, one per line
                      <textarea
                        className="stimuli-box"
                        value={stimulusText[key]}
                        onChange={(event) =>
                          setStimulusText({
                            ...stimulusText,
                            [key]: event.target.value,
                          })
                        }
                      />
                    </label>
                  </fieldset>
                ))}
              </div>
            </div>

            <div className="wizard-actions">
              <button className="button secondary" type="button" onClick={clearDraft}>Clear draft</button>
              <button className="button primary" type="button" onClick={goNext}>Next</button>
            </div>
          </section>
        ) : (
          <section className="wizard-panel">
            <div className="section-heading">
              <h2>Questionnaire</h2>
              <p>This appears before the test starts. Add as many questions as you need.</p>
            </div>

            <div className="info-box questionnaire-info">
              <h3>Why this exists</h3>
              <p>The questionnaire gives you participant context before the timed classification task begins.</p>
            </div>

            <Form method="post" className="builder-form">
              <input type="hidden" name="definition" value={definitionJson} />

              <QuestionnaireEditor definition={definition} setDefinition={setDefinition} />

              <div className="wizard-actions">
                <button className="button secondary" type="button" onClick={goBack}>Back</button>
                <button className="button primary" type="submit">Save test</button>
              </div>
            </Form>
          </section>
        )}
      </section>
    </main>
  );
}

function QuestionnaireEditor({
  definition,
  setDefinition,
}: {
  definition: TestDefinition;
  setDefinition: (definition: TestDefinition) => void;
}) {
  function updateQuestion(id: string, patch: Partial<QuestionnaireQuestion>) {
    setDefinition({
      ...definition,
      questionnaire: definition.questionnaire.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    });
  }

  return (
    <section className="questionnaire">
      <div className="section-heading compact">
        <div>
          <h2>Questionnaire</h2>
          <p>These questions appear before the timed blocks.</p>
        </div>
        <button
          className="button secondary"
          type="button"
          onClick={() =>
            setDefinition({
              ...definition,
              questionnaire: [
                ...definition.questionnaire,
                { id: crypto.randomUUID(), prompt: "", type: "text", options: [], required: false },
              ],
            })
          }
        >
          Add question
        </button>
      </div>

      {definition.questionnaire.length ? definition.questionnaire.map((question, index) => (
        <fieldset className="panel question-row" key={question.id}>
          <legend>Question {index + 1}</legend>
          <p className="panel-help">Use this for demographics, screening, or study notes that matter before the IAT starts.</p>
          <label>
            Prompt
            <input value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} />
          </label>
          <label>
            Type
            <select
              value={question.type}
              onChange={(event) =>
                updateQuestion(question.id, {
                  type: event.target.value as QuestionnaireQuestion["type"],
                  options: event.target.value === "select" ? question.options : [],
                })
              }
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="select">Select</option>
            </select>
          </label>
          {question.type === "select" ? (
            <label>
              Options, one per line
              <textarea
                value={question.options.join("\n")}
                onChange={(event) =>
                  updateQuestion(question.id, {
                    options: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                  })
                }
              />
            </label>
          ) : null}
          <label className="check">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(event) => updateQuestion(question.id, { required: event.target.checked })}
            />
            Required
          </label>
          <button
            className="button danger"
            type="button"
            onClick={() =>
              setDefinition({
                ...definition,
                questionnaire: definition.questionnaire.filter((item) => item.id !== question.id),
              })
            }
          >
            Remove
          </button>
        </fieldset>
      )) : <p className="empty">Add at least one question if you want to screen or profile participants first.</p>}
    </section>
  );
}

function categoryTitle(key: keyof Pick<TestDefinition, "conceptA" | "conceptB" | "attributeA" | "attributeB">) {
  return {
    conceptA: "Target concept A",
    conceptB: "Target concept B",
    attributeA: "Attribute category A",
    attributeB: "Attribute category B",
  }[key];
}

function categoryHelp(key: keyof Pick<TestDefinition, "conceptA" | "conceptB" | "attributeA" | "attributeB">) {
  return {
    conceptA: "",
    conceptB: "",
    attributeA: "First attribute pole. This is usually the positive or preferred side.",
    attributeB: "Second attribute pole. This is usually the negative or opposite side.",
  }[key];
}

function toStimulusText(definition: TestDefinition) {
  return {
    conceptA: definition.conceptA.items.join("\n"),
    conceptB: definition.conceptB.items.join("\n"),
    attributeA: definition.attributeA.items.join("\n"),
    attributeB: definition.attributeB.items.join("\n"),
  };
}

function parseStimulusText(text: string) {
  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
