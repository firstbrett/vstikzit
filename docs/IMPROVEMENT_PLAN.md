# TikZiT VS Code Extension — Implementation Roadmap

This roadmap tracks the TikZiT Extension Improvement Plan from AGENTS.md and maps each item to code locations, current status, and next actions. It will evolve as features land.

## 1. Parser and Serializer
- Current: `chevrotain`-based parser in `src/lib/TikzParser.ts` generates an AST-like model (`Graph`, `Styles`). Serializer lives in `Graph.tikz()` and `Styles.tikz()`.
- Gaps:
  - Preserve node identifiers (original names), layer declarations, indentation, and comments on round trips.
  - Regression tests for import → edit → export → diff across variants (circuitikz, layered, embedded).
- Next actions:
  - Model original node names and layer segments: extend `GraphData`/`NodeData` to carry `name`, and store `layers` with block order. Update `Graph.tikz()` to prefer original names and layer names.
  - Add formatting/comment preservation strategy (token spans with passthrough segments) — design stub + TODOs.
  - Add regression tests under `src/test/roundtrip/` with fixtures.

### New modular parser/serializer framework (skeleton in repo)
- Added `src/parser/` with:
  - `ast.ts`: simple AST representing `RawText`, `EnvironmentBlock`, and `CommandStmt`.
  - `index.ts`: permissive scanner `parseTikzDocument()` that extracts `tikzpicture`/`circuitikz` env blocks and preserves everything else as raw text, plus `serializeTikzDocument()` for round-tripping.
  - `errors.ts`, `util.ts`: helpers and error types.
- Added tests: `src/test/fullparser.test.ts` to validate round‑trip and block discovery.
- This provides a safe round‑trip base we can extend with deeper parsing for commands/paths without breaking formatting.

## 2. Style Ingestion & Palette
- Current: `.tikzstyles` auto-read via `BaseEditorProvider.getTikzStyles()` and visible in Style Panel.
- Gaps:
  - Validate style names per policy; show/fix invalid names in UI.
  - Expand ingestion to support multiple `.tikzstyles` files and optionally `tikzit.sty` metadata.
- Next actions (partially implemented now):
  - Add `isValidStyleName` and `suggestStyleName` utilities. Surface validation in `StyleEditor` and block invalid apply.
  - Consider scanning all workspace folders for `.tikzstyles` and merging in order.

## 3. Component Metadata & Anchors
- Current: Edge anchors preserved; no package anchor schema.
- Gaps:
  - Bundle JSON schema for known packages (e.g., circuitikz) to enable anchor completion and preservation of custom anchors.
- Next actions:
  - Add `schemas/anchors.json` (stub) and a loader. Integrate with UI for anchor suggestions.

## 4. Coordinate & Manual Block Preservation
- Current: Coordinates and labels are preserved numerically; no explicit manual block toggle.
- Gaps:
  - Named coordinates and manual LaTeX snippet preservation.
- Next actions:
  - Define “manual blocks” with a sentinel comment or property and bypass reserialization unless edited. Design in code comments.

## 5. Split-View Editing for Inline TikZ
- Current: `TikzLinkProvider` detects `\tikzfig`/`\ctikzfig`. No inline block editor.
- Gaps:
  - Discover `\begin{tikzpicture}` blocks, open block in TikZiT side-by-side, merge updates back while preserving formatting.
- Next actions (scaffold implemented now):
  - Add command `vstikzit.openInlineTikz` to detect blocks and open a chosen block in a TikZiT editor as an untitled `.tikz`. Persist mapping for later merge. Implement merge-back in a follow-up.

## 6. Diagnostics & Testing
- Current: Build/sync `.tikz` via `pdflatex` and `dvisvgm`. Diagnostics for parser errors shown in TikZiT editors.
- Gaps:
  - Optional background full-document compilation (`latexmk`/`pdflatex`) and node/anchor highlighting.
  - CI to run parser/serializer roundtrip tests and LaTeX compilation of samples.
- Next actions:
  - Add settings for compilation command and path. Add background task scaffold. Extend tests with fixtures.

## 7. Templates & UX Enhancements
- Current: Core TikZiT-like UI in `src/gui` with style panel and editor; no template gallery.
- Gaps:
  - Template gallery insertions, snapping/grid presets for circuit diagrams, and keyboard shortcuts to jump between source/canvas.
- Next actions:
  - Add templates folder and insertion command; add grid/snapping presets setting.

## 8. Documentation & Contribution
- Current: README with usage and development.
- Gaps:
  - Deep docs for split-view workflow and supported TikZ features.
- Next actions (partially done now):
  - Maintain this roadmap and reference files/components. Extend README with a section on upcoming inline TikZ editing and style validation.

---

Short-term deliverables in this commit:
- Style name validation utilities + UI integration.
- Inline TikZ open command scaffold.
- Roadmap document (this file).
