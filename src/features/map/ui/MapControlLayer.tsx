import { Globe2, Layers3, Map as MapIcon, Mountain, Ruler, Search, Settings2, SlidersHorizontal } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import type { Map } from "maplibre-gl";
import type { TranslationKey } from "@/shared/i18n";
import { useLanguage, useTheme } from "@/shared/providers";
import type { ThemePreference } from "@/shared/providers";
import type { BasemapId, MapBasemap } from "../model/config";
import type { LngLat } from "../model/geodesy";
import type { MeasureMode } from "../model/measure";
import type { MeasureController } from "../model/useMeasure";
import type { MapViewState } from "../model/useMapView";
import { BasemapPicker } from "./controls/BasemapPicker";
import { MapSearchControl } from "./controls/MapSearchControl";
import { MeasureControl } from "./controls/MeasureControl";
import { MobileBar, MapSheet, type MobileTab } from "./controls/MobileBar";
import { NavigationCluster } from "./controls/NavigationCluster";
import { ScaleReadout } from "./controls/ScaleReadout";
import { MapButton, MapGroup, MapGroupDivider, MapPanel, MapRow } from "./controls/primitives";

export type MapViewMode = "terrain" | "globe" | "flat";
export type PanelId = "layers" | "basemap" | "measure" | "settings" | "search";

interface MapControlLayerProps {
  /**
   * Controlled by the page: which tool is open decides whether the measure
   * tool is listening for map clicks, so the two cannot be allowed to drift.
   */
  activePanel: PanelId | null;
  basemaps: readonly MapBasemap[];
  compact: boolean;
  /** The forecast panel body, owned by the page that owns forecast state. */
  forecastPanel: ReactNode;
  forecastPanelTitle: string;
  legend: ReactNode;
  map: Map;
  measure: MeasureController;
  measureMode: MeasureMode;
  onBasemapChange: (id: BasemapId) => void;
  onMeasureModeChange: (mode: MeasureMode) => void;
  onNotice: (message: string) => void;
  onPanelChange: (panel: PanelId | null) => void;
  onViewModeChange: (mode: MapViewMode) => void;
  selectedBasemap: BasemapId;
  status: ReactNode;
  view: MapViewState | null;
  viewMode: MapViewMode;
}

const THEME_LABEL_KEYS = {
  dark: "app.themeDark",
  light: "app.themeLight",
  system: "app.themeSystem",
} as const satisfies Record<ThemePreference, TranslationKey>;

const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

/**
 * The map-control chrome from the design system's Map Controls kit: corner
 * clusters on desktop, a bottom tab bar with sheets on compact viewports.
 *
 * This owns the control surfaces only. Forecast state stays with the page that
 * owns it and arrives as `forecastPanel` / `legend`, so the chrome does not
 * grow domain knowledge it has no business holding.
 */
