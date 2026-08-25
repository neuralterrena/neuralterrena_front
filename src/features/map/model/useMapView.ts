import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Map } from "maplibre-gl";
import { metersPerPixel, type LngLat } from "./geodesy";

export interface MapViewState {
  bearing: number;
  center: LngLat;
  metersPerPixel: number;
  pitch: number;
  zoom: number;
}

const readViewState = (map: Map): MapViewState => {
  const center = map.getCenter();
  const zoom = map.getZoom();

  return {
    bearing: map.getBearing(),
    center: { lat: center.lat, lng: center.lng },
    metersPerPixel: metersPerPixel(center.lat, zoom),
    pitch: map.getPitch(),
    zoom,
  };
};

const isSameView = (a: MapViewState, b: MapViewState) =>
  a.bearing === b.bearing &&
  a.pitch === b.pitch &&
  a.zoom === b.zoom &&
  a.center.lat === b.center.lat &&
  a.center.lng === b.center.lng;

/**
 * Track the live camera so the scale bar, coordinate readout and compass stay
 * in step with the map.
 *
 * The map is an external store, so this subscribes to it rather than mirroring
 * it into state. The snapshot is cached and compared field by field: reading
 * the camera allocates a fresh object every call, and returning a new
 * reference each time would spin React forever.
 */
export function useMapView(map: Map | null): MapViewState | null {
  const snapshotRef = useRef<MapViewState | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!map) {
        return () => undefined;
      }

      map.on("move", onStoreChange);
      map.on("rotate", onStoreChange);
      map.on("zoom", onStoreChange);

      return () => {
        map.off("move", onStoreChange);
        map.off("rotate", onStoreChange);
        map.off("zoom", onStoreChange);
      };
    },
    [map],
  );

  const getSnapshot = useCallback(() => {
    if (!map) {
      snapshotRef.current = null;
      return null;
    }

    const next = readViewState(map);
    const previous = snapshotRef.current;

    if (previous && isSameView(previous, next)) {
      return previous;
    }

    snapshotRef.current = next;
    return next;
  }, [map]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Mobile is a distinct interaction mode in the canon — 48px targets, a bottom
 * tab bar, bottom sheets — not just a narrower desktop, so it is resolved from
 * a media query rather than from CSS breakpoints alone.
 */
export function useIsCompactViewport(query = "(max-width: 720px)"): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQuery = globalThis.matchMedia?.(query);
      if (!mediaQuery) {
        return () => undefined;
      }

      mediaQuery.addEventListener("change", onStoreChange);
      return () => mediaQuery.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => globalThis.matchMedia?.(query).matches ?? false, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
