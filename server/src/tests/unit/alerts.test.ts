import { describe, expect, it } from "vitest";
import { severityForBreach, shouldThrottle } from "../../modules/alerts/alert.service.js";

describe("alert evaluation helpers", () => {
  it("scales breach severity proportionally to threshold overrun", () => {
    expect(severityForBreach(25, 25)).toBe("LOW");
    expect(severityForBreach(28, 25)).toBe("LOW");
    expect(severityForBreach(28.75, 25)).toBe("MEDIUM");
    expect(severityForBreach(37.5, 25)).toBe("HIGH");
  });

  it("throttles repeated notifications within the 1-hour cooldown window", () => {
    expect(shouldThrottle(undefined)).toBe(false);
    expect(shouldThrottle(new Date(Date.now() - 10 * 60 * 1000))).toBe(true);
    expect(shouldThrottle(new Date(Date.now() - 61 * 60 * 1000))).toBe(false);
  });
});
