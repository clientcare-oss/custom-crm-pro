// Official State Complaint Forms Data & Definitions
// Primary focus: Georgia Department of Education (GaDOE) Special Education Formal Complaint Form (Revised September 2020)

export interface StateFormConfig {
  code: string;
  name: string;
  shortAgency: string;
  agencyName: string;
  agencyDivision: string;
  agencyAddress: string[];
  agencyPhone: string;
  agencyEmail: string;
  agencyFax?: string;
  agencyWebsite: string;
  agencySocial?: string;
  formTitle: string;
  formSubtitle: string;
  revisionDate: string;
  slogan?: string;
}

export const SUPPORTED_STATE_FORMS: Record<string, StateFormConfig> = {
  GA: {
    code: "GA",
    name: "Georgia",
    shortAgency: "GaDOE",
    agencyName: "Georgia Department of Education",
    agencyDivision: "Division for Special Education Services and Supports",
    agencyAddress: [
      "1562 Twin Towers East",
      "205 Jesse Hill Jr. Dr. SE",
      "Atlanta, GA 30334",
    ],
    agencyPhone: "(404) 657-9968",
    agencyEmail: "spedhelpdesk@doe.k12.ga.us",
    agencyFax: "770-344-4458",
    agencyWebsite: "www.gadoe.org",
    agencySocial: "@georgiadeptofed",
    formTitle: "Special Education Formal Complaint Form",
    formSubtitle: "Use the Tab Key to move to each part of the form",
    revisionDate: "Revised September 2020",
    slogan: "Educating Georgia’s Future",
  },
  FL: {
    code: "FL",
    name: "Florida",
    shortAgency: "FDOE",
    agencyName: "Florida Department of Education",
    agencyDivision: "Bureau of Exceptional Education and Student Services",
    agencyAddress: ["325 W. Gaines Street, Suite 614", "Tallahassee, FL 32399"],
    agencyPhone: "(850) 245-0475",
    agencyEmail: "BEESSinfo@fldoe.org",
    agencyWebsite: "www.fldoe.org/academics/exceptional-student-edu",
    formTitle: "State Formal Complaint Form",
    formSubtitle: "Dispute Resolution Procedures",
    revisionDate: "Revised 2023",
    slogan: "Florida Department of Education",
  },
  NC: {
    code: "NC",
    name: "North Carolina",
    shortAgency: "NCDPI",
    agencyName: "North Carolina Department of Public Instruction",
    agencyDivision: "Office of Exceptional Children — Dispute Resolution",
    agencyAddress: ["6356 Mail Service Center", "Raleigh, NC 27699"],
    agencyPhone: "(984) 236-2550",
    agencyEmail: "ecdisputes@dpi.nc.gov",
    agencyWebsite: "www.dpi.nc.gov",
    formTitle: "Formal State Complaint Form",
    formSubtitle: "Exceptional Children Division",
    revisionDate: "Revised 2024",
    slogan: "North Carolina Public Schools",
  },
  SC: {
    code: "SC",
    name: "South Carolina",
    shortAgency: "SCDE",
    agencyName: "South Carolina Department of Education",
    agencyDivision: "Office of Special Education Services",
    agencyAddress: ["1429 Senate Street", "Columbia, SC 29201"],
    agencyPhone: "(803) 734-8224",
    agencyEmail: "disputeresolution@ed.sc.gov",
    agencyWebsite: "ed.sc.gov",
    formTitle: "Special Education State Complaint Form",
    formSubtitle: "Office of Special Education Services",
    revisionDate: "Revised 2023",
    slogan: "South Carolina Department of Education",
  },
  TN: {
    code: "TN",
    name: "Tennessee",
    shortAgency: "TDOE",
    agencyName: "Tennessee Department of Education",
    agencyDivision: "Division of Special Education",
    agencyAddress: ["710 James Robertson Parkway", "Nashville, TN 37243"],
    agencyPhone: "(615) 741-2851",
    agencyEmail: "special.education@tn.gov",
    agencyWebsite: "www.tn.gov/education",
    formTitle: "Administrative Complaint Request Form",
    formSubtitle: "Division of Special Education",
    revisionDate: "Revised 2023",
    slogan: "Tennessee State Government",
  },
  AL: {
    code: "AL",
    name: "Alabama",
    shortAgency: "ALSDE",
    agencyName: "Alabama State Department of Education",
    agencyDivision: "Special Education Services",
    agencyAddress: ["50 N Ripley St, PO Box 302101", "Montgomery, AL 36104"],
    agencyPhone: "(334) 694-4782",
    agencyEmail: "speced@alsde.edu",
    agencyWebsite: "www.alabamaachieves.org",
    formTitle: "State Complaint Form for Special Education",
    formSubtitle: "Special Education Services Division",
    revisionDate: "Revised 2023",
    slogan: "Alabama State Department of Education",
  },
};

