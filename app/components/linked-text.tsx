import type { ReactNode } from "react";

const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
const TRAILING_PUNCTUATION = /[)\].,!?;:]+$/;

export function renderLinkedText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  URL_PATTERN.lastIndex = 0;

  while ((match = URL_PATTERN.exec(text))) {
    const [rawUrl] = match;
    const start = match.index;
    const end = start + rawUrl.length;
    const trailingMatch = rawUrl.match(TRAILING_PUNCTUATION);
    const trailing = trailingMatch?.[0] ?? "";
    const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    const href = url.startsWith("http") ? url : `https://${url}`;
    nodes.push(
      <a
        key={`${start}-${url}`}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
      >
        {url}
      </a>,
    );

    if (trailing) {
      nodes.push(trailing);
    }

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
