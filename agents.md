# TikZiT Extension Improvement Plan

This document summarizes the features we need in the VS Code TikZiT extension, along with guidance for implementation. Treat it as a checklist for the team.

## 1. Parser and Serializer
- Replace regex parsing with an AST-driven parser for `tikzpicture` environments. A PEG-based grammar (nearley, chevrotain) is preferred.
- Preserve node identifiers, anchor references, and layer declarations on round trips. Serialization must respect original indentation and comments.
- Add regression tests: import → edit → export → diff. Include cases for circuitikz, layered diagrams, and embedded TikZ in `.tex`.

## 2. Style Ingestion & Palette
- Read `tikzit.sty` / `.tikzstyles` automatically. Populate the palette from these definitions.
- Support namespaces/categories (e.g., Circuit, Graphs) and allow editing styles in UI. Persist edits back to the style sources.
- Validate style names (ASCII alphanumeric/colon only). Provide auto-fix suggestions when a name is illegal.

## 3. Component Metadata & Anchors
- Bundle a JSON schema describing anchors for known packages (circuitikz, etc.). Use it to show available anchors in the UI and to keep `.n`, `.s`, `.anode` intact.
- When encountering unknown styles, inspect their TikZ definitions if available; otherwise, retain whatever anchors appear in the text.

## 4. Coordinate & Manual Block Preservation
- Keep coordinates and labels as named entities. Moving nodes should only change numeric coordinates.
- Provide a “manual block” toggle so custom LaTeX snippets (arrows, annotations) are never rewritten unless explicitly edited via the canvas.

## 5. Split-View Editing for Inline TikZ
- Implement a document link provider that discovers each `\begin{tikzpicture}` block inside `.tex` files.
- Expose a command (gutter icon + context menu) to open that block in TikZiT within a VS Code split view. The `.tex` file stays on the left; TikZiT shows the extracted AST on the right.
- On save, merge updates back into the `.tex` buffer, preserving formatting.
- Remember last-opened diagrams per document. Offer an optional command to extract a block into its own `.tikz` file if users want that workflow.

## 6. Diagnostics & Testing
- Add optional background compilation (`latexmk`/`pdflatex` command configurable per workspace). Surface errors inline and highlight the offending nodes/anchors in TikZiT.
- Extend CI to run the parser/serializer tests plus latex compilation on sample diagrams.

## 7. Templates & UX Enhancements
- Include template galleries for common circuits (bridge rectifier, buck converter, etc.) that can be inserted either as `.tikz` files or inline blocks via the split view.
- Add snapping/grid settings tuned for circuit diagrams and keyboard shortcuts to jump between source and canvas.

## 8. Documentation & Contribution
- Document supported TikZ features, the split-view workflow, and style-guideline best practices.
- Publish the parser/AST utilities as a separate package so circuitikz (and other packages) can contribute metadata or unit tests upstream.

### Definition of Done
1. All user stories above have automated tests.
2. Sample projects (including inline TikZ in `.tex`) build without diffs or LaTeX errors after round tripping through TikZiT.
3. Documentation includes quick-start instructions for both standalone `.tikz` and inline `.tex` workflows.
