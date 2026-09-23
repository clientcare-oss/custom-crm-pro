import { describe, it, expect } from "vitest";
import { parseAdvocateReadyDocument } from "./services/advocateReadyParser";

const sample25TargetDoc = `
⚡ MEETING QUICK LIST

📋 PARENT CONCERNS
LABEL: Communication Log Clarity
ASK: "We're requesting a daily 2-minute digital communication note regarding transitions and emotional regulation."
EXPAND: TARGET-001

LABEL: Sensory Break Transparency
ASK: "We are requesting scheduled sensory breaks be proactively offered rather than contingent on distress behaviors."
EXPAND: TARGET-002

📚 PRESENT LEVELS / ACADEMICS
LABEL: Writing Baseline Measurement
ASK: "We're requesting an objective baseline for independent writing output measured in words per minute."
EXPAND: TARGET-003

LABEL: Math Multi-Step Visual Scaffolding
ASK: "We're requesting step-by-step visual checklists for multi-digit mathematical computations."
EXPAND: TARGET-004

LABEL: Reading Comprehension Graphic Organizers
ASK: "We are requesting story-mapping graphic organizers prior to independent reading comprehension tasks."
EXPAND: TARGET-005

⚙ ACCOMMODATIONS / SUPPORTS
LABEL: Noise Support
ASK: "We're requesting access to noise-canceling headphones during assemblies and noisy hallway transitions."
EXPAND: TARGET-006

LABEL: Help Signal
ASK: "We're requesting one subtle, reliable non-verbal help signal Jeremiah can use without drawing peer attention."
EXPAND: TARGET-007

LABEL: Visual Schedule & Warning Timer
ASK: "We are requesting a 5-minute visual countdown timer before class transitions."
EXPAND: TARGET-008

LABEL: Preferential Seating Near Instruction
ASK: "We're requesting seating in the front third of the room away from HVAC noise and high-traffic doors."
EXPAND: TARGET-009

LABEL: Reduced Pencil-and-Paper Fatigue
ASK: "We're requesting speech-to-text accessibility tools for assignments requiring more than two written paragraphs."
EXPAND: TARGET-010

LABEL: Movement Cushion / Flexible Seating
ASK: "We are requesting access to a sensory wobble stool or movement cushion during direct instruction."
EXPAND: TARGET-011

🎯 ANNUAL GOALS
LABEL: Self-Advocacy & Break Request
ASK: "We are requesting an annual goal for independently requesting a 3-minute regulation break in 4 out of 5 opportunities."
EXPAND: TARGET-012

LABEL: Paragraph Formulation with Scaffolding
ASK: "We're requesting a written expression goal targeting 4-sentence structured paragraphs with graphic organizers."
EXPAND: TARGET-013

LABEL: Multi-Step Math Problem Completion
ASK: "We're requesting a math reasoning goal for completing 3-step word problems using visual aids with 80% accuracy."
EXPAND: TARGET-014

LABEL: Emotional Self-Identification Scale
ASK: "We are requesting a social-emotional goal using the 5-point regulation scale to identify dysregulation stages."
EXPAND: TARGET-015

👥 RELATED SERVICES / AAC
LABEL: Speech-Language Direct Therapy
ASK: "We are requesting 60 minutes weekly of direct individual speech-language therapy for pragmatic communication."
EXPAND: TARGET-016

LABEL: Occupational Therapy Sensory Modulation
ASK: "We're requesting 45 minutes weekly of direct OT focusing on fine-motor endurance and bilateral coordination."
EXPAND: TARGET-017

LABEL: AAC Device Staff Training & Modeling
ASK: "We are requesting 30 minutes monthly of indirect assistive technology consultation for classroom staff."
EXPAND: TARGET-018

🏫 PLACEMENT / LRE
LABEL: General Education Co-Taught Setting
ASK: "We're requesting general education placement with co-teaching support for 80% or more of the school day."
EXPAND: TARGET-019

LABEL: Structured Resource Room Support
ASK: "We are requesting 45 minutes daily of targeted pull-out instruction for written expression in the resource room."
EXPAND: TARGET-020

LABEL: Cafeteria & Assembly Support Aide
ASK: "We're requesting paraprofessional proximity support during unstructured cafeteria and large-group gatherings."
EXPAND: TARGET-021

🚌 ESY & TRANSPORTATION
LABEL: Extended School Year (ESY) Determination
ASK: "We are requesting ESY services with structured data collection on regression across school breaks."
EXPAND: TARGET-022

LABEL: Climate-Controlled Sensory Bus Transportation
ASK: "We're requesting specialized transportation with designated front seating and air conditioning."
EXPAND: TARGET-023

LABEL: Bus Driver Sensory Awareness Protocol
ASK: "We are requesting that bus drivers receive Jeremiah's positive reinforcement support profile."
EXPAND: TARGET-024

LABEL: Emergency Evacuation IEP Accommodation
ASK: "We're requesting a dedicated staff buddy identified in the IEP for fire alarms and emergency evacuations."
EXPAND: TARGET-025

==================================================
DETAILED TARGETS
==================================================

TARGET ID: TARGET-001
TARGET LABEL: Communication Log Clarity
IEP SECTION: Parent Concerns
ADVOCATE SAY THIS: "We're requesting a daily 2-minute digital communication note regarding transitions and emotional regulation."
PUT IT HERE: Parent Concerns / Supplementary Communication Aids
POSSIBLE IEP WORDING: "School staff will maintain a daily 2-minute communication log via digital portal to document transition successes and regulation levels."
WHY: Ensures consistency between home and school strategies and prevents behavioral escalations.
EVIDENCE: Parent logs showing sudden behavioral changes stemming from undisclosed school incidents.
IF TEAM DISAGREES: "What objective communication mechanism is the team proposing to keep parents informed of daily regulation trends? If refused, please note in PWN."
SOURCE: Parent Intake & Behavioral Records
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-002
TARGET LABEL: Sensory Break Transparency
IEP SECTION: Parent Concerns
ADVOCATE SAY THIS: "We are requesting scheduled sensory breaks be proactively offered rather than contingent on distress behaviors."
PUT IT HERE: Classroom Accommodations & Behavior Support Plan
POSSIBLE IEP WORDING: "Student will be provided with scheduled 3-minute sensory movement breaks every 45 minutes."
WHY: Proactive regulation prevents distress behaviors and protects instructional stamina.
EVIDENCE: OT evaluation indicating sensory modulation fatigue after 40 minutes of seated tasks.
IF TEAM DISAGREES: "Please provide the educational justification for withholding proactive regulation breaks until the student is already in crisis."
SOURCE: OT Comprehensive Evaluation
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-003
TARGET LABEL: Writing Baseline Measurement
IEP SECTION: Present Levels / Academics
ADVOCATE SAY THIS: "We're requesting an objective baseline for independent writing output measured in words per minute."
PUT IT HERE: Present Levels of Academic Achievement and Functional Performance (PLAAFP) - Written Expression
POSSIBLE IEP WORDING: "Baseline: Jeremiah currently produces 4 words per minute of independent legible text before fatigue occurs."
WHY: A measurable baseline is required to track writing progress under IDEA.
EVIDENCE: Work samples demonstrating severe drop-off after 2 sentences.
IF TEAM DISAGREES: "Without a baseline metric, how will the IEP team measure whether writing interventions are providing meaningful educational benefit?"
SOURCE: Classroom Work Sample Review
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-004
TARGET LABEL: Math Multi-Step Visual Scaffolding
IEP SECTION: Present Levels / Academics
ADVOCATE SAY THIS: "We're requesting step-by-step visual checklists for multi-digit mathematical computations."
PUT IT HERE: Present Levels / Accommodations
POSSIBLE IEP WORDING: "Student will have access to step-by-step calculation reference sheets during all math assignments and assessments."
WHY: Reduces working memory load and allows focus on mathematical concept mastery.
EVIDENCE: Psychological evaluation showing 15th percentile working memory score alongside average spatial reasoning.
IF TEAM DISAGREES: "Please document the team's data supporting why memory scaffolding is being declined."
SOURCE: Psychoeducational Evaluation
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-005
TARGET LABEL: Reading Comprehension Graphic Organizers
IEP SECTION: Present Levels / Academics
ADVOCATE SAY THIS: "We are requesting story-mapping graphic organizers prior to independent reading comprehension tasks."
PUT IT HERE: Accommodations & Academic Support
POSSIBLE IEP WORDING: "Visual story-map graphic organizers provided for all informational and literary reading passages."
WHY: Organizes receptive language and strengthens narrative recall.
EVIDENCE: Speech-language evaluation noting receptive language deficits in unstructured paragraph recall.
IF TEAM DISAGREES: "Document in PWN why standard graphic organizers cannot be codified in the IEP."
SOURCE: Speech-Language Pathologist Assessment
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-006
TARGET LABEL: Noise Support
IEP SECTION: Accommodations / Supports
ADVOCATE SAY THIS: "We're requesting access to noise-canceling headphones during assemblies and noisy hallway transitions."
PUT IT HERE: Section 8: Classroom & Environmental Accommodations
POSSIBLE IEP WORDING: "Student will be permitted to wear personal noise-canceling headphones during assemblies, cafeteria, gym, and class transitions upon student or teacher identification of auditory overload."
WHY: Auditory sensitivity triggers fight-or-flight panic responses, disrupting classroom presence.
EVIDENCE: Audiological sensory assessment noting hyperacusis and auditory sensory sensitivity.
IF TEAM DISAGREES: "What evidence shows Jeremiah does not experience auditory fatigue during loud cafeteria transitions? If refused, please provide Prior Written Notice."
SOURCE: Audiological & OT Sensory Profile
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-007
TARGET LABEL: Help Signal
IEP SECTION: Accommodations / Supports
ADVOCATE SAY THIS: "We're requesting one subtle, reliable non-verbal help signal Jeremiah can use without drawing peer attention."
PUT IT HERE: Section 8: Accommodations / Social-Emotional Supports
POSSIBLE IEP WORDING: "Student will utilize a discrete two-sided visual card (green/yellow) or agreed hand signal on desk to request teacher assistance without verbal broadcast."
WHY: Anxiety inhibits verbal requests for help in front of peers, leading to task avoidance.
EVIDENCE: Teacher observations of shutdown behaviors when questions are asked publicly.
IF TEAM DISAGREES: "Please explain how Jeremiah is expected to request support when verbalization is blocked by anxiety."
SOURCE: Behavioral Observation Notes
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-008
TARGET LABEL: Visual Schedule & Warning Timer
IEP SECTION: Accommodations / Supports
ADVOCATE SAY THIS: "We are requesting a 5-minute visual countdown timer before class transitions."
PUT IT HERE: Accommodations / Instructional Adaptations
POSSIBLE IEP WORDING: "Classroom staff will provide a 5-minute and 2-minute visual/verbal transition warning with individual visual schedule."
WHY: Transition predictability prevents behavioral distress and elopement risk.
EVIDENCE: Functional Behavior Assessment identifying unexpected transitions as primary trigger.
IF TEAM DISAGREES: "Document the alternative transition scaffolding the school will provide in PWN."
SOURCE: Functional Behavior Assessment (FBA)
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-009
TARGET LABEL: Preferential Seating Near Instruction
IEP SECTION: Accommodations / Supports
ADVOCATE SAY THIS: "We're requesting seating in the front third of the room away from HVAC noise and high-traffic doors."
PUT IT HERE: Environmental Accommodations
POSSIBLE IEP WORDING: "Preferential seating in direct line of sight with instructor, placed away from exterior doors, pencil sharpeners, and HVAC units."
WHY: Minimizes extraneous auditory and visual distractions to maintain attention on direct instruction.
EVIDENCE: Attention assessment showing 40% improvement in on-task behavior when seated away from doorway.
IF TEAM DISAGREES: "Provide the educational rationale for placing a student with auditory filtering deficits near high-traffic noise sources."
SOURCE: Neuropsychological Evaluation
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-010
TARGET LABEL: Reduced Pencil-and-Paper Fatigue
IEP SECTION: Accommodations / Supports
ADVOCATE SAY THIS: "We're requesting speech-to-text accessibility tools for assignments requiring more than two written paragraphs."
PUT IT HERE: Assistive Technology / Testing Accommodations
POSSIBLE IEP WORDING: "Access to speech-to-text dictation software and word prediction for all writing assignments exceeding two sentences."
WHY: Severe fine-motor dysgraphia impedes cognitive expression during manual handwriting.
EVIDENCE: Occupational therapy evaluation documenting dysgraphia and hand cramping within 3 minutes.
IF TEAM DISAGREES: "Refusal to provide assistive technology for documented motor impairment constitutes denial of FAPE. Please document refusal in PWN."
SOURCE: Assistive Technology Assessment
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-011
TARGET LABEL: Movement Cushion / Flexible Seating
IEP SECTION: Accommodations / Supports
ADVOCATE SAY THIS: "We are requesting access to a sensory wobble stool or movement cushion during direct instruction."
PUT IT HERE: Physical / Sensory Accommodations
POSSIBLE IEP WORDING: "Student will be provided with a dynamic movement cushion or ergonomic wobble stool during seated instruction."
WHY: Vestibular and proprioceptive input aids focus and posture stability.
EVIDENCE: Physical Therapy and OT sensory assessment.
IF TEAM DISAGREES: "Document reasons for denying standard sensory seating accommodations in PWN."
SOURCE: OT Treatment Logs
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-012
TARGET LABEL: Self-Advocacy & Break Request
IEP SECTION: Annual Goals
ADVOCATE SAY THIS: "We are requesting an annual goal for independently requesting a 3-minute regulation break in 4 out of 5 opportunities."
PUT IT HERE: Annual Goals - Social / Emotional / Behavioral
POSSIBLE IEP WORDING: "By October 2027, given a visual self-monitoring cue, Jeremiah will independently signal for a regulation break before reaching behavioral escalation in 4 out of 5 observed opportunities across 3 consecutive weeks as measured by staff logs."
WHY: Fosters independent emotional regulation and self-advocacy.
EVIDENCE: Baseline data showing 0% independent break requests without adult prompting.
IF TEAM DISAGREES: "State what alternative self-regulation goal will replace this critical skill."
SOURCE: Behavior Specialist Evaluation
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-013
TARGET LABEL: Paragraph Formulation with Scaffolding
IEP SECTION: Annual Goals
ADVOCATE SAY THIS: "We're requesting a written expression goal targeting 4-sentence structured paragraphs with graphic organizers."
PUT IT HERE: Annual Goals - Written Expression
POSSIBLE IEP WORDING: "By October 2027, when provided with a graphic organizer and speech-to-text software, Jeremiah will generate a 4-sentence paragraph with topic sentence, 2 details, and conclusion with 80% accuracy across 4 consecutive writing samples."
WHY: Develops core academic writing proficiency aligned with grade-level standards.
EVIDENCE: Current standardized writing score at 1.8 grade equivalent.
IF TEAM DISAGREES: "Document the proposed measurable goal for written expression in PWN."
SOURCE: Special Education Academic Testing
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-014
TARGET LABEL: Multi-Step Math Problem Completion
IEP SECTION: Annual Goals
ADVOCATE SAY THIS: "We're requesting a math reasoning goal for completing 3-step word problems using visual aids with 80% accuracy."
PUT IT HERE: Annual Goals - Mathematics Reasoning
POSSIBLE IEP WORDING: "By October 2027, given a step-by-step visual calculation template, Jeremiah will solve multi-step math word problems with 80% accuracy across 3 consecutive progress probes."
WHY: Ensures math reasoning ability is not penalized by multi-step working memory bottlenecks.
EVIDENCE: Math fluency probe showing 50% accuracy on multi-step problems versus 90% on single-step.
IF TEAM DISAGREES: "Please specify the measurable goal the district proposes for math problem-solving."
SOURCE: Math Specialist Progress Probes
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-015
TARGET LABEL: Emotional Self-Identification Scale
IEP SECTION: Annual Goals
ADVOCATE SAY THIS: "We are requesting a social-emotional goal using the 5-point regulation scale to identify dysregulation stages."
PUT IT HERE: Annual Goals - Social / Emotional
POSSIBLE IEP WORDING: "By October 2027, Jeremiah will correctly identify his emotional state on the 5-Point Incredible Scale and select an appropriate calming strategy in 80% of opportunities."
WHY: Developing emotional awareness is the foundation of self-control.
EVIDENCE: Counselor session logs indicating Jeremiah responds positively to color-coded scales.
IF TEAM DISAGREES: "Document in PWN why emotional identification is not being targeted as an IEP goal."
SOURCE: School Counselor Case Notes
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-016
TARGET LABEL: Speech-Language Direct Therapy
IEP SECTION: Related Services / AAC
ADVOCATE SAY THIS: "We are requesting 60 minutes weekly of direct individual speech-language therapy for pragmatic communication."
PUT IT HERE: Section 10: Special Education and Related Services
POSSIBLE IEP WORDING: "Speech-Language Pathology: 60 minutes weekly / individual / direct service."
WHY: Group speech sessions have failed to provide the necessary intensity for social-communication deficits.
EVIDENCE: Private speech assessment showing pragmatic language delay of 2.5 years.
IF TEAM DISAGREES: "Please note the clinical basis for denying individual speech therapy in Prior Written Notice."
SOURCE: Private SLP Diagnostic Evaluation
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-017
TARGET LABEL: Occupational Therapy Sensory Modulation
IEP SECTION: Related Services / AAC
ADVOCATE SAY THIS: "We're requesting 45 minutes weekly of direct OT focusing on fine-motor endurance and bilateral coordination."
PUT IT HERE: Related Services - Occupational Therapy
POSSIBLE IEP WORDING: "Occupational Therapy: 45 minutes weekly / individual / direct service in therapy gym."
WHY: Sensory integration and fine-motor endurance are prerequisites for classroom participation.
EVIDENCE: Standardized OT evaluation scoring below the 5th percentile in visual-motor integration.
IF TEAM DISAGREES: "Provide the objective criteria used to determine that Jeremiah does not require direct OT services."
SOURCE: Comprehensive OT Evaluation
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-018
TARGET LABEL: AAC Device Staff Training & Modeling
IEP SECTION: Related Services / AAC
ADVOCATE SAY THIS: "We are requesting 30 minutes monthly of indirect assistive technology consultation for classroom staff."
PUT IT HERE: Supports for School Personnel
POSSIBLE IEP WORDING: "Assistive Technology Consultation: 30 minutes monthly provided to classroom teachers and paraprofessionals."
WHY: Staff requires consistent modeling to integrate visual communication supports across subjects.
EVIDENCE: AT assessment recommending school staff receive ongoing implementation guidance.
IF TEAM DISAGREES: "Document how staff will receive training on specialized communication systems without consultation hours."
SOURCE: Assistive Technology Assessment
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-019
TARGET LABEL: General Education Co-Taught Setting
IEP SECTION: Placement / LRE
ADVOCATE SAY THIS: "We're requesting general education placement with co-teaching support for 80% or more of the school day."
PUT IT HERE: Least Restrictive Environment (LRE) Determination
POSSIBLE IEP WORDING: "Student will participate in the general education setting with co-taught special education support for 82% of the school day."
WHY: IDEA mandates education alongside non-disabled peers to the maximum extent appropriate with supplementary aids.
EVIDENCE: Academic testing showing average cognitive ability with appropriate accommodations.
IF TEAM DISAGREES: "State the specific factors that make general education with supplementary aids inappropriate under Roncker/Daniel R.R. standards."
SOURCE: LRE Assessment & Team Records
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-020
TARGET LABEL: Structured Resource Room Support
IEP SECTION: Placement / LRE
ADVOCATE SAY THIS: "We are requesting 45 minutes daily of targeted pull-out instruction for written expression in the resource room."
PUT IT HERE: Special Education Services - Resource Pull-Out
POSSIBLE IEP WORDING: "Specially Designed Instruction in Written Expression: 45 minutes daily / Small Group Resource Room."
WHY: Targeted intensive intervention in low-distraction setting accelerates foundational skills.
EVIDENCE: Progress reports showing 2x faster rate of progress in quiet resource environment.
IF TEAM DISAGREES: "Document the delivery model the school will use to provide intensive specialized instruction."
SOURCE: Progress Monitoring Data
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-021
TARGET LABEL: Cafeteria & Assembly Support Aide
IEP SECTION: Placement / LRE
ADVOCATE SAY THIS: "We're requesting paraprofessional proximity support during unstructured cafeteria and large-group gatherings."
PUT IT HERE: Supplementary Aids and Services
POSSIBLE IEP WORDING: "Adult proximity support provided during cafeteria lunch period, assemblies, and field trips for sensory and behavioral safety."
WHY: Unstructured high-noise settings are high risk for sensory panic and elopement without adult proximity.
EVIDENCE: Incident reports from prior school year in cafeteria setting.
IF TEAM DISAGREES: "Please document the safety plan for unstructured settings in PWN."
SOURCE: School Incident Report Logs
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-022
TARGET LABEL: Extended School Year (ESY) Determination
IEP SECTION: ESY & Transportation
ADVOCATE SAY THIS: "We are requesting ESY services with structured data collection on regression across school breaks."
PUT IT HERE: Extended School Year Services (ESY)
POSSIBLE IEP WORDING: "Extended School Year: Eligible for 4 weeks summer ESY program targeting maintenance of writing and behavioral regulation goals."
WHY: Jeremiah exhibits significant skill regression and protracted recoupment following extended breaks.
EVIDENCE: Post-winter break progress data demonstrating 6-week recoupment period.
IF TEAM DISAGREES: "Document the regression and recoupment data analysis in Prior Written Notice."
SOURCE: ESY Regression / Recoupment Tracking Sheet
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-023
TARGET LABEL: Climate-Controlled Sensory Bus Transportation
IEP SECTION: ESY & Transportation
ADVOCATE SAY THIS: "We're requesting specialized transportation with designated front seating and air conditioning."
PUT IT HERE: Specialized Transportation
POSSIBLE IEP WORDING: "Specialized transportation on air-conditioned bus with assigned front seating to prevent sensory heat-induced agitation."
WHY: Heat and overstimulation on buses trigger extreme agitation and self-injurious behavior.
EVIDENCE: Medical verification letter from pediatrician regarding thermal regulation and sensory triggers.
IF TEAM DISAGREES: "Provide medical justification for denying physician-recommended climate-controlled transport in PWN."
SOURCE: Physician Medical Documentation
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-024
TARGET LABEL: Bus Driver Sensory Awareness Protocol
IEP SECTION: ESY & Transportation
ADVOCATE SAY THIS: "We are requesting that bus drivers receive Jeremiah's positive reinforcement support profile."
PUT IT HERE: Supports for School Personnel / Transportation
POSSIBLE IEP WORDING: "Transportation staff will be provided with student's sensory profile and emergency contact communication protocol."
WHY: Ensures transportation staff respond to sensory distress with de-escalation rather than punitive measures.
EVIDENCE: Prior transportation misunderstanding resulting in unnecessary disciplinary referral.
IF TEAM DISAGREES: "Document how transportation safety will be maintained without driver awareness of student sensory triggers."
SOURCE: Parent Advocacy File
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

TARGET ID: TARGET-025
TARGET LABEL: Emergency Evacuation IEP Accommodation
IEP SECTION: ESY & Transportation
ADVOCATE SAY THIS: "We're requesting a dedicated staff buddy identified in the IEP for fire alarms and emergency evacuations."
PUT IT HERE: Emergency Preparedness & Safety Plan
POSSIBLE IEP WORDING: "Dedicated adult staff buddy assigned to assist Jeremiah during all emergency drills and building evacuations."
WHY: High-decibel fire alarms cause freezing behavior, posing immediate life safety risk.
EVIDENCE: Safety drill observation notes recording student freezing in place during fire drill.
IF TEAM DISAGREES: "Explain the district's life safety evacuation plan for a student with documented alarm-freeze response in PWN."
SOURCE: School Safety Drill Records
MEETING TRACKING:
[ ] Discussed
[ ] Agreed
[ ] Added to IEP
[ ] Denied
[ ] PWN Needed
[ ] Follow-Up

==================================================
🚦 BEFORE WE CLOSE
ADDITIONAL THINGS TO DISCUSS
1. ____________
2. ____________
3. ____________
4. ____________
==================================================
`;

