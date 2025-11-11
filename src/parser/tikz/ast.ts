import type { Range } from "../ast";

interface TikzOptionList {
  raw: string; // e.g., [style=A, bend left]
}

interface NodeStmt {
  kind: "NodeStmt";
  options?: TikzOptionList;
  name?: string; // value inside (...)
  coord?: { x: number; y: number };
  labelRaw?: string; // raw {..}
  range: Range;
}

interface PathRef {
  name?: string; // node name/id inside (...)
  anchor?: string; // optional .anchor
  isEmpty?: boolean; // () used in cycle/placeholder
  raw: string;
}

interface EdgeNodeInline {
  options?: TikzOptionList;
  labelRaw?: string; // {..}
}

interface ToSegment {
  options?: TikzOptionList; // to[...]
  edgeNode?: EdgeNodeInline; // node[...] {...}
  target: PathRef;
}

interface DrawStmt {
  kind: "DrawStmt";
  options?: TikzOptionList; // \draw[...]
  source: PathRef;
  segments: ToSegment[]; // one or more 'to' segments
  range: Range;
}

type TikzStmt = NodeStmt | DrawStmt;

interface TikzLayer {
  name: string; // e.g., nodelayer, edgelayer
  stmts: TikzStmt[];
  raw: string; // original text inside the layer
}

interface TikzPicture {
  kind: "TikzPicture";
  optionsRaw?: string; // [..] after \begin{tikzpicture}
  layers: TikzLayer[]; // may be empty; then stmts belong to default layer
  stmts: TikzStmt[]; // statements at top-level if no layers used
}

export type { TikzOptionList, NodeStmt, DrawStmt, TikzStmt, TikzLayer, TikzPicture, PathRef, ToSegment, EdgeNodeInline };

