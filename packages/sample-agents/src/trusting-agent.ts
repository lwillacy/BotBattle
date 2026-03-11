/**
 * Trusting Agent (port 3101)
 * Trust every round unless opponent betrayed twice in a row.
 * Then defect for one round and return to trust.
 */
import express, { Request, Response } from "express";
import { AgentDecisionPayload, Action } from "@tari-agent-arena/shared";

const app = express();
app.use(express.json());

const PORT = 3101;

app.post("/decision", (req: Request, res: Response) => {
  const payload: AgentDecisionPayload = req.body;
  const history = payload.history;
  const action = decide(payload.youAre, history);
  return res.json({ action });
});

function decide(youAre: "A" | "B", history: AgentDecisionPayload["history"]): Action {
  if (history.length < 2) {
    return "TRUST";
  }

  const last = history[history.length - 1];
  const secondLast = history[history.length - 2];

  const opponentBetrayedLast = last.opponentAction === "DEFECT";
  const opponentBetrayedSecondLast = secondLast.opponentAction === "DEFECT";

  // Defect if opponent betrayed twice in a row, then return to trust
  if (opponentBetrayedLast && opponentBetrayedSecondLast) {
    // Defect once as retaliation
    const myLastAction = last.yourAction;
    if (myLastAction === "TRUST") {
      // We haven't retaliated yet
      return "DEFECT";
    }
  }

  return "TRUST";
}

app.listen(PORT, () => {
  console.log(`Trusting Agent listening on port ${PORT}`);
});

export default app;
