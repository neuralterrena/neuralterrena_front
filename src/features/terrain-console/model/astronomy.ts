import type { MoonState, SolarPhase, SolarState, SolarTimes } from "./types";

const PI = Math.PI;
const RAD = PI / 180;
const DEG = 180 / PI;

const directions8 = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"] as const;

function toDays(date: Date) {
  return date.valueOf() / 864e5 - 0.5 + 2440588 - 2451545;
}

function fromJulian(julianDate: number) {
  return new Date((julianDate + 0.5 - 2440588) * 864e5);
}

function solarMeanAnomaly(days: number) {
  return RAD * (357.5291 + 0.98560028 * days);
}

function eclipticLongitude(meanAnomaly: number) {
  return (
    meanAnomaly +
    RAD * (1.9148 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly) + 0.0003 * Math.sin(3 * meanAnomaly)) +
    RAD * 102.9372 +
    PI
  );
}

function sunDeclination(longitude: number) {
  return Math.asin(Math.sin(longitude) * Math.sin(RAD * 23.4397));
}

function rightAscension(longitude: number, latitude = 0) {
  return Math.atan2(
    Math.sin(longitude) * Math.cos(RAD * 23.4397) - Math.tan(latitude) * Math.sin(RAD * 23.4397),
    Math.cos(longitude),
  );
}

function siderealTime(days: number, longitude: number) {
  return RAD * (280.16 + 360.9856235 * days) - longitude;
}

export function getSunPosition(date: Date, latitude: number, longitude: number) {
  const lng = RAD * -longitude;
  const lat = RAD * latitude;
  const days = toDays(date);
  const meanAnomaly = solarMeanAnomaly(days);
  const solarLongitude = eclipticLongitude(meanAnomaly);
  const declination = sunDeclination(solarLongitude);
  const hourAngle = siderealTime(days, lng) - rightAscension(solarLongitude);

  return {
    altitude:
      Math.asin(Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)) *
      DEG,
    azimuth:
      (Math.atan2(
        Math.sin(hourAngle),
        Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat),
      ) *
        DEG +
        180) %
      360,
  };
}

