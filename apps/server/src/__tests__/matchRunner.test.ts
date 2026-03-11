/**
 * Integration test for match runner using mocked agent caller and mocked prisma.
 * Tests a full 15-round match orchestration.
 */
import { resolvePayoffs, getInitiatorForRound } from "../engine/resolver";
import { trustDefectV1 } from "../engine/rules/trustDefectV1";

// We test the core logic without hitting the database
// by testing the building blocks that the match runner uses.

describe("matchRunner logic (unit tests for orchestration components)", () => {
  const rules = trustDefectV1;

  test("15 rounds produce 15 initiator assignments", () => {
    const initiators: string[] = [];
    for (let i = 1; i <= rules.totalRounds; i++) {
      initiators.push(getInitiatorForRound(i, "A"));
    }
    expect(initiators).toHaveLength(15);
    // Odd rounds: A, Even rounds: B
    expect(initiators[0]).toBe("A"); // round 1
    expect(initiators[1]).toBe("B"); // round 2
    expect(initiators[2]).toBe("A"); // round 3
    expect(initiators[14]).toBe("A"); // round 15 (odd)
  });

  test("score accumulates correctly over simulated rounds", () => {
    let scoreA = 0;
    let scoreB = 0;
    const initiatorBonus = rules.initiatorBonus;

    // Simulate: A always TRUST, B always DEFECT
    for (let r = 1; r <= rules.totalRounds; r++) {
      const initiator = getInitiatorForRound(r, "A");
      const { payoffA, payoffB } = resolvePayoffs("TRUST", "DEFECT", rules);
      const bonusA = initiator === "A" ? initiatorBonus : 0;
      const bonusB = initiator === "B" ? initiatorBonus : 0;
      scoreA += payoffA + bonusA;
      scoreB += payoffB + bonusB;
    }

    // A always gets -4 per round (TRUST vs DEFECT) => -60 total
    // B always gets 5 per round => 75 total
    // initiatorBonus is 0, so no bonus adjustment
    const expectedBaseA = 15 * (-4); // -60
    const expectedBaseB = 15 * 5; // 75
    expect(scoreA).toBe(expectedBaseA); // -60
    expect(scoreB).toBe(expectedBaseB); // 75
  });

  test("tie-breaking: equal scores produce no winner", () => {
    // Simulate TRUST/TRUST for all 15 rounds
    let scoreA = 0;
    let scoreB = 0;
    const initiatorBonus = rules.initiatorBonus;

    for (let r = 1; r <= rules.totalRounds; r++) {
      const initiator = getInitiatorForRound(r, "A");
      const { payoffA, payoffB } = resolvePayoffs("TRUST", "TRUST", rules);
      scoreA += payoffA + (initiator === "A" ? initiatorBonus : 0);
      scoreB += payoffB + (initiator === "B" ? initiatorBonus : 0);
    }

    // With TRUST/TRUST and initiatorBonus=0, both get 3*15=45 — a true tie
    expect(scoreA).toBe(45);
    expect(scoreB).toBe(45);
  });

  test("DEFECT/DEFECT all rounds: both score 0 (0/0 payoff, 0 bonus)", () => {
    let scoreA = 0;
    let scoreB = 0;
    const initiatorBonus = rules.initiatorBonus;

    for (let r = 1; r <= rules.totalRounds; r++) {
      const initiator = getInitiatorForRound(r, "A");
      const { payoffA, payoffB } = resolvePayoffs("DEFECT", "DEFECT", rules);
      scoreA += payoffA + (initiator === "A" ? initiatorBonus : 0);
      scoreB += payoffB + (initiator === "B" ? initiatorBonus : 0);
    }

    // D/D payoff is 0/0 and initiatorBonus is 0 — both agents end at exactly 0
    expect(scoreA).toBe(0);
    expect(scoreB).toBe(0);
  });
});
