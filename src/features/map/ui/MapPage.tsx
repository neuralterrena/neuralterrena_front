import { Globe2, Map as MapIcon } from "lucide-react";
import { useState } from "react";
import { readMapConfiguration, type MapProjection } from "../model/config";
import { MapLibreViewport } from "./MapLibreViewport";

const configuration = readMapConfiguration();

export function MapPage() {
  const [projection, setProjection] = useState<MapProjection>("mercator");
  const [mapError, setMapError] = useState<string | null>(null);

  return (
    <main className="map-page">
      <MapLibreViewport
        configuration={configuration}
        onError={setMapError}
        projection={projection}
      />
      <div aria-label="Modo de visualización" className="map-projection-control" role="group">
        <button
          aria-pressed={projection === "mercator"}
          onClick={() => setProjection("mercator")}
          type="button"
        >
          <MapIcon aria-hidden="true" size={17} />
          Relieve 3D
        </button>
        <button
          aria-pressed={projection === "globe"}
          onClick={() => setProjection("globe")}
          type="button"
        >
          <Globe2 aria-hidden="true" size={17} />
          Globo
        </button>
      </div>
      {mapError ? (
        <div className="map-error-state" role="alert">
          <strong>No se pudo cargar el mapa.</strong>
          <span>{mapError}</span>
        </div>
      ) : null}
    </main>
  );
}
