import * as vscode from "vscode";
import { spawn } from "child_process";
import * as path from "path";

type Engine = "pdflatex" | "lualatex" | "xelatex" | "tectonic";
type SvgTool = "dvisvgm" | "pdftocairo";

interface CompileRequest {
  texSource: string;
  baseName: string;
  cacheDir: vscode.Uri;
  svg?: boolean;
}

interface CompileResult {
  pdf: vscode.Uri;
  svg?: vscode.Uri;
  log?: vscode.Uri;
}

interface EngineSettings {
  engine: Engine;
  enginePath: string;
  svgTool: SvgTool;
  svgToolPath: string;
  timeout: number;
}

class TikzCompileError extends Error {
  readonly log?: string;
  constructor(message: string, log?: string) {
    super(message);
    this.log = log;
  }
}

class TikzCompileService {
  private static _instance: TikzCompileService | undefined;

  static get instance(): TikzCompileService {
    if (!TikzCompileService._instance) {
      TikzCompileService._instance = new TikzCompileService();
    }
    return TikzCompileService._instance;
  }

  private constructor() {
    // singleton
  }

  async compile(request: CompileRequest): Promise<CompileResult> {
    const settings = this.readSettings();
    await vscode.workspace.fs.createDirectory(request.cacheDir);

    const texUri = vscode.Uri.joinPath(request.cacheDir, `${request.baseName}.tmp.tex`);
    const pdfUri = vscode.Uri.joinPath(request.cacheDir, `${request.baseName}.tmp.pdf`);
    const svgUri = vscode.Uri.joinPath(request.cacheDir, `${request.baseName}.tmp.svg`);
    const logUri = vscode.Uri.joinPath(request.cacheDir, `${request.baseName}.tmp.log`);

    await vscode.workspace.fs.writeFile(texUri, Buffer.from(request.texSource, "utf8"));

    try {
      const engineArgs = this.resolveEngineArgs(settings.engine, texUri.fsPath, request.cacheDir.fsPath);
      await this.spawnWithLogging(settings.enginePath, engineArgs, request.cacheDir.fsPath, settings.timeout);
    } catch (error) {
      throw this.wrapError(error, settings.enginePath, logUri);
    }

    if (request.svg) {
      try {
        const svgArgs = this.resolveSvgArgs(settings.svgTool, pdfUri.fsPath, svgUri.fsPath);
        await this.spawnWithLogging(
          settings.svgToolPath,
          svgArgs,
          request.cacheDir.fsPath,
          settings.timeout
        );
      } catch (error) {
        throw this.wrapError(error, settings.svgToolPath, logUri);
      }
    }

    const finalPdf = vscode.Uri.joinPath(request.cacheDir, `${request.baseName}.pdf`);
    const finalSvg = vscode.Uri.joinPath(request.cacheDir, `${request.baseName}.svg`);

    await this.copyIfExists(pdfUri, finalPdf);
    if (request.svg) {
      await this.copyIfExists(svgUri, finalSvg);
    }

    return {
      pdf: finalPdf,
      svg: request.svg ? finalSvg : undefined,
      log: logUri,
    };
  }

  wrapTikzSource(source: string, extraPreamble: string[] = []): string {
    const hasDocument = /\\begin\{document\}/.test(source);
    const hasTikzPicture = /\\begin\{tikzpicture\}/.test(source);

    if (hasDocument) {
      return source;
    }

    const lines = [
      "\\documentclass[tikz,border=2pt]{standalone}",
      "\\usetikzlibrary{arrows.meta,positioning,calc,shapes,fit}",
      ...extraPreamble,
      "\\begin{document}",
    ];

    if (hasTikzPicture) {
      lines.push(source);
    } else {
      lines.push("\\begin{tikzpicture}");
      lines.push(source);
      lines.push("\\end{tikzpicture}");
    }

    lines.push("\\end{document}");

    return lines.join("\n");
  }

  private async spawnWithLogging(
    command: string,
    args: string[],
    cwd: string,
    timeout: number
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        shell: process.platform === "win32",
        env: process.env,
      });

      let stderr = "";
      const timer =
        timeout > 0
          ? setTimeout(() => {
              child.kill();
              reject(new TikzCompileError(`${command} timed out after ${timeout}ms`, stderr));
            }, timeout)
          : undefined;

      child.stderr.on("data", data => {
        stderr += data.toString();
      });

      child.on("error", err => {
        if (timer) {
          clearTimeout(timer);
        }
        reject(new TikzCompileError(`${command} failed to start: ${err.message}`));
      });

      child.on("close", code => {
        if (timer) {
          clearTimeout(timer);
        }
        if (code === 0) {
          resolve();
        } else {
          reject(new TikzCompileError(`${command} exited with code ${code}`, stderr));
        }
      });
    });
  }

  private wrapError(error: unknown, command: string, logUri: vscode.Uri): TikzCompileError {
    if (error instanceof TikzCompileError) {
      return error;
    }
    const message =
      error instanceof Error ? `${command} failed: ${error.message}` : `${command} failed to run.`;
    return new TikzCompileError(message, logUri.fsPath);
  }

  private async copyIfExists(source: vscode.Uri, target: vscode.Uri): Promise<void> {
    try {
      const content = await vscode.workspace.fs.readFile(source);
      await vscode.workspace.fs.writeFile(target, content);
    } catch {
      // ignore missing files
    }
  }

  private resolveEngineArgs(engine: Engine, texPath: string, outDir: string): string[] {
    if (engine === "tectonic") {
      return ["-X", "compile", texPath, "--outdir", outDir, "--keep-logs", "--keep-intermediates"];
    }
    return ["-interaction=nonstopmode", "-halt-on-error", "-output-directory", outDir, texPath];
  }

  private resolveSvgArgs(svgTool: SvgTool, pdfPath: string, svgPath: string): string[] {
    if (svgTool === "dvisvgm") {
      return ["--pdf", "--no-fonts", "--exact", pdfPath, "-o", svgPath];
    }
    return ["-svg", pdfPath, svgPath];
  }

  private readSettings(): EngineSettings {
    const cfg = vscode.workspace.getConfiguration("tikzmd");
    const engine = (cfg.get<Engine>("engine") ?? "pdflatex") as Engine;
    const enginePath = cfg.get<string>("enginePath") ?? engine;
    const svgTool = (cfg.get<SvgTool>("svgTool") ?? "dvisvgm") as SvgTool;
    const svgToolPath = cfg.get<string>("svgToolPath") ?? svgTool;
    const timeout = cfg.get<number>("timeoutMs") ?? 30000;

    return {
      engine,
      enginePath,
      svgTool,
      svgToolPath,
      timeout,
    };
  }
}

export { TikzCompileService, TikzCompileError, CompileRequest, CompileResult };
