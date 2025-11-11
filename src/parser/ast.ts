// Minimal AST for a future full TikZ parser.
// This is intentionally permissive and preserves raw text so we can round-trip
// before implementing deep semantics for every package.

interface Position {
  offset: number; // 0-based
}

interface Range {
  start: Position;
  end: Position;
}

// Arbitrary text segment from the document that we do not (yet) parse.
interface RawText {
  kind: "RawText";
  text: string;
  range: Range;
}

// A generic \command[opt]{arg}{arg...} statement we may choose to parse later.
interface CommandStmt {
  kind: "CommandStmt";
  name: string; // e.g., draw, node, tikzstyle, coordinate, etc (without leading backslash)
  raw: string; // raw text of this command including options/args
  range: Range;
}

// A generic \begin{env} ... \end{env} block
interface EnvironmentBlock {
  kind: "EnvironmentBlock";
  env: string; // e.g., tikzpicture, circuitikz
  header: string; // \begin{...}[...] (raw)
  body: string; // raw content between begin/end
  footer: string; // \end{...}
  range: Range; // includes begin..end
}

type Segment = RawText | CommandStmt | EnvironmentBlock;

interface TikzDocument {
  kind: "TikzDocument";
  segments: Segment[];
  sourceLength: number; // for sanity checks in serializers
}

export type { Position, Range, RawText, CommandStmt, EnvironmentBlock, Segment, TikzDocument };