export interface OfficialComplaintFormState {
  stateCode: string;
  // Agency / Respondent
  publicAgency: string; // e.g. "Cobb County School District"
  // Complainant
  complainantName: string;
  complainantRelationship: string;
  complainantAddress: string;
  complainantCity: string;
  complainantState: string;
  complainantZip: string;
  complainantPhone: string;
  complainantEmail: string;
  // Student
  studentName: string;
  studentDob: string;
  studentAddress: string;
  studentCity: string;
  studentState: string;
  studentZip: string;
  studentGtid: string;
  currentSchool: string;
  grade: string;
  isHomeless: boolean;
  homelessContactInfo: string;
  // Parent (if not complainant)
  parentName: string;
  parentAddress: string;
  parentCity: string;
  parentState: string;
  parentZip: string;
  parentPhone: string;
  parentEmail: string;
  // Page 2: Allegations & Facts
  statementOfViolations: string;
  factsRelatingToViolations: string;
  // Page 3: Resolution, Mediation & Service
  proposedResolution: string;
  mediationWillingness: "yes" | "no" | "na";
  serviceDate: string;
  serviceRecipient: string;
  serviceMethod: string;
  signatureName: string;
  signatureDate: string;
}

export const INITIAL_GADOE_FORM_STATE: OfficialComplaintFormState = {
  stateCode: "GA",
  publicAgency: "Cobb County School District",
  complainantName: "Byron Honea, Master IEP Coach®",
  complainantRelationship: "Authorized Special Education Advocate / Representative",
  complainantAddress: "PO Box 724944",
  complainantCity: "Atlanta",
  complainantState: "GA",
  complainantZip: "31139",
  complainantPhone: "(404) 919-8664",
  complainantEmail: "advocate@waypointadvocates.com",
  studentName: "Alexander, Shanderious Jr.",
  studentDob: "04/12/2015",
  studentAddress: "1234 Heritage Way SW",
  studentCity: "Marietta",
  studentState: "GA",
  studentZip: "30064",
  studentGtid: "9004812736",
  currentSchool: "Clarkdale Elementary School",
  grade: "4th grade",
  isHomeless: false,
  homelessContactInfo: "",
  parentName: "Parent / Guardian",
  parentAddress: "1234 Heritage Way SW",
  parentCity: "Marietta",
  parentState: "GA",
  parentZip: "30064",
  parentPhone: "(404) 555-0192",
  parentEmail: "parent@example.com",
  statementOfViolations:
    "See attached Clarity Control Restatement of Issues & Statutory Violations (Section 02) and accompanying Exhibit Index for complete itemized counts under 34 C.F.R. § 300.153 and Ga. Comp. R. & Regs. 160-4-7-.12.\n\n1. Count I: Failure to Implement Operative IEP Services (34 C.F.R. § 300.323(c)(2) · Ga. Comp. R. & Regs. 160-4-7-.06).\n2. Count II: Failure to Timely Re-Evaluate and Affirmative Child Find Violation (34 C.F.R. § 300.111, § 300.301 · Ga. Comp. R. & Regs. 160-4-7-.03).\n3. Count III: Unlawful Refusal to Issue Timely Prior Written Notice (PWN) (34 C.F.R. § 300.503 · Ga. Comp. R. & Regs. 160-4-7-.14).",
  factsRelatingToViolations:
    "See attached Chronological Summary of Facts & Timeline (Section 03) detailing all incidents, IEP team meetings, service withholding, and evaluation requests occurring within the one-year statutory period (October 2025 – October 2026).\n\nKey Facts:\n• August 28, 2025: Annual IEP mandated 150 min/wk specialized reading instruction and 60 min/wk speech therapy.\n• October 12, 2025: Formal written parental re-evaluation request sent for psychoeducational & sensory assessment.\n• November 2025 – January 2026: Service delivery logs establish 18 missed sessions without compensatory make-up time.",
  proposedResolution:
    "1. Award 60 hours of 1-on-1 certified reading tutoring and 20 hours of speech therapy as compensatory education.\n2. Fund an Independent Educational Evaluation (IEE) at public expense by an independent specialist.\n3. Order the IEP team to reconvene within 15 school days to integrate compensatory hours into an amended IEP.\n4. Mandate administrative training for school-based special education personnel regarding mandatory PWN and evaluation timelines.",
  mediationWillingness: "yes",
  serviceDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }),
  serviceRecipient: "Special Education Director & Superintendent",
  serviceMethod: "Certified Mail & Electronic Delivery",
  signatureName: "Byron Honea, Master IEP Coach®",
  signatureDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }),
};

export function detectStateCode(stateInput?: string | null): string {
  if (!stateInput) return "GA";
  const clean = stateInput.trim().toUpperCase();
  if (clean === "GEORGIA" || clean === "GA") return "GA";
  if (clean === "FLORIDA" || clean === "FL") return "FL";
  if (clean === "NORTH CAROLINA" || clean === "NC") return "NC";
  if (clean === "SOUTH CAROLINA" || clean === "SC") return "SC";
  if (clean === "TENNESSEE" || clean === "TN") return "TN";
  if (clean === "ALABAMA" || clean === "AL") return "AL";
  return SUPPORTED_STATE_FORMS[clean] ? clean : "GA";
}
