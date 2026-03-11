import prisma from "../db/prisma";

export interface AgentStats {
  agentId: string;
  matchesPlayed: number;
  matchesWon: number;
  totalProfit: number;
  trustRate: number;
  defectRate: number;
  avgLatencyMs: number | null;
  timeoutRate: number;
}

export async function getAgentStats(agentId: string): Promise<AgentStats> {
  // Count matches played
  const matchesPlayedCount = await prisma.match.count({
    where: {
      OR: [{ agentAId: agentId }, { agentBId: agentId }],
      status: "completed",
    },
  });

  // Count matches won
  const matchesWonCount = await prisma.match.count({
    where: {
      winnerAgentId: agentId,
    },
  });

  // Total profit from ledger entries
  const profitResult = await prisma.ledgerEntry.aggregate({
    where: { agentId },
    _sum: { amount: true },
  });
  const totalProfit = profitResult._sum.amount ?? 0;

  // Round decisions for action rates and latency
  const decisions = await prisma.roundDecision.findMany({
    where: { agentId },
    select: {
      action: true,
      latencyMs: true,
      outcome: true,
    },
  });

  const totalDecisions = decisions.length;
  const trustCount = decisions.filter((d) => d.action === "TRUST").length;
  const defectCount = decisions.filter((d) => d.action === "DEFECT").length;
  const timeoutCount = decisions.filter((d) => d.outcome === "timeout").length;

  const trustRate =
    totalDecisions > 0 ? trustCount / totalDecisions : 0;
  const defectRate =
    totalDecisions > 0 ? defectCount / totalDecisions : 0;
  const timeoutRate =
    totalDecisions > 0 ? timeoutCount / totalDecisions : 0;

  const latencies = decisions
    .filter((d) => d.latencyMs !== null)
    .map((d) => d.latencyMs as number);
  const avgLatencyMs =
    latencies.length > 0
      ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
      : null;

  return {
    agentId,
    matchesPlayed: matchesPlayedCount,
    matchesWon: matchesWonCount,
    totalProfit,
    trustRate,
    defectRate,
    avgLatencyMs,
    timeoutRate,
  };
}

export async function getLeaderboard(): Promise<AgentStats[]> {
  const agents = await prisma.agent.findMany({
    where: { status: "active" },
    select: { id: true },
  });

  const stats = await Promise.all(
    agents.map((a) => getAgentStats(a.id))
  );

  return stats.sort((a, b) => {
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    return b.totalProfit - a.totalProfit;
  });
}
