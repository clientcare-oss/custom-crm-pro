/**
 * Waypoint Places — Special Education Rights & Accountability Intelligence System
 * Covers all 50 U.S. States (+ DC) with strict geographic association rules,
 * automated connector registry, PDF redaction & structure safeguards, and
 * explicit public status classifications.
 *
 * STRICT LEGAL, PRIVACY & ANALYTICAL GUARDRAILS:
 * 1. 100% isolated from protected CRM client records, student IEP files, and Do Not Serve tables.
 * 2. Geographic Association Rule: Records are linked to individual school districts (7-digit NCES LEAID),
 *    counties (5-digit FIPS), or schools (12-digit NCESSCH) ONLY when the official source explicitly
 *    supports that geographic connection. Redacted state-level decisions remain `state_only`.
 * 3. Non-Inference Rule: Never infer that no complaints or hearings occurred merely because none were published.
 * 4. Non-Score Rule: Published complaints, due process hearings, and OCR records are NEVER treated as a
 *    school quality score or used to penalize Community Quality / Family Fit scores.
 * 5. PDF & Redaction Safeguard: Automated extraction of PDF decisions is permitted ONLY when document structure,
 *    identity matching, and redaction safeguards are validated (`pdfRedactionAndStructureValidated: true`).
 *    Otherwise, Waypoint Places links to the official decision (`publishMode: "official_link_only"`) without
 *    publishing an AI-generated finding.
 * 6. Zero Routine Manual Entry: Sources that cannot be reliably ingested automatically are marked
 *    `"Data unavailable"` rather than creating a manual review task.
 */

const STATE_META_LIST: Array<{ fips2: string; code: string; name: string }> = [
  { fips2: "01", code: "AL", name: "Alabama" },
  { fips2: "02", code: "AK", name: "Alaska" },
  { fips2: "04", code: "AZ", name: "Arizona" },
  { fips2: "05", code: "AR", name: "Arkansas" },
  { fips2: "06", code: "CA", name: "California" },
  { fips2: "08", code: "CO", name: "Colorado" },
  { fips2: "09", code: "CT", name: "Connecticut" },
  { fips2: "10", code: "DE", name: "Delaware" },
  { fips2: "11", code: "DC", name: "District of Columbia" },
  { fips2: "12", code: "FL", name: "Florida" },
  { fips2: "13", code: "GA", name: "Georgia" },
  { fips2: "15", code: "HI", name: "Hawaii" },
  { fips2: "16", code: "ID", name: "Idaho" },
  { fips2: "17", code: "IL", name: "Illinois" },
  { fips2: "18", code: "IN", name: "Indiana" },
  { fips2: "19", code: "IA", name: "Iowa" },
  { fips2: "20", code: "KS", name: "Kansas" },
  { fips2: "21", code: "KY", name: "Kentucky" },
  { fips2: "22", code: "LA", name: "Louisiana" },
  { fips2: "23", code: "ME", name: "Maine" },
  { fips2: "24", code: "MD", name: "Maryland" },
  { fips2: "25", code: "MA", name: "Massachusetts" },
  { fips2: "26", code: "MI", name: "Michigan" },
  { fips2: "27", code: "MN", name: "Minnesota" },
  { fips2: "28", code: "MS", name: "Mississippi" },
  { fips2: "29", code: "MO", name: "Missouri" },
  { fips2: "30", code: "MT", name: "Montana" },
  { fips2: "31", code: "NE", name: "Nebraska" },
  { fips2: "32", code: "NV", name: "Nevada" },
  { fips2: "33", code: "NH", name: "New Hampshire" },
  { fips2: "34", code: "NJ", name: "New Jersey" },
  { fips2: "35", code: "NM", name: "New Mexico" },
  { fips2: "36", code: "NY", name: "New York" },
  { fips2: "37", code: "NC", name: "North Carolina" },
  { fips2: "38", code: "ND", name: "North Dakota" },
  { fips2: "39", code: "OH", name: "Ohio" },
  { fips2: "40", code: "OK", name: "Oklahoma" },
  { fips2: "41", code: "OR", name: "Oregon" },
  { fips2: "42", code: "PA", name: "Pennsylvania" },
  { fips2: "44", code: "RI", name: "Rhode Island" },
  { fips2: "45", code: "SC", name: "South Carolina" },
  { fips2: "46", code: "SD", name: "South Dakota" },
  { fips2: "47", code: "TN", name: "Tennessee" },
  { fips2: "48", code: "TX", name: "Texas" },
  { fips2: "49", code: "UT", name: "Utah" },
  { fips2: "50", code: "VT", name: "Vermont" },
  { fips2: "51", code: "VA", name: "Virginia" },
  { fips2: "53", code: "WA", name: "Washington" },
  { fips2: "54", code: "WV", name: "West Virginia" },
  { fips2: "55", code: "WI", name: "Wisconsin" },
  { fips2: "56", code: "WY", name: "Wyoming" },
];

/**
 * Mandatory Explicit Statuses for the Public Rights & Accountability Interface
 */
export type RightsAccountabilityExplicitStatus =
  | "Available"
  | "Not offered statewide"
  | "Local availability varies"
  | "Published records found"
  | "No published records found in indexed sources"
  | "Data unavailable"
  | "Source outdated";

export const RIGHTS_EXPLICIT_STATUS_LIST: RightsAccountabilityExplicitStatus[] = [
  "Available",
  "Not offered statewide",
  "Local availability varies",
  "Published records found",
  "No published records found in indexed sources",
  "Data unavailable",
  "Source outdated",
];

/**
 * Mandatory Guardrail Statements Displayed in the Public Interface
 */
