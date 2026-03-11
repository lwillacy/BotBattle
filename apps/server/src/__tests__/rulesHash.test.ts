import { hashRules, getRules } from "../engine/rules/registry";
import { trustDefectV1 } from "../engine/rules/trustDefectV1";
import { GameRules } from "@tari-agent-arena/shared";

describe("hashRules", () => {
  test("same rules object produces same hash", () => {
    const hash1 = hashRules(trustDefectV1);
    const hash2 = hashRules(trustDefectV1);
    expect(hash1).toBe(hash2);
  });

  test("same rules content (different object reference) produces same hash", () => {
    const copy: GameRules = JSON.parse(JSON.stringify(trustDefectV1));
    const hash1 = hashRules(trustDefectV1);
    const hash2 = hashRules(copy);
    expect(hash1).toBe(hash2);
  });

  test("different rules produce different hash", () => {
    const modified: GameRules = {
      ...trustDefectV1,
      totalRounds: 20,
    };
    const hash1 = hashRules(trustDefectV1);
    const hash2 = hashRules(modified);
    expect(hash1).not.toBe(hash2);
  });

  test("modified payoffs produce different hash", () => {
    const modified: GameRules = {
      ...trustDefectV1,
      payoffs: {
        ...trustDefectV1.payoffs,
        trustTrust: { a: 4, b: 4 },
      },
    };
    const hash1 = hashRules(trustDefectV1);
    const hash2 = hashRules(modified);
    expect(hash1).not.toBe(hash2);
  });

  test("hash is a 64-character hex string (SHA-256)", () => {
    const hash = hashRules(trustDefectV1);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("getRules returns trust-defect-v1", () => {
    const rules = getRules("trust-defect-v1");
    expect(rules.version).toBe("trust-defect-v1");
    expect(rules.totalRounds).toBe(15);
  });

  test("getRules throws for unknown version", () => {
    expect(() => getRules("nonexistent-version")).toThrow("Unknown rules version");
  });
});
