import * as vscode from "vscode";

interface TikzBlock {
  index: number;
  range: vscode.Range;
  text: string;
  env: "tikzpicture" | "circuitikz";
}

function findTikzBlocks(document: vscode.TextDocument): TikzBlock[] {
  const text = document.getText();
  const blocks: TikzBlock[] = [];

  const envs: Array<"tikzpicture" | "circuitikz"> = ["tikzpicture", "circuitikz"];
  for (const env of envs) {
    const begin = new RegExp(`\\\\begin\\{${env}\\}`, "g");
    const end = new RegExp(`\\\\end\\{${env}\\}`, "g");

    let mBegin: RegExpExecArray | null;
    let searchStart = 0;
    while ((mBegin = begin.exec(text)) !== null) {
      end.lastIndex = begin.lastIndex;
      const mEnd = end.exec(text);
      if (!mEnd) break;
      const start = document.positionAt(mBegin.index);
      const stop = document.positionAt(mEnd.index + mEnd[0].length);
      const range = new vscode.Range(start, stop);
      const blockText = document.getText(range);
      blocks.push({ index: 0, range, text: blockText, env });
      searchStart = mEnd.index + mEnd[0].length;
      begin.lastIndex = searchStart;
    }
  }

  blocks.sort((a, b) => a.range.start.compareTo(b.range.start));
  return blocks.map((b, i) => ({ ...b, index: i }));
}

// Track open inline edit sessions to allow merge-back
const sessions = new Map<string, { sourceUri: vscode.Uri; blockIndex: number; env: TikzBlock["env"] }>();

function registerInlineHandlers(context: vscode.ExtensionContext) {
  const saveSub = vscode.workspace.onDidSaveTextDocument(async doc => {
    const key = doc.uri.toString();
    const sess = sessions.get(key);
    if (!sess) return;
    try {
      const sourceDoc = await vscode.workspace.openTextDocument(sess.sourceUri);
      const blocks = findTikzBlocks(sourceDoc);
      const target = blocks.find(b => b.index === sess.blockIndex && b.env === sess.env);
      if (!target) {
        vscode.window.showWarningMessage("Could not locate original TikZ block to merge back.");
        return;
      }
      const edit = new vscode.WorkspaceEdit();
      edit.replace(sess.sourceUri, target.range, doc.getText());
      await vscode.workspace.applyEdit(edit);
      await sourceDoc.save();
      vscode.window.showInformationMessage("Merged inline TikZ changes back to source.");
    } finally {
      sessions.delete(key);
    }
  });

  context.subscriptions.push(saveSub);
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
    vscode.window.showInformationMessage("No tikzpicture/circuitikz blocks found in this document.");
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
        label: `tikz block #${b.index + 1} (${b.env})`,
        description: `${b.range.start.line + 1}:${b.range.start.character + 1}`,
        block: b,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a tikzpicture/circuitikz block",
      });
      if (!picked) return;
      chosen = picked.block;
    }
  }

  if (!chosen) return;

  // Create an untitled document seeded with the block text
  const content = chosen.text;
  const untitled = await vscode.workspace.openTextDocument({ language: "latex", content });
  await vscode.window.showTextDocument(untitled, { preview: false, viewColumn: vscode.ViewColumn.Beside });

  if (chosen.env === "tikzpicture") {
    // Open with custom TikZiT editor
    await vscode.commands.executeCommand("vscode.openWith", untitled.uri, "vstikzit.tikzEditor");
  }

  // Save session for merge-back on save
  sessions.set(untitled.uri.toString(), {
    sourceUri: document.uri,
    blockIndex: chosen.index,
    env: chosen.env,
  });
}

export { findTikzBlocks, openInlineTikz, registerInlineHandlers };
