import * as vscode from "vscode";
import * as path from "path";
import * as crypto from "crypto";
import { TikzCompileError, TikzCompileService } from "../renderer/TikzCompileService";

class MarkdownTikzManager {
  private readonly cache = new Map<string, vscode.Uri>();
  private readonly errors = new Map<string, string>();
  private readonly pending = new Map<string, Promise<void>>();
  private refreshHandle: NodeJS.Timeout | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  keyFor(content: string, docPath?: string): string {
    const workspaceUri = docPath ? vscode.Uri.file(docPath) : undefined;
    const workspaceFolder = workspaceUri
      ? vscode.workspace.getWorkspaceFolder(workspaceUri)?.uri
      : undefined;
    const signature = this.signatureFor(workspaceFolder);
    return crypto.createHash("sha256").update(content).update(signature).digest("hex");
  }

  getCachedSvg(key: string): vscode.Uri | undefined {
    return this.cache.get(key);
  }

  getError(key: string): string | undefined {
    return this.errors.get(key);
  }

  ensureCompilation(key: string, content: string, docPath?: string, force: boolean = false): void {
    if (force) {
      this.cache.delete(key);
      this.errors.delete(key);
    } else if (this.cache.has(key)) {
      return;
    }
    if (this.pending.has(key)) {
      return;
    }
    const workspaceUri = docPath ? vscode.Uri.file(docPath) : undefined;
    const workspaceFolder = workspaceUri
      ? vscode.workspace.getWorkspaceFolder(workspaceUri)?.uri
      : undefined;

    const promise = this.compile(key, content, workspaceFolder).finally(() => {
      this.pending.delete(key);
    });
    this.pending.set(key, promise);
  }

  private async compile(
    key: string,
    content: string,
    workspaceFolder: vscode.Uri | undefined
  ): Promise<void> {
    const cacheDir = this.resolveCacheDir(workspaceFolder);
    const preamble = this.readPreamble(workspaceFolder);
    const compileService = TikzCompileService.instance;
    const texSource = compileService.wrapTikzSource(content, preamble);
    const baseName = `tikzmd-${key.slice(0, 16)}`;

    try {
      const result = await compileService.compile({
        texSource,
        baseName,
        cacheDir,
        svg: true,
      });
      const svgOrPdf = result.svg ?? result.pdf;
      this.cache.set(key, svgOrPdf);
      this.errors.delete(key);
      this.scheduleRefresh();
    } catch (error) {
      const message =
        error instanceof TikzCompileError
          ? error.message
          : error instanceof Error
          ? error.message
          : String(error);
      this.errors.set(key, message);
      this.scheduleRefresh();
    }
  }

  private resolveCacheDir(workspaceFolder: vscode.Uri | undefined): vscode.Uri {
    const cfg = vscode.workspace.getConfiguration("tikzmd", workspaceFolder);
    const configured = cfg.get<string>("cacheDir") ?? "";
    if (configured.trim().length > 0) {
      if (path.isAbsolute(configured)) {
        return vscode.Uri.file(configured);
      }
      if (workspaceFolder) {
        return vscode.Uri.joinPath(workspaceFolder, configured);
      }
    }
    if (workspaceFolder) {
      return vscode.Uri.joinPath(workspaceFolder, ".tikz-cache");
    }
    return vscode.Uri.joinPath(this.context.globalStorageUri, "tikz-cache");
  }

  private readPreamble(workspaceFolder: vscode.Uri | undefined): string[] {
    const cfg = vscode.workspace.getConfiguration("tikzmd", workspaceFolder);
    const preamble = cfg.get<string[]>("preamble") ?? [];
    return Array.isArray(preamble) ? preamble : [];
  }

  private signatureFor(workspaceFolder: vscode.Uri | undefined): string {
    const cfg = vscode.workspace.getConfiguration("tikzmd", workspaceFolder);
    const signature = {
      engine: cfg.get<string>("engine") ?? "pdflatex",
      enginePath: cfg.get<string>("enginePath") ?? "",
      svgTool: cfg.get<string>("svgTool") ?? "dvisvgm",
      svgToolPath: cfg.get<string>("svgToolPath") ?? "",
      preamble: cfg.get<string[]>("preamble") ?? [],
    };
    return JSON.stringify(signature);
  }

  private scheduleRefresh(): void {
    if (this.refreshHandle) {
      return;
    }
    this.refreshHandle = setTimeout(() => {
      this.refreshHandle = undefined;
      void vscode.commands.executeCommand("markdown.preview.refresh");
    }, 150);
  }

  clear(): void {
    this.cache.clear();
    this.errors.clear();
    this.pending.clear();
    this.scheduleRefresh();
  }
}

export { MarkdownTikzManager };
