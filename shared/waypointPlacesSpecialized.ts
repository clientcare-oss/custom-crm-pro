/**
 * Waypoint Places — Nationwide Specialized Education & Residential Settings Intelligence System
 * Covers all 50 U.S. States and integrates with the Family Support Network,
 * School Profiles, Community Dossiers, and Map Layers (`specialized_residential`).
 *
 * STRICT ARCHITECTURAL & LEGAL GUARDRAILS (MANDATORY):
 * 1. DISTINCT PLACEMENT CATEGORIES: Never combine residential treatment (PRTFs / RTCs),
 *    therapeutic day schools, public therapeutic programs (e.g., Georgia GNETS),
 *    state-operated schools, and private autism/DD schools into one generic category.
 *    All 10 statutory/regulatory categories are preserved distinctly.
 * 2. ADMISSION, APPROPRIATENESS & PUBLIC FUNDING DISCLAIMER: A program's presence
 *    in Waypoint Places does NOT establish that a student qualifies for admission,
 *    that the program is educationally or clinically appropriate, or that a public
 *    school district (LEA) or state agency will fund or approve placement.
 * 3. LICENSING SCOPE GUARDRAIL: Never assume a facility's state healthcare, child-caring,
 *    or educational license authorizes every educational or clinical service listed.
 * 4. LRE / RESTRICTIVENESS NEUTRALITY: Never treat a restrictive setting as inherently
 *    better or worse based solely on its category, and never use facility counts to
 *    artificially inflate or penalize Community Quality scores.
 * 5. ZERO MANUAL MAINTENANCE: All ingestion, deduplication, source tracking, and quality
 *    checks run automatically. Whenever an attribute cannot be reliably verified from
 *    structured public data, it is automatically marked "Unknown" or "Data unavailable"
 *    without creating manual verification tasks.
 */

export type SpecializedFacilityCategory =
  | "prtf"
  | "therapeutic_residential"
  | "private_autism_dd_school"
  | "specialized_private_day_school"
  | "public_therapeutic_gnets"
  | "approved_nonpublic_sped_school"
  | "state_operated_specialized_school"
  | "intensive_behavioral_crisis_day"
  | "licensed_dd_residential_group_home"
  | "other_separate_alternative_env";

export type SpecializedSettingMode =
  | "Day"
  | "Residential"
  | "Both (Day & Residential)";

export type SpecializedOperatorType =
  | "Public (LEA / Regional)"
  | "Private"
  | "Nonprofit"
  | "State-Operated";

export type SpecializedPlacementPathway =
  | "IEP Team Placement / Publicly Funded"
  | "Private Parent Enrollment"
  | "Clinical / Medical Referral"
  | "State Agency / DJJ / DFCS / DBHDD Referral"
  | "Other / Unknown";

export type SpecializedSourceConnectorId =
  | "samhsa_treatment_directory"
  | "state_behavioral_health_licensing"
  | "sea_approved_nonpublic_sped"
  | "state_operated_schools_directory"
  | "ga_gadoe_gnets_special_entities"
  | "state_rtf_licensing_inspections"
  | "other_machine_readable_directories";

export interface SpecializedCategoryMetadata {
  id: SpecializedFacilityCategory;
  number: number;
  label: string;
  shortLabel: string;
  badgeColorHex: string;
  description: string;
  typicalSettingMode: SpecializedSettingMode;
}