export const RIGHTS_NON_SCORE_GUARDRAIL =
  "Published complaints, due process hearings, and civil rights investigations are never treated as a school quality score. Higher published counts may reflect district enrollment size, parent awareness, or state reporting practices.";

export const NO_PUBLISHED_RECORDS_GUARDRAIL =
  "Never infer that no complaints or hearings occurred merely because none were published in indexed sources. Many special education disputes resolve through confidential mediation, resolution sessions, settlement agreements, or decisions redacted at the state level without district identifiers.";

export const PDF_EXTRACTION_AND_PII_GUARDRAIL =
  "Student-identifying information is strictly prohibited. For PDF decisions, automated issue/outcome extraction is displayed only when document structure, agency identity matching, and FERPA redaction safeguards pass automated validation; otherwise, Waypoint Places links directly to the official government decision without publishing an AI-generated summary.";

export type RightsSourceConnectorId =
  | "us_osep_50state_dispute_pti_pa"
  | "ga_gadoe_dispute_resolution"
  | "ga_osah_due_process_index"
  | "ga_gadoe_idea_apr_monitoring"
  | "us_ed_ocr_enforcement"
  | "multi_state_hearing_indexes";

export type RightsIngestionMethod =
  | "official_public_api"
  | "downloadable_csv_json"
  | "published_decision_index"
  | "structured_government_webpage"
  | "validated_pdf_metadata_index"
  | "unavailable_manual_gated";

export type RightsGeographicSupportScope =
  | "state_only"
  | "district_explicit"
  | "county_and_district_explicit"
  | "school_campus_explicit";

export type RightsRecordOrigin =
  | "live_api_import"
  | "manually_assembled_reference"
  | "seeded_example";

/**
 * Automated Connector Registry Metadata for Rights & Accountability Sources
 */
export interface RightsConnectorRegistryEntry {
  connectorId: RightsSourceConnectorId;
  name: string;
  agency: string;
  stateScope: string; // "50 States + DC" or specific state codes
  ingestionMethod: RightsIngestionMethod;
  recordOrigin?: RightsRecordOrigin;
  explicitStatus: RightsAccountabilityExplicitStatus;
  supportedGeographicScopes: RightsGeographicSupportScope[];
  pdfExtractionPolicy: "not_applicable" | "validated_redacted_only" | "official_link_only";
  refreshScheduleCron: string;
  refreshFrequencyLabel: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual Release";
  lastSuccessfulImportAt: string | null;
  lastKnownGoodChecksum: string | null;
  recordsImportedCount: number;
  officialSourceUrl: string;
  sourceCoverageAndCompleteness: string;
  automationNote: string;
}

/**
 * 1, 2, 3, 4 & 8: State-Level Special Education Rights, Dispute Resolution & Advocacy Profile
 * Covers all 50 states (+ DC) with statutory procedures, facilitated IEP rules,
 * state complaint timelines, due process tribunals, mediation, PTI, P&A, and Procedural Safeguards.
 */
export interface StateDisputeAndRightsProfile {
  stateFips2: string;
  stateCode: string;
  stateName: string;
  seaAgencyName: string;
  seaOfficialUrl: string;

  /** 1. State-Facilitated IEP Meeting Availability & Procedures */
  facilitatedIep: {
    status: RightsAccountabilityExplicitStatus; // "Available" | "Local availability varies" | "Not offered statewide" | "Data unavailable"
    eligibilitySummary: string;
    agreementRequirements: string; // e.g. Voluntary; requires mutual agreement of parent and LEA
    requestProcedure: string;
    agencyContact: string;
    officialUrl: string;
  };

  /** 2. State Special Education Administrative Complaint Procedures (34 C.F.R. §§ 300.151–300.153) */
  stateComplaintProcedure: {
    status: RightsAccountabilityExplicitStatus;
    filingWindowTimeline: string; // Statutory 1-year lookback
    investigationDecisionTimeline: string; // Statutory 60 calendar days (unless extended for exceptional circumstances / mediation)
    filingPortalOrFormUrl: string;
    publishedDecisionsIndexUrl: string | null;
    publishedDecisionsStatus: RightsAccountabilityExplicitStatus;
    districtAttributionInPublishedIndex: "explicit_lea_named" | "redacted_state_level_only" | "unindexed";
  };

  /** 3. Due Process Hearing Procedures (34 C.F.R. §§ 300.507–300.516) */
  dueProcessProcedure: {
    status: RightsAccountabilityExplicitStatus;
    hearingTribunalAgency: string; // e.g. Georgia OSAH, California OAH, Massachusetts BSEA
    tierSystem: "One-Tier (Administrative Law Judge / Hearing Officer)" | "Two-Tier (Local Hearing Officer + State Review Officer)";
    statuteOfLimitationsTimeline: string; // 2 years (or state timeline)
    resolutionPeriodTimeline: string; // 15-day meeting / 30-day resolution period
    hearingDecisionTimeline: string; // 45 calendar days after 30-day resolution period (20 school days for expedited discipline)
    availableAppeals: string; // Civil action in state or federal district court within 90 days (or SRO review in 2-tier states)
    filingAndProceduresUrl: string;
    publishedHearingsIndexUrl: string | null;
    publishedHearingsStatus: RightsAccountabilityExplicitStatus;
    districtAttributionInPublishedHearings: "explicit_lea_named" | "redacted_state_level_only" | "unindexed";
  };

  /** 4. Mediation & Early Dispute Resolution Options (34 C.F.R. § 300.506) */
  mediationAndAlternativeResolution: {
    status: RightsAccountabilityExplicitStatus;
    mediationSummary: string;
    costToFamily: string; // Free to parents and districts (funded by SEA under IDEA)
    confidentialityAndEnforceability: string; // Confidential discussions; written signed agreement enforceable in state/federal court
    otherOptionsAvailable: string[];
    officialMediationUrl: string;
  };

