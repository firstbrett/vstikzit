import { parseTikzPictureBody } from "./tikz/picture";
import type { TikzPicture } from "./tikz/ast";
import Graph from "../lib/Graph";
import { EdgeData, NodeData, PathData, Coord } from "../lib/Data";

// Convert a simple TikzPicture into a Graph understood by the TikZiT GUI.
// We only handle basic \node and \draw ... to ... chains here. Unknown bits are ignored.

function pictureToGraph(pic: TikzPicture): Graph {
  let graph = new Graph();
  const nameToId = new Map<string, number>();

  const pushNode = (name?: string, coord?: { x: number; y: number }, labelRaw?: string) => {
    const id = name && /^\d+$/.test(name) ? parseInt(name, 10) : graph.freshNodeId;
    if (name) nameToId.set(name, id);
    const d = new NodeData().setId(id).setCoord(new Coord(coord?.x ?? 0, coord?.y ?? 0)).setLabel(labelRaw ? labelRaw.slice(1, -1) : "");
    graph = graph.addNodeWithData(d);
  };

  const getId = (name?: string): number => {
    if (!name) return graph.freshNodeId; // anonymous
    if (nameToId.has(name)) return nameToId.get(name)!;
    const id = /^\d+$/.test(name) ? parseInt(name, 10) : graph.freshNodeId;
    nameToId.set(name, id);
    graph = graph.addNodeWithData(new NodeData().setId(id));
    return id;
  };

  const handleStmtLists = (stmts: any[]) => {
    for (const st of stmts) {
      if (st.kind === "NodeStmt") {
        pushNode(st.name, st.coord, st.labelRaw);
      } else if (st.kind === "DrawStmt") {
        const pathId = graph.freshPathId;
        let src = getId(st.source?.name);
        let edgeId = graph.freshEdgeId;
        let path = new PathData().setId(pathId);

        for (const seg of st.segments) {
          const tgt = getId(seg.target?.name);
          let ed = new EdgeData().setId(edgeId).setSource(src).setTarget(tgt).setPath(pathId);
          graph = graph.addEdgeWithData(ed);
          path = path.addEdge(edgeId);
          edgeId = graph.freshEdgeId;
          src = tgt;
        }
        graph = graph.addPathWithData(path);
      }
    }
  };

  // If layers exist, process all
  if (pic.layers.length > 0) {
    for (const layer of pic.layers) handleStmtLists(layer.stmts);
  } else {
    handleStmtLists(pic.stmts);
  }

  return graph;
}

export { parseTikzPictureBody, pictureToGraph };

