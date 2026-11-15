import { _execDnsRunInternal, _execDnsSelectInternal } from "./doNotServe";
import { getLocalDbClient } from "../_core/d1Client";
import {
  CLOUDFLARE_STORAGE_EVALUATION,
  DEFAULT_SCORING_WEIGHTS,
  INITIAL_GEORGIA_AMENITIES,
  INITIAL_GEORGIA_COMMUNITIES,
  INITIAL_GEORGIA_SCHOOL_DISTRICTS,
  INITIAL_GEORGIA_SCHOOLS,
  type DataVerificationStatus,
  type GeographicBoundaryCrosswalkRecord,
  type PillarMetrics,
  type PlaceCommunityRecord,
  type PlaceSchoolDistrictRecord,
  type PlaceSchoolRecord,
  type ScoringWeightsConfig,
  type SpecialEducationIntelligenceRecord,
  type SpecializedFacilitiesSnapshot,
} from "../../shared/waypointPlaces";
import {
  buildVerifiedCountyIntelligenceMap,
  listBoundaryCrosswalkRecords,
  listImportedNcesDistricts,
  listImportedNcesSchools,
  listSpecialEdIntelligenceRecords,
} from "../services/waypointPlacesDataEngine";
import { getSpecializedFacilitiesSnapshot } from "../services/waypointPlacesSpecializedEngine";

/**
 * Isolated Waypoint Places database layer.
 *
 * SECURITY & ISOLATION GUARDRAIL:
 * - Never joins or reads from `contacts`, `leads`, `projects`, `iep_documents`,
 *   or `do_not_serve_entries`.
 * - Uses `CREATE TABLE IF NOT EXISTS` so `drizzle/schema.ts` remains untouched.
 */
const PLACES_DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS waypoint_places_communities (
    id TEXT PRIMARY KEY,
    fips TEXT NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    state_code TEXT NOT NULL DEFAULT 'GA',
    region TEXT NOT NULL,
    lng REAL NOT NULL,
    lat REAL NOT NULL,
    zoom_level REAL NOT NULL DEFAULT 9.5,
    hero_image_style TEXT NOT NULL DEFAULT 'tree_lined_avenue',
    tagline TEXT NOT NULL,
    key_insights_json TEXT NOT NULL DEFAULT '[]',
    data_status TEXT NOT NULL DEFAULT 'preliminary_model',
    data_sources_pending_json TEXT NOT NULL DEFAULT '[]',
    pillars_json TEXT NOT NULL,
    published_to_public INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS waypoint_places_comm_fips_idx ON waypoint_places_communities (state_code, fips)`,
  `CREATE TABLE IF NOT EXISTS waypoint_places_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    weights_json TEXT NOT NULL,
    pmtiles_archive_url TEXT NOT NULL DEFAULT '/api/places/tiles/georgia-overview.pmtiles',
    r2_public_prefix TEXT NOT NULL DEFAULT 'waypoint-places-public',
    show_model_calibration_default INTEGER NOT NULL DEFAULT 1,
    last_published_at TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS waypoint_places_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_version TEXT NOT NULL,
    published_by TEXT NOT NULL,
    communities_count INTEGER NOT NULL,
    districts_count INTEGER NOT NULL,
    schools_count INTEGER NOT NULL,
    r2_object_key TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
];

let placesTablesEnsuredBinding: unknown = null;
let placesLocalTablesEnsured = false;

export async function ensureWaypointPlacesTables(): Promise<void> {
  const cfDb = (globalThis as Record<string, any>).__CF_ENV_DB__;
  if (cfDb) {
    if (placesTablesEnsuredBinding === cfDb) return;
    for (const stmt of PLACES_DDL_STATEMENTS) {
      try {
        await cfDb.prepare(stmt).run();
      } catch {
        // ignore if already exists
      }
    }
    placesTablesEnsuredBinding = cfDb;
    await seedInitialGeorgiaPlacesIfNeeded();
    return;
  }

  if (placesLocalTablesEnsured) return;
  for (const stmt of PLACES_DDL_STATEMENTS) {
    try {
      await getLocalDbClient().execute(stmt);
    } catch {
      // ignore if already exists
    }
  }
  placesLocalTablesEnsured = true;
  await seedInitialGeorgiaPlacesIfNeeded();
}

