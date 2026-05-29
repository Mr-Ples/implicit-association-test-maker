import { Link, useLoaderData } from "react-router";
import { useEffect, useRef, useState } from "react";
import type { Route } from "./+types/home";
import { listTests } from "~/lib/db.server";
import { MoreHorizontalIcon } from "~/components/icons";

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
          <a
            className="button secondary"
            href="https://github.com/Mr-Ples/implicit-association-test-maker"
            target="_blank"
            rel="noopener noreferrer"
            style={{ gap: "8px" }}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
          <Link className="button primary" to="/create">Create</Link>
        </div>
      </section>

      <section className="saved">
        <div className="section-heading">
          <h2>Implicit Association Tests</h2>
        </div>
        <div className="test-list">
          {tests.length ? tests.map((test) => (
            <article className="test-card" key={test.id}>
              <Link className="test-card-run-overlay" to={`/tests/${test.id}`} aria-label={`Run ${test.name}`} />
              <div className="test-card-main">
                <h3>{test.name}</h3>
                <p>{test.description || "No description"}</p>
                <div className="meta-line">
                  <span>{test.responseCount} scored responses</span>
                  <span>{test.averageDScore === null ? "No D-score yet" : `Average D-score ${test.averageDScore.toFixed(3)}`}</span>
                </div>
              </div>
              <div className="card-actions">
                <TestMoreMenu testId={test.id} />
              </div>
            </article>
          )) : <p className="empty">No tests saved yet. Create one to get started.</p>}
        </div>
      </section>
    </main>
  );
}

function TestMoreMenu({ testId }: { testId: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!open || !menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="more-menu" ref={menuRef}>
      <button
        className="button secondary icon-button"
        type="button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontalIcon width="18" height="18" aria-hidden="true" />
      </button>
      {open ? (
        <div className="more-menu-items" role="menu">
          <Link role="menuitem" to={`/tests/${testId}?mode=pilot`} onClick={() => setOpen(false)}>Pilot</Link>
          <Link role="menuitem" to={`/tests/${testId}/results`} onClick={() => setOpen(false)}>Results</Link>
          <Link role="menuitem" to={`/create?clone=${testId}`} onClick={() => setOpen(false)}>Duplicate</Link>
        </div>
      ) : null}
    </div>
  );
}