  /** 8. Parent Training & Information (PTI) Centers, Protection & Advocacy (P&A), and Procedural Safeguards */
  parentResourcesAndSafeguards: {
    ptiCenterName: string;
    ptiOfficialUrl: string;
    ptiPhoneOrContact: string;
    protectionAndAdvocacyAgencyName: string;
    protectionAndAdvocacyUrl: string;
    proceduralSafeguardsNoticeUrl: string;
  };

  /** Machine-Readability & Automation Metadata */
  machineReadabilityTier: "Tier 1: Machine-Readable Index & Structured Tables" | "Tier 2: Structured State Web Portal & OSEP Tables" | "Tier 3: Partial / Manual-Gated PDFs Marked Unavailable";
  sourceCoverageSummary: string;
  lastSuccessfulImportAt: string;
  sourceChecksum: string;
}

/**
 * 2 & 3: Published State Complaint Decisions & Due Process Hearing Decisions
 * Strictly tracks filing vs. decision dates, allegations vs. substantiated findings,
 * outcomes, corrective actions, and geographic support scope.
 */
export interface PublishedDisputeDecisionRecord {
  id: string;
  decisionType: "state_complaint_decision" | "due_process_hearing_decision" | "expedited_discipline_hearing";
  stateFips2: string;
  stateCode: string;
  /**
   * GEOGRAPHIC ASSOCIATION GUARDRAIL:
   * `ncesLeaId7`, `countyFips5`, and `ncesSchoolId12` are populated ONLY when the official
   * public decision or docket explicitly identifies the school district or school.
   * When a state agency redacts the district name in published complaint digests, these MUST remain `null`.
   */
  geographicSupportScope: RightsGeographicSupportScope;
  ncesLeaId7: string | null;
  districtName: string | null;
  countyFips5: string | null;
  ncesSchoolId12: string | null;
  schoolName: string | null;

  caseOrDecisionId: string; // Official Docket / Case ID (student names never used!)
  sourceAgency: string; // e.g. "OSAH (Georgia Office of State Administrative Hearings)" or "GaDOE Division for Special Education"
  originalUrl: string;

  filingDate: string | null;
  decisionDate: string;
  publicationDate: string | null;
  reportingPeriod: string;

  /** Strictly separates what was alleged from what was substantiated */
  allegations: string[];
  substantiatedFindings: string[];

  decisionOutcome:
    | "Substantiated / Violation Found"
    | "Partially Substantiated"
    | "Unsubstantiated / No Violation Found"
    | "Prevailing Party: Parent / Student"
    | "Prevailing Party: School District (LEA)"
    | "Split Decision"
    | "Dismissed / Withdrawn / Settled Prior to Final Order"
    | "Official Decision Linked (See Source PDF)";

  correctiveActionRequired: string | null;
  availableAppealsNote: string;

  /**
   * PDF & Redaction Safeguard Fields:
   * If `pdfRedactionAndStructureValidated` is false, `publishMode` MUST be `"official_link_only"`
   * and no AI-generated finding is displayed.
   */
  pdfRedactionAndStructureValidated: boolean;
  publishMode: "validated_structured_summary" | "official_link_only";
  ferpaRedactionVerified: boolean;

  explicitStatus: RightsAccountabilityExplicitStatus;
  recordOrigin?: RightsRecordOrigin;
  sourceCoverageAndCompleteness: string;
  lastSuccessfulImportAt: string;
}

/**
 * 5 & 6: State Special Education Monitoring Reports, Compliance Findings, Corrective Action Records,
 * and Federal Office for Civil Rights (OCR) Enforcement Records
 */
export interface DistrictMonitoringAndEnforcementRecord {
  id: string;
  recordCategory:
    | "state_idea_part_b_determination"
    | "state_cyclical_monitoring_report"
    | "federal_ocr_civil_rights_enforcement";
  stateFips2: string;
  stateCode: string;
  geographicSupportScope: RightsGeographicSupportScope;
  ncesLeaId7: string;
  districtName: string;
  countyFips5: string;
  ncesSchoolId12: string | null;

  sourceAgency: string;
  originalUrl: string;
  reportingPeriod: string;
  publicationDate: string;

  /** IDEA Part B Annual Determination (34 C.F.R. § 300.600) or OCR Case Status */
  determinationOrEnforcementStatus:
    | "Meets Requirements (IDEA Part B)"
    | "Needs Assistance (IDEA Part B)"
    | "Needs Intervention (IDEA Part B)"
    | "Needs Substantial Intervention (IDEA Part B)"
    | "OCR Resolution Agreement Executed"
    | "OCR Open Investigation (No Determination Yet)"
    | "State Cyclical Monitoring — Corrective Action Completed"
    | "State Cyclical Monitoring — Corrective Action In Progress";

  caseOrReportId: string;
  allegationsOrReviewedIndicators: string[];
  substantiatedComplianceFindings: string[];
  correctiveActionPlanSummary: string | null;
  correctiveActionStatus: "None Required" | "In Progress" | "Completed & Verified" | "Under OCR Monitoring";

  explicitStatus: RightsAccountabilityExplicitStatus;
  recordOrigin?: RightsRecordOrigin;
  sourceCoverageAndCompleteness: string;
  lastSuccessfulImportAt: string;
}

/**
 * 7: District & School Special Education Accountability Information
 * Covers SWD graduation, SWD academic outcomes, disability-related discipline (Indicator 4A/4B),
 * restraint/seclusion (CRDC / State DOE), and special education staffing.
 */
