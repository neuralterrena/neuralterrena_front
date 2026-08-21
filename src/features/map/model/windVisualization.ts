const VECTOR_LENGTH_PX = 15;

export function arrowLengthForZoom(zoom: number, referenceZoom: number) {
  return Math.max(8, Math.min(72, VECTOR_LENGTH_PX * 2 ** (zoom - referenceZoom)));
}
