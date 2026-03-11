import { callAgent } from "../agents/agentCaller";
import { AgentDecisionPayload } from "@tari-agent-arena/shared";
import * as http from "http";

const fakePayload: AgentDecisionPayload = {
  matchId: "test-match",
  roundNumber: 1,
  totalRounds: 15,
  youAre: "A",
  initiator: "A",
  initiatorBonus: 2,
  decisionDeadlineMs: 200, // short deadline for test
  score: { you: 0, opponent: 0 },
  history: [],
  rulesVersion: "trust-defect-v1",
};

describe("agentCaller timeout behavior", () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    // Create a slow server that delays 500ms
    server = http.createServer((_req, res) => {
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ action: "TRUST" }));
      }, 500);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as { port: number };
        port = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("times out when agent is slow and uses default action", async () => {
    const result = await callAgent(
      "agent-id",
      "round-id",
      `http://127.0.0.1:${port}`,
      { ...fakePayload, decisionDeadlineMs: 100 },
      "DEFECT"
    );

    expect(result.decision.outcome).toBe("timeout");
    expect(result.action).toBe("DEFECT");
    expect(result.decision.timedOutAt).not.toBeNull();
    expect(result.decision.errorMessage).toContain("timed out");
  }, 2000);

  test("timeout uses TRUST as default when configured", async () => {
    const result = await callAgent(
      "agent-id",
      "round-id",
      `http://127.0.0.1:${port}`,
      { ...fakePayload, decisionDeadlineMs: 100 },
      "TRUST"
    );

    expect(result.decision.outcome).toBe("timeout");
    expect(result.action).toBe("TRUST");
  }, 2000);
});
