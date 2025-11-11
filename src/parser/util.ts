// Utilities for scanning LaTeX/TikZ text while preserving raw segments

// Return indices for \begin{env} and matching \end{env} given a start index.
function findEnvironmentBounds(source: string, env: string, fromIndex: number): [number, number] | null {
  const beginRe = new RegExp(`\\\\begin\\{${env}\\}`, 'g');
  beginRe.lastIndex = fromIndex;
  const beginMatch = beginRe.exec(source);
  if (!beginMatch) return null;
  const start = beginMatch.index;

  // naive depth-aware search so nested same envs are handled (rare for tikzpicture)
  const endRe = new RegExp(`\\\\end\\{${env}\\}`, 'g');
  let depth = 1;
  let i = beginRe.lastIndex;
  while (i <= source.length) {
    const nextBegin = (() => { beginRe.lastIndex = i; const m = beginRe.exec(source); return m ? m.index : -1; })();
    const nextEnd = (() => { endRe.lastIndex = i; const m = endRe.exec(source); return m ? m.index : -1; })();
    if (nextEnd === -1) return null;
    if (nextBegin !== -1 && nextBegin < nextEnd) {
      depth += 1; i = nextBegin + 1; continue;
    }
    depth -= 1;
    if (depth === 0) {
      const endIdx = endRe.lastIndex; // after \end{env}
      return [start, endIdx];
    }
    i = nextEnd + 1;
  }
  return null;
}

export { findEnvironmentBounds };

