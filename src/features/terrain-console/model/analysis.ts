import type { GeoPoint, LosState, PointAnalysisResult, ViewshedState } from "./types";
import { TerrainDem } from "./demService";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

const directions8 = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"] as const;

export interface ProgressReporter {
  status: "idle" | "computing";
  message: string;
  progress: number;
  loadedTileCount?: number;
}

function waitFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export async function computeViewshed(
  dem: TerrainDem,
  latitude: number,
  longitude: number,
  radiusKm: number,
  observerHeight: number,
  opacity: number,
  isLive: boolean,
  report: (progress: ProgressReporter) => void,
): Promise<ViewshedState> {
  report({ status: "computing", message: "Calculando viewshed", progress: 0 });
  const startedAt = performance.now();
  const zoom = 10;
  const steps = isLive ? 120 : 200;
  const rays = isLive ? 180 : 360;
  const deltaLat = radiusKm / 111.32;
  const deltaLng = radiusKm / (111.32 * Math.cos(latitude * RAD));
  const tileCount = await dem.ensureTiles(longitude - deltaLng, longitude + deltaLng, latitude - deltaLat, latitude + deltaLat, zoom, (loadedCount) => {
    report({ status: "computing", message: "Cargando DEM", progress: 10, loadedTileCount: loadedCount });
  });

  report({ status: "computing", message: "Calculando viewshed", progress: 15, loadedTileCount: tileCount });

  const gridSize = steps;
  const canvas = document.createElement("canvas");
  canvas.width = gridSize * 2;
  canvas.height = gridSize * 2;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("No se pudo crear el lienzo de viewshed.");
  }

  const imageData = context.createImageData(gridSize * 2, gridSize * 2);
  const observerElevation = dem.getElevation(latitude, longitude, zoom) + observerHeight;
  let visibleCount = 0;
  let totalCount = 0;

  for (let ray = 0; ray < rays; ray += 1) {
    let maxAngle = -Infinity;

    for (let step = 1; step <= steps; step += 1) {
      const fraction = step / steps;
      const distanceMeters = fraction * radiusKm * 1000;
      const sampleLat = latitude + fraction * deltaLat * Math.cos((ray / rays) * 2 * Math.PI);
      const sampleLng = longitude + fraction * deltaLng * Math.sin((ray / rays) * 2 * Math.PI);
      const terrainElevation = dem.getElevation(sampleLat, sampleLng, zoom);
      const elevationAngle = Math.atan2(terrainElevation - observerElevation, distanceMeters);
      const pixelX = Math.floor(gridSize + fraction * gridSize * Math.sin((ray / rays) * 2 * Math.PI));
      const pixelY = Math.floor(gridSize - fraction * gridSize * Math.cos((ray / rays) * 2 * Math.PI));

      if (pixelX < 0 || pixelX >= gridSize * 2 || pixelY < 0 || pixelY >= gridSize * 2) {
        continue;
      }

      const index = (pixelY * gridSize * 2 + pixelX) * 4;
      totalCount += 1;

      if (elevationAngle > maxAngle) {
        maxAngle = elevationAngle;
        imageData.data[index] = 0;
        imageData.data[index + 1] = 255;
        imageData.data[index + 2] = 255;
        imageData.data[index + 3] = 255;
        visibleCount += 1;
      } else {
        imageData.data[index] = 255;
        imageData.data[index + 1] = 0;
        imageData.data[index + 2] = 0;
        imageData.data[index + 3] = 255;
      }
    }

    if (ray % (isLive ? 30 : 36) === 0) {
      report({
        status: "computing",
        message: "Calculando viewshed",
        progress: 15 + Math.round((ray / rays) * 80),
        loadedTileCount: tileCount,
      });
      await waitFrame();
    }
  }

  context.putImageData(imageData, 0, 0);
  const smoothed = document.createElement("canvas");
  smoothed.width = gridSize * 2;
  smoothed.height = gridSize * 2;
  const smoothedContext = smoothed.getContext("2d");

  if (!smoothedContext) {
    throw new Error("No se pudo suavizar el viewshed.");
  }

  smoothedContext.imageSmoothingEnabled = false;
  smoothedContext.drawImage(canvas, 0, 0);

  const percentVisible = totalCount > 0 ? Math.round((visibleCount / totalCount) * 100) : 0;
  const durationSeconds = (performance.now() - startedAt) / 1000;

  report({
    status: "idle",
    message: `Viewshed ${percentVisible}% visible`,
    progress: 100,
    loadedTileCount: tileCount,
  });

  return {
    point: { lat: latitude, lng: longitude },
    corners: [
      [longitude - deltaLng, latitude + deltaLat],
      [longitude + deltaLng, latitude + deltaLat],
      [longitude + deltaLng, latitude - deltaLat],
      [longitude - deltaLng, latitude - deltaLat],
    ],
    imageUrl: smoothed.toDataURL("image/png"),
    opacity,
    percentVisible,
    durationSeconds,
    radiusKm,
    observerHeight,
    live: isLive,
  };
}

