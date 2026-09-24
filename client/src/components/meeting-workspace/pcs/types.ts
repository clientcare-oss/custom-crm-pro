export type PcsStatus = "DRAFT" | "EDITED" | "PASTE_REPLACED" | "READY";

export type EvidenceSourceType =
  | "Parent Call"
  | "Discovery Worksheet"
  | "Email"
  | "IEP"
  | "Evaluation"
  | "Teacher Communication"
  | "Meeting Target"
  | "Uploaded Document"
  | "Other";

export interface PcsEvidenceItem {
  id: string;
  source: EvidenceSourceType;
  location: string; // e.g. "Present Levels → Reading → Page 12"
  usedFor: string;  // e.g. "Reading Progress"
  quoteOrSnippet: string;
  documentUrl?: string;
}

export interface PcsConcernBreakdownItem {
  id: string;
  topic: string; // e.g. "Reading Progress"
  whyAiIncludedThis: string;
  evidenceLocations: string[]; // e.g. ["IEP → Present Levels → Reading → Page 12", ...]
  evidenceIds?: string[];
  quote?: string;
}

export interface PcsVersionHistoryItem {
  id: string;
  timestamp: string; // ISO date string
  employee: string;  // e.g. "Byron Honea (Master IEP Coach®)"
  action:
    | "AI draft created"
    | "Edited by employee"
    | "Statement replaced by pasted version"
    | "Draft emailed to parent"
    | "Restored from version history"
    | "Initial draft loaded";
  snapshot: string;
}

export interface PcsSubmittedVersion {
  status: "not_received" | "received";
  receivedAt?: string;
  source?: string; // e.g. "Parent Email CC", "Uploaded by Parent", "Parent Forwarded"
  content?: string;
  notes?: string;
}

export interface PcsMetadata {
  originalAiResult: string;
  concernsBreakdown: PcsConcernBreakdownItem[];
  evidenceSources: PcsEvidenceItem[];
  history: PcsVersionHistoryItem[];
  submittedVersion: PcsSubmittedVersion;
}
