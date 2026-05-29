import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/results";
import { getPilotSession, getResponse, getTest, listPilotSessionsForTest, listResponsesForTest } from "~/lib/db.server";
import { summarizePilotItems } from "~/lib/iat";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const test = await getTest(context.cloudflare.env.DB, params.testId);
  if (!test) throw new Response("Not found", { status: 404 });

  const responses = await listResponsesForTest(context.cloudflare.env.DB, params.testId);
  const pilotSessions = await listPilotSessionsForTest(context.cloudflare.env.DB, params.testId);
  const currentResponseId = url.searchParams.get("response");
  const foundResponse = currentResponseId ? await getResponse(context.cloudflare.env.DB, currentResponseId) : null;
  const currentPilotSessionId = url.searchParams.get("pilot");
  const foundPilotSession = currentPilotSessionId ? await getPilotSession(context.cloudflare.env.DB, currentPilotSessionId) : null;
  const currentResponse = foundResponse?.testId === params.testId ? foundResponse : responses[0] ?? null;
  const currentPilotSession = foundPilotSession?.testId === params.testId ? foundPilotSession : pilotSessions[0] ?? null;
  const scores = responses.map((response) => response.score.dScore).filter((score): score is number => typeof score === "number");
  const average = scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : null;

  return { test, responses, pilotSessions, currentResponse, currentPilotSession, scores, average };
}