async function seedInitialGeorgiaPlacesIfNeeded(): Promise<void> {
  for (const comm of INITIAL_GEORGIA_COMMUNITIES) {
    await _execDnsRunInternal(
      `INSERT INTO waypoint_places_communities (
        id, fips, name, short_name, state_code, region, lng, lat, zoom_level,
        hero_image_style, tagline, key_insights_json, data_status,
        data_sources_pending_json, pillars_json, published_to_public, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        tagline = excluded.tagline,
        key_insights_json = excluded.key_insights_json,
        data_status = CASE
          WHEN waypoint_places_communities.data_status = 'preliminary_model' THEN excluded.data_status
          ELSE waypoint_places_communities.data_status
        END,
        data_sources_pending_json = excluded.data_sources_pending_json`,
      [
        comm.id,
        comm.fips,
        comm.name,
        comm.shortName,
        comm.stateCode,
        comm.region,
        comm.coordinates[0],
        comm.coordinates[1],
        comm.zoomLevel,
        comm.heroImageStyle,
        comm.tagline,
        JSON.stringify(comm.keyInsights),
        comm.dataStatus,
        JSON.stringify(comm.dataSourcesPending),
        JSON.stringify(comm.calibrationPillars),
        comm.publishedToPublic ? 1 : 0,
        comm.updatedAt,
      ]
    );
  }

  const cfgRows = await _execDnsSelectInternal(
    `SELECT id FROM waypoint_places_config WHERE id = 1 LIMIT 1`,
    []
  );
  if (cfgRows.length === 0) {
    const now = new Date().toISOString();
    await _execDnsRunInternal(
      `INSERT OR IGNORE INTO waypoint_places_config (
        id, weights_json, pmtiles_archive_url, r2_public_prefix,
        show_model_calibration_default, last_published_at, updated_at
      ) VALUES (1, ?, '/api/places/tiles/georgia-overview.pmtiles', 'waypoint-places-public', 1, ?, ?)`,
      [JSON.stringify(DEFAULT_SCORING_WEIGHTS), now, now]
    );
  }
}