describe("Advocate Ready Parser (PG-043)", () => {
  it("should parse 25 valid targets and 1-to-1 link EXPAND IDs to detailed TARGET IDs", () => {
    const result = parseAdvocateReadyDocument(sample25TargetDoc, "Jeremiah_Mitchell_Advocate_Ready.txt");

    expect(result.success).toBe(true);
    expect(result.targets.length).toBe(25);
    expect(result.validationErrors.length).toBe(0);

    // Verify TARGET-001
    const t1 = result.targets.find((t) => t.externalTargetId === "TARGET-001");
    expect(t1).toBeDefined();
    expect(t1?.targetName).toBe("Communication Log Clarity");
    expect(t1?.iepSection).toBe("Parent Concerns");
    expect(t1?.quickAdvocateSayThis).toContain("We're requesting a daily 2-minute digital communication note");
    expect(t1?.putItHereLocation).toContain("Parent Concerns / Supplementary Communication Aids");
    expect(t1?.whyWeWantIt).toContain("Ensures consistency between home and school strategies");
    expect(t1?.ifTeamDisagrees).toContain("What objective communication mechanism is the team proposing");
    expect(t1?.requestRaised).toBe(false);
    expect(t1?.pwnNeeded).toBe(false);

    // Verify TARGET-014
    const t14 = result.targets.find((t) => t.externalTargetId === "TARGET-014");
    expect(t14).toBeDefined();
    expect(t14?.targetName).toBe("Multi-Step Math Problem Completion");
    expect(t14?.iepSection).toBe("Annual Goals");
    expect(t14?.quickAdvocateSayThis).toContain("3-step word problems");
    expect(t14?.possibleIepWording).toContain("By October 2027");

    // Verify TARGET-024
    const t24 = result.targets.find((t) => t.externalTargetId === "TARGET-024");
    expect(t24).toBeDefined();
    expect(t24?.targetName).toBe("Bus Driver Sensory Awareness Protocol");
    expect(t24?.iepSection).toBe("ESY & Transportation");
    expect(t24?.quickAdvocateSayThis).toContain("bus drivers receive Jeremiah's positive reinforcement support profile");

    // Verify TARGET-025 (last target)
    const t25 = result.targets.find((t) => t.externalTargetId === "TARGET-025");
    expect(t25).toBeDefined();
    expect(t25?.targetName).toBe("Emergency Evacuation IEP Accommodation");

    // Verify 4 blank additional things to discuss are NOT parsed as targets
    expect(result.targets.length).toBe(25);
  });

  it("should fail gracefully on empty text or corrupted input without failing silently", () => {
    const emptyResult = parseAdvocateReadyDocument("");
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.targets.length).toBe(0);
    expect(emptyResult.validationErrors.length).toBeGreaterThan(0);
  });

  it("should report missing detailed target blocks when EXPAND ID is unmatched", () => {
    const brokenDoc = `
⚡ MEETING QUICK LIST
LABEL: Noise Support
ASK: "We need headphones."
EXPAND: TARGET-999

TARGET ID: TARGET-001
TARGET LABEL: Different Support
IEP SECTION: Accommodations
ADVOCATE SAY THIS: "Different text."
`;
    const result = parseAdvocateReadyDocument(brokenDoc);
    expect(result.validationErrors.length).toBeGreaterThan(0);
    expect(result.validationErrors.some((e) => e.includes("TARGET-999"))).toBe(true);
  });
});