export default function ResultsRoute() {
  const { test, responses, pilotSessions, currentResponse, currentPilotSession, scores, average } = useLoaderData<typeof loader>();
  const currentPilotItems = currentPilotSession ? summarizePilotItems(currentPilotSession.trials) : [];
  const currentPilotErrorCount = currentPilotSession
    ? currentPilotSession.trials.filter((trial) => !trial.correct).length
    : 0;

  return (
    <main className="shell">
      <section className="topbar">
        <div className="topbar-title">
          <p className="eyebrow">Results</p>
          <h1>{test.name}</h1>
        </div>
        <div className="top-actions">
          <Link className="button secondary" to="/">Saved tests</Link>
          <Link className="button secondary" to={`/create?clone=${test.id}`}>Copy</Link>
          <Link className="button secondary" to={`/tests/${test.id}?mode=pilot`}>Pilot</Link>
          <Link className="button primary" to={`/tests/${test.id}`}>Run</Link>
        </div>
      </section>

      <section className="results-grid">
        <article className="result-panel">
          <h2>{currentResponse ? "Latest participant" : "No participant results"}</h2>
          {currentResponse ? (
            <>
              <div className="score-display">
                <span>D-score</span>
                <strong>{currentResponse.score.dScore === null ? "n/a" : currentResponse.score.dScore.toFixed(3)}</strong>
              </div>
              <p>{currentResponse.score.interpretation}</p>
              <dl>
                <div><dt>Compatible mean</dt><dd>{formatMs(currentResponse.score.compatibleMeanMs)}</dd></div>
                <div><dt>Incompatible mean</dt><dd>{formatMs(currentResponse.score.incompatibleMeanMs)}</dd></div>
                <div><dt>Error rate</dt><dd>{formatPercent(currentResponse.score.errorRate)}</dd></div>
                <div><dt>Fast-response rate</dt><dd>{formatPercent(currentResponse.score.fastRate)}</dd></div>
                <div><dt>Validity</dt><dd>{currentResponse.score.valid ? "Valid" : "Flagged"}</dd></div>
              </dl>
              {currentResponse.score.warnings.length ? (
                <div className="notice error">{currentResponse.score.warnings.join(" ")}</div>
              ) : null}
            </>
          ) : (
            <p className="empty">Run this test to create the first saved response.</p>
          )}
        </article>

        <article className="result-panel">
          <h2>Aggregate distribution</h2>
          <div className="score-display">
            <span>Average D-score</span>
            <strong>{average === null ? "n/a" : average.toFixed(3)}</strong>
          </div>
          <Distribution scores={scores} />
          <p>{responses.length} total responses, {scores.length} scorable.</p>
        </article>

        <article className="result-panel">
          <h2>Pilot review</h2>
          {currentPilotSession ? (
            <>
              <div className="score-display">
                <span>Pilot D-score</span>
                <strong>{currentPilotSession.score.dScore === null ? "n/a" : currentPilotSession.score.dScore.toFixed(3)}</strong>
              </div>
              <p>{currentPilotSession.score.interpretation}</p>
              <dl>
                <div><dt>Compatible mean</dt><dd>{formatMs(currentPilotSession.score.compatibleMeanMs)}</dd></div>
                <div><dt>Incompatible mean</dt><dd>{formatMs(currentPilotSession.score.incompatibleMeanMs)}</dd></div>
                <div><dt>Error rate</dt><dd>{formatPercent(currentPilotSession.score.errorRate)}</dd></div>
                <div><dt>Wrong responses</dt><dd>{currentPilotErrorCount}</dd></div>
                <div><dt>Fast-response rate</dt><dd>{formatPercent(currentPilotSession.score.fastRate)}</dd></div>
              </dl>
              {currentPilotItems.length ? (
                <div className="pilot-list">
                  <h3>All words shown</h3>
                  {currentPilotItems.map((item) => (
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
              <div className="pilot-notes">
                <h3>Confusing items</h3>
                <p>{currentPilotSession.feedback.confusingItems.length ? currentPilotSession.feedback.confusingItems.join(", ") : "None recorded"}</p>
                <h3>Hesitant items</h3>
                <p>{currentPilotSession.feedback.hesitantItems.length ? currentPilotSession.feedback.hesitantItems.join(", ") : "None recorded"}</p>
                <h3>Other notes</h3>
                <p>{currentPilotSession.feedback.notes || "None recorded"}</p>
              </div>
            </>
          ) : (
            <p className="empty">Run a pilot to capture confusing items and hesitation notes.</p>
          )}
        </article>
      </section>

      <section className="saved">
        <div className="section-heading">
          <h2>Response log</h2>
          <p>Participant identifiers are generated client-side unless you replace them in the route action.</p>
        </div>
        <div className="response-table">
          <div className="table-row head"><span>Created</span><span>D-score</span><span>Status</span></div>
          {responses.map((response) => (
            <Link className="table-row" to={`/tests/${test.id}/results?response=${response.id}`} key={response.id}>
              <span>{new Date(response.createdAt).toLocaleString()}</span>
              <span>{response.score.dScore === null ? "n/a" : response.score.dScore.toFixed(3)}</span>
              <span>{response.score.valid ? "Valid" : "Flagged"}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="saved">
        <div className="section-heading">
          <h2>Pilot log</h2>
          <p>These pilot runs stay separate from scored responses so you can revise the study before fielding it.</p>
        </div>
        <div className="response-table">
          <div className="table-row head"><span>Created</span><span>D-score</span><span>Notes</span></div>
          {pilotSessions.length ? pilotSessions.map((session) => (
            <Link className="table-row" to={`/tests/${test.id}/results?pilot=${session.id}`} key={session.id}>
              <span>{new Date(session.createdAt).toLocaleString()}</span>
              <span>{session.score.dScore === null ? "n/a" : session.score.dScore.toFixed(3)}</span>
              <span>{session.feedback.confusingItems.length || session.feedback.hesitantItems.length || session.feedback.notes.trim() ? "Review needed" : "Clean"}</span>
            </Link>
          )) : <p className="empty">No pilot runs saved yet.</p>}
        </div>
      </section>
    </main>
  );
}

function Distribution({ scores }: { scores: number[] }) {
  const buckets = [-1, -0.65, -0.35, -0.15, 0.15, 0.35, 0.65, 1];
  const counts = buckets.slice(0, -1).map((start, index) => (
    scores.filter((score) => score >= start && score < buckets[index + 1]).length
  ));
  const max = Math.max(1, ...counts);

  return (
    <div className="chart" aria-label="D-score distribution">
      {counts.map((count, index) => (
        <div className="bar-wrap" key={`${buckets[index]}-${buckets[index + 1]}`}>
          <div className="bar" style={{ height: `${Math.max(8, (count / max) * 100)}%` }} />
          <span>{buckets[index + 1]}</span>
        </div>
      ))}
    </div>
  );
}

function formatMs(value: number | null) {
  return value === null ? "n/a" : `${Math.round(value)} ms`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
