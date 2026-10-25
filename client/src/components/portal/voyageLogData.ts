export interface VoyageAttendee {
  name: string;
  role: string;
  affiliation: "Waypoint" | "District" | "Family" | "Clinical";
}

export interface VoyageActionItem {
  task: string;
  owner: string;
  dueDate: string;
  completed?: boolean;
}

export interface VoyagePwnItem {
  item: string;
  districtPromise: string;
  statutoryProng: string;
  deadlineDays: number;
}

export interface VoyageTranscriptTurn {
  speaker: string;
  role: "advocate" | "district" | "parent" | "specialist";
  time: string;
  seconds: number;
  text: string;
}

export interface VoyageRecording {
  id: string;
  title: string;
  meetingType: string;
  category: "all" | "iep" | "eval" | "504" | "transition";
  date: string;
  duration: string;
  secondsLimit: number;
  starred?: boolean;
  statutoryProng: string;
  leadAdvocate: string;
  outcomeBadge: {
    label: string;
    variant: "success" | "warning" | "info" | "neutral";
  };
  attendees: VoyageAttendee[];
  highlights: string[];
  actionItems: VoyageActionItem[];
  pwnWatchlist: VoyagePwnItem[];
  executiveBrief: string;
  transcript: VoyageTranscriptTurn[];
  status?: "completed" | "processing" | "uploading";
}

