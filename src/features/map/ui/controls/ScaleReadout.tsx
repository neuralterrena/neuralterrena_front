import { useLanguage } from "@/shared/providers";
import { formatCoordinate } from "../../model/coordinates";
import { scaleBarStep } from "../../model/geodesy";
import type { MapViewState } from "../../model/useMapView";
import { MapPill } from "./primitives";

const SCALE_MAX_WIDTH_PX = 120;

/**
 * Scale bar plus the coordinate / zoom readout. Both are derived from the live
 * camera, so they answer "how far is that" and "where am I" without the
 * operator leaving the map.
 */
export function ScaleReadout({ view }: { view: MapViewState }) {
  const { t } = useLanguage();
  const step = scaleBarStep(view.metersPerPixel, SCALE_MAX_WIDTH_PX);

  return (
    <>
      <div aria-label={t("map.scale")} className="nt-mapscale">
        <span className="nt-mapscale__label">
          {step.label.value} {step.label.unit}
        </span>
        <div aria-hidden="true" className="nt-mapscale__bar" style={{ width: `${String(step.widthPx)}px` }}>
          <span className="nt-mapscale__seg" />
          <span className="nt-mapscale__seg" />
          <span className="nt-mapscale__seg" />
          <span className="nt-mapscale__seg" />
        </div>
      </div>

      <MapPill label={t("map.centre")}>{formatCoordinate(view.center)}</MapPill>
      <MapPill label={t("map.zoom")}>{view.zoom.toFixed(1)}</MapPill>
    </>
  );
}
