import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

export interface BuiltIepPdfResult {
  bytes: Uint8Array;
  pageCount: number;
  label: string;
  date: string;
}

interface PageSpec {
  pageNumber: number;
  sectionCode: string;
  sectionTitle: string;
  subtitle: string;
  blocks: Array<{
    heading: string;
    tableRows?: Array<[string, string]>;
    paragraphs: string[];
    highlightBox?: {
      label: string;
      text: string;
      meta?: string;
    };
  }>;
}

const pdfCache = new Map<string, Promise<BuiltIepPdfResult>>();

function wrapText(text: string, maxCharsPerLine = 82): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= maxCharsPerLine) {
      current += " " + w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildPageSpecsForVersion(versionId: string): {
  totalPages: number;
  docTitle: string;
  docDate: string;
  pages: PageSpec[];
} {
  const isPrevious = versionId === "v-current-2026-03" || versionId === "v-hist-2025-01";
  const isHistorical = versionId === "v-hist-2025-01";
  const docDate = isHistorical ? "Jan 15, 2025" : isPrevious ? "Mar 3, 2026" : "May 14, 2026";
  const docTitle = isHistorical
    ? "INITIAL TRIENNIAL INDIVIDUALIZED EDUCATION PROGRAM (IEP)"
    : isPrevious
      ? "ANNUAL INDIVIDUALIZED EDUCATION PROGRAM (IEP) — ACTIVE PLAN"
      : "PROPOSED ANNUAL INDIVIDUALIZED EDUCATION PROGRAM (IEP) — DRAFT";
  const totalPages = isPrevious ? 18 : 19;

  const pages: PageSpec[] = [];

  for (let p = 1; p <= totalPages; p++) {
    if (p === 1) {
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION I",
        sectionTitle: "STUDENT DEMOGRAPHICS & IEP TEAM ROSTER",
        subtitle: "Fulton County School District · Special Education Department",
        blocks: [
          {
            heading: "1.1 Student Identification & Plan Metadata",
            tableRows: [
              ["Student Name", "Michael Sheep"],
              ["Grade / Age", "8th Grade · Age 13"],
              ["Primary Eligibility", "Specific Learning Disability (SLD) / Speech-Language Impairment"],
              ["IEP Meeting Date", docDate],
              ["Document Status", isPrevious ? "Signed & Implemented IEP" : "Proposed Draft for Team Review"],
            ],
            paragraphs: [
              "This Individualized Education Program (IEP) documents the student's present levels of academic achievement and functional performance, measurable annual goals, classroom and testing accommodations, special education and related services, and Least Restrictive Environment (LRE) placement.",
            ],
          },
        ],
      });
    } else if (isPrevious && p === 9) {
      // Previous IEP Page 9 -> Reading comprehension (comp-1)
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION V",
        sectionTitle: "MEASURABLE ANNUAL GOALS — READING COMPREHENSION (GOAL 5.1)",
        subtitle: "Academic Area: English Language Arts / Reading Comprehension",
        blocks: [
          {
            heading: "Goal 5.1 — Reading Comprehension & Text Evidence",
            tableRows: [
              ["Domain", "Reading Comprehension (Literal & Inferential Analysis)"],
              ["Baseline (Feb 2026)", "62% accuracy across grade-level passages"],
              ["Mastery Criterion", "70% accuracy across three consecutive data probes"],
              ["Evaluation Method", "Curriculum-based assessments"],
              ["Monitoring Frequency", "Weekly"],
            ],
            paragraphs: [
              "Baseline Summary: Michael demonstrates strong verbal participation during read-aloud discussions but requires explicit comprehension checks when independently analyzing multi-paragraph informational texts.",
            ],
            highlightBox: {
              label: "ANNUAL GOAL 5.1 STATEMENT (PREVIOUS IEP — MAR 3, 2026)",
              text: "Michael will answer literal and inferential questions with 70% accuracy across three consecutive data probes.",
              meta: "Measurement: Curriculum-based assessments | Frequency: Weekly | Section V",
            },
          },
        ],
      });
    } else if (!isPrevious && p === 8) {
      // Proposed IEP Page 8 -> Reading comprehension (comp-1) on DIFFERENT page number!
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION V",
        sectionTitle: "MEASURABLE ANNUAL GOALS — READING COMPREHENSION (GOAL 5.1)",
        subtitle: "Academic Area: English Language Arts / Reading Comprehension",
        blocks: [
          {
            heading: "Goal 5.1 — Reading Comprehension & Text Evidence (Proposed Update)",
            tableRows: [
              ["Domain", "Reading Comprehension (Literal & Inferential Analysis)"],
              ["Updated Baseline", "68% accuracy on Spring curriculum probes"],
              ["Proposed Mastery Criterion", "80% accuracy across three consecutive data probes"],
              ["Evaluation Method", "Curriculum-based assessments"],
              ["Monitoring Frequency", "Weekly"],
            ],
            paragraphs: [
              "Proposed Revision Note: The district proposes increasing the mastery criterion from 70% to 80% accuracy while keeping the weekly curriculum-based probe schedule unchanged.",
            ],
            highlightBox: {
              label: "ANNUAL GOAL 5.1 STATEMENT (PROPOSED IEP — MAY 14, 2026)",
              text: "Michael will answer literal and inferential questions with 80% accuracy across three consecutive data probes.",
              meta: "Measurement: Curriculum-based assessments | Frequency: Weekly | Section V",
            },
          },
        ],
      });
    } else if (isPrevious && p === 10) {
      // Previous IEP Page 10 -> Goal wording (comp-5)
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION V",
        sectionTitle: "MEASURABLE ANNUAL GOALS — WRITTEN EXPRESSION (GOAL 5.2)",
        subtitle: "Academic Area: Written Expression & Paragraph Structure",
        blocks: [
          {
            heading: "Goal 5.2 — Written Expression & Organization",
            tableRows: [
              ["Domain", "Written Expression — Expository Paragraph Drafting"],
              ["Mastery Criterion", "75% rubric accuracy across 4 out of 5 writing samples"],
              ["Evaluation Method", "Writing rubric samples"],
              ["Monitoring Frequency", "Bi-weekly"],
            ],
            paragraphs: [
              "Instructional Context: Michael benefits from structured pre-writing discussion prior to independent paragraph composition in co-taught English Language Arts.",
            ],
            highlightBox: {
              label: "ANNUAL GOAL 5.2 STATEMENT (PREVIOUS IEP — MAR 3, 2026)",
              text: "Michael will compose a 5-sentence paragraph with a topic sentence and supporting details with 75% rubric accuracy.",
              meta: "Measurement: Writing rubric samples | Frequency: Bi-weekly | Section V",
            },
          },
        ],
      });
    } else if (!isPrevious && p === 9) {
      // Proposed IEP Page 9 -> Goal wording (comp-5)
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION V",
        sectionTitle: "MEASURABLE ANNUAL GOALS — WRITTEN EXPRESSION (GOAL 5.2)",
        subtitle: "Academic Area: Written Expression & Paragraph Structure",
        blocks: [
          {
            heading: "Goal 5.2 — Written Expression & Organization (Reworded Condition)",
            tableRows: [
              ["Domain", "Written Expression — Expository Paragraph Drafting"],
              ["Scaffold Condition", "Given a visual graphic organizer prior to drafting"],
              ["Mastery Criterion", "75% rubric accuracy across 4 out of 5 writing samples"],
              ["Evaluation Method", "Writing rubric samples"],
              ["Monitoring Frequency", "Bi-weekly"],
            ],
            paragraphs: [
              "Proposed Revision Note: Goal condition reworded to explicitly specify the provision of a visual graphic organizer prior to drafting.",
            ],
            highlightBox: {
              label: "ANNUAL GOAL 5.2 STATEMENT (PROPOSED IEP — MAY 14, 2026)",
              text: "Given a visual graphic organizer, Michael will compose a 5-sentence paragraph with a topic sentence and supporting details with 75% rubric accuracy.",
              meta: "Measurement: Writing rubric samples | Frequency: Bi-weekly | Section V",
            },
          },
        ],
      });
    } else if (p === 11) {
      // Page 11 in BOTH -> Testing accommodations (comp-3), and Previous IEP reference section for Break access (comp-4)
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION VI",
        sectionTitle: "INSTRUCTIONAL & ASSESSMENT ACCOMMODATIONS",
        subtitle: "Classroom Instruction, District Benchmarks, and State Standardized Assessments",
        blocks: [
          {
            heading: "6.1 Extended Time & Small-Group Testing Accommodations",
            tableRows: [
              ["Accommodation Category", "Timing & Scheduling / Setting"],
              [
                "Extended Time Allowance",
                isPrevious ? "100% extended time (double time)" : "50% extended time (time-and-a-half)",
              ],
              ["Assessment Setting", "Small-group setting with minimal distractions"],
              ["Applicable Exams", "All classroom quizzes, district benchmarks, and state assessments"],
            ],
            paragraphs: [
              isPrevious
                ? "Section 6.2 Self-Regulation & Sensory Supports: No explicit sensory or self-regulation break accommodation is listed in this version of Section VI."
                : "Section 6.1 Revision Note: Extended time allowance modified from 100% (double time) to 50% (time-and-a-half) across timed assessments.",
            ],
            highlightBox: {
              label: isPrevious
                ? "TESTING ACCOMMODATION SPECIFICATION (PREVIOUS IEP — MAR 3, 2026)"
                : "TESTING ACCOMMODATION SPECIFICATION (PROPOSED IEP — MAY 14, 2026)",
              text: isPrevious
                ? "Michael will receive 100% extended time (double time) in a small-group setting on all classroom quizzes, district benchmarks, and state assessments."
                : "Michael will receive 50% extended time (time-and-a-half) in a small-group setting on all classroom quizzes, district benchmarks, and state assessments.",
              meta: "Measurement: Testing accommodation logs | Frequency: All timed assessments | Section VI",
            },
          },
        ],
      });
    } else if (!isPrevious && p === 12) {
      // Proposed IEP Page 12 -> Break access added (comp-4)
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION VI",
        sectionTitle: "INSTRUCTIONAL & ASSESSMENT ACCOMMODATIONS (CONT.)",
        subtitle: "Sensory, Self-Regulation, and Executive Function Supports",
        blocks: [
          {
            heading: "6.2 Regulation & Sensory Break Access (New Addition)",
            tableRows: [
              ["Accommodation Type", "Scheduled & Unscheduled Regulation Breaks"],
              ["Break Duration", "5-minute regulation breaks"],
              ["Applicable Settings", "Core classroom instruction and state testing"],
              ["Tracking Method", "Teacher & student check-in log (As needed daily)"],
            ],
            paragraphs: [
              "New Accommodation Added: Added to support sensory regulation and prevent cognitive fatigue during extended reading and writing tasks.",
            ],
            highlightBox: {
              label: "NEW ACCOMMODATION ENTRY (PROPOSED IEP — MAY 14, 2026)",
              text: "Student will have access to scheduled and unscheduled 5-minute regulation breaks during instruction and state testing.",
              meta: "Measurement: Teacher & student check-in log | Frequency: As needed daily | Section VI",
            },
          },
        ],
      });
    } else if (isPrevious && p === 14) {
      // Previous IEP Page 14 -> Speech minutes (comp-2)
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION VII",
        sectionTitle: "SPECIAL EDUCATION & RELATED SERVICES MATRIX",
        subtitle: "Direct Specialized Instruction & Related Therapy Services",
        blocks: [
          {
            heading: "7.2 Related Services — Speech-Language Therapy (Direct Service)",
            tableRows: [
              ["Related Service", "Speech-Language Pathology (Direct Small-Group)"],
              ["Service Frequency", "30 minutes per week (Direct weekly therapy)"],
              ["Service Setting", "Speech-Language Therapy Room"],
              ["Focus Area", "Pragmatic and expressive language skills"],
            ],
            paragraphs: [
              "Service Justification: Direct weekly small-group therapy supports peer turn-taking, narrative organization, and expressive language clarity.",
            ],
            highlightBox: {
              label: "RELATED SERVICE MATRIX ENTRY (PREVIOUS IEP — MAR 3, 2026)",
              text: "Michael will receive 30 minutes per week of direct small-group speech-language therapy addressing pragmatic and expressive language.",
              meta: "Provider: Certified SLP | Monitoring: SLP quarterly therapy logs | Section VII",
            },
          },
        ],
      });
    } else if (!isPrevious && p === 15) {
      // Proposed IEP Page 15 -> Speech minutes removed (comp-2)
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION VII",
        sectionTitle: "SPECIAL EDUCATION & RELATED SERVICES MATRIX",
        subtitle: "Direct Specialized Instruction & Consultative Services",
        blocks: [
          {
            heading: "7.2 Related Services — Speech-Language Pathology Matrix",
            tableRows: [
              ["Direct Speech-Language Therapy", "0 minutes / week (Removed from Direct Services)"],
              ["Consultative SLP Support", "15 minutes / month (Teacher consultation only)"],
              ["Service Setting", "Indirect / Consultative only"],
            ],
            paragraphs: [
              "No direct speech-language therapy minutes listed in proposed Section VII service matrix (moved to monthly consult only).",
            ],
            highlightBox: {
              label: "PROPOSED SECTION VII RELATED SERVICES SCHEDULE (MAY 14, 2026)",
              text: "No direct speech-language therapy minutes listed in proposed Section VII service matrix (moved to monthly consult only).",
              meta: "Direct Weekly Speech Therapy Removed (-30 min/week) | Section VII",
            },
          },
        ],
      });
    } else if (p === 17) {
      // Page 17 in BOTH -> Transportation (comp-6)
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION IX",
        sectionTitle: "SPECIAL TRANSPORTATION & TRANSIT SUPPORTS",
        subtitle: "Related Service Transportation & Bus Safety Determination",
        blocks: [
          {
            heading: "9.1 Student Transportation Plan & Routing",
            tableRows: [
              [
                "Transportation Mode",
                isPrevious ? "Special Transportation (Small Bus)" : "General Neighborhood Bus Route",
              ],
              [
                "Supervision / Seating",
                isPrevious ? "Curb-to-curb with bus monitor" : "Preferential front-row seating (No monitor)",
              ],
              ["Schedule", "Daily AM / PM transit"],
            ],
            paragraphs: [
              "Transportation Eligibility Note: The IEP team reviews student sensory, behavioral, and physical transit safety needs annually when determining special transportation services.",
            ],
            highlightBox: {
              label: isPrevious
                ? "TRANSPORTATION PROVISION (PREVIOUS IEP — MAR 3, 2026)"
                : "TRANSPORTATION PROVISION (PROPOSED IEP — MAY 14, 2026)",
              text: isPrevious
                ? "Special transportation: Curb-to-curb small-bus route with bus monitor due to sensory and transition safety needs."
                : "General transportation: Standard neighborhood bus route with preferential front-row seating.",
              meta: "Section IX · Special Transportation & Related Services",
            },
          },
        ],
      });
    } else if ((isPrevious && p === 18) || (!isPrevious && p === 19)) {
      // Previous Page 18 / Proposed Page 19 -> LRE Inclusion (comp-7)
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION X",
        sectionTitle: "LEAST RESTRICTIVE ENVIRONMENT (LRE) & EDUCATIONAL PLACEMENT",
        subtitle: "Time in General Education Environment & Continuum of Placement",
        blocks: [
          {
            heading: "10.1 LRE Time Calculation & Placement Summary",
            tableRows: [
              [
                "General Education Inclusion %",
                isPrevious ? "80% of the instructional day" : "72% of the instructional day",
              ],
              [
                "Special Education Pull-Out %",
                isPrevious ? "20% of the instructional day" : "28% of the instructional day",
              ],
              ["Schedule Basis", "Master schedule minutes · Daily instructional schedule"],
            ],
            paragraphs: [
              "Placement Justification: The student participates with non-disabled peers in general education core classes and electives to the maximum extent appropriate.",
            ],
            highlightBox: {
              label: isPrevious
                ? "LRE PLACEMENT DETERMINATION (PREVIOUS IEP — PAGE 18)"
                : "LRE PLACEMENT DETERMINATION (PROPOSED IEP — PAGE 19)",
              text: isPrevious
                ? "Michael participates in the general education environment for 80% of the instructional day alongside non-disabled peers."
                : "Michael participates in the general education environment for 72% of the instructional day alongside non-disabled peers.",
              meta: "Section X · Least Restrictive Environment (LRE)",
            },
          },
        ],
      });
    } else {
      // Standard contextual IEP pages so the user can freely browse all 18 / 19 pages
      const sectionMap: Record<number, { code: string; title: string; desc: string }> = {
        2: {
          code: "SECTION II",
          title: "PROCEDURAL SAFEGUARDS & PARENT PARTICIPATION",
          desc: "Documentation of parent notice, procedural safeguards receipt, and parent input into evaluation and instructional priorities.",
        },
        3: {
          code: "SECTION III",
          title: "PRESENT LEVELS OF ACADEMIC ACHIEVEMENT (PLAAFP — ELA & READING)",
          desc: "Summary of standardized reading assessments, classroom lexile benchmarks, and teacher observations.",
        },
        4: {
          code: "SECTION III",
          title: "PRESENT LEVELS OF ACADEMIC ACHIEVEMENT (PLAAFP — WRITTEN EXPRESSION & MATH)",
          desc: "Analysis of multi-paragraph writing samples, rubric scores, and mathematical problem-solving performance.",
        },
        5: {
          code: "SECTION III",
          title: "PRESENT LEVELS OF FUNCTIONAL PERFORMANCE & COMMUNICATION",
          desc: "Pragmatic language observations, executive functioning checklists, and classroom sensory regulation notes.",
        },
        6: {
          code: "SECTION IV",
          title: "CONSIDERATION OF SPECIAL FACTORS & ASSISTIVE TECHNOLOGY",
          desc: "Team review of communication needs, assistive technology tools, graphic organizers, and behavioral supports.",
        },
        7: {
          code: "SECTION IV",
          title: "PARENT CONCERNS & STUDENT STRENGTHS SUMMARY",
          desc: "Parent-submitted priorities regarding reading comprehension targets, speech therapy continuity, and bus transit safety.",
        },
        8: {
          code: "SECTION V",
          title: "ANNUAL GOALS PROGRESS OVERVIEW & BASELINE DATA TABLE",
          desc: "Summary of prior annual goal mastery across reading, writing, and communication domains.",
        },
        10: {
          code: "SECTION V",
          title: "MEASURABLE ANNUAL GOALS — EXECUTIVE FUNCTIONING (GOAL 5.3)",
          desc: "Assignment tracking, chunking of multi-step projects, and self-monitoring checklists.",
        },
        12: {
          code: "SECTION VI",
          title: "SUPPLEMENTARY AIDS, CLASSROOM MODIFICATIONS & SUPPORTS",
          desc: "Preferential seating, visual schedules, chunked directions, and copy of class notes.",
        },
        13: {
          code: "SECTION VI",
          title: "DISTRICT & STATE STANDARDIZED ASSESSMENT PARTICIPATION",
          desc: "Participation in Georgia Milestones End-of-Grade assessments with designated testing accommodations.",
        },
        14: {
          code: "SECTION VII",
          title: "SPECIALIZED INSTRUCTION DELIVERY SCHEDULE (CO-TAUGHT & RESOURCE)",
          desc: "Weekly minutes for co-taught English Language Arts and small-group Reading/Writing support.",
        },
        15: {
          code: "SECTION VII",
          title: "EXTENDED SCHOOL YEAR (ESY) ELIGIBILITY DETERMINATION",
          desc: "Review of regression/recoupment data and emerging skill criteria for Extended School Year services.",
        },
        16: {
          code: "SECTION VIII",
          title: "TRANSITION SERVICE CONSIDERATIONS & MIDDLE-TO-HIGH ARTICULATION",
          desc: "8th-grade academic course planning and self-advocacy readiness for high school transition.",
        },
        18: {
          code: "SECTION IX",
          title: "BEHAVIORAL & SENSORY REGULATION PROTOCOL",
          desc: "Proactive classroom regulation strategies and de-escalation check-ins.",
        },
      };
      const info = sectionMap[p] || {
        code: `SECTION ${p}`,
        title: "INDIVIDUALIZED EDUCATION PROGRAM CONTINUATION PAGE",
        desc: "Official IEP record continuation page containing team documentation and instructional schedules.",
      };
      pages.push({
        pageNumber: p,
        sectionCode: info.code,
        sectionTitle: info.title,
        subtitle: "Fulton County School District · Individualized Education Program",
        blocks: [
          {
            heading: `${info.code} — Record Details (Page ${p} of ${totalPages})`,
            tableRows: [
              ["Student", "Michael Sheep (8th Grade)"],
              ["Plan Date", docDate],
              ["Section", `${info.code}: ${info.title}`],
              ["Page Reference", `Page ${p} of ${totalPages}`],
            ],
            paragraphs: [
              info.desc,
              "All team determinations recorded in this section are governed by IDEA procedural safeguards and require Prior Written Notice (PWN) prior to any change in identification, evaluation, educational placement, or the provision of FAPE.",
            ],
          },
        ],
      });
    }
  }

  return { totalPages, docTitle, docDate, pages };
}

