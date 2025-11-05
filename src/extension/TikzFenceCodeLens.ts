import * as vscode from "vscode";

class TikzFenceCodeLens implements vscode.CodeLensProvider {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.onDidChangeEmitter.event;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === "markdown") {
          this.onDidChangeEmitter.fire();
        }
      })
    );
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument(document => {
        if (document.languageId === "markdown") {
          this.onDidChangeEmitter.fire();
        }
      })
    );
  }

  dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
    this.onDidChangeEmitter.dispose();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const text = document.getText();
    const regex = /```tikz[^\n]*\n[\s\S]*?```/g;
    const lenses: vscode.CodeLens[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = document.positionAt(match.index);
      const end = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(start, end);
      lenses.push(
        new vscode.CodeLens(range, {
          command: "tikzmd.editFence",
          title: "Edit with TikZiT",
          arguments: [document.uri, range],
        })
      );
      lenses.push(
        new vscode.CodeLens(range, {
          command: "tikzmd.rebuildFence",
          title: "Rebuild TikZ",
          arguments: [document.uri, range],
        })
      );
    }

    return lenses;
  }
}

export { TikzFenceCodeLens };