function mapCommunityRow(row: Record<string, any>): PlaceCommunityRecord {
  let keyInsights: string[] = [];
  let dataSourcesPending: string[] = [];
  let calibrationPillars: PillarMetrics = {
    communityQuality: null,
    academics: null,
    specializedPrograms: null,
    safetyWellBeing: null,
    familyLifestyle: null,
    affordability: null,
    commute: null,
  };

  try {
    const parsed = JSON.parse(String(row.key_insights_json || "[]"));
    if (Array.isArray(parsed)) keyInsights = parsed.map(String);
  } catch {
    keyInsights = [];
  }
  try {
    const parsed = JSON.parse(String(row.data_sources_pending_json || "[]"));
    if (Array.isArray(parsed)) dataSourcesPending = parsed.map(String);
  } catch {
    dataSourcesPending = [];
  }
  try {
    const parsed = JSON.parse(String(row.pillars_json || "{}"));
    if (parsed && typeof parsed === "object") {
      calibrationPillars = {
        communityQuality: parsed.communityQuality ?? null,
        academics: parsed.academics ?? null,
        specializedPrograms: parsed.specializedPrograms ?? null,
        safetyWellBeing: parsed.safetyWellBeing ?? null,
        familyLifestyle: parsed.familyLifestyle ?? null,
        affordability: parsed.affordability ?? null,
        commute: parsed.commute ?? null,
      };
    }
  } catch {
    // keep default
  }

  return {
    id: String(row.id),
    fips: String(row.fips),
    name: String(row.name),
    shortName: String(row.short_name),
    stateCode: "GA",
    region: String(row.region || "Georgia"),
    coordinates: [Number(row.lng ?? -84.125), Number(row.lat ?? 34.225)],
    zoomLevel: Number(row.zoom_level ?? 9.5),
    heroImageStyle: (row.hero_image_style || "tree_lined_avenue") as PlaceCommunityRecord["heroImageStyle"],
    tagline: String(row.tagline || ""),
    keyInsights,
    dataStatus: (row.data_status || "preliminary_model") as DataVerificationStatus,
    dataSourcesPending,
    calibrationPillars,
    publishedToPublic: Number(row.published_to_public ?? 1) === 1,
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export async function listWaypointPlacesCommunities(options?: {
  onlyPublished?: boolean;
}): Promise<PlaceCommunityRecord[]> {
  await ensureWaypointPlacesTables();
  const [rows, verifiedMap] = await Promise.all([
    _execDnsSelectInternal(
      options?.onlyPublished
        ? `SELECT * FROM waypoint_places_communities WHERE published_to_public = 1 ORDER BY name ASC`
        : `SELECT * FROM waypoint_places_communities ORDER BY name ASC`,
      []
    ),
    buildVerifiedCountyIntelligenceMap(),
  ]);

  return rows.map((row) => {
    const base = mapCommunityRow(row);
    const intel = verifiedMap.get(base.fips);
    if (!intel) return base;

    const acs = intel.acsDemographics;
    const enrichedInsights = [
      base.keyInsights[0] || `Geographic Boundary: FIPS ${base.fips}`,
      base.keyInsights[1] || `Public School District Boundary Mapped`,
      `Verified ACS (${acs.surveyPeriod}): Income $${acs.medianHouseholdIncome.toLocaleString()} (±$${acs.medianHouseholdIncomeMoe.toLocaleString()}) · Home $${acs.medianHomeValue.toLocaleString()} (±$${acs.medianHomeValueMoe.toLocaleString()}) · Rent $${acs.medianGrossRent.toLocaleString()}/mo`,
      `Verified Commute (${acs.surveyPeriod}): ${acs.meanCommuteMinutes} min (±${acs.meanCommuteMinutesMoe} min) · Evidence: ${intel.evidenceCompleteness.ratioText}`,
    ];

    return {
      ...base,
      keyInsights: enrichedInsights,
      dataSourcesPending: intel.evidenceCompleteness.pendingSourceNames,
      verifiedPillars: intel.verifiedPillars,
      acsDemographics: intel.acsDemographics,
      evidenceCompleteness: intel.evidenceCompleteness,
    };
  });
}

export async function upsertWaypointPlaceCommunity(input: {
  id?: string;
  fips: string;
  name: string;
  shortName: string;
  region: string;
  coordinates: [number, number];
  zoomLevel?: number;
  heroImageStyle?: PlaceCommunityRecord["heroImageStyle"];
  tagline: string;
  keyInsights: string[];
  dataStatus?: DataVerificationStatus;
  dataSourcesPending?: string[];
  calibrationPillars: PillarMetrics;
  publishedToPublic?: boolean;
}): Promise<PlaceCommunityRecord> {
  await ensureWaypointPlacesTables();
  const id =
    input.id?.trim() ||
    `ga-${input.shortName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const now = new Date().toISOString();

  await _execDnsRunInternal(
    `INSERT INTO waypoint_places_communities (
      id, fips, name, short_name, state_code, region, lng, lat, zoom_level,
      hero_image_style, tagline, key_insights_json, data_status,
      data_sources_pending_json, pillars_json, published_to_public, updated_at
    ) VALUES (?, ?, ?, ?, 'GA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      fips = excluded.fips,
      name = excluded.name,
      short_name = excluded.short_name,
      region = excluded.region,
      lng = excluded.lng,
      lat = excluded.lat,
      zoom_level = excluded.zoom_level,
      hero_image_style = excluded.hero_image_style,
      tagline = excluded.tagline,
      key_insights_json = excluded.key_insights_json,
      data_status = excluded.data_status,
      data_sources_pending_json = excluded.data_sources_pending_json,
      pillars_json = excluded.pillars_json,
      published_to_public = excluded.published_to_public,
      updated_at = excluded.updated_at`,
    [
      id,
      input.fips.trim(),
      input.name.trim(),
      input.shortName.trim(),
      input.region.trim(),
      input.coordinates[0],
      input.coordinates[1],
      input.zoomLevel ?? 9.5,
      input.heroImageStyle ?? "tree_lined_avenue",
      input.tagline.trim(),
      JSON.stringify(input.keyInsights),
      input.dataStatus ?? "preliminary_model",
      JSON.stringify(
        input.dataSourcesPending ?? ["GOSA CCRPI", "GaDOE Special Ed APR", "US Census ACS"]
      ),
      JSON.stringify(input.calibrationPillars),
      input.publishedToPublic !== false ? 1 : 0,
      now,
    ]
  );

  const rows = await _execDnsSelectInternal(
    `SELECT * FROM waypoint_places_communities WHERE id = ? LIMIT 1`,
    [id]
  );
  return mapCommunityRow(rows[0]);
}

export interface WaypointPlacesStudioConfig {
  weights: ScoringWeightsConfig;
  pmtilesArchiveUrl: string;
  r2PublicPrefix: string;
  showModelCalibrationDefault: boolean;
  lastPublishedAt: string | null;
  updatedAt: string;
}

export async function getWaypointPlacesConfig(): Promise<WaypointPlacesStudioConfig> {
  await ensureWaypointPlacesTables();
  const rows = await _execDnsSelectInternal(
    `SELECT * FROM waypoint_places_config WHERE id = 1 LIMIT 1`,
    []
  );
  const row = rows[0] || {};
  let weights = DEFAULT_SCORING_WEIGHTS;
  try {
    const parsed = JSON.parse(String(row.weights_json || "{}"));
    if (parsed && typeof parsed.academics === "number") {
      weights = { ...DEFAULT_SCORING_WEIGHTS, ...parsed };
    }
  } catch {
    weights = DEFAULT_SCORING_WEIGHTS;
  }

  return {
    weights,
    pmtilesArchiveUrl: String(
      row.pmtiles_archive_url || "/api/places/tiles/georgia-overview.pmtiles"
    ),
    r2PublicPrefix: String(row.r2_public_prefix || "waypoint-places-public"),
    showModelCalibrationDefault: Number(row.show_model_calibration_default ?? 1) === 1,
    lastPublishedAt: row.last_published_at ? String(row.last_published_at) : null,
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export async function saveWaypointPlacesConfig(input: {
  weights?: Partial<ScoringWeightsConfig>;
  pmtilesArchiveUrl?: string;
  r2PublicPrefix?: string;
  showModelCalibrationDefault?: boolean;
}): Promise<WaypointPlacesStudioConfig> {
  const current = await getWaypointPlacesConfig();
  const nextWeights: ScoringWeightsConfig = {
    ...current.weights,
    ...(input.weights || {}),
  };
  const now = new Date().toISOString();

  await _execDnsRunInternal(
    `UPDATE waypoint_places_config
     SET weights_json = ?,
         pmtiles_archive_url = ?,
         r2_public_prefix = ?,
         show_model_calibration_default = ?,
         updated_at = ?
     WHERE id = 1`,
    [
      JSON.stringify(nextWeights),
      (input.pmtilesArchiveUrl ?? current.pmtilesArchiveUrl).trim(),
      (input.r2PublicPrefix ?? current.r2PublicPrefix).trim(),
      (input.showModelCalibrationDefault ?? current.showModelCalibrationDefault) ? 1 : 0,
      now,
    ]
  );

  return await getWaypointPlacesConfig();
}

export interface PublishedPlacesSnapshot {
  version: string;
  generatedAt: string;
  publishedBy: string;
  isolatedFromCrmPii: true;
  offlineAutonomousReady: true;
  r2ObjectKey: string;
  pmtilesArchiveUrl: string;
  weights: ScoringWeightsConfig;
  communities: PlaceCommunityRecord[];
  schoolDistricts: PlaceSchoolDistrictRecord[];
  schools: PlaceSchoolRecord[];
  specialEdIntelligence?: SpecialEducationIntelligenceRecord[];
  boundaryCrosswalks?: GeographicBoundaryCrosswalkRecord[];
  specializedFacilitiesSnapshot?: SpecializedFacilitiesSnapshot;
  amenities: typeof INITIAL_GEORGIA_AMENITIES;
  storageSuitabilityMatrix: typeof CLOUDFLARE_STORAGE_EVALUATION;
}

export async function buildIsolatedPublicPlacesSnapshot(
  publishedBy = "Waypoint Places Studio"
): Promise<PublishedPlacesSnapshot> {
  const [communities, config, importedDistricts, importedSchools, spedRecords, crosswalks] =
    await Promise.all([
      listWaypointPlacesCommunities({ onlyPublished: true }),
      getWaypointPlacesConfig(),
      listImportedNcesDistricts(),
      listImportedNcesSchools(),
      listSpecialEdIntelligenceRecords(),
      listBoundaryCrosswalkRecords(),
    ]);
  const specializedFacilitiesSnapshot = getSpecializedFacilitiesSnapshot();

  const now = new Date().toISOString();
  const version = `v1-${now.slice(0, 10)}`;
  const r2ObjectKey = `${config.r2PublicPrefix}/georgia-places-snapshot.json`;

  return {
    version,
    generatedAt: now,
    publishedBy,
    isolatedFromCrmPii: true,
    offlineAutonomousReady: true,
    r2ObjectKey,
    pmtilesArchiveUrl: config.pmtilesArchiveUrl,
    weights: config.weights,
    communities,
    schoolDistricts: importedDistricts.length
      ? importedDistricts
      : INITIAL_GEORGIA_SCHOOL_DISTRICTS,
    schools: importedSchools.length ? importedSchools : INITIAL_GEORGIA_SCHOOLS,
    specialEdIntelligence: spedRecords,
    boundaryCrosswalks: crosswalks,
    specializedFacilitiesSnapshot,
    amenities: INITIAL_GEORGIA_AMENITIES,
    storageSuitabilityMatrix: CLOUDFLARE_STORAGE_EVALUATION,
  };
}

export async function publishWaypointPlacesSnapshot(
  publishedBy = "Byron Honea"
): Promise<PublishedPlacesSnapshot> {
  await ensureWaypointPlacesTables();
  const snapshot = await buildIsolatedPublicPlacesSnapshot(publishedBy);
  const serialized = JSON.stringify(snapshot, null, 2);

  await _execDnsRunInternal(
    `INSERT INTO waypoint_places_snapshots (
      snapshot_version, published_by, communities_count, districts_count,
      schools_count, r2_object_key, snapshot_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      snapshot.version,
      publishedBy,
      snapshot.communities.length,
      snapshot.schoolDistricts.length,
      snapshot.schools.length,
      snapshot.r2ObjectKey,
      serialized,
      snapshot.generatedAt,
    ]
  );

  await _execDnsRunInternal(
    `UPDATE waypoint_places_config SET last_published_at = ?, updated_at = ? WHERE id = 1`,
    [snapshot.generatedAt, snapshot.generatedAt]
  );

  return snapshot;
}

