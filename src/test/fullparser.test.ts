import { assert } from "chai";
import { parseTikzDocument, serializeTikzDocument } from "../parser/index";

describe("Full TikZ document scanner (skeleton)", () => {
  it("should find tikzpicture and circuitikz blocks and roundtrip", () => {
    const input = `Before
\\begin{tikzpicture}[scale=1]
\\node (A) at (0,0) {A};
\\end{tikzpicture}
Middle
\\begin{circuitikz}
\\draw (0,0) to[R] (2,0);
\\end{circuitikz}
After`;

    const { ast, errors } = parseTikzDocument(input);
    assert.equal(errors.length, 0);
    // Expect: RawText, Env(tikzpicture), RawText, Env(circuitikz), RawText
    assert.equal(ast.segments.length, 5);
    assert.equal((ast.segments[1] as any).env, "tikzpicture");
    assert.equal((ast.segments[3] as any).env, "circuitikz");
    assert.equal(serializeTikzDocument(ast), input);
  });
});

