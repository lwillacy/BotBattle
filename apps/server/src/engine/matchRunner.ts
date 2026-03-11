import { Action, AgentDecisionPayload, RoundHistoryEntry } from "@tari-agent-arena/shared";
import prisma from "../db/prisma";
import { getRules } from "./rules/registry";
import { resolvePayoffs, getInitiatorForRound } from "./resolver";
import { callAgent } from "../agents/agentCaller";
import {
  createRoundPayoffEntries,
  createPrizePayoutEntry,
  createStakeRefundEntries,
} from "../ledger/ledgerService";

export async function runMatch(matchId: string, options?: { delayBetweenRoundsMs?: number }): Promise<void> {
  // Load match with agents
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      agentA: { include: { owner: true } },
      agentB: { include: { owner: true } },
    },
  });

  if (!match) throw new Error(`Match not found: ${matchId}`);
  if (match.status !== "pending") {
    throw new Error(`Match ${matchId} is not in pending state: ${match.status}`);
  }

  const rules = getRules(match.rulesVersion);

  // Mark match active
  await prisma.match.update({
    where: { id: matchId },
    data: { status: "active", startedAt: new Date() },
  });

  let scoreA = 0;
  let scoreB = 0;
  const historyA: RoundHistoryEntry[] = [];
  const historyB: RoundHistoryEntry[] = [];

  try {
    for (let roundNumber = 1; roundNumber <= rules.totalRounds; roundNumber++) {
      const initiator = getInitiatorForRound(
        roundNumber,
        match.initialInitiator as "A" | "B"
      );
      const initiatorBonus = rules.initiatorBonus;

      const now = new Date();
      const decisionDeadlineAt = new Date(
        now.getTime() + rules.decisionWindowMs
      );

      // Create Round record
      const round = await prisma.round.create({
        data: {
          matchId,
          roundNumber,
          initiator,
          initiatorBonus,
          startedAt: now,
          decisionDeadlineAt,
        },
      });

      // Scores passed to agents reflect the current cumulative totals.
      // initiatorBonus is 0 in trust-defect-v1; kept for forward compatibility.
      const scoreAWithBonus = scoreA + (initiator === "A" ? initiatorBonus : 0);
      const scoreBWithBonus = scoreB + (initiator === "B" ? initiatorBonus : 0);

      // Build payloads
      const payloadA: AgentDecisionPayload = {
        matchId,
        roundNumber,
        totalRounds: rules.totalRounds,
        youAre: "A",
        initiator,
        initiatorBonus,
        decisionDeadlineMs: rules.decisionWindowMs,
        score: { you: scoreAWithBonus, opponent: scoreBWithBonus },
        history: historyA,
        rulesVersion: rules.version,
      };

      const payloadB: AgentDecisionPayload = {
        matchId,
        roundNumber,
        totalRounds: rules.totalRounds,
        youAre: "B",
        initiator,
        initiatorBonus,
        decisionDeadlineMs: rules.decisionWindowMs,
        score: { you: scoreBWithBonus, opponent: scoreAWithBonus },
        history: historyB,
        rulesVersion: rules.version,
      };

      const defaultActionA = (match.agentA.defaultActionOnTimeout as Action) ?? rules.defaultActionOnTimeout;
      const defaultActionB = (match.agentB.defaultActionOnTimeout as Action) ?? rules.defaultActionOnTimeout;

      const endpointA = match.agentA.endpointUrl ?? "";
      const endpointB = match.agentB.endpointUrl ?? "";

      // Call both agents concurrently
      const [resultA, resultB] = await Promise.all([
        endpointA
          ? callAgent(match.agentAId, round.id, endpointA, payloadA, defaultActionA)
          : fallbackResult(match.agentAId, round.id, rules.decisionWindowMs, defaultActionA),
        endpointB
          ? callAgent(match.agentBId, round.id, endpointB, payloadB, defaultActionB)
          : fallbackResult(match.agentBId, round.id, rules.decisionWindowMs, defaultActionB),
      ]);

      const actionA = resultA.action;
      const actionB = resultB.action;

      // Resolve payoffs
      const { payoffA, payoffB } = resolvePayoffs(actionA, actionB, rules);

      // Add initiator bonus to initiator's payoff
      const finalPayoffA = payoffA + (initiator === "A" ? initiatorBonus : 0);
      const finalPayoffB = payoffB + (initiator === "B" ? initiatorBonus : 0);

      scoreA += finalPayoffA;
      scoreB += finalPayoffB;

      // Update round
      await prisma.round.update({
        where: { id: round.id },
        data: {
          actionA,
          actionB,
          actionSourceA: resultA.decision.outcome === "timeout" ? "timeout_default" : "submitted",
          actionSourceB: resultB.decision.outcome === "timeout" ? "timeout_default" : "submitted",
          payoffA: finalPayoffA,
          payoffB: finalPayoffB,
          scoreAAfter: scoreA,
          scoreBAfter: scoreB,
          resolvedAt: new Date(),
        },
      });

      // Update match current round and scores
      await prisma.match.update({
        where: { id: matchId },
        data: {
          currentRoundNumber: roundNumber,
          scoreA,
          scoreB,
        },
      });

      // Create round payoff ledger entries
      await createRoundPayoffEntries(
        matchId,
        round.id,
        match.agentAId,
        match.agentBId,
        match.agentA.ownerId,
        match.agentB.ownerId,
        finalPayoffA,
        finalPayoffB
      );

      // Persist RoundDecision records
      await Promise.all([
        prisma.roundDecision.create({
          data: {
            roundId: round.id,
            agentId: match.agentAId,
            requestPreparedAt: resultA.decision.requestPreparedAt,
            requestSentAt: resultA.decision.requestSentAt,
            responseReceivedAt: resultA.decision.responseReceivedAt,
            timedOutAt: resultA.decision.timedOutAt,
            latencyMs: resultA.decision.latencyMs,
            deadlineMs: resultA.decision.deadlineMs,
            action: resultA.decision.action,
            rawRequest: resultA.decision.rawRequest ?? undefined,
            rawResponse: resultA.decision.rawResponse ?? undefined,
            outcome: resultA.decision.outcome,
            errorMessage: resultA.decision.errorMessage,
          },
        }),
        prisma.roundDecision.create({
          data: {
            roundId: round.id,
            agentId: match.agentBId,
            requestPreparedAt: resultB.decision.requestPreparedAt,
            requestSentAt: resultB.decision.requestSentAt,
            responseReceivedAt: resultB.decision.responseReceivedAt,
            timedOutAt: resultB.decision.timedOutAt,
            latencyMs: resultB.decision.latencyMs,
            deadlineMs: resultB.decision.deadlineMs,
            action: resultB.decision.action,
            rawRequest: resultB.decision.rawRequest ?? undefined,
            rawResponse: resultB.decision.rawResponse ?? undefined,
            outcome: resultB.decision.outcome,
            errorMessage: resultB.decision.errorMessage,
          },
        }),
      ]);

      // Update history for next round
      historyA.push({
        roundNumber,
        yourAction: actionA,
        opponentAction: actionB,
        yourPayoff: finalPayoffA,
        opponentPayoff: finalPayoffB,
        initiator,
      });

      historyB.push({
        roundNumber,
        yourAction: actionB,
        opponentAction: actionA,
        yourPayoff: finalPayoffB,
        opponentPayoff: finalPayoffA,
        initiator,
      });

      if (options?.delayBetweenRoundsMs && roundNumber < rules.totalRounds) {
        await new Promise((resolve) => setTimeout(resolve, options.delayBetweenRoundsMs));
      }
    }

    // Determine winner
    let winnerAgentId: string | null = null;
    if (scoreA > scoreB) {
      winnerAgentId = match.agentAId;
    } else if (scoreB > scoreA) {
      winnerAgentId = match.agentBId;
    }
    // tie: no winner

    if (winnerAgentId) {
      const winnerOwnerId =
        winnerAgentId === match.agentAId
          ? match.agentA.ownerId
          : match.agentB.ownerId;
      await createPrizePayoutEntry(
        matchId,
        winnerAgentId,
        winnerOwnerId,
        match.prizePool
      );
    } else {
      // Tie: refund both stakes
      await createStakeRefundEntries(
        matchId,
        match.agentAId,
        match.agentBId,
        match.agentA.ownerId,
        match.agentB.ownerId,
        match.stakePerAgent
      );
    }

    // Mark match completed
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: "completed",
        completedAt: new Date(),
        winnerAgentId,
        scoreA,
        scoreB,
      },
    });
  } catch (err) {
    // On error, mark match cancelled
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "cancelled" },
    }).catch(() => {});
    throw err;
  }
}

function fallbackResult(
  agentId: string,
  roundId: string,
  deadlineMs: number,
  defaultAction: Action
) {
  return Promise.resolve({
    decision: {
      agentId,
      roundId,
      requestPreparedAt: null,
      requestSentAt: null,
      responseReceivedAt: null,
      timedOutAt: null,
      latencyMs: null,
      deadlineMs,
      action: defaultAction,
      rawRequest: null,
      rawResponse: null,
      outcome: "timeout" as const,
      errorMessage: "No endpoint configured",
    },
    action: defaultAction,
  });
}
