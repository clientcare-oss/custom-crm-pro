/**
 * Helper utility for Journey State transitions and payload construction.
 * Used by ClientJourneyCard and state switcher consoles to derive consistent
 * state payloads and metadata.
 */

export interface JourneyStatePayload {
  lifecycleStage: string;
  operationalState: string;
  serviceStatus: string;
  billingStatus: string;
  portalLifecycleStatus: string;
  planTier?: string;
  currentPrimaryAction?: string;
  currentActionDestination?: string;
  currentActionDueDate?: string;
  currentActionHelperText?: string;
  amountDue?: string;
  failedAttemptCount?: number;
  paymentFailureDate?: string;
  nextRetryDate?: string;
  paymentMethodSummary?: string;
  pauseReason?: string;
  pauseStartDate?: string;
  pauseReviewDate?: string;
  contractTreatment?: string;
  pauseApprovedBy?: string;
  renewalDaysRemaining?: number;
  renewalDate?: string;
  offboardingReason?: string;
  journeyProgress?: number;
  journeyTotalSteps?: number;
  managerApprovalStatus?: string;
}

export function getQuickApplyPayload(
  stateKey: string,
  activeContact?: any
): JourneyStatePayload {
  if (stateKey === "active") {
    return {
      lifecycleStage: "Active",
      operationalState: "Normal",
      serviceStatus: "Active",
      billingStatus: "Current",
      planTier:
        activeContact?.planTier && activeContact?.planTier !== "Not selected"
          ? activeContact.planTier
          : "$55",
      portalLifecycleStatus: "Active",
      currentPrimaryAction: "Review New IEP Draft",
      currentActionDestination: "workspace",
      currentActionDueDate: "Due today",
      currentActionHelperText: "Due today • Uploaded by parent",
    };
  }

  if (stateKey === "payment") {
    return {
      lifecycleStage: "Active",
      operationalState: "Payment Attention",
      serviceStatus: "Active",
      billingStatus: "Payment Failed",
      portalLifecycleStatus: "Active",
      amountDue: "$55.00",
      failedAttemptCount: 1,
      paymentFailureDate: "September 19, 2026",
      nextRetryDate: "September 22, 2026",
      paymentMethodSummary: "Visa ending in 4242",
      currentPrimaryAction: "Resolve Payment Issue",
      currentActionDestination: "payment",
      currentActionHelperText: "Review billing and contact the family",
    };
  }

  if (stateKey === "paused") {
    return {
      lifecycleStage: "Active",
      operationalState: "Services Paused",
      serviceStatus: "Paused",
      billingStatus: "Paid in Full",
      planTier: "Paid in Full",
      portalLifecycleStatus: "Active",
      pauseReason: "Residential placement",
      pauseStartDate: "September 19, 2026",
      pauseReviewDate: "January 15, 2027",
      contractTreatment: "Paid-in-full time preserved",
      pauseApprovedBy: "Byron Honea (Manager)",
      currentPrimaryAction: "Review Pause",
      currentActionDestination: "pause",
      currentActionHelperText: "View terms, dates, and return plan",
    };
  }

  if (stateKey === "renewal") {
    return {
      lifecycleStage: "Renewal",
      operationalState: "Renewal Due",
      serviceStatus: "Active",
      billingStatus: "Current",
      portalLifecycleStatus: "Active",
      renewalDaysRemaining: 14,
      renewalDate: "March 15, 2027",
      currentPrimaryAction: "Start Renewal",
      currentActionDestination: "renewal",
      currentActionHelperText: "Review plan and send renewal form",
    };
  }

  if (stateKey === "offboarding") {
    return {
      lifecycleStage: "Offboarding",
      operationalState: "Pending Closeout",
      serviceStatus: "Active",
      billingStatus: "Current",
      portalLifecycleStatus: "Active",
      offboardingReason: "Services completed",
      currentPrimaryAction: "Start Offboarding",
      currentActionDestination: "offboarding",
      currentActionHelperText: "Review reason and begin guided closeout",
    };
  }

  if (stateKey === "discovery") {
    return {
      lifecycleStage: "Discovery",
      operationalState: "Normal",
      serviceStatus: "Not Started",
      billingStatus: "Not Configured",
      portalLifecycleStatus: "Discovery",
      planTier: "Not selected",
      currentPrimaryAction: "Start Discovery Call",
      currentActionDestination: "discovery",
      currentActionHelperText: "Open the guided call checklist",
    };
  }

  if (stateKey === "onboarding") {
    return {
      lifecycleStage: "Onboarding",
      operationalState: "Normal",
      serviceStatus: "Active",
      billingStatus: "Current",
      portalLifecycleStatus: "Onboarding",
      currentPrimaryAction: "Continue Onboarding",
      currentActionDestination: "onboarding",
      currentActionHelperText: "Collect educational records & notify school",
      journeyProgress: 3,
      journeyTotalSteps: 6,
    };
  }

  if (stateKey === "scholarship") {
    return {
      lifecycleStage: "Onboarding",
      operationalState: "Scholarship Pending",
      serviceStatus: "Active",
      billingStatus: "Current",
      portalLifecycleStatus: "Onboarding",
      managerApprovalStatus: "pending",
      currentPrimaryAction: "Continue Onboarding",
      currentActionDestination: "onboarding",
      currentActionHelperText: "Awaiting manager scholarship authorization",
      journeyProgress: 2,
      journeyTotalSteps: 6,
    };
  }

  return {
    lifecycleStage: "Active",
    operationalState: "Normal",
    serviceStatus: "Active",
    billingStatus: "Current",
    portalLifecycleStatus: "Active",
  };
}
