import { GameRules } from "@tari-agent-arena/shared";

export const trustDefectV1: GameRules = {
  version: "trust-defect-v1",
  totalRounds: 15,
  decisionWindowMs: 1000,
  roundDurationMs: 3000,
  initiatorBonus: 2,
  payoffs: {
    trustTrust: { a: 3, b: 3 },
    trustDefect: { a: -4, b: 5 },
    defectTrust: { a: 5, b: -4 },
    defectDefect: { a: 1, b: 1 },
  },
  defaultActionOnTimeout: "DEFECT",
};
