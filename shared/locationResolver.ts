/**
 * Waypoint Advocates — Geocoding & Location Precision Engine (PG-041)
 *
 * Resolves client locations according to strict order:
 * 1. Confirmed geographic coordinates (if already available)
 * 2. ZIP code centroid
 * 3. City and state coordinates
 * 4. County or school district coordinates
 * 5. State center fallback (labeled: "Approximate state location")
 * 6. Unavailable (if missing city, state, and ZIP)
 *
 * Transforms geographic (lon, lat) to exact coordinates on the approved PG-041 SVG map canvas (1024 x 551).
 *
 * PRIVACY GUARDRAIL:
 * Street addresses are NEVER returned or sent to client-side map renderers.
 */

import { geoAlbersUsa } from "d3-geo";
import { detectTimeZoneFromLocation } from "./timezones";
import { lookupZipCentroid, EXACT_ZIP_CENTROIDS } from "./zipCentroids";

export type LocationAccuracyType =
  | "Exact geocode, protected"
  | "ZIP centroid"
  | "City centroid"
  | "County centroid"
  | "State fallback"
  | "Unavailable";

export type MapLocationAccuracy =
  | "zip_centroid"
  | "city_centroid"
  | "manual"
  | "state_centroid"
  | "unavailable";

export type MapLocationStatus =
  | "ready"
  | "needs_geocoding"
  | "needs_review"
  | "failed";

export interface ResolvedLocation {
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: LocationAccuracyType;
  mapLocationAccuracy: MapLocationAccuracy;
  accuracyLabel: string;
  timeZone: string;
  mapX: number | null;
  mapY: number | null;
  isAlaska: boolean;
  isHawaii: boolean;
  hasLocation: boolean;
  mapLocationStatus: MapLocationStatus;
  mapLocationSource: string | null;
  mapLocationUpdatedAt: string | null;
}

// Albers USA projection instance matching unified SVG canvas exactly (1024x551)
export const usAtlasProjection = geoAlbersUsa()
  .scale(1105.954694795081)
  .translate([544.1468299555062, 268.4395209933348]);

/**
 * Transforms (longitude, latitude) into the approved PG-041 SVG map coordinates
 * Returns projected SVG coordinates matching the shared state path coordinate space.
 * NEVER returns 0,0 for invalid coordinates.
 */
export function projectCoordinatesToMap(
  lon: number,
  lat: number,
  state?: string | null
): { mapX: number; mapY: number; isAlaska: boolean; isHawaii: boolean } | null {
  const p = usAtlasProjection([lon, lat]);
  if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
    return null;
  }

  const [x, y] = p;
  const upperState = (state || "").toUpperCase().trim();

  // Alaska Inset
  const isAlaska = upperState === "AK" || (lon < -130 && lat > 50);
  // Hawaii Inset
  const isHawaii = upperState === "HI" || (lon < -154 && lon > -162 && lat < 24 && lat > 18);

  return {
    mapX: Math.round(x * 10) / 10,
    mapY: Math.round(y * 10) / 10,
    isAlaska,
    isHawaii,
  };
}

/**
 * State Centroids (lon, lat) for fallback placement
 */