export const SPECIALIZED_FACILITY_CATEGORIES: SpecializedCategoryMetadata[] = [
  {
    id: "prtf",
    number: 1,
    label: "Psychiatric Residential Treatment Facilities (PRTFs)",
    shortLabel: "PRTF",
    badgeColorHex: "#F43F5E",
    description:
      "Inpatient non-hospital psychiatric residential facilities certified under federal CMS/Medicaid and state healthcare regulation for youth requiring 24-hour intensive clinical stabilization and accredited on-campus educational instruction.",
    typicalSettingMode: "Both (Day & Residential)",
  },
  {
    id: "therapeutic_residential",
    number: 2,
    label: "Therapeutic Residential Treatment Programs",
    shortLabel: "Therapeutic Residential",
    badgeColorHex: "#FB7185",
    description:
      "Licensed child-caring residential treatment centers (RTCs) providing structured 24-hour therapeutic living environments combined with special education or accredited academic instruction.",
    typicalSettingMode: "Residential",
  },
  {
    id: "private_autism_dd_school",
    number: 3,
    label: "Private Autism & Developmental Disability Schools",
    shortLabel: "Autism / DD School",
    badgeColorHex: "#38BDF8",
    description:
      "Specialized private and nonprofit day schools specifically designed for students with autism spectrum disorder, communication differences, and developmental or intellectual disabilities.",
    typicalSettingMode: "Day",
  },
  {
    id: "specialized_private_day_school",
    number: 4,
    label: "Specialized Private Day Schools",
    shortLabel: "Specialized Private Day",
    badgeColorHex: "#60A5FA",
    description:
      "Independent accredited day schools serving students with dyslexia, language-based learning disabilities, ADHD, executive function needs, or sensory-motor profiles.",
    typicalSettingMode: "Day",
  },
  {
    id: "public_therapeutic_gnets",
    number: 5,
    label: "Public Therapeutic Education Programs (incl. Georgia GNETS)",
    shortLabel: "Public Therapeutic / GNETS",
    badgeColorHex: "#F59E0B",
    description:
      "Regional public therapeutic education networks—including all 24 Georgia Network for Educational and Therapeutic Support (GNETS) programs, centers, and satellites—serving students via IEP team continuum decisions.",
    typicalSettingMode: "Day",
  },
  {
    id: "approved_nonpublic_sped_school",
    number: 6,
    label: "Approved Nonpublic Special Education Schools",
    shortLabel: "Approved Nonpublic SPED",
    badgeColorHex: "#A78BFA",
    description:
      "State Education Agency (SEA) approved nonpublic/private special education schools authorized to accept publicly funded LEA/IEP tuition placements when an IEP team determines a separate nonpublic setting is required.",
    typicalSettingMode: "Both (Day & Residential)",
  },
  {
    id: "state_operated_specialized_school",
    number: 7,
    label: "State-Operated Residential & Day Schools",
    shortLabel: "State-Operated School",
    badgeColorHex: "#34D399",
    description:
      "Direct state-operated specialized schools for students who are Deaf, Hard of Hearing, Blind, Visually Impaired, or Deaf-Blind (e.g., Georgia School for the Deaf, Georgia Academy for the Blind, Atlanta Area School for the Deaf).",
    typicalSettingMode: "Both (Day & Residential)",
  },
  {
    id: "intensive_behavioral_crisis_day",
    number: 8,
    label: "Intensive Behavioral Day Treatment & Crisis Stabilization",
    shortLabel: "Behavioral Day / Crisis",
    badgeColorHex: "#F97316",
    description:
      "Partial hospitalization programs (PHP), intensive outpatient/behavioral day treatment clinics, and child/adolescent crisis stabilization units (CSUs) with hospital/homebound or transitional educational coordination.",
    typicalSettingMode: "Day",
  },
  {
    id: "licensed_dd_residential_group_home",
    number: 9,
    label: "Licensed Developmental Disability Residential & Group Homes",
    shortLabel: "Licensed DD Group Home",
    badgeColorHex: "#2DD4BF",
    description:
      "State-licensed community living arrangements, pediatric/transition developmental disability group homes, and waiver-supported residential settings regulated by state developmental disability and human services agencies.",
    typicalSettingMode: "Residential",
  },
  {
    id: "other_separate_alternative_env",
    number: 10,
    label: "Other Specialized Educational Environments & Separate Settings",
    shortLabel: "Separate / Alternative Env",
    badgeColorHex: "#E879F9",
    description:
      "Public separate special education centers, early intervention developmental centers, hospital-based schools, and alternative specialized instructional environments reported in NCES CCD / IDEA 618 directories.",
    typicalSettingMode: "Day",
  },
];

export const SPECIALIZED_PLACEMENT_ELIGIBILITY_DISCLAIMER =
  "Mandatory Placement & Funding Guardrail: A program or facility's listing in Waypoint Places is for public informational reference only. Presence in this directory does NOT establish that a student qualifies for admission, that the program or restrictiveness level is educationally or clinically appropriate for any individual student, or that a public school district (LEA), IEP team, Medicaid, or state agency will approve or fund placement.";

export const SPECIALIZED_LICENSE_AUTHORIZATION_GUARDRAIL =
  "Licensing Scope Guardrail: Never assume a facility's state healthcare, behavioral health, child-caring institution, or educational approval license authorizes every educational or clinical service listed. Families and advocates should verify active licensure scope and specific service authorizations directly with the issuing state regulatory agency.";

export const SPECIALIZED_LRE_NEUTRALITY_GUARDRAIL =
  "Continuum & LRE Neutrality Guardrail: Under IDEA Least Restrictive Environment (LRE) principles (34 C.F.R. §§ 300.114–300.118), specialized day, separate school, and residential placements represent specific points on the continuum of alternative placements. Waypoint Places never treats a more restrictive or less restrictive setting as inherently better or worse based solely on its category, and never combines PRTFs, therapeutic day schools, GNETS, and private autism schools into one placement bucket.";

export const SPECIALIZED_ZERO_MANUAL_MAINTENANCE_GUARDRAIL =
  "Automated Pipeline Guardrail: All facility records, licensing statuses, and inspection summaries are ingested and refreshed via automated public-dataset connectors with FNV-1a checksum deduplication. Attributes not explicitly present in structured public data are automatically labeled 'Unknown' or 'Data unavailable' with zero manual verification queues.";

