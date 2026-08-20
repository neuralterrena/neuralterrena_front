import { useEffect, useRef } from "react";
import type { Map } from "maplibre-gl";
import type { WindField } from "../api/forecastMapApi";

interface Particle { latitude: number; longitude: number; age: number; }
interface Props { field: WindField | null; map: Map | null; mode: "particles" | "arrows"; }

const PARTICLE_COUNT = 360;
const PARTICLE_STEP = 0.0025;
const VECTOR_LENGTH_PX = 15;

export function arrowLengthForZoom(zoom: number, referenceZoom: number) {
  return Math.max(8, Math.min(72, VECTOR_LENGTH_PX * 2 ** (zoom - referenceZoom)));
}

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

export function WindParticles({ field, map, mode }: Props) {
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
      const latitudeIndex = field.latitudes.reduce((best, value, index) => Math.abs(value - latitude) < Math.abs(field.latitudes[best] - latitude) ? index : best, 0);
      const longitudeIndex = field.longitudes.reduce((best, value, index) => Math.abs(value - longitude) < Math.abs(field.longitudes[best] - longitude) ? index : best, 0);
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

  return <canvas aria-label="Vectores de viento animados" className="wind-particles" ref={canvasRef} role="img" />;
}