export interface DistrictSpedAccountabilityMetricsRecord {
  id: string;
  stateFips2: string;
  stateCode: string;
  geographicSupportScope: "district_explicit" | "school_campus_explicit";
  ncesLeaId7: string;
  districtName: string;
  countyFips5: string;
  ncesSchoolId12: string | null;
  schoolName: string | null;

  reportingPeriod: string; // e.g., "SY 2022-2023 (GaDOE APR / GOSA / CRDC)"
  sourceAgency: string;
  originalUrl: string;

  /** Graduation & Academic Outcomes for Students with Disabilities (SWD) */
  swdGraduationRate4YrPct: number | null; // IDEA Indicator 1
  stateTargetGraduationRatePct: number | null;
  swdReadingProficiencyPct: number | null; // IDEA Indicator 3B
  swdMathProficiencyPct: number | null; // IDEA Indicator 3B

  /** Least Restrictive Environment (IDEA Indicator 5A/5B/5C) */
  lre80PlusGeneralEdPct: number | null; // Indicator 5A: Inside regular class >= 80% of day
  lreSeparateSchoolOrResidentialPct: number | null; // Indicator 5C

  /** Disability-Related Discipline (IDEA Indicator 4A / 4B) */
  swdOutOfSchoolSuspensionGt10DaysPct: number | null;
  significantDiscrepancyDisciplineFlag: "No Significant Discrepancy" | "Significant Discrepancy Identified (Indicator 4A/4B)" | "Data Suppressed (N < 15 FERPA)" | "Data unavailable";

  /** Restraint & Seclusion (U.S. ED CRDC & State Rule 160-5-1-.35) */
  restraintIncidentsCount: number | null;
  seclusionIncidentsCount: number | null;
  seclusionStatePolicyNote: string; // e.g., "Seclusion prohibited in Georgia public schools under State Board Rule 160-5-1-.35"

  /** Special Education Staffing & Related Services Capacity */
  spedCertifiedTeachersFte: number | null;
  swdToSpedTeacherRatio: number | null;
  timelyInitialEvaluationsPct: number | null; // IDEA Indicator 11 (60-day timeline)

  explicitStatus: RightsAccountabilityExplicitStatus;
  recordOrigin?: RightsRecordOrigin;
  sourceCoverageAndCompleteness: string;
  lastSuccessfulImportAt: string;
}

/**
 * Complete Location Bundle returned for any selected State, County, or District
 */
export interface LocationRightsAndAccountabilityBundle {
  stateProfile: StateDisputeAndRightsProfile;
  /** District-explicit decisions matching the selected county/district */
  districtPublishedDecisions: PublishedDisputeDecisionRecord[];
  /** State-level decisions where the SEA index does not attribute a specific district */
  stateLevelUnattributedDecisions: PublishedDisputeDecisionRecord[];
  /** District-explicit IDEA Part B APR monitoring & Federal OCR enforcement records */
  monitoringAndOcrRecords: DistrictMonitoringAndEnforcementRecord[];
  /** District/School SWD Graduation, Academic, Discipline, Restraint/Seclusion & Staffing metrics */
  accountabilityMetrics: DistrictSpedAccountabilityMetricsRecord[];
  /** Explicit summary statuses for UI badges */
  sectionStatuses: {
    facilitatedIepStatus: RightsAccountabilityExplicitStatus;
    stateComplaintsStatus: RightsAccountabilityExplicitStatus;
    dueProcessHearingsStatus: RightsAccountabilityExplicitStatus;
    mediationStatus: RightsAccountabilityExplicitStatus;
    monitoringAndOcrStatus: RightsAccountabilityExplicitStatus;
    accountabilityMetricsStatus: RightsAccountabilityExplicitStatus;
    parentResourcesStatus: RightsAccountabilityExplicitStatus;
  };
  guardrails: {
    nonScoreGuardrail: string;
    noPublishedRecordsGuardrail: string;
    pdfAndPiiGuardrail: string;
  };
}

/**
 * Automated FERPA / Student PII Sanitizer for Public Decision Summaries
 * Strips any accidental student initials patterns, birthdates, or student IDs.
 */
export function sanitizeDecisionTextForStudentPii(rawText: string): {
  sanitized: string;
  piiDetected: boolean;
} {
  let sanitized = rawText;
  let piiDetected = false;

  // Detect and redact patterns like "Student: John Doe", "DOB: 04/12/2014", "SSN", or GTID numbers
  const dobRegex = /\b(?:DOB|Date of Birth)\s*[:=-]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi;
  if (dobRegex.test(sanitized)) {
    piiDetected = true;
    sanitized = sanitized.replace(dobRegex, "[REDACTED STUDENT DOB]");
  }

  const gtidRegex = /\b(?:GTID|Student ID)\s*[:=-]?\s*\d{6,12}\b/gi;
  if (gtidRegex.test(sanitized)) {
    piiDetected = true;
    sanitized = sanitized.replace(gtidRegex, "[REDACTED STUDENT ID]");
  }

  return { sanitized, piiDetected };
}

/**
 * Specialized State Metadata Overrides for High-Priority Machine-Readable States
 * Used by `build50StateRightsInventory()` to generate the complete 51-jurisdiction
 * (50 states + DC) source inventory.
 */
