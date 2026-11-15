import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import {
  CHOROPLETH_LEGEND_STOPS,
  CHOROPLETH_MEASURES,
  CLOUDFLARE_STORAGE_EVALUATION,
  DEFAULT_SCORING_WEIGHTS,
  DEMO_COUNTY_CALIBRATION_BY_FIPS,
  DEMO_STATE_CALIBRATION_BY_FIPS2,
  INITIAL_GEORGIA_COMMUNITIES,
  computeCommunityQualityScore,
  computeFamilyFitScore,
  getChoroplethFillColor,
  resolvePillarMeasureValue,
} from "../shared/waypointPlaces";
import {
  getGeorgiaCountiesGeoJson,
  getGeorgiaPmtilesArchiveBuffer,
  sliceByteRange,
} from "./waypointPlacesRoutes";
import { _execDnsRunInternal } from "./db/doNotServe";

const staffCaller = appRouter.createCaller({
  req: { headers: {} } as any,
  res: {} as any,
  user: {
    id: 1,
    openId: "test-owner-1",
    name: "Byron Honea",
    email: "byron@waypointadvocates.com",
    role: "admin",
    timezone: "America/New_York",
  } as any,
});

const publicCaller = appRouter.createCaller({
  req: { headers: {} } as any,
  res: {} as any,
  user: null,
});

