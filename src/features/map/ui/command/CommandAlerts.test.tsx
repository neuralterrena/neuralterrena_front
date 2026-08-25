import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/shared/providers/LanguageProvider";
import { COMMAND_LANES, type CommandLane } from "../../model/commandLanes";
import type { CommandAlert, Severity } from "../../model/commandRules";
import { CommandAlerts, CommandBanner } from "./CommandAlerts";

const wind = COMMAND_LANES.find((lane) => lane.id === "wind") as CommandLane;

const alert = (severity: Severity, leadHours: number): CommandAlert => ({
  lane: wind,
  rule: {
    action: "Suspender vuelo y replegar",
    armed: true,
    id: `r-${severity}`,
    laneId: "wind",
    minHours: 2,
    operator: "above",
    value: 15,
  },
  trigger: { endHour: 9, leadHours, peak: 22.5, severity, startHour: 6 },
});

const withLanguage = (node: React.ReactNode) => render(<LanguageProvider>{node}</LanguageProvider>);

describe("CommandAlerts", () => {
  it("answers when, how sure, where and what to do", () => {
    withLanguage(<CommandAlerts alerts={[alert("warning", 3)]} onSelect={vi.fn()} place="43.17 N · 4.85 W" />);

    // how sure — the peak and how far past the limit it goes
    expect(screen.getByText(/22\.5 m\/s/)).toBeInTheDocument();
    expect(screen.getByText(/\+50%/)).toBeInTheDocument();
    // when — the window and the lead
    expect(screen.getByText(/\+6 h → \+9 h/)).toBeInTheDocument();
    expect(screen.getByText("T+03")).toBeInTheDocument();
    // where
    expect(screen.getByText(/43\.17 N · 4\.85 W/)).toBeInTheDocument();
    // what to do
    expect(screen.getByText(/Suspender vuelo y replegar/)).toBeInTheDocument();
  });

  it("reads a running window as NOW rather than as a negative lead", () => {
    withLanguage(<CommandAlerts alerts={[alert("critical", -2)]} onSelect={vi.fn()} place="—" />);
    expect(screen.getByText("NOW")).toBeInTheDocument();
  });

  it("fills red only for a critical window", () => {
    const { container, rerender } = withLanguage(
      <CommandAlerts alerts={[alert("warning", 3)]} onSelect={vi.fn()} place="—" />,
    );
    expect(container.querySelector(".cmd-alert--critical")).toBeNull();

    rerender(
      <LanguageProvider>
        <CommandAlerts alerts={[alert("critical", 0)]} onSelect={vi.fn()} place="—" />
      </LanguageProvider>,
    );
    expect(container.querySelector(".cmd-alert--critical")).not.toBeNull();
  });

  it("carries the severity class so lower tiers stay neutral", () => {
    const { container } = withLanguage(
      <CommandAlerts alerts={[alert("advisory", 12)]} onSelect={vi.fn()} place="—" />,
    );
    expect(container.querySelector(".cmd-sev--advisory")).not.toBeNull();
  });

  it("jumps the cursor to the start of the window", () => {
    const onSelect = vi.fn();
    withLanguage(<CommandAlerts alerts={[alert("warning", 3)]} onSelect={onSelect} place="—" />);

    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(6);
  });

  it("says plainly when nothing reaches its limit", () => {
    withLanguage(<CommandAlerts alerts={[]} onSelect={vi.fn()} place="—" />);
    expect(screen.getByText(/Ninguna regla armada/)).toBeInTheDocument();
  });
});

describe("CommandBanner", () => {
  it("carries the action and the peak, and can be dismissed", () => {
    const onDismiss = vi.fn();
    const onSelect = vi.fn();
    withLanguage(<CommandBanner alert={alert("critical", 0)} onDismiss={onDismiss} onSelect={onSelect} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Suspender vuelo y replegar")).toBeInTheDocument();
    expect(screen.getByText("22.5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ir a la ventana/ }));
    expect(onSelect).toHaveBeenCalledWith(6);

    fireEvent.click(screen.getByRole("button", { name: /Descartar/ }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
