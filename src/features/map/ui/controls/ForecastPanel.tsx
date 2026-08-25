import { CalendarClock, ChevronLeft, ChevronRight, Layers3, Pause, Play, Wind } from "lucide-react";
import type { ReactNode } from "react";
import { useLanguage } from "@/shared/providers";
import type { ForecastLayer, ForecastModel, ForecastModelId, RunInfo } from "../../api/forecastMapApi";
import type { ForecastLayerDefinition } from "../../model/layers";
import { MapRow } from "./primitives";

export type WindMode = "particles" | "arrows";

interface ForecastPanelProps {
  currentLayer: ForecastLayer | null;
  groupedLayers: ForecastLayerDefinition[][];
  isPlaying: boolean;
  model: ForecastModelId | null;
  modelLabel: (model: ForecastModel) => string;
  models: ForecastModel[];
  onHourChange: (hour: number) => void;
  onLayerChange: (layer: ForecastLayer) => void;
  onModelChange: (model: ForecastModelId) => void;
  onPlayToggle: () => void;
  onRunChange: (run: string) => void;
  onStep: (direction: number) => void;
  onWindModeChange: (mode: WindMode) => void;
  onWindToggle: (enabled: boolean) => void;
  run: string;
  runs: [string, RunInfo][];
  selectedHour: number | null;
  timelineHours: number[];
  validDate: Date | null;
  windAvailable: boolean;
  windEnabled: boolean;
  windMode: WindMode;
}

function Field({ children, icon, label }: { children: ReactNode; icon: ReactNode; label: string }) {
  return (
    <label className="nt-mapselect">
      <span className="nt-mapselect__label">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * Model, run, layer, wind and the lead-time scrubber — the forecast controls,
 * rebuilt on the design system's panel primitives.
 *
 * The scrubber is the one animation the canon allows on a map: dragging time
 * re-derives the raster, so it earns its motion.
 */
export function ForecastPanel({
  currentLayer,
  groupedLayers,
  isPlaying,
  model,
  modelLabel,
  models,
  onHourChange,
  onLayerChange,
  onModelChange,
  onPlayToggle,
  onRunChange,
  onStep,
  onWindModeChange,
  onWindToggle,
  run,
  runs,
  selectedHour,
  timelineHours,
  validDate,
  windAvailable,
  windEnabled,
  windMode,
}: ForecastPanelProps) {
  const { language, t } = useLanguage();
  const locale = language === "en" ? "en-US" : "es-ES";
  const hourIndex = Math.max(0, timelineHours.indexOf(selectedHour ?? -1));

  return (
    <>
      <Field icon={<Layers3 aria-hidden="true" strokeWidth={1.5} />} label={t("map.model")}>
        <select aria-label={t("map.model")} onChange={(event) => onModelChange(event.target.value)} value={model ?? ""}>
          {models.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {modelLabel(candidate)}
            </option>
          ))}
        </select>
      </Field>

      <Field icon={<CalendarClock aria-hidden="true" strokeWidth={1.5} />} label={t("map.run")}>
        <select aria-label={t("map.run")} onChange={(event) => onRunChange(event.target.value)} value={run}>
          {runs.map(([id, item]) => (
            <option key={id} value={id}>
              {id} · {new Date(item.created_at).toLocaleString(locale)}
            </option>
          ))}
        </select>
      </Field>

      <Field icon={<Layers3 aria-hidden="true" strokeWidth={1.5} />} label={t("map.layer")}>
        <select
          aria-label={t("map.layer")}
          disabled={!currentLayer}
          onChange={(event) => onLayerChange(event.target.value as ForecastLayer)}
          value={currentLayer ?? ""}
        >
          {currentLayer ? null : <option value="">{t("map.layersUnavailable")}</option>}
          {groupedLayers.map((layers, index) =>
            layers.length ? (
              <optgroup key={index} label={index ? t("map.advancedLayers") : t("map.surface")}>
                {layers.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {t(candidate.labelKey)}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </select>
      </Field>

      <MapRow
        checked={windEnabled && windAvailable}
        control="check"
        label={
          <>
            <Wind aria-hidden="true" size={14} strokeWidth={1.5} /> {t("map.wind")}
          </>
        }
        onToggle={() => windAvailable && onWindToggle(!windEnabled)}
        role="checkbox"
        sub={windAvailable ? undefined : t("map.windUnavailable")}
      />

      {windEnabled && windAvailable ? (
        <Field icon={<Wind aria-hidden="true" strokeWidth={1.5} />} label={t("map.windDisplay")}>
          <select
            aria-label={t("map.windDisplay")}
            onChange={(event) => onWindModeChange(event.target.value as WindMode)}
            value={windMode}
          >
            <option value="particles">{t("map.windParticles")}</option>
            <option value="arrows">{t("map.windArrows")}</option>
          </select>
        </Field>
      ) : null}

      <div className="nt-maptimeline">
        <span className="nt-mappanel__title">{t("map.timeLead")}</span>
        <div className="nt-maptimeline__row">
          <button
            aria-label={t("map.hourPrevious")}
            className="nt-maptimeline__step"
            disabled={!timelineHours.length}
            onClick={() => onStep(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" strokeWidth={1.5} />
          </button>
          <input
            aria-label={t("map.timeLead")}
            max={Math.max(0, timelineHours.length - 1)}
            min="0"
            onChange={(event) => onHourChange(timelineHours[Number(event.target.value)])}
            type="range"
            value={hourIndex}
          />
          <button
            aria-label={t("map.hourNext")}
            className="nt-maptimeline__step"
            disabled={!timelineHours.length}
            onClick={() => onStep(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" strokeWidth={1.5} />
          </button>
          <button
            aria-label={isPlaying ? t("map.pause") : t("map.play")}
            className="nt-maptimeline__step"
            disabled={timelineHours.length < 2}
            onClick={onPlayToggle}
            type="button"
          >
            {isPlaying ? <Pause aria-hidden="true" strokeWidth={1.5} /> : <Play aria-hidden="true" strokeWidth={1.5} />}
          </button>
          <span className="nt-maptimeline__lead">+{selectedHour ?? "---"} h</span>
        </div>
        {validDate ? (
          <p className="nt-maptimeline__valid">
            {t("map.valid")}: {validDate.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
          </p>
        ) : null}
      </div>
    </>
  );
}
