import { Form, Link, redirect, useLoaderData, useLocation } from "react-router";
import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/test";
import { getTest, savePilotSession, saveResponse } from "~/lib/db.server";
import { buildPilotReview, createPilotTrialPlan, createTrialPlan, scorePilotTrials } from "~/lib/iat";
import { HomeLink } from "~/components/icons";
import type { Side, Trial } from "~/lib/types";
import { renderLinkedText } from "~/components/linked-text";

export async function loader({ params, context }: Route.LoaderArgs) {
  const test = await getTest(context.cloudflare.env.DB, params.testId);
  if (!test) throw new Response("Not found", { status: 404 });
  return { test };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  if (!params.testId) throw new Response("Missing test id", { status: 400 });

  const url = new URL(request.url);
  const formData = await request.formData();
  const participantId = String(formData.get("participantId") || crypto.randomUUID());
  const questionnaire = url.searchParams.get("mode") === "pilot"
    ? {}
    : JSON.parse(String(formData.get("questionnaire") || "{}")) as Record<string, string>;
  const trials = JSON.parse(String(formData.get("trials") || "[]")) as Trial[];

  if (url.searchParams.get("mode") === "pilot") {
    const feedback = {
      confusingItems: parseLines(String(formData.get("confusingItems") || "")),
      hesitantItems: parseLines(String(formData.get("hesitantItems") || "")),
      notes: String(formData.get("notes") || "").trim(),
    };
    const result = await savePilotSession(context.cloudflare.env.DB, params.testId, participantId, questionnaire, trials, feedback);
    return redirect(`/tests/${params.testId}/results?pilot=${result.sessionId}`);
  }

  const result = await saveResponse(context.cloudflare.env.DB, params.testId, participantId, questionnaire, trials);
  return redirect(`/tests/${params.testId}/results?response=${result.responseId}`);
}