function computeTimeWindow(date: Date, latitude: number, longitude: number, angleDegrees: number) {
  const lng = RAD * -longitude;
  const lat = RAD * latitude;
  const days = toDays(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  const meanAnomaly = solarMeanAnomaly(days);
  const solarLongitude = eclipticLongitude(meanAnomaly);
  const declination = sunDeclination(solarLongitude);
  const n = Math.round(days - 0.0009 - lng / (2 * PI));
  const ds = 0.0009 + lng / (2 * PI) + n;
  const adjustedAnomaly = solarMeanAnomaly(ds + 2451545 - 2440588 + 0.5);
  const adjustedLongitude = eclipticLongitude(adjustedAnomaly);
  const solarNoon = 2451545 + ds + 0.0053 * Math.sin(adjustedAnomaly) - 0.0069 * Math.sin(2 * adjustedLongitude);
  const cosine =
    (Math.sin(angleDegrees * RAD) - Math.sin(lat) * Math.sin(declination)) / (Math.cos(lat) * Math.cos(declination));

  if (Math.abs(cosine) > 1) {
    return { rise: null, set: null };
  }

  const hourAngle = Math.acos(cosine);
  const julianSet = 2451545 + (0.0009 + (hourAngle + lng) / (2 * PI) + n) + 0.0053 * Math.sin(adjustedAnomaly) - 0.0069 * Math.sin(2 * adjustedLongitude);

  return {
    rise: fromJulian(solarNoon - (julianSet - solarNoon)),
    set: fromJulian(julianSet),
  };
}

export function getSunTimes(date: Date, latitude: number, longitude: number): SolarTimes {
  const sunrise = computeTimeWindow(date, latitude, longitude, -0.833);
  const civil = computeTimeWindow(date, latitude, longitude, -6);
  const nautical = computeTimeWindow(date, latitude, longitude, -12);

  return {
    sunrise: sunrise.rise,
    sunset: sunrise.set,
    civilDawn: civil.rise,
    civilDusk: civil.set,
    nauticalDawn: nautical.rise,
    nauticalDusk: nautical.set,
  };
}

function moonCoordinates(days: number) {
  const longitude = RAD * (218.316 + 13.176396 * days);
  const anomaly = RAD * (134.963 + 13.064993 * days);
  const latitude = RAD * (93.272 + 13.22935 * days);
  const eclipticLongitudeMoon = longitude + RAD * 6.289 * Math.sin(anomaly);
  const eclipticLatitudeMoon = RAD * 5.128 * Math.sin(latitude);

  return {
    rightAscension: rightAscension(eclipticLongitudeMoon, eclipticLatitudeMoon),
    declination: Math.asin(
      Math.sin(eclipticLatitudeMoon) * Math.cos(RAD * 23.4397) +
        Math.cos(eclipticLatitudeMoon) * Math.sin(RAD * 23.4397) * Math.sin(eclipticLongitudeMoon),
    ),
    distance: 385001 - 20905 * Math.cos(anomaly),
  };
}

export function getMoonPosition(date: Date, latitude: number, longitude: number) {
  const lng = RAD * -longitude;
  const lat = RAD * latitude;
  const days = toDays(date);
  const moon = moonCoordinates(days);
  const hourAngle = RAD * (280.16 + 360.9856235 * days) - lng - moon.rightAscension;
  let altitude = Math.asin(
    Math.sin(lat) * Math.sin(moon.declination) +
      Math.cos(lat) * Math.cos(moon.declination) * Math.cos(hourAngle),
  );

  altitude += RAD * Math.asin(6371 / moon.distance) * Math.cos(altitude);

  return {
    altitude: altitude * DEG,
    azimuth:
      (Math.atan2(
        Math.sin(hourAngle),
        Math.cos(hourAngle) * Math.sin(lat) - Math.tan(moon.declination) * Math.cos(lat),
      ) *
        DEG +
        180) %
      360,
    distance: moon.distance,
  };
}

export function getMoonIllumination(date: Date) {
  const days = toDays(date);
  const solarAnomaly = RAD * (357.5291 + 0.98560028 * days);
  const solarLongitude = eclipticLongitude(solarAnomaly);
  const solarDeclination = Math.asin(Math.sin(solarLongitude) * Math.sin(RAD * 23.4397));
  const solarRightAscension = Math.atan2(Math.sin(solarLongitude) * Math.cos(RAD * 23.4397), Math.cos(solarLongitude));
  const moon = moonCoordinates(days);
  const phaseAngle = Math.acos(
    Math.sin(solarDeclination) * Math.sin(moon.declination) +
      Math.cos(solarDeclination) * Math.cos(moon.declination) * Math.cos(solarRightAscension - moon.rightAscension),
  );
  const incidence = Math.atan2(149598e3 * Math.sin(phaseAngle), moon.distance - 149598e3 * Math.cos(phaseAngle));
  const angle = Math.atan2(
    Math.cos(solarDeclination) * Math.sin(solarRightAscension - moon.rightAscension),
    Math.sin(solarDeclination) * Math.cos(moon.declination) -
      Math.cos(solarDeclination) * Math.sin(moon.declination) * Math.cos(solarRightAscension - moon.rightAscension),
  );

  return {
    fraction: (1 + Math.cos(incidence)) / 2,
    phase: 0.5 + (0.5 * incidence * (angle < 0 ? -1 : 1)) / PI,
  };
}

export function getMoonTimes(date: Date, latitude: number, longitude: number) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const horizonCrossings: number[] = [];

  for (let hour = 0; hour <= 24; hour += 2) {
    horizonCrossings.push(getMoonPosition(new Date(start.getTime() + hour * 36e5), latitude, longitude).altitude - 0.583);
  }

  let rise: Date | null = null;
  let set: Date | null = null;

  const refine = (startHour: number, endHour: number, isRise: boolean) => {
    let left = startHour;
    let right = endHour;

    for (let iteration = 0; iteration < 8; iteration += 1) {
      const mid = (left + right) / 2;
      const altitude = getMoonPosition(new Date(start.getTime() + mid * 36e5), latitude, longitude).altitude - 0.583;

      if ((altitude > 0) === isRise) {
        right = mid;
      } else {
        left = mid;
      }
    }

    return new Date(start.getTime() + (isRise ? right : left) * 36e5);
  };

  for (let index = 0; index < horizonCrossings.length - 1; index += 1) {
    if (horizonCrossings[index] <= 0 && horizonCrossings[index + 1] > 0) {
      rise = refine(index * 2, (index + 1) * 2, true);
    }

    if (horizonCrossings[index] > 0 && horizonCrossings[index + 1] <= 0) {
      set = refine(index * 2, (index + 1) * 2, false);
    }
  }

  return { rise, set };
}