function drawPage(
  page: PDFPage,
  spec: PageSpec,
  totalPages: number,
  docTitle: string,
  docDate: string,
  fontRegular: PDFFont,
  fontBold: PDFFont
) {
  const { width, height } = page.getSize();

  // Outer document margin frame
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    borderColor: rgb(0.78, 0.81, 0.86),
    borderWidth: 1,
  });

  // Top Header Band
  page.drawRectangle({
    x: 28,
    y: height - 86,
    width: width - 56,
    height: 58,
    color: rgb(0.95, 0.96, 0.98),
    borderColor: rgb(0.78, 0.81, 0.86),
    borderWidth: 1,
  });

  page.drawText(docTitle, {
    x: 42,
    y: height - 48,
    size: 9.5,
    font: fontBold,
    color: rgb(0.1, 0.16, 0.28),
  });

  page.drawText(`STUDENT: Michael Sheep (Grade 8)   |   PLAN DATE: ${docDate}`, {
    x: 42,
    y: height - 64,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.28, 0.33, 0.42),
  });

  page.drawText(`PAGE ${spec.pageNumber} OF ${totalPages}`, {
    x: width - 125,
    y: height - 48,
    size: 9,
    font: fontBold,
    color: rgb(0.15, 0.22, 0.38),
  });

  page.drawText(spec.sectionCode, {
    x: width - 125,
    y: height - 64,
    size: 8,
    font: fontBold,
    color: rgb(0.38, 0.43, 0.52),
  });

  // Section Banner
  let cursorY = height - 115;
  page.drawText(`${spec.sectionCode}: ${spec.sectionTitle}`, {
    x: 42,
    y: cursorY,
    size: 11.5,
    font: fontBold,
    color: rgb(0.08, 0.13, 0.24),
  });

  cursorY -= 16;
  page.drawText(spec.subtitle, {
    x: 42,
    y: cursorY,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.38, 0.43, 0.52),
  });

  cursorY -= 12;
  page.drawLine({
    start: { x: 42, y: cursorY },
    end: { x: width - 42, y: cursorY },
    thickness: 0.8,
    color: rgb(0.82, 0.85, 0.9),
  });

  cursorY -= 24;

  for (const block of spec.blocks) {
    page.drawText(block.heading, {
      x: 42,
      y: cursorY,
      size: 10,
      font: fontBold,
      color: rgb(0.12, 0.18, 0.3),
    });
    cursorY -= 16;

    if (block.tableRows && block.tableRows.length > 0) {
      for (const [colKey, colVal] of block.tableRows) {
        const rowHeight = 22;
        page.drawRectangle({
          x: 42,
          y: cursorY - rowHeight + 6,
          width: 165,
          height: rowHeight,
          color: rgb(0.96, 0.97, 0.99),
          borderColor: rgb(0.82, 0.85, 0.9),
          borderWidth: 0.75,
        });
        page.drawRectangle({
          x: 207,
          y: cursorY - rowHeight + 6,
          width: width - 249,
          height: rowHeight,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.82, 0.85, 0.9),
          borderWidth: 0.75,
        });
        page.drawText(colKey, {
          x: 48,
          y: cursorY - 9,
          size: 8.5,
          font: fontBold,
          color: rgb(0.2, 0.25, 0.34),
        });
        page.drawText(colVal.slice(0, 75), {
          x: 214,
          y: cursorY - 9,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.12, 0.16, 0.22),
        });
        cursorY -= rowHeight;
      }
      cursorY -= 18;
    }

    if (block.highlightBox) {
      const wrapped = wrapText(block.highlightBox.text, 72);
      const boxHeight = 46 + wrapped.length * 15 + (block.highlightBox.meta ? 18 : 0);

      page.drawRectangle({
        x: 42,
        y: cursorY - boxHeight + 10,
        width: width - 84,
        height: boxHeight,
        color: rgb(0.98, 0.985, 1),
        borderColor: rgb(0.45, 0.53, 0.72),
        borderWidth: 1.2,
      });

      page.drawText(block.highlightBox.label, {
        x: 54,
        y: cursorY - 8,
        size: 8,
        font: fontBold,
        color: rgb(0.22, 0.3, 0.48),
      });

      let textY = cursorY - 26;
      for (const line of wrapped) {
        page.drawText(line, {
          x: 54,
          y: textY,
          size: 10.5,
          font: fontBold,
          color: rgb(0.06, 0.09, 0.16),
        });
        textY -= 15;
      }

      if (block.highlightBox.meta) {
        page.drawText(block.highlightBox.meta, {
          x: 54,
          y: textY - 3,
          size: 8,
          font: fontRegular,
          color: rgb(0.35, 0.4, 0.5),
        });
      }

      cursorY -= boxHeight + 22;
    }

    for (const para of block.paragraphs) {
      const lines = wrapText(para, 84);
      for (const line of lines) {
        page.drawText(line, {
          x: 42,
          y: cursorY,
          size: 9,
          font: fontRegular,
          color: rgb(0.2, 0.24, 0.32),
        });
        cursorY -= 14;
      }
      cursorY -= 10;
    }
  }

  // Footer
  page.drawLine({
    start: { x: 42, y: 54 },
    end: { x: width - 42, y: 54 },
    thickness: 0.6,
    color: rgb(0.82, 0.85, 0.9),
  });
  page.drawText(
    `CONFIDENTIAL STUDENT RECORD (FERPA PROTECTED) · Michael Sheep · ${docDate}`,
    {
      x: 42,
      y: 40,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.45, 0.5, 0.58),
    }
  );
  page.drawText(`Page ${spec.pageNumber} of ${totalPages}`, {
    x: width - 105,
    y: 40,
    size: 8,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.45),
  });
}

export async function getOrBuildVersionPdf(versionId: string): Promise<BuiltIepPdfResult> {
  const cached = pdfCache.get(versionId);
  if (cached) return cached;

  const promise = (async () => {
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { totalPages, docTitle, docDate, pages } = buildPageSpecsForVersion(versionId);

    for (const spec of pages) {
      const page = pdfDoc.addPage([612, 792]); // Standard US Letter
      drawPage(page, spec, totalPages, docTitle, docDate, fontRegular, fontBold);
    }

    const bytes = await pdfDoc.save();
    return {
      bytes,
      pageCount: totalPages,
      label: docTitle,
      date: docDate,
    };
  })();

  pdfCache.set(versionId, promise);
  return promise;
}

