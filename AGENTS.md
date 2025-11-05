# VStikzit Extension Project Guide

## Recent Work
- `415d403` – Ensures Markdown TikZ blocks retain their original newline style when synchronized back to disk, preventing mixed line endings.
- `e1e4cf5` – Merges the Markdown integration work that adds TikZ support across the extension.
- `af2c995` – Improves Markdown parsing by removing LaTeX wrappers before TikZ extraction.
- `e46c430` / `8c66b2e` – Earlier GUI and host/context refactors that set up the current React-based editor surface.

## Repository Structure and File Responsibilities

### Root Level
- `README.md` – Explains the purpose of the VS Code extension, development workflow, and feature overview.
- `LICENSE` – MIT license for the project.
- `index.html` – HTML template used by Vite to bootstrap the webview bundle during development.
- `package.json` / `package-lock.json` – Node package manifest and lock file defining extension, GUI, and build dependencies plus scripts.
- `tsconfig.json` – TypeScript compiler configuration shared between extension backend and webview.
- `eslint.config.js` – Flat ESLint configuration covering extension, GUI, and tests.
- `vite.config.ts` – Vite bundler configuration that produces the webview assets for the extension.
- `tikz.tmGrammar.json` / `tikz-language-configuration.json` – TextMate grammar and VS Code language configuration for TikZ syntax highlighting and editing features.
- `example/` – Sample TikZ assets for manual testing (e.g., styles, definitions, figures).
- `images/` – Extension iconography and marketing assets used in package metadata.

### Source Code (`src/`)

#### Extension Backend (`src/extension/`)
- `extension.ts` – Entry point registered in `package.json`. Activates the extension, registers custom editors/commands, handles auto-opening TikZ editors for Markdown documents, and routes GUI commands back to VS Code.
- `editors.ts` – Shared base class for custom TikZ and style editors. Manages webview lifecycle, message passing, document synchronization, diagnostics, CSP injection, and exposes helpers (`currentUri`, `TikzEditorProvider`, `StyleEditorProvider`).
- `markdown.ts` – Utilities for detecting TikZ code blocks embedded in Markdown documents, exposing block ranges and preserving trailing newline sequences.
- `buildTikz.ts` – Implements build/sync commands. Prepares workspace cache directories, copies supporting `.sty`/`.tikzstyles` files, shells out to `pdflatex` and `dvisvgm`, cleans auxiliary artifacts, and streams results back to the GUI.
- `viewTikz.ts` – Opens generated PDF/SVG artifacts in the appropriate VS Code viewers for previewing built figures.
- `TikzLinkProvider.ts` – Document link provider wiring that resolves `tikz` figure references in LaTeX/HTML files and exposes a registration helper.

#### Shared Libraries (`src/lib/`)
- `Data.ts` – Immutable data structures describing the TikZ scene graph (nodes, edges, paths, styles) plus helpers for cloning and comparisons.
- `Graph.ts` – Functional graph manipulation class that maintains node/edge/path collections and exposes operations for adding/removing/moving elements while preserving immutability semantics.
- `TikzParser.ts` – Parses TikZ source into the structured `Graph`/`Data` representations and serializes edits back into LaTeX strings.
- `commands.ts` – Mapping of command identifiers to graph operations; translates command messages from the GUI into graph mutations.
- `Styles.ts` – Represents TikZ style definitions, import/export helpers, and validation utilities used by the style editor.
- `SceneCoords.ts` – Coordinate transformation helpers between TikZ logical space and screen pixels for interactive editing.
- `curve.ts` – Bezier/curve math helpers used for edge routing and path manipulation.
- `grid.ts` – Grid/snapping logic supporting alignment guides in the editor.
- `labels.ts` – Text label layout helpers for nodes/edges, including positioning and serialization.
- `TikzitHost.ts` – Host abstraction that bridges the React GUI to the VS Code extension (and browser host for tests) for message passing, configuration, and persistence.
- `color.ts` – Color conversion, palette management, and TikZ color serialization helpers.

#### Webview GUI (`src/gui/`)
- `App.tsx` – React root component that coordinates sub-editors, manages shared state, and wires up message handlers.
- `TikzitExtensionHost.tsx` – VS Code-specific host wiring that implements the `TikzitHost` interface over the VS Code webview API.
- `TikzitBrowserHost.tsx` – Host adapter for running the GUI inside a browser (e.g., during development or tests).
- `GraphEditor.tsx` – Canvas-like interactive editor rendering the TikZ scene, handling selection, dragging, and command dispatch.
- `Node.tsx` / `Edge.tsx` / `Style.tsx` – Visual components representing graph primitives and style list items.
- `Toolbar.tsx` / `Menu.tsx` – UI chrome for commands, tools, and menus.
- `StylePanel.tsx` / `StyleEditor.tsx` – Panels and editors for creating, editing, and applying TikZ styles.
- `TikzEditor.tsx` – Integrates the graph editor, toolbars, and code editor into the full TikZ editing experience.
- `CodeEditor.tsx` – Monaco-based source editor component kept in sync with the TikZ graph.
- `InputWithOptions.tsx` – Reusable input component supporting dropdown suggestions.
- `ColorPicker.tsx` – Color selection widget backed by `color.ts` utilities.
- `Help.tsx` – Contextual help content rendered inside the webview.
- `Splitpane.tsx` – Custom split-pane component managing resizable panels.
- `Toolbar.tsx` – Button bar for graph editing tools and view controls.
- `setupEditor.ts` – Bootstraps the React app inside the webview, wiring hosts and message listeners.
- `TikzitHostContext.ts` – React context provider for accessing the current host implementation within the component tree.
- `defaultvars.css` / `vscodevars.css` / `gui.css` – Styling variables and layout definitions for browser and VS Code environments.

#### Type Definitions
- `vscode.d.ts` – Ambient type declarations that describe VS Code APIs when bundling the webview.

#### Tests (`src/test/`)
- `main.test.ts` – Exercises top-level application logic and integration behaviors.
- `graph.test.ts` – Validates graph mutations and serialization behavior.
- `parser.test.ts` – Covers TikZ parsing scenarios and ensures round-trip fidelity.
- `color.test.ts` – Tests color parsing and conversion helpers.
- `data.test.ts` – Ensures the data model classes behave immutably and support cloning.
- `misc.test.ts` – Miscellaneous unit/regression tests for auxiliary helpers.

## Recommendations for Polishing the Extension
- **Packaging & Distribution** – Add `vsce` packaging scripts, gallery metadata (categories, keywords, screenshots), and automate versioning via GitHub Actions to streamline publishing.
- **Robust Build Pipeline** – Expand CI to run linting (`npm run lint`), unit tests, and webview bundle builds across platforms; fail builds on TypeScript or ESLint errors.
- **User Onboarding** – Enhance the README with animated GIFs, detailed usage instructions, and troubleshooting tips; add an in-product welcome page highlighting keyboard shortcuts and workflows.
- **Configuration & Telemetry** – Provide settings for build tool paths (`pdflatex`, `dvisvgm`), optional autosave behavior, and gather optional anonymous diagnostics to surface build failures.
- **Accessibility & Localization** – Audit the webview UI for keyboard navigation, focus order, and high-contrast compliance; prepare strings for localization to reach a broader audience.
- **Error Handling** – Surface build/log errors inline within the editor, add retry affordances, and ensure Markdown sync gracefully handles large documents and CRLF/LF conversions.
- **Performance Profiling** – Profile large graphs for render responsiveness, add virtualization to lists (styles/nodes), and debounce expensive operations like auto-layout.