export const STATE_CENTROIDS: Record<string, { lon: number; lat: number; name: string; timeZone: string }> = {
  AL: { lon: -86.9023, lat: 32.8067, name: "Alabama", timeZone: "America/Chicago" },
  AK: { lon: -152.4044, lat: 64.2008, name: "Alaska", timeZone: "America/Anchorage" },
  AZ: { lon: -111.4312, lat: 34.0489, name: "Arizona", timeZone: "America/Phoenix" },
  AR: { lon: -92.3731, lat: 34.9697, name: "Arkansas", timeZone: "America/Chicago" },
  CA: { lon: -119.4179, lat: 36.7783, name: "California", timeZone: "America/Los_Angeles" },
  CO: { lon: -105.7821, lat: 39.5501, name: "Colorado", timeZone: "America/Denver" },
  CT: { lon: -72.7554, lat: 41.6032, name: "Connecticut", timeZone: "America/New_York" },
  DE: { lon: -75.5277, lat: 38.9108, name: "Delaware", timeZone: "America/New_York" },
  DC: { lon: -77.0369, lat: 38.9072, name: "District of Columbia", timeZone: "America/New_York" },
  FL: { lon: -81.5158, lat: 27.6648, name: "Florida", timeZone: "America/New_York" },
  GA: { lon: -82.9001, lat: 32.1656, name: "Georgia", timeZone: "America/New_York" },
  HI: { lon: -157.8583, lat: 21.3069, name: "Hawaii", timeZone: "Pacific/Honolulu" },
  ID: { lon: -114.7420, lat: 44.0682, name: "Idaho", timeZone: "America/Denver" },
  IL: { lon: -89.3985, lat: 40.6331, name: "Illinois", timeZone: "America/Chicago" },
  IN: { lon: -86.1349, lat: 40.2672, name: "Indiana", timeZone: "America/Indiana/Indianapolis" },
  IA: { lon: -93.0977, lat: 41.8780, name: "Iowa", timeZone: "America/Chicago" },
  KS: { lon: -98.4842, lat: 39.0119, name: "Kansas", timeZone: "America/Chicago" },
  KY: { lon: -84.2700, lat: 37.8393, name: "Kentucky", timeZone: "America/New_York" },
  LA: { lon: -91.9623, lat: 30.9843, name: "Louisiana", timeZone: "America/Chicago" },
  ME: { lon: -69.4455, lat: 45.2538, name: "Maine", timeZone: "America/New_York" },
  MD: { lon: -76.6413, lat: 39.0458, name: "Maryland", timeZone: "America/New_York" },
  MA: { lon: -71.3824, lat: 42.4072, name: "Massachusetts", timeZone: "America/New_York" },
  MI: { lon: -85.6024, lat: 44.3148, name: "Michigan", timeZone: "America/Detroit" },
  MN: { lon: -94.6859, lat: 46.7296, name: "Minnesota", timeZone: "America/Chicago" },
  MS: { lon: -89.3985, lat: 32.3547, name: "Mississippi", timeZone: "America/Chicago" },
  MO: { lon: -91.8318, lat: 37.9643, name: "Missouri", timeZone: "America/Chicago" },
  MT: { lon: -110.3626, lat: 46.8797, name: "Montana", timeZone: "America/Denver" },
  NE: { lon: -99.9018, lat: 41.4925, name: "Nebraska", timeZone: "America/Chicago" },
  NV: { lon: -116.4194, lat: 38.8026, name: "Nevada", timeZone: "America/Los_Angeles" },
  NH: { lon: -71.5724, lat: 43.1939, name: "New Hampshire", timeZone: "America/New_York" },
  NJ: { lon: -74.4057, lat: 40.0583, name: "New Jersey", timeZone: "America/New_York" },
  NM: { lon: -106.2485, lat: 34.5199, name: "New Mexico", timeZone: "America/Denver" },
  NY: { lon: -75.5268, lat: 43.2994, name: "New York", timeZone: "America/New_York" },
  NC: { lon: -79.0193, lat: 35.7596, name: "North Carolina", timeZone: "America/New_York" },
  ND: { lon: -101.0020, lat: 47.5515, name: "North Dakota", timeZone: "America/Chicago" },
  OH: { lon: -82.9071, lat: 40.4173, name: "Ohio", timeZone: "America/New_York" },
  OK: { lon: -97.5164, lat: 35.4676, name: "Oklahoma", timeZone: "America/Chicago" },
  OR: { lon: -120.5542, lat: 43.8041, name: "Oregon", timeZone: "America/Los_Angeles" },
  PA: { lon: -77.1945, lat: 41.2033, name: "Pennsylvania", timeZone: "America/New_York" },
  RI: { lon: -71.4774, lat: 41.5801, name: "Rhode Island", timeZone: "America/New_York" },
  SC: { lon: -81.1637, lat: 33.8361, name: "South Carolina", timeZone: "America/New_York" },
  SD: { lon: -99.9018, lat: 43.9695, name: "South Dakota", timeZone: "America/Chicago" },
  TN: { lon: -86.5804, lat: 35.5175, name: "Tennessee", timeZone: "America/Chicago" },
  TX: { lon: -99.9018, lat: 31.9686, name: "Texas", timeZone: "America/Chicago" },
  UT: { lon: -111.0937, lat: 39.3210, name: "Utah", timeZone: "America/Denver" },
  VT: { lon: -72.5778, lat: 44.5588, name: "Vermont", timeZone: "America/New_York" },
  VA: { lon: -78.6569, lat: 37.4316, name: "Virginia", timeZone: "America/New_York" },
  WA: { lon: -120.7401, lat: 47.7511, name: "Washington", timeZone: "America/Los_Angeles" },
  WV: { lon: -80.4549, lat: 38.5976, name: "West Virginia", timeZone: "America/New_York" },
  WI: { lon: -89.6165, lat: 43.7844, name: "Wisconsin", timeZone: "America/Chicago" },
  WY: { lon: -107.2903, lat: 43.0760, name: "Wyoming", timeZone: "America/Denver" },
};

/**
 * State Name to 2-Letter Postal Abbreviation Map
 */
export const STATE_NAME_TO_CODE: Record<string, string> = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  "DISTRICT OF COLUMBIA": "DC",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
  "PUERTO RICO": "PR",
};

/**
 * Normalizes any state name or abbreviation to standard 2-letter uppercase postal code.
 */
export function normalizeStateCode(stateInput?: string | null): string {
  if (!stateInput) return "";
  const clean = stateInput.trim().toUpperCase();
  if (clean.length === 2 && STATE_CENTROIDS[clean]) {
    return clean;
  }
  return STATE_NAME_TO_CODE[clean] || (clean.length === 2 ? clean : "");
}

/**
 * Major US & Georgia Cities (lon, lat) Centroids
 * Note: City location is all that is needed for client mapping — street addresses are never required.
 */
