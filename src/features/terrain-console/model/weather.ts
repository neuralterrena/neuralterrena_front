import type { OperationAssessment, WeatherState } from "./types";

const PI = Math.PI;

function seededNoise(a: number, b: number) {
  return (Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1;
}

export function getWeather(date: Date, minutes: number): WeatherState {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 864e5);
  const hours = minutes / 60;
  const temperatureC = Math.round(
    (5 +
      12 * Math.sin(((dayOfYear - 80) / 365) * 2 * PI) +
      4 * Math.sin(((hours - 6) / 24) * 2 * PI) +
      2 * seededNoise(dayOfYear * 0.1, hours * 0.3)) *
      10,
  ) / 10;
  const humidity = Math.min(
    100,
    Math.max(
      30,
      Math.round(
        65 +
          15 * Math.cos(((dayOfYear - 1) / 365) * 2 * PI) -
          10 * Math.sin(((hours - 6) / 24) * 2 * PI) +
          seededNoise(dayOfYear * 0.2, hours) * 8,
      ),
    ),
  );
  const dewPointC = Math.round((temperatureC - (100 - humidity) / 5) * 10) / 10;
  const pressureHpa = Math.round(1013 + 8 * Math.sin(((dayOfYear - 100) / 365) * 2 * PI) + 2 * Math.sin((hours / 24) * 2 * PI));
  const directions = ["N", "NNE", "NE", "E", "SE", "S", "SO", "O", "NO", "NNO"];
  const directionIndex = Math.abs(Math.floor(10 * seededNoise(dayOfYear * 0.2, 3.7))) % 10;
  const windKph = Math.round((3 + 5 * Math.abs(Math.sin(((dayOfYear + 30) / 365) * PI)) + 3 * Math.abs(seededNoise(dayOfYear, hours))) * 10) / 10;
  const gustKph = Math.round(windKph * (1.3 + 0.4 * Math.abs(seededNoise(dayOfYear, hours))) * 10) / 10;
  const cloudCover = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        30 +
          20 * Math.cos(((dayOfYear - 1) / 365) * 2 * PI) -
          10 * Math.sin(((hours - 10) / 24) * 2 * PI) +
          seededNoise(dayOfYear * 0.3, hours) * 15,
      ),
    ),
  );

  let sky = "☀ Despejado";

  if (cloudCover >= 15 && cloudCover < 40) {
    sky = "🌤 Poco nuboso";
  } else if (cloudCover >= 40 && cloudCover < 70) {
    sky = "⛅ Nuboso";
  } else if (cloudCover >= 70) {
    sky = "☁ Cubierto";
  }

  let visibilityKm = 10;

  if (humidity > 90) {
    visibilityKm = Math.max(0.5, 5 * (1 - (humidity - 90) / 10));
  }

  if (cloudCover > 80) {
    visibilityKm = Math.min(visibilityKm, 6);
  }

  visibilityKm = Math.round(visibilityKm * 10) / 10;

  let precipitation = "Ninguna";

  if (cloudCover > 70 && humidity > 80) {
    const intensity = ((cloudCover - 70) / 30) * ((humidity - 80) / 20);

    if (intensity > 0.3) {
      precipitation = temperatureC < 2 ? "❄ Nieve" : "🌧 Lluvia";
    } else if (intensity > 0.1) {
      precipitation = "🌦 Llovizna";
    }
  }

  const temperatureDewGap = temperatureC - dewPointC;
  let fogLevel: WeatherState["fogLevel"] = "none";
  let fogLabel = "NULO";

  if (temperatureDewGap < 1 && humidity > 95) {
    fogLevel = "high";
    fogLabel = "ALTO";
  } else if (temperatureDewGap < 3 && humidity > 85) {
    fogLevel = "low";
    fogLabel = "BAJO";
  }

  return {
    temperatureC,
    humidity,
    dewPointC,
    pressureHpa,
    windKph,
    gustKph,
    windDirection: directions[directionIndex],
    windDegrees: directionIndex * 36,
    sky,
    cloudCover,
    visibilityKm,
    precipitation,
    fogLevel,
    fogLabel,
  };
}

export function evaluateOperations(
  weather: WeatherState,
  solarAltitude: number,
  moonFraction: number,
  moonAltitude: number,
): OperationAssessment[] {
  const results: OperationAssessment[] = [];
  const windKnots = weather.windKph * 1.944;
  const visibilityMiles = weather.visibilityKm * 0.621;

  const assess = (name: string, conditions: Array<boolean | null>) => {
    const unfavorable = conditions.filter((value) => value === false).length;
    const marginal = conditions.filter((value) => value === null).length;

    results.push({
      name,
      status: unfavorable > 0 ? "unf" : marginal > 0 ? "mar" : "fav",
    });
  };

  assess("Maniobra mecanizada", [visibilityMiles > 1, weather.precipitation === "Ninguna" || weather.precipitation.includes("Llov")]);
  assess("Infantería desmontada", [visibilityMiles > 0.2, weather.temperatureC < 32 && weather.temperatureC > -10]);
  assess("NVG", [solarAltitude < -6 ? true : null, visibilityMiles > 0.125, weather.cloudCover < 50 ? true : weather.cloudCover < 80 ? null : false]);
  assess("Apoyo fuegos 155mm", [visibilityMiles > 3, windKnots < 35]);
  assess("CAS aéreo", [visibilityMiles > 5 ? true : visibilityMiles > 3 ? null : false]);
  assess("Aviación rotaria", [visibilityMiles > 2 ? true : visibilityMiles > 0.25 ? null : false, windKnots < 20]);
  assess("Ops aerotransportadas", [visibilityMiles > 3 ? true : visibilityMiles > 0.5 ? null : false, windKnots < 10]);
  assess("MEDEVAC", [visibilityMiles > (solarAltitude > 0 ? 2 : 3) ? true : visibilityMiles > 1 ? null : false, moonFraction >= 0.25 && moonAltitude > 30 ? true : solarAltitude > 0 ? true : null]);
  assess("UAS Gray Eagle", [visibilityMiles > 3 ? true : visibilityMiles > 1 ? null : false, windKnots < 26]);
  assess("Sensores visuales", [visibilityMiles > 2 ? true : visibilityMiles > 0.6 ? null : false, weather.humidity < 80 ? true : weather.humidity < 90 ? null : false]);
  assess("Sensores IR", [visibilityMiles > 2, weather.humidity < 80 ? true : weather.humidity < 90 ? null : false]);
  assess("Defensa antiaérea", [visibilityMiles > 3 ? true : visibilityMiles > 1 ? null : false, windKnots < 35]);

  return results;
}

