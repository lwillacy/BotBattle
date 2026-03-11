/**
 * In-process match simulator. No HTTP calls, no DB.
 * Usage: ts-node src/simulate.ts <agentA> <agentB> <numMatches>
 * Example: ts-node src/simulate.ts trusting-agent tit-for-tat-agent 100
 *
 * Available agents: trusting-agent, opportunist-agent, tit-for-tat-agent
 */

import { Action, AgentDecisionPayload, GameRules, RoundHistoryEntry } from "@tari-agent-arena/shared";
import { trustDefectV1 } from "./engine/rules/trustDefectV1";
import { resolvePayoffs, getInitiatorForRound } from "./engine/resolver";

// --- Inline agent decision functions ---

type DecideFn = (payload: AgentDecisionPayload) => Action;

function trustingAgentDecide(payload: AgentDecisionPayload): Action {
  const history = payload.history;
  if (history.length < 2) return "TRUST";
  const last = history[history.length - 1];
  const secondLast = history[history.length - 2];
  if (last.opponentAction === "DEFECT" && secondLast.opponentAction === "DEFECT") {
    if (last.yourAction === "TRUST") return "DEFECT";
  }
  return "TRUST";
}

function opportunistAgentDecide(payload: AgentDecisionPayload): Action {
  const { roundNumber, totalRounds, score } = payload;
  if (roundNumber === totalRounds) return "DEFECT";
  if (roundNumber > 10 && score.you - score.opponent >= -2) return "DEFECT";
  return "TRUST";
}

function titForTatAgentDecide(payload: AgentDecisionPayload): Action {
  const { history } = payload;
  if (history.length === 0) return "TRUST";
  return history[history.length - 1].opponentAction;
}

const AGENTS: Record<string, DecideFn> = {
  "trusting-agent": trustingAgentDecide,
  "opportunist-agent": opportunistAgentDecide,
  "tit-for-tat-agent": titForTatAgentDecide,
};

// --- Simulation ---

interface MatchResult {
  winner: "A" | "B" | "tie";
  scoreA: number;
  scoreB: number;
  actionsA: Action[];
  actionsB: Action[];
  initialInitiator: "A" | "B";
}

function simulateMatch(
  decideFnA: DecideFn,
  decideFnB: DecideFn,
  rules: GameRules,
  initialInitiator: "A" | "B"
): MatchResult {
  let scoreA = 0;
  let scoreB = 0;
  const historyA: RoundHistoryEntry[] = [];
  const historyB: RoundHistoryEntry[] = [];
  const actionsA: Action[] = [];
  const actionsB: Action[] = [];

  for (let r = 1; r <= rules.totalRounds; r++) {
    const initiator = getInitiatorForRound(r, initialInitiator);
    const bonus = rules.initiatorBonus;

    // Agents see their score including this round's initiator bonus (per spec)
    const scoreAWithBonus = scoreA + (initiator === "A" ? bonus : 0);
    const scoreBWithBonus = scoreB + (initiator === "B" ? bonus : 0);

    const basePayload = {
      matchId: "sim",
      roundNumber: r,
      totalRounds: rules.totalRounds,
      initiator,
      initiatorBonus: bonus,
      decisionDeadlineMs: rules.decisionWindowMs,
      rulesVersion: rules.version,
    };

    const actionA = decideFnA({
      ...basePayload,
      youAre: "A",
      score: { you: scoreAWithBonus, opponent: scoreBWithBonus },
      history: historyA,
    });

    const actionB = decideFnB({
      ...basePayload,
      youAre: "B",
      score: { you: scoreBWithBonus, opponent: scoreAWithBonus },
      history: historyB,
    });

    actionsA.push(actionA);
    actionsB.push(actionB);

    const { payoffA, payoffB } = resolvePayoffs(actionA, actionB, rules);
    const finalPayoffA = payoffA + (initiator === "A" ? bonus : 0);
    const finalPayoffB = payoffB + (initiator === "B" ? bonus : 0);
    scoreA += finalPayoffA;
    scoreB += finalPayoffB;

    historyA.push({ roundNumber: r, yourAction: actionA, opponentAction: actionB, yourPayoff: finalPayoffA, opponentPayoff: finalPayoffB, initiator });
    historyB.push({ roundNumber: r, yourAction: actionB, opponentAction: actionA, yourPayoff: finalPayoffB, opponentPayoff: finalPayoffA, initiator });
  }

  const winner: "A" | "B" | "tie" = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "tie";
  return { winner, scoreA, scoreB, actionsA, actionsB, initialInitiator };
}

