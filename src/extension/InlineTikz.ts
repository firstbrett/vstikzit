import * as vscode from "vscode";

interface TikzBlock {
  index: number;
  range: vscode.Range;
  text: string;
}

function findTikzBlocks(document: vscode.TextDocument): TikzBlock[] {
  const text = document.getText();
  const blocks: TikzBlock[] = [];
  const begin = /\\begin\{tikzpicture\}/g;
  const end = /\\end\{tikzpicture\}/g;

  let mBegin: RegExpExecArray | null;
  let searchStart = 0;
  let idx = 0;

  while ((mBegin = begin.exec(text)) !== null) {
    end.lastIndex = begin.lastIndex;
    const mEnd = end.exec(text);
    if (!mEnd) break;
    const start = document.positionAt(mBegin.index);
    const stop = document.positionAt(mEnd.index + mEnd[0].length);
    const range = new vscode.Range(start, stop);
    const blockText = document.getText(range);
    blocks.push({ index: idx++, range, text: blockText });
    searchStart = mEnd.index + mEnd[0].length;
    begin.lastIndex = searchStart;
  }

  return blocks;
}

async function openInlineTikz(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const document = editor.document;
  if (!document.fileName.endsWith(".tex")) {
    vscode.window.showInformationMessage("Open a .tex file to use Inline TikZ.");
    return;
  }

  const blocks = findTikzBlocks(document);
  if (blocks.length === 0) {
    vscode.window.showInformationMessage("No tikzpicture blocks found in this document.");
    return;
  }

  // Choose nearest to cursor by default; offer QuickPick when multiple
  const cursor = editor.selection.active;
  let chosen: TikzBlock | undefined = blocks.find(b => b.range.contains(cursor));

  if (!chosen) {
    if (blocks.length === 1) {
      chosen = blocks[0];
    } else {
      const items = blocks.map(b => ({
        label: `tikzpicture #${b.index + 1}`,
        description: `${b.range.start.line + 1}:${b.range.start.character + 1}`,
        block: b,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a tikzpicture block",
      });
      if (!picked) return;
      chosen = picked.block;
    }
  }

  if (!chosen) return;

  // Create an untitled .tikz document seeded with the block text
  const content = chosen.text;
  const doc = await vscode.workspace.openTextDocument({
    language: "latex",
    content,
  });
  const opened = await vscode.window.showTextDocument(doc, {
    preview: false,
    viewColumn: vscode.ViewColumn.Beside,
  });

  // Open with custom TikZiT editor
  await vscode.commands.executeCommand("vscode.openWith", doc.uri, "vstikzit.tikzEditor");

  // TODO: persist mapping (source URI + range -> temp URI) and on save merge updates back preserving formatting.
}

export { findTikzBlocks, openInlineTikz };

