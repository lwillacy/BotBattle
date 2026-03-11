import {
  Action,
  AgentDecisionPayload,
  AgentDecisionResponse,
  DecisionOutcome,
} from "@tari-agent-arena/shared";

export interface RoundDecisionRecord {
  agentId: string;
  roundId: string;
  requestPreparedAt: Date | null;
  requestSentAt: Date | null;
  responseReceivedAt: Date | null;
  timedOutAt: Date | null;
  latencyMs: number | null;
  deadlineMs: number;
  action: Action | null;
  rawRequest: object | null;
  rawResponse: object | null;
  outcome: DecisionOutcome;
  errorMessage: string | null;
}

export interface AgentCallResult {
  decision: RoundDecisionRecord;
  action: Action;
}

export async function callAgent(
  agentId: string,
  roundId: string,
  endpointUrl: string,
  payload: AgentDecisionPayload,
  defaultAction: Action
): Promise<AgentCallResult> {
  const deadlineMs = payload.decisionDeadlineMs;

  const record: RoundDecisionRecord = {
    agentId,
    roundId,
    requestPreparedAt: null,
    requestSentAt: null,
    responseReceivedAt: null,
    timedOutAt: null,
    latencyMs: null,
    deadlineMs,
    action: null,
    rawRequest: null,
    rawResponse: null,
    outcome: "error",
    errorMessage: null,
  };

  record.requestPreparedAt = new Date();
  record.rawRequest = payload as unknown as object;

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, deadlineMs);

  try {
    record.requestSentAt = new Date();
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutHandle);
    record.responseReceivedAt = new Date();
    record.latencyMs =
      record.responseReceivedAt.getTime() - record.requestSentAt.getTime();

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      record.outcome = "invalid_response";
      record.errorMessage = "Failed to parse JSON response";
      record.action = defaultAction;
      return { decision: record, action: defaultAction };
    }

    record.rawResponse = json as object;

    const parsed = json as Partial<AgentDecisionResponse>;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed.action !== "TRUST" && parsed.action !== "DEFECT")
    ) {
      record.outcome = "invalid_response";
      record.errorMessage = `Invalid action value: ${JSON.stringify(parsed?.action)}`;
      record.action = defaultAction;
      return { decision: record, action: defaultAction };
    }

    record.action = parsed.action;
    record.outcome = "submitted";
    return { decision: record, action: parsed.action };
  } catch (err: unknown) {
    clearTimeout(timeoutHandle);

    // Check for abort/timeout - handles both Error and DOMException cases
    const isAbort =
      controller.signal.aborted ||
      (err instanceof Error && err.name === "AbortError") ||
      (typeof err === "object" &&
        err !== null &&
        "name" in err &&
        (err as { name: string }).name === "AbortError");

    if (isAbort) {
      record.timedOutAt = new Date();
      if (record.requestSentAt) {
        record.latencyMs =
          record.timedOutAt.getTime() - record.requestSentAt.getTime();
      }
      record.outcome = "timeout";
      record.errorMessage = "Agent call timed out";
      record.action = defaultAction;
      return { decision: record, action: defaultAction };
    }

    record.outcome = "error";
    record.errorMessage =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : "Unknown error";
    record.action = defaultAction;
    return { decision: record, action: defaultAction };
  }
}
