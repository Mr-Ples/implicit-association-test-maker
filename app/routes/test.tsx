import { Form, Link, redirect, useLoaderData, useLocation } from "react-router";
import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/test";
import { getTest, saveResponse } from "~/lib/db.server";
import { createTrialPlan } from "~/lib/iat";
import type { Side, Trial } from "~/lib/types";

export async function loader({ params, context }: Route.LoaderArgs) {
  const test = await getTest(context.cloudflare.env.DB, params.testId);
  if (!test) throw new Response("Not found", { status: 404 });
  return { test };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  if (!params.testId) throw new Response("Missing test id", { status: 400 });
  const formData = await request.formData();
  const participantId = String(formData.get("participantId") || crypto.randomUUID());
  const questionnaire = JSON.parse(String(formData.get("questionnaire") || "{}")) as Record<string, string>;
  const trials = JSON.parse(String(formData.get("trials") || "[]")) as Trial[];
  const result = await saveResponse(context.cloudflare.env.DB, params.testId, participantId, questionnaire, trials);
  return redirect(`/tests/${params.testId}/results?response=${result.responseId}`);
}

export default function TestRoute() {
  const { test } = useLoaderData<typeof loader>();
  const location = useLocation();
  const [phase, setPhase] = useState<"questionnaire" | "instructions" | "task" | "complete">("questionnaire");
  const [participantId] = useState(() => crypto.randomUUID());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<ReturnType<typeof createTrialPlan>>([]);
  const [index, setIndex] = useState(0);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const startedAt = useRef<number>(0);
  const acceptingResponse = useRef(true);
  const current = plan[index];
  const progress = plan.length ? Math.round((index / plan.length) * 100) : 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("created") === "1") {
      window.localStorage.removeItem("iat-maker:draft:v1");
    }
  }, [location.key]);

  useEffect(() => {
    if (phase === "task") {
      startedAt.current = performance.now();
      acceptingResponse.current = true;
    }
  }, [phase, index]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (phase !== "task") return;
      if (event.key.toLowerCase() === "e") respond("left");
      if (event.key.toLowerCase() === "i") respond("right");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function startTask() {
    setPlan(createTrialPlan(test.definition));
    setIndex(0);
    setTrials([]);
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
        setPhase("complete");
      } else {
        setIndex(index + 1);
      }
    }, correct ? 120 : 450);
  }

  if (phase === "questionnaire") {
    return (
      <main className="shell narrow">
        <section className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">Run test</p>
            <h1>{test.name}</h1>
          </div>
          <div className="top-actions">
            <Link className="button secondary" to="/">Saved tests</Link>
          </div>
        </section>
        <section className="take-card">
          <p className="eyebrow">Questionnaire</p>
          <h2>Questionnaire</h2>
          <p>{test.description}</p>
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
            <Link className="button secondary" to="/">Saved tests</Link>
          </div>
        </section>
        <section className="take-card">
          <p className="eyebrow">Task instructions</p>
          <h2>Task instructions</h2>
          <p>Classify each item as quickly and accurately as possible. Use E for the left side and I for the right side.</p>
          <div className="instruction-grid">
            <div><strong>Left key</strong><span>E</span></div>
            <div><strong>Right key</strong><span>I</span></div>
          </div>
          <button className="button primary" type="button" onClick={startTask}>Start test</button>
        </section>
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
            <Link className="button secondary" to="/">Saved tests</Link>
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
      <div className="block-label">Block {current?.block} of 7</div>
    </main>
  );
}
