import type {
  CloseoutChecks,
  MeetingMinutesEntry,
  DocumentCheckItem,
  MeetingTimelineEvent,
} from "../types";

export function formatMeetingTime(date = new Date()): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export interface RecordApprovalParams {
  sourceType: "target" | "before_we_end";
  sourceId: string;
  title: string;
  details?: string;
  responsiblePerson?: string;
  deadlineDate?: string;
  conditionNote?: string;
}

/**
 * Automatically records team approval into Meeting Minutes, Document Check, and Timeline.
 * Guarantees zero duplicate entries by keying off sourceId.
 * Keeps agreement state separate from Document Check verification state.
 */
export function recordApproval(
  checks: CloseoutChecks,
  params: RecordApprovalParams
): CloseoutChecks {
  const timestamp = formatMeetingTime();
  const currentMinutes = checks.minutesEntries || [];
  const currentDocChecks = checks.documentCheckItems || [];
  const currentTimeline = checks.timelineEvents || [];

  // 1. Upsert Meeting Minutes Entry (No duplicates)
  const existingMinIndex = currentMinutes.findIndex(
    (m) => m.sourceId === params.sourceId
  );

  let updatedMinutes: MeetingMinutesEntry[];
  if (existingMinIndex >= 0) {
    const existing = currentMinutes[existingMinIndex];
    const updated: MeetingMinutesEntry = {
      ...existing,
      title: params.title || existing.title,
      details: params.details || existing.details,
      status: "APPROVED",
      approvedAt: existing.approvedAt || timestamp,
      responsiblePerson:
        params.responsiblePerson !== undefined
          ? params.responsiblePerson
          : existing.responsiblePerson,
      deadlineDate:
        params.deadlineDate !== undefined
          ? params.deadlineDate
          : existing.deadlineDate,
      notes:
        params.conditionNote !== undefined
          ? params.conditionNote
          : existing.notes,
      history: [
        ...(existing.history || []),
        {
          action: "Approval re-confirmed",
          timestamp,
          note: params.conditionNote,
        },
      ],
    };
    updatedMinutes = [...currentMinutes];
    updatedMinutes[existingMinIndex] = updated;
  } else {
    const newEntry: MeetingMinutesEntry = {
      id: `min-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      title: params.title,
      details: params.details,
      status: "APPROVED",
      approvedAt: timestamp,
      responsiblePerson: params.responsiblePerson,
      deadlineDate: params.deadlineDate,
      notes: params.conditionNote,
      history: [
        {
          action: "Item Approved by IEP team",
          timestamp,
          note: params.conditionNote,
        },
      ],
    };
    updatedMinutes = [newEntry, ...currentMinutes];
  }

  // 2. Upsert Document Check Item (Must verify against revised IEP post-meeting)
  const existingDocIndex = currentDocChecks.findIndex(
    (d) => d.sourceId === params.sourceId
  );

  let updatedDocChecks: DocumentCheckItem[];
  if (existingDocIndex >= 0) {
    const existing = currentDocChecks[existingDocIndex];
    const updated: DocumentCheckItem = {
      ...existing,
      title: params.title || existing.title,
      expectedWordingOrDetails:
        params.details || existing.expectedWordingOrDetails,
      status: "ACTIVE_AGREEMENT",
      // Preserve document verification flag (approval != verified document)
      verified: existing.verified,
    };
    updatedDocChecks = [...currentDocChecks];
    updatedDocChecks[existingDocIndex] = updated;
  } else {
    const newDocItem: DocumentCheckItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      title: params.title,
      expectedWordingOrDetails: params.details,
      verified: false,
      status: "ACTIVE_AGREEMENT",
      approvedAt: timestamp,
    };
    updatedDocChecks = [newDocItem, ...currentDocChecks];
  }

  // 3. Append Meeting Timeline Event
  const newTimelineEvent: MeetingTimelineEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sourceId: params.sourceId,
    sourceType: params.sourceType,
    timestamp,
    type: "APPROVAL",
    title: `Approved: ${params.title}`,
    description:
      params.details ||
      (params.conditionNote ? `Condition: ${params.conditionNote}` : undefined),
  };

  return {
    ...checks,
    minutesEntries: updatedMinutes,
    documentCheckItems: updatedDocChecks,
    timelineEvents: [newTimelineEvent, ...currentTimeline],
  };
}

/**
 * Handles withdrawal or alteration of an approved item.
 * Preserves audit history in minutes and marks document check as WITHDRAWN so an outdated agreement does not remain active.
 */
export function withdrawApproval(
  checks: CloseoutChecks,
  sourceId: string,
  newStatus: string
): CloseoutChecks {
  const timestamp = formatMeetingTime();
  const currentMinutes = checks.minutesEntries || [];
  const currentDocChecks = checks.documentCheckItems || [];
  const currentTimeline = checks.timelineEvents || [];

  // 1. Update Minutes with Withdrawal & Audit History
  const updatedMinutes = currentMinutes.map((entry) => {
    if (entry.sourceId === sourceId) {
      return {
        ...entry,
        status: "WITHDRAWN" as const,
        history: [
          ...(entry.history || []),
          {
            action: `Approval withdrawn (Status changed to ${newStatus})`,
            timestamp,
          },
        ],
      };
    }
    return entry;
  });

  // 2. Mark Document Check Item as WITHDRAWN so it won't be expected in revised IEP
  const updatedDocChecks = currentDocChecks.map((item) => {
    if (item.sourceId === sourceId) {
      return {
        ...item,
        status: "WITHDRAWN" as const,
      };
    }
    return item;
  });

  // 3. Log Timeline Event
  const newTimelineEvent: MeetingTimelineEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sourceId,
    timestamp,
    type: "APPROVAL_WITHDRAWN",
    title: `Approval Withdrawn`,
    description: `Status changed to ${newStatus}`,
  };

  return {
    ...checks,
    minutesEntries: updatedMinutes,
    documentCheckItems: updatedDocChecks,
    timelineEvents: [newTimelineEvent, ...currentTimeline],
  };
}

/**
 * Updates optional contextual details (responsible person, deadline date, condition note)
 * on linked minutes and document check items.
 */
export function updateApprovalMetadata(
  checks: CloseoutChecks,
  sourceId: string,
  metadata: {
    responsiblePerson?: string;
    deadlineDate?: string;
    conditionNote?: string;
  }
): CloseoutChecks {
  const currentMinutes = checks.minutesEntries || [];
  const currentDocChecks = checks.documentCheckItems || [];

  const updatedMinutes = currentMinutes.map((entry) => {
    if (entry.sourceId === sourceId) {
      return {
        ...entry,
        responsiblePerson:
          metadata.responsiblePerson !== undefined
            ? metadata.responsiblePerson
            : entry.responsiblePerson,
        deadlineDate:
          metadata.deadlineDate !== undefined
            ? metadata.deadlineDate
            : entry.deadlineDate,
        notes:
          metadata.conditionNote !== undefined
            ? metadata.conditionNote
            : entry.notes,
      };
    }
    return entry;
  });

  const updatedDocChecks = currentDocChecks.map((item) => {
    if (item.sourceId === sourceId) {
      return {
        ...item,
        expectedWordingOrDetails:
          metadata.conditionNote !== undefined && metadata.conditionNote.trim()
            ? metadata.conditionNote
            : item.expectedWordingOrDetails,
      };
    }
    return item;
  });

  return {
    ...checks,
    minutesEntries: updatedMinutes,
    documentCheckItems: updatedDocChecks,
  };
}
