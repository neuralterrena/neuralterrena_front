import { useEffect, useMemo, useRef } from "react";
import "@openglobus/og/styles";
import {
  Entity,
  Extent,
  Globe,
  GeoImage,
  GlobusRgbTerrain,
  LonLat,
  Polyline,
  Vec2,
  Vector,
  XYZ,
} from "@openglobus/og";
import type { GeoPoint, LosState, OverlayImageState, ViewshedState } from "../model/types";

interface OpenGlobusViewportProps {
  basemap: "topo" | "gray";
  cursorCrosshair: boolean;
  infoPoint: GeoPoint | null;
  losPendingPoint: GeoPoint | null;
  losState: LosState | null;
  mcooOverlay: OverlayImageState | null;
  nightOpacity: number;
  pointAnalysisPoint: GeoPoint | null;
  terrainExaggeration: number;
  viewshedState: ViewshedState | null;
  onMapClick: (point: GeoPoint) => void;
  onMapMove: (point: GeoPoint) => void;
  onViewChange: (state: {
    center: GeoPoint;
    pseudoZoom: number;
    bounds: { west: number; east: number; south: number; north: number };
  }) => void;
}

function createCircleDataUri(fill: string, stroke: string, size: number) {
  const radius = size / 2 - 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="3"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function heightToPseudoZoom(height: number) {
  const baseHeight = 20000000;
  const clamped = Math.max(50, height);
  return Math.max(1, Math.min(18, Math.log2(baseHeight / clamped)));
}

const INITIAL_VIEW_EXTENT = Extent.createFromArray([-5.35, 42.77, -4.35, 43.57]);

export function OpenGlobusViewport({
  basemap,
  cursorCrosshair,
  infoPoint,
  losPendingPoint,
  losState,
  mcooOverlay,
  nightOpacity,
  pointAnalysisPoint,
  terrainExaggeration,
  viewshedState,
  onMapClick,
  onMapMove,
  onViewChange,
}: OpenGlobusViewportProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<Globe | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const onMapMoveRef = useRef(onMapMove);
  const onViewChangeRef = useRef(onViewChange);
  const overlayRef = useRef<{
    grayLayer: XYZ;
    handleViewChange: (() => void) | null;
    topoLayer: XYZ;
    vectorLayer: Vector;
    viewshedLayer: GeoImage | null;
    mcooLayer: GeoImage | null;
  } | null>(null);
  const markerIcons = useMemo(
    () => ({
      info: createCircleDataUri("#f9b233", "#ffffff", 20),
      los: createCircleDataUri("#1e4f82", "#ffffff", 18),
      observer: createCircleDataUri("#1e4f82", "#ffffff", 24),
      analysis: createCircleDataUri("#e85d2f", "#ffffff", 20),
    }),
    [],
  );

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onMapMoveRef.current = onMapMove;
  }, [onMapMove]);

  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  useEffect(() => {
    if (!viewportRef.current) {
      return;
    }

    const topoLayer = new XYZ("Topographic", {
      attribution: "© Esri",
      isBaseLayer: true,
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      visibility: true,
    });
    const grayLayer = new XYZ("Light Gray", {
      attribution: "© Esri",
      isBaseLayer: true,
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      visibility: false,
    });

    let isDisposed = false;
    let startFrameId = 0;

    const globe = new Globe({
      target: viewportRef.current,
      autoActivate: false,
      atmosphereEnabled: false,
      controls: [],
      fontsSrc: "/res/fonts",
      layers: [topoLayer, grayLayer],
      msaa: 0,
      terrain: new GlobusRgbTerrain(),
      transitionOpacityEnabled: false,
      viewExtent: INITIAL_VIEW_EXTENT,
      maxAltitude: 15000000,
      minAltitude: 120,
      navigation: {
        mode: "free",
      },
      nightTextureSrc: null,
      resourcesSrc: "/res",
      specularTextureSrc: null,
      sun: {
        active: false,
        stopped: true,
      },
    });

    const vectorLayer = new Vector("Operational overlays", {
      async: false,
      clampToGround: false,
      relativeToGround: true,
    });

    globe.planet.addLayer(vectorLayer);
    globe.planet.setHeightFactor(1.5);

    const handleViewChange = () => {
      const center = globe.planet.camera.getLonLat();
      const extent = globe.planet.getViewExtent();
      onViewChangeRef.current({
        center: {
          lat: center.lat,
          lng: center.lon,
        },
        pseudoZoom: heightToPseudoZoom(globe.planet.camera.getHeight()),
        bounds: {
          west: extent.southWest.lon,
          east: extent.northEast.lon,
          south: extent.southWest.lat,
          north: extent.northEast.lat,
        },
      });
    };

    globe.planet.camera.events.on("viewchange", handleViewChange);

    globeRef.current = globe;
    overlayRef.current = {
      grayLayer,
      handleViewChange,
      topoLayer,
      vectorLayer,
      viewshedLayer: null,
      mcooLayer: null,
    };

    startFrameId = window.requestAnimationFrame(() => {
      if (isDisposed) {
        return;
      }

      globe.start();
      globe.planet.setHeightFactor(1.5);
      globe.planet.camera.setLonLat(new LonLat(-4.85, 43.17, 28000));
      globe.planet.camera.viewExtent(INITIAL_VIEW_EXTENT, 28000);
      handleViewChange();
    });

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(startFrameId);
      globe.planet.camera.events.off("viewchange", handleViewChange);
      globe.destroy();
      globeRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    const overlays = overlayRef.current;

    if (!globe || !overlays) {
      return;
    }

    globe.planet.setBaseLayer(basemap === "topo" ? overlays.topoLayer : overlays.grayLayer);
  }, [basemap]);

  useEffect(() => {
    globeRef.current?.planet.setHeightFactor(terrainExaggeration);
  }, [terrainExaggeration]);

  useEffect(() => {
    const globe = globeRef.current;
    const overlays = overlayRef.current;

    if (!globe || !overlays) {
      return;
    }

    overlays.vectorLayer.clear();

    const entities: Entity[] = [];

    if (viewshedState) {
      entities.push(
        new Entity({
          lonlat: [viewshedState.point.lng, viewshedState.point.lat, 0],
          billboard: {
            src: markerIcons.observer,
            width: 24,
            height: 24,
          },
        }),
      );
    }

    if (losPendingPoint) {
      entities.push(
        new Entity({
          lonlat: [losPendingPoint.lng, losPendingPoint.lat, 0],
          billboard: {
            src: markerIcons.los,
            width: 18,
            height: 18,
          },
        }),
      );
    }

    if (losState) {
      entities.push(
        new Entity({
          polyline: new Polyline({
            color: losState.blocked ? "#c62828" : "#1e4f82",
            thickness: 4,
            pathLonLat: [
              [
                [losState.start.lng, losState.start.lat, 20],
                [losState.end.lng, losState.end.lat, 20],
              ],
            ],
          }),
        }),
      );
      entities.push(
        new Entity({
          lonlat: [losState.start.lng, losState.start.lat, 0],
          billboard: {
            src: markerIcons.observer,
            width: 24,
            height: 24,
          },
        }),
      );
      entities.push(
        new Entity({
          lonlat: [losState.end.lng, losState.end.lat, 0],
          billboard: {
            src: markerIcons.analysis,
            width: 20,
            height: 20,
          },
        }),
      );
    }

    if (infoPoint) {
      entities.push(
        new Entity({
          lonlat: [infoPoint.lng, infoPoint.lat, 0],
          billboard: {
            src: markerIcons.info,
            width: 20,
            height: 20,
          },
        }),
      );
    }

    if (pointAnalysisPoint) {
      entities.push(
        new Entity({
          lonlat: [pointAnalysisPoint.lng, pointAnalysisPoint.lat, 0],
          billboard: {
            src: markerIcons.analysis,
            width: 20,
            height: 20,
          },
        }),
      );
    }

    overlays.vectorLayer.addEntities(entities);
  }, [infoPoint, losPendingPoint, losState, markerIcons, pointAnalysisPoint, viewshedState]);

  useEffect(() => {
    const globe = globeRef.current;
    const overlays = overlayRef.current;

    if (!globe || !overlays) {
      return;
    }

    if (!viewshedState) {
      if (overlays.viewshedLayer) {
        globe.planet.removeLayer(overlays.viewshedLayer);
        overlays.viewshedLayer = null;
      }
      return;
    }

    if (!overlays.viewshedLayer) {
      overlays.viewshedLayer = new GeoImage("Viewshed", {
        corners: viewshedState.corners,
        src: viewshedState.imageUrl,
        opacity: viewshedState.opacity,
      });
      globe.planet.addLayer(overlays.viewshedLayer);
      return;
    }

    overlays.viewshedLayer.setCorners(viewshedState.corners);
    overlays.viewshedLayer.setSrc(viewshedState.imageUrl);
    overlays.viewshedLayer.opacity = viewshedState.opacity;
  }, [viewshedState]);

  useEffect(() => {
    const globe = globeRef.current;
    const overlays = overlayRef.current;

    if (!globe || !overlays) {
      return;
    }

    if (!mcooOverlay) {
      if (overlays.mcooLayer) {
        globe.planet.removeLayer(overlays.mcooLayer);
        overlays.mcooLayer = null;
      }
      return;
    }

    if (!overlays.mcooLayer) {
      overlays.mcooLayer = new GeoImage("MCOO", {
        corners: mcooOverlay.corners,
        src: mcooOverlay.imageUrl,
        opacity: mcooOverlay.opacity,
      });
      globe.planet.addLayer(overlays.mcooLayer);
      return;
    }

    overlays.mcooLayer.setCorners(mcooOverlay.corners);
    overlays.mcooLayer.setSrc(mcooOverlay.imageUrl);
    overlays.mcooLayer.opacity = mcooOverlay.opacity;
  }, [mcooOverlay]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const globe = globeRef.current;

    if (!viewport || !globe) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const rect = viewport.getBoundingClientRect();
      const point = globe.planet.getLonLatFromPixelTerrain(new Vec2(event.clientX - rect.left, event.clientY - rect.top));

      if (!point) {
        return;
      }

      onMapClickRef.current({ lat: point.lat, lng: point.lon });
    };

    const handleMove = (event: MouseEvent) => {
      const rect = viewport.getBoundingClientRect();
      const point = globe.planet.getLonLatFromPixelTerrain(new Vec2(event.clientX - rect.left, event.clientY - rect.top));

      if (!point) {
        return;
      }

      onMapMoveRef.current({ lat: point.lat, lng: point.lon });
    };

    viewport.addEventListener("click", handleClick);
    viewport.addEventListener("mousemove", handleMove);

    return () => {
      viewport.removeEventListener("click", handleClick);
      viewport.removeEventListener("mousemove", handleMove);
    };
  }, []);

  return (
    <div className="terrain-map-viewport">
      <div className="terrain-map-canvas" data-cursor={cursorCrosshair ? "crosshair" : "default"} ref={viewportRef} />
      {nightOpacity > 0.01 ? <div className="terrain-map-night-overlay" style={{ opacity: nightOpacity }} /> : null}
    </div>
  );
}
