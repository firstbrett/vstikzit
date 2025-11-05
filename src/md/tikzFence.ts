import type MarkdownIt from "markdown-it";
import type { Options } from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import type Renderer from "markdown-it/lib/renderer.mjs";
import { MarkdownTikzManager } from "./MarkdownTikzManager";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tikzFencePlugin(md: MarkdownIt, manager: MarkdownTikzManager): void {
  const defaultFence = (
    tokens: Token[],
    idx: number,
    options: Options,
    _env: unknown,
    self: Renderer
  ): string => self.renderToken(tokens, idx, options);
  const originalFence = md.renderer.rules.fence ?? defaultFence;

  md.renderer.rules.fence = (
    tokens: Token[],
    idx: number,
    options: Options,
    env: unknown,
    self: Renderer
  ) => {
    const token = tokens[idx];
    const lang = (token.info || "").trim().toLowerCase();

    if (lang !== "tikz") {
      return originalFence(tokens, idx, options, env, self);
    }

    const docPath = typeof (env as any)?.path === "string" ? (env as any).path : undefined;
    const key = manager.keyFor(token.content, docPath);
    const cached = manager.getCachedSvg(key);
    const error = manager.getError(key);

    if (!cached) {
      manager.ensureCompilation(key, token.content, docPath);
    }

    if (cached) {
      const uri = cached.toString(true);
      return `<div class="tikzmd-block" data-tikz-key="${key}"><img src="${uri}" alt="TikZ diagram" /></div>`;
    }

    if (error) {
      return `<div class="tikzmd-block tikzmd-error" data-tikz-key="${key}">${escapeHtml(
        error
      )}</div>`;
    }

    return `<div class="tikzmd-block tikzmd-pending" data-tikz-key="${key}">Compiling TikZ…</div>`;
  };
}

export { tikzFencePlugin };
