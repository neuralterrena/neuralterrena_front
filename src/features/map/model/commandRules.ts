import type { CommandLane, LaneSample } from "./commandLanes";

/**
 * User rules as predicates over the forecast series.
 *
 * The point of the alerts layer is that it is predictive: an armed rule reports
 * its next trigger with lead time *before* the event, rather than announcing a
 * threshold after it has already been crossed. Everything here therefore works
 * forward from the present hour over the series the timeline is already
 * showing — no separate source, no separate truth.
 */

export type RuleOperator = "above" | "below";
export type Severity = "critical" | "warning" | "advisory";

export interface CommandRule {
  /** Free text supplied by the operator: what to do when this fires. */
  action: string;
  armed: boolean;
  id: string;
  laneId: string;
  /** Consecutive hours the predicate must hold before it counts. */
  minHours: number;
  operator: RuleOperator;
  value: number;
}

export interface RuleTrigger {
  /** Hours from now until the window opens; negative means already running. */
  leadHours: number;
  /** Worst value inside the window — the "how far past the limit" answer. */
  peak: number;
  severity: Severity;
  startHour: number;
  endHour: number;
}

/**
 * Severity follows lead time, not preference. Red is the only alert colour in
 * the canon, so it is spent only on what is already happening; everything
 * further out carries its urgency through weight and position instead.
 */
export function severityForLead(leadHours: number): Severity {
  if (leadHours <= 0) {
    return "critical";
  }
  return leadHours <= 6 ? "warning" : "advisory";
}

const holds = (rule: CommandRule, value: number | null) => {
  if (value === null) {
    return false;
  }
  return rule.operator === "above" ? value > rule.value : value < rule.value;
};

/**
 * The next window, at or after `nowHour`, where the predicate holds for long
 * enough. A gap in the data breaks the run: an hour with no value is not
 * evidence that the condition held through it.
 */
export function evaluateRule(
  rule: CommandRule,
  samples: readonly LaneSample[],
  nowHour: number,
): RuleTrigger | null {
  if (!rule.armed || samples.length === 0) {
    return null;
  }

  let runStart: number | null = null;
  let runHours = 0;
  let peak: number | null = null;

  for (const sample of samples) {
    if (!holds(rule, sample.value)) {
      runStart = null;
      runHours = 0;
      peak = null;
      continue;
    }

    // A window that ended before now is history, not a prediction.
    if (runStart === null) {
      runStart = sample.hour;
      peak = sample.value;
    } else if (sample.value !== null && peak !== null) {
      peak = rule.operator === "above" ? Math.max(peak, sample.value) : Math.min(peak, sample.value);
    }

    runHours += 1;

    if (runHours >= rule.minHours && peak !== null) {
      const endHour = sample.hour;
      if (endHour < nowHour) {
        continue;
      }
      const leadHours = runStart - nowHour;
      return { endHour, leadHours, peak, severity: severityForLead(leadHours), startHour: runStart };
    }
  }

  return null;
}

export interface CommandAlert {
  lane: CommandLane;
  rule: CommandRule;
  trigger: RuleTrigger;
}

const SEVERITY_ORDER: Record<Severity, number> = { advisory: 2, critical: 0, warning: 1 };

/**
 * Every armed rule that has a trigger, most urgent first: severity, then how
 * soon it opens. The order is what the operator reads down.
 */
export function activeAlerts(
  rules: readonly CommandRule[],
  lanes: readonly CommandLane[],
  samplesByLane: (laneId: string) => readonly LaneSample[],
  nowHour: number,
): CommandAlert[] {
  return rules
    .flatMap((rule) => {
      const lane = lanes.find((candidate) => candidate.id === rule.laneId);
      if (!lane) {
        return [];
      }
      const trigger = evaluateRule(rule, samplesByLane(rule.laneId), nowHour);
      return trigger ? [{ lane, rule, trigger }] : [];
    })
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.trigger.severity] - SEVERITY_ORDER[b.trigger.severity] ||
        a.trigger.leadHours - b.trigger.leadHours,
    );
}

/** Percentage by which the peak overshoots the limit, for the "how sure" line. */
export function excursionPercent(rule: CommandRule, peak: number): number | null {
  if (rule.value === 0) {
    return null;
  }
  return Math.round(((peak - rule.value) / Math.abs(rule.value)) * 100);
}

const STORAGE_KEY = "nt.command.rules";

const isRule = (value: unknown): value is CommandRule => {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const rule = value as Partial<CommandRule>;
  return (
    typeof rule.id === "string" &&
    typeof rule.laneId === "string" &&
    typeof rule.value === "number" &&
    typeof rule.minHours === "number" &&
    typeof rule.action === "string" &&
    typeof rule.armed === "boolean" &&
    (rule.operator === "above" || rule.operator === "below")
  );
};

/**
 * Rules live in local storage so an operator's own set survives a reload.
 * Components never touch storage directly; this is the only door.
 */
export const commandRuleStore = {
  read(): CommandRule[] {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isRule) : [];
    } catch {
      // A corrupt or unavailable store must not take the surface down with it.
      return [];
    }
  },

  write(rules: readonly CommandRule[]) {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(rules));
    } catch {
      // Private browsing and full quotas are not worth an error state here.
    }
  },
};
