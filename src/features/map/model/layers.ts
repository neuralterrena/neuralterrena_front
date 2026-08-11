/**
 * Extension point for future MapLibre sources and layers. The first delivery
 * intentionally has no operational layers.
 */
export interface MapLayerDefinition {
  id: string;
  label: string;
}

export const OROGRAPHY_LAYER_ID = "orography-hillshade";
export const OROGRAPHY_SOURCE_ID = "orography-dem";

export const mapLayerRegistry: readonly MapLayerDefinition[] = [
  {
    id: OROGRAPHY_LAYER_ID,
    label: "Orografía",
  },
];
