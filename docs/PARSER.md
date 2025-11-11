# Modular Parser Overview

This file documents the new parser/serializer stack that lives beside the legacy `chevrotain` parser. The goal is to ingest the full range of TikZ (including `circuitikz`) while preserving source fidelity and remaining backwards compatible with the existing TikZiT graph model.

## Directory Layout

- `src/parser/ast.ts`
  - Document-level AST primitives (`RawText`, `EnvironmentBlock`, `CommandStmt`).
  - `parseTikzDocument()` discovers supported environments (`tikzpicture`, `circuitikz`) and preserves everything else verbatim for safe round-trips.
- `src/parser/shared.ts`
  - Whitespace skipper, `[options]` parser, and coordinate reference parser shared between TikZ/circuitikz modules.

### TikZ picture module
- `src/parser/tikz/ast.ts`
  - AST for TikZ pictures: `NodeStmt`, `DrawStmt`, `ToSegment`, `TikzLayer`.
- `src/parser/tikz/picture.ts`
  - Splits bodies into statements, parses `\node ...;` and chained `\draw ... to ...;` statements.
  - Handles layer blocks (`pgfonlayer`) and tolerates draw options (`[->]`, `[<->]`, inline nodes).
- `src/parser/adapter.ts`
  - `pictureToGraph()` converts parsed TikZ statements into the existing `Graph`/`NodeData`/`EdgeData` data structures that power the GUI. Unknown constructs are ignored for now but preserved in the source text.

### Circuitikz module
- `src/parser/circuitikz/ast.ts`
  - AST for `\draw ... to[...] ...;` chains with component segments vs. raw wires.
- `src/parser/circuitikz/body.ts`
  - Parses circuitikz bodies, recognizes both component segments (e.g., `to[R=10]`) and plain wires (`--`).
  - Relative coordinate steps (`++(dx,dy)`) are tolerated; options are preserved verbatim.
  - This parser currently keeps the AST for future adapters/UI; inline editing already uses it for safe merge back.

## Tests
- `src/test/fullparser.test.ts`: Sanity check for document-level parse/serialize with mixed environments.
- `src/test/tikzpicture_adapter.test.ts`: Ensures TikZ body parsing + graph adapter work for basic node/draw combinations (including `[->]`).
- `src/test/circuitikz_parser.test.ts`: Verifies circuitikz chains parse into component/wire segments.
- `src/test/main.test.ts` imports all parser tests so `npm test` runs them.

## Current Capabilities
- Detects and round-trips any number of `tikzpicture`/`circuitikz` environments inside `.tex` files.
- Parses TikZ nodes and draw chains (with layer support) and adapts them to the current GUI model.
- Parses `circuitikz` draw chains into an AST, preserving component metadata for future GUI work.
- Inline editing uses this infrastructure for safe merge-back even when the GUI cannot render a block.

## Next Steps
- Extend TikZ parsing to cover `\path`, `\coordinate`, Bezier controls, `|-`/`-|`, `cycle`, `out=/in=` options, and manual blocks.
- Provide an adapter (or visualization path) for circuitikz AST so the GUI can render simplified circuit diagrams and expose component metadata.
- Replace the legacy `chevrotain` parser with these modules once coverage reaches parity, keeping a preservation-first mode as the fallback.

