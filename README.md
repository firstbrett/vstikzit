# TikZiT for VS Code

![TikZiT for VS Code screenshot](https://raw.githubusercontent.com/tikzit/vstikzit/main/images/screenshot.png)

[TikZiT](https://tikzit.github.io) is a simple GUI editor for graphs and diagrams. Its native file format is a subset of PGF/TikZ, which means TikZiT files can be included directly in papers typeset using LaTeX. It is a stand-alone application that has been around for about 15 years. This is a VS Code extension that provides a very similar UI to TikZiT directly inside of the editor.

This is still experimental, with some features, bugfixes, and documentation still to come. However, the main features of TikZiT have been implemented, along with some new goodies that make use of the VS Code environment. Please try it and tell me what you think! As usual, you can report issues on the [issue tracker](https://github.com/tikzit/vstikzit/issues).

## Installation

You can install the latest release of TikZiT for VS Code from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=AleksKissinger.vstikzit).

To install the latest development version, clone the [Git repo](https://github.com/tikzit/vstikzit) and follow the instructions in the [Development](#development) section to build a `.vsix` file. Then, in VS Code, open the command palette (Ctrl+Shift+P or Cmd+Shift+P) and select "Extensions: Install from VSIX...". Select the generated file and follow the prompts to install the extension.


## Usage

Once the extension is installed, `.tikz` files will automatically open in the TikZiT editor. The UI should be famliar if you have used TikZiT before. If you are not familiar with TikZiT, press `?` to see a list of keyboard shortcuts, and have a look at the [Quickstart guide](https://tikzit.github.io/#quickstart) to get an overview of how things work. While these docs are written for the desktop application, all the main features are the same in this extension.

TikZiT expects your workspace to be a LaTeX project set up similarly to the [TikZiT template](https://github.com/tikzit/template-quantum). Namely, `.tikz` files are stored in a `figures/` subdirectory, and the route directory additionally contains [tikzit.sty](https://github.com/tikzit/template-quantum/blob/master/tikzit.sty), as well as a `.tikzstyles`, and optionally a `.tikzdefs`.

The `.tikzstyles` file is used to define styles for nodes and edges. This is used both by the TikZiT UI and should be `\input`-ed directly into your LaTeX document. To edit styles, simply open the `.tikzstyles` file in VS Code. All of the properties TikZiT recognizes are editable in the the style editor UI, but may also want to edit this file directly. Double-clicking any style in the style editor will open the source code at the appropriate line.

## Toggling TikZ source view

With a TikZiT tab open, you can press `Ctrl+Alt+T` (or `Cmd+Alt+T` on Mac) to toggle between the graphical editor and the TikZ source code. If a node or edge is selected, the cursor will jump to the corresponding line in the source view. This is the only way to edit PGF/TikZ properties on a picture, node, or edge that are not used by TikZiT. Editing the source code will be reflected immediately in the UI, but you should still save changes before closing the source tab otherwise VS Code might revert them because of how it handles multiple editors open for the same file.

## Open in TikZiT

If you have a TeX file open, any `\tikzfig` or `\ctikzfig` commands will be detected and turned into links you can Alt+Click (or Cmd+Click on Mac) to open the corresponding `.tikz` file in the TikZiT editor. With the cursor over such a command, you can also run the "TikZiT: Open Figure" command from the command palette (Ctrl+Alt+T or Cmd+Alt+T by default). If you use the VIM extension, you can bind a normal mode key to this command, e.g.:

```json
  "vim.normalModeKeyBindings": [
    { "before": ["<leader>", "t"], "commands": ["vstikzit.openTikzEditor"] },
  ],
```
This command will also jump to the graphical TikZ editor if you are viewing the source of a `.tikz` file.


## Inline Editing in .tex (WIP)

- Use the command “TikZiT: Open Inline TikZ Block” in a LaTeX file to open a detected block in a split view.
- tikzpicture blocks open in the TikZiT graphical editor; saving the right-hand editor merges back to the .tex buffer.
- circuitikz blocks currently open in a normal text editor with merge‑back on save.
- If multiple blocks exist, you’ll be prompted to select one.

This is an initial workflow; future releases aim to support circuitikz graphically via package metadata.

## Preview and Sync

Like the desktop application, the TikZiT extension provides the ability to build and preview diagrams. Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac) to build the current diagram. This will create a PDF file in the `cache/` subdirectory of your workspace. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac) to open a preview of the PDF. If you have installed the [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) extension, the preview will open in VS Code and will automatically update whenever you rebuild the diagram.

For TikZ previews, I find it is most convenient to configure the LaTeX Workshop PDF viewer to zoom to page width. You can do this by adding the following line to your `settings.json` file:

```json
  "latex-workshop.view.pdf.zoom": "page-width",
```

Unlike the desktop application, the VS Code extension has features to automatically sync your entire figures directory with prebuild PDFs in `cache`. This is especially useful if you are using draft mode for `tikzit.sty`, via `\usepackage[draft]{tikzit}`. In draft mode, the LaTeX document will include prebuilt PDFs instead of the full TikZ code (if available), which can significantly reduce build time.

To start syncing, open the command palette and select "TikZiT: Sync TikZ Figures". This will watch your `figures/` directory for changes to `.tikz` files, and automatically build the corresponding PDFs in `cache/`. You can stop syncing at any time by selecting "TikZiT: Stop Syncing Figures" from the command palette. 

Both the build and sync commands have variants that will build to SVG instead of PDF, e.g. for use on the web or in [HTML slides](https://www.cs.ox.ac.uk/people/aleks.kissinger/slides/zx/pqs-zx-seminar-sept2025-60min.html). These are both available from the command palette.

### Prerequisites for build/preview

The build features require LaTeX tools to be installed and present on your system `PATH`:
- `pdflatex` (for PDF output)
- `dvisvgm` (for SVG output)

If missing, commands such as “Build TikZ figure” and “Sync TikZ Figures” will fail. Install a LaTeX distribution (e.g., TeX Live or MiKTeX) that includes these tools.

## TODO

The extension is nearly at feature parity with the desktop application, but there are still some things to do:

- [ ] Rotate and reflect selection
- [ ] Move nodes/edges up and down in the Z-order
- [ ] More UI support and testing for multi-edge/filled paths
- [ ] Customization via user settings (colors, paths, keybindings, etc)
- [ ] Support for labels next to nodes via `label=` property
- [ ] Automatically crash editor when `B` key is pressed (currently not planned)

## Roadmap and Inline TikZ (WIP)

We are actively extending the extension per the plan in `docs/IMPROVEMENT_PLAN.md`:

- Parser/serializer improvements to preserve original identifiers, layers, and formatting on round trips.
- Style name validation (ASCII alphanumeric/colon) with auto‑fix suggestions in the Style editor UI.
- Split‑view editing of inline `\begin{tikzpicture}` blocks in `.tex` files. A scaffold command is available:
  - Run "TikZiT: Open Inline TikZ Block" in a LaTeX file to open a detected block in the TikZiT editor (untitled tab beside the source). Merge‑back is coming soon.


## Development

To set up a development environment, you just need `npm` and `git`. Clone the repository, then run `npm install` to install dependencies. You can then open the project in VS Code and press `F5` to launch a new VS Code window with the extension loaded. Open a `.tikz` file to try it out. Useful `npm` scripts are:

- `npm run build` - Build the extension and webview
- `npm run watch` - Build the extension and webview, then watch for changes
- `npm run lint` - Run the linter
- `npm run test` - Run unit tests
- `npm run package` - Create a `.vsix` file for distribution

There are also build scripts for a standalone version that runs in the browser. This can be run using `npm run preview`. This is currently just experimental, but I may find some use for it in the future.

### Quick dev + inline TikZ test (PowerShell)

Two scripts are provided to streamline local development and release packaging.

- Dev Host (loads this repo directly):
  - `pwsh scripts/dev-host.ps1`
  - Installs deps (ci with fallback), builds `dist/`, creates a sample `.tex`, and launches a VS Code Extension Development Host with this repo.
  - Flags: `-InstallLaTeXWorkshop`, `-Workspace <path>`, `-CreateSample:$false`, `-RunInlineCommand:$false`, `-VSCodeCmd <code.cmd>`
  - In the Dev Host window, you can run “TikZiT: Open Inline TikZ Block” (Ctrl+Alt+I) inside a `.tex` file.

- Package Release VSIX:
  - `pwsh scripts/package-release.ps1`
  - Installs deps (ci with fallback), performs a clean build + `vsce package`, and prints the path of the generated `.vsix`.
  - Flags: `-Install` to install into your VS Code after packaging, `-VSCodeCmd <code.cmd>`
