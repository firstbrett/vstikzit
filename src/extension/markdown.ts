import * as vscode from "vscode";

const MARKDOWN_CODE_BLOCK_PATTERN = /```[^\n]*\b(?:tikz|latex)\b[^\n]*\n([\s\S]*?)```/gi;

function createMarkdownCodeBlockRegex(): RegExp {
  return new RegExp(MARKDOWN_CODE_BLOCK_PATTERN.source, MARKDOWN_CODE_BLOCK_PATTERN.flags);
}

export function isMarkdownDocument(document: vscode.TextDocument): boolean {
  const extension = document.uri.fsPath.toLowerCase();
  return extension.endsWith(".md") || document.languageId === "markdown";
}

export function containsTikzMarkdown(text: string): boolean {
  const regex = createMarkdownCodeBlockRegex();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const blockContent = match[1];
    if (/\\begin\{tikzpicture}/i.test(blockContent) || /\\begin\{document}/i.test(blockContent)) {
      return true;
    }
  }
  return false;
}

export interface MarkdownTikzBlock {
  content: string;
  range: vscode.Range;
  trailingNewline: string | undefined;
}

export function findMarkdownTikzBlock(document: vscode.TextDocument): MarkdownTikzBlock | undefined {
  const text = document.getText();
  const regex = createMarkdownCodeBlockRegex();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const blockContent = match[1];
    if (!/\\begin\{tikzpicture}/i.test(blockContent) && !/\\begin\{document}/i.test(blockContent)) {
      continue;
    }

    const blockText = match[0];
    const contentIndex = blockText.indexOf(blockContent);
    if (contentIndex === -1) {
      continue;
    }

    const blockStartOffset = match.index;
    const contentStartOffset = blockStartOffset + contentIndex;
    const contentEndOffset = contentStartOffset + blockContent.length;

    const startPosition = document.positionAt(contentStartOffset);
    const endPosition = document.positionAt(contentEndOffset);
    const range = new vscode.Range(startPosition, endPosition);

    const trailingNewlineMatch = blockContent.match(/(\r?\n)$/);

    return {
      content: blockContent,
      range,
      trailingNewline: trailingNewlineMatch ? trailingNewlineMatch[1] : undefined,
    };
  }

  return undefined;
}
