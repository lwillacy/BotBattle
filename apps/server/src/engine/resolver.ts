import { Action, GameRules } from "@tari-agent-arena/shared";

export interface PayoffResult {
  payoffA: number;
  payoffB: number;
}

export function resolvePayoffs(
  actionA: Action,
  actionB: Action,
  rules: GameRules
): PayoffResult {
  const { payoffs } = rules;

  if (actionA === "TRUST" && actionB === "TRUST") {
    return { payoffA: payoffs.trustTrust.a, payoffB: payoffs.trustTrust.b };
  }
  if (actionA === "TRUST" && actionB === "DEFECT") {
    return { payoffA: payoffs.trustDefect.a, payoffB: payoffs.trustDefect.b };
  }
  if (actionA === "DEFECT" && actionB === "TRUST") {
    return { payoffA: payoffs.defectTrust.a, payoffB: payoffs.defectTrust.b };
  }
  // DEFECT vs DEFECT
  return { payoffA: payoffs.defectDefect.a, payoffB: payoffs.defectDefect.b };
}

export function getInitiatorForRound(
  roundNumber: number,
  initialInitiator: "A" | "B"
): "A" | "B" {
  // Round 1 = initialInitiator, round 2 = opposite, alternating
  const isOdd = roundNumber % 2 === 1;
  if (isOdd) {
    return initialInitiator;
  } else {
    return initialInitiator === "A" ? "B" : "A";
  }
}
