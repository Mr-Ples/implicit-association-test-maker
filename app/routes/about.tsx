import { Link } from "react-router";

export default function AboutRoute() {
  return (
    <main className="shell narrow">
      <section className="topbar">
        <div className="topbar-title">
          <p className="eyebrow">About</p>
          <h1>What an IAT does</h1>
        </div>
        <div className="top-actions">
          <Link className="button secondary" to="/">Back</Link>
        </div>
      </section>

      <section className="about-layout">
        <article className="about-card">
          <h2>How it works</h2>
          <p>
            An Implicit Association Test measures how quickly someone sorts words or images when two concepts are paired
            together. Faster responses in one pairing than another are interpreted as a relative association strength.
          </p>
        </article>
        <article className="about-card">
          <h2>What this app stores</h2>
          <p>
            Each study saves the test definition, the questionnaire, trial-by-trial responses, latencies, correctness,
            and a computed D-score for aggregate analysis. Pilot runs stay separate and add review notes for confusing,
            double-meaning, or hesitation-prone items.
          </p>
        </article>
        <article className="about-card">
          <h2>Why the blocks matter</h2>
          <p>
            The task uses a seven-block structure with target-only blocks, attribute-only blocks, and combined blocks in
            both compatible and incompatible pairings. The order is counterbalanced between participants.
          </p>
        </article>
        <article className="about-card">
          <h2>Scoring notes</h2>
          <p>
            The app flags very fast trials, excludes invalid latencies from scoring, and applies the standard error
            penalty before computing the D-score.
          </p>
        </article>
      </section>
    </main>
  );
}