export async function computeLos(
  dem: TerrainDem,
  start: GeoPoint,
  end: GeoPoint,
  report: (progress: ProgressReporter) => void,
): Promise<LosState> {
  report({ status: "computing", message: "Calculando LOS", progress: 0 });
  const zoom = 10;
  const sampleCount = 300;
  const deltaLat = end.lat - start.lat;
  const deltaLng = end.lng - start.lng;
  const distanceMeters = Math.sqrt(
    (deltaLat * 111320) ** 2 + (deltaLng * 111320 * Math.cos(((start.lat + end.lat) / 2) * RAD)) ** 2,
  );

  await dem.ensureTiles(
    Math.min(start.lng, end.lng) - 0.01,
    Math.max(start.lng, end.lng) + 0.01,
    Math.min(start.lat, end.lat) - 0.01,
    Math.max(start.lat, end.lat) + 0.01,
    zoom,
  );

  const profile = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const fraction = index / sampleCount;
    profile.push({
      distance: fraction * distanceMeters,
      elevation: dem.getElevation(start.lat + fraction * deltaLat, start.lng + fraction * deltaLng, zoom),
    });
  }

  const observerHeight = profile[0].elevation + 2;
  const targetHeight = profile[sampleCount].elevation + 2;
  let blocked = false;

  for (let index = 1; index < sampleCount; index += 1) {
    if (profile[index].elevation > observerHeight + ((targetHeight - observerHeight) * index) / sampleCount) {
      blocked = true;
      break;
    }
  }

  report({
    status: "idle",
    message: blocked ? "LOS obstruida" : "LOS despejada",
    progress: 100,
  });

  return {
    blocked,
    distanceKm: distanceMeters / 1000,
    elevationDelta: Math.round(profile[sampleCount].elevation - profile[0].elevation),
    profile,
    start,
    end,
  };
}

