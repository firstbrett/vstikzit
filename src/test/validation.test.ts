import { assert } from "chai";
import { isValidStyleName, suggestStyleName } from "../lib/validation";

describe("Style name validation", () => {
  it("accepts alphanumeric and colons", () => {
    ["A", "A1", "Circuit:Gate", "Zx:Spider:Green", "C123"].forEach(n =>
      assert.isTrue(isValidStyleName(n), n)
    );
  });

  it("rejects spaces and punctuation", () => {
    ["A B", "A-B", "A_B", "A/B", "A,B", "A.B", "α", "ç"].forEach(n =>
      assert.isFalse(isValidStyleName(n), n)
    );
  });

  it("suggests reasonable fixes", () => {
    const cases: [string, string][] = [
      ["A B", "A:B"],
      ["Circuit-Gate", "Circuit:Gate"],
      ["My.Style", "My:Style"],
      ["foo/ bar", "foo:bar"],
      ["  ", "style"],
    ];
    cases.forEach(([raw, expected]) => assert.equal(suggestStyleName(raw), expected));
  });
});

