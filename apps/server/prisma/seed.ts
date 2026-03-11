import { PrismaClient } from "@prisma/client";
import { getRules, hashRules } from "../src/engine/rules/registry";
import { resolvePayoffs, getInitiatorForRound } from "../src/engine/resolver";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.ledgerEntry.deleteMany();
  await prisma.roundDecision.deleteMany();
  await prisma.round.deleteMany();
  await prisma.match.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.agentOwner.deleteMany();

  // Create 3 AgentOwners
  const ownerAlice = await prisma.agentOwner.create({
    data: {
      displayName: "Alice",
      walletAddress: "tari1alice000000000000000000000000000000000",
    },
  });

  const ownerBob = await prisma.agentOwner.create({
    data: {
      displayName: "Bob",
      walletAddress: "tari1bob0000000000000000000000000000000000",
    },
  });

  const ownerCarol = await prisma.agentOwner.create({
    data: {
      displayName: "Carol",
      walletAddress: "tari1carol00000000000000000000000000000000",
    },
  });

  console.log("Created owners:", ownerAlice.id, ownerBob.id, ownerCarol.id);

  // Create 3 Agents pointing to local sample agent endpoints
  const agentTrusting = await prisma.agent.create({
    data: {
      ownerId: ownerAlice.id,
      name: "Trusting Agent",
      endpointUrl: "http://localhost:3101/decision",
      status: "active",
      minStake: 1.0,
      maxStake: 100.0,
      defaultActionOnTimeout: "DEFECT",
      metadata: {
        description: "Trusts unless betrayed twice in a row",
        strategy: "trusting",
      },
    },
  });

  const agentOpportunist = await prisma.agent.create({
    data: {
      ownerId: ownerBob.id,
      name: "Opportunist Agent",
      endpointUrl: "http://localhost:3102/decision",
      status: "active",
      minStake: 1.0,
      maxStake: 100.0,
      defaultActionOnTimeout: "DEFECT",
      metadata: {
        description: "Trusts early, defects late",
        strategy: "opportunist",
      },
    },
  });

  const agentTitForTat = await prisma.agent.create({
    data: {
      ownerId: ownerCarol.id,
      name: "Tit-for-Tat Agent",
      endpointUrl: "http://localhost:3103/decision",
      status: "active",
      minStake: 1.0,
      maxStake: 100.0,
      defaultActionOnTimeout: "DEFECT",
      metadata: {
        description: "Mirrors opponent's previous action",
        strategy: "tit-for-tat",
      },
    },
  });

  console.log("Created agents:", agentTrusting.id, agentOpportunist.id, agentTitForTat.id);

  // Create 2 completed matches with hardcoded round data
  const rules = getRules("trust-defect-v1");
  const rulesHash = hashRules(rules);
  const rulesSnapshot = rules as unknown as object;

  // Match 1: Trusting vs Opportunist
  // We'll simulate a match where Trusting trusts all, Opportunist defects late
  await createSimulatedMatch({
    agentAId: agentTrusting.id,
    agentBId: agentOpportunist.id,
    ownerAId: ownerAlice.id,
    ownerBId: ownerBob.id,
    stakePerAgent: 10.0,
    rulesHash,
    rulesSnapshot,
    initialInitiator: "A",
    // Trusting always TRUST, Opportunist: TRUST rounds 1-10, DEFECT rounds 11-15
    actionsA: Array(15).fill("TRUST") as Array<"TRUST" | "DEFECT">,
    actionsB: [
      ...Array(10).fill("TRUST"),
      ...Array(5).fill("DEFECT"),
    ] as Array<"TRUST" | "DEFECT">,
  });

  // Match 2: Tit-for-Tat vs Opportunist
  // Tit-for-tat mirrors, so after opportunist defects, tit-for-tat will defect
  const titForTatActionsVsOpportunist: Array<"TRUST" | "DEFECT"> = [];
  const opportunistActionsVsTitForTat: Array<"TRUST" | "DEFECT"> = [];
  for (let r = 1; r <= 15; r++) {
    const oppAction: "TRUST" | "DEFECT" = r <= 10 ? "TRUST" : "DEFECT";
    opportunistActionsVsTitForTat.push(oppAction);
    if (r === 1) {
      titForTatActionsVsOpportunist.push("TRUST");
    } else {
      titForTatActionsVsOpportunist.push(
        opportunistActionsVsTitForTat[r - 2]
      );
    }
  }

  await createSimulatedMatch({
    agentAId: agentTitForTat.id,
    agentBId: agentOpportunist.id,
    ownerAId: ownerCarol.id,
    ownerBId: ownerBob.id,
    stakePerAgent: 5.0,
    rulesHash,
    rulesSnapshot,
    initialInitiator: "B",
    actionsA: titForTatActionsVsOpportunist,
    actionsB: opportunistActionsVsTitForTat,
  });

  console.log("Seeding complete!");
}

interface SimulatedMatchParams {
  agentAId: string;
  agentBId: string;
  ownerAId: string;
  ownerBId: string;
  stakePerAgent: number;
  rulesHash: string;
  rulesSnapshot: object;
  initialInitiator: "A" | "B";
  actionsA: Array<"TRUST" | "DEFECT">;
  actionsB: Array<"TRUST" | "DEFECT">;
}