export async function computeMcooOverlay(
  dem: TerrainDem,
  bounds: { west: number; east: number; south: number; north: number },
  opacity: number,
  report: (progress: ProgressReporter) => void,
) {
  report({ status: "computing", message: "Generando MCOO", progress: 0 });
  const zoom = 10;
  const tileCount = await dem.ensureTiles(bounds.west - 0.01, bounds.east + 0.01, bounds.south - 0.01, bounds.north + 0.01, zoom, (loadedCount) => {
    report({ status: "computing", message: "Cargando DEM", progress: 15, loadedTileCount: loadedCount });
  });
  const width = 250;
  const height = Math.round((width * (bounds.north - bounds.south)) / (bounds.east - bounds.west)) || width;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("No se pudo crear el lienzo MCOO.");
  }

  const imageData = context.createImageData(width, height);

  for (let row = 0; row < height; row += 1) {
    const latitude = bounds.north - ((row + 0.5) / height) * (bounds.north - bounds.south);

    for (let column = 0; column < width; column += 1) {
      const longitude = bounds.west + ((column + 0.5) / width) * (bounds.east - bounds.west);
      const slope = dem.getSlopeAt(latitude, longitude, zoom);
      const index = (row * width + column) * 4;

      if (slope > 45) {
        imageData.data[index] = 198;
        imageData.data[index + 1] = 40;
        imageData.data[index + 2] = 40;
        imageData.data[index + 3] = 130;
      } else if (slope > 30) {
        imageData.data[index] = 232;
        imageData.data[index + 1] = 93;
        imageData.data[index + 2] = 47;
        imageData.data[index + 3] = 110;
      } else {
        imageData.data[index] = 249;
        imageData.data[index + 1] = 178;
        imageData.data[index + 2] = 51;
        imageData.data[index + 3] = 85;
      }
    }

    if (row % 25 === 0) {
      report({
        status: "computing",
        message: "Generando MCOO",
        progress: 20 + Math.round((row / height) * 75),
        loadedTileCount: tileCount,
      });
      await waitFrame();
    }
  }

  context.putImageData(imageData, 0, 0);
  const smoothed = document.createElement("canvas");
  smoothed.width = width * 2;
  smoothed.height = height * 2;
  const smoothedContext = smoothed.getContext("2d");

  if (!smoothedContext) {
    throw new Error("No se pudo suavizar el MCOO.");
  }

  smoothedContext.imageSmoothingEnabled = true;
  smoothedContext.imageSmoothingQuality = "high";
  smoothedContext.drawImage(canvas, 0, 0, smoothed.width, smoothed.height);

  report({
    status: "idle",
    message: "MCOO generado",
    progress: 100,
    loadedTileCount: tileCount,
  });

  return {
    corners: [
      [bounds.west, bounds.north],
      [bounds.east, bounds.north],
      [bounds.east, bounds.south],
      [bounds.west, bounds.south],
    ] as [number, number][],
    imageUrl: smoothed.toDataURL("image/png"),
    opacity,
  };
}

export function analyzePoint(dem: TerrainDem, point: GeoPoint): PointAnalysisResult {
  const zoom = 10;
  const elevation = dem.getElevation(point.lat, point.lng, zoom);
  const slopePercent = dem.getSlopeAt(point.lat, point.lng, zoom);
  const north = dem.getElevation(point.lat + 0.005, point.lng, zoom);
  const south = dem.getElevation(point.lat - 0.005, point.lng, zoom);
  const east = dem.getElevation(point.lat, point.lng + 0.005, zoom);
  const west = dem.getElevation(point.lat, point.lng - 0.005, zoom);
  const dominant = elevation > north && elevation > south && elevation > east && elevation > west;
  const valley = elevation < north && elevation < south && elevation < east && elevation < west;
  const deltaLat = north - south;
  const deltaLng = east - west;
  const aspectDegrees = (Math.atan2(deltaLng, -deltaLat) * DEG + 360) % 360;

  if (slopePercent > 45) {
    return {
      point,
      elevation,
      slopePercent,
      aspectDegrees,
      aspectLabel: directions8[Math.round(aspectDegrees / 45) % 8],
      mobilityLabel: "Severamente restringido",
      mobilityClass: "sev",
      coverLabel: "Buena",
      coverClass: "good",
      isDominantTerrain: dominant,
      isValleyFloor: valley,
    };
  }

  if (slopePercent > 30) {
    return {
      point,
      elevation,
      slopePercent,
      aspectDegrees,
      aspectLabel: directions8[Math.round(aspectDegrees / 45) % 8],
      mobilityLabel: "Restringido",
      mobilityClass: "res",
      coverLabel: "Buena",
      coverClass: "good",
      isDominantTerrain: dominant,
      isValleyFloor: valley,
    };
  }

  return {
    point,
    elevation,
    slopePercent,
    aspectDegrees,
    aspectLabel: directions8[Math.round(aspectDegrees / 45) % 8],
    mobilityLabel: "Sin restricción",
    mobilityClass: "unr",
    coverLabel: slopePercent > 10 ? "Aceptable" : "Pobre",
    coverClass: slopePercent > 10 ? "fair" : "poor",
    isDominantTerrain: dominant,
    isValleyFloor: valley,
  };
}

