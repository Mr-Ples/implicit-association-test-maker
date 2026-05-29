import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { listTests } from "~/lib/db.server";

export async function loader({ context }: Route.LoaderArgs) {
  return { tests: await listTests(context.cloudflare.env.DB) };
}

export default function Home() {
  const { tests } = useLoaderData<typeof loader>();

  return (
    <main className="shell">
      <section className="topbar topbar--solo">
        <div className="topbar-title">
          <p className="eyebrow">Saved tests</p>
          <h1>Implicit Association Test Maker</h1>
        </div>
        <div className="top-actions">
          <Link className="button secondary" to="/about">About</Link>
          <Link className="button primary" to="/create">Create</Link>
        </div>
      </section>

      <section className="saved">
        <div className="section-heading">
          <h2>Studies</h2>
        </div>
        <div className="test-list">
          {tests.length ? tests.map((test) => (
            <article className="test-card" key={test.id}>
              <div className="test-card-main">
                <h3>{test.name}</h3>
                <p>{test.description || "No description"}</p>
                <div className="meta-line">
                  <span>{test.responseCount} scored responses</span>
                  <span>{test.averageDScore === null ? "No D-score yet" : `Average D-score ${test.averageDScore.toFixed(3)}`}</span>
                </div>
              </div>
              <div className="card-actions">
                <Link className="button secondary" to={`/tests/${test.id}`}>Run</Link>
                <Link className="button secondary" to={`/tests/${test.id}?mode=pilot`}>Pilot</Link>
                <Link className="button secondary" to={`/tests/${test.id}/results`}>Results</Link>
                <Link className="button secondary" to={`/create?clone=${test.id}`}>Copy</Link>
              </div>
            </article>
          )) : <p className="empty">No tests saved yet. Create one to get started.</p>}
        </div>
      </section>
    </main>
  );
}