export interface SpecializedFacilityRecord {
  /** Stable deterministic identifier (never geographic or facility name alone) */
  facilityId: string;
  officialName: string;
  /** Strictly one of the 10 distinct statutory/regulatory categories */
  category: SpecializedFacilityCategory;
  categoryLabel: string;
  /** Day, Residential, or Both (Day & Residential) */
  settingMode: SpecializedSettingMode;
  /** Public (LEA / Regional), Private, Nonprofit, or State-Operated */
  operatorType: SpecializedOperatorType;
  /** Physical location & explicit geographic crosswalks */
  physicalLocation: {
    streetAddress: string;
    city: string;
    stateCode: string;
    stateFips2: string;
    zip: string;
    countyFips: string | null;
    countyName: string;
    districtId: string | null;
    ncesLeaId: string | null;
    ncesSchoolId: string | null;
    coordinates: [number, number]; // [lng, lat]
  };
  /** Ages & grade levels served (explicit from source or "Unknown") */
  agesServed: string;
  gradeLevelsServed: string;
  /** Disability or support populations explicitly identified by the official source */
  populationsServed: string[];
  /** Educational services offered (explicit from source or ["Unknown / Data unavailable"]) */
  educationalServicesOffered: string[];
  /** Clinical or therapeutic services offered (explicit from source or ["Unknown / Data unavailable"]) */
  clinicalTherapeuticServicesOffered: string[];
  /** Licensing, accreditation, or SEA/DBHDD/DCH approval status */
  licensingOrApprovalStatus: string;
  licensingAgency: string;
  licenseNumberOrEntityCode: string;
  licenseScopeNote: string;
  /** Published inspection or enforcement findings where available */
  publishedInspectionOrEnforcementFindings: string;
  inspectionStatus:
    | "Published Inspection Record Indexed"
    | "No Adverse Enforcement Actions in Indexed Feed"
    | "Data unavailable";
  inspectionReportUrl: string | null;
  inspectionLastVerifiedDate: string;
  /** Admission or referral process & pathways */
  admissionOrReferralProcess: string;
  placementPathways: SpecializedPlacementPathway[];
  /** Public contact details */
  publicContact: {
    phone: string;
    websiteUrl: string;
    intakeContactOrDepartment: string;
  };
  /** Provenance, citation, connector & automatic verification status */
  officialSourceName: string;
  officialSourceUrl: string;
  connectorId: SpecializedSourceConnectorId;
  reportingDate: string;
  lastUpdatedAt: string;
  verificationStatus: "Verified Public Directory" | "Unknown" | "Data unavailable";
  recordOrigin?: "live_api_import" | "manually_assembled_reference" | "seeded_example";
  checksumHash: string;
}

export interface SpecializedConnectorStatusRecord {
  connectorId: SpecializedSourceConnectorId;
  name: string;
  priorityOrder: number;
  agencyOrDataset: string;
  sourceUrl: string;
  coverageScope: string;
  targetCategories: SpecializedFacilityCategory[];
  refreshCadence: "daily_automated" | "weekly_automated" | "monthly_automated";
  status: "healthy" | "partial_structured_coverage";
  recordOrigin?: "live_api_import" | "manually_assembled_reference" | "seeded_example";
  lastSyncAt: string;
  nextScheduledSyncAt: string;
  recordsIndexedCount: number;
  statesCoveredCount: number;
  deduplicatedMergesCount: number;
  unknownFieldsAutoMarkedCount: number;
  manualTasksCreatedCount: 0; // Strictly 0 — zero manual maintenance
  notes: string;
}

export interface SpecializedFacilitiesSnapshot {
  generatedAt: string;
  statesCoveredCount: number;
  totalFacilitiesCount: number;
  georgiaFacilitiesCount: number;
  georgiaGnetsCount: number;
  devereuxGeorgiaIncluded: boolean;
  georgiaPrtfAndRtcCount: number;
  manualTasksCount: 0;
  categoryCounts: Record<SpecializedFacilityCategory, number>;
  settingModeCounts: Record<SpecializedSettingMode, number>;
  operatorTypeCounts: Record<SpecializedOperatorType, number>;
  guardrails: {
    eligibilityAndFundingDisclaimer: string;
    licenseAuthorizationGuardrail: string;
    lreNeutralityGuardrail: string;
    zeroManualMaintenanceGuardrail: string;
  };
  connectors: SpecializedConnectorStatusRecord[];
  facilities: SpecializedFacilityRecord[];
}

export function getSpecializedCategoryMeta(
  category: SpecializedFacilityCategory
): SpecializedCategoryMetadata {
  return (
    SPECIALIZED_FACILITY_CATEGORIES.find((c) => c.id === category) ||
    SPECIALIZED_FACILITY_CATEGORIES[0]
  );
}

