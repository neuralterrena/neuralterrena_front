import { Crosshair, Maximize2, Minimize2, Minus, Navigation, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Map } from "maplibre-gl";
import { useLanguage } from "@/shared/providers";
import { MapButton, MapGroup, MapGroupDivider } from "./primitives";

interface NavigationClusterProps {
  bearing: number;
  map: Map;
  onLocationError: (message: string) => void;
}

/**
 * Zoom, compass, my-location and fullscreen — the always-present navigation
 * cluster from the canon, replacing MapLibre's own NavigationControl so the
 * controls carry Neural Terrena's surfaces instead of MapLibre's.
 */
export function NavigationCluster({ bearing, map, onLocationError }: NavigationClusterProps) {
  const { t } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullscreen = () => {
    const target = map.getContainer().closest(".nt-map") ?? document.documentElement;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void target.requestFullscreen?.().catch(() => onLocationError(t("map.fullscreenUnavailable")));
  };

  const locate = () => {
    if (!navigator.geolocation) {
      onLocationError(t("map.locationUnsupported"));
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        map.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: Math.max(map.getZoom(), 12),
        });
      },
      () => {
        setIsLocating(false);
        onLocationError(t("map.locationDenied"));
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <>
      <MapGroup label={t("map.zoomControls")}>
        <MapButton label={t("map.zoomIn")} onClick={() => map.zoomIn()}>
          <Plus aria-hidden="true" strokeWidth={1.5} />
        </MapButton>
        <MapGroupDivider />
        <MapButton label={t("map.zoomOut")} onClick={() => map.zoomOut()}>
          <Minus aria-hidden="true" strokeWidth={1.5} />
        </MapButton>
        <MapGroupDivider />
        <MapButton label={t("map.resetNorth")} onClick={() => map.resetNorthPitch()}>
          {/* The needle rotates with the camera, so the control reports bearing
              as well as resetting it. */}
          <Navigation
            aria-hidden="true"
            strokeWidth={1.5}
            style={{ transform: `rotate(${String(-bearing)}deg)` }}
          />
        </MapButton>
      </MapGroup>

      <MapGroup label={t("map.viewControls")}>
        <MapButton
          disabled={isLocating}
          label={isLocating ? t("map.locating") : t("map.myLocation")}
          onClick={locate}
        >
          <Crosshair aria-hidden="true" strokeWidth={1.5} />
        </MapButton>
        <MapGroupDivider />
        <MapButton
          active={isFullscreen}
          label={isFullscreen ? t("map.exitFullscreen") : t("map.fullscreen")}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 aria-hidden="true" strokeWidth={1.5} />
          ) : (
            <Maximize2 aria-hidden="true" strokeWidth={1.5} />
          )}
        </MapButton>
      </MapGroup>
    </>
  );
}