export const VOYAGE_RECORDINGS_DATA: VoyageRecording[] = [
  {
    id: "rec_1",
    title: "Annual IEP Meeting — Direct Services & Accommodations",
    meetingType: "Annual IEP Review",
    category: "iep",
    date: "May 14, 2026",
    duration: "1:42:18",
    secondsLimit: 6138,
    starred: true,
    statutoryProng: "IDEA Part B · 34 C.F.R. § 300.320 (FAPE & Related Services)",
    leadAdvocate: "Byron Honea · Lead Special Education Advocate",
    outcomeBadge: {
      label: "Services Expanded (+15 min/wk)",
      variant: "success",
    },
    attendees: [
      { name: "Byron Honea", role: "Lead Special Ed Advocate", affiliation: "Waypoint" },
      { name: "Sarah Jenkins", role: "Parent / Educational Rights Holder", affiliation: "Family" },
      { name: "Dr. Karen Vance", role: "District LEA Representative", affiliation: "District" },
      { name: "Marcus Reynolds", role: "Special Education Case Manager", affiliation: "District" },
      { name: "Elena Gomez", role: "General Education Teacher", affiliation: "District" },
      { name: "Rachel Chen, MS OTR/L", role: "Private Pediatric OT", affiliation: "Clinical" },
    ],
    highlights: [
      "Direct specialized reading instruction expanded from 45 min to 60 min/week (+15 min)",
      "Accommodations added for sensory regulation breaks & preferential front-row seating",
      "School district deferred direct OT pending district sensorimotor evaluation",
      "Compensatory service hours recorded on official record for missed Q1 speech blocks",
      "Agreed to reconvene within 30 calendar days following private OT report upload"
    ],
    actionItems: [
      { task: "Upload Rachel Chen's private sensory clinical report into Portal Document Vault", owner: "Parent (Sarah)", dueDate: "May 22, 2026", completed: true },
      { task: "Formalize +15 min/wk reading minutes in draft IEP document", owner: "Case Mgr (Marcus)", dueDate: "May 28, 2026", completed: false },
      { task: "Draft Written Notice of Proposed Action (PWN) outlining OT deferral grounds", owner: "District LEA (Dr. Vance)", dueDate: "June 2, 2026", completed: false },
      { task: "Waypoint Advocate audit of final IEP draft against state procedural safeguards", owner: "Advocate (Byron Honea)", dueDate: "June 5, 2026", completed: false }
    ],
    pwnWatchlist: [
      {
        item: "Occupational Therapy Direct Minutes Refusal",
        districtPromise: "LEA stated district sensory screener needed before direct minutes can be authorized in IEP grid.",
        statutoryProng: "34 C.F.R. § 300.503(b)(1) — Written justification required for service refusal.",
        deadlineDays: 10
      },
      {
        item: "Specialized Reading Instruction Expansion",
        districtPromise: "District agreed to 60 min/week 1:1 multisensory Orton-Gillingham intervention.",
        statutoryProng: "34 C.F.R. § 300.320(a)(4) — Statement of special education and related services.",
        deadlineDays: 10
      }
    ],
    executiveBrief: `Advocate Assessment: Substantial progress achieved during this session. We firmly locked in an additional 15 minutes of direct multisensory reading intervention per week, directly overcoming the district's initial claim that resource room scheduling was full. 

Regarding Occupational Therapy: The district resisted adding direct 1:1 OT without an internal school assessment, despite our clinical data from Rachel Chen. We established on the formal record that our consent to the IEP is conditional on receiving the full Prior Written Notice (PWN) explaining this deferral, and we placed compensatory service calculations on notice for missed fall sessions.`,
    transcript: [
      {
        speaker: "Byron Honea (Lead Advocate)",
        role: "advocate",
        time: "14:31",
        seconds: 871,
        text: "Looking closely at the progress monitoring probes from Q2 and Q3, Liam's phonemic decoding fluency has plateaued at 42 words per minute against a target of 65. Under 34 C.F.R. § 300.320, 45 minutes of pull-out instruction is provably insufficient to make meaningful educational progress. We are requesting an increase to 60 direct minutes weekly."
      },
      {
        speaker: "Marcus Reynolds (Case Manager)",
        role: "district",
        time: "17:42",
        seconds: 1062,
        text: "The reading specialist's current roster has significant caseload constraints, but reviewing the probe variance Byron highlighted, we can adjust the morning resource block to accommodate 60 minutes."
      },
      {
        speaker: "Dr. Karen Vance (District LEA)",
        role: "district",
        time: "27:55",
        seconds: 1675,
        text: "Regarding the occupational therapy request for 30 minutes direct weekly: the district is unable to authorize direct related service minutes without our own school-based sensorimotor assessment on file, even with the private evaluation provided."
      },
      {
        speaker: "Byron Honea (Lead Advocate)",
        role: "advocate",
        time: "32:10",
        seconds: 1930,
        text: "We understand the district's desire for internal data, but under Georgia Rule 160-4-7-.04, private evaluations must be meaningfully considered. If the district refuses direct OT today, we require that refusal and the exact statutory reasoning documented in the Prior Written Notice within 10 school days."
      },
      {
        speaker: "Dr. Karen Vance (District LEA)",
        role: "district",
        time: "48:12",
        seconds: 2892,
        text: "Understood, Mr. Honea. We will reflect the deferral in the PWN and issue consent for our occupational therapist to conduct the school assessment within 30 days."
      },
      {
        speaker: "Sarah Jenkins (Parent)",
        role: "parent",
        time: "1:12:20",
        seconds: 4340,
        text: "Thank you Byron for clarifying that. We want to make sure Liam has the sensory breaks in writing before he starts the new grading period."
      }
    ]
  },
  {
    id: "rec_2",
    title: "Triennial Eligibility Determination — OHI & Clinical Review",
    meetingType: "Eligibility Determination",
    category: "eval",
    date: "March 3, 2026",
    duration: "1:15:42",
    secondsLimit: 4542,
    starred: true,
    statutoryProng: "IDEA Part B · 34 C.F.R. § 300.8(c)(9) (Other Health Impairment)",
    leadAdvocate: "Byron Honea · Lead Special Education Advocate",
    outcomeBadge: {
      label: "OHI Eligibility Confirmed",
      variant: "success",
    },
    attendees: [
      { name: "Byron Honea", role: "Lead Special Ed Advocate", affiliation: "Waypoint" },
      { name: "Sarah Jenkins", role: "Parent", affiliation: "Family" },
      { name: "Dr. Thomas Wright", role: "School Psychologist", affiliation: "District" },
      { name: "Amanda Cole", role: "Special Ed Dept Chair", affiliation: "District" }
    ],
    highlights: [
      "Eligibility successfully reaffirmed under Other Health Impairment (OHI) for ADHD & Executive Dysfunction",
      "District psychologist accepted outside neurological and neuropsychological battery results",
      "Executive functioning deficits formally recorded as educational impact factors",
      "Timeline set for complete comprehensive draft IEP goals within 20 calendar days"
    ],
    actionItems: [
      { task: "Execute Consent for Special Education Placement documentation", owner: "Parent (Sarah)", dueDate: "March 10, 2026", completed: true },
      { task: "Circulate baseline drafting templates for executive functioning goals", owner: "Advocate (Byron Honea)", dueDate: "March 15, 2026", completed: true },
      { task: "Convene annual goals committee session", owner: "Dept Chair (Amanda Cole)", dueDate: "March 25, 2026", completed: false }
    ],
    pwnWatchlist: [
      {
        item: "OHI Category Reaffirmation",
        districtPromise: "Psychological evaluation committee affirmed student qualifies for specialized instruction under OHI.",
        statutoryProng: "34 C.F.R. § 300.306 — Determination of eligibility.",
        deadlineDays: 10
      }
    ],
    executiveBrief: `Smooth eligibility defense. By presenting our clinical neurology records alongside concrete teacher rating scale discrepancies prior to the meeting, the district psychologist conceded OHI eligibility without contesting executive function impacts. We established the baseline for all subsequent goal expansions.`,
    transcript: [
      {
        speaker: "Dr. Thomas Wright (School Psychologist)",
        role: "district",
        time: "05:10",
        seconds: 310,
        text: "Reviewing the BASC-3 behavioral assessment alongside Dr. Miller's clinical neurology notes, there is clear documentation of chronic executive disinhibition impacting classroom performance."
      },
      {
        speaker: "Byron Honea (Lead Advocate)",
        role: "advocate",
        time: "22:45",
        seconds: 1365,
        text: "Because the executive deficits directly impede assignment initiation and completion without accommodations, Liam meets all statutory criteria for Other Health Impairment under 34 C.F.R. § 300.8(c)(9)."
      },
      {
        speaker: "Dr. Thomas Wright (School Psychologist)",
        role: "district",
        time: "55:12",
        seconds: 3312,
        text: "The multidisciplinary team is in unanimous consensus: eligibility is established under OHI."
      }
    ]
  },
  {
    id: "rec_3",
    title: "Independent OT Clinical Assessment Review & Accommodations",
    meetingType: "Evaluation Review",
    category: "eval",
    date: "Feb 10, 2026",
    duration: "0:58:33",
    secondsLimit: 3513,
    statutoryProng: "34 C.F.R. § 300.302 — Screening for instructional purposes vs evaluation",
    leadAdvocate: "Byron Honea · Lead Special Education Advocate",
    outcomeBadge: {
      label: "Assistive Tech Approved",
      variant: "info",
    },
    attendees: [
      { name: "Byron Honea", role: "Lead Special Ed Advocate", affiliation: "Waypoint" },
      { name: "Sarah Jenkins", role: "Parent", affiliation: "Family" },
      { name: "Rachel Chen, MS OTR/L", role: "Clinical Occupational Therapist", affiliation: "Clinical" },
      { name: "Laura Palmer", role: "School Occupational Therapist", affiliation: "District" }
    ],
    highlights: [
      "Severe dysgraphia and handwriting fatigue verified through standardized grip pressure metrics",
      "District approved speech-to-text assistive technology device trial in English and Social Studies",
      "Pencil grip adaptation and slanted desk surface implemented immediately",
      "Weekly consultation between clinical OT and classroom teachers authorized"
    ],
    actionItems: [
      { task: "Deploy Chromebook voice dictation extension with offline headset", owner: "School Tech Spec", dueDate: "Feb 17, 2026", completed: true },
      { task: "Submit monthly ergonomics observation log to Waypoint portal", owner: "School OT (Laura)", dueDate: "March 1, 2026", completed: false }
    ],
    pwnWatchlist: [
      {
        item: "Speech-to-Text Device Provision",
        districtPromise: "Trial assistive tech software provided at district expense for 60 school days.",
        statutoryProng: "34 C.F.R. § 300.105 — Assistive technology devices.",
        deadlineDays: 10
      }
    ],
    executiveBrief: `High-value technical review. Our clinical OT presented indisputable motor latency charts demonstrating 68% handwriting deceleration over sustained 10-minute tasks. District conceded full speech-to-text assistive technology accommodations.`,
    transcript: [
      {
        speaker: "Rachel Chen (Clinical OT)",
        role: "specialist",
        time: "12:15",
        seconds: 735,
        text: "Liam's fine motor endurance drops precipitously after 4 minutes of continuous pencil contact, causing severe finger cramping that invalidates written testing measures."
      },
      {
        speaker: "Byron Honea (Lead Advocate)",
        role: "advocate",
        time: "24:30",
        seconds: 1470,
        text: "Given this clinical baseline, writing without keyboarding or speech-to-text violates Liam's equal access under Section 504 and IDEA. We request assistive speech-to-text technology immediately."
      },
      {
        speaker: "Laura Palmer (School OT)",
        role: "district",
        time: "34:20",
        seconds: 2060,
        text: "The district agrees to issue an assistive technology chromebook package with speech-to-text enabled next Monday."
      }
    ]
  },
  {
    id: "rec_4",
    title: "Middle School Articulation & Transition Planning Conference",
    meetingType: "Transition Planning",
    category: "transition",
    date: "Jan 22, 2026",
    duration: "1:20:11",
    secondsLimit: 4811,
    statutoryProng: "Georgia Rule 160-4-7-.06 · Individualized Education Program Transition",
    leadAdvocate: "Byron Honea · Lead Special Education Advocate",
    outcomeBadge: {
      label: "Transition Plan Locked",
      variant: "success",
    },
    attendees: [
      { name: "Byron Honea", role: "Lead Special Ed Advocate", affiliation: "Waypoint" },
      { name: "Sarah Jenkins", role: "Parent", affiliation: "Family" },
      { name: "Principal Gregory Vance", role: "Middle School Administrator", affiliation: "District" },
      { name: "Claire Dupont", role: "Middle School Case Coordinator", affiliation: "District" }
    ],
    highlights: [
      "Secured 5-minute passing period grace window to eliminate crowded hallway anxiety",
      "Assigned dedicated homeroom advisory mentor for daily locker & schedule organization",
      "Authorized orientation walkthrough visits prior to general student registration",
      "Preserved full 1:1 aide support for cafeteria and unstructured campus transitions"
    ],
    actionItems: [
      { task: "Schedule 3 pre-orientation walkthroughs with campus counselor", owner: "Middle School Case Coord", dueDate: "May 10, 2026", completed: false },
      { task: "Provide locker combination lock practice set for home familiarization", owner: "Parent (Sarah)", dueDate: "June 1, 2026", completed: false }
    ],
    pwnWatchlist: [
      {
        item: "Passing Period Time Modification",
        districtPromise: "Student permitted early release from classroom 3 minutes prior to bell.",
        statutoryProng: "34 C.F.R. § 300.320(a)(4) — Program modifications and supports.",
        deadlineDays: 10
      }
    ],
    executiveBrief: `Transition conferences often dilute elementary accommodations. We successfully prevented any loss of transition support, locking down early bell dismissal, locker assistance, and guaranteed campus walkthroughs.`,
    transcript: [
      {
        speaker: "Byron Honea (Lead Advocate)",
        role: "advocate",
        time: "18:40",
        seconds: 1120,
        text: "Hallway congestion and sensory noise between bells is Liam's primary trigger for panic episodes. We need a written early-release accommodation of 3 minutes before passing bells."
      },
      {
        speaker: "Principal Gregory Vance",
        role: "district",
        time: "28:15",
        seconds: 1695,
        text: "We can readily accommodate that in his schedule and brief all 6th-grade teachers during pre-planning."
      }
    ]
  },
  {
    id: "rec_5",
    title: "Section 504 Health Protocol & Testing Accommodations Review",
    meetingType: "Section 504 Annual",
    category: "504",
    date: "Dec 4, 2025",
    duration: "0:45:28",
    secondsLimit: 2728,
    statutoryProng: "Section 504 of Rehabilitation Act · 34 C.F.R. Part 104",
    leadAdvocate: "Byron Honea · Lead Special Education Advocate",
    outcomeBadge: {
      label: "Health Protocol Approved",
      variant: "neutral",
    },
    attendees: [
      { name: "Byron Honea", role: "Lead Special Ed Advocate", affiliation: "Waypoint" },
      { name: "Sarah Jenkins", role: "Parent", affiliation: "Family" },
      { name: "Nurse Patricia Hughes, RN", role: "School Health Coordinator", affiliation: "District" },
      { name: "David Kim", role: "504 Compliance Officer", affiliation: "District" }
    ],
    highlights: [
      "Authorized continuous glucose sensor and mobile medical monitor in classroom and testing rooms",
      "Approved 50% extended time (1.5x) for all state standardized tests and classroom quizzes",
      "Immediate nurse notification protocol established for blood sugar spikes or dips",
      "Unlimited restroom and water access without disciplinary penalty coded into school portal"
    ],
    actionItems: [
      { task: "File signed physician orders with school clinic", owner: "Parent (Sarah)", dueDate: "Dec 10, 2025", completed: true },
      { task: "Distribute emergency hypo/hyperglycemia cheat sheet to all academic teachers", owner: "Nurse Patricia", dueDate: "Dec 12, 2025", completed: true }
    ],
    pwnWatchlist: [
      {
        item: "Testing Environment Accommodation Notice",
        districtPromise: "1.5x time with stop-the-clock breaks approved for all state and district assessments.",
        statutoryProng: "34 C.F.R. § 104.35 — Non-discriminatory testing conditions.",
        deadlineDays: 10
      }
    ],
    executiveBrief: `All medical accommodations were formalized with zero pushback. Testing extended time is formally registered with the state testing board, protecting high-stakes exam validity.`,
    transcript: [
      {
        speaker: "Byron Honea (Lead Advocate)",
        role: "advocate",
        time: "08:15",
        seconds: 495,
        text: "The student requires stop-the-clock testing breaks whenever his sensor alarms, without deducting time from his standardized testing allowance."
      },
      {
        speaker: "David Kim (504 Officer)",
        role: "district",
        time: "15:20",
        seconds: 920,
        text: "Agreed. That will be documented as an administrative accommodation in the state testing portal."
      }
    ]
  }
];
