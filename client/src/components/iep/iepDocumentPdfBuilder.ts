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
  goalBanner: string;
  badgeNumber: string;
  annualGoalPrefix: string;
  annualGoalSentenceBefore: string;
  highlightToken: string;
  annualGoalSentenceAfter: string;
  objectives: Array<{
    code: string;
    desc: string;
    criteriaBold: string;
    criteriaRest: string;
    timeline: string;
  }>;
  progressMonitoring: {
    method: string;
    frequency: string;
    dataCollection: string;
    reporting: string;
  };
}

const pdfCache = new Map<string, Promise<BuiltIepPdfResult>>();

function wrapText(text: string, maxCharsPerLine = 84): string[] {
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
  isPrevious: boolean;
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
    if ((isPrevious && p === 9) || (!isPrevious && p === 8)) {
      // Reading comprehension (comp-1): Page 9 in Previous, Page 8 in Proposed
      const pct = isPrevious ? "70% accuracy" : "80% accuracy";
      const pctShort = isPrevious ? ">= 70% accuracy" : ">= 80% accuracy";
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION V",
        sectionTitle: "SECTION V: MEASURABLE ANNUAL GOALS",
        subtitle: "Academic Area: English Language Arts / Reading Comprehension",
        goalBanner: isPrevious
          ? "Goal 5.1 — Reading Comprehension"
          : "Goal 5.1 — Reading Comprehension (Proposed Update)",
        badgeNumber: "5.1",
        annualGoalPrefix: "Annual Goal: ",
        annualGoalSentenceBefore:
          "Given grade-level informational and literary texts, Michael will read and comprehend key ideas and supporting details, answering comprehension questions with at least ",
        highlightToken: pct,
        annualGoalSentenceAfter: " across three consecutive weekly assessments.",
        objectives: [
          {
            code: "5.1.1",
            desc: "Identify main idea and key details in grade-level texts.",
            criteriaBold: pctShort,
            criteriaRest: " on 3 consecutive weekly assessments",
            timeline: "By May 2026",
          },
          {
            code: "5.1.2",
            desc: "Use text evidence to support answers to comprehension questions.",
            criteriaBold: pctShort,
            criteriaRest: " on 3 consecutive weekly assessments",
            timeline: "By May 2026",
          },
        ],
        progressMonitoring: {
          method: "Teacher-created comprehension assessments",
          frequency: "Weekly",
          dataCollection: "Percentage correct (accuracy)",
          reporting: "Quarterly to parents",
        },
      });
    } else if ((isPrevious && p === 10) || (!isPrevious && p === 9)) {
      // Goal wording (comp-5): Page 10 in Previous, Page 9 in Proposed
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION V",
        sectionTitle: "SECTION V: MEASURABLE ANNUAL GOALS",
        subtitle: "Academic Area: Written Expression & Paragraph Structure",
        goalBanner: isPrevious
          ? "Goal 5.2 — Written Expression & Organization"
          : "Goal 5.2 — Written Expression & Organization (Proposed Update)",
        badgeNumber: "5.2",
        annualGoalPrefix: "Annual Goal: ",
        annualGoalSentenceBefore: isPrevious
          ? "When assigned a grade-level prompt, "
          : "",
        highlightToken: isPrevious
          ? "Michael will compose"
          : "Given a visual graphic organizer, Michael will compose",
        annualGoalSentenceAfter:
          " a 5-sentence paragraph with a topic sentence and supporting details with 75% rubric accuracy.",
        objectives: [
          {
            code: "5.2.1",
            desc: "Draft a clear topic sentence aligned to the writing prompt.",
            criteriaBold: ">= 75% rubric score",
            criteriaRest: " across 4 out of 5 writing samples",
            timeline: "By May 2026",
          },
          {
            code: "5.2.2",
            desc: "Include three supporting detail sentences and a concluding sentence.",
            criteriaBold: ">= 75% rubric score",
            criteriaRest: " across 4 out of 5 writing samples",
            timeline: "By May 2026",
          },
        ],
        progressMonitoring: {
          method: "Writing rubric samples",
          frequency: "Bi-weekly",
          dataCollection: "Analytic writing rubric score",
          reporting: "Quarterly to parents",
        },
      });
    } else if (p === 11) {
      // Testing accommodations (comp-3): Page 11 in both
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION VI",
        sectionTitle: "SECTION VI: INSTRUCTIONAL & ASSESSMENT ACCOMMODATIONS",
        subtitle: "Academic Area: Classroom Instruction, District Benchmarks & State Assessments",
        goalBanner: isPrevious
          ? "6.1 — Extended Time & Testing Setting Accommodations"
          : "6.1 — Extended Time & Testing Setting Accommodations (Proposed Update)",
        badgeNumber: "6.1",
        annualGoalPrefix: "Testing Accommodation: ",
        annualGoalSentenceBefore: "Michael will receive ",
        highlightToken: isPrevious
          ? "100% extended time (double time)"
          : "50% extended time (time-and-a-half)",
        annualGoalSentenceAfter:
          " in a small-group setting on all classroom quizzes, district benchmarks, and state assessments.",
        objectives: [
          {
            code: "6.1.1",
            desc: "Classroom & District Timed Assessments (ELA, Math, Science, Social Studies).",
            criteriaBold: isPrevious ? "100% Extended Time" : "50% Extended Time",
            criteriaRest: " in small-group testing location",
            timeline: "All Timed Exams",
          },
          {
            code: "6.1.2",
            desc: "Georgia Milestones End-of-Grade Standardized Assessments.",
            criteriaBold: isPrevious ? "Double Time" : "Time-and-a-Half",
            criteriaRest: " per state testing guidelines",
            timeline: "Spring 2026",
          },
        ],
        progressMonitoring: {
          method: "Testing accommodation administration logs",
          frequency: "Every timed test",
          dataCollection: "Extended time utilization tracking",
          reporting: "Quarterly to parents",
        },
      });
    } else if (!isPrevious && p === 12) {
      // Break access (comp-4): Page 12 in Proposed
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION VI",
        sectionTitle: "SECTION VI: INSTRUCTIONAL & ASSESSMENT ACCOMMODATIONS",
        subtitle: "Academic Area: Sensory Regulation & Executive Functioning Supports",
        goalBanner: "6.2 — Regulation & Sensory Break Access (New Addition)",
        badgeNumber: "6.2",
        annualGoalPrefix: "Accommodation: ",
        annualGoalSentenceBefore: "Student will have access to ",
        highlightToken: "5-minute regulation breaks",
        annualGoalSentenceAfter:
          " (scheduled and unscheduled) during core classroom instruction and state testing.",
        objectives: [
          {
            code: "6.2.1",
            desc: "Proactive teacher-prompted or student-requested regulation break.",
            criteriaBold: "5-minute break",
            criteriaRest: " in designated quiet area as needed",
            timeline: "Daily / Ongoing",
          },
          {
            code: "6.2.2",
            desc: "Stop-the-clock sensory regulation break during extended assessments.",
            criteriaBold: "5-minute break",
            criteriaRest: " without penalty to testing time",
            timeline: "All Assessments",
          },
        ],
        progressMonitoring: {
          method: "Teacher & student check-in log",
          frequency: "As needed daily",
          dataCollection: "Break frequency & duration log",
          reporting: "Quarterly to parents",
        },
      });
    } else if ((isPrevious && p === 14) || (!isPrevious && p === 15)) {
      // Speech minutes (comp-2): Page 14 in Previous, Page 15 in Proposed
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION VII",
        sectionTitle: "SECTION VII: SPECIAL EDUCATION & RELATED SERVICES",
        subtitle: "Service Category: Speech-Language Pathology & Communication Supports",
        goalBanner: isPrevious
          ? "7.2 — Direct Speech-Language Therapy Services"
          : "7.2 — Speech-Language Services Matrix (Proposed Change)",
        badgeNumber: "7.2",
        annualGoalPrefix: "Service Provision: ",
        annualGoalSentenceBefore: isPrevious ? "Michael will receive " : "Direct therapy removed: ",
        highlightToken: isPrevious
          ? "30 minutes per week"
          : "No direct speech-language therapy minutes",
        annualGoalSentenceAfter: isPrevious
          ? " of direct small-group speech-language therapy addressing pragmatic and expressive language."
          : " listed in proposed Section VII service matrix (moved to monthly consult only).",
        objectives: [
          {
            code: "7.2.1",
            desc: "Direct Small-Group Speech-Language Therapy (Pragmatic & Expressive).",
            criteriaBold: isPrevious ? "30 min / week" : "0 min / week",
            criteriaRest: isPrevious ? " direct SLP therapy room" : " (Removed from direct matrix)",
            timeline: "2026-2027 IEP",
          },
          {
            code: "7.2.2",
            desc: "Indirect Speech-Language Consultation with General Ed Teachers.",
            criteriaBold: "15 min / month",
            criteriaRest: " indirect provider consultation",
            timeline: "Monthly",
          },
        ],
        progressMonitoring: {
          method: "SLP service delivery & therapy session logs",
          frequency: isPrevious ? "Weekly" : "Monthly consult",
          dataCollection: "Service minutes & pragmatic trials",
          reporting: "Quarterly to parents",
        },
      });
    } else if (p === 17) {
      // Transportation (comp-6): Page 17 in both
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION IX",
        sectionTitle: "SECTION IX: SPECIAL TRANSPORTATION & RELATED TRANSIT",
        subtitle: "Service Category: Student Transit Safety & Bus Routing",
        goalBanner: isPrevious
          ? "9.1 — Special Transportation Determination"
          : "9.1 — Transportation Routing Determination (Proposed Update)",
        badgeNumber: "9.1",
        annualGoalPrefix: "Transportation Plan: ",
        annualGoalSentenceBefore: isPrevious ? "Special transportation: " : "General transportation: ",
        highlightToken: isPrevious
          ? "Curb-to-curb small-bus route with bus monitor"
          : "Standard neighborhood bus route",
        annualGoalSentenceAfter: isPrevious
          ? " due to sensory and transition safety needs."
          : " with preferential front-row seating.",
        objectives: [
          {
            code: "9.1.1",
            desc: "Morning and Afternoon Home-to-School Transit Routing.",
            criteriaBold: isPrevious ? "Small Bus + Monitor" : "Standard Bus Route",
            criteriaRest: isPrevious ? " curb-to-curb supervision" : " front-row seating only",
            timeline: "Daily AM / PM",
          },
          {
            code: "9.1.2",
            desc: "Transition & Sensory Safety Protocol During Boarding/Dismissal.",
            criteriaBold: isPrevious ? "Assisted Boarding" : "Standard Dismissal",
            criteriaRest: " per school transit schedule",
            timeline: "Daily",
          },
        ],
        progressMonitoring: {
          method: "District transportation & bus dispatch records",
          frequency: "Daily",
          dataCollection: "Transit attendance & incident logs",
          reporting: "Quarterly to parents",
        },
      });
    } else if ((isPrevious && p === 18) || (!isPrevious && p === 19)) {
      // LRE Inclusion (comp-7): Page 18 in Previous, Page 19 in Proposed
      pages.push({
        pageNumber: p,
        sectionCode: "SECTION X",
        sectionTitle: "SECTION X: LEAST RESTRICTIVE ENVIRONMENT (LRE) PLACEMENT",
        subtitle: "Educational Placement & General Education Inclusion Calculation",
        goalBanner: isPrevious
          ? "10.1 — General Education Inclusion Schedule"
          : "10.1 — General Education Inclusion Schedule (Proposed Update)",
        badgeNumber: "10.1",
        annualGoalPrefix: "LRE Determination: ",
        annualGoalSentenceBefore:
          "Michael participates in the general education environment for ",
        highlightToken: isPrevious
          ? "80% of the instructional day"
          : "72% of the instructional day",
        annualGoalSentenceAfter: " alongside non-disabled peers.",
        objectives: [
          {
            code: "10.1.1",
            desc: "General Education Core & Elective Classes with Co-Taught Support.",
            criteriaBold: isPrevious ? "80% Gen Ed" : "72% Gen Ed",
            criteriaRest: " of total weekly instructional minutes",
            timeline: "Daily Schedule",
          },
          {
            code: "10.1.2",
            desc: "Specialized Resource Pull-Out Instruction.",
            criteriaBold: isPrevious ? "20% Pull-Out" : "28% Pull-Out",
            criteriaRest: " in special education resource room",
            timeline: "Daily Schedule",
          },
        ],
        progressMonitoring: {
          method: "Master schedule instructional minute audit",
          frequency: "Each semester",
          dataCollection: "LRE percentage calculation",
          reporting: "Annual IEP review",
        },
      });
    } else {
      // Other pages
      pages.push({
        pageNumber: p,
        sectionCode: `SECTION ${Math.min(10, Math.ceil(p / 2))}`,
        sectionTitle: `SECTION ${Math.min(10, Math.ceil(p / 2))}: INDIVIDUALIZED EDUCATION PROGRAM RECORD`,
        subtitle: "Academic & Functional Program Documentation · Michael Sheep (Grade 8)",
        goalBanner: `Section ${p}.1 — IEP Team Documentation & Baseline Records`,
        badgeNumber: `${p}.1`,
        annualGoalPrefix: "Program Record: ",
        annualGoalSentenceBefore:
          "The IEP team reviewed student assessment data, classroom performance, and parent input for ",
        highlightToken: `Page ${p} of ${totalPages}`,
        annualGoalSentenceAfter:
          " in accordance with IDEA procedural safeguards and district curriculum standards.",
        objectives: [
          {
            code: `${p}.1.1`,
            desc: "Maintain ongoing parent-school communication and data sharing.",
            criteriaBold: "100% compliance",
            criteriaRest: " with quarterly progress reporting schedule",
            timeline: "By May 2026",
          },
          {
            code: `${p}.1.2`,
            desc: "Document instructional accommodations and student response to intervention.",
            criteriaBold: "Weekly review",
            criteriaRest: " by case manager and general education team",
            timeline: "By May 2026",
          },
        ],
        progressMonitoring: {
          method: "Curriculum-based assessments & teacher work samples",
          frequency: "Weekly",
          dataCollection: "Portfolio & gradebook tracking",
          reporting: "Quarterly to parents",
        },
      });
    }
  }

  return { totalPages, docTitle, docDate, isPrevious, pages };
}