export default function TestRoute() {
  const { test } = useLoaderData<typeof loader>();
  const location = useLocation();
  const pilotMode = new URLSearchParams(location.search).get("mode") === "pilot";
  const [phase, setPhase] = useState<"questionnaire" | "instructions" | "task" | "blockIntro" | "complete" | "pilot">(
    pilotMode ? "instructions" : "questionnaire",
  );
  const [participantId] = useState(() => crypto.randomUUID());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<ReturnType<typeof createTrialPlan>>([]);
  const [index, setIndex] = useState(0);
  const [nextBlockIndex, setNextBlockIndex] = useState<number | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [pilotNotes, setPilotNotes] = useState({
    confusingItems: "",
    hesitantItems: "",
    notes: "",
  });
  const startedAt = useRef<number>(0);
  const acceptingResponse = useRef(true);
  const current = plan[index];
  const progress = plan.length ? Math.round((index / plan.length) * 100) : 0;
  const firstBlockInstructions = [
    {
      key: "E",
      sideDesktop: "Left key",
      sideMobile: "Left side",
      label: test.definition.conceptA.label,
      words: test.definition.conceptA.items,
    },
    {
      key: "I",
      sideDesktop: "Right key",
      sideMobile: "Right side",
      label: test.definition.conceptB.label,
      words: test.definition.conceptB.items,
    },
  ];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (phase !== "task") return;
      if (event.key.toLowerCase() === "e") respond("left");
      if (event.key.toLowerCase() === "i") respond("right");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (phase === "task") {
      startedAt.current = performance.now();
      acceptingResponse.current = true;
    }
  }, [phase, index]);

  function startTask() {
    setPlan(pilotMode ? createPilotTrialPlan(test.definition) : createTrialPlan(test.definition));
    setIndex(0);
    setNextBlockIndex(null);
    setTrials([]);
    setFeedback(null);
    setPhase("task");
  }

  function respond(side: Side) {
    if (!current || !acceptingResponse.current) return;
    acceptingResponse.current = false;
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt.current));
    const correct = side === current.correctSide;
    setTrials((existing) => [...existing, { ...current, responseSide: side, latencyMs, correct }]);
    setFeedback(correct ? "correct" : "wrong");
    window.setTimeout(() => {
      setFeedback(null);
      if (index + 1 >= plan.length) {
        setPhase(pilotMode ? "pilot" : "complete");
      } else if (plan[index + 1].block !== current.block) {
        setNextBlockIndex(index + 1);
        setPhase("blockIntro");
      } else {
        setIndex(index + 1);
      }
    }, correct ? 120 : 450);
  }

  if (phase === "questionnaire" && !pilotMode) {
    return (
      <main className="shell narrow">
        <section className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">Run test</p>
            <h1>{test.name}</h1>
          </div>
          <div className="top-actions">
            <HomeLink to="/" />
          </div>
        </section>
        <section className="take-card">
          <p className="eyebrow">Questionnaire</p>
          <h2>Questionnaire</h2>
          <p className="test-description">{renderLinkedText(test.description)}</p>
          <form
            className="builder-form"
            onSubmit={(event) => {
              event.preventDefault();
              setPhase("instructions");
            }}
          >
            {test.definition.questionnaire.map((question) => (
              <label key={question.id}>
                {question.prompt}
                {question.type === "select" ? (
                  <select
                    required={question.required}
                    value={answers[question.id] ?? ""}
                    onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
                  >
                    <option value="">Choose</option>
                    {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : question.type === "text" ? (
                  <textarea
                    required={question.required}
                    value={answers[question.id] ?? ""}
                    onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
                  />
                ) : (
                  <input
                    required={question.required}
                    type={question.type}
                    value={answers[question.id] ?? ""}
                    onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
                  />
                )}
              </label>
            ))}
            <button className="button primary" type="submit">Continue</button>
          </form>
        </section>
      </main>
    );
  }

  if (phase === "instructions") {
    return (
      <main className="shell narrow">
        <section className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">Run test</p>
            <h1>{test.name}</h1>
          </div>
          <div className="top-actions">
            <HomeLink to="/" />
          </div>
        </section>
        <section className="take-card">
          <p className="eyebrow">Task instructions</p>
          <p>
            Classify each item as quickly and accurately as possible.
            <span className="desktop-only"> Use E for the left side and I for the right side.</span>
            <span className="mobile-only"> Tap the left side and right side of the screen.</span>
            The first block starts with these words.
          </p>
          <div className="instruction-grid">
            {firstBlockInstructions.map((instruction) => (
              <div key={instruction.key}>
                <strong>
                  <span className="desktop-only">{instruction.sideDesktop}</span>
                  <span className="mobile-only">{instruction.sideMobile}</span>
                </strong>
                <span className="instruction-key">{instruction.key}</span>
                <b>{instruction.label}</b>
                <small className="instruction-words">{instruction.words.join(", ")}</small>
              </div>
            ))}
          </div>
          <div className="questionnaire-footer">
            <button className="button primary" type="button" onClick={startTask}>Start test</button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === "blockIntro") {
    const upcomingTrial = nextBlockIndex === null ? null : plan[nextBlockIndex];
    const totalBlocks = plan.length ? Math.max(...plan.map((trial) => trial.block)) : 0;

    return (
      <main className="task-screen task-screen--intro">
        <div className="task-top">
          <div className="side-label"><kbd>E</kbd><strong>{upcomingTrial?.leftLabel}</strong></div>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="side-label right"><strong>{upcomingTrial?.rightLabel}</strong><kbd>I</kbd></div>
        </div>
        <div className="stimulus">
          <div className="block-intro">
            <p className="eyebrow">Block change</p>
            <h2>Block {upcomingTrial?.block} of {totalBlocks}</h2>
            <p>
              New block:
              <span className="desktop-only"> use E for the left side and I for the right side.</span>
              <span className="mobile-only"> use the left side and right side.</span>
              The labels below are the ones that apply in this block.
            </p>
            <div className="instruction-grid">
              <div>
                <strong>
                  <span className="desktop-only">Left key</span>
                  <span className="mobile-only">Left side</span>
                </strong>
                <span>{upcomingTrial?.leftLabel}</span>
              </div>
              <div>
                <strong>
                  <span className="desktop-only">Right key</span>
                  <span className="mobile-only">Right side</span>
                </strong>
                <span>{upcomingTrial?.rightLabel}</span>
              </div>
            </div>
            <button
              className="button primary"
              type="button"
              onClick={() => {
                if (nextBlockIndex === null) return;
                setIndex(nextBlockIndex);
                setNextBlockIndex(null);
                setPhase("task");
              }}
            >
              Start next block
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "complete") {
    return (
      <main className="shell narrow">
        <section className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">Run test</p>
            <h1>{test.name}</h1>
          </div>
          <div className="top-actions">
            <HomeLink to="/" />
          </div>
        </section>
        <section className="take-card">
          <h2>Submit response</h2>
          <p>Your trial data is ready to save with the questionnaire answers.</p>
          <Form method="post">
            <input type="hidden" name="participantId" value={participantId} />
            <input type="hidden" name="questionnaire" value={JSON.stringify(answers)} />
            <input type="hidden" name="trials" value={JSON.stringify(trials)} />
            <button className="button primary" type="submit">Save results</button>
          </Form>
        </section>
      </main>
    );
  }

  if (phase === "task") {
    return (
      <main className="task-screen">
        <div className="task-top">
          <div className="side-label"><kbd>E</kbd><strong>{current?.leftLabel}</strong></div>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="side-label right"><strong>{current?.rightLabel}</strong><kbd>I</kbd></div>
        </div>
        <button className="hit-area left" type="button" aria-label="left response" onClick={() => respond("left")} />
        <button className="hit-area right" type="button" aria-label="right response" onClick={() => respond("right")} />
        <div className="stimulus">
          <span>{current?.stimulus}</span>
          {feedback === "wrong" ? <strong className="feedback">X</strong> : null}
        </div>
        {!pilotMode ? <div className="block-label">Block {current?.block} of 7</div> : null}
      </main>
    );
  }

  const summary = scorePilotTrials(trials);
  const review = buildPilotReview(trials, test.definition);
  const errorTrials = trials.filter((trial) => !trial.correct);

  return (
    <main className="shell narrow">
      <section className="topbar">
        <div className="topbar-title">
          <p className="eyebrow">Pilot test</p>
          <h1>{test.name}</h1>
        </div>
        <div className="top-actions">
          <HomeLink to="/" />
        </div>
      </section>
      <section className="take-card pilot-review">
        <p className="eyebrow">Pilot review</p>
        <h2>Review the problem items</h2>
        <p>
          This pilot run highlights long latencies and errors so you can catch confusing labels, double meanings, or
          items that made people hesitate.
        </p>
        <div className="pilot-summary">
          <div><strong>{formatPercent(summary.errorRate)}</strong><span>Error rate</span></div>
          <div><strong>{formatPercent(summary.fastRate)}</strong><span>Fast-response rate</span></div>
          <div><strong>{review.categories.reduce((total, category) => total + category.items.length, 0)}</strong><span>Words reviewed</span></div>
          <div><strong>{errorTrials.length}</strong><span>Wrong responses</span></div>
        </div>
        {review.slowestItems.length ? (
          <div className="pilot-list">
            <h3>Slowest words</h3>
            {review.slowestItems.map((item) => (
              <div className="pilot-item" key={`${item.categoryKey}-${item.stimulus}`}>
                <strong>{item.stimulus}</strong>
                <span>
                  {Math.round(item.averageLatencyMs)} ms avg
                  {" • "}
                  {item.seenCount} shown
                  {item.wrongCount ? ` • ${item.wrongCount} wrong` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {review.categories.some((category) => category.items.length) ? (
          <div className="pilot-categories">
            <h3>Words by category</h3>
            {review.categories.map((category) => (
              <section className="pilot-category" key={category.key}>
                <h4>{category.label}</h4>
                {category.items.length ? category.items.map((item) => (
                  <div className="pilot-item" key={`${item.categoryKey}-${item.stimulus}`}>
                    <strong>{item.stimulus}</strong>
                    <span>
                      {Math.round(item.averageLatencyMs)} ms avg
                      {" • "}
                      {item.seenCount} shown
                      {item.wrongCount ? ` • ${item.wrongCount} wrong` : ""}
                    </span>
                  </div>
                )) : <p className="empty">No items in this category were shown.</p>}
              </section>
            ))}
          </div>
        ) : null}
        <Form method="post" action={`${location.pathname}?mode=pilot`} className="builder-form">
          <input type="hidden" name="participantId" value={participantId} />
          <input type="hidden" name="trials" value={JSON.stringify(trials)} />
          <label>
            Confusing or double-meaning words
            <textarea
              name="confusingItems"
              value={pilotNotes.confusingItems}
              onChange={(event) => setPilotNotes({ ...pilotNotes, confusingItems: event.target.value })}
              placeholder="List words or items that felt ambiguous, unclear, or hard to place."
            />
          </label>
          <label>
            Words that made you hesitate
            <textarea
              name="hesitantItems"
              value={pilotNotes.hesitantItems}
              onChange={(event) => setPilotNotes({ ...pilotNotes, hesitantItems: event.target.value })}
              placeholder="List items where you slowed down, second-guessed, or paused."
            />
          </label>
          <label>
            Other notes
            <textarea
              name="notes"
              value={pilotNotes.notes}
              onChange={(event) => setPilotNotes({ ...pilotNotes, notes: event.target.value })}
              placeholder="Anything else the pilot exposed."
            />
          </label>
          <button className="button primary" type="submit">Save pilot</button>
        </Form>
      </section>
    </main>
  );
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
