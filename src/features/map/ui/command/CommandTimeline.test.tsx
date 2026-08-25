import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/shared/providers/LanguageProvider";
import type { LaneSample } from "../../model/commandLanes";
import type { IlluminationBand } from "../../model/solar";
import { CommandTimeline } from "./CommandTimeline";

/**
 * The timeline cannot be seen with real data without a Hub token, so the parts
 * that only appear once samples exist — provenance bands, the threshold rule,
 * the illumination strip — are pinned here instead.
 */

const HOURS = [0, 3, 6, 9];

const samples = (values: (number | null)[], provenance: LaneSample["provenance"] = "fct"): LaneSample[] =>
  HOURS.map((hour, index) => ({ hour, provenance, value: values[index] }));

const BANDS: IlluminationBand[] = [
  { end: 0.25, phase: "night", start: 0 },
  { end: 0.35, phase: "twilight", start: 0.25 },
  { end: 1, phase: "day", start: 0.35 },
];

const renderTimeline = (overrides: Partial<Parameters<typeof CommandTimeline>[0]> = {}) =>
  render(
    <LanguageProvider>
      <CommandTimeline
        bands={BANDS}
        hours={HOURS}
        isCollapsed={false}
        isPlaying={false}
        nowHour={3}
        onCollapseToggle={vi.fn()}
        onHourChange={vi.fn()}
        onPlayToggle={vi.fn()}
        onSnapToNow={vi.fn()}
        selectedHour={3}
        series={[
          { laneId: "wind", samples: samples([4, 20, null, 8]) },
          { laneId: "temperature", samples: samples([280, 281, 282, 283]) },
          { laneId: "inversion", samples: samples([1, 2, 3, 4]) },
          { laneId: "precipitation", samples: samples([0, 0, 1, 2]) },
        ]}
        validDate={new Date("2026-08-25T09:00:00Z")}
        {...overrides}
      />
    </LanguageProvider>,
  );

describe("CommandTimeline", () => {
  it("draws each provenance state as its own band", () => {
    const { container } = renderTimeline();

    // Wind goes forecast, forecast-in-breach, no-data, forecast.
    expect(container.querySelectorAll(".cmd-tl__prov--fct").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".cmd-tl__prov--nd")).toHaveLength(1);
    expect(container.querySelectorAll(".cmd-tl__prov.is-brk")).toHaveLength(1);
  });

  it("never spends colour on provenance, only on the breach", () => {
    const { container } = renderTimeline();

    container.querySelectorAll(".cmd-tl__prov").forEach((band) => {
      expect(band.className).not.toMatch(/alert|red/);
    });
  });

  it("renders the illumination strip as contiguous phases", () => {
    const { container } = renderTimeline();
    const phases = [...container.querySelectorAll(".cmd-tl__illum i")].map((band) =>
      band.getAttribute("data-phase"),
    );

    expect(phases).toEqual(["night", "twilight", "day"]);
  });

  it("labels every lane with the feed it is anchored to", () => {
    renderTimeline();

    expect(screen.getByText("ASTRO")).toBeInTheDocument();
    expect(screen.getAllByText("MODELO")).toHaveLength(4);
  });

  it("reads values as at the cursor and flags the one over its limit", () => {
    const { container } = renderTimeline();

    // Wind at +3 h is 20 m/s against a 15 m/s limit.
    const breached = container.querySelector(".cmd-tl__lane-v.is-brk");
    expect(breached?.textContent).toContain("20.0");
    expect(container.querySelectorAll(".cmd-tl__lane-v.is-brk")).toHaveLength(1);
  });

  it("shows a dash rather than a zero where a sample is missing", () => {
    renderTimeline({ selectedHour: 6 });
    expect(screen.getByText(/^—\s*m\/s$/)).toBeInTheDocument();
  });

  it("reports the cursor offset from now", () => {
    renderTimeline({ nowHour: 0, selectedHour: 9 });
    expect(screen.getByText("T+09:00")).toBeInTheDocument();
  });

  it("reports a negative offset when reviewing the past", () => {
    renderTimeline({ nowHour: 9, selectedHour: 0 });
    expect(screen.getByText("T−09:00")).toBeInTheDocument();
  });

  it("draws the threshold rule only for a lane that has one in range", () => {
    const { container } = renderTimeline();
    // Wind (4–20 against 15) qualifies; temperature has no limit at all.
    expect(container.querySelectorAll(".cmd-tl__thr").length).toBeGreaterThanOrEqual(1);
  });

  it("hides the lanes but keeps the header when collapsed", () => {
    const { container } = renderTimeline({ isCollapsed: true });

    expect(container.querySelector(".cmd-tl")?.className).toContain("is-collapsed");
    expect(screen.getByText("T+00:00")).toBeInTheDocument();
  });

  it("snaps a scrub to the nearest forecast hour", () => {
    const onHourChange = vi.fn();
    const { container } = renderTimeline({ onHourChange });

    const field = container.querySelector(".cmd-tl__field") as HTMLElement;
    field.setPointerCapture = vi.fn();
    field.getBoundingClientRect = () => ({ bottom: 0, height: 150, left: 0, right: 500, toJSON: () => "", top: 0, width: 500, x: 0, y: 0 });

    // 96px of label column, then 404px of scale: two thirds along is +6 h.
    fireEvent.pointerDown(field, { clientX: 96 + 404 * (2 / 3), pointerId: 1 });
    expect(onHourChange).toHaveBeenCalledWith(6);
  });
});
