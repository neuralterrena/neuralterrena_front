import { ChevronDown, ChevronUp, Pause, Play, SkipBack } from "lucide-react";
import { useRef, type PointerEvent } from "react";
import { useLanguage } from "@/shared/providers";
import {
  COMMAND_LANES,
  isBreach,
  lanePaths,
  laneSegments,
  thresholdY,
  type LaneSample,
} from "../../model/commandLanes";
import type { CommandAlert } from "../../model/commandRules";
import type { LaneSeries } from "../../model/useCommandData";
import type { IlluminationBand } from "../../model/solar";

const LANE_HEIGHT = 30;

interface CommandTimelineProps {
  /** Predicted rule triggers, drawn as blocks on their own lane. */
  alerts: readonly CommandAlert[];
  bands: IlluminationBand[];
  hours: number[];
  isCollapsed: boolean;
  isPlaying: boolean;
  onCollapseToggle: () => void;
  onHourChange: (hour: number) => void;
  onPlayToggle: () => void;
  onSnapToNow: () => void;
  selectedHour: number | null;
  series: LaneSeries[];
  /** Forecast hour that corresponds to the present instant. */
  nowHour: number;
  validDate: Date | null;
}

const percent = (value: number) => `${(value * 100).toFixed(3)}%`;

/**
 * The timeline: one lane per operational variable over the run, with the
 * cursor that re-derives every other readout on the surface.
 *
 * Provenance is drawn per segment from the samples themselves — solid for
 * observed, hatched for model, dotted where there is nothing — so NOW marks
 * the present instant and never doubles as the boundary between the two.
 */
