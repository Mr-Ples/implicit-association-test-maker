import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { ReactNode } from "react";
import stylesheet from "./styles/app.css?url";

export function links() {
  return [
    { rel: "stylesheet", href: stylesheet },
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  ];
}

export function meta() {
  return [
    { title: "Implicit Association Test Maker" },
    {
      name: "description",
      content: "Create, run, save, and analyze research-grade Implicit Association Tests.",
    },
  ];
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