export const CITY_COORDINATES: Record<string, { lon: number; lat: number; state: string; timeZone: string }> = {
  // Georgia Core & Metro Atlanta (Advocate Headquarters & Key Hubs)
  "atlanta, ga": { lon: -84.3880, lat: 33.7490, state: "GA", timeZone: "America/New_York" },
  "kennesaw, ga": { lon: -84.6155, lat: 34.0234, state: "GA", timeZone: "America/New_York" },
  "marietta, ga": { lon: -84.5499, lat: 33.9526, state: "GA", timeZone: "America/New_York" },
  "roswell, ga": { lon: -84.3787, lat: 34.0487, state: "GA", timeZone: "America/New_York" },
  "alpharetta, ga": { lon: -84.2238, lat: 34.0758, state: "GA", timeZone: "America/New_York" },
  "johns creek, ga": { lon: -84.1986, lat: 34.0289, state: "GA", timeZone: "America/New_York" },
  "sandy springs, ga": { lon: -84.3733, lat: 33.9304, state: "GA", timeZone: "America/New_York" },
  "smyrna, ga": { lon: -84.5144, lat: 33.8839, state: "GA", timeZone: "America/New_York" },
  "dunwoody, ga": { lon: -84.3216, lat: 33.9462, state: "GA", timeZone: "America/New_York" },
  "brookhaven, ga": { lon: -84.3366, lat: 33.8651, state: "GA", timeZone: "America/New_York" },
  "mableton, ga": { lon: -84.5824, lat: 33.8184, state: "GA", timeZone: "America/New_York" },
  "acworth, ga": { lon: -84.6974, lat: 34.0538, state: "GA", timeZone: "America/New_York" },
  "woodstock, ga": { lon: -84.5538, lat: 34.1158, state: "GA", timeZone: "America/New_York" },
  "canton, ga": { lon: -84.4908, lat: 34.2368, state: "GA", timeZone: "America/New_York" },
  "cumming, ga": { lon: -84.1402, lat: 34.2073, state: "GA", timeZone: "America/New_York" },
  "duluth, ga": { lon: -84.1446, lat: 34.0029, state: "GA", timeZone: "America/New_York" },
  "suwanee, ga": { lon: -84.0713, lat: 34.0526, state: "GA", timeZone: "America/New_York" },
  "lawrenceville, ga": { lon: -83.9880, lat: 33.9562, state: "GA", timeZone: "America/New_York" },
  "buford, ga": { lon: -84.0044, lat: 34.1207, state: "GA", timeZone: "America/New_York" },
  "norcross, ga": { lon: -84.2135, lat: 33.9412, state: "GA", timeZone: "America/New_York" },
  "tucker, ga": { lon: -84.2171, lat: 33.8545, state: "GA", timeZone: "America/New_York" },
  "decatur, ga": { lon: -84.2963, lat: 33.7748, state: "GA", timeZone: "America/New_York" },
  "stone mountain, ga": { lon: -84.1702, lat: 33.8082, state: "GA", timeZone: "America/New_York" },
  "snellville, ga": { lon: -84.0199, lat: 33.8573, state: "GA", timeZone: "America/New_York" },
  "conyers, ga": { lon: -84.0177, lat: 33.6676, state: "GA", timeZone: "America/New_York" },
  "covington, ga": { lon: -83.8602, lat: 33.5968, state: "GA", timeZone: "America/New_York" },
  "mcdonough, ga": { lon: -84.1469, lat: 33.4473, state: "GA", timeZone: "America/New_York" },
  "stockbridge, ga": { lon: -84.2338, lat: 33.5443, state: "GA", timeZone: "America/New_York" },
  "fayetteville, ga": { lon: -84.4549, lat: 33.4485, state: "GA", timeZone: "America/New_York" },
  "peachtree city, ga": { lon: -84.5958, lat: 33.3968, state: "GA", timeZone: "America/New_York" },
  "newnan, ga": { lon: -84.7997, lat: 33.3807, state: "GA", timeZone: "America/New_York" },
  "douglasville, ga": { lon: -84.7477, lat: 33.7515, state: "GA", timeZone: "America/New_York" },
  "cartersville, ga": { lon: -84.7999, lat: 34.1651, state: "GA", timeZone: "America/New_York" },
  "dallas, ga": { lon: -84.8408, lat: 33.9237, state: "GA", timeZone: "America/New_York" },
  "athens, ga": { lon: -83.3576, lat: 33.9519, state: "GA", timeZone: "America/New_York" },
  "gainesville, ga": { lon: -83.8241, lat: 34.2979, state: "GA", timeZone: "America/New_York" },
  "rome, ga": { lon: -85.1647, lat: 34.2570, state: "GA", timeZone: "America/New_York" },
  "dalton, ga": { lon: -84.9702, lat: 34.7698, state: "GA", timeZone: "America/New_York" },
  "augusta, ga": { lon: -82.0105, lat: 33.4735, state: "GA", timeZone: "America/New_York" },
  "columbus, ga": { lon: -84.9877, lat: 32.4610, state: "GA", timeZone: "America/New_York" },
  "macon, ga": { lon: -83.6324, lat: 32.8407, state: "GA", timeZone: "America/New_York" },
  "warner robins, ga": { lon: -83.6242, lat: 32.6130, state: "GA", timeZone: "America/New_York" },
  "savannah, ga": { lon: -81.0998, lat: 32.0809, state: "GA", timeZone: "America/New_York" },
  "pooler, ga": { lon: -81.2468, lat: 32.1158, state: "GA", timeZone: "America/New_York" },
  "brunswick, ga": { lon: -81.4915, lat: 31.1499, state: "GA", timeZone: "America/New_York" },
  "valdosta, ga": { lon: -83.2785, lat: 30.8327, state: "GA", timeZone: "America/New_York" },
  "albany, ga": { lon: -84.1557, lat: 31.5785, state: "GA", timeZone: "America/New_York" },

  // Northwest Arkansas Client Hub & Central
  "bentonville, ar": { lon: -94.2088, lat: 36.3729, state: "AR", timeZone: "America/Chicago" },
  "fayetteville, ar": { lon: -94.1574, lat: 36.0822, state: "AR", timeZone: "America/Chicago" },
  "rogers, ar": { lon: -94.1185, lat: 36.3320, state: "AR", timeZone: "America/Chicago" },
  "springdale, ar": { lon: -94.1288, lat: 36.1867, state: "AR", timeZone: "America/Chicago" },
  "little rock, ar": { lon: -92.2896, lat: 34.7465, state: "AR", timeZone: "America/Chicago" },
  "fort smith, ar": { lon: -94.3985, lat: 35.3859, state: "AR", timeZone: "America/Chicago" },
  "jonesboro, ar": { lon: -90.7043, lat: 35.8423, state: "AR", timeZone: "America/Chicago" },
  "conway, ar": { lon: -92.4426, lat: 35.0887, state: "AR", timeZone: "America/Chicago" },

  // Pacific
  "seattle, wa": { lon: -122.3321, lat: 47.6062, state: "WA", timeZone: "America/Los_Angeles" },
  "bellevue, wa": { lon: -122.2015, lat: 47.6101, state: "WA", timeZone: "America/Los_Angeles" },
  "spokane, wa": { lon: -117.4260, lat: 47.6588, state: "WA", timeZone: "America/Los_Angeles" },
  "tacoma, wa": { lon: -122.4443, lat: 47.2529, state: "WA", timeZone: "America/Los_Angeles" },
  "portland, or": { lon: -122.6784, lat: 45.5152, state: "OR", timeZone: "America/Los_Angeles" },
  "eugene, or": { lon: -123.0868, lat: 44.0521, state: "OR", timeZone: "America/Los_Angeles" },
  "san francisco, ca": { lon: -122.4194, lat: 37.7749, state: "CA", timeZone: "America/Los_Angeles" },
  "san jose, ca": { lon: -121.8863, lat: 37.3382, state: "CA", timeZone: "America/Los_Angeles" },
  "oakland, ca": { lon: -122.2712, lat: 37.8044, state: "CA", timeZone: "America/Los_Angeles" },
  "sacramento, ca": { lon: -121.4944, lat: 38.5816, state: "CA", timeZone: "America/Los_Angeles" },
  "los angeles, ca": { lon: -118.2437, lat: 34.0522, state: "CA", timeZone: "America/Los_Angeles" },
  "san diego, ca": { lon: -117.1611, lat: 32.7157, state: "CA", timeZone: "America/Los_Angeles" },
  "irvine, ca": { lon: -117.8265, lat: 33.6846, state: "CA", timeZone: "America/Los_Angeles" },
  "fresno, ca": { lon: -119.7871, lat: 36.7468, state: "CA", timeZone: "America/Los_Angeles" },
  "las vegas, nv": { lon: -115.1398, lat: 36.1699, state: "NV", timeZone: "America/Los_Angeles" },
  "reno, nv": { lon: -119.8138, lat: 39.5296, state: "NV", timeZone: "America/Los_Angeles" },

  // Mountain
  "boise, id": { lon: -116.2023, lat: 43.6150, state: "ID", timeZone: "America/Denver" },
  "salt lake city, ut": { lon: -111.8910, lat: 40.7608, state: "UT", timeZone: "America/Denver" },
  "denver, co": { lon: -104.9903, lat: 39.7392, state: "CO", timeZone: "America/Denver" },
  "boulder, co": { lon: -105.2705, lat: 40.0150, state: "CO", timeZone: "America/Denver" },
  "colorado springs, co": { lon: -104.8214, lat: 38.8339, state: "CO", timeZone: "America/Denver" },
  "phoenix, az": { lon: -112.0740, lat: 33.4484, state: "AZ", timeZone: "America/Phoenix" },
  "scottsdale, az": { lon: -111.9261, lat: 33.4942, state: "AZ", timeZone: "America/Phoenix" },
  "mesa, az": { lon: -111.8315, lat: 33.4152, state: "AZ", timeZone: "America/Phoenix" },
  "tucson, az": { lon: -110.9747, lat: 32.2226, state: "AZ", timeZone: "America/Phoenix" },
  "albuquerque, nm": { lon: -106.6504, lat: 35.0844, state: "NM", timeZone: "America/Denver" },
  "santa fe, nm": { lon: -105.9378, lat: 35.6870, state: "NM", timeZone: "America/Denver" },
  "helena, mt": { lon: -112.0391, lat: 46.5891, state: "MT", timeZone: "America/Denver" },
  "billings, mt": { lon: -108.5007, lat: 45.7833, state: "MT", timeZone: "America/Denver" },
  "cheyenne, wy": { lon: -104.8202, lat: 41.1399, state: "WY", timeZone: "America/Denver" },

  // Central
  "austin, tx": { lon: -97.7431, lat: 30.2672, state: "TX", timeZone: "America/Chicago" },
  "dallas, tx": { lon: -96.7970, lat: 32.7767, state: "TX", timeZone: "America/Chicago" },
  "fort worth, tx": { lon: -97.3308, lat: 32.7555, state: "TX", timeZone: "America/Chicago" },
  "houston, tx": { lon: -95.3698, lat: 29.7604, state: "TX", timeZone: "America/Chicago" },
  "san antonio, tx": { lon: -98.4936, lat: 29.4241, state: "TX", timeZone: "America/Chicago" },
  "el paso, tx": { lon: -106.4850, lat: 31.7619, state: "TX", timeZone: "America/Denver" },
  "oklahoma city, ok": { lon: -97.5164, lat: 35.4676, state: "OK", timeZone: "America/Chicago" },
  "tulsa, ok": { lon: -95.9928, lat: 36.1540, state: "OK", timeZone: "America/Chicago" },
  "kansas city, mo": { lon: -94.5786, lat: 39.0997, state: "MO", timeZone: "America/Chicago" },
  "st. louis, mo": { lon: -90.1994, lat: 38.6270, state: "MO", timeZone: "America/Chicago" },
  "chicago, il": { lon: -87.6298, lat: 41.8781, state: "IL", timeZone: "America/Chicago" },
  "naperville, il": { lon: -88.1535, lat: 41.7508, state: "IL", timeZone: "America/Chicago" },
  "minneapolis, mn": { lon: -93.2650, lat: 44.9778, state: "MN", timeZone: "America/Chicago" },
  "st. paul, mn": { lon: -93.0900, lat: 44.9537, state: "MN", timeZone: "America/Chicago" },
  "milwaukee, wi": { lon: -87.9065, lat: 43.0389, state: "WI", timeZone: "America/Chicago" },
  "madison, wi": { lon: -89.4012, lat: 43.0731, state: "WI", timeZone: "America/Chicago" },
  "des moines, ia": { lon: -93.6091, lat: 41.6005, state: "IA", timeZone: "America/Chicago" },
  "omaha, ne": { lon: -95.9345, lat: 41.2565, state: "NE", timeZone: "America/Chicago" },
  "new orleans, la": { lon: -90.0715, lat: 29.9511, state: "LA", timeZone: "America/Chicago" },
  "baton rouge, la": { lon: -91.1871, lat: 30.4515, state: "LA", timeZone: "America/Chicago" },
  "memphis, tn": { lon: -90.0490, lat: 35.1495, state: "TN", timeZone: "America/Chicago" },
  "nashville, tn": { lon: -86.7816, lat: 36.1627, state: "TN", timeZone: "America/Chicago" },
  "knoxville, tn": { lon: -83.9207, lat: 35.9606, state: "TN", timeZone: "America/New_York" },
  "chattanooga, tn": { lon: -85.3097, lat: 35.0456, state: "TN", timeZone: "America/New_York" },
  "birmingham, al": { lon: -86.8104, lat: 33.5186, state: "AL", timeZone: "America/Chicago" },
  "huntsville, al": { lon: -86.5861, lat: 34.7304, state: "AL", timeZone: "America/Chicago" },

  // Eastern & Mid-Atlantic
  "miami, fl": { lon: -80.1918, lat: 25.7617, state: "FL", timeZone: "America/New_York" },
  "orlando, fl": { lon: -81.3792, lat: 28.5383, state: "FL", timeZone: "America/New_York" },
  "tampa, fl": { lon: -82.4572, lat: 27.9506, state: "FL", timeZone: "America/New_York" },
  "jacksonville, fl": { lon: -81.6557, lat: 30.3322, state: "FL", timeZone: "America/New_York" },
  "tallahassee, fl": { lon: -84.2807, lat: 30.4383, state: "FL", timeZone: "America/New_York" },
  "fort lauderdale, fl": { lon: -80.1434, lat: 26.1224, state: "FL", timeZone: "America/New_York" },
  "charlotte, nc": { lon: -80.8431, lat: 35.2271, state: "NC", timeZone: "America/New_York" },
  "raleigh, nc": { lon: -78.6382, lat: 35.7796, state: "NC", timeZone: "America/New_York" },
  "durham, nc": { lon: -78.8986, lat: 35.9940, state: "NC", timeZone: "America/New_York" },
  "greensboro, nc": { lon: -79.7920, lat: 36.0726, state: "NC", timeZone: "America/New_York" },
  "charleston, sc": { lon: -79.9311, lat: 32.7765, state: "SC", timeZone: "America/New_York" },
  "columbia, sc": { lon: -81.0348, lat: 34.0007, state: "SC", timeZone: "America/New_York" },
  "greenville, sc": { lon: -82.3940, lat: 34.8526, state: "SC", timeZone: "America/New_York" },
  "richmond, va": { lon: -77.4360, lat: 37.5407, state: "VA", timeZone: "America/New_York" },
  "virginia beach, va": { lon: -75.9780, lat: 36.8529, state: "VA", timeZone: "America/New_York" },
  "alexandria, va": { lon: -77.0469, lat: 38.8048, state: "VA", timeZone: "America/New_York" },
  "washington, dc": { lon: -77.0369, lat: 38.9072, state: "DC", timeZone: "America/New_York" },
  "baltimore, md": { lon: -76.6122, lat: 39.2904, state: "MD", timeZone: "America/New_York" },
  "annapolis, md": { lon: -76.4922, lat: 38.9784, state: "MD", timeZone: "America/New_York" },
  "philadelphia, pa": { lon: -75.1652, lat: 39.9526, state: "PA", timeZone: "America/New_York" },
  "pittsburgh, pa": { lon: -79.9959, lat: 40.4406, state: "PA", timeZone: "America/New_York" },
  "new york, ny": { lon: -74.0060, lat: 40.7128, state: "NY", timeZone: "America/New_York" },
  "brooklyn, ny": { lon: -73.9442, lat: 40.6782, state: "NY", timeZone: "America/New_York" },
  "buffalo, ny": { lon: -78.8784, lat: 42.8864, state: "NY", timeZone: "America/New_York" },
  "albany, ny": { lon: -73.7562, lat: 42.6526, state: "NY", timeZone: "America/New_York" },
  "newark, nj": { lon: -74.1724, lat: 40.7357, state: "NJ", timeZone: "America/New_York" },
  "jersey city, nj": { lon: -74.0431, lat: 40.7178, state: "NJ", timeZone: "America/New_York" },
  "boston, ma": { lon: -71.0589, lat: 42.3601, state: "MA", timeZone: "America/New_York" },
  "cambridge, ma": { lon: -71.1097, lat: 42.3736, state: "MA", timeZone: "America/New_York" },
  "providence, ri": { lon: -71.4128, lat: 41.8240, state: "RI", timeZone: "America/New_York" },
  "hartford, ct": { lon: -72.6851, lat: 41.7658, state: "CT", timeZone: "America/New_York" },
  "stamford, ct": { lon: -73.5387, lat: 41.0534, state: "CT", timeZone: "America/New_York" },
  "columbus, oh": { lon: -82.9988, lat: 39.9612, state: "OH", timeZone: "America/New_York" },
  "cleveland, oh": { lon: -81.6944, lat: 41.4993, state: "OH", timeZone: "America/New_York" },
  "cincinnati, oh": { lon: -84.5120, lat: 39.1031, state: "OH", timeZone: "America/New_York" },
  "detroit, mi": { lon: -83.0458, lat: 42.3314, state: "MI", timeZone: "America/Detroit" },
  "ann arbor, mi": { lon: -83.7430, lat: 42.2808, state: "MI", timeZone: "America/Detroit" },
  "grand rapids, mi": { lon: -85.6681, lat: 42.9634, state: "MI", timeZone: "America/Detroit" },
  "indianapolis, in": { lon: -86.1581, lat: 39.7684, state: "IN", timeZone: "America/Indiana/Indianapolis" },
  "louisville, ky": { lon: -85.7585, lat: 38.2527, state: "KY", timeZone: "America/New_York" },
  "lexington, ky": { lon: -84.5037, lat: 38.0406, state: "KY", timeZone: "America/New_York" },

  // Alaska & Hawaii Insets
  "anchorage, ak": { lon: -149.9003, lat: 61.2181, state: "AK", timeZone: "America/Anchorage" },
  "juneau, ak": { lon: -134.4197, lat: 58.3019, state: "AK", timeZone: "America/Anchorage" },
  "fairbanks, ak": { lon: -147.7164, lat: 64.8378, state: "AK", timeZone: "America/Anchorage" },
  "honolulu, hi": { lon: -157.8583, lat: 21.3069, state: "HI", timeZone: "Pacific/Honolulu" },
  "hilo, hi": { lon: -155.0868, lat: 19.7297, state: "HI", timeZone: "Pacific/Honolulu" },
  "kahului, hi": { lon: -156.4729, lat: 20.8893, state: "HI", timeZone: "Pacific/Honolulu" },
};

