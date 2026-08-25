import { Circle, Pentagon, Ruler, Trash2, Undo2 } from "lucide-react";
import { useLanguage } from "@/shared/providers";
import type { LngLat } from "../../model/geodesy";
import { measureReadout, type MeasureMode } from "../../model/measure";
import { Segmented } from "./primitives";

interface MeasureControlProps {
  mode: MeasureMode;
  onClear: () => void;
  onModeChange: (mode: MeasureMode) => void;
  onUndo: () => void;
  points: readonly LngLat[];
}

/**
 * Distance · area · radius in one segmented control, with the running readout
 * underneath. Values use mono tabular figures so they do not jitter while the
 * operator is still placing points.
 */
export function MeasureControl({ mode, onClear, onModeChange, onUndo, points }: MeasureControlProps) {
  const { t } = useLanguage();
  const readout = measureReadout(mode, points);

  return (
    <>
      <Segmented
        label={t("map.measureMode")}
        onChange={onModeChange}
        options={[
          { icon: <Ruler aria-hidden="true" strokeWidth={1.5} />, label: t("map.measureDistance"), value: "distance" },
          { icon: <Pentagon aria-hidden="true" strokeWidth={1.5} />, label: t("map.measureAreaMode"), value: "area" },
          { icon: <Circle aria-hidden="true" strokeWidth={1.5} />, label: t("map.measureRadiusMode"), value: "radius" },
        ]}
        value={mode}
      />

      <div className="nt-measure-readout">
        {readout.stats.map((stat) => (
          <div className="nt-measure-stat" key={stat.key}>
            <span className="nt-measure-stat__k">{t(stat.key)}</span>
            <span className="nt-measure-stat__v">
              {stat.value.value}
              {stat.value.unit ? <small>{stat.value.unit}</small> : null}
            </span>
          </div>
        ))}
      </div>

      <div className="nt-seg">
        <button className="nt-seg__btn" disabled={points.length === 0} onClick={onUndo} type="button">
          <Undo2 aria-hidden="true" strokeWidth={1.5} />
          {t("map.measureUndo")}
        </button>
        <button className="nt-seg__btn" disabled={points.length === 0} onClick={onClear} type="button">
          <Trash2 aria-hidden="true" strokeWidth={1.5} />
          {t("map.measureClear")}
        </button>
      </div>

      <p className="nt-measure-hint">{t(readout.hintKey)}</p>
    </>
  );
}
