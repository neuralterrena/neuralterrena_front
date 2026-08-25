import { beforeEach, describe, expect, it } from "vitest";
import { COMMAND_LANES, type LaneSample } from "./commandLanes";
import {
  activeAlerts,
  commandRuleStore,
  evaluateRule,
  excursionPercent,
  severityForLead,
  type CommandRule,
} from "./commandRules";

const rule = (overrides: Partial<CommandRule> = {}): CommandRule => ({
  action: "Suspender vuelo",
  armed: true,
  id: "r1",
  laneId: "wind",
  minHours: 2,
  operator: "above",
  value: 15,
  ...overrides,
});

const series = (values: (number | null)[], step = 1): LaneSample[] =>
  values.map((value, index) => ({ hour: index * step, provenance: "fct", value }));

describe("severityForLead", () => {
  it("spends red only on what is already running", () => {
    expect(severityForLead(-2)).toBe("critical");
    expect(severityForLead(0)).toBe("critical");
    expect(severityForLead(1)).toBe("warning");
    expect(severityForLead(6)).toBe("warning");
    expect(severityForLead(7)).toBe("advisory");
  });
});

describe("evaluateRule", () => {
  it("reports the next window with its lead time", () => {
    const trigger = evaluateRule(rule(), series([2, 3, 18, 19, 4]), 0);

    expect(trigger).toMatchObject({ leadHours: 2, startHour: 2 });
    expect(trigger?.peak).toBe(19);
    expect(trigger?.severity).toBe("warning");
  });

  it("needs the predicate to hold for long enough", () => {
    // One hour over the limit does not satisfy a two-hour rule.
    expect(evaluateRule(rule(), series([2, 18, 4, 5]), 0)).toBeNull();
    expect(evaluateRule(rule({ minHours: 1 }), series([2, 18, 4, 5]), 0)).not.toBeNull();
  });

  it("treats a gap as breaking the run rather than continuing it", () => {
    // A missing hour is not evidence the condition held through it.
    expect(evaluateRule(rule({ minHours: 3 }), series([18, null, 19, 20]), 0)).toBeNull();
  });

  it("reads a window that is already running as critical", () => {
    const trigger = evaluateRule(rule(), series([18, 19, 20, 4]), 2);
    expect(trigger?.leadHours).toBeLessThanOrEqual(0);
    expect(trigger?.severity).toBe("critical");
  });

  it("ignores a window that closed before now", () => {
    expect(evaluateRule(rule(), series([18, 19, 2, 2, 2]), 4)).toBeNull();
  });

  it("supports a floor as well as a ceiling", () => {
    const floor = rule({ operator: "below", value: 500 });
    const trigger = evaluateRule(floor, series([900, 400, 300, 900]), 0);
    expect(trigger?.startHour).toBe(1);
    // The peak of a floor rule is the lowest value reached.
    expect(trigger?.peak).toBe(300);
  });

  it("stays silent while disarmed", () => {
    expect(evaluateRule(rule({ armed: false }), series([18, 19, 20]), 0)).toBeNull();
  });

  it("stays silent with no series at all", () => {
    expect(evaluateRule(rule(), [], 0)).toBeNull();
  });
});

describe("activeAlerts", () => {
  const samples = new Map<string, LaneSample[]>([
    ["wind", series([2, 2, 18, 19])],
    ["inversion", series([9, 9, 9, 9])],
  ]);

  it("orders by severity first and lead time second", () => {
    const alerts = activeAlerts(
      [
        rule({ id: "wind-late", laneId: "wind" }),
        rule({ id: "inv-now", laneId: "inversion", value: 5 }),
      ],
      COMMAND_LANES,
      (laneId) => samples.get(laneId) ?? [],
      0,
    );

    expect(alerts.map((alert) => alert.rule.id)).toEqual(["inv-now", "wind-late"]);
    expect(alerts[0].trigger.severity).toBe("critical");
    expect(alerts[0].lane.id).toBe("inversion");
  });

  it("drops a rule whose lane no longer exists", () => {
    const alerts = activeAlerts([rule({ laneId: "visibility" })], COMMAND_LANES, () => [], 0);
    expect(alerts).toEqual([]);
  });
});

describe("excursionPercent", () => {
  it("reports how far past the limit the peak goes", () => {
    expect(excursionPercent(rule(), 30)).toBe(100);
    expect(excursionPercent(rule(), 18)).toBe(20);
  });

  it("declines to divide by a zero limit", () => {
    expect(excursionPercent(rule({ value: 0 }), 5)).toBeNull();
  });
});

describe("commandRuleStore", () => {
  beforeEach(() => globalThis.localStorage.clear());

  it("round-trips rules", () => {
    const rules = [rule(), rule({ id: "r2", laneId: "inversion" })];
    commandRuleStore.write(rules);
    expect(commandRuleStore.read()).toEqual(rules);
  });

  it("returns nothing when there is nothing stored", () => {
    expect(commandRuleStore.read()).toEqual([]);
  });

  it("discards entries that are not rules rather than trusting the store", () => {
    globalThis.localStorage.setItem("nt.command.rules", JSON.stringify([rule(), { id: "junk" }, 7]));
    expect(commandRuleStore.read()).toHaveLength(1);
  });

  it("survives a corrupt store", () => {
    globalThis.localStorage.setItem("nt.command.rules", "{not json");
    expect(commandRuleStore.read()).toEqual([]);
  });
});