describe("Waypoint Places (PG-010-PLC) — Georgia MapLibre/PMTiles Prototype & Studio", () => {
  it("extracts all 159 real Georgia county polygons (FIPS 13xxx) and serves valid PMTiles v3 HTTP 206 byte ranges", () => {
    const geojson = getGeorgiaCountiesGeoJson();
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features.length).toBe(159);

    const forsyth = geojson.features.find((f: any) => f.properties.fips === "13117");
    expect(forsyth).toBeDefined();
    expect(forsyth.properties.name).toBe("Forsyth County, GA");
    expect(forsyth.properties.isCuratedHub).toBe(true);

    const pmtilesBuf = getGeorgiaPmtilesArchiveBuffer();
    expect(pmtilesBuf.subarray(0, 7).toString("ascii")).toBe("PMTiles");
    expect(pmtilesBuf.readUInt8(7)).toBe(3); // PMTiles spec v3

    const rangeRes = sliceByteRange(pmtilesBuf, "bytes=0-126");
    expect(rangeRes.status).toBe(206);
    expect(rangeRes.chunk.length).toBe(127);
    expect(rangeRes.headers["Accept-Ranges"]).toBe("bytes");
    expect(rangeRes.headers["Content-Range"]).toBe(`bytes 0-126/${pmtilesBuf.length}`);
  });

  it("computes Community Quality Score and personalized Family Fit Score without fabricating unseeded data", () => {
    const forsyth = INITIAL_GEORGIA_COMMUNITIES.find((c) => c.fips === "13117")!;
    const baseScore = computeCommunityQualityScore(
      forsyth.calibrationPillars,
      DEFAULT_SCORING_WEIGHTS
    );
    expect(baseScore).toBeGreaterThanOrEqual(90);

    const fitAcademics = computeFamilyFitScore(
      forsyth.calibrationPillars,
      ["academics", "safetyWellBeing"],
      DEFAULT_SCORING_WEIGHTS
    );
    const fitAffordability = computeFamilyFitScore(
      forsyth.calibrationPillars,
      ["affordability"],
      DEFAULT_SCORING_WEIGHTS
    );
    expect(fitAcademics).not.toBeNull();
    expect(fitAffordability).not.toBeNull();
    expect(fitAcademics!).toBeGreaterThan(fitAffordability!);

    // Unseeded county must return null instead of fabricating a score
    const unseededScore = computeCommunityQualityScore({
      communityQuality: null,
      academics: null,
      specializedPrograms: null,
      safetyWellBeing: null,
      familyLifestyle: null,
      affordability: null,
      commute: null,
    });
    expect(unseededScore).toBeNull();
  });

  it("evaluates Cloudflare D1 vs R2 suitability and isolates public Places Explorer snapshots from CRM PII", async () => {
    expect(CLOUDFLARE_STORAGE_EVALUATION.length).toBeGreaterThanOrEqual(4);
    const tilesEval = CLOUDFLARE_STORAGE_EVALUATION[0];
    expect(tilesEval.recommendedService).toContain("Cloudflare R2");
    expect(tilesEval.d1Suitability).toContain("Not Suitable");

    const publicData = await publicCaller.waypointPlaces.getPublicExplorerData();
    expect(publicData.isolatedFromCrmPii).toBe(true);
    expect(publicData.offlineAutonomousReady).toBe(true);
    expect(publicData.communities.some((c) => c.fips === "13117")).toBe(true);

    const studioState = await staffCaller.waypointPlaces.getStudioState();
    expect(studioState.communities.length).toBeGreaterThanOrEqual(10);

    const created = await staffCaller.waypointPlaces.upsertCommunity({
      id: "ga-test-hall",
      fips: "13139",
      name: "Hall County (Gainesville), GA",
      shortName: "Hall County",
      region: "Northeast Georgia / Lake Lanier",
      coordinates: [-83.82, 34.3],
      tagline: "Lake Lanier corridor awaiting verified dataset import.",
      keyInsights: ["Awaiting GOSA & GaDOE dataset import"],
      dataStatus: "awaiting_verified_dataset",
      calibrationPillars: {
        communityQuality: null,
        academics: null,
        specializedPrograms: null,
        safetyWellBeing: null,
        familyLifestyle: null,
        affordability: null,
        commute: null,
      },
      publishedToPublic: true,
    });
    expect(created.fips).toBe("13139");
    expect(created.dataStatus).toBe("awaiting_verified_dataset");

    const published = await staffCaller.waypointPlaces.publishPublicSnapshot();
    expect(published.isolatedFromCrmPii).toBe(true);
    expect(published.r2ObjectKey).toContain("waypoint-places-public");

    // Clean up test community
    await _execDnsRunInternal(
      `DELETE FROM waypoint_places_communities WHERE id = ?`,
      ["ga-test-hall"]
    );
  });

  it("registers PG-010-PLC in pageIdRegistry and Tools catalog while keeping WaypointPlaces header free of inline PageIdBadge", () => {
    const registrySource = fs.readFileSync(
      path.resolve(process.cwd(), "client/src/lib/pageIdRegistry.ts"),
      "utf8"
    );
    expect(registrySource).toContain('"/tools/waypoint-places"');
    expect(registrySource).toContain('"PG-010-PLC"');

    const toolsCatalogSource = fs.readFileSync(
      path.resolve(process.cwd(), "client/src/components/tools/toolsCatalogData.ts"),
      "utf8"
    );
    expect(toolsCatalogSource).toContain('id: "waypoint-places"');
    expect(toolsCatalogSource).toContain('drawerTitle: "Waypoint Places"');

    const placesPageSource = fs.readFileSync(
      path.resolve(process.cwd(), "client/src/pages/WaypointPlaces.tsx"),
      "utf8"
    );
    expect(placesPageSource).not.toContain("<PageIdBadge");
  });

  it("maps choropleth measures (Quality, Family Fit, Safety, Affordability, Schools, Connectivity) to distinct blue/violet polygon gradient colors and No Verified Data", () => {
    expect(CHOROPLETH_MEASURES.map((m) => m.key)).toEqual([
      "communityQuality",
      "familyFit",
      "academics",
      "safetyWellBeing",
      "affordability",
      "commute",
    ]);
    expect(CHOROPLETH_LEGEND_STOPS.length).toBe(6);

    // High (85-100) -> #7C6EE6, Above Avg (75-84) -> #4A6CF7, Moderate (65-74) -> #274B8F, Lower (50-64) -> #152954, Low (<50) -> #0C1836, Missing -> #050D24
    expect(getChoroplethFillColor(92, true)).toBe("#7C6EE6");
    expect(getChoroplethFillColor(80, true)).toBe("#4A6CF7");
    expect(getChoroplethFillColor(70, true)).toBe("#274B8F");
    expect(getChoroplethFillColor(58, true)).toBe("#152954");
    expect(getChoroplethFillColor(44, true)).toBe("#0C1836");
    expect(getChoroplethFillColor(null, true)).toBe("#050D24");
    expect(getChoroplethFillColor(92, false)).toBe("#050D24");

    // Verify regional inversion between Schools and Affordability for Forsyth (13117) vs Houston (13153)
    const forsythPillars = DEMO_COUNTY_CALIBRATION_BY_FIPS["13117"];
    const houstonPillars = DEMO_COUNTY_CALIBRATION_BY_FIPS["13153"];
    const forsythSchools = resolvePillarMeasureValue(
      forsythPillars,
      "academics",
      ["academics"],
      DEFAULT_SCORING_WEIGHTS
    );
    const forsythAffordability = resolvePillarMeasureValue(
      forsythPillars,
      "affordability",
      ["academics"],
      DEFAULT_SCORING_WEIGHTS
    );
    const houstonAffordability = resolvePillarMeasureValue(
      houstonPillars,
      "affordability",
      ["academics"],
      DEFAULT_SCORING_WEIGHTS
    );

    expect(getChoroplethFillColor(forsythSchools, true)).toBe("#7C6EE6"); // 95 -> High
    expect(getChoroplethFillColor(forsythAffordability, true)).toBe("#152954"); // 62 -> Lower
    expect(getChoroplethFillColor(houstonAffordability, true)).toBe("#7C6EE6"); // 90 -> High

    // Verify state calibration includes Georgia ("13") and leaves unscored states as null ("No Verified Data")
    expect(DEMO_STATE_CALIBRATION_BY_FIPS2["13"].communityQuality).toBe(86);
    expect(DEMO_STATE_CALIBRATION_BY_FIPS2["30"]).toBeUndefined();
  });

  it("Milestone A & B: imports real U.S. Census ACS 5-Year (with Margin of Error) & NCES CCD records, enforces duplicate detection, flags high-MOE warnings, separates 5 SPED verification tiers, and recalculates verified pillar scores with strict null missing-data handling", async () => {
    // 1. Trigger Data Operations State (auto-seeds Milestone B if needed)
    const opsInitial = await publicCaller.waypointPlaces.getDataOperationsState();
    expect(opsInitial.connectors.length).toBe(9);
    expect(opsInitial.totals.measurementsCount).toBeGreaterThanOrEqual(75);
    expect(opsInitial.totals.ncesDistrictsCount).toBeGreaterThanOrEqual(14);
    expect(opsInitial.totals.ncesSchoolsCount).toBeGreaterThanOrEqual(13);

    // 2. Verify duplicate detection on incremental re-import
    const acsReRun = await staffCaller.waypointPlaces.runDataSourceImport({
      sourceId: "us_census_acs5",
      stateFips2: "13",
    });
    expect(acsReRun.recordsProcessed).toBeGreaterThanOrEqual(15);
    expect(acsReRun.duplicatesSkipped).toBeGreaterThan(0);
    expect(acsReRun.sourceChecksum).toMatch(/^fnv1a-/);

    const ncesReRun = await staffCaller.waypointPlaces.runDataSourceImport({
      sourceId: "nces_ccd_directory",
      stateFips2: "13",
    });
    expect(ncesReRun.status).toBe("succeeded");
    expect(ncesReRun.duplicatesSkipped).toBeGreaterThan(0);

    // 3. Verify High Margin-of-Error (>15%) Data Quality Warning (Taliaferro County FIPS 13265)
    // and Non-Coterminous Boundary Crosswalk Warning (ZCTA 30030 Decatur / DeKalb)
    const opsAfter = await publicCaller.waypointPlaces.getDataOperationsState();
    const highMoeWarn = opsAfter.qualityWarnings.find(
      (w) => w.category === "high_margin_of_error" && w.geoid === "13265"
    );
    expect(highMoeWarn).toBeDefined();
    expect(highMoeWarn!.message).toContain("Margin of Error");

    const zctaCrosswalk = opsAfter.boundaryCrosswalks.find(
      (x) => x.fromGeoid === "30030" && x.toGeoid === "1301650"
    );
    expect(zctaCrosswalk).toBeDefined();
    expect(zctaCrosswalk!.overlapType).toBe("partial_split");

    // 4. Verify Special Education Intelligence 5-tier separation & mandatory non-guarantee disclaimer
    const tiersPresent = new Set(
      opsAfter.specialEdIntelligence.map((s) => s.verificationTier)
    );
    expect(tiersPresent.has("Verified")).toBe(true);
    expect(tiersPresent.has("Parent Reported")).toBe(true);
    expect(tiersPresent.has("Outdated")).toBe(true);
    expect(tiersPresent.has("Unverified")).toBe(true);
    for (const sped of opsAfter.specialEdIntelligence) {
      expect(sped.nonGuaranteeDisclaimer).toContain("never guarantees IDEA eligibility");
    }

    // 5. Verify Public Explorer Snapshot connects real ACS Demographics (±MOE), NCES IDs,
    // Evidence Completeness ("2/6 Verified Sources"), and Verified Pillar Scores while keeping unimported pillars null
    const snapshot = await publicCaller.waypointPlaces.getPublicExplorerData();
    const forsyth = snapshot.communities.find((c) => c.fips === "13117")!;
    expect(forsyth.acsDemographics).toBeDefined();
    expect(forsyth.acsDemographics!.surveyPeriod).toBe("2018-2022 ACS 5-Year");
    expect(forsyth.acsDemographics!.medianHouseholdIncome).toBeGreaterThan(100000);
    expect(forsyth.acsDemographics!.medianHouseholdIncomeMoe).toBeGreaterThan(0);
    expect(forsyth.evidenceCompleteness?.ratioText).toBe("2/6 Verified Sources");

    // Verified pillars must have real 0-100 scores for affordability, commute, and familyLifestyle,
    // while unimported pillars (academics, specializedPrograms, safetyWellBeing) MUST be strictly null (never 0!)
    expect(forsyth.verifiedPillars).toBeDefined();
    expect(typeof forsyth.verifiedPillars!.affordability).toBe("number");
    expect(typeof forsyth.verifiedPillars!.commute).toBe("number");
    expect(typeof forsyth.verifiedPillars!.familyLifestyle).toBe("number");
    expect(forsyth.verifiedPillars!.academics).toBeNull();
    expect(forsyth.verifiedPillars!.specializedPrograms).toBeNull();
    expect(forsyth.verifiedPillars!.safetyWellBeing).toBeNull();

    // Verify NCES 12-digit school IDs (NCESSCH) and 7-digit LEAIDs in snapshot
    const winnonaPark = snapshot.schools.find(
      (s) => s.ncesSchoolId === "130165000724"
    );
    expect(winnonaPark).toBeDefined();
    expect(winnonaPark!.ncesLeaId).toBe("1301650");
    expect(winnonaPark!.enrollment).toBe(274);
  });

  it("Rights & Accountability Expansion: covers all 50 states (+DC), enforces strict geographic attribution, validates PDF redaction safeguards, separates allegations vs substantiated findings, and never treats complaints as quality scores", async () => {
    // 1. Verify 50-state (+DC = 51 jurisdictions) inventory and automated connector registry
    const rightsConsole = await publicCaller.waypointPlaces.getRightsConsoleState();
    expect(rightsConsole.totals.statesCoveredCount).toBe(51);
    expect(rightsConsole.totals.connectorsCount).toBe(6);
    expect(rightsConsole.totals.publishedDecisionsCount).toBeGreaterThanOrEqual(7);
    expect(rightsConsole.totals.monitoringAndOcrCount).toBeGreaterThanOrEqual(11);
    expect(rightsConsole.totals.accountabilityProfilesCount).toBeGreaterThanOrEqual(10);

    // 2. Verify Fulton County (13121) returns explicit OSAH district-attributed decisions AND keeps redacted GaDOE state complaints in stateLevelUnattributedDecisions
    const fultonRights = await publicCaller.waypointPlaces.getRightsForLocation({
      stateFips2: "13",
      countyFips5: "13121",
    });
    expect(fultonRights.stateProfile.stateCode).toBe("GA");
    expect(fultonRights.sectionStatuses.facilitatedIepStatus).toBe(
      "Local availability varies"
    );
    expect(fultonRights.sectionStatuses.dueProcessHearingsStatus).toBe(
      "Published records found"
    );
    expect(fultonRights.districtPublishedDecisions.length).toBeGreaterThanOrEqual(1);
    expect(fultonRights.districtPublishedDecisions[0].ncesLeaId7).toBe("1302280");
    expect(fultonRights.districtPublishedDecisions[0].filingDate).toBe("2024-02-14");
    expect(fultonRights.districtPublishedDecisions[0].decisionDate).toBe("2024-05-09");
    expect(
      fultonRights.districtPublishedDecisions[0].allegations.length
    ).toBeGreaterThan(0);
    expect(
      fultonRights.districtPublishedDecisions[0].substantiatedFindings.length
    ).toBeGreaterThan(0);

    // State-only decisions (redacted LEA or unvalidated scanned PDF) must NEVER be mixed into districtPublishedDecisions
    expect(fultonRights.stateLevelUnattributedDecisions.length).toBeGreaterThanOrEqual(2);
    for (const stDec of fultonRights.stateLevelUnattributedDecisions) {
      expect(stDec.geographicSupportScope).toBe("state_only");
      expect(stDec.ncesLeaId7).toBeNull();
      expect(stDec.countyFips5).toBeNull();
    }

    // Verify PDF safeguard: unvalidated scanned PDF has publishMode === "official_link_only" and empty substantiatedFindings
    const unvalidatedPdf = fultonRights.stateLevelUnattributedDecisions.find(
      (d) => !d.pdfRedactionAndStructureValidated
    );
    expect(unvalidatedPdf).toBeDefined();
    expect(unvalidatedPdf!.publishMode).toBe("official_link_only");
    expect(unvalidatedPdf!.substantiatedFindings).toEqual([]);

    // 3. Verify Forsyth County (13117) has no published OSAH hearing decision in indexed docket -> explicitly reports "No published records found in indexed sources" while still having APR + OCR monitoring & SWD accountability records
    const forsythRights = await publicCaller.waypointPlaces.getRightsForLocation({
      stateFips2: "13",
      countyFips5: "13117",
    });
    expect(forsythRights.districtPublishedDecisions.length).toBe(0);
    expect(forsythRights.sectionStatuses.dueProcessHearingsStatus).toBe(
      "No published records found in indexed sources"
    );
    expect(forsythRights.sectionStatuses.monitoringAndOcrStatus).toBe(
      "Published records found"
    );
    expect(forsythRights.monitoringAndOcrRecords.some((m) => m.recordCategory === "federal_ocr_civil_rights_enforcement")).toBe(true);
    expect(forsythRights.accountabilityMetrics[0].swdGraduationRate4YrPct).toBe(86.4);
    expect(forsythRights.accountabilityMetrics[0].seclusionIncidentsCount).toBe(0);

    // 4. Verify another state (e.g. Massachusetts FIPS 25 & Illinois FIPS 17)
    const massRights = await publicCaller.waypointPlaces.getRightsForLocation({
      stateFips2: "25",
    });
    expect(massRights.stateProfile.stateCode).toBe("MA");
    expect(massRights.stateProfile.facilitatedIep.status).toBe("Available");
    expect(massRights.stateProfile.dueProcessProcedure.hearingTribunalAgency).toContain(
      "Bureau of Special Education Appeals (BSEA)"
    );

    const illinoisRights = await publicCaller.waypointPlaces.getRightsForLocation({
      stateFips2: "17",
    });
    expect(illinoisRights.stateProfile.stateCode).toBe("IL");
    expect(illinoisRights.stateProfile.facilitatedIep.status).toBe(
      "Not offered statewide"
    );

    // 5. Verify staff connector refresh trigger
    const syncRes = await staffCaller.waypointPlaces.runRightsConnectorRefresh({
      connectorId: "ga_osah_due_process_index",
    });
    expect(syncRes.recordsUpserted).toBeGreaterThan(0);
    expect(syncRes.sourceChecksum).toMatch(/^fnv1a-/);
  });

  it("Specialized Programs & Residential Facilities: covers all 50 states, preserves 10 distinct placement categories, includes Georgia GNETS & Devereux Georgia & GA PRTFs, enforces licensing/funding/LRE guardrails, and creates zero manual verification tasks", async () => {
    const specState = await publicCaller.waypointPlaces.getSpecializedFacilitiesState();

    // 1. All 50 U.S. states covered and zero manual tasks
    expect(specState.statesCoveredCount).toBe(50);
    expect(specState.manualTasksCount).toBe(0);
    expect(specState.connectors.length).toBe(7);
    for (const conn of specState.connectors) {
      expect(conn.manualTasksCreatedCount).toBe(0);
    }

    // 2. All 10 required categories are distinctly preserved and populated (never combined into one generic category)
    const expectedCategories = [
      "prtf",
      "therapeutic_residential",
      "private_autism_dd_school",
      "specialized_private_day_school",
      "public_therapeutic_gnets",
      "approved_nonpublic_sped_school",
      "state_operated_specialized_school",
      "intensive_behavioral_crisis_day",
      "licensed_dd_residential_group_home",
      "other_separate_alternative_env",
    ] as const;

    for (const cat of expectedCategories) {
      expect(specState.categoryCounts[cat]).toBeGreaterThan(0);
    }

    // 3. Initial testing must include Georgia's GNETS programs, Devereux Advanced Behavioral Health Georgia, and Georgia's published residential treatment facilities
    expect(specState.georgiaGnetsCount).toBeGreaterThanOrEqual(8);
    expect(specState.devereuxGeorgiaIncluded).toBe(true);
    expect(specState.georgiaPrtfAndRtcCount).toBeGreaterThanOrEqual(5);

    const devereuxPrtf = specState.facilities.find(
      (f) => f.facilityId === "ga-prtf-devereux-georgia-kennesaw"
    );
    expect(devereuxPrtf).toBeDefined();
    expect(devereuxPrtf!.category).toBe("prtf");
    expect(devereuxPrtf!.physicalLocation.countyFips).toBe("13067");
    expect(devereuxPrtf!.settingMode).toBe("Both (Day & Residential)");
    expect(devereuxPrtf!.operatorType).toBe("Nonprofit");
    expect(devereuxPrtf!.placementPathways).toContain(
      "IEP Team Placement / Publicly Funded"
    );
    expect(devereuxPrtf!.placementPathways).toContain("Clinical / Medical Referral");
    expect(devereuxPrtf!.licenseScopeNote).toContain(
      "Never assume a facility's state healthcare"
    );

    const cobbLocation =
      await publicCaller.waypointPlaces.getSpecializedFacilitiesForLocation({
        stateCode: "GA",
        countyFips: "13067",
      });
    expect(
      cobbLocation.localCountyFacilities.some((f) =>
        f.officialName.includes("Devereux")
      )
    ).toBe(true);
    expect(
      cobbLocation.localCountyFacilities.some(
        (f) => f.category === "public_therapeutic_gnets"
      )
    ).toBe(true);

    // 4. Verify mandatory guardrails
    expect(specState.guardrails.eligibilityAndFundingDisclaimer).toContain(
      "does NOT establish that a student qualifies for admission"
    );
    expect(specState.guardrails.licenseAuthorizationGuardrail).toContain(
      "Never assume a facility's"
    );
    expect(specState.guardrails.lreNeutralityGuardrail).toContain(
      "never treats a more restrictive or less restrictive setting as inherently better or worse"
    );
  });
});