/**
 * Searches the offline city centroids dataset by city and optional state.
 * City location is all that is needed for mapping — street addresses are never required.
 */
export function lookupCityCoordinates(
  city?: string | null,
  state?: string | null
): { lon: number; lat: number; state: string; timeZone: string } | null {
  if (!city?.trim()) return null;
  const cleanCity = city.trim().toLowerCase();
  const normalizedState = normalizeStateCode(state);

  // 1. Direct match on "city, state"
  if (normalizedState) {
    const key = `${cleanCity}, ${normalizedState.toLowerCase()}`;
    if (CITY_COORDINATES[key]) {
      return CITY_COORDINATES[key];
    }
  }

  // 2. Check EXACT_ZIP_CENTROIDS for matching city and state
  if (normalizedState) {
    for (const zc of Object.values(EXACT_ZIP_CENTROIDS)) {
      if (zc.city.toLowerCase() === cleanCity && zc.state.toUpperCase() === normalizedState) {
        return {
          lon: zc.longitude,
          lat: zc.latitude,
          state: zc.state,
          timeZone: zc.timeZone,
        };
      }
    }
  }

  // 3. Match unique prominent city if state was not provided or not matched
  for (const [key, coord] of Object.entries(CITY_COORDINATES)) {
    const [cityName, stateCode] = key.split(", ");
    if (cityName === cleanCity) {
      if (!normalizedState || stateCode === normalizedState.toLowerCase()) {
        return coord;
      }
    }
  }

  // 4. Fallback search across EXACT_ZIP_CENTROIDS for city name
  if (!normalizedState) {
    for (const zc of Object.values(EXACT_ZIP_CENTROIDS)) {
      if (zc.city.toLowerCase() === cleanCity) {
        return {
          lon: zc.longitude,
          lat: zc.latitude,
          state: zc.state,
          timeZone: zc.timeZone,
        };
      }
    }
  }

  return null;
}

