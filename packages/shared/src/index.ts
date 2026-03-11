export type Action = "TRUST" | "DEFECT";
export type MatchStatus = "pending" | "active" | "completed" | "cancelled";
export type AgentStatus = "active" | "disabled" | "pending";
export type DecisionOutcome = "submitted" | "timeout" | "error" | "invalid_response";
export type LedgerEntryType =
  | "stake_locked"
  | "stake_refunded"
  | "initiator_bonus"
  | "round_payoff"
  | "prize_payout";

export interface GameRules {
  version: string;
  totalRounds: number;
  decisionWindowMs: number;
  roundDurationMs: number;
  initiatorBonus: number;
  payoffs: {
    trustTrust: { a: number; b: number };
    trustDefect: { a: number; b: number };
    defectTrust: { a: number; b: number };
    defectDefect: { a: number; b: number };
  };
  defaultActionOnTimeout: Action;
}

export interface AgentDecisionPayload {
  matchId: string;
  roundNumber: number;
  totalRounds: number;
  youAre: "A" | "B";
  initiator: "A" | "B";
  initiatorBonus: number;
  decisionDeadlineMs: number;
  score: { you: number; opponent: number };
  history: RoundHistoryEntry[];
  rulesVersion: string;
}

export interface RoundHistoryEntry {
  roundNumber: number;
  yourAction: Action;
  opponentAction: Action;
  yourPayoff: number;
  opponentPayoff: number;
  initiator: "A" | "B";
}

export interface AgentDecisionResponse {
  action: Action;
}