export function getMoonPhaseName(phase: number) {
  if (phase < 0.03 || phase > 0.97) return "Luna nueva";
  if (phase < 0.22) return "Creciente";
  if (phase < 0.28) return "Cuarto creciente";
  if (phase < 0.47) return "Gibosa creciente";
  if (phase < 0.53) return "Luna llena";
  if (phase < 0.72) return "Gibosa menguante";
  if (phase < 0.78) return "Cuarto menguante";
  return "Menguante";
}

export function getDirectionLabel(azimuth: number) {
  return directions8[Math.round(azimuth / 45) % 8];
}

export function getSolarPhase(altitude: number): SolarPhase {
  if (altitude > 0) return "day";
  if (altitude > -6) return "civil";
  if (altitude > -12) return "nautical";
  if (altitude > -18) return "astronomical";
  return "night";
}

export function buildSolarState(date: Date, latitude: number, longitude: number, utcOffsetHours: number): SolarState {
  const position = getSunPosition(date, latitude, longitude);
  const times = getSunTimes(date, latitude, longitude);
  const phase = getSolarPhase(position.altitude);
  void utcOffsetHours;

  let daylightLabel = "--";

  if (times.sunrise && times.sunset) {
    const elapsed = times.sunset.getTime() - times.sunrise.getTime();
    daylightLabel = `${Math.floor(elapsed / 36e5)}h ${Math.floor((elapsed % 36e5) / 6e4)}m`;
  }

  return {
    altitude: position.altitude,
    azimuth: position.azimuth,
    direction: getDirectionLabel(position.azimuth),
    phase,
    times: {
      sunrise: times.sunrise,
      sunset: times.sunset,
      civilDawn: times.civilDawn,
      civilDusk: times.civilDusk,
      nauticalDawn: times.nauticalDawn,
      nauticalDusk: times.nauticalDusk,
    },
    daylightLabel,
  };
}

export function buildMoonState(
  date: Date,
  latitude: number,
  longitude: number,
  solarAltitude: number,
  utcOffsetHours: number,
): MoonState {
  const position = getMoonPosition(date, latitude, longitude);
  const illumination = getMoonIllumination(date);
  const times = getMoonTimes(date, latitude, longitude);

  const formatClock = (value: Date | null) => {
    if (!value || Number.isNaN(value.getTime())) {
      return null;
    }

    return new Date(value.getTime() + utcOffsetHours * 36e5);
  };

  const isNight = solarAltitude < -6;
  const moonSupport = position.altitude > 0 && illumination.fraction > 0.2;
  const nvgSummary = !isNight
    ? "Sol sobre horizonte. NVG no requerido."
    : moonSupport
      ? `NVG efectivo con apoyo lunar ${Math.round(illumination.fraction * 100)}%.`
      : "NVG efectivo sin apoyo lunar. Oscuridad máxima.";

  return {
    altitude: position.altitude,
    azimuth: position.azimuth,
    distanceKm: position.distance,
    illuminationFraction: illumination.fraction,
    phaseValue: illumination.phase,
    phaseName: getMoonPhaseName(illumination.phase),
    moonrise: formatClock(times.rise),
    moonset: formatClock(times.set),
    nvgSummary,
  };
}

export function getNightOpacity(solarAltitude: number, moonAltitude: number, moonFraction: number, cloudCover: number) {
  let opacity: number;

  if (solarAltitude > 0) {
    opacity = 0;
  } else if (solarAltitude > -6) {
    opacity = 0.05 + ((0 - solarAltitude) / 6) * 0.1;
  } else if (solarAltitude > -12) {
    opacity = 0.15 + ((-6 - solarAltitude) / 6) * 0.2;
  } else if (solarAltitude > -18) {
    opacity = 0.35 + ((-12 - solarAltitude) / 6) * 0.2;
  } else {
    opacity = 0.55;
  }

  if (solarAltitude <= 0 && moonAltitude > 0) {
    const lunarReduction = moonFraction * Math.min(1, moonAltitude / 30) * 0.25;
    opacity = Math.max(0, opacity - lunarReduction);
  }

  if (solarAltitude <= 0) {
    opacity = Math.min(0.7, opacity + (cloudCover / 100) * 0.08);
  }

  return opacity;
}