/**
 * Common 3-Digit ZIP Code Prefix Centroids
 */
export const ZIP_PREFIX_COORDINATES: Record<string, { lon: number; lat: number; state: string; timeZone: string }> = {
  "727": { lon: -94.2, lat: 36.3, state: "AR", timeZone: "America/Chicago" }, // Northwest Arkansas / Bentonville
  "303": { lon: -84.39, lat: 33.75, state: "GA", timeZone: "America/New_York" }, // Atlanta GA
  "301": { lon: -84.62, lat: 34.02, state: "GA", timeZone: "America/New_York" }, // Kennesaw/Marietta GA
  "900": { lon: -118.24, lat: 34.05, state: "CA", timeZone: "America/Los_Angeles" }, // Los Angeles CA
  "981": { lon: -122.33, lat: 47.61, state: "WA", timeZone: "America/Los_Angeles" }, // Seattle WA
  "802": { lon: -104.99, lat: 39.74, state: "CO", timeZone: "America/Denver" }, // Denver CO
  "850": { lon: -112.07, lat: 33.45, state: "AZ", timeZone: "America/Phoenix" }, // Phoenix AZ
  "787": { lon: -97.74, lat: 30.27, state: "TX", timeZone: "America/Chicago" }, // Austin TX
  "752": { lon: -96.80, lat: 32.78, state: "TX", timeZone: "America/Chicago" }, // Dallas TX
  "606": { lon: -87.63, lat: 41.88, state: "IL", timeZone: "America/Chicago" }, // Chicago IL
  "100": { lon: -74.01, lat: 40.71, state: "NY", timeZone: "America/New_York" }, // New York NY
  "200": { lon: -77.04, lat: 38.91, state: "DC", timeZone: "America/New_York" }, // Washington DC
  "331": { lon: -80.19, lat: 25.76, state: "FL", timeZone: "America/New_York" }, // Miami FL
  "995": { lon: -149.90, lat: 61.22, state: "AK", timeZone: "America/Anchorage" }, // Anchorage AK
  "968": { lon: -157.86, lat: 21.31, state: "HI", timeZone: "Pacific/Honolulu" }, // Honolulu HI
};

