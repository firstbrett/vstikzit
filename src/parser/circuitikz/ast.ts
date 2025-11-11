import type { Range } from "../ast";
import type { PathRef } from "../shared";

interface CtzOptionList {
  raw: string; // [R=10, l^=$i$]
}

type SegmentKind = "Wire" | "Component";

interface WireSeg {
  kind: "Wire";
  target: PathRef;
  range: Range;
}

interface ComponentSeg {
  kind: "Component";
  comp: string; // e.g., R, L, C, V, sV, D*, open, short
  options?: CtzOptionList; // whole [...] content
  target: PathRef;
  range: Range;
}

type CtzSeg = WireSeg | ComponentSeg;

interface DrawChain {
  kind: "CtzDraw";
  options?: CtzOptionList; // \draw[...]
  source: PathRef;
  segments: CtzSeg[];
  range: Range;
}

type CtzStmt = DrawChain; // extend with nodes/coordinates if needed

interface CircuitikzPicture {
  kind: "Circuitikz";
  stmts: CtzStmt[];
}

export type { CircuitikzPicture, CtzStmt, DrawChain, CtzSeg, WireSeg, ComponentSeg, CtzOptionList };

