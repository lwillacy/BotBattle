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
  decisionDeadlineMs: 2000,
  score: { you: 0, opponent: 0 },
  history: [],
  rulesVersion: "trust-defect-v1",
};

function createServerWithResponse(responseBody: string, contentType = "application/json") {
  return new Promise<{ server: http.Server; port: number }>((resolve) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(responseBody);
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({ server, port: addr.port });
    });
  });
}

describe("agentCaller invalid response handling", () => {
  test("handles invalid JSON response", async () => {
    const { server, port } = await createServerWithResponse("not valid json", "text/plain");
    try {
      const result = await callAgent(
        "agent-id",
        "round-id",
        `http://127.0.0.1:${port}`,
        fakePayload,
        "DEFECT"
      );
      expect(result.decision.outcome).toBe("invalid_response");
      expect(result.action).toBe("DEFECT");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test("handles valid JSON but wrong action value", async () => {
    const { server, port } = await createServerWithResponse(
      JSON.stringify({ action: "COOPERATE" })
    );
    try {
      const result = await callAgent(
        "agent-id",
        "round-id",
        `http://127.0.0.1:${port}`,
        fakePayload,
        "DEFECT"
      );
      expect(result.decision.outcome).toBe("invalid_response");
      expect(result.action).toBe("DEFECT");
      expect(result.decision.errorMessage).toContain("Invalid action value");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test("handles missing action field", async () => {
    const { server, port } = await createServerWithResponse(
      JSON.stringify({ choice: "TRUST" })
    );
    try {
      const result = await callAgent(
        "agent-id",
        "round-id",
        `http://127.0.0.1:${port}`,
        fakePayload,
        "DEFECT"
      );
      expect(result.decision.outcome).toBe("invalid_response");
      expect(result.action).toBe("DEFECT");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test("handles network error (unreachable host)", async () => {
    const result = await callAgent(
      "agent-id",
      "round-id",
      "http://127.0.0.1:19999", // nothing listening here
      fakePayload,
      "TRUST"
    );
    expect(result.decision.outcome).toBe("error");
    expect(result.action).toBe("TRUST");
  }, 5000);

  test("valid response returns submitted outcome", async () => {
    const { server, port } = await createServerWithResponse(
      JSON.stringify({ action: "TRUST" })
    );
    try {
      const result = await callAgent(
        "agent-id",
        "round-id",
        `http://127.0.0.1:${port}`,
        fakePayload,
        "DEFECT"
      );
      expect(result.decision.outcome).toBe("submitted");
      expect(result.action).toBe("TRUST");
      expect(result.decision.latencyMs).not.toBeNull();
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
