import { assert } from "chai";
import { parseTikzPictureBody } from "../parser/adapter";
import { pictureToGraph } from "../parser/adapter";

describe("TikZ picture adapter -> Graph", () => {
  it("parses simple nodes and a draw chain", () => {
    const body = `
      \\node (0) at (0,0) {A};
      \\node (1) at (1,0) {B};
      \\draw (0) to (1);
    `;
    const pic = parseTikzPictureBody(body);
    const g = pictureToGraph(pic);
    assert.equal(g.numNodes, 2);
    assert.equal(g.numEdges, 1);
    assert.equal(g.edge(0)?.source, 0);
    assert.equal(g.edge(0)?.target, 1);
  });
});