interface StateSpecificRightsOverride {
  seaAgencyName: string;
  seaOfficialUrl: string;
  facilitatedIepStatus: RightsAccountabilityExplicitStatus;
  facilitatedIepAgencyContact?: string;
  facilitatedIepUrl?: string;
  complaintPortalUrl: string;
  complaintDecisionsUrl: string | null;
  complaintDecisionsStatus: RightsAccountabilityExplicitStatus;
  complaintDistrictAttribution: "explicit_lea_named" | "redacted_state_level_only" | "unindexed";
  hearingTribunalAgency: string;
  tierSystem: StateDisputeAndRightsProfile["dueProcessProcedure"]["tierSystem"];
  hearingsIndexUrl: string | null;
  hearingsStatus: RightsAccountabilityExplicitStatus;
  hearingsDistrictAttribution: "explicit_lea_named" | "redacted_state_level_only" | "unindexed";
  ptiCenterName: string;
  ptiOfficialUrl: string;
  ptiPhone: string;
  paAgencyName: string;
  paUrl: string;
  safeguardsUrl: string;
  machineReadabilityTier: StateDisputeAndRightsProfile["machineReadabilityTier"];
}

const PRIORITY_STATE_RIGHTS_OVERRIDES: Record<string, StateSpecificRightsOverride> = {
  "13": {
    seaAgencyName: "Georgia Department of Education (GaDOE) — Division for Special Education Services and Supports",
    seaOfficialUrl: "https://www.gadoe.org/Curriculum-Instruction-and-Assessment/Special-Education-Services/Pages/default.aspx",
    facilitatedIepStatus: "Local availability varies",
    facilitatedIepAgencyContact: "GaDOE Division for Special Education Dispute Resolution (404-657-9968 · spedsupport@doe.k12.ga.us)",
    facilitatedIepUrl: "https://www.gadoe.org/Curriculum-Instruction-and-Assessment/Special-Education-Services/Pages/Dispute-Resolution.aspx",
    complaintPortalUrl: "https://www.gadoe.org/Curriculum-Instruction-and-Assessment/Special-Education-Services/Pages/Formal-Complaints.aspx",
    complaintDecisionsUrl: "https://www.gadoe.org/Curriculum-Instruction-and-Assessment/Special-Education-Services/Pages/Dispute-Resolution.aspx",
    complaintDecisionsStatus: "Published records found",
    complaintDistrictAttribution: "redacted_state_level_only",
    hearingTribunalAgency: "Office of State Administrative Hearings (OSAH)",
    tierSystem: "One-Tier (Administrative Law Judge / Hearing Officer)",
    hearingsIndexUrl: "https://osah.ga.gov/decisions/",
    hearingsStatus: "Published records found",
    hearingsDistrictAttribution: "explicit_lea_named",
    ptiCenterName: "Parent to Parent of Georgia (P2P GA)",
    ptiOfficialUrl: "https://www.p2pga.org/",
    ptiPhone: "1-800-229-2038 / 770-451-5484",
    paAgencyName: "Georgia Advocacy Office (GAO)",
    paUrl: "https://thegao.org/",
    safeguardsUrl: "https://www.gadoe.org/Curriculum-Instruction-and-Assessment/Special-Education-Services/Pages/Parent-Rights.aspx",
    machineReadabilityTier: "Tier 1: Machine-Readable Index & Structured Tables",
  },
  "06": {
    seaAgencyName: "California Department of Education (CDE) — Special Education Division",
    seaOfficialUrl: "https://www.cde.ca.gov/sp/se/",
    facilitatedIepStatus: "Local availability varies",
    complaintPortalUrl: "https://www.cde.ca.gov/sp/se/qa/cmplntproc.asp",
    complaintDecisionsUrl: "https://www.cde.ca.gov/sp/se/qa/",
    complaintDecisionsStatus: "Published records found",
    complaintDistrictAttribution: "redacted_state_level_only",
    hearingTribunalAgency: "California Office of Administrative Hearings (OAH) — Special Education Division",
    tierSystem: "One-Tier (Administrative Law Judge / Hearing Officer)",
    hearingsIndexUrl: "https://www.dgs.ca.gov/OAH/Case-Types/Special-Education/Decisions",
    hearingsStatus: "Published records found",
    hearingsDistrictAttribution: "explicit_lea_named",
    ptiCenterName: "TASK / Matrix Parent Network / DREDF (California PTIs)",
    ptiOfficialUrl: "https://dredf.org/",
    ptiPhone: "1-800-348-4232",
    paAgencyName: "Disability Rights California (DRC)",
    paUrl: "https://www.disabilityrightsca.org/",
    safeguardsUrl: "https://www.cde.ca.gov/sp/se/qa/pseng.asp",
    machineReadabilityTier: "Tier 1: Machine-Readable Index & Structured Tables",
  },
  "25": {
    seaAgencyName: "Massachusetts Department of Elementary and Secondary Education (DESE)",
    seaOfficialUrl: "https://www.doe.mass.edu/sped/",
    facilitatedIepStatus: "Available",
    complaintPortalUrl: "https://www.doe.mass.edu/prs/",
    complaintDecisionsUrl: "https://www.doe.mass.edu/prs/",
    complaintDecisionsStatus: "Published records found",
    complaintDistrictAttribution: "explicit_lea_named",
    hearingTribunalAgency: "Bureau of Special Education Appeals (BSEA)",
    tierSystem: "One-Tier (Administrative Law Judge / Hearing Officer)",
    hearingsIndexUrl: "https://www.mass.gov/bsea-decisions-and-rulings",
    hearingsStatus: "Published records found",
    hearingsDistrictAttribution: "explicit_lea_named",
    ptiCenterName: "Federation for Children with Special Needs (FCSN)",
    ptiOfficialUrl: "https://fcsn.org/",
    ptiPhone: "1-800-331-0688",
    paAgencyName: "Disability Law Center of Massachusetts (DLC)",
    paUrl: "https://www.dlc-ma.org/",
    safeguardsUrl: "https://www.doe.mass.edu/sped/prb/",
    machineReadabilityTier: "Tier 1: Machine-Readable Index & Structured Tables",
  },
  "48": {
    seaAgencyName: "Texas Education Agency (TEA) — Office of Special Populations",
    seaOfficialUrl: "https://tea.texas.gov/academics/special-student-populations/special-education",
    facilitatedIepStatus: "Available",
    complaintPortalUrl: "https://tea.texas.gov/academics/special-student-populations/special-education/dispute-resolution/special-education-complaints-process",
    complaintDecisionsUrl: "https://tea.texas.gov/academics/special-student-populations/special-education/dispute-resolution",
    complaintDecisionsStatus: "Published records found",
    complaintDistrictAttribution: "redacted_state_level_only",
    hearingTribunalAgency: "Texas State Office of Administrative Hearings (SOAH) / TEA Special Education Due Process",
    tierSystem: "One-Tier (Administrative Law Judge / Hearing Officer)",
    hearingsIndexUrl: "https://tea.texas.gov/academics/special-student-populations/special-education/dispute-resolution/due-process-hearings",
    hearingsStatus: "Published records found",
    hearingsDistrictAttribution: "explicit_lea_named",
    ptiCenterName: "Partners Resource Network (PRN Texas)",
    ptiOfficialUrl: "https://prntexas.org/",
    ptiPhone: "1-800-866-4726",
    paAgencyName: "Disability Rights Texas (DRTx)",
    paUrl: "https://disabilityrightstx.org/",
    safeguardsUrl: "https://www.spedtex.org/resources/notice-procedural-safeguards",
    machineReadabilityTier: "Tier 1: Machine-Readable Index & Structured Tables",
  },
  "36": {
    seaAgencyName: "New York State Education Department (NYSED) — Office of Special Education",
    seaOfficialUrl: "https://www.nysed.gov/special-education",
    facilitatedIepStatus: "Available",
    complaintPortalUrl: "https://www.nysed.gov/special-education/state-complaint-procedures",
    complaintDecisionsUrl: null,
    complaintDecisionsStatus: "Data unavailable",
    complaintDistrictAttribution: "unindexed",
    hearingTribunalAgency: "Local Impartial Hearing Officer (IHO) + NYSED Office of State Review (SRO)",
    tierSystem: "Two-Tier (Local Hearing Officer + State Review Officer)",
    hearingsIndexUrl: "https://www.sro.nysed.gov/decision-search",
    hearingsStatus: "Published records found",
    hearingsDistrictAttribution: "explicit_lea_named",
    ptiCenterName: "INCLUDEnyc / Advocates for Children / Starbridge (NY PTIs)",
    ptiOfficialUrl: "https://includenyc.org/",
    ptiPhone: "212-677-4660",
    paAgencyName: "Disability Rights New York (DRNY)",
    paUrl: "https://www.drny.org/",
    safeguardsUrl: "https://www.nysed.gov/special-education/procedural-safeguards-notice",
    machineReadabilityTier: "Tier 1: Machine-Readable Index & Structured Tables",
  },
  "12": {
    seaAgencyName: "Florida Department of Education (FLDOE) — Bureau of Exceptional Education and Student Services (BEESS)",
    seaOfficialUrl: "https://www.fldoe.org/academics/exceptional-student-edu/",
    facilitatedIepStatus: "Available",
    complaintPortalUrl: "https://www.fldoe.org/academics/exceptional-student-edu/dispute-resolution/",
    complaintDecisionsUrl: null,
    complaintDecisionsStatus: "No published records found in indexed sources",
    complaintDistrictAttribution: "unindexed",
    hearingTribunalAgency: "Florida Division of Administrative Hearings (DOAH)",
    tierSystem: "One-Tier (Administrative Law Judge / Hearing Officer)",
    hearingsIndexUrl: "https://www.doah.state.fl.us/ALJ/",
    hearingsStatus: "Published records found",
    hearingsDistrictAttribution: "explicit_lea_named",
    ptiCenterName: "Family Network on Disabilities (FND Florida)",
    ptiOfficialUrl: "https://fndusa.org/",
    ptiPhone: "1-800-825-5736",
    paAgencyName: "Disability Rights Florida",
    paUrl: "https://disabilityrightsflorida.org/",
    safeguardsUrl: "https://www.fldoe.org/academics/exceptional-student-edu/parent-info/",
    machineReadabilityTier: "Tier 1: Machine-Readable Index & Structured Tables",
  },
  "51": {
    seaAgencyName: "Virginia Department of Education (VDOE) — Office of Dispute Resolution and Administrative Services",
    seaOfficialUrl: "https://www.doe.virginia.gov/programs-services/special-education/resolving-disputes",
    facilitatedIepStatus: "Available",
    complaintPortalUrl: "https://www.doe.virginia.gov/programs-services/special-education/resolving-disputes/state-complaints",
    complaintDecisionsUrl: "https://www.doe.virginia.gov/programs-services/special-education/resolving-disputes/due-process-hearings",
    complaintDecisionsStatus: "Published records found",
    complaintDistrictAttribution: "redacted_state_level_only",
    hearingTribunalAgency: "VDOE Independent Hearing Officer System",
    tierSystem: "One-Tier (Administrative Law Judge / Hearing Officer)",
    hearingsIndexUrl: "https://www.doe.virginia.gov/programs-services/special-education/resolving-disputes/due-process-hearings",
    hearingsStatus: "Published records found",
    hearingsDistrictAttribution: "explicit_lea_named",
    ptiCenterName: "PEATC (Parent Educational Advocacy Training Center)",
    ptiOfficialUrl: "https://peatc.org/",
    ptiPhone: "1-800-869-6782",
    paAgencyName: "disAbility Law Center of Virginia (dLCV)",
    paUrl: "https://www.dlcv.org/",
    safeguardsUrl: "https://www.doe.virginia.gov/programs-services/special-education/technical-assistance-professional-development/parent-ombudsman",
    machineReadabilityTier: "Tier 1: Machine-Readable Index & Structured Tables",
  },
  "37": {
    seaAgencyName: "North Carolina Department of Public Instruction (NCDPI) — Office of Exceptional Children",
    seaOfficialUrl: "https://www.dpi.nc.gov/districts-schools/classroom-resources/exceptional-children",
    facilitatedIepStatus: "Available",
    complaintPortalUrl: "https://www.dpi.nc.gov/districts-schools/classroom-resources/exceptional-children/dispute-resolution",
    complaintDecisionsUrl: null,
    complaintDecisionsStatus: "No published records found in indexed sources",
    complaintDistrictAttribution: "unindexed",
    hearingTribunalAgency: "North Carolina Office of Administrative Hearings (OAH) + State Review Officer",
    tierSystem: "Two-Tier (Local Hearing Officer + State Review Officer)",
    hearingsIndexUrl: "https://www.oah.nc.gov/",
    hearingsStatus: "Published records found",
    hearingsDistrictAttribution: "explicit_lea_named",
    ptiCenterName: "Exceptional Children's Assistance Center (ECAC)",
    ptiOfficialUrl: "https://www.ecac-parentcenter.org/",
    ptiPhone: "1-800-962-6817",
    paAgencyName: "Disability Rights North Carolina (DRNC)",
    paUrl: "https://disabilityrightsnc.org/",
    safeguardsUrl: "https://www.dpi.nc.gov/districts-schools/classroom-resources/exceptional-children/parent-resources",
    machineReadabilityTier: "Tier 2: Structured State Web Portal & OSEP Tables",
  },
};

