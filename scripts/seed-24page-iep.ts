import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { queryCloudflareD1 } from '../server/_core/d1Client';
import * as fs from 'fs';
import * as path from 'path';

async function generate24PageIep() {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const sections = [
    { title: 'COVER SHEET & STUDENT DEMOGRAPHIC PROFILE', subtitle: 'Paulding County School District · Special Education Services', lines: [
      'STUDENT NAME: Brooklyn Smith                  DOB: 05/18/2008       GRADE: 10th Grade',
      'GTID: 9004812736                              CASE ID: WP-2026-0046 GENDER: Female',
      'SCHOOL: Paulding County High School            DISTRICT: Paulding County School District',
      'PARENT/GUARDIAN: Marcus Smith                  PHONE: (404) 555-0192',
      'ADDRESS: 428 Heritage Oak Trail, Dallas, GA 30132',
      'CASE MANAGER: Sarah Jenkins, Ed.S.             PRIMARY ADVOCATE: Byron Honea (Waypoint Advocates)',
      'MEETING DATE: September 15, 2026               INITIATION DATE: September 22, 2026',
      'PRIMARY ELIGIBILITY: Specific Learning Disability (SLD) · Reading & Written Expression',
      'SECONDARY ELIGIBILITY: Other Health Impairment (OHI) · ADHD Combined Type',
      'ANNUAL REVIEW DUE: September 14, 2027          THREE-YEAR REEVALUATION DUE: March 10, 2028',
      '',
      'IEP MEETING PURPOSE: Annual Review & Program Revision',
      'PARTICIPATING LEA OFFICIALS: Sarah Jenkins (LEA Rep/Special Educator), Marcus Smith (Parent),',
      'David Miller (General Education ELA), Dr. Aris Thorne (School Psychologist),',
      'Byron Honea (Lead Special Education Advocate).'
    ]},
    { title: 'TEAM MEMBERSHIP & PROCEDURAL SAFEGUARDS RECEIPT', subtitle: 'Documented Signatures & Excusal Attestations', lines: [
      'TEAM ATTENDANCE VERIFICATION:',
      '1. Marcus Smith — Parent / Educational Decision Maker [Signed: In-Person Attendance]',
      '2. Byron Honea — Lead Special Education Advocate, Waypoint Advocates [Signed: Present]',
      '3. Sarah Jenkins, Ed.S. — Special Education Teacher / Case Manager [Signed]',
      '4. David Miller, M.Ed. — General Education Teacher (English Language Arts) [Signed]',
      '5. Dr. Aris Thorne — District Representative / School Psychologist [Signed]',
      '6. Clara Vance, MS, CCC-SLP — Speech-Language Pathologist [Signed]',
      '',
      'PARENTAL NOTICES & RIGHTS ACKNOWLEDGMENT:',
      '• Parent received written notice of meeting on September 1, 2026 (14 days advance notice).',
      '• Georgia Department of Education Special Education Rights (Parent Rights) Booklet provided in parent native language (English).',
      '• Excusal of Team Members: No required IEP team members were excused from this proceeding.'
    ]},
    { title: 'PRESENT LEVELS OF ACADEMIC ACHIEVEMENT (PLAAFP) — READING', subtitle: 'Comprehensive Performance Metrics & Standardized Assessments', lines: [
      'AREA: Reading Comprehension, Decoding, and Informational Text Analysis',
      'BASELINE DATA & CURRENT LEVEL OF PERFORMANCE:',
      '• Standardized Assessment (WJ-IV ACH): Passage Comprehension Standard Score: 81 (Low Average, 10th percentile).',
      '• Oral Reading Fluency: 108 WPM on 10th-grade instructional prose with 88% accuracy (Goal: 135+ WPM at 96% accuracy).',
      '• Lexile Framework Measurement: 780L (Grade-level expectation: 1050L - 1335L).',
      '',
      'IMPACT OF DISABILITY ON INVOLVEMENT IN GENERAL CURRICULUM:',
      'Due to deficits in orthographic processing and phonological working memory, Brooklyn experiences fatigue when reading complex, multisyllabic informational texts. She requires text-to-speech assistive technology and explicit guided annotation scaffolds to extract central themes and authorial intent in grade-level English classes.'
    ]},
    { title: 'PRESENT LEVELS OF ACADEMIC ACHIEVEMENT (PLAAFP) — MATHEMATICS', subtitle: 'Quantitative Reasoning, Algebraic Concepts, and Problem Solving', lines: [
      'AREA: Mathematical Reasoning & Multi-Step Word Problems',
      'BASELINE DATA & CURRENT LEVEL OF PERFORMANCE:',
      '• Standardized Assessment (WJ-IV ACH): Math Calculation: Standard Score 94 (Average, 34th percentile).',
      '• Applied Problems Subtest: Standard Score 86 (Below Average, 18th percentile).',
      '• Classroom Work Samples: Accurately solves linear equations when presented symbolically; demonstrates difficulty deconstructing narrative word problems containing extraneous context.',
      '',
      'IMPACT OF DISABILITY ON INVOLVEMENT IN GENERAL CURRICULUM:',
      'Brooklyn understands fundamental algebraic manipulation but struggles to translate verbal descriptions into algebraic expressions without visual organizers and formula reference charts. Processing speed limitations hinder her ability to complete exams within standard 50-minute periods.'
    ]},
    { title: 'PRESENT LEVELS OF ACADEMIC ACHIEVEMENT (PLAAFP) — WRITTEN EXPRESSION', subtitle: 'Syntax, Structural Cohesion, and Mechanics', lines: [
      'AREA: Written Expression, Thesis Development, and Mechanics',
      'BASELINE DATA & CURRENT LEVEL OF PERFORMANCE:',
      '• Standardized Assessment (WIAT-IV): Essay Composition Standard Score: 83 (Below Average).',
      '• Sentence Composition: Standard Score 89 (Low Average).',
      '• Independent Writing Baseline: Produces 1-2 paragraph responses with minimal transitional phrases. Struggles with multi-step proofreading for comma splices, homophones, and pronoun agreement.',
      '',
      'IMPACT OF DISABILITY ON INVOLVEMENT IN GENERAL CURRICULUM:',
      'Disorganization and working memory vulnerabilities impede Brooklyn from planning, drafting, and revising five-paragraph essays concurrently. She benefits substantially from speech-to-text dictation tools and graphic essay outline templates prior to drafting.'
    ]},
    { title: 'PARENT CONCERNS & STUDENT STRENGTHS PROFFER', subtitle: 'Advocate & Parent Submissions for 2026-2027 Program', lines: [
      'STUDENT STRENGTHS & MOTIVATORS:',
      '• Brooklyn is highly motivated, self-aware, and possesses strong interpersonal collaboration skills.',
      '• Displays exceptional artistic ability, creativity in multimedia projects, and strong auditory retention.',
      '• Consistently seeks clarification when she feels supported in structured small-group environments.',
      '',
      'PARENT & ADVOCATE SUBMITTED CONCERNS:',
      '1. Marcus Smith (Parent) expressed grave concern regarding inconsistent delivery of co-taught ELA accommodations during Q1, noting Brooklyn reported taking tests without extended time.',
      '2. Byron Honea (Lead Advocate) highlighted that past service delivery logs showed 12 missed cotaught sessions due to substitute availability, requesting immediate compensatory scheduling.',
      '3. Family requests mandatory fidelity tracking sheets signed weekly by the special education case manager.'
    ]},
    { title: 'SPECIAL FACTORS DETERMINATIONS (IDEA 34 C.F.R. § 300.324)', subtitle: 'Statutory Considerations & Assistive Technology Matrix', lines: [
      'CONSIDERATION OF SPECIAL FACTORS:',
      '• Behavior Impeding Learning: No. Brooklyn demonstrates compliant, respectful classroom behaviors.',
      '• Limited English Proficiency: No. Primary language is English.',
      '• Blind / Visually Impaired: No. Standard vision corrected with eyeglasses.',
      '• Communication Needs: Yes. Benefits from speech-language therapy consultation for verbal reasoning.',
      '• Deaf / Hard of Hearing: No. Hearing within normal developmental thresholds.',
      '',
      'ASSISTIVE TECHNOLOGY CONSIDERATION (34 C.F.R. § 300.105):',
      '• AT Required: Yes. Student requires Snap&Read or comparable text-to-speech extension, Co:Writer dictation software, and digital audio versions of class textbooks (Bookshare / Learning Ally).',
      '• Device Access: Dedicated district Chromebook with offline accessibility profiles enabled.'
    ]},
    { title: 'ANNUAL MEASURABLE GOAL #1 — READING COMPREHENSION', subtitle: 'Target Competency: Multisyllabic Analysis & Central Idea Synthesis', lines: [
      'GOAL STATEMENT: By September 2027, given a grade-level informational or literary text (950L-1150L) and assistive text-to-speech tools, Brooklyn will independently identify the central theme, cite three supporting textual citations, and formulate an objective 150-word synthesis with 80% accuracy across 4 of 5 consecutive probes.',
      '',
      'SHORT-TERM OBJECTIVE 1.1: Given guided graphic organizers, Brooklyn will extract key supporting details and identify author bias in informational articles with 80% accuracy across 3 trials.',
      'SHORT-TERM OBJECTIVE 1.2: Given digital text annotation tools, Brooklyn will annotate key vocabulary and determine meanings of figurative language with 85% accuracy across 4 trials.',
      'SHORT-TERM OBJECTIVE 1.3: Given a rubric, Brooklyn will write a cohesive objective summary without personal opinion scoring at least 16/20 on the district writing rubric.',
      '',
      'EVALUATION METHOD: Weekly curriculum-based measurements, student work portfolio, and quarterly reading inventories.',
      'RESPONSIBLE PERSONNEL: Special Education Co-Teacher, ELA General Educator.'
    ]},
    { title: 'ANNUAL MEASURABLE GOAL #2 — WRITTEN COMPOSITION', subtitle: 'Target Competency: Multi-Paragraph Cohesion & Thesis Elaboration', lines: [
      'GOAL STATEMENT: By September 2027, given a structured multi-paragraph prompt and speech-to-text software, Brooklyn will draft a four-to-five paragraph expository essay featuring a distinct thesis, cohesive body paragraphs with contextual evidence, and a conclusion, scoring 80% or better on the Georgia 10th Grade Writing Rubric on 3 consecutive assessments.',
      '',
      'SHORT-TERM OBJECTIVE 2.1: Brooklyn will utilize a digital concept map to formulate a thesis and outline three distinct supporting arguments prior to drafting with 90% independence.',
      'SHORT-TERM OBJECTIVE 2.2: Brooklyn will incorporate at least two complex sentence structures with coordinating/subordinating conjunctions per paragraph with 80% accuracy.',
      'SHORT-TERM OBJECTIVE 2.3: Brooklyn will execute a multi-step proofreading checklist for grammar and mechanics, reducing grammatical errors to fewer than 3 per page.',
      '',
      'EVALUATION METHOD: Bi-weekly written work samples, rubric scoring rubrics, and case manager portfolio reviews.'
    ]},
    { title: 'ANNUAL MEASURABLE GOAL #3 — MATHEMATICAL REASONING', subtitle: 'Target Competency: Algebraic Multi-Step Problem Solving & Modeling', lines: [
      'GOAL STATEMENT: By September 2027, given real-world narrative algebraic word problems, Brooklyn will correctly define variables, construct corresponding linear equations, and solve for unknowns using reference formula sheets with 75% accuracy across 4 of 5 bi-weekly assessments.',
      '',
      'SHORT-TERM OBJECTIVE 3.1: Brooklyn will highlight key quantitative values and eliminate irrelevant narrative distractors with 85% accuracy across 4 trials.',
      'SHORT-TERM OBJECTIVE 3.2: Brooklyn will correctly apply coordinate geometric formulas using step-by-step cue cards with 80% accuracy across 3 trials.',
      '',
      'EVALUATION METHOD: Chapter exams, bi-weekly quiz probes, and homework review sheets.',
      'RESPONSIBLE PERSONNEL: High School Mathematics Co-Teacher, Special Education Case Manager.'
    ]},
    { title: 'ANNUAL MEASURABLE GOAL #4 — EXECUTIVE FUNCTIONING & ADVOCACY', subtitle: 'Target Competency: Self-Advocacy, Accommodation Usage, & Deadline Tracking', lines: [
      'GOAL STATEMENT: By September 2027, Brooklyn will independently access her digital planner, confirm submission of all weekly assignments, and advocate for her mandated testing accommodations (requesting extended time or quiet setting) in 4 out of 5 academic opportunities as measured by weekly case manager checklists.',
      '',
      'SHORT-TERM OBJECTIVE 4.1: Brooklyn will maintain an updated digital assignment tracker with 90% accuracy.',
      'SHORT-TERM OBJECTIVE 4.2: Brooklyn will notify teachers at least 24 hours prior to exams to verify that extended time and separate testing arrangements are confirmed with 80% fidelity.',
      '',
      'EVALUATION METHOD: Weekly advocate check-ins, case manager checklists, parent progress updates.'
    ]},
    { title: 'PROGRESS MONITORING & REPORTING SCHEDULE', subtitle: 'Quarterly Metrics & Formal Reporting Intervals', lines: [
      'REPORTING FREQUENCY: Progress towards all annual IEP goals will be formally measured and reported to parents concurrently with district quarterly report cards (every 9 weeks).',
      '',
      'REPORTING PERIODS FOR 2026-2027 SCHOOL YEAR:',
      '• Quarter 1 Progress Report: October 23, 2026',
      '• Quarter 2 (Semester 1) Report: January 8, 2027',
      '• Quarter 3 Progress Report: March 19, 2027',
      '• Quarter 4 (Annual Review) Report: May 28, 2027',
      '',
      'DATA COLLECTION PROTOCOLS: Case manager will record standardized probe scores into the Infinite Campus Special Education module bi-weekly. Hard copies of work samples will be maintained in Brooklyn\'s permanent special education docket file.'
    ]},
    { title: 'SPECIALIZED INSTRUCTION SERVICE MATRIX — ELA CO-TAUGHT', subtitle: 'Direct Special Education Services Delivery Schedule', lines: [
      'SERVICE: Co-Taught English Language Arts 10',
      'SETTING: General Education Classroom (Inclusion Setting)',
      'FREQUENCY & DURATION: 5 days per week, 55 minutes per session (275 minutes weekly)',
      'INITIATION DATE: September 22, 2026            ANTICIPATED DURATION: May 26, 2027',
      'PROVIDER: Special Education Certified Teacher & General Education English Teacher',
      '',
      'SERVICE DELIVERY MODEL: Both general education content specialist and certified special educator provide parallel instruction, alternative grouping, and immediate accommodation fidelity in accordance with GaDOE State Board Rule 160-4-7-.07.'
    ]},
    { title: 'SPECIALIZED INSTRUCTION SERVICE MATRIX — ALGEBRA I CO-TAUGHT', subtitle: 'Direct Special Education Services Delivery Schedule', lines: [
      'SERVICE: Co-Taught Coordinate Algebra',
      'SETTING: General Education Classroom (Inclusion Setting)',
      'FREQUENCY & DURATION: 5 days per week, 55 minutes per session (275 minutes weekly)',
      'INITIATION DATE: September 22, 2026            ANTICIPATED DURATION: May 26, 2027',
      'PROVIDER: Special Education Certified Teacher & Mathematics Teacher',
      '',
      'SERVICE DELIVERY MODEL: Station teaching, guided practice, and concrete modeling for multi-step algebraic formulations. Certified special educator provides specialized scaffolding for mathematical vocabulary.'
    ]},
    { title: 'RELATED SERVICES MATRIX — SPEECH-LANGUAGE THERAPY', subtitle: 'Direct and Consultative Related Services Delivery', lines: [
      'SERVICE: Speech-Language Pathology (Consultative & Integrated Sessions)',
      'SETTING: Integrated Classroom / Therapy Room as needed',
      'FREQUENCY & DURATION: 2 sessions monthly, 30 minutes per session (60 minutes monthly)',
      'INITIATION DATE: September 22, 2026            ANTICIPATED DURATION: May 26, 2027',
      'PROVIDER: Licensed Speech-Language Pathologist (CCC-SLP)',
      '',
      'FOCUS AREAS: Receptive language processing, semantic mapping for academic literature, and verbal formulation during class presentations.'
    ]},
    { title: 'SUPPLEMENTARY AIDS & SERVICES (INCLUSION SUPPORTS)', subtitle: 'Program Modifications Across All Academic Settings', lines: [
      'MANDATED AIDS & SERVICES:',
      '1. Peer Tutoring / Structured Study Partner: Available during group problem-solving.',
      '2. Teacher Lecture Outlines & Cloze Notes: Provided prior to classroom lectures.',
      '3. Visual Timers & Time Warning Signals: Provided 10-minute and 5-minute notices before transitions.',
      '4. Calculator Usage: Access to TI-84 Plus graphing calculator during all instructional activities and tests.',
      '5. Highlighting Key Directions: Critical test instructions highlighted in yellow ink by instructor.',
      '6. Reduced Distraction Testing: Individual cubicle or separate classroom with fewer than 10 students.'
    ]},
    { title: 'CLASSROOM ACCOMMODATIONS & MODIFICATIONS', subtitle: 'Daily Instructional and Testing Accommodations', lines: [
      'ACCOMMODATION PROTOCOL:',
      '• Extended Time: 1.5x standard time on all written assignments, classroom quizzes, and chapter examinations.',
      '• Chunked Tests: Multi-page examinations administered across two consecutive class periods to alleviate cognitive fatigue.',
      '• Oral Reading / Audio Delivery: Test questions and reading passages read aloud via text-to-speech or instructor for non-reading assessments.',
      '• Frequent Breaks: 3-minute sensory/movement break permitted after 25 minutes of continuous cognitive output.',
      '• Spelling & Grammar Exemption: Spelling and mechanical errors not penalized on initial drafts of content-based assessments (History/Science).'
    ]},
    { title: 'STATE & DISTRICT TESTING ACCOMMODATIONS', subtitle: 'Georgia Milestones End-of-Course (EOC) Assessment Accommodations', lines: [
      'STANDARDIZED TEST: Georgia Milestones EOC (American Literature, Algebra I, Biology, US History)',
      'APPROVED STATE ACCOMMODATIONS (GaDOE Assessment Handbook):',
      '• Standard Accommodation 1: Extended Time (1.5x allocated testing block).',
      '• Standard Accommodation 2: Small Group Administration (no more than 8 students per proctor).',
      '• Standard Accommodation 3: Text-to-Speech (Audio presentation for ELA Section 2 & 3, Math, Science, and Social Studies).',
      '• Standard Accommodation 4: Frequent Supervised Breaks (5 minutes per section).',
      '• Conditional Accommodations: None requested or approved for this cycle.'
    ]},
    { title: 'LEAST RESTRICTIVE ENVIRONMENT (LRE) DETERMINATION', subtitle: 'Statutory Justification for Educational Placement', lines: [
      'EDUCATIONAL ENVIRONMENT CALCULATION:',
      '• Total Instructional Minutes per Week: 1,650 minutes',
      '• Minutes Inside General Education Setting: 1,650 minutes (100% Inclusion with Co-Teaching)',
      '• Percentage in General Education: 100% of the school day',
      '',
      'LRE DETERMINATION JUSTIFICATION (34 C.F.R. § 300.114):',
      'The IEP team considered more restrictive settings (Resource pull-out, Self-contained classes) and determined that Brooklyn\'s academic, social, and emotional needs are fully met in the general education classroom with co-taught special education support and supplementary aids. Full inclusion provides Brooklyn access to rich peer linguistic models and rigorous curriculum.'
    ]},
    { title: 'EXTENDED SCHOOL YEAR (ESY) DETERMINATION', subtitle: 'Summer Services Consideration (34 C.F.R. § 300.106)', lines: [
      'ESY CRITERIA EVALUATION:',
      '1. Regression / Recoupment: Historical progress data demonstrates that Brooklyn regains reading fluency skills within 3 weeks following holiday breaks, well within standard recoupment periods.',
      '2. Critical Learning Stages: Student is not currently at a critical stage of developing an emerging skill that would be irreversibly lost without summer programming.',
      '3. Severity of Disability: Does not warrant continuous 12-month programming at this time.',
      '',
      'TEAM DETERMINATION: Extended School Year services are NOT recommended for Summer 2027. Progress will be reviewed again in Spring 2027.'
    ]},
    { title: 'SECONDARY TRANSITION PLAN — POST-SECONDARY GOALS', subtitle: 'High School Graduation & Career Preparation (GaDOE Rule 160-4-7-.06)', lines: [
      'POST-SECONDARY EDUCATION / TRAINING GOAL: After graduation from high school, Brooklyn will enroll in a four-year university program (such as Kennesaw State University or Georgia State University) majoring in Graphic Design or Visual Communications.',
      '',
      'POST-SECONDARY EMPLOYMENT GOAL: Upon completion of post-secondary training, Brooklyn will obtain competitive integrated employment as a digital graphic artist, UI/UX designer, or creative director in a marketing firm.',
      '',
      'POST-SECONDARY INDEPENDENT LIVING GOAL: Brooklyn will live independently in an apartment or campus dormitory with roommates, managing personal finances and transportation.'
    ]},
    { title: 'TRANSITION SERVICES & COURSE OF STUDY', subtitle: 'Multi-Year Academic Pathway & Community Integration', lines: [
      'PROJECTED GRADUATION DATE: May 2028 with High School Diploma',
      'PLANNED COURSE OF STUDY:',
      '• Grade 9 (Completed): 9th Grade Lit, Algebra: Concepts & Connections, Environmental Science, Civics, Visual Arts I.',
      '• Grade 10 (Current): 10th Grade Lit (Co-Taught), Geometry (Co-Taught), Biology, World History, Graphic Design I.',
      '• Grade 11 (Projected): American Lit, Advanced Algebra, Chemistry, US History, Graphic Design II.',
      '• Grade 12 (Projected): Advanced Composition, Math Modeling, Economics, Graphic Design Practicum / Work-Based Learning.',
      '',
      'AGENCY INVOLVEMENT: Georgia Vocational Rehabilitation Agency (GVRA) transition referral initiated.'
    ]},
    { title: 'PRIOR WRITTEN NOTICE (PWN) — SUMMARY OF DECISIONS', subtitle: 'Notice of Proposed or Refused Agency Actions (34 C.F.R. § 300.503)', lines: [
      'ACTIONS PROPOSED BY LEA:',
      '1. Implement revised annual IEP with co-taught ELA and Algebra specialized instruction.',
      '2. Provide assistive technology software (Snap&Read, Co:Writer) on 1:1 district device.',
      '3. Retain 100% General Education inclusion placement with co-teaching supports.',
      '',
      'ACTIONS REFUSED BY LEA:',
      '1. LEA declined parent request for 1:1 dedicated paraprofessional, as data confirms Brooklyn functions independently in inclusion settings with peer supports.',
      '2. LEA declined compensatory tutoring during this meeting, deferring to administrative dispute process.',
      '',
      'BASIS FOR ACTIONS: WJ-IV psychoeducational evaluation, teacher work samples, Lexile progress monitoring, and parent meeting contributions.'
    ]},
    { title: 'CONSENT FOR PLACEMENT & DOCUMENT CERTIFICATION', subtitle: 'Binding Educational Agreement & Procedural Signatures', lines: [
      'PARENTAL CONSENT FOR PROPOSED PROGRAM:',
      'I have been fully informed of my rights under IDEA and the Georgia Special Education Rules.',
      'I understand the contents of this Individualized Education Program (IEP).',
      '',
      '[X] I CONSENT to the implementation of the services and placement described in this IEP.',
      '[ ] I DO NOT CONSENT to the implementation of this IEP.',
      '',
      'PARENT SIGNATURE: Marcus Smith                  DATE: September 15, 2026',
      'CASE MANAGER SIGNATURE: Sarah Jenkins, Ed.S.     DATE: September 15, 2026',
      'LEAD ADVOCATE SIGNATURE: Byron Honea             DATE: September 15, 2026',
      '',
      'WAYPOINT ADVOCATES VERIFICATION STAMP: Certified true and complete copy of the Operative IEP on record for Brooklyn Smith with Paulding County School District. Retained in Waypoint Document Vault under Case #WP-2026-0046.'
    ]}
  ];

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const pageNum = i + 1;
    const page = pdfDoc.addPage([612, 792]); // Standard US Letter

    // Navy header border
    page.drawRectangle({
      x: 36,
      y: 740,
      width: 540,
      height: 28,
      color: rgb(0.04, 0.12, 0.22),
    });

    page.drawText('PAULDING COUNTY SCHOOL DISTRICT · SPECIAL EDUCATION DEPARTMENT', {
      x: 46,
      y: 749,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`PAGE ${pageNum} OF 24`, {
      x: 500,
      y: 749,
      size: 8,
      font: fontBold,
      color: rgb(0.85, 0.75, 0.45),
    });

    // Section title
    page.drawText(sec.title, {
      x: 36,
      y: 712,
      size: 13,
      font: fontBold,
      color: rgb(0.05, 0.15, 0.3),
    });

    page.drawText(sec.subtitle, {
      x: 36,
      y: 698,
      size: 8.5,
      font: fontOblique,
      color: rgb(0.4, 0.45, 0.5),
    });

    // Decorative line
    page.drawLine({
      start: { x: 36, y: 690 },
      end: { x: 576, y: 690 },
      thickness: 1,
      color: rgb(0.8, 0.7, 0.4),
    });

    // Body lines
    let yPos = 665;
    for (const line of sec.lines) {
      if (line === '') {
        yPos -= 10;
        continue;
      }
      const isHeader = line.endsWith(':') || line.startsWith('STUDENT NAME') || line.startsWith('GOAL STATEMENT');
      page.drawText(line, {
        x: 40,
        y: yPos,
        size: isHeader ? 8.5 : 8,
        font: isHeader ? fontBold : fontRegular,
        color: isHeader ? rgb(0.08, 0.12, 0.2) : rgb(0.2, 0.2, 0.25),
      });
      yPos -= 14;
    }

    // Footer
    page.drawLine({
      start: { x: 36, y: 45 },
      end: { x: 576, y: 45 },
      thickness: 0.8,
      color: rgb(0.85, 0.85, 0.85),
    });

    page.drawText('CONFIDENTIAL SPECIAL EDUCATION RECORD · FERPA / IDEA PROTECTED', {
      x: 36,
      y: 32,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(`Student: Brooklyn Smith · WP-2026-0046 · Page ${pageNum} of 24`, {
      x: 370,
      y: 32,
      size: 7,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.4),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const base64Data = Buffer.from(pdfBytes).toString('base64');
  console.log(`Generated authentic 24-page Operative IEP! Bytes: ${pdfBytes.byteLength}`);

  // Save to client/public/forms/brooklyn-smith-current-iep.pdf
  const publicDir = path.resolve('client/public/forms');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  const publicPath = path.resolve('client/public/forms/brooklyn-smith-current-iep.pdf');
  fs.writeFileSync(publicPath, Buffer.from(pdfBytes));
  console.log(`Saved public asset copy to ${publicPath}`);

  // Insert into Cloudflare D1 file_blobs
  const key1 = 'iep-documents/1792527991296_4823fd75_current_IEP_ac7e4441.pdf';
  const key2 = 'sample-eval-report.pdf';
  const key3 = 'current-iep.pdf';

  await queryCloudflareD1(
    'INSERT INTO file_blobs (key, mime_type, base64_data) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET base64_data = excluded.base64_data',
    [key1, 'application/pdf', base64Data]
  );
  await queryCloudflareD1(
    'INSERT INTO file_blobs (key, mime_type, base64_data) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET base64_data = excluded.base64_data',
    [key2, 'application/pdf', base64Data]
  );
  await queryCloudflareD1(
    'INSERT INTO file_blobs (key, mime_type, base64_data) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET base64_data = excluded.base64_data',
    [key3, 'application/pdf', base64Data]
  );

  console.log('Successfully saved 24-page IEP into Cloudflare D1 file_blobs table for all 3 keys!');
}

generate24PageIep().catch(console.error);
