import { Router, Request, Response } from "express";
import prisma from "../db/prisma";
import { getRules, hashRules } from "../engine/rules/registry";
import { createStakeLockedEntries } from "../ledger/ledgerService";
import { runMatch } from "../engine/matchRunner";

const router = Router();

// GET /matches?limit=N&status=X
router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10), 100);
    const status = req.query.status as string | undefined;
    const matches = await prisma.match.findMany({
      where: status ? { status } : undefined,
      include: { agentA: true, agentB: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return res.json(matches);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /matches
router.post("/", async (req: Request, res: Response) => {
  try {
    const { agentAId, agentBId, stakePerAgent, rulesVersion } = req.body;

    if (!agentAId || !agentBId || stakePerAgent === undefined || !rulesVersion) {
      return res.status(400).json({
        error: "Missing required fields: agentAId, agentBId, stakePerAgent, rulesVersion",
      });
    }

    if (agentAId === agentBId) {
      return res.status(400).json({ error: "agentAId and agentBId must be different" });
    }

    // Validate agents exist and are active
    const [agentA, agentB] = await Promise.all([
      prisma.agent.findUnique({ where: { id: agentAId }, include: { owner: true } }),
      prisma.agent.findUnique({ where: { id: agentBId }, include: { owner: true } }),
    ]);

    if (!agentA) return res.status(404).json({ error: `Agent not found: ${agentAId}` });
    if (!agentB) return res.status(404).json({ error: `Agent not found: ${agentBId}` });

    if (agentA.status !== "active") {
      return res.status(400).json({ error: `Agent ${agentAId} is not active` });
    }
    if (agentB.status !== "active") {
      return res.status(400).json({ error: `Agent ${agentBId} is not active` });
    }

    const stake = parseFloat(stakePerAgent);

    // Validate stake fits min/max for both agents
    if (stake < agentA.minStake || stake > agentA.maxStake) {
      return res.status(400).json({
        error: `Stake ${stake} out of range for agentA [${agentA.minStake}, ${agentA.maxStake}]`,
      });
    }
    if (stake < agentB.minStake || stake > agentB.maxStake) {
      return res.status(400).json({
        error: `Stake ${stake} out of range for agentB [${agentB.minStake}, ${agentB.maxStake}]`,
      });
    }

    // Load rules
    let rules;
    try {
      rules = getRules(rulesVersion);
    } catch {
      return res.status(400).json({ error: `Unknown rules version: ${rulesVersion}` });
    }

    // Deep copy so stored snapshot is not a reference to the registry singleton
    const rulesSnapshot = JSON.parse(JSON.stringify(rules)) as object;
    const rulesHash = hashRules(rules);
    const prizePool = stake * 2;

    // Randomize initialInitiator
    const initialInitiator: "A" | "B" = Math.random() < 0.5 ? "A" : "B";

    const match = await prisma.match.create({
      data: {
        agentAId,
        agentBId,
        stakePerAgent: stake,
        prizePool,
        rulesVersion,
        rulesSnapshot,
        rulesHash,
        initialInitiator,
        status: "pending",
      },
    });

    // Create stake_locked LedgerEntries for both agents
    await createStakeLockedEntries(
      match.id,
      agentAId,
      agentBId,
      stake,
      agentA.ownerId,
      agentB.ownerId
    );

    return res.status(201).json(match);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /matches/:id/start
router.post("/:id/start", async (req: Request, res: Response) => {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.status !== "pending") {
      return res.status(400).json({ error: `Match is not in pending state: ${match.status}` });
    }

    // Run match synchronously (blocks until complete)
    await runMatch(match.id);

    const updatedMatch = await prisma.match.findUnique({
      where: { id: match.id },
      include: {
        agentA: true,
        agentB: true,
        rounds: { orderBy: { roundNumber: "asc" } },
      },
    });

    return res.json(updatedMatch);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error", details: String(err) });
  }
});

// GET /matches/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: {
        agentA: true,
        agentB: true,
      },
    });
    if (!match) return res.status(404).json({ error: "Match not found" });
    return res.json(match);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /matches/:id/rounds
router.get("/:id/rounds", async (req: Request, res: Response) => {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) return res.status(404).json({ error: "Match not found" });

    const rounds = await prisma.round.findMany({
      where: { matchId: req.params.id },
      include: {
        decisions: true,
      },
      orderBy: { roundNumber: "asc" },
    });

    return res.json(rounds);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
