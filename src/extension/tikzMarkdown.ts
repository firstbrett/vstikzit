import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import { TikzFenceCodeLens } from "./TikzFenceCodeLens";
import { MarkdownTikzManager } from "../md/MarkdownTikzManager";

interface FenceExtraction {
  info: string;
  body: string;
}

function extractFenceParts(text: string): FenceExtraction {
  const match = text.match(/^```([^\n]*)\n([\s\S]*?)\n```$/);
  if (!match) {
    return { info: "tikz", body: text };
  }
  const info = match[1] ?? "tikz";
  const body = match[2] ?? "";
  return { info, body };
}

class TikzMarkdownController implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly tempRoot: vscode.Uri;
  private readonly codeLens: TikzFenceCodeLens;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly manager: MarkdownTikzManager
  ) {
    this.tempRoot = this.resolveTempRoot();
    void vscode.workspace.fs.createDirectory(this.tempRoot);

    this.codeLens = new TikzFenceCodeLens();
    this.disposables.push(this.codeLens);

    this.disposables.push(
      vscode.languages.registerCodeLensProvider(
        { language: "markdown" },
        this.codeLens
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        "tikzmd.editFence",
        (uri: vscode.Uri, range: vscode.Range) => this.editFence(uri, range)
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        "tikzmd.rebuildFence",
        (uri: vscode.Uri, range: vscode.Range) => this.rebuildFence(uri, range)
      )
    );
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }

  private resolveTempRoot(): vscode.Uri {
    if (this.context.storageUri) {
      return vscode.Uri.joinPath(this.context.storageUri, "tikzmd");
    }
    return vscode.Uri.file(path.join(os.tmpdir(), "tikzmd"));
  }

  private async editFence(uri: vscode.Uri, range: vscode.Range): Promise<void> {
    const document = await vscode.workspace.openTextDocument(uri);
    const fenceText = document.getText(range);
    const { info, body } = extractFenceParts(fenceText);

    const tempFile = await this.createTempTikzFile(body);
    const editDisposable = vscode.workspace.onDidSaveTextDocument(async saved => {
      if (saved.uri.toString() !== tempFile.toString()) {
        return;
      }
      await this.writeBackFenceContent(uri, range, info, saved.getText());
      await vscode.workspace.fs.delete(tempFile, { recursive: false, useTrash: false });
      editDisposable.dispose();
    });

    this.disposables.push(editDisposable);

    await vscode.commands.executeCommand("vscode.openWith", tempFile, "vstikzit.tikzEditor");
  }

  private async rebuildFence(uri: vscode.Uri, range: vscode.Range): Promise<void> {
    const document = await vscode.workspace.openTextDocument(uri);
    const fenceText = document.getText(range);
    const { body } = extractFenceParts(fenceText);
    const key = this.manager.keyFor(body, uri.fsPath);
    this.manager.ensureCompilation(key, body, uri.fsPath, true);
    vscode.window.showInformationMessage("Rebuilding TikZ fence…");
  }

  private async createTempTikzFile(content: string): Promise<vscode.Uri> {
    const fileName = `tikz-md-${Date.now()}.tikz`;
    const fileUri = vscode.Uri.joinPath(this.tempRoot, fileName);
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, "utf8"));
    return fileUri;
  }

  private async writeBackFenceContent(
    uri: vscode.Uri,
    range: vscode.Range,
    infoLine: string,
    newContent: string
  ): Promise<void> {
    const editor = await vscode.window.showTextDocument(uri);
    const trimmed = newContent.trimEnd();
    const fence = `\`\`\`${infoLine}\n${trimmed}\n\`\`\``;
    await editor.edit(editBuilder => {
      editBuilder.replace(range, fence);
    });
  }
}

export { TikzMarkdownController };
