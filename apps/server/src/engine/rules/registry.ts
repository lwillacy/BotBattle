import { GameRules } from "@tari-agent-arena/shared";
import { trustDefectV1 } from "./trustDefectV1";
import { createHash } from "crypto";

const registry: Record<string, GameRules> = {
  "trust-defect-v1": trustDefectV1,
};

export function getRules(version: string): GameRules {
  const rules = registry[version];
  if (!rules) throw new Error(`Unknown rules version: ${version}`);
  return rules;
}

export function hashRules(rules: GameRules): string {
  const canonical = stableStringify(rules);
  return createHash("sha256").update(canonical).digest("hex");
}

export function listRulesVersions(): string[] {
  return Object.keys(registry);
}

function stableStringify(obj: unknown): string {
  if (typeof obj !== "object" || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj))
    return "[" + obj.map(stableStringify).join(",") + "]";
  const keys = Object.keys(obj as object).sort();
  return (
    "{" +
    keys
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          stableStringify((obj as Record<string, unknown>)[k])
      )
      .join(",") +
    "}"
  );
}
