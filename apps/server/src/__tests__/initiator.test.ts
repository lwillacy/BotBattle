import { getInitiatorForRound } from "../engine/resolver";

describe("getInitiatorForRound", () => {
  test("round 1 = initialInitiator when A", () => {
    expect(getInitiatorForRound(1, "A")).toBe("A");
  });

  test("round 1 = initialInitiator when B", () => {
    expect(getInitiatorForRound(1, "B")).toBe("B");
  });

  test("round 2 = opposite of initialInitiator", () => {
    expect(getInitiatorForRound(2, "A")).toBe("B");
    expect(getInitiatorForRound(2, "B")).toBe("A");
  });

  test("round 3 = same as initialInitiator", () => {
    expect(getInitiatorForRound(3, "A")).toBe("A");
    expect(getInitiatorForRound(3, "B")).toBe("B");
  });

  test("odd rounds = initialInitiator over 15 rounds", () => {
    const initial = "A";
    for (let i = 1; i <= 15; i++) {
      const expected = i % 2 === 1 ? "A" : "B";
      expect(getInitiatorForRound(i, initial)).toBe(expected);
    }
  });

  test("all 15 rounds alternation starting with B", () => {
    const initial = "B";
    for (let i = 1; i <= 15; i++) {
      const expected = i % 2 === 1 ? "B" : "A";
      expect(getInitiatorForRound(i, initial)).toBe(expected);
    }
  });
});