function runSimulation(agentNameA: string, agentNameB: string, numMatches: number): void {
  const decideFnA = AGENTS[agentNameA];
  const decideFnB = AGENTS[agentNameB];

  if (!decideFnA) {
    console.error(`Unknown agent: "${agentNameA}". Available: ${Object.keys(AGENTS).join(", ")}`);
    process.exit(1);
  }
  if (!decideFnB) {
    console.error(`Unknown agent: "${agentNameB}". Available: ${Object.keys(AGENTS).join(", ")}`);
    process.exit(1);
  }

  const rules = trustDefectV1;
  const results: MatchResult[] = [];

  for (let i = 0; i < numMatches; i++) {
    const initialInitiator: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
    results.push(simulateMatch(decideFnA, decideFnB, rules, initialInitiator));
  }

  // Aggregate stats
  let winsA = 0, winsB = 0, ties = 0;
  let totalScoreA = 0, totalScoreB = 0;
  let totalTrustA = 0, totalDefectA = 0;
  let totalTrustB = 0, totalDefectB = 0;
  let winsAInitiatedByA = 0, winsAInitiatedByB = 0;
  let matchesInitiatedByA = 0, matchesInitiatedByB = 0;

  for (const r of results) {
    if (r.winner === "A") winsA++;
    else if (r.winner === "B") winsB++;
    else ties++;

    totalScoreA += r.scoreA;
    totalScoreB += r.scoreB;

    for (const a of r.actionsA) { if (a === "TRUST") totalTrustA++; else totalDefectA++; }
    for (const a of r.actionsB) { if (a === "TRUST") totalTrustB++; else totalDefectB++; }

    if (r.initialInitiator === "A") {
      matchesInitiatedByA++;
      if (r.winner === "A") winsAInitiatedByA++;
    } else {
      matchesInitiatedByB++;
      if (r.winner === "A") winsAInitiatedByB++;
    }
  }

  const totalDecisionsA = numMatches * rules.totalRounds;
  const totalDecisionsB = numMatches * rules.totalRounds;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`SIMULATION: ${agentNameA} (A) vs ${agentNameB} (B)`);
  console.log(`Rules: ${rules.version} | Matches: ${numMatches}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`\nRESULTS`);
  console.log(`  ${agentNameA} wins:  ${winsA} (${pct(winsA, numMatches)}%)`);
  console.log(`  ${agentNameB} wins:  ${winsB} (${pct(winsB, numMatches)}%)`);
  console.log(`  Ties:              ${ties} (${pct(ties, numMatches)}%)`);
  console.log(`\nSCORES`);
  console.log(`  ${agentNameA} avg score: ${avg(totalScoreA, numMatches).toFixed(2)}`);
  console.log(`  ${agentNameB} avg score: ${avg(totalScoreB, numMatches).toFixed(2)}`);
  console.log(`\nACTION RATES`);
  console.log(`  ${agentNameA} trust rate:  ${pct(totalTrustA, totalDecisionsA)}%  defect rate: ${pct(totalDefectA, totalDecisionsA)}%`);
  console.log(`  ${agentNameB} trust rate:  ${pct(totalTrustB, totalDecisionsB)}%  defect rate: ${pct(totalDefectB, totalDecisionsB)}%`);
  console.log(`\nINITIATOR BIAS`);
  console.log(`  Matches where A was initial initiator: ${matchesInitiatedByA} — A won ${winsAInitiatedByA} (${pct(winsAInitiatedByA, matchesInitiatedByA || 1)}%)`);
  console.log(`  Matches where B was initial initiator: ${matchesInitiatedByB} — A won ${winsAInitiatedByB} (${pct(winsAInitiatedByB, matchesInitiatedByB || 1)}%)`);
  console.log(`${"=".repeat(60)}\n`);
}

function pct(n: number, total: number): string {
  return total === 0 ? "0.0" : ((n / total) * 100).toFixed(1);
}

function avg(sum: number, count: number): number {
  return count === 0 ? 0 : sum / count;
}

// --- Entry point ---

const [,, agentA, agentB, countArg] = process.argv;

if (!agentA || !agentB) {
  console.error("Usage: ts-node src/simulate.ts <agentA> <agentB> [numMatches]");
  console.error(`Available agents: ${Object.keys(AGENTS).join(", ")}`);
  process.exit(1);
}

const numMatches = parseInt(countArg ?? "100", 10);
if (isNaN(numMatches) || numMatches < 1) {
  console.error("numMatches must be a positive integer");
  process.exit(1);
}

runSimulation(agentA, agentB, numMatches);
