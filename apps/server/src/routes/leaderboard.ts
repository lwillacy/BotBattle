import { Router, Request, Response } from "express";
import { getLeaderboard } from "../stats/statsService";
import prisma from "../db/prisma";

const router = Router();

// GET /leaderboard
router.get("/", async (_req: Request, res: Response) => {
  try {
    const stats = await getLeaderboard();

    // Enrich with agent names
    const agentIds = stats.map((s) => s.agentId);
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true, status: true },
    });
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    const result = stats.map((s) => ({
      ...s,
      agent: agentMap.get(s.agentId) ?? null,
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
