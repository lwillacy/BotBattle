import { resolvePayoffs } from "../engine/resolver";
import { trustDefectV1 } from "../engine/rules/trustDefectV1";

describe("resolvePayoffs", () => {
  const rules = trustDefectV1;

  test("TRUST vs TRUST: both get 3", () => {
    const result = resolvePayoffs("TRUST", "TRUST", rules);
    expect(result.payoffA).toBe(3);
    expect(result.payoffB).toBe(3);
  });

  test("TRUST vs DEFECT: A gets -4, B gets 5", () => {
    const result = resolvePayoffs("TRUST", "DEFECT", rules);
    expect(result.payoffA).toBe(-4);
    expect(result.payoffB).toBe(5);
  });

  test("DEFECT vs TRUST: A gets 5, B gets -4", () => {
    const result = resolvePayoffs("DEFECT", "TRUST", rules);
    expect(result.payoffA).toBe(5);
    expect(result.payoffB).toBe(-4);
  });

  test("DEFECT vs DEFECT: both get 0", () => {
    const result = resolvePayoffs("DEFECT", "DEFECT", rules);
    expect(result.payoffA).toBe(0);
    expect(result.payoffB).toBe(0);
  });
});
