import type { Range } from "../ast";
import type {
  TikzPicture,
  TikzStmt,
  NodeStmt,
  DrawStmt,
  TikzOptionList,
  PathRef,
  ToSegment,
  TikzLayer,
} from "./ast";

// Helpers
function rng(start: number, end: number): Range {
  return { start: { offset: start }, end: { offset: end } };
}

const reOpt = /\[([^\]]*)\]/y;
const reCoord = /\(([^)]+)\)/y;

function parseOptionsAt(src: string, i: number): { options?: TikzOptionList; next: number } {
  reOpt.lastIndex = i;
  const m = reOpt.exec(src);
  if (!m) return { next: i };
  return { options: { raw: `[${m[1]}]` }, next: reOpt.lastIndex };
}

function parseRef(str: string, i: number): { ref?: PathRef; next: number } {
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

function parseNodeStmt(stmt: string, startOffset: number): NodeStmt | undefined {
  // \node [opts] (name) at (x, y) {label};
  if (!/^\s*\\node\b/.test(stmt)) return undefined;
  let i = stmt.indexOf("\\node") + "\\node".length;
  // options
  const o1 = parseOptionsAt(stmt, i);
  i = o1.next;
  // name
  const r1 = parseRef(stmt, i);
  i = r1.next;
  // at (x, y)
  const atIdx = stmt.indexOf("at", i);
  if (atIdx === -1) return undefined;
  i = atIdx + 2;
  const r2 = parseRef(stmt, i);
  i = r2.next;
  // label
  const labelMatch = /\{([^}]*)\}/y;
  labelMatch.lastIndex = i;
  const lm = labelMatch.exec(stmt);
  const coordParts = (r2.ref && r2.ref.raw ? r2.ref.raw.slice(1, -1).split(",") : []).map(s => parseFloat(s.trim()));
  const node: NodeStmt = {
    kind: "NodeStmt",
    options: o1.options,
    name: r1.ref?.name,
    coord: coordParts.length === 2 ? { x: coordParts[0], y: coordParts[1] } : undefined,
    labelRaw: lm ? `{${lm[1]}}` : undefined,
    range: rng(startOffset, startOffset + stmt.length),
  };
  return node;
}

function parseDrawStmt(stmt: string, startOffset: number): DrawStmt | undefined {
  if (!/^\s*\\draw\b/.test(stmt)) return undefined;
  let i = stmt.indexOf("\\draw") + "\\draw".length;
  // options
  const o1 = parseOptionsAt(stmt, i);
  i = o1.next;
  // source ref
  const rsrc = parseRef(stmt, i);
  if (!rsrc.ref) return undefined;
  i = rsrc.next;
  const segments: ToSegment[] = [];
  const toRe = /\bto\b/y;
  while (true) {
    toRe.lastIndex = i;
    const tm = toRe.exec(stmt);
    if (!tm) break;
    i = toRe.lastIndex;
    // per-segment options
    const oseg = parseOptionsAt(stmt, i);
    i = oseg.next;
    // optional inline node: node[...]{...}
    const nodeRe = /\bnode\b/y;
    nodeRe.lastIndex = i;
    let edgeNode;
    const nm = nodeRe.exec(stmt);
    if (nm) {
      i = nodeRe.lastIndex;
      const on = parseOptionsAt(stmt, i);
      i = on.next;
      const labelRe = /\{([^}]*)\}/y;
      labelRe.lastIndex = i;
      const lb = labelRe.exec(stmt);
      if (lb) {
        i = labelRe.lastIndex;
      }
      edgeNode = { options: on.options, labelRaw: lb ? `{${lb[1]}}` : undefined };
    }
    // target ref
    const rt = parseRef(stmt, i);
    if (!rt.ref) break;
    i = rt.next;
    segments.push({ options: oseg.options, edgeNode, target: rt.ref });
  }

  const draw: DrawStmt = {
    kind: "DrawStmt",
    options: o1.options,
    source: rsrc.ref,
    segments,
    range: rng(startOffset, startOffset + stmt.length),
  };
  return draw;
}

function splitStatements(body: string): { stmt: string; start: number }[] {
  const result: { stmt: string; start: number }[] = [];
  let i = 0;
  let start = 0;
  let depth = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth = Math.max(0, depth - 1);
    else if (ch === ";" && depth === 0) {
      const stmt = body.slice(start, i + 1);
      result.push({ stmt, start });
      start = i + 1;
    }
    i++;
  }
  // trailing fragment
  if (start < body.length) {
    const frag = body.slice(start);
    if (frag.trim().length > 0) result.push({ stmt: frag, start });
  }
  return result;
}

function parseLayeredBody(body: string): { layers: TikzLayer[]; stmts: TikzStmt[] } {
  const layers: TikzLayer[] = [];
  const layerBeginRe = /\\begin\{pgfonlayer\}\{([^}]+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = layerBeginRe.exec(body)) !== null) {
    const name = m[1];
    const segStart = m.index + m[0].length;
    const endRe = new RegExp(`\\\\end\\{pgfonlayer\\\\}`);
    endRe.lastIndex = layerBeginRe.lastIndex;
    const textAfterBegin = body.slice(segStart);
    const endMatch = /\n?\s*\\end\{pgfonlayer\}/.exec(textAfterBegin);
    let endIdx: number | undefined = undefined;
    if (endMatch) {
      endIdx = segStart + endMatch.index;
    }
    if (endIdx !== undefined) {
      const inner = body.slice(segStart, endIdx);
      const stmts = splitStatements(inner).map(s => parseStmt(inner, s.start));
      layers.push({ name, stmts: stmts.filter(Boolean) as TikzStmt[], raw: inner });
      last = endIdx + (endMatch?.[0].length ?? 0);
      layerBeginRe.lastIndex = last;
    } else {
      break;
    }
  }
  if (layers.length === 0) {
    const stmts = splitStatements(body).map(s => parseStmt(body, s.start));
    return { layers: [], stmts: stmts.filter(Boolean) as TikzStmt[] };
  }
  return { layers, stmts: [] };
}

function parseStmt(body: string, startOffset: number): TikzStmt | undefined {
  const stmt = body.slice(startOffset);
  return (
    parseNodeStmt(stmt, startOffset) ||
    parseDrawStmt(stmt, startOffset)
  );
}

function parseTikzPictureBody(body: string, optionsRaw?: string): TikzPicture {
  const layered = parseLayeredBody(body);
  return { kind: "TikzPicture", optionsRaw, layers: layered.layers, stmts: layered.stmts };
}

export { parseTikzPictureBody };

