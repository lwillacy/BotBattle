/**
 * Demo routes: create and run a match between built-in in-process agents.
 * These routes work regardless of DEMO_MODE; the agents use demo:// URLs
 * which are dispatched in-process by agentCaller.
 */
import { Router, Request, Response } from "express";
import prisma from "../db/prisma";
import { getRules, hashRules } from "../engine/rules/registry";
import { runMatch } from "../engine/matchRunner";
import { createStakeLockedEntries } from "../ledger/ledgerService";

const router = Router();

const DEMO_AGENT_DEFS = [
  {
    endpointUrl: "demo://trusting",
    name: "Trusting Agent",
    metadata: { description: "Trusts unless betrayed twice in a row", strategy: "trusting" },
  },
  {
    endpointUrl: "demo://opportunist",
    name: "Opportunist Agent",
    metadata: { description: "Trusts early, defects late", strategy: "opportunist" },
  },
  {
    endpointUrl: "demo://tit-for-tat",
    name: "Tit-for-Tat Agent",
    metadata: { description: "Mirrors the opponent's previous action", strategy: "tit-for-tat" },
  },
] as const;

const DEMO_OWNER_DISPLAY_NAME = "Demo";
const DEMO_STAKE = 10;
const RULES_VERSION = "trust-defect-v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureDemoOwner() {
  const existing = await prisma.agentOwner.findFirst({
    where: { displayName: DEMO_OWNER_DISPLAY_NAME },
  });
  if (existing) return existing;
  return prisma.agentOwner.create({
    data: { displayName: DEMO_OWNER_DISPLAY_NAME },
  });
}

async function ensureDemoAgents() {
  const urls = DEMO_AGENT_DEFS.map((d) => d.endpointUrl);
  const existing = await prisma.agent.findMany({
    where: { endpointUrl: { in: [...urls] } },
  });

  if (existing.length === DEMO_AGENT_DEFS.length) return existing;

  const owner = await ensureDemoOwner();
  const existingUrls = new Set(existing.map((a) => a.endpointUrl));

  for (const def of DEMO_AGENT_DEFS) {
    if (!existingUrls.has(def.endpointUrl)) {
      await prisma.agent.create({
        data: {
          ownerId: owner.id,
          name: def.name,
          endpointUrl: def.endpointUrl,
          status: "active",
          minStake: 1,
          maxStake: 1000,
          defaultActionOnTimeout: "DEFECT",
          metadata: def.metadata as object,
        },
      });
    }
  }

  return prisma.agent.findMany({
    where: { endpointUrl: { in: [...urls] } },
  });
}

// ── POST /demo/run ────────────────────────────────────────────────────────────
// Ensure demo agents exist, create a match between two of them, run it,
// and return the matchId. With in-process agents this completes in < 1 second.

router.post("/run", async (_req: Request, res: Response) => {
  try {
    const agents = await ensureDemoAgents();
    if (agents.length < 2) {
      return res.status(500).json({ error: "Could not ensure demo agents" });
    }

    // Shuffle and pick two different agents for variety
    const shuffled = [...agents].sort(() => Math.random() - 0.5);
    const agentA = shuffled[0];
    const agentB = shuffled[1];

    const rules = getRules(RULES_VERSION);
    const rulesSnapshot = JSON.parse(JSON.stringify(rules)) as object;
    const rulesHash = hashRules(rules);
    const initialInitiator: "A" | "B" = Math.random() < 0.5 ? "A" : "B";

    const match = await prisma.match.create({
      data: {
        agentAId: agentA.id,
        agentBId: agentB.id,
        stakePerAgent: DEMO_STAKE,
        prizePool: DEMO_STAKE * 2,
        rulesVersion: RULES_VERSION,
        rulesSnapshot,
        rulesHash,
        initialInitiator,
        status: "pending",
      },
    });

    await createStakeLockedEntries(
      match.id,
      agentA.id,
      agentB.id,
      DEMO_STAKE,
      agentA.ownerId,
      agentB.ownerId
    );

    // Run synchronously — in-process agents complete in milliseconds
    await runMatch(match.id);

    return res.json({ matchId: match.id });
  } catch (err) {
    console.error("[demo/run]", err);
    return res.status(500).json({ error: String(err) });
  }
});

// ── POST /demo/reset ──────────────────────────────────────────────────────────
// Delete all demo-owned data and recreate the three demo agents from scratch.

router.post("/reset", async (_req: Request, res: Response) => {
  try {
    const urls = DEMO_AGENT_DEFS.map((d) => d.endpointUrl);

    const demoAgents = await prisma.agent.findMany({
      where: { endpointUrl: { in: [...urls] } },
    });
    const demoAgentIds = demoAgents.map((a) => a.id);
    const demoOwnerIds = [...new Set(demoAgents.map((a) => a.ownerId))];

    // Find all matches involving demo agents
    const demoMatches = await prisma.match.findMany({
      where: {
        OR: [
          { agentAId: { in: demoAgentIds } },
          { agentBId: { in: demoAgentIds } },
        ],
      },
      select: { id: true },
    });
    const demoMatchIds = demoMatches.map((m) => m.id);

    // Delete in dependency order
    if (demoMatchIds.length > 0) {
      await prisma.ledgerEntry.deleteMany({
        where: { matchId: { in: demoMatchIds } },
      });
      await prisma.roundDecision.deleteMany({
        where: { round: { matchId: { in: demoMatchIds } } },
      });
      await prisma.round.deleteMany({
        where: { matchId: { in: demoMatchIds } },
      });
      await prisma.match.deleteMany({
        where: { id: { in: demoMatchIds } },
      });
    }

    if (demoAgentIds.length > 0) {
      await prisma.ledgerEntry.deleteMany({
        where: { agentId: { in: demoAgentIds } },
      });
      await prisma.agent.deleteMany({
        where: { id: { in: demoAgentIds } },
      });
    }

    if (demoOwnerIds.length > 0) {
      await prisma.agentOwner.deleteMany({
        where: { id: { in: demoOwnerIds } },
      });
    }

    // Recreate
    await ensureDemoAgents();

    return res.json({ ok: true, message: "Demo data reset successfully" });
  } catch (err) {
    console.error("[demo/reset]", err);
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
