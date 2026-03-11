/**
 * In-process agent decision functions used when DEMO_MODE is active.
 * These mirror the logic in packages/sample-agents without the HTTP server layer.
 * Dispatched when an agent's endpointUrl matches "demo://<strategy>".
 */
import { AgentDecisionPayload, Action } from "@tari-agent-arena/shared";

// ─── Trusting Agent ───────────────────────────────────────────────────────────
// Trust every round unless opponent betrayed twice in a row, then defect once.

function trustingDecide(payload: AgentDecisionPayload): Action {
  const history = payload.history;
  if (history.length < 2) return "TRUST";

  const last = history[history.length - 1];
  const secondLast = history[history.length - 2];

  if (last.opponentAction === "DEFECT" && secondLast.opponentAction === "DEFECT") {
    if (last.yourAction === "TRUST") return "DEFECT"; // retaliate once
  }
  return "TRUST";
}

// ─── Opportunist Agent ────────────────────────────────────────────────────────
// Trust early (rounds 1-10), defect late when score diff >= -2, always defect last.

function opportunistDecide(payload: AgentDecisionPayload): Action {
  const { roundNumber, totalRounds, score } = payload;
  if (roundNumber === totalRounds) return "DEFECT";
  if (roundNumber > 10 && score.you - score.opponent >= -2) return "DEFECT";
  return "TRUST";
}

// ─── Tit-for-Tat Agent ────────────────────────────────────────────────────────
// Trust first round, mirror opponent's previous action thereafter.

function titForTatDecide(payload: AgentDecisionPayload): Action {
  const { history } = payload;
  if (history.length === 0) return "TRUST";
  return history[history.length - 1].opponentAction;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const REGISTRY: Record<string, (payload: AgentDecisionPayload) => Action> = {
  "demo://trusting": trustingDecide,
  "demo://opportunist": opportunistDecide,
  "demo://tit-for-tat": titForTatDecide,
};

export function isInProcessAgent(endpointUrl: string): boolean {
  return endpointUrl.startsWith("demo://");
}

export function callInProcessAgent(
  endpointUrl: string,
  payload: AgentDecisionPayload
): Action {
  const fn = REGISTRY[endpointUrl];
  if (!fn) {
    throw new Error(`Unknown in-process agent URL: ${endpointUrl}`);
  }
  return fn(payload);
}
