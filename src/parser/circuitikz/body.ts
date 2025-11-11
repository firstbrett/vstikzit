import type { Range } from "../ast";
import { skipWs, parseOptionsAt, parseRef, PathRef } from "../shared";
import type { CircuitikzPicture, CtzStmt, DrawChain, CtzSeg, ComponentSeg, WireSeg } from "./ast";

function rng(start: number, end: number): Range {
  return { start: { offset: start }, end: { offset: end } };
}

function splitStatements(body: string): { stmt: string; start: number }[] {
  const result: { stmt: string; start: number }[] = [];
  let i = 0; let start = 0; let depth = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth = Math.max(0, depth - 1);
    else if (ch === ';' && depth === 0) { result.push({ stmt: body.slice(start, i + 1), start }); start = i + 1; }
    i++;
  }
  if (start < body.length) { const frag = body.slice(start); if (frag.trim()) result.push({ stmt: frag, start }); }
  return result;
}

function maybeSkipRelative(src: string, i: number): number {
  i = skipWs(src, i);
  if (src.slice(i, i + 2) === '++') return i + 2;
  return i;
}

function parseDrawCtz(stmt: string, startOffset: number): DrawChain | undefined {
  if (!/^\s*\\draw\b/.test(stmt)) return undefined;
  let i = stmt.indexOf('\\draw') + 5;
  i = skipWs(stmt, i);
  const oDraw = parseOptionsAt(stmt, i);
  i = oDraw.next;

  // source
  const src = parseRef(stmt, i);
  if (!src.ref) return undefined;
  i = src.next;

  const segs: CtzSeg[] = [];
  while (i < stmt.length) {
    i = skipWs(stmt, i);
    // detect '--' wire first
    if (stmt.slice(i, i + 2) === '--') {
      i += 2;
      i = maybeSkipRelative(stmt, i);
      const rt = parseRef(stmt, i);
      if (!rt.ref) break;
      i = rt.next;
      const seg: WireSeg = { kind: 'Wire', target: rt.ref, range: rng(startOffset, startOffset + i) };
      segs.push(seg);
      continue;
    }

    // 'to' with component options
    const toRe = /\bto\b/y; toRe.lastIndex = i; const tm = toRe.exec(stmt);
    if (!tm) break;
    i = toRe.lastIndex;
    const oSeg = parseOptionsAt(stmt, i);
    i = oSeg.next;
    // Extract component name: first token of options
    let comp = 'short';
    if (oSeg.options) {
      const inside = oSeg.options.raw.slice(1, -1).trim();
      if (inside.length > 0) comp = inside.split(',')[0].trim();
    }
    i = maybeSkipRelative(stmt, i);
    const rt = parseRef(stmt, i);
    if (!rt.ref) break;
    i = rt.next;
    const seg: ComponentSeg = { kind: 'Component', comp, options: oSeg.options, target: rt.ref, range: rng(startOffset, startOffset + i) };
    segs.push(seg);
  }

  const chain: DrawChain = { kind: 'CtzDraw', options: oDraw.options, source: src.ref!, segments: segs, range: rng(startOffset, startOffset + stmt.length) };
  return chain;
}

function parseCircuitikzBody(body: string): CircuitikzPicture {
  const stmts: CtzStmt[] = [];
  for (const { stmt, start } of splitStatements(body)) {
    const d = parseDrawCtz(stmt, start);
    if (d) stmts.push(d);
  }
  return { kind: 'Circuitikz', stmts };
}

export { parseCircuitikzBody };