async function createSimulatedMatch(params: SimulatedMatchParams) {
  const rules = getRules("trust-defect-v1");
  const prizePool = params.stakePerAgent * 2;
  const startedAt = new Date(Date.now() - 1000 * 60 * 5); // 5 minutes ago

  const match = await prisma.match.create({
    data: {
      agentAId: params.agentAId,
      agentBId: params.agentBId,
      stakePerAgent: params.stakePerAgent,
      prizePool,
      rulesVersion: "trust-defect-v1",
      rulesSnapshot: params.rulesSnapshot,
      rulesHash: params.rulesHash,
      initialInitiator: params.initialInitiator,
      status: "active",
      startedAt,
    },
  });

  // Stake locked entries
  await prisma.ledgerEntry.createMany({
    data: [
      {
        ownerId: params.ownerAId,
        agentId: params.agentAId,
        matchId: match.id,
        type: "stake_locked",
        amount: -params.stakePerAgent,
        assetSymbol: "TARI",
      },
      {
        ownerId: params.ownerBId,
        agentId: params.agentBId,
        matchId: match.id,
        type: "stake_locked",
        amount: -params.stakePerAgent,
        assetSymbol: "TARI",
      },
    ],
  });

  let scoreA = 0;
  let scoreB = 0;

  for (let r = 1; r <= rules.totalRounds; r++) {
    const initiator = getInitiatorForRound(r, params.initialInitiator);
    const initiatorBonus = rules.initiatorBonus;
    const actionA = params.actionsA[r - 1];
    const actionB = params.actionsB[r - 1];
    const { payoffA, payoffB } = resolvePayoffs(actionA, actionB, rules);
    const finalPayoffA = payoffA + (initiator === "A" ? initiatorBonus : 0);
    const finalPayoffB = payoffB + (initiator === "B" ? initiatorBonus : 0);
    scoreA += finalPayoffA;
    scoreB += finalPayoffB;

    const roundStartedAt = new Date(startedAt.getTime() + r * 3000);
    const decisionDeadlineAt = new Date(roundStartedAt.getTime() + rules.decisionWindowMs);
    const resolvedAt = new Date(roundStartedAt.getTime() + 500);

    const round = await prisma.round.create({
      data: {
        matchId: match.id,
        roundNumber: r,
        initiator,
        initiatorBonus,
        actionA,
        actionB,
        actionSourceA: "submitted",
        actionSourceB: "submitted",
        payoffA: finalPayoffA,
        payoffB: finalPayoffB,
        scoreAAfter: scoreA,
        scoreBAfter: scoreB,
        startedAt: roundStartedAt,
        decisionDeadlineAt,
        resolvedAt,
      },
    });

    // Initiator bonus ledger entry — only create if bonus is non-zero
    if (initiatorBonus > 0) {
      const initiatorAgentId = initiator === "A" ? params.agentAId : params.agentBId;
      const initiatorOwnerId = initiator === "A" ? params.ownerAId : params.ownerBId;
      await prisma.ledgerEntry.create({
        data: {
          ownerId: initiatorOwnerId,
          agentId: initiatorAgentId,
          matchId: match.id,
          roundId: round.id,
          type: "initiator_bonus",
          amount: initiatorBonus,
          assetSymbol: "TARI",
        },
      });
    }

    // Round payoff entries
    await prisma.ledgerEntry.createMany({
      data: [
        {
          ownerId: params.ownerAId,
          agentId: params.agentAId,
          matchId: match.id,
          roundId: round.id,
          type: "round_payoff",
          amount: finalPayoffA,
          assetSymbol: "TARI",
        },
        {
          ownerId: params.ownerBId,
          agentId: params.agentBId,
          matchId: match.id,
          roundId: round.id,
          type: "round_payoff",
          amount: finalPayoffB,
          assetSymbol: "TARI",
        },
      ],
    });

    // Round decisions
    await prisma.roundDecision.createMany({
      data: [
        {
          roundId: round.id,
          agentId: params.agentAId,
          deadlineMs: rules.decisionWindowMs,
          action: actionA,
          outcome: "submitted",
          latencyMs: Math.floor(Math.random() * 200) + 50,
          requestSentAt: roundStartedAt,
          responseReceivedAt: new Date(roundStartedAt.getTime() + 100),
        },
        {
          roundId: round.id,
          agentId: params.agentBId,
          deadlineMs: rules.decisionWindowMs,
          action: actionB,
          outcome: "submitted",
          latencyMs: Math.floor(Math.random() * 200) + 50,
          requestSentAt: roundStartedAt,
          responseReceivedAt: new Date(roundStartedAt.getTime() + 100),
        },
      ],
    });
  }

  // Determine winner
  let winnerAgentId: string | null = null;
  let winnerOwnerId: string | null = null;
  if (scoreA > scoreB) {
    winnerAgentId = params.agentAId;
    winnerOwnerId = params.ownerAId;
  } else if (scoreB > scoreA) {
    winnerAgentId = params.agentBId;
    winnerOwnerId = params.ownerBId;
  }

  if (winnerAgentId && winnerOwnerId) {
    await prisma.ledgerEntry.create({
      data: {
        ownerId: winnerOwnerId,
        agentId: winnerAgentId,
        matchId: match.id,
        type: "prize_payout",
        amount: prizePool,
        assetSymbol: "TARI",
      },
    });
  } else {
    // Tie refund
    await prisma.ledgerEntry.createMany({
      data: [
        {
          ownerId: params.ownerAId,
          agentId: params.agentAId,
          matchId: match.id,
          type: "stake_refunded",
          amount: params.stakePerAgent,
          assetSymbol: "TARI",
        },
        {
          ownerId: params.ownerBId,
          agentId: params.agentBId,
          matchId: match.id,
          type: "stake_refunded",
          amount: params.stakePerAgent,
          assetSymbol: "TARI",
        },
      ],
    });
  }

  await prisma.match.update({
    where: { id: match.id },
    data: {
      status: "completed",
      completedAt: new Date(),
      winnerAgentId,
      currentRoundNumber: rules.totalRounds,
      scoreA,
      scoreB,
    },
  });

  console.log(
    `Match ${match.id}: scoreA=${scoreA} scoreB=${scoreB} winner=${winnerAgentId ?? "tie"}`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
