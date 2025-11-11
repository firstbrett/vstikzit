// Shared low-level parsing helpers used by tikz and circuitikz modules

const reOpt = /\[([^\]]*)\]/y;
const reCoord = /\(([^)]+)\)/y;

function skipWs(src: string, i: number): number {
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") i++; else break;
  }
  return i;
}

function parseOptionsAt(src: string, i: number): { options?: { raw: string }; next: number } {
  i = skipWs(src, i);
  reOpt.lastIndex = i;
  const m = reOpt.exec(src);
  if (!m) return { next: i };
  return { options: { raw: `[${m[1]}]` }, next: reOpt.lastIndex };
}

interface PathRef { name?: string; anchor?: string; isEmpty?: boolean; raw: string }

function parseRef(str: string, i: number): { ref?: PathRef; next: number } {
  i = skipWs(str, i);
  reCoord.lastIndex = i;
  const m = reCoord.exec(str);
  if (!m) return { next: i };
  const raw = m[0];
  const inner = m[1].trim();
  let ref: PathRef;
  if (inner === "") {
    ref = { isEmpty: true, raw };
  } else {
    const dot = inner.indexOf(".");
    if (dot >= 0) {
      ref = { name: inner.slice(0, dot), anchor: inner.slice(dot + 1), raw };
    } else {
      ref = { name: inner, raw };
    }
  }
  return { ref, next: reCoord.lastIndex };
}

export { skipWs, parseOptionsAt, parseRef };
export type { PathRef };

