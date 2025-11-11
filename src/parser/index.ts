import { EnvironmentBlock, RawText, Segment, TikzDocument } from "./ast";
import { FullParseError } from "./errors";
import { findEnvironmentBounds } from "./util";

// Very permissive scanner that extracts environment blocks we care about and
// leaves everything else as RawText. This provides a robust round-trip base
// while we incrementally implement deep parsing of environments.

const SUPPORTED_ENVS = ["tikzpicture", "circuitikz"]; // extend over time

function parseTikzDocument(source: string): { ast: TikzDocument; errors: FullParseError[] } {
  const segments: Segment[] = [];
  const errors: FullParseError[] = [];

  let index = 0;
  while (index < source.length) {
    // find the next begin for any supported environment
    let nextInfo: { env: string; start: number; end: number } | null = null;
    for (const env of SUPPORTED_ENVS) {
      const m = findEnvironmentBounds(source, env, index);
      if (!m) continue;
      const [s, e] = m;
      if (!nextInfo || s < nextInfo.start) nextInfo = { env, start: s, end: e };
    }

    if (!nextInfo) {
      // remainder is raw
      if (index < source.length) {
        segments.push({ kind: "RawText", text: source.slice(index), range: { start: { offset: index }, end: { offset: source.length } } } as RawText);
      }
      break;
    }

    // Add preceding raw text
    if (nextInfo.start > index) {
      segments.push({ kind: "RawText", text: source.slice(index, nextInfo.start), range: { start: { offset: index }, end: { offset: nextInfo.start } } } as RawText);
    }

    // Slice the whole environment text
    const beginText = source.slice(nextInfo.start, nextInfo.end);
    // Extract header/body/footer roughly
    const headerMatch = new RegExp(`^\\\begin\{${nextInfo.env}\}([\\s\S]*?)`).exec(beginText);
    const footerMatch = new RegExp(`\\\end\{${nextInfo.env}\}\s*$`).exec(beginText);
    let header = `\\begin{${nextInfo.env}}`;
    let body = beginText;
    let footer = `\\end{${nextInfo.env}}`;
    if (headerMatch && footerMatch) {
      header = headerMatch[0];
      footer = footerMatch[0];
      body = beginText.slice(header.length, beginText.length - footer.length);
    }

    const block: EnvironmentBlock = {
      kind: "EnvironmentBlock",
      env: nextInfo.env,
      header,
      body,
      footer,
      range: { start: { offset: nextInfo.start }, end: { offset: nextInfo.end } },
    };
    segments.push(block);
    index = nextInfo.end;
  }

  return { ast: { kind: "TikzDocument", segments, sourceLength: source.length }, errors };
}

function serializeTikzDocument(ast: TikzDocument): string {
  return ast.segments
    .map(seg => {
      switch (seg.kind) {
        case "RawText":
          return seg.text;
        case "EnvironmentBlock":
          return `${seg.header}${seg.body}${seg.footer}`;
        case "CommandStmt":
          return seg.raw;
      }
    })
    .join("");
}

export { parseTikzDocument, serializeTikzDocument };