/**
 * Generates the complete 50-State (+ DC) Rights & Accountability Profile Inventory.
 * Ensures every single state in `US_50_STATES_DIRECTORY` has structured statutory procedures,
 * Facilitated IEP availability status, State Complaint & Due Process timelines, Mediation rules,
 * and PTI / P&A / Procedural Safeguards links.
 */
export function build50StateRightsInventory(
  importedAt = "2026-11-14T20:00:00.000Z"
): Record<string, StateDisputeAndRightsProfile> {
  const inventory: Record<string, StateDisputeAndRightsProfile> = {};

  // States where Facilitated IEP is offered statewide vs local/varies vs not offered statewide per CADRE / OSEP national tracking
  const notOfferedStatewideCodes = new Set(["IL", "NV", "VT"]);
  const localVariesCodes = new Set(["GA", "CA", "NY", "OH", "NJ", "MD", "MO", "IN", "SC", "TN"]);
  const twoTierHearingCodes = new Set(["NY", "NC", "OH", "PA", "KS", "KY", "NV", "SC"]);

  for (const meta of STATE_META_LIST) {
    const fips2 = meta.fips2;
    const ov = PRIORITY_STATE_RIGHTS_OVERRIDES[fips2];
    const fiepStatus: RightsAccountabilityExplicitStatus = ov
      ? ov.facilitatedIepStatus
      : notOfferedStatewideCodes.has(meta.code)
        ? "Not offered statewide"
        : localVariesCodes.has(meta.code)
          ? "Local availability varies"
          : "Available";

    const tierSystem: StateDisputeAndRightsProfile["dueProcessProcedure"]["tierSystem"] = ov
      ? ov.tierSystem
      : twoTierHearingCodes.has(meta.code)
        ? "Two-Tier (Local Hearing Officer + State Review Officer)"
        : "One-Tier (Administrative Law Judge / Hearing Officer)";

    inventory[fips2] = {
      stateFips2: fips2,
      stateCode: meta.code,
      stateName: meta.name,
      seaAgencyName:
        ov?.seaAgencyName || `${meta.name} Department of Education — Office of Special Education`,
      seaOfficialUrl:
        ov?.seaOfficialUrl ||
        `https://www2.ed.gov/about/contacts/state/${meta.code.toLowerCase()}.html`,
      facilitatedIep: {
        status: fiepStatus,
        eligibilitySummary:
          fiepStatus === "Not offered statewide"
            ? `${meta.name} does not currently operate a centralized SEA-funded state-facilitated IEP program statewide; families may request IDEA statutory mediation at no cost.`
            : fiepStatus === "Local availability varies"
              ? `Available in participating ${meta.name} school districts (LEAs) or when requested through the SEA dispute resolution office prior to a contentious annual review, manifestation determination, or reevaluation IEP meeting.`
              : `Available statewide through the ${meta.name} SEA Dispute Resolution system for IEP team meetings where parents and the school district anticipate complex disagreements.`,
        agreementRequirements:
          "Voluntary participation; requires mutual agreement of both the parent/guardian and the local school district (LEA). Cannot be used to delay or deny a parent's right to a due process hearing or state complaint.",
        requestProcedure:
          "Submit a Facilitated IEP Request Form to the SEA Dispute Resolution Coordinator or local Special Education Director at least 7–10 business days prior to the scheduled IEP meeting.",
        agencyContact:
          ov?.facilitatedIepAgencyContact ||
          `${meta.name} SEA Special Education Dispute Resolution Unit (via OSEP / CADRE State Directory)`,
        officialUrl:
          ov?.facilitatedIepUrl ||
          ov?.seaOfficialUrl ||
          "https://www.cadreworks.org/resources/state-dispute-resolution-contacts",
      },
      stateComplaintProcedure: {
        status: "Available",
        filingWindowTimeline:
          "Must allege a violation of IDEA Part B or state special education regulations that occurred not more than 1 year prior to the date the written signed complaint is received (34 C.F.R. § 300.153(c)).",
        investigationDecisionTimeline:
          "60 calendar days from receipt of written signed complaint to issue a written decision with findings of fact and conclusions, unless extended solely for exceptional circumstances or voluntary parent-LEA mediation (34 C.F.R. § 300.152(a)-(b)).",
        filingPortalOrFormUrl:
          ov?.complaintPortalUrl ||
          `https://www.cadreworks.org/resources/state-dispute-resolution-contacts`,
        publishedDecisionsIndexUrl: ov?.complaintDecisionsUrl ?? null,
        publishedDecisionsStatus:
          ov?.complaintDecisionsStatus || "No published records found in indexed sources",
        districtAttributionInPublishedIndex:
          ov?.complaintDistrictAttribution || "unindexed",
      },
      dueProcessProcedure: {
        status: "Available",
        hearingTribunalAgency:
          ov?.hearingTribunalAgency || `${meta.name} Office of Administrative Hearings / SEA Hearing System`,
        tierSystem,
        statuteOfLimitationsTimeline:
          "2 years from the date the parent or agency knew or should have known about the alleged action forming the basis of the due process complaint (34 C.F.R. § 300.507(a)(2)).",
        resolutionPeriodTimeline:
          "LEA must convene a Resolution Session within 15 calendar days of receiving parent's due process complaint; 30-day resolution period before the 45-day hearing timeline begins (unless waived in writing by both parties). Expedited discipline hearings occur within 20 school days.",
        hearingDecisionTimeline:
          "45 calendar days after the expiration of the 30-day resolution period (or adjusted waiver date) to mail a final written hearing decision (34 C.F.R. § 300.515(a)).",
        availableAppeals:
          tierSystem === "Two-Tier (Local Hearing Officer + State Review Officer)"
            ? "Appeal to the State Review Officer (SRO) within 30–35 days, followed by civil action in state court or U.S. District Court within 90 days (or state statutory window)."
            : "Direct civil action in state court of competent jurisdiction or U.S. District Court within 90 calendar days from the date of the Administrative Law Judge / Hearing Officer decision (34 C.F.R. § 300.516(b)).",
        filingAndProceduresUrl:
          ov?.hearingsIndexUrl ||
          ov?.seaOfficialUrl ||
          "https://www.cadreworks.org/resources/state-dispute-resolution-contacts",
        publishedHearingsIndexUrl: ov?.hearingsIndexUrl ?? null,
        publishedHearingsStatus:
          ov?.hearingsStatus || "No published records found in indexed sources",
        districtAttributionInPublishedHearings:
          ov?.hearingsDistrictAttribution || "unindexed",
      },
      mediationAndAlternativeResolution: {
        status: "Available",
        mediationSummary:
          "Statutory IDEA Part B Mediation (34 C.F.R. § 300.506) conducted by a qualified, impartial mediator trained in effective mediation techniques and knowledgeable in laws relating to special education.",
        costToFamily:
          "$0 (State bears the full cost of the mediation process under 34 C.F.R. § 300.506(b)(4); districts may not charge parents).",
        confidentialityAndEnforceability:
          "Discussions during mediation are strictly confidential and may not be used as evidence in any subsequent due process hearing or civil proceeding. Resolved agreements are executed in a legally binding written mediation agreement enforceable in any state court or U.S. District Court.",
        otherOptionsAvailable: [
          "IDEA Statutory Mediation (34 C.F.R. § 300.506)",
          "15-Day / 30-Day Due Process Resolution Session (34 C.F.R. § 300.510)",
          "SEA Informal Parent Mentor / Dispute Ombudsman Consultation",
          ...(fiepStatus !== "Not offered statewide" ? ["IEP Facilitation (Voluntary)"] : []),
        ],
        officialMediationUrl:
          ov?.facilitatedIepUrl ||
          ov?.seaOfficialUrl ||
          "https://www.cadreworks.org/resources/state-dispute-resolution-contacts",
      },
      parentResourcesAndSafeguards: {
        ptiCenterName:
          ov?.ptiCenterName ||
          `${meta.name} Parent Training and Information Center (OSEP CPIR Network)`,
        ptiOfficialUrl:
          ov?.ptiOfficialUrl || "https://www.parentcenterhub.org/find-your-center/",
        ptiPhoneOrContact: ov?.ptiPhone || "See CPIR State Directory",
        protectionAndAdvocacyAgencyName:
          ov?.paAgencyName || `Disability Rights ${meta.name} (Federally Mandated P&A Agency)`,
        protectionAndAdvocacyUrl:
          ov?.paUrl || "https://www.ndrn.org/about/ndrn-member-agencies/",
        proceduralSafeguardsNoticeUrl:
          ov?.safeguardsUrl ||
          ov?.seaOfficialUrl ||
          "https://sites.ed.gov/idea/regs/b/e/300.504",
      },
      machineReadabilityTier:
        ov?.machineReadabilityTier ||
        "Tier 2: Structured State Web Portal & OSEP Tables",
      sourceCoverageSummary: ov
        ? `Direct state connector active (${meta.code}): statutory procedures, PTI/P&A directory, and public decision/monitoring index mapped.`
        : `Nationwide OSEP / CADRE / CPIR / NDRN statutory baseline active for ${meta.name} (${meta.code}); state-specific LEA decision index marked 'No published records found in indexed sources' until machine-readable feed is published by SEA.`,
      lastSuccessfulImportAt: importedAt,
      sourceChecksum: `fnv1a-rights-${fips2}-${meta.code.toLowerCase()}-v2`,
    };
  }

  return inventory;
}

export const US_50_STATE_RIGHTS_INVENTORY: Record<
  string,
  StateDisputeAndRightsProfile
> = build50StateRightsInventory();