export function MapControlLayer({
  activePanel,
  basemaps,
  compact,
  forecastPanel,
  forecastPanelTitle,
  legend,
  map,
  measure,
  measureMode,
  onBasemapChange,
  onMeasureModeChange,
  onNotice,
  onPanelChange,
  onViewModeChange,
  selectedBasemap,
  status,
  view,
  viewMode,
}: MapControlLayerProps) {
  const { t } = useLanguage();
  const { setThemePreference, themePreference } = useTheme();

  const toggle = (panel: PanelId) => onPanelChange(activePanel === panel ? null : panel);
  const flyTo = (point: LngLat) => map.flyTo({ center: [point.lng, point.lat], zoom: Math.max(map.getZoom(), 11) });

  const viewModes: { icon: ReactNode; label: string; value: MapViewMode }[] = [
    { icon: <Mountain aria-hidden="true" strokeWidth={1.5} />, label: t("map.terrain"), value: "terrain" },
    { icon: <Globe2 aria-hidden="true" strokeWidth={1.5} />, label: t("map.viewGlobe"), value: "globe" },
    { icon: <MapIcon aria-hidden="true" strokeWidth={1.5} />, label: t("map.flat"), value: "flat" },
  ];

  const panelTitles: Record<PanelId, string> = {
    basemap: t("map.basemap"),
    layers: forecastPanelTitle,
    measure: t("map.measure"),
    search: t("map.searchLabel"),
    settings: t("map.settings"),
  };

  const panelBody = (panel: PanelId): ReactNode => {
    if (panel === "layers") return forecastPanel;
    if (panel === "basemap") {
      return <BasemapPicker basemaps={basemaps} onSelect={onBasemapChange} selected={selectedBasemap} />;
    }
    if (panel === "measure") {
      return (
        <MeasureControl
          mode={measureMode}
          onClear={measure.clear}
          onModeChange={onMeasureModeChange}
          onUndo={measure.undo}
          points={measure.points}
        />
      );
    }
    if (panel === "search") return <MapSearchControl onSelect={flyTo} />;

    return (
      <>
        <span className="nt-mappanel__title">{t("map.projectionMode")}</span>
        {viewModes.map((mode) => (
          <MapRow
            checked={viewMode === mode.value}
            control="radio"
            key={mode.value}
            label={mode.label}
            onToggle={() => onViewModeChange(mode.value)}
            role="radio"
          />
        ))}
        <span className="nt-mappanel__title">{t("app.theme")}</span>
        {THEME_PREFERENCES.map((preference) => (
          <MapRow
            checked={themePreference === preference}
            control="radio"
            key={preference}
            label={t(THEME_LABEL_KEYS[preference])}
            onToggle={() => setThemePreference(preference)}
            role="radio"
          />
        ))}
      </>
    );
  };

  /**
   * A basemap switcher with a single option is furniture, not a control: it
   * only appears once the environment configures a second style.
   */
  const toolButtons: { icon: ReactNode; label: string; panel: PanelId }[] = [
    { icon: <Layers3 aria-hidden="true" strokeWidth={1.5} />, label: forecastPanelTitle, panel: "layers" },
    ...(basemaps.length > 1
      ? [{ icon: <SlidersHorizontal aria-hidden="true" strokeWidth={1.5} />, label: t("map.basemap"), panel: "basemap" as const }]
      : []),
    { icon: <Ruler aria-hidden="true" strokeWidth={1.5} />, label: t("map.measure"), panel: "measure" },
    { icon: <Settings2 aria-hidden="true" strokeWidth={1.5} />, label: t("map.settings"), panel: "settings" },
  ];

  const tools = (
    <MapGroup label={t("map.tools")}>
      {toolButtons.map((tool, index) => (
        <Fragment key={tool.panel}>
          {index > 0 ? <MapGroupDivider /> : null}
          <MapButton active={activePanel === tool.panel} label={tool.label} onClick={() => toggle(tool.panel)}>
            {tool.icon}
          </MapButton>
        </Fragment>
      ))}
    </MapGroup>
  );

  const mobileTabs: MobileTab<PanelId>[] = [
    { icon: <Search aria-hidden="true" strokeWidth={1.5} />, label: t("map.searchShort"), value: "search" },
    { icon: <Layers3 aria-hidden="true" strokeWidth={1.5} />, label: t("map.layersShort"), value: "layers" },
    ...(basemaps.length > 1
      ? [{ icon: <SlidersHorizontal aria-hidden="true" strokeWidth={1.5} />, label: t("map.basemapShort"), value: "basemap" as const }]
      : []),
    { icon: <Ruler aria-hidden="true" strokeWidth={1.5} />, label: t("map.measureShort"), value: "measure" },
    { icon: <Settings2 aria-hidden="true" strokeWidth={1.5} />, label: t("map.settingsShort"), value: "settings" },
  ];

  if (compact) {
    return (
      <>
        <div className="nt-map__corner nt-map__corner--tl">{status}</div>
        <div className="nt-map__corner nt-map__corner--tr">
          <NavigationCluster bearing={view?.bearing ?? 0} map={map} onLocationError={onNotice} />
        </div>
        <div className="nt-map__corner nt-map__corner--bl">{view ? <ScaleReadout view={view} /> : null}</div>

        {activePanel ? (
          <MapSheet label={panelTitles[activePanel]}>
            <MapPanel
              closeLabel={t("map.closePanel")}
              onClose={() => onPanelChange(null)}
              title={panelTitles[activePanel]}
            >
              {panelBody(activePanel)}
            </MapPanel>
          </MapSheet>
        ) : null}

        <MobileBar label={t("map.tools")} onSelect={onPanelChange} selected={activePanel} tabs={mobileTabs} />
      </>
    );
  }

  return (
    <>
      <div className="nt-map__corner nt-map__corner--tl">
        <MapSearchControl onSelect={flyTo} />
        <MapGroup label={t("map.projectionMode")} row>
          {viewModes.map((mode, index) => (
            <Fragment key={mode.value}>
              {index > 0 ? <MapGroupDivider /> : null}
              <MapButton
                active={viewMode === mode.value}
                label={mode.label}
                onClick={() => onViewModeChange(mode.value)}
              >
                {mode.icon}
              </MapButton>
            </Fragment>
          ))}
        </MapGroup>
        {status}
      </div>

      <div className="nt-map__corner nt-map__corner--tr">
        <NavigationCluster bearing={view?.bearing ?? 0} map={map} onLocationError={onNotice} />
        {tools}
        {activePanel ? (
          <MapPanel
            closeLabel={t("map.closePanel")}
            onClose={() => onPanelChange(null)}
            title={panelTitles[activePanel]}
            wide={activePanel === "layers"}
          >
            {panelBody(activePanel)}
          </MapPanel>
        ) : null}
      </div>

      <div className="nt-map__corner nt-map__corner--bl">{view ? <ScaleReadout view={view} /> : null}</div>
      <div className="nt-map__corner nt-map__corner--br">{legend}</div>
    </>
  );
}
