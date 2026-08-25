import { useLanguage } from "@/shared/providers";
import type { BasemapId, MapBasemap } from "../../model/config";

interface BasemapPickerProps {
  basemaps: readonly MapBasemap[];
  onSelect: (id: BasemapId) => void;
  selected: BasemapId;
}

/**
 * Thumbnail basemap switcher. The thumbnails are token gradients standing in
 * for real tile previews — honest placeholders rather than screenshots that
 * would drift from the actual style.
 */
export function BasemapPicker({ basemaps, onSelect, selected }: BasemapPickerProps) {
  const { t } = useLanguage();

  return (
    <div aria-label={t("map.basemap")} className="nt-basemap-grid" role="radiogroup">
      {basemaps.map((basemap) => (
        <button
          aria-checked={basemap.id === selected}
          className="nt-basemap-opt"
          key={basemap.id}
          onClick={() => onSelect(basemap.id)}
          role="radio"
          type="button"
        >
          <span aria-hidden="true" className="nt-basemap-opt__thumb" style={{ background: basemap.swatch }} />
          <span className="nt-basemap-opt__label">{t(basemap.labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
