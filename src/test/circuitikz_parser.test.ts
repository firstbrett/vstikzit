import { assert } from "chai";
import { parseCircuitikzBody } from "../parser/circuitikz/body";

describe("Circuitikz body parser", () => {
  it("parses draw chains with components and wires", () => {
    const body = `
      \\draw (0,3) to[V, l_=$V_s$] (0,0);
      \\draw (0,3) -- (1,3);
      \\draw (1,3) to[R=R] (3,3);
    `;
    const pic = parseCircuitikzBody(body);
    assert.equal(pic.stmts.length, 3);
    const first = pic.stmts[0] as any;
    assert.equal(first.kind, 'CtzDraw');
    assert.equal(first.segments[0].kind, 'Component');
    assert.equal(first.segments[0].comp, 'V');
    const second = pic.stmts[1] as any;
    assert.equal(second.segments[0].kind, 'Wire');
  });
});