function drawPage(
  page: PDFPage,
  spec: PageSpec,
  totalPages: number,
  docTitle: string,
  docDate: string,
  isPrevious: boolean,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  fontOblique: PDFFont
) {
  const { width, height } = page.getSize();
  const marginX = 34;
  const contentW = width - marginX * 2;

  // Clean white paper canvas
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.99, 0.99, 0.995),
  });

  // Top Header Row 1: Document Title (Left) + PAGE X OF Y (Right)
  let y = height - 42;
  page.drawText(docTitle, {
    x: marginX,
    y,
    size: 10.5,
    font: fontBold,
    color: rgb(0.07, 0.1, 0.18),
  });

  const pageLabel = `PAGE ${spec.pageNumber} OF ${totalPages}`;
  const pageLabelW = fontRegular.widthOfTextAtSize(pageLabel, 9.5);
  page.drawText(pageLabel, {
    x: width - marginX - pageLabelW,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.22, 0.26, 0.34),
  });

  // Top Header Row 2: STUDENT & PLAN DATE (Left) + SECTION V (Right)
  y -= 16;
  page.drawText(`STUDENT: Michael Sheep (Grade 8)   |   PLAN DATE: ${docDate}`, {
    x: marginX,
    y,
    size: 9.2,
    font: fontRegular,
    color: rgb(0.2, 0.24, 0.32),
  });

  const secCodeW = fontRegular.widthOfTextAtSize(spec.sectionCode, 9.2);
  page.drawText(spec.sectionCode, {
    x: width - marginX - secCodeW,
    y,
    size: 9.2,
    font: fontRegular,
    color: rgb(0.22, 0.26, 0.34),
  });

  // Section Banner Bar (Light Slate/Blue-Gray Fill)
  y -= 34;
  page.drawRectangle({
    x: marginX,
    y: y - 6,
    width: contentW,
    height: 24,
    color: rgb(0.89, 0.91, 0.94),
  });
  page.drawText(spec.sectionTitle, {
    x: marginX + 8,
    y: y + 1,
    size: 12,
    font: fontBold,
    color: rgb(0.08, 0.11, 0.18),
  });

  // Academic Area Subtitle
  y -= 24;
  page.drawText(spec.subtitle, {
    x: marginX,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.18, 0.22, 0.3),
  });

  // Goal Sub-Banner Bar (e.g. "Goal 5.1 — Reading Comprehension")
  y -= 28;
  page.drawRectangle({
    x: marginX,
    y: y - 5,
    width: contentW,
    height: 22,
    color: rgb(0.91, 0.925, 0.95),
  });
  page.drawText(spec.goalBanner, {
    x: marginX + 8,
    y: y + 1,
    size: 10.5,
    font: fontBold,
    color: rgb(0.08, 0.11, 0.18),
  });

  // Highlighted Badge [5.1] on Left + Annual Goal Paragraph on Right
  y -= 26;
  const badgeBg = isPrevious ? rgb(0.97, 0.89, 0.68) : rgb(0.88, 0.84, 0.98);
  const badgeBorder = isPrevious ? rgb(0.85, 0.68, 0.28) : rgb(0.65, 0.55, 0.92);

  page.drawRectangle({
    x: marginX + 2,
    y: y - 14,
    width: 28,
    height: 20,
    color: badgeBg,
    borderColor: badgeBorder,
    borderWidth: 0.8,
  });
  page.drawText(spec.badgeNumber, {
    x: marginX + 8,
    y: y - 8,
    size: 9.5,
    font: fontBold,
    color: rgb(0.1, 0.12, 0.18),
  });

  // Draw the 3-line Annual Goal paragraph with inline highlight pill around `spec.highlightToken`
  const textX = marginX + 40;
  const line1 = `${spec.annualGoalPrefix}${spec.annualGoalSentenceBefore.slice(0, 68)}`;
  const line2Before = spec.annualGoalSentenceBefore.slice(68);
  const line3 = spec.annualGoalSentenceAfter.trim();

  // Line 1: "Annual Goal: " in bold + rest of line 1
  const prefixW = fontBold.widthOfTextAtSize(spec.annualGoalPrefix, 9.8);
  page.drawText(spec.annualGoalPrefix, {
    x: textX,
    y,
    size: 9.8,
    font: fontBold,
    color: rgb(0.08, 0.1, 0.16),
  });
  page.drawText(line1.slice(spec.annualGoalPrefix.length), {
    x: textX + prefixW,
    y,
    size: 9.8,
    font: fontRegular,
    color: rgb(0.1, 0.13, 0.2),
  });

  // Line 2: text before highlight + highlighted token pill!
  y -= 14.5;
  const line2BeforeW = fontRegular.widthOfTextAtSize(line2Before, 9.8);
  page.drawText(line2Before, {
    x: textX,
    y,
    size: 9.8,
    font: fontRegular,
    color: rgb(0.1, 0.13, 0.2),
  });

  const tokenW = fontBold.widthOfTextAtSize(spec.highlightToken, 9.8);
  const pillX = textX + line2BeforeW - 2;
  page.drawRectangle({
    x: pillX,
    y: y - 3,
    width: tokenW + 8,
    height: 14,
    color: badgeBg,
  });
  page.drawText(spec.highlightToken, {
    x: pillX + 4,
    y,
    size: 9.8,
    font: fontBold,
    color: rgb(0.08, 0.1, 0.16),
  });

  // Line 3: remainder of sentence
  y -= 14.5;
  page.drawText(line3, {
    x: textX,
    y,
    size: 9.8,
    font: fontRegular,
    color: rgb(0.1, 0.13, 0.2),
  });

  // =========================================================================
  // TABLE 1: Objectives / Benchmarks | Criteria | Timeline
  // =========================================================================
  y -= 26;
  const col1W = 245;
  const col2W = 195;
  const col3W = contentW - col1W - col2W;
  const headerH = 22;

  // Table 1 Header
  page.drawRectangle({
    x: marginX,
    y: y - headerH + 6,
    width: col1W,
    height: headerH,
    color: rgb(0.91, 0.925, 0.95),
    borderColor: rgb(0.75, 0.78, 0.84),
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: marginX + col1W,
    y: y - headerH + 6,
    width: col2W,
    height: headerH,
    color: rgb(0.91, 0.925, 0.95),
    borderColor: rgb(0.75, 0.78, 0.84),
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: marginX + col1W + col2W,
    y: y - headerH + 6,
    width: col3W,
    height: headerH,
    color: rgb(0.91, 0.925, 0.95),
    borderColor: rgb(0.75, 0.78, 0.84),
    borderWidth: 0.8,
  });

  page.drawText("Objectives / Benchmarks", {
    x: marginX + 8,
    y: y - 9,
    size: 9.2,
    font: fontBold,
    color: rgb(0.1, 0.13, 0.2),
  });
  page.drawText("Criteria", {
    x: marginX + col1W + 8,
    y: y - 9,
    size: 9.2,
    font: fontBold,
    color: rgb(0.1, 0.13, 0.2),
  });
  page.drawText("Timeline", {
    x: marginX + col1W + col2W + 8,
    y: y - 9,
    size: 9.2,
    font: fontBold,
    color: rgb(0.1, 0.13, 0.2),
  });

  y -= headerH;

  // Table 1 Rows
  for (const obj of spec.objectives) {
    const rowH = 36;
    page.drawRectangle({
      x: marginX,
      y: y - rowH + 6,
      width: col1W,
      height: rowH,
      color: rgb(0.99, 0.99, 0.995),
      borderColor: rgb(0.78, 0.81, 0.86),
      borderWidth: 0.8,
    });
    page.drawRectangle({
      x: marginX + col1W,
      y: y - rowH + 6,
      width: col2W,
      height: rowH,
      color: rgb(0.99, 0.99, 0.995),
      borderColor: rgb(0.78, 0.81, 0.86),
      borderWidth: 0.8,
    });
    page.drawRectangle({
      x: marginX + col1W + col2W,
      y: y - rowH + 6,
      width: col3W,
      height: rowH,
      color: rgb(0.99, 0.99, 0.995),
      borderColor: rgb(0.78, 0.81, 0.86),
      borderWidth: 0.8,
    });

    page.drawText(obj.code, {
      x: marginX + 8,
      y: y - 9,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.13, 0.2),
    });

    const descLines = wrapText(obj.desc, 34);
    descLines.slice(0, 2).forEach((dl, i) => {
      page.drawText(dl, {
        x: marginX + 42,
        y: y - 9 - i * 12,
        size: 8.8,
        font: fontRegular,
        color: rgb(0.14, 0.18, 0.24),
      });
    });

    const critBoldW = fontBold.widthOfTextAtSize(obj.criteriaBold, 8.8);
    page.drawText(obj.criteriaBold, {
      x: marginX + col1W + 8,
      y: y - 9,
      size: 8.8,
      font: fontBold,
      color: rgb(0.1, 0.13, 0.2),
    });
    const critRestLines = wrapText(obj.criteriaRest.trim(), 24);
    if (critRestLines[0]) {
      page.drawText(" " + critRestLines[0], {
        x: marginX + col1W + 8 + critBoldW,
        y: y - 9,
        size: 8.8,
        font: fontRegular,
        color: rgb(0.14, 0.18, 0.24),
      });
    }
    if (critRestLines[1]) {
      page.drawText(critRestLines[1], {
        x: marginX + col1W + 8,
        y: y - 21,
        size: 8.8,
        font: fontRegular,
        color: rgb(0.14, 0.18, 0.24),
      });
    }

    page.drawText(obj.timeline, {
      x: marginX + col1W + col2W + 8,
      y: y - 15,
      size: 8.8,
      font: fontRegular,
      color: rgb(0.14, 0.18, 0.24),
    });

    y -= rowH;
  }

  // =========================================================================
  // TABLE 2: Progress Monitoring
  // =========================================================================
  y -= 14;
  const pmHeaderH = 22;
  page.drawRectangle({
    x: marginX,
    y: y - pmHeaderH + 6,
    width: contentW,
    height: pmHeaderH,
    color: rgb(0.91, 0.925, 0.95),
    borderColor: rgb(0.75, 0.78, 0.84),
    borderWidth: 0.8,
  });
  page.drawText("Progress Monitoring", {
    x: marginX + 8,
    y: y - 9,
    size: 9.5,
    font: fontBold,
    color: rgb(0.1, 0.13, 0.2),
  });
  y -= pmHeaderH;

  const pmLeftW = 310;
  const pmRightW = contentW - pmLeftW;
  const pmRowH = 22;

  // Row 1: Method | Frequency
  page.drawRectangle({
    x: marginX,
    y: y - pmRowH + 6,
    width: pmLeftW,
    height: pmRowH,
    color: rgb(0.99, 0.99, 0.995),
    borderColor: rgb(0.78, 0.81, 0.86),
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: marginX + pmLeftW,
    y: y - pmRowH + 6,
    width: pmRightW,
    height: pmRowH,
    color: rgb(0.99, 0.99, 0.995),
    borderColor: rgb(0.78, 0.81, 0.86),
    borderWidth: 0.8,
  });
  page.drawText("Method:", {
    x: marginX + 8,
    y: y - 9,
    size: 8.8,
    font: fontBold,
    color: rgb(0.1, 0.13, 0.2),
  });
  page.drawText(spec.progressMonitoring.method, {
    x: marginX + 54,
    y: y - 9,
    size: 8.8,
    font: fontRegular,
    color: rgb(0.14, 0.18, 0.24),
  });
  page.drawText("Frequency:", {
    x: marginX + pmLeftW + 8,
    y: y - 9,
    size: 8.8,
    font: fontBold,
    color: rgb(0.1, 0.13, 0.2),
  });
  page.drawText(spec.progressMonitoring.frequency, {
    x: marginX + pmLeftW + 68,
    y: y - 9,
    size: 8.8,
    font: fontRegular,
    color: rgb(0.14, 0.18, 0.24),
  });
  y -= pmRowH;

  // Row 2: Data Collection | Reporting
  page.drawRectangle({
    x: marginX,
    y: y - pmRowH + 6,
    width: pmLeftW,
    height: pmRowH,
    color: rgb(0.99, 0.99, 0.995),
    borderColor: rgb(0.78, 0.81, 0.86),
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: marginX + pmLeftW,
    y: y - pmRowH + 6,
    width: pmRightW,
    height: pmRowH,
    color: rgb(0.99, 0.99, 0.995),
    borderColor: rgb(0.78, 0.81, 0.86),
    borderWidth: 0.8,
  });
  page.drawText("Data Collection:", {
    x: marginX + 8,
    y: y - 9,
    size: 8.8,
    font: fontBold,
    color: rgb(0.1, 0.13, 0.2),
  });
  page.drawText(spec.progressMonitoring.dataCollection, {
    x: marginX + 86,
    y: y - 9,
    size: 8.8,
    font: fontRegular,
    color: rgb(0.14, 0.18, 0.24),
  });
  page.drawText("Reporting:", {
    x: marginX + pmLeftW + 8,
    y: y - 9,
    size: 8.8,
    font: fontBold,
    color: rgb(0.1, 0.13, 0.2),
  });
  page.drawText(spec.progressMonitoring.reporting, {
    x: marginX + pmLeftW + 68,
    y: y - 9,
    size: 8.8,
    font: fontRegular,
    color: rgb(0.14, 0.18, 0.24),
  });
}

export async function getOrBuildVersionPdf(versionId: string): Promise<BuiltIepPdfResult> {
  const cached = pdfCache.get(versionId);
  if (cached) return cached;

  const promise = (async () => {
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    const { totalPages, docTitle, docDate, isPrevious, pages } =
      buildPageSpecsForVersion(versionId);

    for (const spec of pages) {
      const page = pdfDoc.addPage([612, 792]);
      drawPage(
        page,
        spec,
        totalPages,
        docTitle,
        docDate,
        isPrevious,
        fontRegular,
        fontBold,
        fontOblique
      );
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
