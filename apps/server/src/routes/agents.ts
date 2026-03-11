import { Router, Request, Response } from "express";
import prisma from "../db/prisma";
import { getAgentStats } from "../stats/statsService";
import { callAgent } from "../agents/agentCaller";
import { AgentDecisionPayload } from "@tari-agent-arena/shared";

const router = Router();

// POST /agents
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      ownerId,
      name,
      endpointUrl,
      minStake,
      maxStake,
      status = "pending",
      defaultActionOnTimeout = "DEFECT",
    } = req.body;

    if (!ownerId || !name || minStake === undefined || maxStake === undefined) {
      return res.status(400).json({ error: "Missing required fields: ownerId, name, minStake, maxStake" });
    }

    const owner = await prisma.agentOwner.findUnique({ where: { id: ownerId } });
    if (!owner) {
      return res.status(404).json({ error: `AgentOwner not found: ${ownerId}` });
    }

    const agent = await prisma.agent.create({
      data: {
        ownerId,
        name,
        endpointUrl: endpointUrl ?? null,
        minStake: parseFloat(minStake),
        maxStake: parseFloat(maxStake),
        status,
        defaultActionOnTimeout,
      },
    });

    return res.status(201).json(agent);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /agents
router.get("/", async (_req: Request, res: Response) => {
  try {
    const agents = await prisma.agent.findMany({
      include: { owner: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(agents);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /agents/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      include: { owner: true },
    });
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }
    const stats = await getAgentStats(agent.id);
    return res.json({ ...agent, stats });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /agents/:id/validate
router.post("/:id/validate", async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }
    if (!agent.endpointUrl) {
      return res.status(400).json({ error: "Agent has no endpoint URL" });
    }

    const fakePayload: AgentDecisionPayload = {
      matchId: "validation-test",
      roundNumber: 1,
      totalRounds: 15,
      youAre: "A",
      initiator: "A",
      initiatorBonus: 2,
      decisionDeadlineMs: 2000,
      score: { you: 0, opponent: 0 },
      history: [],
      rulesVersion: "trust-defect-v1",
    };

    const start = Date.now();
    const result = await callAgent(
      agent.id,
      "validation",
      agent.endpointUrl,
      fakePayload,
      "DEFECT"
    );
    const latencyMs = Date.now() - start;

    if (result.decision.outcome === "submitted") {
      return res.json({ valid: true, latencyMs, action: result.action });
    } else {
      return res.json({
        valid: false,
        latencyMs,
        error: result.decision.errorMessage ?? result.decision.outcome,
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
