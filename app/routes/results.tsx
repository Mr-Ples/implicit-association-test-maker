import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/results";
import { getResponse, getTest, listResponsesForTest } from "~/lib/db.server";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const test = await getTest(context.cloudflare.env.DB, params.testId);
  if (!test) throw new Response("Not found", { status: 404 });

  const responses = await listResponsesForTest(context.cloudflare.env.DB, params.testId);
  const currentResponseId = url.searchParams.get("response");
  const foundResponse = currentResponseId ? await getResponse(context.cloudflare.env.DB, currentResponseId) : null;
  const currentResponse = foundResponse?.testId === params.testId ? foundResponse : responses[0] ?? null;
  const scores = responses.map((response) => response.score.dScore).filter((score): score is number => typeof score === "number");
  const average = scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : null;

  return { test, responses, currentResponse, scores, average };
}

export default function ResultsRoute() {
  const { test, responses, currentResponse, scores, average } = useLoaderData<typeof loader>();

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
