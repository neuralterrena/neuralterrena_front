import { useEffect, useRef } from "react";
import type { Map } from "maplibre-gl";
import type { WindField } from "../api/forecastMapApi";
import { arrowLengthForZoom } from "../model/windVisualization";
import { useLanguage } from "@/shared/providers";

interface Particle { latitude: number; longitude: number; age: number; }
interface Props { field: WindField | null; map: Map | null; mode: "particles" | "arrows"; }

const PARTICLE_COUNT = 360;
const PARTICLE_STEP = 0.0025;

function drawArrow(context: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) {
  const angle = Math.atan2(endY - startY, endX - startX);
  const headLength = 5;
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
  context.moveTo(endX, endY);
  context.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
  context.stroke();
}

// ⚡ Bolt: Fast binary search implementation to replace O(N) Array.reduce lookup.
// This function runs hundreds of thousands of times per second (Particles x 60fps),
// so switching from O(N) to O(log N) significantly improves CPU usage and battery life.
function getClosestIndex(arr: readonly number[], val: number): number {
  let low = 0;
  let high = arr.length - 1;
  const isAscending = arr[0] < arr[high];

  if (isAscending) {
    if (val <= arr[0]) return 0;
    if (val >= arr[high]) return high;
  } else {
    if (val >= arr[0]) return 0;
    if (val <= arr[high]) return high;
  }

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (arr[mid] === val) return mid;

    if (isAscending) {
      if (arr[mid] < val) low = mid + 1;
      else high = mid - 1;
    } else {
      if (arr[mid] > val) low = mid + 1;
      else high = mid - 1;
    }
  }

  const idx1 = Math.min(Math.max(low, 0), arr.length - 1);
  const idx2 = Math.min(Math.max(low - 1, 0), arr.length - 1);
  return Math.abs(arr[idx1] - val) < Math.abs(arr[idx2] - val) ? idx1 : idx2;
}

export function WindParticles({ field, map, mode }: Props) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!field || !map || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    const particleCount = mode === "arrows" ? Math.round(PARTICLE_COUNT / 4) : PARTICLE_COUNT;
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      latitude: field.latitudes[Math.floor(Math.random() * field.latitudes.length)],
      longitude: field.longitudes[Math.floor(Math.random() * field.longitudes.length)],
      age: Math.random() * 80,
    }));
    const minLatitude = Math.min(...field.latitudes);
    const maxLatitude = Math.max(...field.latitudes);
    const minLongitude = Math.min(...field.longitudes);
    const maxLongitude = Math.max(...field.longitudes);
    const referenceZoom = map.getZoom();
    const reset = (particle: Particle) => {
      particle.latitude = field.latitudes[Math.floor(Math.random() * field.latitudes.length)];
      particle.longitude = field.longitudes[Math.floor(Math.random() * field.longitudes.length)];
      particle.age = 0;
    };
    const velocity = (latitude: number, longitude: number) => {
      const latitudeIndex = getClosestIndex(field.latitudes, latitude);
      const longitudeIndex = getClosestIndex(field.longitudes, longitude);
      return [field.u[latitudeIndex][longitudeIndex], field.v[latitudeIndex][longitudeIndex]] as const;
    };
    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      const rect = map.getCanvas().getBoundingClientRect();
      const pixelRatio = devicePixelRatio;
      canvas.width = Math.round(rect.width * pixelRatio);
      canvas.height = Math.round(rect.height * pixelRatio);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 1.8;
      context.shadowBlur = 2;
      context.shadowColor = "rgba(255, 255, 255, .85)";
      context.strokeStyle = "rgba(15, 61, 92, .92)";
      const vectorLength = arrowLengthForZoom(map.getZoom(), referenceZoom);

      for (const particle of particles) {
        const [u, v] = velocity(particle.latitude, particle.longitude);
        const start = map.project([particle.longitude, particle.latitude]);
        const magnitude = Math.hypot(u, v);
        if (magnitude > 0) drawArrow(context, start.x, start.y, start.x + (u / magnitude) * vectorLength, start.y - (v / magnitude) * vectorLength);
        const latitudeRadians = (particle.latitude * Math.PI) / 180;
        if (mode === "particles" && !reducedMotion) {
          particle.longitude += (u * PARTICLE_STEP) / Math.max(0.2, Math.cos(latitudeRadians));
          particle.latitude += v * PARTICLE_STEP;
          particle.age += 1;
          if (particle.age > 100 || particle.latitude < minLatitude || particle.latitude > maxLatitude || particle.longitude < minLongitude || particle.longitude > maxLongitude) reset(particle);
        }
      }
      if (!document.hidden && !reducedMotion && mode === "particles") frame = requestAnimationFrame(draw);
    };

    draw();
    if (mode === "arrows") {
      map.on("move", draw);
      map.on("resize", draw);
    }
    return () => {
      cancelAnimationFrame(frame);
      map.off("move", draw);
      map.off("resize", draw);
    };
  }, [field, map, mode]);

  return <canvas aria-label={t("map.vectorWind")} className="wind-particles" ref={canvasRef} role="img" />;
}
