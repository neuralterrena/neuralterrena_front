import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/shared/providers";

export type CommandMode = "mil" | "civ";
export type TimeState = "live" | "forecast" | "review";

interface CommandTopStripProps {
  /** Age of the loaded cycle in hours; drives the stale indicator. */
  cycleAgeHours: number | null;
  mode: CommandMode;
  onExit: () => void;
  onModeChange: (mode: CommandMode) => void;
  /** Offset of the cursor from now, in hours. */
  offsetHours: number;
  timeState: TimeState;
}

const pad = (value: number) => String(value).padStart(2, "0");

const clock = (date: Date, utc: boolean) =>
  utc
    ? `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
    : `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

/** A cycle older than this has been superseded and should be flagged. */
const STALE_AFTER_HOURS = 8;

export function CommandTopStrip({
  cycleAgeHours,
  mode,
  onExit,
  onModeChange,
  offsetHours,
  timeState,
}: CommandTopStripProps) {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isStale = cycleAgeHours !== null && cycleAgeHours > STALE_AFTER_HOURS;
  const sign = offsetHours >= 0 ? "+" : "−";
  const stateLabel =
    timeState === "live"
      ? t("command.stateLive")
      : `${timeState === "forecast" ? t("command.stateForecast") : t("command.stateReview")} T${sign}${pad(Math.abs(offsetHours))}:00`;

  return (
    <header className="cmd__top">
      <div className="cmd__top-l">
        <div className="cmd__ident">
          <div aria-hidden="true" className="cmd__marks">
            <i style={{ background: "var(--nt-color-yellow)" }} />
            <i style={{ background: "var(--nt-color-orange)" }} />
            <i style={{ background: "var(--nt-color-red)" }} />
            <i style={{ background: "var(--nt-color-blue)" }} />
          </div>
          <div>
            <div className="cmd__ident-t">neural terrena</div>
            <div className="cmd__ident-s">{t("command.surface")}</div>
          </div>
        </div>
      </div>

      <div className="cmd__top-c">
        <div className="cmd__clock">
          <b>{clock(now, false)}</b>
          <span>{t("command.local")}</span>
        </div>
        <div className="cmd__clock">
          <b>{clock(now, true)}</b>
          <span>Z</span>
        </div>
        <span
          className={timeState === "live" ? "cmd__state cmd__state--live" : "cmd__state cmd__state--fwd"}
        >
          <i aria-hidden="true" className="cmd__led" />
          {stateLabel}
        </span>
      </div>

      <div className="cmd__top-r">
        <div className="cmd__feeds">
          <span className={isStale ? "cmd__feed cmd__feed--stale" : "cmd__feed"}>
            <i aria-hidden="true" />
            {cycleAgeHours === null
              ? t("command.feedUnknown")
              : `${t("command.feedModel")} ${sign === "+" ? "" : ""}${String(Math.round(cycleAgeHours))} H`}
          </span>
          {/* The Hub carries no station feed, so the console says so rather
              than implying a measurement source it does not have. */}
          <span className="cmd__feed">
            <i aria-hidden="true" style={{ background: "var(--c-fg-subtle)" }} />
            {t("command.feedStations")}
          </span>
        </div>

        <div aria-label={t("command.mode")} className="cmd__seg" role="group">
          <button
            aria-pressed={mode === "mil"}
            className={mode === "mil" ? "is-on" : undefined}
            onClick={() => onModeChange("mil")}
            type="button"
          >
            MIL
          </button>
          <button
            aria-pressed={mode === "civ"}
            className={mode === "civ" ? "is-on" : undefined}
            onClick={() => onModeChange("civ")}
            type="button"
          >
            CIV
          </button>
        </div>

        <button aria-label={t("command.exit")} className="cmd-ib cmd__exit" onClick={onExit} title={t("command.exit")} type="button">
          <LogOut aria-hidden="true" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
