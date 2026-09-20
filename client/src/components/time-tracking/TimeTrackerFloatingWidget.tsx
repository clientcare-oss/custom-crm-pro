export const WORK_TYPES = [
  "Meeting preparation",
  "IEP/504 meeting",
  "Records review",
  "Calls",
  "SMS/messages",
  "Email review",
  "Email drafting",
  "Complaint work",
  "Research",
  "Case strategy",
  "Follow-up",
  "Administrative work",
];

export interface TimeTrackerFloatingWidgetProps {
  preselectedStudentId?: number;
}

/**
 * Legacy TimeTrackerFloatingWidget.
 * Floating time tracking is now seamlessly unified with the Page ID badge
 * inside FloatingUtilityDock.tsx for an ultra-clean frosted glass micro-dock experience.
 */
export default function TimeTrackerFloatingWidget(_props: TimeTrackerFloatingWidgetProps = {}) {
  return null;
}
