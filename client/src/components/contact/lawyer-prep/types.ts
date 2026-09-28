export interface LawyerPrepSnapshot {
  caseSnapshot: {
    studentName: string;
    age: string;
    grade: string;
    school: string;
    district: string;
    eligibility: string;
    medicalDiagnoses: string;
    planStatus: string;
    currentPlacement: string;
    relevantServices: string[];
    dateOfRecentIep: string;
    nextKnownMeeting: string;
    attorneyInvolvement: string;
    advocateInvolvement: string;
  };
  primaryIssues: Array<{
    id: string;
    title: string;
    category: string;
    severity: "High" | "Medium" | "Low";
    summary: string;
    status: "Unresolved" | "Pending School Action" | "Disputed";
    evidenceSources: string[];
  }>;
  keyTimeline: Array<{
    id: string;
    date: string;
    event: string;
    whatHappened: string;
    evidence: string;
    evidenceType: "document" | "email" | "meeting" | "pwn" | "note";
    status: "Resolved" | "Unresolved" | "Unknown";
  }>;
  requestsAndResponses: Array<{
    id: string;
    request: string;
    date: string;
    schoolResponse: string;
    status: "Agreed" | "Partially Agreed" | "Denied" | "No Response Found" | "Pending" | "Unclear";
    evidence: string;
  }>;
  potentialLegalIssues: Array<{
    id: string;
    issue: string;
    whyFlagged: string;
    relevantLegalArea: string;
    supportingEvidence: string[];
    missingEvidence: string;
    legalLevel: "Potential compliance concern" | "Issue requiring legal review" | "Possible procedural concern" | "Possible implementation concern";
  }>;
  evidenceIndex: Array<{
    category: "IEP Documents" | "Evaluations" | "PWN" | "Emails & Communications" | "Meeting Records" | "Progress Data" | "Behavior & Discipline" | "Parent Requests" | "Advocate Notes";
    items: Array<{
      id: string | number;
      name: string;
      date: string;
      url?: string;
      notes?: string;
      sourceRef?: string;
    }>;
  }>;
  recordConflicts: Array<{
    id: string;
    conflictTitle: string;
    description: string;
    sourceA: { title: string; statement: string; date?: string };
    sourceB: { title: string; statement: string; date?: string };
    implication: string;
  }>;
  missingInformation: Array<{
    id: string;
    item: string;
    importance: "Critical" | "High" | "Recommended";
    whyNeeded: string;
    checklistStatus: "Request from Parent" | "Request from School" | "Already Requested" | "Received" | "Not Needed";
  }>;
  questionsForAttorney: Array<{
    id: string;
    question: string;
    context: string;
    relevantDocs: string;
  }>;
  advocateNotes: string;
  sources: Array<{
    id: string;
    label: string;
    type: "document" | "timeline" | "meeting" | "email" | "complaint" | "advocate_report";
    confidenceLabel: "🟢 Documented" | "🟡 Partially Documented" | "🔴 Missing Documentation" | "⚪ Advocate/Parent Report";
    excerpt: string;
    url?: string;
  }>;
}

export interface AttorneyDocument {
  id: string;
  name: string;
  url?: string;
  uploadedAt: string;
  notes?: string;
}
