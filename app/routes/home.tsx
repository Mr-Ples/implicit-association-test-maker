import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { useMemo, useState } from "react";
import type { Route } from "./+types/home";
import { createTest, listTests } from "~/lib/db.server";
import { defaultDefinition, normalizeDefinition } from "~/lib/iat";
import type { QuestionnaireQuestion, TestDefinition } from "~/lib/types";

export async function loader({ context }: Route.LoaderArgs) {
  return { tests: await listTests(context.cloudflare.env.DB) };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const rawDefinition = formData.get("definition");

  try {
    const definition = normalizeDefinition(JSON.parse(String(rawDefinition ?? "{}")));
    const id = await createTest(context.cloudflare.env.DB, definition);
    return redirect(`/tests/${id}`);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "The test definition could not be saved.",
    };
  }
}

export default function Home() {
  const { tests } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [definition, setDefinition] = useState<TestDefinition>(() => defaultDefinition());
  const definitionJson = useMemo(() => JSON.stringify(definition), [definition]);

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Cloudflare D1 study builder</p>
          <h1>Implicit Association Test Maker</h1>
        </div>
        <a className="button secondary" href="#saved-tests">Saved tests</a>
      </section>

      <section className="workspace">
        <div className="builder">
          <div className="section-heading">
            <h2>Create a test</h2>
            <p>Define two target concepts, two attribute categories, their stimuli, and the pre-test questionnaire.</p>
          </div>

          {actionData?.error ? <div className="notice error">{actionData.error}</div> : null}

          <Form method="post" className="builder-form">
            <input type="hidden" name="definition" value={definitionJson} />
            <label>
              Test name
              <input
                value={definition.name}
                onChange={(event) => setDefinition({ ...definition, name: event.target.value })}
                placeholder="e.g. Career and family associations"
              />
            </label>
            <label>
              Research note
              <textarea
                value={definition.description}
                onChange={(event) => setDefinition({ ...definition, description: event.target.value })}
                placeholder="Short protocol note, sample, or hypothesis"
              />
            </label>

            <div className="category-grid">
              {(["conceptA", "conceptB", "attributeA", "attributeB"] as const).map((key) => (
                <fieldset key={key} className="panel">
                  <legend>{categoryTitle(key)}</legend>
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
                      value={definition[key].items.join("\n")}
                      onChange={(event) =>
                        setDefinition({
                          ...definition,
                          [key]: {
                            ...definition[key],
                            items: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                          },
                        })
                      }
                    />
                  </label>
                </fieldset>
              ))}
            </div>

            <QuestionnaireEditor definition={definition} setDefinition={setDefinition} />

            <div className="form-actions">
              <button className="button primary" type="submit">Save and open test</button>
            </div>
          </Form>
        </div>

        <aside className="research-panel">
          <h2>Research scoring</h2>
          <p>
            Each saved test runs seven IAT blocks and stores trial-level latency, correctness, questionnaire answers,
            and an improved D-score suitable for analysis exports.
          </p>
          <dl>
            <div><dt>Blocks</dt><dd>Target, attribute, compatible, reversed target, incompatible</dd></div>
            <div><dt>Latency</dt><dd>300 ms to 10,000 ms scored window</dd></div>
            <div><dt>Error handling</dt><dd>Block mean replacement plus 600 ms penalty</dd></div>
          </dl>
        </aside>
      </section>

      <section id="saved-tests" className="saved">
        <div className="section-heading">
          <h2>Saved tests</h2>
          <p>D1-backed studies and aggregate participant results.</p>
        </div>
        <div className="test-list">
          {tests.length ? tests.map((test) => (
            <article className="test-card" key={test.id}>
              <div>
                <h3>{test.name}</h3>
                <p>{test.description || "No description"}</p>
                <span>{test.responseCount} scored responses</span>
              </div>
              <div className="card-actions">
                <strong>{test.averageDScore === null ? "No D-score" : test.averageDScore.toFixed(3)}</strong>
                <Link className="button secondary" to={`/tests/${test.id}`}>Run</Link>
                <Link className="button secondary" to={`/tests/${test.id}/results`}>Results</Link>
              </div>
            </article>
          )) : <p className="empty">No tests saved yet.</p>}
        </div>
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
        <h2>Questionnaire</h2>
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

      {definition.questionnaire.map((question, index) => (
        <fieldset className="panel question-row" key={question.id}>
          <legend>Question {index + 1}</legend>
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
      ))}
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
