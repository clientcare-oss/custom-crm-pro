import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  buildIsolatedPublicPlacesSnapshot,
  getWaypointPlacesConfig,
  listWaypointPlacesCommunities,
  publishWaypointPlacesSnapshot,
  saveWaypointPlacesConfig,
  upsertWaypointPlaceCommunity,
} from "../db/waypointPlaces";
import {
  getAutomatedSchedulerJobsState,
  getDataOperationsConsoleState,
  getOrImportCountySubCountyTracts,
  getOrImportSchoolDistrictBoundaries,
  listImportedNcesDistricts,
  listImportedNcesSchools,
  listImportedTherapyProviders,
  runCmsNppesTherapyProvidersImport,
  runNcesCcdDirectoryImport,
  runScheduledWaypointPlacesRefresh,
  runUsCensusAcs5Import,
} from "../services/waypointPlacesDataEngine";
import {
  getRightsAndAccountabilityBundleForLocation,
  getRightsAndAccountabilityConsoleState,
  runRightsConnectorImport,
} from "../services/waypointPlacesRightsEngine";
import {
  getSpecializedFacilitiesForLocation,
  getSpecializedFacilitiesSnapshot,
  syncSpecializedFacilitiesPipeline,
} from "../services/waypointPlacesSpecializedEngine";
import {
  CLOUDFLARE_STORAGE_EVALUATION,
  INITIAL_GEORGIA_AMENITIES,
  INITIAL_GEORGIA_SCHOOL_DISTRICTS,
  INITIAL_GEORGIA_SCHOOLS,
} from "../../shared/waypointPlaces";

