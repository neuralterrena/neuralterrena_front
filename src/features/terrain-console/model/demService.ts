const RAD = Math.PI / 180;

export class TerrainDem {
  private readonly cache = new Map<string, Float32Array>();

  private readonly pending = new Map<string, Promise<Float32Array>>();

  constructor(private readonly tileUrlTemplate = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png") {}

  private getTileKey(tx: number, ty: number, tz: number) {
    return `${tz}/${tx}/${ty}`;
  }

  async fetchTile(tx: number, ty: number, tz: number) {
    const tileKey = this.getTileKey(tx, ty, tz);

    if (this.cache.has(tileKey)) {
      return this.cache.get(tileKey)!;
    }

    if (this.pending.has(tileKey)) {
      return this.pending.get(tileKey)!;
    }

    const promise = new Promise<Float32Array>((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (!context) {
          const empty = new Float32Array(65536);
          this.cache.set(tileKey, empty);
          this.pending.delete(tileKey);
          resolve(empty);
          return;
        }

        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, 256, 256).data;
        const elevations = new Float32Array(65536);

        for (let index = 0; index < 65536; index += 1) {
          elevations[index] = pixels[index * 4] * 256 + pixels[index * 4 + 1] + pixels[index * 4 + 2] / 256 - 32768;
        }

        this.cache.set(tileKey, elevations);
        this.pending.delete(tileKey);
        resolve(elevations);
      };
      image.onerror = () => {
        const empty = new Float32Array(65536);
        this.cache.set(tileKey, empty);
        this.pending.delete(tileKey);
        resolve(empty);
      };
      image.src = this.tileUrlTemplate.replace("{z}", String(tz)).replace("{x}", String(tx)).replace("{y}", String(ty));
    });

    this.pending.set(tileKey, promise);
    return promise;
  }

  getElevation(latitude: number, longitude: number, zoom: number) {
    const tileCount = 1 << zoom;
    const tileXFloat = ((longitude + 180) / 360) * tileCount;
    const latitudeRad = latitude * RAD;
    const tileYFloat = ((1 - Math.log(Math.tan(latitudeRad) + 1 / Math.cos(latitudeRad)) / Math.PI) / 2) * tileCount;
    const tileX = Math.floor(tileXFloat);
    const tileY = Math.floor(tileYFloat);
    const tile = this.cache.get(this.getTileKey(tileX, tileY, zoom));

    if (!tile) {
      return 0;
    }

    const x = Math.min(255, Math.max(0, Math.floor((tileXFloat - tileX) * 256)));
    const y = Math.min(255, Math.max(0, Math.floor((tileYFloat - tileY) * 256)));

    return tile[y * 256 + x];
  }

  async ensureTiles(west: number, east: number, south: number, north: number, zoom: number, onProgress?: (loadedCount: number) => void) {
    const tileCount = 1 << zoom;
    const minX = Math.floor(((west + 180) / 360) * tileCount);
    const maxX = Math.floor(((east + 180) / 360) * tileCount);
    const minY = Math.floor(((1 - Math.log(Math.tan(north * RAD) + 1 / Math.cos(north * RAD)) / Math.PI) / 2) * tileCount);
    const maxY = Math.floor(((1 - Math.log(Math.tan(south * RAD) + 1 / Math.cos(south * RAD)) / Math.PI) / 2) * tileCount);
    const tasks: Promise<Float32Array>[] = [];
    let loadedCount = 0;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        tasks.push(
          this.fetchTile(x, y, zoom).then((result) => {
            loadedCount += 1;
            onProgress?.(loadedCount);
            return result;
          }),
        );
      }
    }

    await Promise.all(tasks);
    return tasks.length;
  }

  getSlopeAt(latitude: number, longitude: number, zoom: number) {
    const step = 0.001;
    const north = this.getElevation(latitude + step, longitude, zoom);
    const south = this.getElevation(latitude - step, longitude, zoom);
    const east = this.getElevation(latitude, longitude + step, zoom);
    const west = this.getElevation(latitude, longitude - step, zoom);
    const gradientLat = (north - south) / (2 * step * 111320);
    const gradientLng = (east - west) / (2 * step * 111320 * Math.cos(latitude * RAD));

    return Math.sqrt(gradientLat * gradientLat + gradientLng * gradientLng) * 100;
  }
}