/**
 * Standard location resolver following user hierarchy:
 * 1. ZIP-code centroid (primary for privacy and reliability)
 * 2. City and state centroid
 * 3. Manually confirmed coordinates
 * 4. State center fallback (labeled: "Approximate state location")
 * 5. Unavailable (if missing city, state, and ZIP)
 *
 * NEVER returns [0, 0], [74, 65], or any fake coordinates for invalid locations.
 */
export function resolveClientLocation(params: {
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
}): ResolvedLocation {
  const city = (params.city || "").trim();
  const rawState = (params.state || "").trim();
  const normalizedState = normalizeStateCode(rawState);
  const zip = (params.zipCode || "").trim().replace(/\D/g, "");
  const nowIso = new Date().toISOString();

  // 1. ZIP-code centroid (Primary lookup if ZIP is provided)
  if (zip.length >= 3) {
    const zipCentroid = lookupZipCentroid(zip);
    if (zipCentroid) {
      const proj = projectCoordinatesToMap(zipCentroid.longitude, zipCentroid.latitude, zipCentroid.state);
      if (proj) {
        return {
          latitude: zipCentroid.latitude,
          longitude: zipCentroid.longitude,
          locationAccuracy: "ZIP centroid",
          mapLocationAccuracy: "zip_centroid",
          accuracyLabel: "ZIP centroid",
          timeZone: zipCentroid.timeZone,
          mapX: proj.mapX,
          mapY: proj.mapY,
          isAlaska: proj.isAlaska,
          isHawaii: proj.isHawaii,
          hasLocation: true,
          mapLocationStatus: "ready",
          mapLocationSource: "zip_centroid",
          mapLocationUpdatedAt: nowIso,
        };
      }
    }
  }

  // 2. City centroid: City location is all we need (street addresses are never required)
  if (city) {
    const cityCoord = lookupCityCoordinates(city, normalizedState || rawState);
    if (cityCoord) {
      const proj = projectCoordinatesToMap(cityCoord.lon, cityCoord.lat, cityCoord.state);
      if (proj) {
        return {
          latitude: cityCoord.lat,
          longitude: cityCoord.lon,
          locationAccuracy: "City centroid",
          mapLocationAccuracy: "city_centroid",
          accuracyLabel: "City centroid",
          timeZone: cityCoord.timeZone,
          mapX: proj.mapX,
          mapY: proj.mapY,
          isAlaska: proj.isAlaska,
          isHawaii: proj.isHawaii,
          hasLocation: true,
          mapLocationStatus: "ready",
          mapLocationSource: "city_centroid",
          mapLocationUpdatedAt: nowIso,
        };
      }
    }
  }

  // 3. Manually confirmed coordinates (if already present and valid)
  if (params.latitude != null && params.longitude != null) {
    let lat = typeof params.latitude === "number" ? params.latitude : parseFloat(String(params.latitude));
    let lon = typeof params.longitude === "number" ? params.longitude : parseFloat(String(params.longitude));
    if (Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0)) {
      // Correct for accidental latitude/longitude swap
      if (lat < 0 && lon > 0) {
        const tmp = lat;
        lat = lon;
        lon = tmp;
      }
      // United States longitudes must remain negative
      if (lon > 0 && lon <= 180) {
        lon = -lon;
      }

      if (lat >= 18 && lat <= 72 && lon >= -180 && lon <= -65) {
        const proj = projectCoordinatesToMap(lon, lat, normalizedState || rawState);
        if (proj) {
          const detected = detectTimeZoneFromLocation(city, normalizedState || rawState, zip);
          return {
            latitude: lat,
            longitude: lon,
            locationAccuracy: "Exact geocode, protected",
            mapLocationAccuracy: "manual",
            accuracyLabel: "Confirmed coordinates",
            timeZone: detected.timeZone,
            mapX: proj.mapX,
            mapY: proj.mapY,
            isAlaska: proj.isAlaska,
            isHawaii: proj.isHawaii,
            hasLocation: true,
            mapLocationStatus: "ready",
            mapLocationSource: "manual",
            mapLocationUpdatedAt: nowIso,
          };
        }
      }
    }
  }

  // 4. State center fallback (only as final fallback if state is known, labeled: "Approximate state location")
  const stateKey = normalizedState || (rawState.length === 2 ? rawState.toUpperCase() : "");
  if (stateKey && STATE_CENTROIDS[stateKey]) {
    const stateCoord = STATE_CENTROIDS[stateKey];
    const proj = projectCoordinatesToMap(stateCoord.lon, stateCoord.lat, stateKey);
    if (proj) {
      return {
        latitude: stateCoord.lat,
        longitude: stateCoord.lon,
        locationAccuracy: "State fallback",
        mapLocationAccuracy: "state_centroid",
        accuracyLabel: "Approximate state location",
        timeZone: stateCoord.timeZone,
        mapX: proj.mapX,
        mapY: proj.mapY,
        isAlaska: proj.isAlaska,
        isHawaii: proj.isHawaii,
        hasLocation: true,
        mapLocationStatus: "ready",
        mapLocationSource: "state_centroid",
        mapLocationUpdatedAt: nowIso,
      };
    }
  }

  // 5. Unavailable: Missing sufficient location data (no city, no state, no zip)
  return {
    latitude: null,
    longitude: null,
    locationAccuracy: "Unavailable",
    mapLocationAccuracy: "unavailable",
    accuracyLabel: "Location unavailable",
    timeZone: "America/New_York",
    mapX: null,
    mapY: null,
    isAlaska: false,
    isHawaii: false,
    hasLocation: false,
    mapLocationStatus: "needs_review",
    mapLocationSource: null,
    mapLocationUpdatedAt: null,
  };
}

/**
 * Privacy formatter: ensures no street address is ever formatted
 */
export function formatPublicLocation(city?: string | null, state?: string | null, zipCode?: string | null): string {
  const parts: string[] = [];
  if (city?.trim()) parts.push(city.trim());
  if (state?.trim()) parts.push(state.trim().toUpperCase());
  if (parts.length === 0) {
    if (zipCode?.trim()) return `ZIP ${zipCode.trim()}`;
    return "Location unavailable";
  }
  return parts.join(", ");
}