export function CommandTimeline({
  alerts,
  bands,
  hours,
  isCollapsed,
  isPlaying,
  onCollapseToggle,
  onHourChange,
  onPlayToggle,
  onSnapToNow,
  selectedHour,
  series,
  nowHour,
  validDate,
}: CommandTimelineProps) {
  const { language, t } = useLanguage();
  const fieldRef = useRef<HTMLDivElement | null>(null);

  const span = hours.length > 1 ? hours[hours.length - 1] - hours[0] : 1;
  const position = (hour: number) => (span === 0 ? 0 : (hour - hours[0]) / span);
  const cursorHour = selectedHour ?? hours[0] ?? 0;
  const offset = cursorHour - nowHour;

  const scrubTo = (event: PointerEvent<HTMLDivElement>) => {
    const field = fieldRef.current;
    if (!field || hours.length === 0) return;

    const box = field.getBoundingClientRect();
    // The lane label column does not take part in the scale.
    const left = box.left + 96;
    const usable = box.width - 96;
    if (usable <= 0) return;

    const fraction = Math.max(0, Math.min(1, (event.clientX - left) / usable));
    const target = hours[0] + fraction * span;
    const nearest = hours.reduce((best, hour) =>
      Math.abs(hour - target) < Math.abs(best - target) ? hour : best,
    );
    onHourChange(nearest);
  };

  const laneSamples = (laneId: string): LaneSample[] =>
    series.find((entry) => entry.laneId === laneId)?.samples ?? [];

  const valueAtCursor = (samples: LaneSample[]) =>
    samples.find((sample) => sample.hour === cursorHour)?.value ?? null;

  return (
    <section
      aria-label={t("command.timeline")}
      className={isCollapsed ? "cmd-tl is-collapsed" : "cmd-tl"}
    >
      <div className="cmd-tl__hd">
        <div className="cmd-tl__grp">
          <button
            aria-label={isPlaying ? t("map.pause") : t("map.play")}
            className="cmd-ib cmd-ib--sm cmd-ib--bd"
            onClick={onPlayToggle}
            type="button"
          >
            {isPlaying ? <Pause aria-hidden="true" strokeWidth={1.5} /> : <Play aria-hidden="true" strokeWidth={1.5} />}
          </button>
          <button
            aria-label={t("command.snapToNow")}
            className="cmd-ib cmd-ib--sm cmd-ib--bd"
            onClick={onSnapToNow}
            title={t("command.snapToNow")}
            type="button"
          >
            <SkipBack aria-hidden="true" strokeWidth={1.5} />
          </button>
        </div>

        <div className="cmd-tl__cur">
          <b>
            {validDate
              ? validDate.toLocaleTimeString(language === "en" ? "en-US" : "es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--"}
          </b>
          <s>
            {validDate
              ? validDate.toLocaleDateString(language === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short" })
              : ""}
          </s>
        </div>
        <span className="cmd-tl__off">
          T{offset >= 0 ? "+" : "−"}
          {String(Math.abs(offset)).padStart(2, "0")}:00
        </span>

        <span className="cmd-tl__sp" />

        <div className="cmd-tl__legend">
          <span>
            <i aria-hidden="true" className="cmd-tl__sw--obs" />
            {t("command.provObserved")}
          </span>
          <span>
            <i aria-hidden="true" className="cmd-tl__sw--fct" />
            {t("command.provForecast")}
          </span>
          <span>
            <i aria-hidden="true" className="cmd-tl__sw--nd" />
            {t("command.provNoData")}
          </span>
        </div>

        <button
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? t("command.expandTimeline") : t("command.collapseTimeline")}
          className="cmd-ib cmd-ib--sm"
          onClick={onCollapseToggle}
          type="button"
        >
          {isCollapsed ? <ChevronUp aria-hidden="true" strokeWidth={1.5} /> : <ChevronDown aria-hidden="true" strokeWidth={1.5} />}
        </button>
      </div>

      <div className="cmd-tl__body">
        <div
          className="cmd-tl__field"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            scrubTo(event);
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) scrubTo(event);
          }}
          ref={fieldRef}
        >
          <div className="cmd-tl__lanes">
            {/* Illumination is a real, legended variable, so it earns the
                warm-to-cold ramp the canon otherwise forbids. */}
            <div className="cmd-tl__lane">
              <div className="cmd-tl__lane-l">
                <span className="cmd-tl__lane-n">{t("command.laneIllumination")}</span>
                <span className="cmd-tl__lane-s">{t("command.sourceAstronomy")}</span>
              </div>
              <div className="cmd-tl__lane-c">
                <div aria-hidden="true" className="cmd-tl__illum">
                  {bands.map((band) => (
                    <i
                      data-phase={band.phase}
                      key={`${band.phase}-${String(band.start)}`}
                      style={{ width: percent(band.end - band.start) }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {COMMAND_LANES.map((lane) => {
              const samples = laneSamples(lane.id);
              const cursorValue = valueAtCursor(samples);
              const breached = isBreach(lane, cursorValue);
              const rule = thresholdY(samples, lane, LANE_HEIGHT);

              return (
                <div className="cmd-tl__lane" key={lane.id}>
                  <div className="cmd-tl__lane-l">
                    <span className="cmd-tl__lane-n">{t(lane.labelKey)}</span>
                    <span className="cmd-tl__lane-s">{t("command.sourceModel")}</span>
                    <span className={breached ? "cmd-tl__lane-v is-brk" : "cmd-tl__lane-v"}>
                      {cursorValue === null ? "—" : cursorValue.toFixed(1)} {lane.unit}
                    </span>
                  </div>
                  <div className="cmd-tl__lane-c">
                    {laneSegments(samples, lane).map((segment) => (
                      <div
                        aria-hidden="true"
                        className={`cmd-tl__prov cmd-tl__prov--${segment.provenance}${segment.breached ? " is-brk" : ""}`}
                        key={`${segment.provenance}-${String(segment.start)}`}
                        style={{ left: percent(segment.start), width: percent(segment.end - segment.start) }}
                      />
                    ))}
                    <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 100 ${String(LANE_HEIGHT)}`}>
                      {rule === null ? null : (
                        <line className="cmd-tl__thr" x1="0" x2="100" y1={rule} y2={rule} />
                      )}
                      {lanePaths(samples, LANE_HEIGHT).map((path) => (
                        <path className="cmd-tl__series" d={path} key={path.slice(0, 24)} vectorEffect="non-scaling-stroke" />
                      ))}
                    </svg>
                  </div>
                </div>
              );
            })}
            <div className="cmd-tl__lane">
              <div className="cmd-tl__lane-l">
                <span className="cmd-tl__lane-n">{t("command.laneAlerts")}</span>
                <span className="cmd-tl__lane-s">{t("command.sourceRules")}</span>
              </div>
              <div className="cmd-tl__lane-c">
                {alerts.map((alert) => (
                  <button
                    className={`cmd-tl__blk cmd-sev--${alert.trigger.severity}`}
                    key={alert.rule.id}
                    onClick={(event) => {
                      // The lane sits on the scrub surface; jumping to the
                      // block must not also scrub to where it was clicked.
                      event.stopPropagation();
                      onHourChange(alert.trigger.startHour);
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    style={{
                      left: percent(position(alert.trigger.startHour)),
                      // A single-hour window still needs to be clickable.
                      width: `max(14px, ${percent(Math.max(0, position(alert.trigger.endHour) - position(alert.trigger.startHour)))})`,
                    }}
                    title={alert.rule.action}
                    type="button"
                  >
                    <span>{t(alert.lane.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div aria-hidden="true" className="cmd-tl__marks">
            <div className="cmd-tl__now" style={{ left: percent(position(nowHour)) }} />
            <div className="cmd-tl__cursor" style={{ left: percent(position(cursorHour)) }} />
          </div>
        </div>

        <div className="cmd-tl__ax">
          <div className="cmd-tl__ax-l" />
          <div className="cmd-tl__ax-c">
            {hours.length > 0
              ? [hours[0], hours[Math.floor(hours.length / 2)], hours[hours.length - 1]].map((hour, index) => (
                  <span key={`${String(hour)}-${String(index)}`}>+{hour} h</span>
                ))
              : null}
          </div>
        </div>
      </div>
    </section>
  );
}
