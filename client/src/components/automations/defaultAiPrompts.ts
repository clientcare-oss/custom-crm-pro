export interface ContextVariable {
  name: string;
  type?: string;
  description: string;
  example: string;
}

export interface PromptVersionHistory {
  version: string;
  date: string;
  author: string;
  notes: string;
}

export interface AiPromptRecord {
  id: string;
  name: string;
  key: string;
  pageId: string;
  category: "Meeting Intel" | "Legal & Compliance" | "Case Tools" | "Communications" | "System";
  modelTier: "CF_MODELS.FAST" | "CF_MODELS.DEEP" | "CF_MODELS.WHISPER";
  modelName: string;
  version: string;
  lastUpdated: string;
  updatedBy: string;
  status: "Active" | "Draft" | "Archived";
  description: string;
  purpose: string;
  usedIn: string[];
  systemPrompt: string;
  outputFormat: string;
  variables: ContextVariable[];
  history: PromptVersionHistory[];
  temperature: number;
  maxTokens: number;
  isIndividualLocked: boolean;
}

export const DEFAULT_AI_PROMPTS: AiPromptRecord[] = [
  {
    id: "prompt-child-file-analysis",
    name: "Child File Analysis",
    key: "CHILD_FILE_ANALYSIS",
    pageId: "PG-013-AI",
    category: "Meeting Intel",
    modelTier: "CF_MODELS.DEEP",
    modelName: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    version: "1.2",
    lastUpdated: "10/04/2026",
    updatedBy: "Sage (Admin)",
    status: "Active",
    description: "Analyze whole child file and key records.",
    purpose: "Analyze the whole child file and extract critical information to inform meeting preparation, including strengths, needs, history, and important context.",
    usedIn: ["Assemble Meeting Intel", "Case Compass"],
    temperature: 0.2,
    maxTokens: 2500,
    isIndividualLocked: true,
    systemPrompt: `You are the Waypoint Child File Analysis Engine built for Byron Honea (Lead Special Education Advocate, Atlanta GA).
Your mandate is to perform an exhaustive, multi-year longitudinal audit of a student's educational record, psychological evaluations, medical disclosures, and historical IEPs.

CORE AUDIT PILLARS:
1. LONGITUDINAL TRAJECTORY: Map baseline cognitive and academic standard scores over time (WJ-IV, WISC-V, KTEA-3). Flag any trajectory plateau or regression.
2. DISABILITY PROFILES & MEDICAL HISTORY: Uncover all qualifying conditions, medical diagnoses, sensory profiles, and medication side effects mentioned across records.
3. INSTRUCTIONAL & BEHAVIORAL PATTERNS: Contrast what classroom strategies consistently supported the student vs. punitive disciplinary actions.
4. HISTORICAL SERVICE MINUTES: Chronologically map speech, OT, PT, and specialized instruction hours to detect uncompensated cuts.

OUTPUT SPECIFICATION:
Generate an Executive Child Record Dossier formatted for immediate advocate deployment:
- Executive Student Summary & Core Identity
- Clinical & Neurodevelopmental Profile
- Longitudinal Academic Benchmark Matrix
- Historical Discrepancy & Service Cut Flags
- Strategic Negotiation Leverage Points for Advocate`,
    outputFormat: `Markdown dossier featuring structured headings, executive summary, clinical profile, tabular benchmark scores, and bulleted negotiation leverage points.`,
    variables: [
      { name: "student_name", type: "string", description: "First and last name of the student", example: "Lucas Miller" },
      { name: "child_file_text", type: "document", description: "Aggregated OCR/text extract of cumulative records", example: "[Multi-year IEP archives, neuropsychological evaluations 2023-2025...]" },
      { name: "primary_concerns", type: "list", description: "Parent concerns regarding academic progress or placement", example: "Severe reading deficit, phonological processing, behavioral meltdowns in math" }
    ],
    history: [
      { version: "1.2", date: "10/04/2026", author: "Sage (Admin)", notes: "Added longitudinal benchmark matrix and IEP services comparison" },
      { version: "1.1", date: "09/14/2026", author: "Byron Honea", notes: "Refined clinical neurodevelopmental extraction prompts" },
      { version: "1.0", date: "08/01/2026", author: "Byron Honea", notes: "Initial production baseline" }
    ]
  },
  {
    id: "prompt-iep-intel-unit",
    name: "IEP Intel Unit",
    key: "IEP_INTEL_UNIT",
    pageId: "PG-010-IEP",
    category: "Meeting Intel",
    modelTier: "CF_MODELS.DEEP",
    modelName: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    version: "3.2",
    lastUpdated: "10/03/2026",
    updatedBy: "Byron Honea",
    status: "Active",
    description: "Full 16-module analysis of IEP/504.",
    purpose: "Executes a rigorous 16-module forensic breakdown of every component in an active IEP/504 plan, assessing statutory compliance, SMART goal measurability, and accommodation enforceability.",
    usedIn: ["PWN Decoder", "Meeting Workspace"],
    temperature: 0.15,
    maxTokens: 3000,
    isIndividualLocked: true,
    systemPrompt: `You are the Waypoint IEP Intel Unit.
Conduct a forensic review across all 16 standardized IDEA modules of the student's active or proposed IEP:
1. Present Levels (PLAAFP) — evaluate objective baselines vs vague teacher impressions.
2. Measurable Annual Goals & Short-term Objectives — SMART test each goal.
3. Progress Reporting Schedule & Methods.
4. Special Education & Related Services (Direct vs Consultative minutes).
5. Supplementary Aids & Services (Classroom Testing vs State Assessment only).
6. Program Modifications & School Personnel Supports.
7. Least Restrictive Environment (LRE) Explanation & General Ed %.
8. State & District-Wide Assessment Accommodations.
9. Extended School Year (ESY) Determination & Regression Data.
10. Transition Services & Post-Secondary Goals (Age 14/16+).
11. Behavioral Intervention Plan (BIP) & FBA Integration.
12. Assistive Technology Considerations.
13. Health & Medical Plans (Emergency Care, Allergies, Seizure).
14. Transportation Provisions (Specialized bus, climate control, monitor).
15. Prior Written Notice Alignment.
16. Procedural Safeguards Compliance.`,
    outputFormat: `Module-by-module compliance audit table with Red/Amber/Green ratings, deficiency descriptions, and exact recommended IEP amendments.`,
    variables: [
      { name: "iep_document_text", type: "document", description: "Text extract of the current IEP document", example: "[Full 28-page IEP transcript...]" },
      { name: "student_grade", type: "string", description: "Current grade level", example: "4th Grade" }
    ],
    history: [
      { version: "3.2", date: "10/03/2026", author: "Byron Honea", notes: "Updated for Georgia Rule 160-4-7 compliance checks" },
      { version: "3.1", date: "08/18/2026", author: "Sage (Admin)", notes: "Expanded SMART goal audit rubric" },
      { version: "3.0", date: "07/10/2026", author: "Byron Honea", notes: "Major architecture overhaul to 16 modules" }
    ]
  },
  {
    id: "prompt-case-notes-phone-analysis",
    name: "Case Notes / Phone Analysis",
    key: "CASE_NOTES_PHONE_ANALYSIS",
    pageId: "PG-018",
    category: "Meeting Intel",
    modelTier: "CF_MODELS.FAST",
    modelName: "@cf/meta/llama-3.1-8b-instruct",
    version: "1.1",
    lastUpdated: "10/04/2026",
    updatedBy: "Sage (Admin)",
    status: "Active",
    description: "Extract key information from notes.",
    purpose: "Extracts key commitments, unwritten district admissions, timeline triggers, and action items from advocate phone consultations and informal notes.",
    usedIn: ["Call Center", "Case Compass"],
    temperature: 0.25,
    maxTokens: 1024,
    isIndividualLocked: false,
    systemPrompt: `You are the Waypoint Case Notes & Call Center Intelligence Extractor.
Extract critical case facts from raw phone transcripts, advocate memos, and quick parent notes:
1. UNWRITTEN PROMISES: Flag any verbal offer made by school personnel that does not yet exist in official documentation.
2. PROCEDURAL TIMELINES: Extract all dates, statutory windows (e.g. 60-day evaluation window, 10-day notice).
3. PARENT EMOTIONAL STATE & CLIENT CARE: Note parent distress level and support needs.
4. ACTION CHECKLIST: Formulate immediate follow-up tasks for the advocate.`,
    outputFormat: `Structured summary with Verbal Promises table, Statutory Timeline flags, and numbered Action Items.`,
    variables: [
      { name: "raw_notes", type: "text", description: "Advocate notes or recorded call transcript", example: "Spoke with principal today. He said they might give 30 mins OT if parent drops FBA request..." }
    ],
    history: [
      { version: "1.1", date: "10/04/2026", author: "Sage (Admin)", notes: "Added verbal promise detection matrix" },
      { version: "1.0", date: "08/15/2026", author: "Byron Honea", notes: "Initial creation" }
    ]
  },
  {
    id: "prompt-parent-concerns-analysis",
    name: "Parent Concerns Analysis",
    key: "PARENT_CONCERNS_ANALYSIS",
    pageId: "PG-003-DC",
    category: "Meeting Intel",
    modelTier: "CF_MODELS.FAST",
    modelName: "@cf/meta/llama-3.1-8b-instruct",
    version: "1.0",
    lastUpdated: "10/02/2026",
    updatedBy: "Byron Honea",
    status: "Active",
    description: "Analyze and organize parent concerns.",
    purpose: "Synthesizes disjointed parent worries into a structured, persuasive Parent Input Statement that commands team attention and must be included in the official IEP record.",
    usedIn: ["Discovery Calls", "Meeting Workspace"],
    temperature: 0.3,
    maxTokens: 1200,
    isIndividualLocked: false,
    systemPrompt: `You are the Waypoint Parent Concerns Formulation Engine.
Transform emotional, fragmented parent input into an authoritative, legally grounded Parent Concerns Document.
Group items into:
1. Academic Needs & Literacy Benchmarks
2. Social-Emotional & Behavioral Safety
3. Related Services & Therapy Frequency
4. Classroom Accommodations & Sensory Environment
Ensure every concern is linked to observable student behaviors and academic data.`,
    outputFormat: `Formatted Parent Input Statement ready for attachment to the IEP meeting notice and official record.`,
    variables: [
      { name: "parent_raw_input", type: "text", description: "Raw parent email or interview notes", example: "Lucas is crying every morning before school. He told me the teacher yells at him when he can't copy from the board..." }
    ],
    history: [
      { version: "1.0", date: "10/02/2026", author: "Byron Honea", notes: "Initial master prompt release" }
    ]
  },
  {
    id: "prompt-meeting-direction-lean",
    name: "Meeting Direction / Lean",
    key: "MEETING_DIRECTION_LEAN",
    pageId: "PG-037",
    category: "Meeting Intel",
    modelTier: "CF_MODELS.DEEP",
    modelName: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    version: "1.0",
    lastUpdated: "10/02/2026",
    updatedBy: "Byron Honea",
    status: "Active",
    description: "Evaluate case direction and strategy.",
    purpose: "Evaluates the balance of power, historical district precedent, and advocate tactical lean heading into an upcoming ARD/IEP meeting.",
    usedIn: ["First Mate", "Meeting Workspace"],
    temperature: 0.2,
    maxTokens: 1500,
    isIndividualLocked: true,
    systemPrompt: `You are the Waypoint Strategic Lean & Meeting Direction Engine.
Evaluate the strategic posture for an upcoming meeting:
- LEAN DETERMINATION: Collaborative Consensus vs. Assertive Procedural Record-Building.
- DISTRICT RESISTANCE PROFILE: Predict likely points of resistance (e.g. 1:1 paraprofessional cost, out-of-district placement, private evaluation recognition).
- FALLBACK POSITIONS: What are acceptable interim compromises vs. non-negotiable red lines.`,
    outputFormat: `Advocate Strategy Blueprint with Lean Index (1-10), Primary Leverage Points, and Objection Handling playbooks.`,
    variables: [
      { name: "case_summary", type: "text", description: "Brief background of case and upcoming meeting purpose", example: "Triennial re-evaluation review where school is proposing to declassify student from Special Ed to 504..." }
    ],
    history: [
      { version: "1.0", date: "10/02/2026", author: "Byron Honea", notes: "Strategic playbook baseline" }
    ]
  },
  {
    id: "prompt-meeting-assembler",
    name: "Meeting Assembler",
    key: "MEETING_ASSEMBLER",
    pageId: "PG-043",
    category: "Meeting Intel",
    modelTier: "CF_MODELS.DEEP",
    modelName: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    version: "1.3",
    lastUpdated: "10/04/2026",
    updatedBy: "Sage (Admin)",
    status: "Active",
    description: "Combine all intelligence into blueprint.",
    purpose: "Assembles all disparate intelligence streams—evaluations, parent input, teacher emails, and dispute points—into a single unified Master Meeting Binder for Byron.",
    usedIn: ["Assemble Meeting Intel", "Meeting Workspace"],
    temperature: 0.2,
    maxTokens: 3500,
    isIndividualLocked: true,
    systemPrompt: `You are the Waypoint Master Meeting Assembler.
Synthesize all collected intelligence documents into a comprehensive pre-meeting briefing binder:
- Agenda control checklist
- Key attendee matrix with role analysis
- Evidence citations mapped directly to each agenda item
- Proposed motion language to read into the record`,
    outputFormat: `Unified Master Meeting Binder formatted in markdown with clickable section anchors.`,
    variables: [
      { name: "student_id", type: "number", description: "Internal student record ID", example: "3" },
      { name: "all_case_materials", type: "document", description: "Full consolidated case text", example: "[Consolidated file...]" }
    ],
    history: [
      { version: "1.3", date: "10/04/2026", author: "Sage (Admin)", notes: "Added motion language generator" },
      { version: "1.2", date: "09/12/2026", author: "Byron Honea", notes: "Refined attendee matrix analysis" },
      { version: "1.0", date: "08/05/2026", author: "Byron Honea", notes: "Initial creation" }
    ]
  },
  {
    id: "prompt-state-complaint-builder",
    name: "State Complaint Builder",
    key: "STATE_COMPLAINT_BUILDER",
    pageId: "PG-020",
    category: "Legal & Compliance",
    modelTier: "CF_MODELS.DEEP",
    modelName: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    version: "2.1",
    lastUpdated: "09/28/2026",
    updatedBy: "Byron Honea",
    status: "Active",
    description: "Draft, structure, and support evidence.",
    purpose: "Drafts formal state complaints under IDEA 34 CFR §§ 300.151-153 and GaDOE Chapter 160-4-7, organizing chronological violations into legal counts with required evidentiary exhibits.",
    usedIn: ["State Complaint Builder"],
    temperature: 0.1,
    maxTokens: 3500,
    isIndividualLocked: true,
    systemPrompt: `You are the Waypoint State Complaint Formulation Engine.
Compose formal Special Education State Complaints to state departments of education (e.g. GaDOE).
Structure into:
1. Complainant & Student Information
2. Statement of Jurisdiction (1-year statute of limitations)
3. Chronological Statement of Facts
4. Legal Violations (Failure to Implement, Denial of FAPE, Child Find, Procedural Safeguards)
5. Proposed Remedies (Compensatory Education, Systemic Staff Training, Independent Evaluations)`,
    outputFormat: `Formal legal complaint ready for advocate filing with state agency.`,
    variables: [
      { name: "facts_and_dates", type: "text", description: "Timeline of district actions", example: "Oct 12: School refused speech sessions..." },
      { name: "district_name", type: "string", description: "School district name", example: "Fulton County Schools" }
    ],
    history: [
      { version: "2.1", date: "09/28/2026", author: "Byron Honea", notes: "Updated compensatory education calculations" },
      { version: "2.0", date: "07/15/2026", author: "Byron Honea", notes: "Rewritten for GaDOE compliance standards" }
    ]
  },
  {
    id: "prompt-pwn-decoder",
    name: "PWN Decoder",
    key: "PWN_DECODER",
    pageId: "PG-010-PWN",
    category: "Legal & Compliance",
    modelTier: "CF_MODELS.DEEP",
    modelName: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    version: "1.4",
    lastUpdated: "09/25/2026",
    updatedBy: "Byron Honea",
    status: "Active",
    description: "Translate and analyze PWN documents.",
    purpose: "Audits district Prior Written Notice (PWN) documents against 34 CFR § 300.503 7-part statutory criteria, exposing unilateral refusals and missing explanations.",
    usedIn: ["PWN Decoder"],
    temperature: 0.1,
    maxTokens: 2000,
    isIndividualLocked: true,
    systemPrompt: `You are the Waypoint PWN Decoder Engine.
Audit provided PWN text against the mandatory 7 statutory elements under 34 CFR § 300.503:
1. Action proposed or refused
2. Explanation of why
3. Evaluation data used
4. Procedural safeguards statement
5. Contact sources for parents
6. Other options considered & rejected
7. Other relevant factors
Highlight legal omissions and draft a formal Response of Deficient PWN.`,
    outputFormat: `Tabular statutory checklist with compliance scores and parent objection draft.`,
    variables: [
      { name: "pwn_text", type: "document", description: "Raw text of PWN issued by school", example: "District proposes to change placement to co-taught..." }
    ],
    history: [
      { version: "1.4", date: "09/25/2026", author: "Byron Honea", notes: "Added automated deficiency objection generator" },
      { version: "1.0", date: "06/01/2026", author: "Byron Honea", notes: "Initial creation" }
    ]
  },
  {
    id: "prompt-progress-monitoring-analyzer",
    name: "Progress Monitoring Analyzer",
    key: "PROGRESS_MONITORING_ANALYZER",
    pageId: "PG-030",
    category: "Case Tools",
    modelTier: "CF_MODELS.FAST",
    modelName: "@cf/meta/llama-3.1-8b-instruct",
    version: "1.1",
    lastUpdated: "09/20/2026",
    updatedBy: "Sage (Admin)",
    status: "Active",
    description: "Analyze progress data and trends.",
    purpose: "Analyzes quarterly progress monitoring reports, curriculum-based measures, and standardized test trends to identify stagnation or regression.",
    usedIn: ["Student Workspace", "Case Compass"],
    temperature: 0.2,
    maxTokens: 1500,
    isIndividualLocked: false,
    systemPrompt: `You are the Waypoint Progress Monitoring Analyzer.
Evaluate quantitative progress reports against stated IEP goal mastery benchmarks.
Identify:
1. Rate of Progress vs Expected Trajectory
2. Missing or Inconsistent Data Points
3. Regression Patterns Requiring ESY or Increased Service Frequency`,
    outputFormat: `Trend analysis report with progress velocity metrics and advocate recommendations.`,
    variables: [
      { name: "goal_text", type: "text", description: "Exact IEP goal text and mastery criteria", example: "By Oct 2026, student will decode multisyllabic words with 85% accuracy in 4 of 5 trials..." },
      { name: "progress_data", type: "text", description: "Quarterly progress reports and teacher probe scores", example: "Q1: 62%, Q2: 65%, Q3: 63%..." }
    ],
    history: [
      { version: "1.1", date: "09/20/2026", author: "Sage (Admin)", notes: "Added ESY qualification criteria check" },
      { version: "1.0", date: "07/04/2026", author: "Byron Honea", notes: "Initial creation" }
    ]
  },
  {
    id: "prompt-communication-analyzer",
    name: "Communication Analyzer",
    key: "COMMUNICATION_ANALYZER",
    pageId: "PG-045",
    category: "Communications",
    modelTier: "CF_MODELS.FAST",
    modelName: "@cf/meta/llama-3.1-8b-instruct",
    version: "1.0",
    lastUpdated: "09/18/2026",
    updatedBy: "Sage (Admin)",
    status: "Active",
    description: "Review and flag key emails/SMS.",
    purpose: "Reviews school emails, text messages, and portal communications to detect informal admissions, administrative pushback, and FERPA-relevant statements.",
    usedIn: ["Client Messages", "Call Center"],
    temperature: 0.25,
    maxTokens: 1200,
    isIndividualLocked: false,
    systemPrompt: `You are the Waypoint Communication Analyzer.
Examine school correspondence to identify:
1. INFORMAL ADMISSIONS: Statements admitting understaffing, canceled therapies, or child struggles.
2. TONE & BIAS: Signs of retaliation, hostility, or dismissive attitudes towards parent concerns.
3. FOLLOW-UP REQUIREMENTS: Unanswered questions that require a formal written Paper Trail email.`,
    outputFormat: `Communication audit summary with flagged excerpts and written advocate response suggestions.`,
    variables: [
      { name: "email_thread", type: "text", description: "Raw text of email exchange", example: "Teacher: 'We don't have enough aides to supervise Lucas in PE this week...'" }
    ],
    history: [
      { version: "1.0", date: "09/18/2026", author: "Sage (Admin)", notes: "Initial release" }
    ]
  }
];

export const VAULT_STORAGE_KEY = "waypoint_ai_prompt_vault_v2";
export const VAULT_LOCK_STATUS_KEY = "waypoint_ai_vault_unlocked";
export const VAULT_MASTER_PIN = "1984"; // Byron's executive vault PIN