export const waypointPlacesRouter = router({
  /**
   * Public-safe read procedure used by both the internal Places Explorer preview
   * and the standalone public Places Explorer app.
   * Never reads from protected CRM tables.
   */
  getPublicExplorerData: publicProcedure.query(async () => {
    return await buildIsolatedPublicPlacesSnapshot("Places Explorer Live");
  }),

  /**
   * Sub-County Neighborhood Census Tract Polygons & School District Boundaries for a Selected County:
   * Fetches and caches real Census Tract polygons (11-digit GEOID) + ACS 5-Year estimates/MOE
   * and real TIGERweb Unified School District boundaries.
   */
  getCountyNeighborhoodTracts: publicProcedure
    .input(
      z.object({
        countyFips5: z.string().regex(/^\d{5}$/).default("13067"),
      })
    )
    .query(async ({ input }) => {
      const stateFips2 = input.countyFips5.slice(0, 2);
      const [tracts, schoolDistrictBoundaries, therapyProviders] = await Promise.all([
        getOrImportCountySubCountyTracts(input.countyFips5, { allowLiveFetch: true }),
        getOrImportSchoolDistrictBoundaries(stateFips2, { allowLiveFetch: true }),
        listImportedTherapyProviders(input.countyFips5),
      ]);
      return {
        countyFips5: input.countyFips5,
        tracts,
        schoolDistrictBoundaries: schoolDistrictBoundaries.filter(
          (b) => b.countyFips5 === input.countyFips5
        ),
        therapyProviders,
      };
    }),

  /**
   * Phase 2 Data Operations Console State (Milestone A & B):
   * Returns connected sources, import run history, records imported,
   * verification breakdown (Verified, Parent Reported, Unverified, Outdated, Unknown),
   * ACS Margin-of-Error quality warnings, non-coterminous boundary crosswalks,
   * and Special Education Intelligence dossiers.
   */
  getDataOperationsState: publicProcedure.query(async () => {
    return await getDataOperationsConsoleState();
  }),

  /**
   * Nationwide Special Education Rights & Accountability Bundle for a Selected Location:
   * Returns state dispute procedures, Facilitated IEP availability, State Complaint & Due Process timelines,
   * district-explicit vs. state-only published decisions, IDEA Part B APR monitoring & OCR enforcement,
   * SWD graduation/academic/discipline/restraint/staffing metrics, and PTI/P&A/Safeguards links.
   */
  getRightsForLocation: publicProcedure
    .input(
      z.object({
        stateFips2: z.string().min(2).max(2).default("13"),
        countyFips5: z.string().nullable().optional(),
        ncesLeaId7: z.string().nullable().optional(),
        verifiedOnly: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getRightsAndAccountabilityBundleForLocation({
        stateFips2: input.stateFips2,
        countyFips5: input.countyFips5 ?? null,
        ncesLeaId7: input.ncesLeaId7 ?? null,
        verifiedOnly: input.verifiedOnly,
      });
    }),

  /**
   * Automated Refresh Scheduler Jobs & Execution State
   */
  getSchedulerJobsState: publicProcedure.query(async () => {
    return await getAutomatedSchedulerJobsState();
  }),

  /**
   * Trigger / Verify Automated Background Scheduler Tick (supports repeat-idempotency and simulated failure LKG preservation checks)
   */
  runScheduledRefresh: protectedProcedure
    .input(
      z.object({
        sourceId: z
          .enum(["us_census_acs5", "nces_ccd_directory", "cms_nppes_npi_providers", "all"])
          .default("all"),
        forceDue: z.boolean().default(true),
        simulateFailure: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Byron Honea";
      return await runScheduledWaypointPlacesRefresh({
        sourceId: input.sourceId,
        forceDue: input.forceDue,
        simulateFailure: input.simulateFailure,
        allowLiveFetch: true,
        triggeredBy: `Automated Scheduler (${actor})`,
      });
    }),

  /**
   * 50-State Rights & Accountability Source Inventory & Connector Registry State
   */
  getRightsConsoleState: publicProcedure.query(async () => {
    return await getRightsAndAccountabilityConsoleState();
  }),

  /**
   * Nationwide Specialized Programs & Residential Facilities Snapshot (All 50 States, 10 Categories, 7 Automated Connectors)
   */
  getSpecializedFacilitiesState: publicProcedure.query(async () => {
    return getSpecializedFacilitiesSnapshot();
  }),

  /**
   * Location-Filtered Specialized Programs & Residential Facilities (County / State / Category / Setting / Pathway)
   */
  getSpecializedFacilitiesForLocation: publicProcedure
    .input(
      z.object({
        stateCode: z.string().default("GA"),
        countyFips: z.string().nullable().optional(),
        category: z
          .enum([
            "all",
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
          ])
          .default("all"),
        settingMode: z
          .enum(["all", "Day", "Residential", "Both (Day & Residential)"])
          .default("all"),
        placementPathway: z
          .enum([
            "all",
            "IEP Team Placement / Publicly Funded",
            "Private Parent Enrollment",
            "Clinical / Medical Referral",
            "State Agency / DJJ / DFCS / DBHDD Referral",
            "Other / Unknown",
          ])
          .default("all"),
        searchQuery: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return getSpecializedFacilitiesForLocation({
        stateCode: input.stateCode,
        countyFips: input.countyFips ?? null,
        category: input.category,
        settingMode: input.settingMode,
        placementPathway: input.placementPathway,
        searchQuery: input.searchQuery,
      });
    }),

  /**
   * Automated Specialized Programs & Residential Facilities Connector Refresh
   */
  runSpecializedConnectorRefresh: protectedProcedure
    .input(
      z.object({
        connectorId: z
          .enum([
            "samhsa_treatment_directory",
            "state_behavioral_health_licensing",
            "sea_approved_nonpublic_sped",
            "state_operated_schools_directory",
            "ga_gadoe_gnets_special_entities",
            "state_rtf_licensing_inspections",
            "other_machine_readable_directories",
          ])
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      return syncSpecializedFacilitiesPipeline(input.connectorId);
    }),

  /**
   * Automated Rights & Accountability Source Connector Trigger
   */
  runRightsConnectorRefresh: protectedProcedure
    .input(
      z.object({
        connectorId: z.enum([
          "us_osep_50state_dispute_pti_pa",
          "ga_osah_due_process_index",
          "ga_gadoe_dispute_resolution",
          "ga_gadoe_idea_apr_monitoring",
          "us_ed_ocr_enforcement",
          "multi_state_hearing_indexes",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Byron Honea";
      return await runRightsConnectorImport({
        connectorId: input.connectorId,
        triggeredBy: `Automated Connector Sync (${actor})`,
      });
    }),

  /**
   * Manual / Scheduled Connector Trigger for Authorized Staff:
   * Runs incremental import, duplicate detection, schema validation,
   * warning detection, and automatic score recalculation.
   */
  runDataSourceImport: protectedProcedure
    .input(
      z.object({
        sourceId: z.enum([
          "us_census_acs5",
          "nces_ccd_directory",
          "cms_nppes_npi_providers",
        ]),
        stateFips2: z.string().regex(/^\d{2}$/).default("13"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const actor = ctx.user?.name || ctx.user?.email || "Byron Honea";
      if (input.sourceId === "us_census_acs5") {
        return await runUsCensusAcs5Import({
          stateFips2: input.stateFips2,
          triggeredBy: `Manual Refresh (${actor})`,
          allowLiveFetch: true,
        });
      }
      if (input.sourceId === "cms_nppes_npi_providers") {
        return await runCmsNppesTherapyProvidersImport({
          stateCode: "GA",
          triggeredBy: `Manual Refresh (${actor})`,
          allowLiveFetch: true,
        });
      }
      return await runNcesCcdDirectoryImport({
        stateFips2: input.stateFips2,
        triggeredBy: `Manual Refresh (${actor})`,
        allowLiveFetch: true,
      });
    }),

  /**
   * Internal staff-only Studio state (includes unpublished communities,
   * scoring weights, PMTiles configuration, and D1/R2 suitability evaluation).
   */
  getStudioState: protectedProcedure.query(async () => {
    const [communities, config, importedDistricts, importedSchools, dataOps] =
      await Promise.all([
        listWaypointPlacesCommunities({ onlyPublished: false }),
        getWaypointPlacesConfig(),
        listImportedNcesDistricts(),
        listImportedNcesSchools(),
        getDataOperationsConsoleState(),
      ]);

    return {
      communities,
      schoolDistricts: importedDistricts.length
        ? importedDistricts
        : INITIAL_GEORGIA_SCHOOL_DISTRICTS,
      schools: importedSchools.length ? importedSchools : INITIAL_GEORGIA_SCHOOLS,
      amenities: INITIAL_GEORGIA_AMENITIES,
      config,
      storageSuitability: CLOUDFLARE_STORAGE_EVALUATION,
      dataOperations: dataOps,
    };
  }),

  saveStudioConfig: protectedProcedure
    .input(
      z.object({
        weights: z
          .object({
            academics: z.number().min(0).max(1).optional(),
            specializedPrograms: z.number().min(0).max(1).optional(),
            safetyWellBeing: z.number().min(0).max(1).optional(),
            familyLifestyle: z.number().min(0).max(1).optional(),
            affordability: z.number().min(0).max(1).optional(),
            commute: z.number().min(0).max(1).optional(),
          })
          .optional(),
        pmtilesArchiveUrl: z.string().max(500).optional(),
        r2PublicPrefix: z.string().max(200).optional(),
        showModelCalibrationDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await saveWaypointPlacesConfig(input);
    }),

  upsertCommunity: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        fips: z.string().min(5).max(5),
        name: z.string().min(2).max(160),
        shortName: z.string().min(2).max(100),
        region: z.string().min(2).max(120),
        coordinates: z.tuple([z.number(), z.number()]),
        zoomLevel: z.number().optional(),
        heroImageStyle: z
          .enum(["tree_lined_avenue", "historic_square", "lakeside_park", "piedmont_ridge"])
          .optional(),
        tagline: z.string().min(4).max(500),
        keyInsights: z.array(z.string()),
        dataStatus: z
          .enum(["awaiting_verified_dataset", "fictional_calibration", "verified_public_source"])
          .optional(),
        calibrationPillars: z.object({
          communityQuality: z.number().nullable(),
          academics: z.number().nullable(),
          specializedPrograms: z.number().nullable(),
          safetyWellBeing: z.number().nullable(),
          familyLifestyle: z.number().nullable(),
          affordability: z.number().nullable(),
          commute: z.number().nullable(),
        }),
        publishedToPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await upsertWaypointPlaceCommunity(input);
    }),

  publishPublicSnapshot: protectedProcedure.mutation(async ({ ctx }) => {
    const actorName = ctx.user?.name || ctx.user?.email || "Byron Honea";
    return await publishWaypointPlacesSnapshot(actorName);
  }),
});

