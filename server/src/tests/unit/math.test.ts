import { describe, expect, it } from "vitest";
import { maxDrawdown, mean, percentile, standardDeviation } from "../../utils/math.js";

describe("math utilities", () => {
  it("calculates mean and standard deviation", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(standardDeviation([0.01, -0.01, 0.02])).toBeGreaterThan(0);
  });

  it("calculates percentile", () => {
    expect(percentile([-0.05, -0.02, 0.01, 0.03], 5)).toBeLessThan(0);
  });

  it("calculates max drawdown from an equity curve", () => {
    expect(maxDrawdown([100, 120, 110, 90, 130])).toBeCloseTo(0.25);
  });
});
