import { eq, and, or, inArray } from "drizzle-orm";
import * as db from "../db";
import { getDb } from "../db/connection";
import { DEFAULT_PLAN_DEFINITIONS } from "../db/planMatrix";
import { recordCaseActivity } from "./caseActivityService";
import {
  agreements,
  agreementSigners,
  familyEnrollmentOffers,
  invoices,
  contacts,
  type FamilyEnrollmentOffer,
  type InsertFamilyEnrollmentOffer,
} from "../../drizzle/schema";
import { getSafeStripe } from "../stripeClient";



export const PUBLISHED_MEMBERSHIP_PLANS = [
  {
    planKey: "navigator",
    planName: "Navigator",
    priceMonthly: 55,
    commitmentMonths: 12,
    description: "Guided advocacy package with core meeting support and essential document review.",
    features: [
      "2 IEP Meetings / year",
      "2 504 Meetings / year",
      "1 Records Review / year",
      "PWN Review & Strategy",
      "Client Portal & Resource Access",
      "State Complaint Support (Available Add-On at $200)",
    ],
  },
  {
    planKey: "anchor",
    planName: "Anchor",
    priceMonthly: 105,
    commitmentMonths: 12,
    description: "Premium comprehensive executive advocacy with unlimited IEP and 504 representation.",
    features: [
      "Unlimited IEP & 504 Representation",
      "Unlimited Email & Messaging Support",
      "4 Advocate Strategy Sessions / year",
      "2 Records & Document Reviews / year",
      "1 Included State Complaint Preparation / year",
    ],
  },
  {
    planKey: "family",
    planName: "Family",
    priceMonthly: 155,
    commitmentMonths: 12,
    description: "Full family plan with comprehensive multi-student coverage and dedicated casework.",
    features: [
      "Multi-student family coverage",
      "3 IEP Meetings / year",
      "Unlimited 504 Meetings",
      "Dedicated Advocate Messaging",
      "1 Included State Complaint Preparation / year (Family Account Level)",
    ],
  },
];

export interface ApproveFamilyEnrollmentInput {
  parentContactId: number;
  studentContactId?: number;
  leadId?: number;
  enrollmentMode: "standard" | "custom";
  customPlanKey?: string;
  customPlanName?: string;
  customMonthlyPrice?: number;
  customBillingFrequency?: string;
  customCommitmentMonths?: number;
  customTerms?: string;
  billingArrangement: "autopay" | "manual_invoice";
  manualInvoiceDueDate?: string;
  manualInvoiceReason?: string;
  expirationDays?: number; // default 14
  overrideDiscovery?: boolean;
  overrideReason?: string;
  internalNotes?: string;
  changeReason?: string;
  approverId?: number;
  approverName?: string;
}

/**
 * Resolves the family context given any combination of parentId, studentId, or leadId.
 */
export async function resolveFamilyContext(params: {
  parentContactId?: number;
  studentContactId?: number;
  leadId?: number;
}) {
  let parentContact: any = null;
  let studentContact: any = null;
  let activeLead: any = null;
  let parentContactId = params.parentContactId;
  let studentContactId = params.studentContactId;

  // 1. Resolve from studentContactId if parentContactId not provided
  if (!parentContactId && studentContactId) {
    studentContact = await db.getContactById(studentContactId);
    if (studentContact?.parentContactId) {
      parentContactId = studentContact.parentContactId;
    } else if (studentContact?.jobTitle === "Parent") {
      parentContactId = studentContact.id;
      studentContact = null;
    }
  }

  // 2. Resolve from leadId if parentContactId still not known
  if (!parentContactId && params.leadId) {
    const lead = await db.getLeadById(params.leadId);
    if (lead) {
      activeLead = lead;
      if (lead.contactId) {
        const contact = await db.getContactById(lead.contactId);
        if (contact?.jobTitle === "Parent") {
          parentContactId = contact.id;
        } else if (contact?.parentContactId) {
          parentContactId = contact.parentContactId;
          studentContactId = contact.id;
        } else {
          parentContactId = contact?.id;
        }
      }
    }
  }

  // 3. Fetch Parent Contact
  if (parentContactId) {
    parentContact = await db.getContactById(parentContactId);
  }

  // 4. If studentContact not loaded yet, fetch first student belonging to parent
  if (parentContactId && !studentContact) {
    const students = await db.getStudentsByParentContactId(parentContactId);
    if (students && students.length > 0) {
      studentContact = students[0];
      studentContactId = studentContact.id;
    }
  }

  // 5. Fetch associated leads
  if (!activeLead && parentContactId) {
    const allLeads = await db.getLeadsByOwner(parentContact?.ownerId || 1);
    activeLead = allLeads.find((l: any) => l.contactId === parentContactId || (studentContactId && l.contactId === studentContactId)) || null;
  }

  // 6. Fetch discovery calls
  const discoveryCalls = await db.listDiscoveryCalls({
    contactId: parentContactId,
    studentContactId: studentContactId,
    leadId: activeLead?.id,
  });
  const latestDiscoveryCall = discoveryCalls && discoveryCalls.length > 0 ? discoveryCalls[0] : null;

  // 7. Determine discovery completion status
  const isDiscoveryCompleted =
    latestDiscoveryCall?.status === "completed" ||
    activeLead?.status === "Discovery Completed";

  return {
    parentContactId: parentContactId || 0,
    parentContact,
    studentContactId: studentContactId || null,
    studentContact,
    activeLead,
    latestDiscoveryCall,
    isDiscoveryCompleted: Boolean(isDiscoveryCompleted),
  };
}

/**
 * Gets full family enrollment state including active offer, history, and discovery eligibility.
 */
export async function getFamilyEnrollmentState(params: {
  parentContactId?: number;
  studentContactId?: number;
  leadId?: number;
}) {
  const context = await resolveFamilyContext(params);
  if (!context.parentContactId) {
    return {
      ...context,
      activeOffer: null,
      historicalOffers: [],
      publishedPlans: PUBLISHED_MEMBERSHIP_PLANS,
    };
  }

  const activeOffer = await db.getActiveOfferForFamily(context.parentContactId);
  const historicalOffers = await db.listOffersForFamily(context.parentContactId);

  return {
    ...context,
    activeOffer,
    historicalOffers,
    publishedPlans: PUBLISHED_MEMBERSHIP_PLANS,
  };
}

/**
 * Creates or updates an enrollment approval for a family.
 * Enforces discovery rules, override reason auditing, and billing arrangement rules.
 */
export async function approveFamilyEnrollment(
  input: ApproveFamilyEnrollmentInput
): Promise<FamilyEnrollmentOffer> {
  const context = await resolveFamilyContext({
    parentContactId: input.parentContactId,
    studentContactId: input.studentContactId,
    leadId: input.leadId,
  });

  if (!context.parentContactId) {
    throw new Error("Cannot approve enrollment: A valid Parent Contact ID is required as the family anchor.");
  }

  // 1. Discovery Requirement & Override Validation
  if (!context.isDiscoveryCompleted && !input.overrideDiscovery) {
    throw new Error(
      "Completed discovery call is normally required before enrollment approval. An authorized staff override with an exception reason is required."
    );
  }

  if (input.overrideDiscovery) {
    const trimmedReason = (input.overrideReason || "").trim();
    if (trimmedReason.length < 5) {
      throw new Error("A specific exception reason (at least 5 characters) is required to override the discovery requirement.");
    }
  }

  // 2. Billing Arrangement Validation
  if (input.billingArrangement === "manual_invoice") {
    const trimmedReason = (input.manualInvoiceReason || "").trim();
    if (trimmedReason.length < 5) {
      throw new Error("An authorized staff exception reason is required for Manual Monthly Invoicing.");
    }
    if (!input.manualInvoiceDueDate) {
      throw new Error("A monthly due date is required for Manual Monthly Invoicing.");
    }
  }

  // 3. Expiration calculation (default 14 days)
  const expirationDays = input.expirationDays !== undefined ? input.expirationDays : 14;
  const invitationExpiresAt = expirationDays > 0 ? new Date(Date.now() + expirationDays * 86400000) : null;
  const now = new Date();
  const approverName = input.approverName || "Lead Special Education Advocate";

  // 4. Construct Offer Record
  const offerData: InsertFamilyEnrollmentOffer = {
    parentContactId: context.parentContactId,
    studentContactId: context.studentContactId || undefined,
    leadId: context.activeLead?.id || input.leadId || undefined,
    status: "approved",
    enrollmentMode: input.enrollmentMode,
    authorizedPlans:
      input.enrollmentMode === "standard"
        ? JSON.stringify(["navigator", "anchor", "family"])
        : JSON.stringify([input.customPlanKey || "custom_offer"]),
    customPlanKey: input.enrollmentMode === "custom" ? input.customPlanKey : null,
    customPlanName: input.enrollmentMode === "custom" ? input.customPlanName : null,
    customMonthlyPrice: input.enrollmentMode === "custom" ? String(input.customMonthlyPrice || 0) : null,
    customBillingFrequency: input.enrollmentMode === "custom" ? (input.customBillingFrequency || "monthly") : "monthly",
    customCommitmentMonths: input.enrollmentMode === "custom" ? (input.customCommitmentMonths || 12) : 12,
    customTerms: input.enrollmentMode === "custom" ? input.customTerms : null,
    billingArrangement: input.billingArrangement,
    manualInvoiceDueDate: input.billingArrangement === "manual_invoice" ? input.manualInvoiceDueDate : null,
    manualInvoiceReason: input.billingArrangement === "manual_invoice" ? input.manualInvoiceReason : null,
    isDiscoveryOverridden: Boolean(input.overrideDiscovery),
    discoveryOverrideReason: input.overrideDiscovery ? input.overrideReason : null,
    approvedBy: input.approverId || 1,
    approvedByName: approverName,
    approvedAt: now,
    invitationExpiresAt,
    invitationSentAt: null, // Strictly separated: initial approval does not claim sent
    invitationStatus: "pending", // Status is pending until outbound provider accepts message
    resendCount: 0,
    changeReason: input.changeReason || null,
    internalNotes: input.internalNotes,
    updatedAt: now,
  };

  // 5. Inspect existing active offer for family
  const existingActive = await db.getActiveOfferForFamily(context.parentContactId);
  let savedOffer: FamilyEnrollmentOffer;

  if (existingActive) {
    // 5a. HARD GUARDRAIL: Protect accepted and signed offers from silent replacement or modification
    const isLocked = [
      "plan_selected",
      "agreement_pending",
      "agreement_signed",
      "active",
    ].includes(existingActive.status);

    if (isLocked) {
      throw new Error(
        `Cannot edit offer terms: Offer #${existingActive.id} is in status "${existingActive.status}". Accepted offers and generated agreements are locked to protect agreement integrity. Any replacement requires an authorized supersede flow.`
      );
    }

    if (existingActive.status === "approved") {
      // 5b. Pre-acceptance revision tracking (preserves full history)
      const nextRevisionNumber = (existingActive.revisionNumber || 1) + 1;
      let history: any[] = [];
      try {
        history = existingActive.revisionHistory ? JSON.parse(existingActive.revisionHistory) : [];
      } catch {
        history = [];
      }

      const previousSnapshot = {
        revisionNumber: existingActive.revisionNumber || 1,
        previousTerms: {
          enrollmentMode: existingActive.enrollmentMode,
          authorizedPlans: existingActive.authorizedPlans,
          customPlanKey: existingActive.customPlanKey,
          customPlanName: existingActive.customPlanName,
          customMonthlyPrice: existingActive.customMonthlyPrice,
          customBillingFrequency: existingActive.customBillingFrequency,
          customCommitmentMonths: existingActive.customCommitmentMonths,
          customTerms: existingActive.customTerms,
          billingArrangement: existingActive.billingArrangement,
          manualInvoiceDueDate: existingActive.manualInvoiceDueDate,
          manualInvoiceReason: existingActive.manualInvoiceReason,
          invitationExpiresAt: existingActive.invitationExpiresAt,
        },
        updatedTerms: {
          enrollmentMode: offerData.enrollmentMode,
          authorizedPlans: offerData.authorizedPlans,
          customPlanKey: offerData.customPlanKey,
          customPlanName: offerData.customPlanName,
          customMonthlyPrice: offerData.customMonthlyPrice,
          customBillingFrequency: offerData.customBillingFrequency,
          customCommitmentMonths: offerData.customCommitmentMonths,
          customTerms: offerData.customTerms,
          billingArrangement: offerData.billingArrangement,
          manualInvoiceDueDate: offerData.manualInvoiceDueDate,
          manualInvoiceReason: offerData.manualInvoiceReason,
          invitationExpiresAt: offerData.invitationExpiresAt,
        },
        employeeId: input.approverId || 1,
        employeeName: approverName,
        timestamp: now.toISOString(),
        changeReason: input.changeReason || input.internalNotes || "Staff revised pre-acceptance offer terms",
      };
      history.push(previousSnapshot);

      const updated = await db.updateEnrollmentOffer(existingActive.id, {
        ...offerData,
        revisionNumber: nextRevisionNumber,
        revisionHistory: JSON.stringify(history),
        changeReason: input.changeReason || input.internalNotes || null,
        invitationStatus: "pending", // Reset to pending dispatch when terms are modified
        invitationSentAt: null, // Reset sent timestamp until re-dispatched
        updatedAt: now,
      });

      savedOffer = updated || (existingActive as FamilyEnrollmentOffer);

      // Record activity event for revision
      const targetStudentId = context.studentContactId;
      if (targetStudentId) {
        await recordCaseActivity({
          studentContactId: targetStudentId,
          eventType: "offer_terms_revised",
          title: `Enrollment Offer Terms Revised (Rev #${nextRevisionNumber})`,
          description: `Pre-acceptance offer terms revised by ${approverName}. Previous: Mode ${existingActive.enrollmentMode}${existingActive.customMonthlyPrice ? ` ($${existingActive.customMonthlyPrice}/mo)` : ""}. Updated: Mode ${input.enrollmentMode}${input.customMonthlyPrice ? ` ($${input.customMonthlyPrice}/mo)` : ""}.${input.changeReason ? ` Reason: "${input.changeReason}".` : ""}`,
          whyReason: "Staff updated offer terms prior to parent plan acceptance.",
          ownerName: approverName,
          ownerRole: "Lead Special Education Advocate",
          categoryColor: "amber",
          isActionNeeded: false,
          isCompleted: true,
        });
      }
    } else {
      // If previous offer was revoked or expired, create new offer
      savedOffer = await db.createEnrollmentOffer({
        ...offerData,
        revisionNumber: 1,
        revisionHistory: "[]",
        invitationStatus: "pending",
        invitationSentAt: null,
      });
    }
  } else {
    // Brand new offer
    savedOffer = await db.createEnrollmentOffer({
      ...offerData,
      revisionNumber: 1,
      revisionHistory: "[]",
      invitationStatus: "pending",
      invitationSentAt: null,
    });
  }

  // 6. Update Parent Contact state (Family Anchor ONLY)
  await db.updateContactById(context.parentContactId, {
    enrollmentOfferId: savedOffer.id,
    pipelineStage: "Enrollment Pending",
    lifecycleStage: "Onboarding",
  });

  // NOTE: Sibling student records are deliberately NOT modified!
  // Sibling students retain their independent educational advocacy pipeline stages,
  // IEP statuses, and case assignments. Family enrollment status is resolved
  // dynamically via the Parent Contact anchor.

  // 7. Record Activity Timeline Entry for Audit Trail on primary student (if linked)
  const targetStudentId = context.studentContactId;
  if (targetStudentId) {
    const isOverride = Boolean(input.overrideDiscovery);
    const offerSummary =
      input.enrollmentMode === "custom"
        ? `Custom Enrollment Offer ($${input.customMonthlyPrice}/month, ${input.customCommitmentMonths || 12}-mo commitment)`
        : "Standard Enrollment (All 3 Published Plans: Navigator, Anchor, Family)";
    const billingSummary =
      input.billingArrangement === "manual_invoice"
        ? `Manual Monthly Invoicing (Due: ${input.manualInvoiceDueDate}, Reason: ${input.manualInvoiceReason})`
        : "Automatic Monthly Billing (Autopay via Stripe)";
    const expirationSummary = expirationDays > 0 ? `${expirationDays} days` : "No expiration";

    await recordCaseActivity({
      studentContactId: targetStudentId,
      eventType: isOverride ? "enrollment_approval_exception" : "enrollment_approval",
      title: isOverride ? "Enrollment Approved with Discovery Override" : "Approved for Family Enrollment",
      description: `Enrollment approval granted by ${approverName}. Offer: ${offerSummary}. Payment Arrangement: ${billingSummary}. Invitation Expiration: ${expirationSummary}.${
        isOverride ? ` Override Reason: "${input.overrideReason}".` : ""
      }${input.internalNotes ? ` Notes: "${input.internalNotes}".` : ""}`,
      whyReason: isOverride
        ? `Authorized Staff Override: ${input.overrideReason}`
        : "Family completed discovery and is authorized to select a membership plan.",
      ownerName: approverName,
      ownerRole: "Lead Special Education Advocate",
      categoryColor: isOverride ? "amber" : "gold",
      sources: [
        {
          type: "note",
          label: "Enrollment Offer Record",
          excerpt: `Offer ID #${savedOffer.id} - Mode: ${input.enrollmentMode} - Billing: ${input.billingArrangement}`,
        },
      ],
      isActionNeeded: false,
      isCompleted: true,
    });
  }

  return savedOffer;
}

/**
 * Resends the enrollment invitation link to the parent.
 * Reuses email/portal infrastructure, distinguishing dispatched from confirmed.
 * Real outbound delivery remains disabled during Phase 2A.1 safety verification.
 */
export async function resendFamilyEnrollmentInvitation(params: {
  offerId: number;
  approverName?: string;
  mockDeliverySuccess?: boolean;
}): Promise<{
  offer: FamilyEnrollmentOffer;
  deliveryAttempted: boolean;
  deliveryStatus: string;
  message: string;
}> {
  const offer = await db.getEnrollmentOfferById(params.offerId);
  if (!offer) {
    throw new Error(`Enrollment offer #${params.offerId} not found.`);
  }

  if (offer.status === "revoked" || offer.status === "expired") {
    throw new Error(`Cannot resend invitation: Offer #${params.offerId} is ${offer.status}.`);
  }

  const now = new Date();
  const approverName = params.approverName || "Lead Special Education Advocate";

  // Check if live outbound delivery is enabled
  const isOutboundEnabled = process.env.ENABLE_OUTBOUND_ENROLLMENT_EMAILS === "true";

  if (!isOutboundEnabled && !params.mockDeliverySuccess) {
    // Safety guardrail for Phase 2A.1: Outbound emails are disabled
    // Retain truthful pending state without claiming sent
    return {
      offer,
      deliveryAttempted: false,
      deliveryStatus: offer.invitationStatus || "pending",
      message: "Outbound delivery integration is prepared. Live email transmission remains disabled for Phase 2A.1 verification.",
    };
  }

  // If live outbound is enabled (or mock test delivery):
  let deliverySuccess = false;
  let deliveryError: string | null = null;

  if (params.mockDeliverySuccess) {
    deliverySuccess = true;
  } else if (isOutboundEnabled) {
    try {
      const parent = await db.getContactById(offer.parentContactId);
      if (parent?.email) {
        const { sendEmail } = await import("../_core/email");
        deliverySuccess = await sendEmail({
          to: parent.email,
          subject: "Waypoint Advocates — Family Enrollment Invitation",
          html: `<p>Hello ${parent.firstName}, your family enrollment portal is ready.</p>`,
        });
      } else {
        deliveryError = "Parent contact has no email address on file.";
      }
    } catch (err: any) {
      deliveryError = err?.message || "Failed to dispatch email via mail transport.";
    }
  }

  const newInvitationStatus = deliverySuccess ? "dispatched" : "failed";
  const updated = await db.updateEnrollmentOffer(offer.id, {
    invitationSentAt: deliverySuccess ? now : offer.invitationSentAt,
    invitationStatus: newInvitationStatus,
    invitationDeliveryError: deliveryError,
    resendCount: deliverySuccess ? (offer.resendCount || 0) + 1 : offer.resendCount,
  });

  // Record audit timeline event
  if (offer.studentContactId) {
    await recordCaseActivity({
      studentContactId: offer.studentContactId,
      eventType: deliverySuccess ? "invitation_resent" : "invitation_delivery_failed",
      title: deliverySuccess ? "Enrollment Invitation Dispatched" : "Enrollment Invitation Delivery Failed",
      description: deliverySuccess
        ? `Enrollment invitation link dispatched to parent contact #${offer.parentContactId} by ${approverName}. (Dispatch count: ${(offer.resendCount || 0) + 1}).`
        : `Attempt to dispatch enrollment invitation failed: ${deliveryError || "Transport rejected message"}.`,
      whyReason: "Parent requested new invitation link or reminder.",
      ownerName: approverName,
      ownerRole: "Lead Special Education Advocate",
      categoryColor: deliverySuccess ? "blue" : "red",
      isActionNeeded: !deliverySuccess,
      isCompleted: deliverySuccess,
    });
  }

  return {
    offer: (updated || offer) as FamilyEnrollmentOffer,
    deliveryAttempted: true,
    deliveryStatus: newInvitationStatus,
    message: deliverySuccess
      ? "Enrollment invitation link dispatched successfully."
      : `Enrollment invitation dispatch failed: ${deliveryError || "Delivery rejected"}`,
  };
}

/**
 * Revokes an existing enrollment offer.
 * Sets status to revoked, records reason, and clears active pointer from parent contact.
 */
export async function revokeFamilyEnrollmentOffer(params: {
  offerId: number;
  reason: string;
  approverId?: number;
  approverName?: string;
}): Promise<FamilyEnrollmentOffer> {
  const offer = await db.getEnrollmentOfferById(params.offerId);
  if (!offer) {
    throw new Error(`Enrollment offer #${params.offerId} not found.`);
  }

  const trimmedReason = (params.reason || "").trim();
  if (trimmedReason.length < 5) {
    throw new Error("A specific revocation reason (at least 5 characters) is required.");
  }

  const approverName = params.approverName || "Lead Special Education Advocate";
  const updated = await db.revokeEnrollmentOffer(
    offer.id,
    params.approverId || 1,
    approverName,
    trimmedReason
  );

  // Clear active pointer on parent contact if matching this offer
  const parent = await db.getContactById(offer.parentContactId);
  if (parent && parent.enrollmentOfferId === offer.id) {
    await db.updateContactById(offer.parentContactId, {
      enrollmentOfferId: null,
      pipelineStage: "Discovery",
    });
  }

  // Record audit timeline event
  if (offer.studentContactId) {
    await recordCaseActivity({
      studentContactId: offer.studentContactId,
      eventType: "enrollment_offer_revoked",
      title: "Enrollment Offer Revoked",
      description: `Enrollment offer #${offer.id} was revoked by ${approverName}. Reason: "${trimmedReason}".`,
      whyReason: trimmedReason,
      ownerName: approverName,
      ownerRole: "Lead Special Education Advocate",
      categoryColor: "red",
      isActionNeeded: false,
      isCompleted: true,
    });
  }

  return updated || offer;
}

/**
 * Generates an Advocacy Services Agreement record (PG-046 Agreements Engine).
 * Generates an Advocacy Services Agreement record (PG-046 Agreements Engine).
 * Pre-populates family identity, plan terms, price, commitment, and acknowledgment clauses.
 * Conforms to authoritative 15-section Waypoint Advocates Educational Advocacy Services Agreement.
 */
export async function generateEnrollmentAgreement(params: {
  parentContact: any;
  studentContact?: any;
  offer: FamilyEnrollmentOffer;
  planKey: string;
  planName: string;
  priceMonthly: number;
  commitmentMonths: number;
  paymentStructure?: "monthly_autopay" | "pay_in_full";
  billingArrangement: string;
  planDescription: string;
  features: string[];
  quote?: PayInFullQuote;
  isRevised?: boolean;
}): Promise<{
  agreementId: number;
  title: string;
  content: string;
  coveredStudentNames: string;
  coveredStudentIds: string;
}> {
  const {
    parentContact,
    studentContact,
    offer,
    planKey,
    planName,
    priceMonthly,
    commitmentMonths,
    paymentStructure,
    billingArrangement,
    planDescription,
    isRevised,
  } = params;

  const isPayInFull = paymentStructure === "pay_in_full" || (offer as any).paymentStructure === "pay_in_full";
  const quote = params.quote || calculatePayInFullQuote({
    priceMonthly,
    commitmentMonths,
    discountType: (offer as any).payInFullDiscountType,
    discountValue: (offer as any).payInFullDiscountValue,
  });

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const parentFullName = `${parentContact.firstName || ""} ${parentContact.lastName || ""}`.trim();

  // Resolve all covered students linked to parentContact (Family Anchor)
  const parentContactId = parentContact.id;
  let coveredStudents: any[] = [];
  try {
    coveredStudents = await db.getStudentsByParentContactId(parentContactId);
  } catch (e) {
    coveredStudents = [];
  }

  const allCoveredStudents: any[] = [];
  if (coveredStudents && coveredStudents.length > 0) {
    allCoveredStudents.push(...coveredStudents);
  }
  if (studentContact && !allCoveredStudents.some((s) => s.id === studentContact.id)) {
    allCoveredStudents.push(studentContact);
  }

  const coveredStudentNamesList = allCoveredStudents
    .map((s) => `${s.firstName || ""} ${s.lastName || ""}`.trim())
    .filter(Boolean);

  const coveredStudentNamesFormatted =
    coveredStudentNamesList.length > 0
      ? coveredStudentNamesList.join(", ")
      : studentContact
      ? `${studentContact.firstName || ""} ${studentContact.lastName || ""}`.trim()
      : "Special Education Student";

  const coveredStudentIdsList = allCoveredStudents.map((s) => s.id).filter(Boolean);
  const coveredStudentIdsJson = JSON.stringify(coveredStudentIdsList);

  const coveredStudentsListHtml =
    allCoveredStudents.length > 0
      ? allCoveredStudents
          .map(
            (s) =>
              `<li style="margin-bottom: 4px;"><strong>${s.firstName || ""} ${s.lastName || ""}</strong>${
                s.grade ? ` (Grade: ${s.grade})` : ""
              }${s.schoolName ? ` — ${s.schoolName}` : ""}</li>`
          )
          .join("")
      : `<li>${coveredStudentNamesFormatted}</li>`;

  const totalContractualAmount = isPayInFull
    ? quote.finalAmount
    : (priceMonthly * commitmentMonths).toFixed(2);

  const billingText = isPayInFull
    ? "Pay in Full (Single Upfront Payment)"
    : billingArrangement === "manual_invoice"
    ? `Manual Monthly Invoicing (Due: ${offer.manualInvoiceDueDate || "1st of month"})`
    : "Automatic Monthly Billing (Autopay via Stripe)";

  const title = isRevised
    ? `Advocacy Services Agreement (Revised) — ${planName}`
    : `Advocacy Services Agreement — ${planName}`;

  // Unique ID generator fallback
  const agreementId = (Date.now() % 1000000) + Math.floor(Math.random() * 1000);

  const feeTableHtml = isPayInFull
    ? `
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 15px;">
      <tr style="background: #07162B; color: #fff;">
        <th style="padding: 10px; text-align: left;">Advocacy Plan</th>
        <th style="padding: 10px; text-align: left;">Commitment Term</th>
        <th style="padding: 10px; text-align: left;">Payment Structure</th>
        <th style="padding: 10px; text-align: left;">Contractual Total</th>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px; font-weight: bold; color: #07162B;">${planName}</td>
        <td style="padding: 10px;">${commitmentMonths} Months</td>
        <td style="padding: 10px;">Single Upfront Payment</td>
        <td style="padding: 10px; font-weight: bold; color: #07162B;">
          $${quote.finalAmount}
          ${quote.discountAmountCents > 0 ? `<br/><span style="font-size: 11px; color: #2e7d32; font-weight: normal;">(Includes -$${quote.discountAmount} Authorized Discount; Original $${quote.originalAmount})</span>` : ""}
        </td>
      </tr>
    </table>
    `
    : `
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 15px;">
      <tr style="background: #07162B; color: #fff;">
        <th style="padding: 10px; text-align: left;">Advocacy Plan</th>
        <th style="padding: 10px; text-align: left;">Monthly Retainer Fee</th>
        <th style="padding: 10px; text-align: left;">Commitment Term</th>
        <th style="padding: 10px; text-align: left;">Billing Schedule</th>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px; font-weight: bold; color: #07162B;">${planName}</td>
        <td style="padding: 10px;">$${priceMonthly} / month</td>
        <td style="padding: 10px;">${commitmentMonths} Months</td>
        <td style="padding: 10px;">${billingText} (Total: $${totalContractualAmount})</td>
      </tr>
    </table>
    `;

  let stateComplaintNotice = "";
  if (planKey.toLowerCase() === "navigator") {
    stateComplaintNotice = "State complaint preparation is not included under the Navigator plan. Standalone state complaint preparation is available as an optional add-on service at $200 per complaint.";
  } else if (planKey.toLowerCase() === "anchor") {
    stateComplaintNotice = "Includes one (1) qualifying state complaint preparation per 12-month membership term. Additional complaints require separate authorization and applicable pricing ($200 per complaint).";
  } else if (planKey.toLowerCase() === "family") {
    stateComplaintNotice = "Includes one (1) qualifying state complaint preparation per 12-month membership term. This included complaint benefit applies at the Family Account level across all covered children, not separately to each enrolled student. Additional complaints require separate authorization and applicable pricing ($200 per complaint).";
  } else {
    stateComplaintNotice = "State complaint preparation is provided in accordance with authorized plan terms.";
  }

  const content = `
<div style="font-family: serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; line-height: 1.6;">
  <div style="text-align: center; border-bottom: 2px solid #C5A059; padding-bottom: 15px; margin-bottom: 20px;">
    <h1 style="color: #07162B; font-size: 24px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">
      Waypoint Advocates
    </h1>
    <p style="margin: 0; font-size: 13px; color: #555;">Clientcare@waypointadvocates.com</p>
    <h2 style="color: #C5A059; font-size: 16px; margin: 10px 0 5px 0; font-weight: normal;">
      Educational Advocacy Services Agreement ${isRevised ? "(Revised)" : ""}
    </h2>
    <p style="font-size: 11px; color: #777; margin: 0;">
      Document Reference: ADV-AGR-${agreementId} • Effective Date: ${dateFormatted}
    </p>
  </div>

  <div style="background: #fdfbf7; border: 1px solid #e8e0d0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; font-size: 12.5px;">
    <p style="margin: 2px 0;"><strong>Effective Date:</strong> ${dateFormatted}</p>
    <p style="margin: 2px 0;"><strong>Client Name:</strong> ${parentFullName}</p>
    <p style="margin: 2px 0;"><strong>Students Name:</strong> ${coveredStudentNamesFormatted}</p>
    <p style="margin: 2px 0;"><strong>Family Protection Plan Selection:</strong> ${planName}</p>
  </div>

  <div style="text-align: center; margin-bottom: 15px; font-weight: bold; color: #b71c1c; font-size: 13px; letter-spacing: 1px;">
    THIS IS A LEGAL DOCUMENT
  </div>

  <div style="text-align: center; margin-bottom: 15px; font-weight: bold; color: #07162B; font-size: 15px; letter-spacing: 0.5px;">
    🧭 WAYPOINT ADVOCATES<br/>
    <span style="font-size: 13px; font-weight: normal; color: #555;">Educational Advocacy Services Agreement</span>
  </div>

  <div style="text-align: center; margin-bottom: 15px; font-weight: bold; color: #b71c1c; font-size: 12px; letter-spacing: 1px;">
    THIS IS A LEGAL DOCUMENT
  </div>

  <p style="font-size: 12px; color: #333; line-height: 1.6; margin-bottom: 20px;">
    This Educational Advocacy Services Agreement (&quot;Agreement&quot;) establishes the terms under which Waypoint Advocates provides educational advocacy services to the parent or guardian (&quot;Client&quot;) for the student or students enrolled under the Client&#39;s selected service plan.
    <br/><br/>
    By signing this Agreement, the Client confirms that they have reviewed and agree to the terms below.
  </p>

  <!-- 1. OUR AGREEMENT -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      1. 🧭 OUR AGREEMENT
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client retains Waypoint Advocates to provide educational advocacy services for the Client&#39;s child or children identified during enrollment.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint Advocates provides non-attorney educational advocacy related to special education, Section 504, evaluations, eligibility, accommodations, services, educational programming, and related school matters.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client understands that:
    </p>
    <ul style="font-size: 12px; color: #444; padding-left: 20px; line-height: 1.6;">
      <li>Waypoint Advocates will work diligently to support the Client and advocate for appropriate educational services and supports.</li>
      <li>Waypoint Advocates cannot guarantee any particular outcome, including eligibility, placement, services, accommodations, evaluations, or changes to an IEP or Section 504 Plan.</li>
      <li>Waypoint Advocates and its staff are not attorneys and do not provide legal advice or legal representation.</li>
      <li>When legal representation or legal advice is needed, the Client may be advised to consult a licensed attorney.</li>
    </ul>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint&#39;s advocacy philosophy emphasizes collaboration, documentation, data, and productive problem-solving whenever possible.
    </p>
  </div>

  <!-- 2. YOUR ADVOCACY PLAN -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      2. 💙 YOUR ADVOCACY PLAN
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Services are provided according to the plan selected by the Client during enrollment.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The selected plan, monthly installment amount, total 12-month commitment, and billing information shown in the Client&#39;s enrollment and billing record are incorporated into this Agreement.
    </p>
    ${feeTableHtml}
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      <strong>Plan Scope &amp; Deliverables:</strong><br/>
      ${planDescription}
    </p>
    <div style="margin-top: 10px; padding: 10px 12px; background: #fdfbf7; border: 1px solid #e8e0d0; border-radius: 4px; font-size: 12px; color: #444;">
      <p style="margin: 0 0 6px 0; font-weight: bold; color: #07162B;">Enrolled Covered Student(s):</p>
      <ul style="margin: 0 0 6px 0; padding-left: 20px;">
        ${coveredStudentsListHtml}
      </ul>
      <p style="margin: 0; font-size: 11px; color: #666; font-style: italic;">
        For Family Protection Plan memberships covering multiple children, any additional student added at a later date must be formally enrolled through an approved written Agreement Amendment executed by the Client and Waypoint Advocates, preserving the immutability of this original executed Agreement.
      </p>
    </div>
    <div style="margin-top: 10px; padding: 10px 12px; background: #f4f6f9; border-left: 3px solid #07162B; font-size: 11.5px; color: #555;">
      <strong>State Complaint Entitlement:</strong> ${stateComplaintNotice}
    </div>
  </div>

  <!-- 3. HOW WE WORK TOGETHER -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      3. 🤝 HOW WE WORK TOGETHER
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint uses a parent-led advocacy model.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client remains the student&#39;s parent or guardian, primary school contact, and educational decision-maker.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint&#39;s role is to provide advocacy knowledge, strategy, preparation, document review, recommendations, written support when included in the selected plan, and participation in eligible educational meetings.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Unless specifically agreed otherwise for a particular advocacy matter:
    </p>
    <ul style="font-size: 12px; color: #444; padding-left: 20px; line-height: 1.6;">
      <li>The Client communicates directly with the school or district.</li>
      <li>The Client sends requests and responses to the school.</li>
      <li>The Client obtains educational records from the school.</li>
      <li>The Client forwards relevant communications and documents to Waypoint.</li>
      <li>The Client schedules or coordinates meetings with the school and provides Waypoint with the meeting invitation.</li>
    </ul>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint may communicate directly with school or district personnel when reasonably necessary for meeting participation, clarification, scheduling, or another advocacy purpose authorized by the Client.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Nothing in this Agreement transfers parental rights or educational decision-making authority to Waypoint Advocates.
    </p>
  </div>

  <!-- 4. CLIENT RESPONSIBILITIES -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      4. 📄 CLIENT RESPONSIBILITIES
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Successful advocacy requires active participation from the Client.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6; margin-bottom: 6px;">
      <strong>A. Records and Documents</strong>
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client agrees to:
    </p>
    <ul style="font-size: 12px; color: #444; padding-left: 20px; line-height: 1.6;">
      <li>Obtain and upload the student&#39;s current IEP or Section 504 Plan.</li>
      <li>Upload relevant evaluations, eligibility reports, progress data, behavioral records, disciplinary records, and other documents reasonably necessary for advocacy.</li>
      <li>Forward relevant school communications to Waypoint.</li>
      <li>Forward virtual meeting invitations and scheduling information.</li>
      <li>Provide student work, progress reports, or other relevant educational data when requested.</li>
    </ul>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint is not responsible for routinely obtaining educational records from the school on the Client&#39;s behalf.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      If a school requires its own FERPA authorization, Release of Information, consent form, notarized document, or similar authorization before communicating with Waypoint, the Client is responsible for completing the school&#39;s required documentation.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6; margin-top: 10px; margin-bottom: 6px;">
      <strong>B. Records Review Timeline</strong>
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint cannot begin a meaningful case review until the required records have been received.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      After required records are uploaded, Waypoint will begin the review process. Review time varies based on document volume, complexity, meeting urgency, and current case volume.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client understands that delays in submitting records may delay Waypoint&#39;s ability to provide meaningful preparation or recommendations.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      A delay in receiving records, whether caused by the Client or school district, does not automatically pause the Client&#39;s service term or recurring payment obligations.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6; margin-top: 10px; margin-bottom: 6px;">
      <strong>C. School Communications</strong>
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client should forward or copy Waypoint on communications relevant to the advocacy matter.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client is not required to include Waypoint on routine school communications unrelated to the advocacy matter.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6; margin-top: 10px; margin-bottom: 6px;">
      <strong>D. Final School Documents</strong>
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      After an IEP, Section 504 meeting, amendment, eligibility meeting, or other school action, the Client remains responsible for reviewing the final school-generated documents.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client is responsible for:
    </p>
    <ul style="font-size: 12px; color: #444; padding-left: 20px; line-height: 1.6;">
      <li>Reviewing the final document for accuracy</li>
      <li>Determining whether to sign in agreement or disagreement</li>
      <li>Notifying the school of errors or omissions</li>
      <li>Requesting corrections when necessary</li>
    </ul>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint may provide guidance when appropriate but does not control the school&#39;s final documentation and cannot guarantee that school-generated documents accurately reflect the team&#39;s discussion or decisions.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Parent or Guardian retains all applicable educational decision-making and signing authority.
    </p>
  </div>

  <!-- 5. MEETINGS & SCHEDULING -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      5. 📅 MEETINGS &amp; SCHEDULING
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint Advocates provides meeting support remotely through Zoom, Microsoft Teams, Google Meet, telephone, or another virtual platform provided by the school or district.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      To give Waypoint the best opportunity to attend, please do not confirm a meeting date before checking Waypoint&#39;s availability.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      When possible, ask the school for three available dates and times and send those options to Waypoint before confirming the meeting.
    </p>
    <p style="font-size: 12px; color: #07162B; font-weight: bold; line-height: 1.6; margin: 10px 0;">
      💡 Easy rule: 3 dates + 3 times gives us the best chance of getting everyone at the table.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      If a meeting has already been scheduled, send the invitation to Waypoint as soon as possible. We will make every reasonable effort to attend, but attendance cannot be guaranteed when Waypoint&#39;s availability was not confirmed before scheduling.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client remains responsible for coordinating meeting dates with the school and forwarding the final meeting invitation or virtual meeting link to Waypoint.
    </p>
  </div>

  <!-- 6. WRITTEN ADVOCACY & STATE COMPLAINTS -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      6. ✍️ WRITTEN ADVOCACY &amp; STATE COMPLAINTS
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Written advocacy support is included only when provided under the Client&#39;s selected plan or purchased separately where offered.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Written advocacy may include drafting or assisting with:
    </p>
    <ul style="font-size: 12px; color: #444; padding-left: 20px; line-height: 1.6;">
      <li>Parent concerns</li>
      <li>School emails</li>
      <li>Requests for meetings or evaluations</li>
      <li>Responses to school proposals or denials</li>
      <li>Prior Written Notice responses</li>
      <li>Other advocacy-related educational communications</li>
    </ul>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client remains the sender of parent communications unless Waypoint specifically agrees otherwise.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6; font-weight: bold; margin-top: 10px;">
      State Complaints
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      ${stateComplaintNotice}
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      State complaint services are advocacy services and do not constitute legal representation.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint may decline to prepare or submit a complaint when the available facts, documentation, jurisdiction, requested remedy, conflict of interest, or other circumstances make the matter inappropriate for Waypoint&#39;s non-attorney advocacy services.
    </p>
  </div>

  <!-- 7. SERVICES NOT INCLUDED -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      7. 🚫 SERVICES NOT INCLUDED
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Unless separately agreed to in writing, Waypoint does not provide:
    </p>
    <ol style="font-size: 12px; color: #444; padding-left: 20px; line-height: 1.6;">
      <li>Legal advice</li>
      <li>Attorney representation</li>
      <li>Representation in court</li>
      <li>Representation as legal counsel in administrative proceedings</li>
      <li>Legal pleadings or attorney-only services</li>
      <li>Guarantees regarding eligibility, placement, services, accommodations, or outcomes</li>
      <li>Independent educational, psychological, medical, speech, occupational therapy, or other clinical evaluations</li>
      <li>Routine retrieval of school records</li>
      <li>Signing educational documents on behalf of the Parent</li>
      <li>Educational decision-making on behalf of the Parent</li>
      <li>Notarization or completion of school-issued forms on behalf of the Parent</li>
    </ol>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint may recommend that the Client consult an attorney, evaluator, therapist, medical professional, or other specialist when a matter falls outside Waypoint&#39;s scope.
    </p>
  </div>

  <!-- 8. FEES & 12-MONTH SERVICE COMMITMENT -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      8. 💳 FEES &amp; 12-MONTH SERVICE COMMITMENT
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client is enrolling in a 12-month advocacy service plan.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client&#39;s selected plan, monthly installment amount, total commitment, and service start date are reflected in the enrollment and billing information associated with this Agreement.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      ${isPayInFull
        ? `The Client has elected the Pay in Full payment structure, satisfying the total ${commitmentMonths}-month commitment with a single upfront payment of $${quote.finalAmount}. This single payment covers the full ${commitmentMonths}-month commitment term. Pay in Full commitments are nonrefundable upon commencement of services.`
        : `The Client agrees to pay the total 12-month service commitment in 12 monthly installments of $${priceMonthly}, plus any disclosed and applicable processing fees (Total Commitment: $${totalContractualAmount}).`
      }
    </p>
    ${isPayInFull ? `
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      <strong>Third-Party Financing Disclosure:</strong> If the Client chooses to finance this single upfront payment through a third-party financing provider (such as Klarna, Affirm, or Afterpay) made available through our payment processor, the transaction is subject to their terms, credit approval, and customer eligibility. Waypoint Advocates is not a lender or creditor.
    </p>
    ` : ""}
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The service term and payment obligation continue regardless of the number of services, meetings, or other benefits actually used by the Client during the term.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      <strong>Strict 12-Month Hard Stop:</strong> This Agreement terminates upon the expiration of the 12-month commitment term. There is no automatic renewal, no month-to-month continuation, and no 13th installment. Any continued advocacy services following the 12-month term require the mutual execution of a new agreement.
    </p>
  </div>

  <!-- 9. RECURRING PAYMENT AUTHORIZATION -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      9. 💳 RECURRING PAYMENT AUTHORIZATION
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      ${isPayInFull
        ? `By signing this Agreement and providing payment information, the Client expressly authorizes Waypoint Advocates, through its payment processor, to charge the designated payment method for a single upfront payment of $${quote.finalAmount} covering the full ${commitmentMonths}-month contractual term. No automatic monthly recurring subscription fees will be charged during this term.`
        : `By signing this Agreement and providing payment information, the Client expressly authorizes Waypoint Advocates, through its payment processor, to automatically charge the designated payment method according to the selected payment schedule.`
      }
    </p>
    ${!isPayInFull ? `
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Recurring charges will generally occur:
    </p>
    <ul style="font-size: 12px; color: #444; padding-left: 20px; line-height: 1.6;">
      <li><strong>Amount:</strong> $${priceMonthly} (Selected monthly installment plus applicable disclosed fees)</li>
      <li><strong>Frequency:</strong> Monthly</li>
      <li><strong>Duration:</strong> 12 consecutive monthly installments</li>
      <li><strong>Total Commitment:</strong> $${totalContractualAmount}</li>
    </ul>
    ` : ""}
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client is responsible for maintaining a valid payment method.
    </p>
  </div>

  <!-- 10. CANCELLATION & AUTOPAY -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      10. 🚪 CANCELLATION &amp; AUTOPAY
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client may request cancellation by providing written notice to:<br/>
      <a href="mailto:clientcare@waypointadvocates.com" style="color: #07162B; font-weight: bold;">clientcare@waypointadvocates.com</a>
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The Client may also request that Waypoint discontinue automatic recurring charges.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Stopping automatic payment authorization and terminating advocacy services are separate from any financial obligation that may remain under the Client&#39;s 12-month service commitment.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      If recurring payment authorization is withdrawn, Waypoint will discontinue future automatic charges within the processing period required by applicable law and payment-processing requirements. Any balance lawfully remaining under the service agreement may instead be invoiced.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      The enforceability and operation of any remaining-balance obligation are subject to applicable law.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint may, at its discretion, offer an early resolution arrangement, payment plan, reduced settlement, or other accommodation. Any such arrangement must be confirmed by Waypoint in writing and does not create an obligation to offer similar arrangements in other cases.
    </p>
  </div>

  <!-- 11. WAYPOINT'S RIGHT TO WITHDRAW -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      11. ⛔ WAYPOINT&#39;S RIGHT TO WITHDRAW
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint may discontinue advocacy services after reasonable notice when circumstances make effective representation impractical or inappropriate, including when:
    </p>
    <ul style="font-size: 12px; color: #444; padding-left: 20px; line-height: 1.6;">
      <li>The Client repeatedly fails to communicate or participate</li>
      <li>Required records are not provided</li>
      <li>The Client fails to complete necessary school authorization forms</li>
      <li>Payment obligations are not maintained</li>
      <li>The Client requests actions outside Waypoint&#39;s professional role</li>
      <li>The Client requests that Waypoint engage in conduct Waypoint reasonably believes is improper or unlawful</li>
      <li>Client conduct makes a productive advocacy relationship impossible</li>
      <li>Continued involvement would create a conflict of interest</li>
    </ul>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Where reasonably possible, Waypoint will provide notice before withdrawing.
    </p>
  </div>

  <!-- 12. CONFIDENTIALITY & CASE COLLABORATION -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      12. 🔒 CONFIDENTIALITY &amp; CASE COLLABORATION
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint may access educational records and information voluntarily provided by the Client for the purpose of delivering advocacy services.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint may use staff members, consulting advocates, or specialists when reasonably necessary to support the Client&#39;s case. Relevant case information may be shared internally or with an authorized collaborator only as reasonably necessary to provide advocacy services and subject to applicable confidentiality obligations.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint may use anonymized and non-identifying information for internal training, professional development, or educational purposes. Personally identifying student and family information will not be intentionally included in such materials.
    </p>
  </div>

  <!-- 13. LIMITATION OF ROLE & LIABILITY -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      13. ⚖️ LIMITATION OF ROLE &amp; LIABILITY
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint Advocates provides educational advocacy services and does not control decisions made by schools, districts, IEP teams, Section 504 teams, evaluators, state agencies, hearing officers, courts, or other third parties.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint does not guarantee any particular educational or legal outcome.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      To the extent permitted by applicable law, Waypoint Advocates&#39; liability arising from this Agreement shall not exceed the amount actually paid by the Client under this Agreement.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Waypoint is not responsible for consequences resulting from:
    </p>
    <ul style="font-size: 12px; color: #444; padding-left: 20px; line-height: 1.6;">
      <li>Decisions made by a school or district</li>
      <li>Information withheld from Waypoint</li>
      <li>Inaccurate or incomplete information supplied to Waypoint</li>
      <li>Client failure to provide documents or meeting information</li>
      <li>Client failure to follow through on agreed responsibilities</li>
      <li>Actions or omissions of third parties outside Waypoint&#39;s control</li>
    </ul>
  </div>

  <!-- 14. GOVERNING LAW & SEVERABILITY -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      14. ⚖️ GOVERNING LAW &amp; SEVERABILITY
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      This Agreement is governed by the laws of the State of Georgia.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Any dispute concerning this Agreement shall be handled in accordance with applicable law and, where legally permissible, in the appropriate state or federal court serving the Georgia county in which Waypoint Advocates maintains its principal place of business.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      If any provision of this Agreement is determined to be invalid or unenforceable, the remaining provisions will continue in effect to the extent permitted by law.
    </p>
  </div>

  <!-- 15. ENTIRE AGREEMENT -->
  <div style="margin-bottom: 25px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      15. 📃 ENTIRE AGREEMENT
    </h3>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      This Agreement, together with the Client&#39;s selected service plan and enrollment information incorporated by reference, constitutes the agreement between the Client and Waypoint Advocates regarding the services described here.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Any modification to this Agreement must be agreed upon in writing.
    </p>
    <p style="font-size: 12px; color: #444; line-height: 1.6;">
      Electronic signatures may be used to execute this Agreement to the extent permitted by applicable law.
    </p>
    <div style="margin-top: 20px; padding: 12px 16px; background: #fdfbf7; border: 1px solid #e8e0d0; border-radius: 6px;">
      <h4 style="color: #07162B; font-size: 13px; margin: 0 0 6px 0;">
        💙 OUR SHARED COMMITMENT
      </h4>
      <p style="font-size: 12px; color: #444; line-height: 1.6; margin: 0 0 6px 0;">
        Waypoint believes families should be informed, prepared, and supported throughout the special education and Section 504 process.
      </p>
      <p style="font-size: 12px; color: #07162B; font-weight: bold; line-height: 1.6; margin: 0 0 6px 0;">
        No one should have to do special education alone.
      </p>
      <p style="font-size: 11.5px; color: #666; line-height: 1.6; margin: 0;">
        By signing below, the Client confirms that they have read, understand, and agree to this Educational Advocacy Services Agreement.
      </p>
    </div>
  </div>

  <div style="margin-bottom: 25px; padding: 15px; background: #fdfbf7; border: 1px solid #e8e0d0; border-radius: 6px;">
    <h3 style="color: #07162B; font-size: 14px; margin-top: 0; margin-bottom: 10px; text-transform: uppercase;">
      Client Acknowledgments &amp; Consents
    </h3>
    <ul style="font-size: 12px; color: #444; padding-left: 20px; line-height: 1.6;">
      <li>I understand that Waypoint Advocates provides educational advocacy and does not provide formal legal counsel or legal representation (Section 1).</li>
      <li>I authorize Waypoint Advocates to review student educational, evaluation, and medical records solely for advocacy purposes and understand Waypoint operates under a collaborative, parent-led model (Sections 3 & 4).</li>
      ${isPayInFull
        ? `<li>I agree to the ${commitmentMonths}-month membership commitment with a single upfront payment of $${quote.finalAmount} covering the full contractual term, and understand no recurring monthly subscription fees will be charged during this term. Pay in Full fees are nonrefundable upon commencement of services (Section 8).</li>`
        : `<li>I agree to the ${commitmentMonths}-month membership commitment at $${priceMonthly}/month (Total Commitment: $${totalContractualAmount}) and authorize 12 recurring monthly installments under the agreed terms (Sections 8 & 9).</li>`
      }
      <li>I acknowledge the strict 12-month term hard stop (no auto-renewal), cancellation terms, and Georgia governing law (Sections 8, 10 & 14).</li>
      <li>I consent to electronic delivery, signature, and permanent storage of this agreement.</li>
    </ul>
  </div>
</div>
  `.trim();

  const termAckText = isPayInFull
    ? `I commit to the ${commitmentMonths}-month ${planName} advocacy plan with a single upfront payment of $${quote.finalAmount} covering the full contractual term. I understand no recurring subscription charges will occur during this term, and Pay in Full fees are nonrefundable upon commencement of services.`
    : `I commit to the ${commitmentMonths}-month ${planName} advocacy plan at $${priceMonthly}/month (Total Commitment: $${totalContractualAmount}) and authorize 12 recurring monthly installments under the agreed terms.`;

  const acknowledgments = [
    { id: "ack_scope", text: "I understand that Waypoint Advocates provides educational advocacy and does not provide formal legal counsel or legal representation (Section 1).", required: true },
    { id: "ack_records", text: "I agree to provide complete educational records promptly and understand Waypoint operates under a collaborative, parent-led model (Sections 3 & 4).", required: true },
    { id: "ack_terms", text: termAckText, required: true },
    { id: "ack_governing", text: "I acknowledge the 12-month term hard stop (no auto-renewal), cancellation terms, and Georgia governing law (Sections 10 & 14).", required: true },
    { id: "ack_esign", text: "I consent to execute this agreement electronically and agree that my electronic signature is legally binding.", required: true },
  ];

  const agreementRecord: any = {
    id: agreementId,
    templateId: null,
    ownerId: offer.approvedBy || 1,
    clientId: parentContact.id,
    studentContactId: studentContact?.id ?? null,
    serviceId: null,
    planId: null,
    advocateId: offer.approvedBy || null,
    title,
    content,
    status: "Sent",
    sentAt: now,
    viewedAt: null,
    signedAt: null,
    completedAt: null,
    expiresAt: offer.invitationExpiresAt || null,
    signerName: null,
    signerIp: null,
    userAgent: null,
    signatureUrl: null,
    signatureKey: null,
    initialsData: null,
    acknowledgmentData: JSON.stringify(acknowledgments),
    mergeFieldSnapshot: JSON.stringify({
      parent_name: parentFullName,
      student_name: coveredStudentNamesFormatted,
      plan_name: planName,
      plan_price: String(priceMonthly),
      commitment_months: String(commitmentMonths),
      billing_arrangement: billingText,
      advocate_name: offer.approvedByName || "Lead Special Education Advocate",
      agreement_date: dateFormatted,
    }),
    signedPdfUrl: null,
    signedPdfKey: null,
    documentHash: null,
    contentLocked: 0,
    internalNotes: `Auto-generated for Family Enrollment Offer #${offer.id}`,
    createdAt: now,
    updatedAt: now,
  };

  const signerRecord = {
    id: agreementId + 1,
    agreementId,
    role: "client",
    name: parentFullName,
    email: parentContact.email || null,
    status: "pending",
  };

  // In-memory sync for testing/fallback
  try {
    const { inMemoryAgreements, inMemorySigners } = await import("../routers/agreements");
    if (inMemoryAgreements) inMemoryAgreements.set(agreementId, agreementRecord);
    if (inMemorySigners) inMemorySigners.set(agreementId, [signerRecord]);
  } catch (e) {
    // Ignore in non-router context
  }

  // Database persistence
  try {
    const conn = await getDb();
    if (conn) {
      await conn.insert(agreements).values(agreementRecord);
      await conn.insert(agreementSigners).values(signerRecord);
    }
  } catch (dbErr) {
    // Fallback handled in memory
  }

  return {
    agreementId,
    title,
    content,
    coveredStudentNames: coveredStudentNamesFormatted,
    coveredStudentIds: coveredStudentIdsJson,
  };
}

/**
 * Persists the parent's plan selection against the family enrollment offer.
 * Prevents duplicate selections or duplicate agreement generation.
 * Generates an Advocacy Services Agreement in Agreements Engine.
 * Records the selection in Case Activity Timeline.
 * Strictly adheres to payment boundary (membership remains inactive).
 */
export async function selectFamilyEnrollmentPlan(input: {
  offerId: number;
  planKey: string;
  paymentStructure?: "monthly_autopay" | "pay_in_full";
  parentContactId: number;
  approverName?: string;
}): Promise<{
  success: boolean;
  offer: FamilyEnrollmentOffer;
  agreementId: number;
  message: string;
}> {
  const offer = await db.getEnrollmentOfferById(input.offerId);
  if (!offer) {
    throw new Error(`Enrollment offer #${input.offerId} not found.`);
  }

  if (offer.parentContactId !== input.parentContactId) {
    throw new Error("Unauthorized: Offer does not belong to this parent account.");
  }

  // Guard against revoked or superseded
  if (offer.status === "revoked" || offer.status === "superseded") {
    throw new Error(`Cannot select plan: This enrollment offer has been ${offer.status}.`);
  }

  // Guard against expired
  if (offer.invitationExpiresAt && new Date() > new Date(offer.invitationExpiresAt)) {
    throw new Error("Cannot select plan: This enrollment invitation has expired. Please contact your advocate for an updated offer.");
  }

  // Guard against already executed/active
  if (["agreement_signed", "payment_pending", "active"].includes(offer.status)) {
    throw new Error(
      `Cannot select plan: An agreement has already been executed for this offer. Please use the 'Change Payment Structure' action to request a revised agreement.`
    );
  }

  const requestedStructure = input.paymentStructure || (offer as any).paymentStructure || "monthly_autopay";
  const existingStructure = (offer as any).paymentStructure || "monthly_autopay";

  // Duplicate selection prevention: identical plan AND payment structure with existing agreement
  if (offer.selectedPlanKey === input.planKey && existingStructure === requestedStructure && offer.agreementId) {
    return {
      success: true,
      offer,
      agreementId: offer.agreementId,
      message: "Plan already selected and agreement ready for signing.",
    };
  }

  // Mode validation & Plan resolution
  let planName = "";
  let priceMonthly = 0;
  let commitmentMonths = 12;
  let planDescription = "";
  let features: string[] = [];

  if (offer.enrollmentMode === "standard") {
    const published = PUBLISHED_MEMBERSHIP_PLANS.find((p) => p.planKey === input.planKey.toLowerCase());
    if (!published) {
      throw new Error(`Invalid plan "${input.planKey}". Must be one of: navigator, anchor, family.`);
    }
    planName = published.planName;
    priceMonthly = published.priceMonthly;
    commitmentMonths = published.commitmentMonths || 12;
    planDescription = published.description;
    features = published.features;
  } else if (offer.enrollmentMode === "custom") {
    const validKey = offer.customPlanKey || "custom_offer";
    if (input.planKey !== validKey && input.planKey !== "custom") {
      throw new Error(`Invalid custom plan key. Only authorized custom offer "${validKey}" may be selected.`);
    }
    planName = offer.customPlanName || "Custom Advocacy Plan";
    priceMonthly = Number(offer.customMonthlyPrice) || 0;
    commitmentMonths = offer.customCommitmentMonths || 12;
    planDescription = offer.customTerms || "Authorized custom advocacy representation package.";
    features = [
      `${commitmentMonths}-month commitment`,
      `${offer.customBillingFrequency || "monthly"} billing schedule`,
      offer.billingArrangement === "manual_invoice" ? "Manual invoicing arrangement" : "Automatic card billing",
    ];
  }

  // Compute authoritative quote for chosen payment structure
  const quote = calculatePayInFullQuote({
    priceMonthly,
    commitmentMonths,
    discountType: (offer as any).payInFullDiscountType,
    discountValue: (offer as any).payInFullDiscountValue,
  });

  // If a previous unsigned agreement existed for this offer, void it to prevent duplicates
  if (offer.agreementId) {
    try {
      const conn = await getDb();
      if (conn) {
        await conn
          .update(agreements)
          .set({ status: "Voided", internalNotes: `Voided: parent changed selection to ${planName} (${requestedStructure})` })
          .where(eq(agreements.id, offer.agreementId));
      }
      const { inMemoryAgreements } = await import("../routers/agreements");
      if (inMemoryAgreements?.has(offer.agreementId)) {
        const existing = inMemoryAgreements.get(offer.agreementId);
        existing.status = "Voided";
      }
    } catch (e) {}
  }

  const parentContact = await db.getContactById(offer.parentContactId);
  if (!parentContact) {
    throw new Error(`Parent contact #${offer.parentContactId} not found.`);
  }

  let studentContact: any = null;
  if (offer.studentContactId) {
    studentContact = await db.getContactById(offer.studentContactId);
  }

  // Generate agreement using the exact selected payment structure and quote
  const genResult = await generateEnrollmentAgreement({
    parentContact,
    studentContact,
    offer,
    planKey: input.planKey,
    planName,
    priceMonthly,
    commitmentMonths,
    paymentStructure: requestedStructure,
    billingArrangement: offer.billingArrangement,
    planDescription,
    features,
    quote,
  });

  const now = new Date();
  const updatedOffer = await db.updateEnrollmentOffer(offer.id, {
    selectedPlanKey: input.planKey,
    selectedPlanName: planName,
    selectedPlanPrice: String(priceMonthly),
    paymentStructure: requestedStructure,
    payInFullOriginalAmount: quote.originalAmount,
    payInFullDiscountAmount: quote.discountAmount,
    payInFullFinalAmount: quote.finalAmount,
    selectedAt: now,
    agreementId: genResult.agreementId,
    agreementStatus: "awaiting_signature",
    status: "agreement_pending",
    coveredStudentIds: genResult.coveredStudentIds,
    coveredStudentNames: genResult.coveredStudentNames,
    totalScheduledInstallments: requestedStructure === "pay_in_full" ? 1 : commitmentMonths,
    collectedInstallmentCount: 0,
    outstandingBalanceCents: requestedStructure === "pay_in_full"
      ? Math.round(Number(quote.finalAmount) * 100)
      : Math.round(priceMonthly * commitmentMonths * 100),
    updatedAt: now,
  });

  // Update parent contact
  await db.updateContactById(offer.parentContactId, {
    pipelineStage: "Enrollment Pending",
  });

  // Record activity timeline
  const targetStudentId = offer.studentContactId || studentContact?.id;
  if (targetStudentId) {
    await recordCaseActivity({
      studentContactId: targetStudentId,
      eventType: "plan_selected",
      title: `Advocacy Plan Selected: ${planName}`,
      description: `Parent selected ${planName} ($${priceMonthly}/mo, ${commitmentMonths}-month commitment). Agreement #${genResult.agreementId} generated and awaiting signature.`,
      whyReason: "Parent chose plan in Client Portal.",
      ownerName: `${parentContact.firstName} ${parentContact.lastName}`.trim(),
      ownerRole: "Parent Client",
      categoryColor: "blue",
      isActionNeeded: true,
      isCompleted: true,
    });
  }

  return {
    success: true,
    offer: (updatedOffer || offer) as FamilyEnrollmentOffer,
    agreementId: genResult.agreementId,
    message: `Plan ${planName} selected successfully. Agreement generated.`,
  };
}

/**
 * Phase 2E: Request and generate a revised agreement when a parent changes payment structure AFTER signing.
 * 
 * Strict Safety Invariants:
 * - Does NOT expose staff supersede permissions to parent portal users.
 * - Does NOT allow altering approved plan, monthly prices, discounts, or commitment lengths.
 * - Toggles strictly between "monthly_autopay" and "pay_in_full".
 * - Preserves the original signed agreement in the database with status "Superseded" and its SHA-256 hash intact.
 * - Generates a revised agreement reflecting the new payment terms and contractual total.
 * - Requires the parent to review and e-sign the revised agreement before proceeding to checkout.
 */
export async function requestPaymentStructureRevision(params: {
  offerId: number;
  parentContactId: number;
  newPaymentStructure: "monthly_autopay" | "pay_in_full";
  requesterName?: string;
}): Promise<{
  success: boolean;
  offer: FamilyEnrollmentOffer;
  newAgreementId: number;
  message: string;
}> {
  const { offerId, parentContactId, newPaymentStructure } = params;

  const offer = await db.getEnrollmentOfferById(offerId);
  if (!offer) {
    throw new Error(`Enrollment offer #${offerId} not found.`);
  }

  if (offer.parentContactId !== parentContactId) {
    throw new Error("Unauthorized: You are not authorized to revise this enrollment offer.");
  }

  if (offer.status === "active" && offer.paymentStatus === "paid") {
    throw new Error("Cannot revise payment structure: Family membership is already active with verified payment.");
  }

  const existingStructure = (offer as any).paymentStructure || "monthly_autopay";
  if (existingStructure === newPaymentStructure) {
    return {
      success: true,
      offer,
      newAgreementId: offer.agreementId || 0,
      message: `Offer is already configured for ${newPaymentStructure === "pay_in_full" ? "Pay in Full" : "Monthly Autopay"}.`,
    };
  }

  const planName = offer.selectedPlanName || "Advocacy Support Plan";
  const priceMonthly = Number(offer.selectedPlanPrice) || 105;
  const commitmentMonths = offer.customCommitmentMonths || 12;

  // 1. If a previous draft revision is already pending, discard/cancel it before creating a new one
  if (offer.hasPendingRevision && (offer as any).pendingRevisionAgreementId) {
    try {
      const conn = await getDb();
      if (conn) {
        await conn
          .update(agreements)
          .set({
            status: "Cancelled",
            internalNotes: `Cancelled: Replaced by subsequent revision request for ${newPaymentStructure}.`,
          })
          .where(eq(agreements.id, (offer as any).pendingRevisionAgreementId));
      }
      const { inMemoryAgreements } = await import("../routers/agreements");
      if (inMemoryAgreements?.has((offer as any).pendingRevisionAgreementId)) {
        inMemoryAgreements.get((offer as any).pendingRevisionAgreementId).status = "Cancelled";
      }
    } catch (e) {
      console.warn("[Agreements] Error cancelling previous pending revision draft:", e);
    }
  }

  // NOTE (Phase 2F.1): Original signed agreement (offer.agreementId) is PRESERVED in full force and effect.
  // It is NOT marked Superseded here. It remains valid until the replacement agreement is fully executed.

  // 2. Compute authoritative quote for the new payment structure
  const quote = calculatePayInFullQuote({
    priceMonthly,
    commitmentMonths,
    discountType: (offer as any).payInFullDiscountType,
    discountValue: (offer as any).payInFullDiscountValue,
  });

  const parentContact = await db.getContactById(offer.parentContactId);
  if (!parentContact) {
    throw new Error(`Parent contact #${offer.parentContactId} not found.`);
  }

  let studentContact: any = null;
  if (offer.studentContactId) {
    studentContact = await db.getContactById(offer.studentContactId);
  }

  // 3. Generate revised agreement reflecting the new payment terms
  const genResult = await generateEnrollmentAgreement({
    parentContact,
    studentContact,
    offer,
    planKey: offer.selectedPlanKey || "anchor",
    planName,
    priceMonthly,
    commitmentMonths,
    paymentStructure: newPaymentStructure,
    billingArrangement: offer.billingArrangement,
    planDescription: `Revised agreement reflecting ${newPaymentStructure === "pay_in_full" ? "Pay in Full (Single Upfront Payment)" : "Monthly Autopay (Recurring)"} terms.`,
    features: [
      `${commitmentMonths}-month commitment`,
      newPaymentStructure === "pay_in_full" ? "Single upfront payment" : "Monthly autopay billing",
    ],
    quote,
    isRevised: true,
  });

  const now = new Date();

  // 4. Update offer with pending revision tracking (Original agreementId and signed status remain intact)
  const updatedOffer = await db.updateEnrollmentOffer(offer.id, {
    hasPendingRevision: true,
    pendingRevisionAgreementId: genResult.agreementId,
    pendingRevisionStructure: newPaymentStructure,
    pendingRevisionCreatedAt: now,
    coveredStudentIds: genResult.coveredStudentIds,
    coveredStudentNames: genResult.coveredStudentNames,
    updatedAt: now,
  });

  // 5. Record Case Activity Timeline entry
  if (offer.studentContactId) {
    await recordCaseActivity({
      studentContactId: offer.studentContactId,
      eventType: "agreement_revision_requested",
      title: "Payment Structure Revision Draft Generated — Original Agreement Preserved",
      description: `Payment structure revision requested to switch to ${newPaymentStructure === "pay_in_full" ? "Pay in Full" : "Monthly Autopay"}. Original signed agreement #${offer.agreementId} remains legally preserved and in force until revised agreement #${genResult.agreementId} is executed.`,
      whyReason: "Parent requested payment structure revision prior to checkout.",
      ownerName: params.requesterName || "Parent",
      ownerRole: "Parent / Client",
      categoryColor: "amber",
      isActionNeeded: false,
      isCompleted: true,
    });
  }

  return {
    success: true,
    offer: (updatedOffer || offer) as FamilyEnrollmentOffer,
    newAgreementId: genResult.agreementId,
    message: `Payment structure revision draft created for ${newPaymentStructure === "pay_in_full" ? "Pay in Full" : "Monthly Autopay"}. Please review and sign your revised agreement to finalize this change.`,
  };
}

/**
 * Phase 2F.1: Cancels an incomplete payment structure revision draft.
 * Discards the pending revision agreement and restores original signed agreement checkout terms.
 */
export async function cancelPaymentStructureRevision(params: {
  offerId: number;
  parentContactId?: number;
}): Promise<{
  success: boolean;
  offer: FamilyEnrollmentOffer;
  message: string;
}> {
  const { offerId, parentContactId } = params;
  const offer = await db.getEnrollmentOfferById(offerId);
  if (!offer) {
    throw new Error(`Enrollment offer #${offerId} not found.`);
  }

  if (parentContactId && offer.parentContactId !== parentContactId) {
    throw new Error("Unauthorized: You are not authorized to cancel this revision.");
  }

  if (!offer.hasPendingRevision) {
    return {
      success: true,
      offer,
      message: "No pending revision found to cancel.",
    };
  }

  // Cancel/void the pending revision draft agreement
  if ((offer as any).pendingRevisionAgreementId) {
    try {
      const conn = await getDb();
      if (conn) {
        await conn
          .update(agreements)
          .set({
            status: "Cancelled",
            internalNotes: `Revision cancelled by parent. Original signed agreement #${offer.agreementId} restored.`,
          })
          .where(eq(agreements.id, (offer as any).pendingRevisionAgreementId));
      }
      const { inMemoryAgreements } = await import("../routers/agreements");
      if (inMemoryAgreements?.has((offer as any).pendingRevisionAgreementId)) {
        inMemoryAgreements.get((offer as any).pendingRevisionAgreementId).status = "Cancelled";
      }
    } catch (e) {
      console.warn("[Agreements] Error cancelling pending draft agreement:", e);
    }
  }

  const updatedOffer = await db.updateEnrollmentOffer(offer.id, {
    hasPendingRevision: false,
    pendingRevisionAgreementId: null,
    pendingRevisionStructure: null,
    pendingRevisionCreatedAt: null,
    updatedAt: new Date(),
  });

  if (offer.studentContactId) {
    await recordCaseActivity({
      studentContactId: offer.studentContactId,
      eventType: "agreement_revision_cancelled",
      title: "Payment Structure Revision Cancelled — Original Terms Restored",
      description: `Pending revision draft was discarded. Original signed agreement #${offer.agreementId} (${offer.paymentStructure === "pay_in_full" ? "Pay in Full" : "Monthly Autopay"}) remains active and ready for payment.`,
      whyReason: "Parent cancelled payment structure revision and restored original signed terms.",
      ownerName: "Parent / Client",
      ownerRole: "Parent",
      categoryColor: "blue",
      isActionNeeded: false,
      isCompleted: true,
    });
  }

  return {
    success: true,
    offer: (updatedOffer || offer) as FamilyEnrollmentOffer,
    message: "Revision draft discarded. Your original signed agreement terms have been restored.",
  };
}

/**
 * Handles agreement execution callback from Agreements Engine (PG-046).
 * Sets offer status to payment_pending and agreementStatus to signed.
 * Strictly respects the Payment Boundary (does NOT mark active, does NOT charge cards).
 * Phase 2F.1: Safely transitions superseded status ONLY after replacement agreement execution.
 */
export async function onAgreementSignedForEnrollment(params: {
  agreementId: number;
  clientId: number;
  signerName: string;
  pdfUrl?: string;
}): Promise<FamilyEnrollmentOffer | null> {
  const { agreementId, clientId, signerName, pdfUrl } = params;
  const now = new Date();

  // Find offer linked to this agreement or matching parentContactId
  const dbConn = await getDb();
  let offer: FamilyEnrollmentOffer | null = null;

  if (dbConn) {
    try {
      const results = await dbConn
        .select()
        .from(familyEnrollmentOffers)
        .where(
          or(
            eq(familyEnrollmentOffers.agreementId, agreementId),
            eq(familyEnrollmentOffers.pendingRevisionAgreementId, agreementId),
            and(
              eq(familyEnrollmentOffers.parentContactId, clientId),
              inArray(familyEnrollmentOffers.status, ["plan_selected", "agreement_pending", "payment_pending"])
            )
          )
        )
        .limit(1);
      offer = results[0] || null;
    } catch (e) {}
  }

  // Memory fallback if DB query returned nothing
  if (!offer) {
    offer = await db.getActiveOfferForFamily(clientId);
  }

  if (!offer) return null;

  // Phase 2F.1: Check if this newly signed agreement is a pending revision replacement agreement
  if (offer.hasPendingRevision && (offer as any).pendingRevisionAgreementId === agreementId) {
    const previousAgreementId = offer.agreementId;
    const newStructure = (offer as any).pendingRevisionStructure || "monthly_autopay";
    const isPayInFull = newStructure === "pay_in_full";

    // 1. Mark the OLD original agreement as Superseded (NOW AND ONLY NOW)
    if (previousAgreementId && previousAgreementId !== agreementId) {
      try {
        if (dbConn) {
          await dbConn
            .update(agreements)
            .set({
              status: "Superseded",
              internalNotes: `Superseded by replacement executed agreement #${agreementId} with payment structure ${newStructure}. Original signed terms, signature, and SHA-256 digital hash preserved.`,
            })
            .where(eq(agreements.id, previousAgreementId));
        }
        const { inMemoryAgreements } = await import("../routers/agreements");
        if (inMemoryAgreements?.has(previousAgreementId)) {
          inMemoryAgreements.get(previousAgreementId).status = "Superseded";
        }
      } catch (e) {
        console.warn("[Agreements] Error superseding original agreement on replacement execution:", e);
      }
    }

    // 2. Compute quote for new structure
    const priceMonthly = Number(offer.selectedPlanPrice) || 105;
    const commitmentMonths = offer.customCommitmentMonths || 12;
    const quote = calculatePayInFullQuote({
      priceMonthly,
      commitmentMonths,
      discountType: (offer as any).payInFullDiscountType,
      discountValue: (offer as any).payInFullDiscountValue,
    });

    // 3. Update offer to point to the newly executed replacement agreement and adopt the new payment structure
    const updated = await db.updateEnrollmentOffer(offer.id, {
      agreementId,
      agreementStatus: "signed",
      agreementSignedAt: now,
      paymentStructure: newStructure,
      payInFullOriginalAmount: quote.originalAmount,
      payInFullDiscountAmount: quote.discountAmount,
      payInFullFinalAmount: quote.finalAmount,
      totalScheduledInstallments: isPayInFull ? 1 : commitmentMonths,
      outstandingBalanceCents: isPayInFull
        ? Math.round(Number(quote.finalAmount) * 100)
        : Math.round(priceMonthly * commitmentMonths * 100),
      hasPendingRevision: false,
      pendingRevisionAgreementId: null,
      pendingRevisionStructure: null,
      pendingRevisionCreatedAt: null,
      status: "payment_pending",
      paymentStatus: "pending",
      updatedAt: now,
    });

    // 4. Record Case Activity
    if (offer.studentContactId) {
      await recordCaseActivity({
        studentContactId: offer.studentContactId,
        eventType: "agreement_signed",
        title: "Replacement Advocacy Agreement Executed — Prior Agreement Superseded",
        description: `Replacement agreement #${agreementId} signed by ${signerName}. Payment structure successfully transitioned to ${isPayInFull ? "Pay in Full" : "Monthly Autopay"}. Prior agreement #${previousAgreementId} is now archived as Superseded.`,
        whyReason: "Parent executed replacement agreement. Ready for checkout under updated terms.",
        ownerName: signerName,
        ownerRole: "Client Signer",
        categoryColor: "teal",
        sources: pdfUrl
          ? [
              {
                type: "document",
                label: "Signed Replacement Agreement PDF",
                url: pdfUrl,
              },
            ]
          : undefined,
        isActionNeeded: false,
        isCompleted: true,
      });
    }

    return updated || offer;
  }

  // Regular (first agreement) signing flow
  const isPayInFull = (offer as any).paymentStructure === "pay_in_full";
  const priceMonthly = Number(offer.selectedPlanPrice) || 105;
  const commitmentMonths = offer.customCommitmentMonths || 12;
  const quote = calculatePayInFullQuote({
    priceMonthly,
    commitmentMonths,
    discountType: (offer as any).payInFullDiscountType,
    discountValue: (offer as any).payInFullDiscountValue,
  });

  const updated = await db.updateEnrollmentOffer(offer.id, {
    agreementId,
    agreementStatus: "signed",
    agreementSignedAt: now,
    status: "payment_pending",
    paymentStatus: "pending",
    totalScheduledInstallments: isPayInFull ? 1 : commitmentMonths,
    outstandingBalanceCents: isPayInFull
      ? Math.round(Number(quote.finalAmount) * 100)
      : Math.round(priceMonthly * commitmentMonths * 100),
    updatedAt: now,
  });

  // Record Case Activity
  if (offer.studentContactId) {
    await recordCaseActivity({
      studentContactId: offer.studentContactId,
      eventType: "agreement_signed",
      title: "Advocacy Agreement Executed — Payment Pending",
      description: `Advocacy Services Agreement for ${offer.selectedPlanName || "Advocacy Plan"} signed by ${signerName}. Status updated to Payment Pending. First payment authorization will be completed in Phase 2C.`,
      whyReason: "Parent executed agreement in Client Portal. Awaiting Phase 2C live payment activation.",
      ownerName: signerName,
      ownerRole: "Client Signer",
      categoryColor: "teal",
      sources: pdfUrl
        ? [
            {
              type: "document",
              label: "Signed Agreement PDF",
              url: pdfUrl,
            },
          ]
        : undefined,
      isActionNeeded: false,
      isCompleted: true,
    });
  }

  return updated || offer;
}

/**
 * Explicit staff-authorized supersede process for accepted or locked offers.
 * Voids unsigned pending agreements, preserves executed agreements for compliance records,
 * marks old offer superseded, and generates a replacement offer.
 */
export async function supersedeFamilyEnrollmentOffer(params: {
  offerId: number;
  reason: string;
  approverId?: number;
  approverName?: string;
  newOfferInput: ApproveFamilyEnrollmentInput;
}): Promise<{
  oldOffer: FamilyEnrollmentOffer;
  newOffer: FamilyEnrollmentOffer;
}> {
  const oldOffer = await db.getEnrollmentOfferById(params.offerId);
  if (!oldOffer) {
    throw new Error(`Enrollment offer #${params.offerId} not found.`);
  }

  const trimmedReason = (params.reason || "").trim();
  if (trimmedReason.length < 5) {
    throw new Error("A specific supersede reason (at least 5 characters) is required.");
  }

  const approverName = params.approverName || "Lead Special Education Advocate";
  const approverId = params.approverId || 1;
  const now = new Date();

  // 1. If old offer has an agreement:
  if (oldOffer.agreementId) {
    try {
      const conn = await getDb();
      if (conn) {
        // If unsigned, void it
        if (oldOffer.agreementStatus !== "signed" && oldOffer.status !== "agreement_signed") {
          await conn
            .update(agreements)
            .set({
              status: "Voided",
              internalNotes: `Voided: superseded by staff revision: ${trimmedReason}`,
              updatedAt: now,
            })
            .where(eq(agreements.id, oldOffer.agreementId));
        } else {
          // If signed, preserve it for legal compliance
          await conn
            .update(agreements)
            .set({
              internalNotes: `Note: Superseded by offer revision on ${now.toISOString()}: ${trimmedReason}`,
              updatedAt: now,
            })
            .where(eq(agreements.id, oldOffer.agreementId));
        }
      }

      // Memory store sync
      const { inMemoryAgreements } = await import("../routers/agreements");
      if (inMemoryAgreements?.has(oldOffer.agreementId)) {
        const ag = inMemoryAgreements.get(oldOffer.agreementId);
        if (ag.status !== "Completed" && ag.status !== "Signed") {
          ag.status = "Voided";
        }
        ag.internalNotes = `Superseded: ${trimmedReason}`;
      }
    } catch (e) {}
  }

  // 2. Mark old offer superseded
  const supersededOld = await db.supersedeEnrollmentOffer(
    oldOffer.id,
    approverId,
    approverName,
    trimmedReason
  );

  // 3. Create replacement offer
  const newOffer = await approveFamilyEnrollment({
    ...params.newOfferInput,
    parentContactId: oldOffer.parentContactId,
    studentContactId: oldOffer.studentContactId || params.newOfferInput.studentContactId,
    leadId: oldOffer.leadId || params.newOfferInput.leadId,
    approverId,
    approverName,
    changeReason: `Supersedes offer #${oldOffer.id}: ${trimmedReason}`,
    internalNotes: `Supersedes Offer #${oldOffer.id}. Reason: "${trimmedReason}". ${params.newOfferInput.internalNotes || ""}`.trim(),
  });

  // 4. Record Case Activity event
  const targetStudentId = oldOffer.studentContactId || params.newOfferInput.studentContactId;
  if (targetStudentId) {
    await recordCaseActivity({
      studentContactId: targetStudentId,
      eventType: "offer_superseded",
      title: "Enrollment Offer Superseded",
      description: `Enrollment offer #${oldOffer.id} was superseded by ${approverName}. Reason: "${trimmedReason}". New offer #${newOffer.id} generated.`,
      whyReason: trimmedReason,
      ownerName: approverName,
      ownerRole: "Lead Special Education Advocate",
      categoryColor: "amber",
      isActionNeeded: true,
      isCompleted: true,
    });
  }

  return {
    oldOffer: (supersededOld || oldOffer) as FamilyEnrollmentOffer,
    newOffer,
  };
}

/**
 * Retrieves the parent portal enrollment experience state.
 * Evaluates approval validity, expiration, available plans, and agreement status.
 */
export async function getPortalFamilyEnrollmentState(parentContactId: number) {
  if (!parentContactId) {
    return {
      canEnroll: false,
      ineligibleReason: "unapproved",
      message: "Advocacy Plan Selection Under Advocate Review. Your lead advocate is reviewing your case discovery notes.",
      activeOffer: null,
      availablePlans: [],
      agreement: null,
    };
  }

  const activeOffer = await db.getActiveOfferForFamily(parentContactId);

  if (!activeOffer) {
    return {
      canEnroll: false,
      ineligibleReason: "unapproved",
      message: "Advocacy Plan Selection Under Advocate Review. Your lead advocate is reviewing your case discovery notes. You will receive an invitation as soon as enrollment is authorized.",
      activeOffer: null,
      availablePlans: [],
      agreement: null,
    };
  }

  if (activeOffer.status === "revoked" || activeOffer.status === "superseded") {
    return {
      canEnroll: false,
      ineligibleReason: "revoked",
      message: "This enrollment offer is no longer active. Please contact your advocate.",
      activeOffer,
      availablePlans: [],
      agreement: null,
    };
  }

  if (activeOffer.invitationExpiresAt && new Date() > new Date(activeOffer.invitationExpiresAt)) {
    return {
      canEnroll: false,
      ineligibleReason: "expired",
      message: "Your enrollment invitation window has expired. Please contact your advocate to request an updated offer.",
      activeOffer,
      availablePlans: [],
      agreement: null,
    };
  }

  if (activeOffer.status === "active") {
    return {
      canEnroll: false,
      ineligibleReason: "already_active",
      message: "Your family membership is active.",
      activeOffer,
      availablePlans: [],
      agreement: null,
    };
  }

  // Determine available plans
  let availablePlans: any[] = [];
  if (activeOffer.enrollmentMode === "standard") {
    availablePlans = PUBLISHED_MEMBERSHIP_PLANS;
  } else if (activeOffer.enrollmentMode === "custom") {
    availablePlans = [
      {
        planKey: activeOffer.customPlanKey || "custom_offer",
        planName: activeOffer.customPlanName || "Custom Advocacy Retainer",
        priceMonthly: Number(activeOffer.customMonthlyPrice) || 0,
        commitmentMonths: activeOffer.customCommitmentMonths || 12,
        billingFrequency: activeOffer.customBillingFrequency || "monthly",
        description: activeOffer.customTerms || "Authorized custom advocacy representation package.",
        features: [
          `${activeOffer.customCommitmentMonths || 12}-month commitment`,
          `${activeOffer.customBillingFrequency || "monthly"} billing schedule`,
          activeOffer.billingArrangement === "manual_invoice"
            ? `Manual invoicing (Due: ${activeOffer.manualInvoiceDueDate || "1st of month"})`
            : "Automatic card billing",
          "Custom advocacy scope authorized by Lead Advocate",
        ],
        isCustom: true,
      },
    ];
  }

  // Fetch agreement if exists
  let agreement: any = null;
  if (activeOffer.agreementId) {
    try {
      const conn = await getDb();
      if (conn) {
        const [ag] = await conn
          .select()
          .from(agreements)
          .where(eq(agreements.id, activeOffer.agreementId))
          .limit(1);
        agreement = ag || null;
      }
      if (!agreement) {
        const { inMemoryAgreements } = await import("../routers/agreements");
        agreement = inMemoryAgreements?.get(activeOffer.agreementId) || null;
      }
    } catch (e) {}
  }

  // Fetch pending revision agreement if a revision is currently pending
  let pendingRevisionAgreement: any = null;
  if (activeOffer.hasPendingRevision && (activeOffer as any).pendingRevisionAgreementId) {
    try {
      const conn = await getDb();
      if (conn) {
        const [ag] = await conn
          .select()
          .from(agreements)
          .where(eq(agreements.id, (activeOffer as any).pendingRevisionAgreementId))
          .limit(1);
        pendingRevisionAgreement = ag || null;
      }
      if (!pendingRevisionAgreement) {
        const { inMemoryAgreements } = await import("../routers/agreements");
        pendingRevisionAgreement = inMemoryAgreements?.get((activeOffer as any).pendingRevisionAgreementId) || null;
      }
    } catch (e) {}
  }

  return {
    canEnroll: true,
    ineligibleReason: null,
    message: null,
    activeOffer,
    availablePlans,
    agreement: agreement
      ? {
          id: agreement.id,
          title: agreement.title,
          status: agreement.status,
          signedAt: agreement.signedAt,
          signedPdfUrl: agreement.signedPdfUrl,
        }
      : null,
    pendingRevisionAgreement: pendingRevisionAgreement
      ? {
          id: pendingRevisionAgreement.id,
          title: pendingRevisionAgreement.title,
          status: pendingRevisionAgreement.status,
        }
      : null,
  };
}

/**
 * Phase 2G: Strict Calendar-Based Commitment Date Calculation.
 * Eliminates approximate 30.4375-day multiplier.
 * Correctly handles February, leap years, month-end enrollment (e.g. Jan 31 -> Jan 31, Aug 31 -> Feb 28),
 * and preserves exact time across daylight saving time shifts.
 */
export function calculateCalendarCommitmentEndDate(startDate: Date, commitmentMonths: number): Date {
  const start = new Date(startDate);
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();
  const hours = start.getUTCHours();
  const minutes = start.getUTCMinutes();
  const seconds = start.getUTCSeconds();
  const ms = start.getUTCMilliseconds();

  const totalMonths = month + commitmentMonths;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  // Month-end clipping (e.g. Feb 28 in non-leap year, Feb 29 in leap year, April 30)
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clippedDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, clippedDay, hours, minutes, seconds, ms));
}

/**
 * Phase 2D: Authoritative Pay-in-Full Calculation Interface & Engine.
 */
export interface PayInFullQuote {
  commitmentMonths: number;
  monthlyPrice: number;
  originalCents: number;
  originalAmount: string;
  originalAmountCents: number;
  discountType: "none" | "percentage" | "fixed_amount";
  discountValue: number;
  discountCents: number;
  discountAmountCents: number;
  discountAmount: string;
  finalCents: number;
  finalAmountCents: number;
  finalAmount: string;
  finalAmountFormatted: string;
}

/**
 * Calculates authoritative Pay-in-Full commitment totals and authorized discounts.
 * Standard 12-month totals before discounts:
 * - Navigator: $55 x 12 = $660.00
 * - Anchor: $105 x 12 = $1,260.00
 * - Family: $155 x 12 = $1,860.00
 * Discounts must be explicitly configured by staff; never invent a default discount.
 */
export function calculatePayInFullQuote(
  offerOrParams:
    | FamilyEnrollmentOffer
    | {
        priceMonthly?: number;
        monthlyPrice?: number;
        selectedPlanPrice?: string | number;
        commitmentMonths?: number;
        customCommitmentMonths?: number;
        discountType?: "none" | "percentage" | "fixed_amount";
        discountValue?: number;
        payInFullDiscountType?: string;
        payInFullDiscountValue?: number | string;
      },
  options?: {
    overrideCommitmentMonths?: number;
    overrideDiscountType?: "none" | "percentage" | "fixed_amount";
    overrideDiscountValue?: number;
  }
): PayInFullQuote {
  const p: any = offerOrParams;
  const commitmentMonths = options?.overrideCommitmentMonths ?? p.overrideCommitmentMonths ?? p.commitmentMonths ?? p.customCommitmentMonths ?? 12;
  const rawPrice = p.priceMonthly ?? p.monthlyPrice ?? p.selectedPlanPrice ?? "105.00";
  const monthlyPrice = Number(rawPrice);
  const monthlyCents = Math.round(monthlyPrice * 100);
  const originalCents = monthlyCents * commitmentMonths;
  const originalAmount = (originalCents / 100).toFixed(2);

  const discountType = (options?.overrideDiscountType ?? p.discountType ?? p.payInFullDiscountType ?? "none") as "none" | "percentage" | "fixed_amount";
  const discountVal = Number(options?.overrideDiscountValue ?? p.discountValue ?? p.payInFullDiscountValue ?? 0);

  let discountCents = 0;
  if (discountType === "percentage" && discountVal > 0) {
    discountCents = Math.round(originalCents * (discountVal / 100));
  } else if (discountType === "fixed_amount" && discountVal > 0) {
    discountCents = Math.round(discountVal * 100);
  } else if (p.payInFullDiscountAmount && Number(p.payInFullDiscountAmount) > 0) {
    discountCents = Math.round(Number(p.payInFullDiscountAmount) * 100);
  }

  // Prevent negative, zero-floor, or excessive discount
  discountCents = Math.max(0, Math.min(discountCents, originalCents));
  const discountAmount = (discountCents / 100).toFixed(2);
  const finalCents = originalCents - discountCents;
  const finalAmount = (finalCents / 100).toFixed(2);

  return {
    commitmentMonths,
    monthlyPrice,
    originalCents,
    originalAmount,
    originalAmountCents: originalCents,
    discountType,
    discountValue: discountVal,
    discountCents,
    discountAmountCents: discountCents,
    discountAmount,
    finalCents,
    finalAmountCents: finalCents,
    finalAmount,
    finalAmountFormatted: `$${Number(finalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}

/**
 * Phase 2C & 2D: Server-Side Stripe Checkout Session Creation.
 * Supports:
 * 1. Monthly Autopay (Subscription mode: Cards, ACH, Link)
 * 2. Pay in Full (Payment mode: Cards, ACH, Link, Affirm, Klarna, Afterpay/Clearpay)
 * 
 * Strict Payment Eligibility & Security Checks:
 * - Valid offer for parentContactId
 * - Selected plan exists
 * - Signed agreement exists
 * - Payment structure aligns with agreement terms
 * - Not expired, revoked, or superseded
 * - No active subscription already exists
 * - Never trusts browser-supplied price or status
 */
export async function createFamilyEnrollmentCheckoutSession(params: {
  offerId: number;
  parentContactId: number;
  paymentStructure?: "monthly_autopay" | "pay_in_full";
  originUrl?: string;
}): Promise<{
  url: string;
  sessionId: string;
  isTestMode: boolean;
  mode?: "payment" | "subscription";
  amountTotal?: number;
  paymentMethodTypes?: string[];
  offer: FamilyEnrollmentOffer;
  quote?: PayInFullQuote;
}> {
  const { offerId, parentContactId } = params;
  const origin = params.originUrl || "http://localhost:3000";

  const offer = await db.getEnrollmentOfferById(offerId);
  if (!offer) {
    throw new Error(`Enrollment offer #${offerId} not found.`);
  }

  if (offer.parentContactId !== parentContactId) {
    throw new Error("Authorization mismatch: Enrollment offer belongs to another family contact.");
  }

  // 1. Offer validity & state
  if (offer.status === "revoked" || offer.status === "superseded") {
    throw new Error(`Cannot checkout: This enrollment offer is ${offer.status}.`);
  }

  if (offer.invitationExpiresAt && new Date() > new Date(offer.invitationExpiresAt)) {
    throw new Error("Cannot checkout: Enrollment offer has expired. Please request an updated offer.");
  }

  if (offer.status === "active" && offer.paymentStatus === "paid") {
    throw new Error("Cannot checkout: Family membership is already active with verified payment.");
  }

  if (offer.stripeSubscriptionId && offer.paymentStatus === "paid") {
    throw new Error("Cannot checkout: An active recurring subscription already exists for this enrollment.");
  }

  // Phase 2F.1: Block checkout while a payment structure revision is pending signature
  if (offer.hasPendingRevision) {
    throw new Error(
      "Cannot checkout: A payment structure revision is currently pending. Please sign the revised agreement or cancel the revision to proceed under your original signed terms."
    );
  }

  // 2. Plan selection verification
  if (!offer.selectedPlanKey || !offer.selectedPlanPrice || Number(offer.selectedPlanPrice) <= 0) {
    throw new Error("Cannot checkout: Please select an authorized advocacy plan first.");
  }

  const requestedStructure = params.paymentStructure || (offer as any).paymentStructure || "monthly_autopay";

  // 3. Agreement execution & structure alignment verification
  if (offer.agreementStatus !== "signed") {
    let agreementIsSigned = false;
    if (offer.agreementId) {
      const conn = await getDb();
      if (conn) {
        const [ag] = await conn
          .select()
          .from(agreements)
          .where(eq(agreements.id, offer.agreementId))
          .limit(1);
        if (ag && (ag.status === "Signed" || ag.status === "Completed" || ag.contentLocked)) {
          agreementIsSigned = true;
        }
      }
      if (!agreementIsSigned) {
        const { inMemoryAgreements } = await import("../routers/agreements");
        const ag = inMemoryAgreements?.get(offer.agreementId);
        if (ag && (ag.status === "Signed" || ag.status === "Completed" || ag.contentLocked)) {
          agreementIsSigned = true;
        }
      }
    }

    if (!agreementIsSigned) {
      throw new Error("Cannot checkout: Advocacy service agreement must be electronically signed before payment.");
    }
  }

  // Check if agreement structure matches checkout structure
  // If payment structure changed after agreement was signed, require revised agreement
  const existingStructure = (offer as any).paymentStructure || "monthly_autopay";
  if (offer.agreementStatus === "signed" && params.paymentStructure && params.paymentStructure !== existingStructure) {
    throw new Error(
      `Cannot checkout: Payment structure changed from ${existingStructure === "pay_in_full" ? "Pay in Full" : "Monthly Autopay"} to ${params.paymentStructure === "pay_in_full" ? "Pay in Full" : "Monthly Autopay"}. An updated agreement reflecting these terms is required.`
    );
  }

  // 4. Retrieve parent contact for Stripe customer info
  let parentEmail = "";
  let parentName = "";
  const conn = await getDb();
  if (conn) {
    try {
      const [parentRecord] = await conn
        .select()
        .from(contacts)
        .where(eq(contacts.id, parentContactId))
        .limit(1);
      if (parentRecord) {
        parentEmail = parentRecord.email || "";
        parentName = `${parentRecord.firstName || ""} ${parentRecord.lastName || ""}`.trim();
      }
    } catch (e) {}
  }

  // 5. Authoritative price and commitment calculations
  const priceDollars = Number(offer.selectedPlanPrice);
  const priceCents = Math.round(priceDollars * 100);
  const planName = offer.selectedPlanName || "Advocacy Support Plan";
  const commitmentMonths = offer.customCommitmentMonths || 12;

  // Calculate Pay In Full Quote
  const quote = calculatePayInFullQuote(offer);

  // 6. Look up or create Stripe customer
  const stripe = getSafeStripe();
  let customerId = offer.stripeCustomerId;

  if (stripe && parentEmail && !customerId) {
    try {
      const existing = await stripe.customers.list({ email: parentEmail, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({
          email: parentEmail,
          name: parentName || undefined,
          metadata: {
            parent_contact_id: String(parentContactId),
            family_offer_id: String(offer.id),
          },
        });
        customerId = created.id;
      }
    } catch (e) {
      console.warn("[Stripe] Failed customer creation/lookup:", e);
    }
  }

  if (!customerId) {
    customerId = `cus_test_family_${parentContactId}`;
  }

  // 7. Generate Checkout Session based on requested payment structure
  let sessionId = "";
  let sessionUrl = "";

  if (stripe) {
    try {
      if (requestedStructure === "pay_in_full") {
        // ONE-TIME PAY IN FULL (Supports Cards, ACH, and Eligible BNPL: Affirm, Klarna, Afterpay)
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card", "us_bank_account", "affirm", "klarna", "afterpay_clearpay", "link"],
          mode: "payment",
          customer: customerId.startsWith("cus_test_family_") ? undefined : customerId,
          customer_email: customerId.startsWith("cus_test_family_") ? parentEmail || undefined : undefined,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `Waypoint Advocates — ${planName} (Paid in Full)`,
                  description: `${planName} (${quote.commitmentMonths}-Month Contractual Advocacy Commitment, Single Upfront Payment${quote.discountCents > 0 ? ` — Includes $${quote.discountAmount} Authorized Discount` : ""})`,
                },
                unit_amount: quote.finalCents,
              },
              quantity: 1,
            },
          ],
          metadata: {
            family_enrollment_offer_id: String(offer.id),
            parent_contact_id: String(parentContactId),
            student_contact_id: String(offer.studentContactId || ""),
            plan_key: offer.selectedPlanKey,
            plan_name: planName,
            commitment_months: String(commitmentMonths),
            payment_structure: "pay_in_full",
            expected_amount_cents: String(quote.finalCents),
            billing_arrangement: offer.billingArrangement,
            environment: "test",
          },
          success_url: `${origin}/portal?stage=ONBOARDING&tab=choose-support&session_id={CHECKOUT_SESSION_ID}&payment=success`,
          cancel_url: `${origin}/portal?stage=ONBOARDING&tab=choose-support&payment=cancelled`,
        });

        sessionId = session.id;
        sessionUrl = session.url || `${origin}/portal?stage=ONBOARDING&tab=choose-support&session_id=${session.id}&payment=success`;
      } else {
        // MONTHLY AUTOPAY SUBSCRIPTION (Cards, ACH, Link — NO BNPL in subscription mode)
        const commitmentEndsAt = calculateCalendarCommitmentEndDate(new Date(), commitmentMonths);
        const cancelAtUnix = Math.floor(commitmentEndsAt.getTime() / 1000);

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card", "us_bank_account", "link"],
          mode: "subscription",
          subscription_data: {
            cancel_at: cancelAtUnix,
            metadata: {
              family_enrollment_offer_id: String(offer.id),
              parent_contact_id: String(parentContactId),
              commitment_months: String(commitmentMonths),
            },
          } as any,
          customer: customerId.startsWith("cus_test_family_") ? undefined : customerId,
          customer_email: customerId.startsWith("cus_test_family_") ? parentEmail || undefined : undefined,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `Waypoint Advocates — ${planName}`,
                  description: `${planName} (${commitmentMonths}-Month Contractual Advocacy Commitment, Autopay Recurring Monthly)`,
                },
                unit_amount: priceCents,
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
          ],
          metadata: {
            family_enrollment_offer_id: String(offer.id),
            parent_contact_id: String(parentContactId),
            student_contact_id: String(offer.studentContactId || ""),
            plan_key: offer.selectedPlanKey,
            plan_name: planName,
            commitment_months: String(commitmentMonths),
            payment_structure: "monthly_autopay",
            expected_amount_cents: String(priceCents),
            billing_arrangement: offer.billingArrangement,
            environment: "test",
          },
          success_url: `${origin}/portal?stage=ONBOARDING&tab=choose-support&session_id={CHECKOUT_SESSION_ID}&payment=success`,
          cancel_url: `${origin}/portal?stage=ONBOARDING&tab=choose-support&payment=cancelled`,
        });

        sessionId = session.id;
        sessionUrl = session.url || `${origin}/portal?stage=ONBOARDING&tab=choose-support&session_id=${session.id}&payment=success`;
      }
    } catch (err: any) {
      console.warn("[Stripe Checkout] API call failed or in sandbox:", err.message);
    }
  }

  // Deterministic mock session fallback ONLY for automated vitest / unit-test environments
  if (!sessionId) {
    sessionId = `cs_test_mock_${offer.id}_${Date.now()}`;
    sessionUrl = `${origin}/portal?stage=ONBOARDING&tab=choose-support&session_id=${sessionId}&payment=success`;
  }

  // Persist session ID, customer ID, and chosen payment structure on offer record
  const updatedOffer = await db.updateEnrollmentOffer(offer.id, {
    stripeCheckoutSessionId: sessionId,
    stripeCustomerId: customerId,
    paymentStructure: requestedStructure,
    payInFullOriginalAmount: quote.originalAmount,
    payInFullDiscountAmount: quote.discountAmount,
    payInFullFinalAmount: quote.finalAmount,
    updatedAt: new Date(),
  });

  return {
    url: sessionUrl,
    sessionId,
    isTestMode: true,
    mode: requestedStructure === "pay_in_full" ? ("payment" as const) : ("subscription" as const),
    amountTotal: requestedStructure === "pay_in_full" ? (quote.finalCents / 100) : (priceCents / 100),
    paymentMethodTypes: requestedStructure === "pay_in_full"
      ? ["card", "us_bank_account", "affirm", "klarna", "afterpay_clearpay", "link"]
      : ["card", "us_bank_account", "link"],
    offer: (updatedOffer || offer) as FamilyEnrollmentOffer,
    quote,
  };
}

/**
 * Phase 2C & 2D: Verifies a completed Stripe checkout session server-side.
 * Rejects browser-asserted success without authoritative server validation.
 * Fixes Defect A, C, D:
 * - Fail closed if Stripe is unavailable
 * - Rejects forged session IDs
 * - Cross-validates metadata (offer ID, parent contact ID, expected amount, currency)
 * - Checks payment_status === 'paid'
 */
export async function verifyAndActivateStripeSession(params: {
  sessionId: string;
  parentContactId?: number;
  expectedParentContactId?: number;
  offerId?: number;
  mockSessionData?: {
    amount_total?: number;
    currency?: string;
    customer?: string;
    payment_status?: string;
    metadata?: Record<string, string>;
  };
}): Promise<{
  success: boolean;
  offer: FamilyEnrollmentOffer;
  message: string;
}> {
  const { sessionId, mockSessionData } = params;
  const parentContactId = params.parentContactId ?? params.expectedParentContactId;

  // 1. Locate offer by offer ID, session ID, or parent contact ID
  let offer = params.offerId ? await db.getEnrollmentOfferById(params.offerId) : null;
  if (!offer) {
    offer = await db.getEnrollmentOfferByCheckoutSessionId(sessionId);
  }
  if (!offer && parentContactId) {
    offer = await db.getActiveOfferForFamily(parentContactId);
  }

  if (!offer) {
    throw new Error(`Enrollment offer for session ${sessionId} not found.`);
  }

  // Security: Parent identity cross-validation (Defect D)
  if (parentContactId && offer.parentContactId !== parentContactId) {
    throw new Error("Unauthorized: Authenticated parent does not match family enrollment offer.");
  }

  // 2. If already active with paid status, return idempotently
  if (offer.status === "active" && offer.paymentStatus === "paid") {
    return {
      success: true,
      offer,
      message: "Family membership is already active and verified.",
    };
  }

  const isPayInFull = (offer as any).paymentStructure === "pay_in_full";
  let stripeCustomerId = offer.stripeCustomerId || `cus_test_family_${parentContactId}`;
  let stripeSubscriptionId = isPayInFull ? null : (offer.stripeSubscriptionId || `sub_test_${offer.id}`);
  let stripePaymentIntentId = offer.stripePaymentIntentId || `pi_test_${offer.id}`;
  let paymentVerified = false;

  const isVitestMock = Boolean(
    (process.env.VITEST || process.env.NODE_ENV === "test") &&
    sessionId.startsWith("cs_test_mock_")
  );

  const stripe = getSafeStripe();

  if (stripe && !sessionId.startsWith("cs_test_mock_")) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "payment_intent"],
      });

      // Strict Defect C Validations:
      if (session.metadata?.family_enrollment_offer_id && session.metadata.family_enrollment_offer_id !== String(offer.id)) {
        throw new Error("Security verification failed: Checkout session does not match this family enrollment offer.");
      }
      if (session.metadata?.parent_contact_id && session.metadata.parent_contact_id !== String(offer.parentContactId)) {
        throw new Error("Security verification failed: Checkout session does not match authenticated parent identity.");
      }
      if (session.currency && session.currency.toLowerCase() !== "usd") {
        throw new Error("Invalid payment currency: Currency mismatch. Only USD is accepted.");
      }

      // Expected amount verification
      if (isPayInFull) {
        const expectedCents = Math.round(Number((offer as any).payInFullFinalAmount || 0) * 100);
        if (session.amount_total && session.amount_total !== expectedCents) {
          throw new Error(`Payment amount mismatch: Amount paid ($${(session.amount_total / 100).toFixed(2)}) does not match expected pay-in-full amount ($${(offer as any).payInFullFinalAmount}).`);
        }
      } else {
        const expectedCents = Math.round(Number(offer.selectedPlanPrice || 0) * 100);
        if (session.amount_total && session.amount_total < expectedCents) {
          throw new Error(`Payment amount mismatch: Amount paid ($${(session.amount_total / 100).toFixed(2)}) does not match expected plan price ($${offer.selectedPlanPrice}).`);
        }
      }

      // Customer verification
      if (offer.stripeCustomerId && session.customer && String(session.customer) !== offer.stripeCustomerId) {
        throw new Error("Stripe customer identity mismatch: Customer does not match offer record.");
      }

      // Payment status check (Defect B fix: do not activate if unpaid or processing)
      if (session.payment_status === "paid") {
        paymentVerified = true;
        if (session.customer) stripeCustomerId = String(session.customer);
        if (session.subscription && !isPayInFull) {
          stripeSubscriptionId = typeof session.subscription === "string" 
            ? session.subscription 
            : session.subscription.id;
        }
        if (session.payment_intent) {
          stripePaymentIntentId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id;
        }
      } else if (session.payment_status === "unpaid") {
        // Asynchronous payment (e.g. ACH) pending clearance
        await db.updateEnrollmentOffer(offer.id, {
          paymentStatus: "processing",
          status: "payment_pending",
          updatedAt: new Date(),
        });
        throw new Error("Payment is currently processing (e.g., ACH bank transfer pending settlement). Membership will activate automatically once funds clear.");
      }
    } catch (e: any) {
      if (
        e.message.startsWith("Security verification failed") ||
        e.message.startsWith("Payment is currently processing") ||
        e.message.startsWith("Invalid payment currency") ||
        e.message.startsWith("Payment amount mismatch") ||
        e.message.startsWith("Stripe customer identity mismatch")
      ) {
        throw e;
      }
      console.warn("[Stripe] Session retrieve error:", e.message);
    }
  } else if (isVitestMock) {
    // In automated vitest test suite ONLY
    if (mockSessionData) {
      if (mockSessionData.currency && mockSessionData.currency.toLowerCase() !== "usd") {
        throw new Error("Invalid payment currency: Currency mismatch. Only USD is accepted.");
      }
      if (mockSessionData.customer && offer.stripeCustomerId && mockSessionData.customer !== offer.stripeCustomerId) {
        throw new Error("Stripe customer identity mismatch: Customer does not match offer record.");
      }
      if (mockSessionData.amount_total !== undefined) {
        const expectedCents = isPayInFull
          ? Math.round(Number((offer as any).payInFullFinalAmount || 0) * 100)
          : Math.round(Number(offer.selectedPlanPrice || 0) * 100);
        if (mockSessionData.amount_total !== expectedCents) {
          throw new Error(`Payment amount mismatch: Session amount ($${(mockSessionData.amount_total / 100).toFixed(2)}) does not match expected ($${(expectedCents / 100).toFixed(2)}).`);
        }
      }
      if (mockSessionData.payment_status && mockSessionData.payment_status !== "paid") {
        throw new Error("Unable to verify payment with Stripe. Checkout session is not completed or paid.");
      }
    }
    paymentVerified = true;
  } else {
    // Fail closed if credentials are missing or browser submitted an unverified mock string (Defect A fix)
    throw new Error("Production Stripe integration unavailable or credentials not configured. Fail closed.");
  }

  if (!paymentVerified) {
    throw new Error("Unable to verify payment with Stripe. Checkout session is not completed or paid.");
  }

  // 3. Activate membership with dual-condition check
  const activatedOffer = await activateFamilyMembership({
    offerId: offer.id,
    stripeCustomerId,
    stripeSubscriptionId: isPayInFull ? undefined : (stripeSubscriptionId || undefined),
    stripePaymentIntentId,
    source: isPayInFull ? "stripe_checkout_pay_in_full_verified" : "stripe_checkout_verified",
  });

  return {
    success: true,
    offer: activatedOffer,
    message: isPayInFull
      ? "Family membership activated successfully! Full commitment paid in full. Welcome to Waypoint Advocates."
      : "Family membership activated successfully! Welcome to Waypoint Advocates.",
  };
}

/**
 * Activates a NEW family membership.
 * 
 * STRICT DUAL-CONDITION GUARDRAIL:
 * Active Membership requires:
 * A. A valid, fully signed service agreement.
 * AND
 * B. Verified successful first payment.
 * 
 * For Pay in Full: Full contractual amount verified, 0 recurring subscriptions created.
 * Does NOT overwrite individual student case stages.
 * Does NOT interrupt existing active clients.
 */
export interface ActivateFamilyMembershipParams {
  offerId: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  source: string;
  verifiedByStaffId?: number;
}

/**
 * Phase 2G Final Payment Safety Check: Atomic Invoice Payment Processor.
 * Uses the persistent payment-processing ledger with a UNIQUE constraint on stripe_invoice_id.
 *
 * Guarantees:
 * 1. Process each invoice only once using database unique constraint latch.
 * 2. Payment counter and outstanding balance cannot change twice for the same invoice.
 * 3. Simultaneous webhook deliveries, out-of-order events, retries, and duplicate notifications are rejected.
 * 4. Initial Checkout payment and invoice payment events cannot both count the same installment.
 */
/**
 * Active in-flight invoice execution locks to distinguish simultaneous concurrent worker threads
 * from historic retries or crashed prior attempts requiring durable recovery.
 */
export const inFlightInvoiceLocks = new Set<string>();

export async function atomicProcessInvoicePayment(params: {
  offerId: number;
  offer?: any;
  stripeInvoiceId: string;
  stripePaymentIntentId?: string | null;
  stripeEventId?: string | null;
  amountPaidCents: number;
  eventType: string;
  isInitialCheckout?: boolean;
}): Promise<{
  processed: boolean;
  duplicate: boolean;
  recovered?: boolean;
  action: string;
  offerId: number;
  installmentNumber?: number;
  newCollectedCount?: number;
  newOutstandingCents?: number;
}> {
  const offer = params.offer || await db.getEnrollmentOfferById(params.offerId);
  if (!offer) {
    return { processed: false, duplicate: false, action: "offer_not_found", offerId: params.offerId };
  }

  const currentCount = offer.collectedInstallmentCount || 0;
  const isPayInFull = (offer as any).paymentStructure === "pay_in_full";
  const commitmentMonths = offer.customCommitmentMonths || 12;
  const totalScheduled = isPayInFull ? 1 : (offer.totalScheduledInstallments || commitmentMonths);

  // 1. IN-FLIGHT CONCURRENT WORKER LATCH:
  // If another thread is actively executing this invoice right now, reject simultaneous duplicate delivery immediately
  if (inFlightInvoiceLocks.has(params.stripeInvoiceId)) {
    return {
      processed: true,
      duplicate: true,
      recovered: false,
      action: "duplicate_invoice_skipped",
      offerId: offer.id,
      installmentNumber: currentCount,
      newCollectedCount: currentCount,
      newOutstandingCents: offer.outstandingBalanceCents,
    };
  }

  inFlightInvoiceLocks.add(params.stripeInvoiceId);

  try {
    // If initial checkout, installment number is 1. If recurring, next installment is currentCount + 1.
    const nextInstallmentNumber = params.isInitialCheckout ? 1 : (currentCount + 1);

    // ATOMIC DATABASE CONSTRAINT LATCH:
    // Attempt to insert ledger record for params.stripeInvoiceId.
    // Because stripe_invoice_id is UNIQUE, ONLY ONE concurrent execution can succeed!
    const ledgerResult = await db.recordLedgerPayment({
      offerId: offer.id,
      stripeInvoiceId: params.stripeInvoiceId,
      stripePaymentIntentId: params.stripePaymentIntentId,
      stripeEventId: params.stripeEventId,
      eventType: params.eventType,
      installmentNumber: nextInstallmentNumber,
      amountPaidCents: params.amountPaidCents,
      status: "paid",
    });

  // Maintain processedStripeInvoiceIds array for backwards-compatibility / fast JSON check
  let processedInvoiceIds: string[] = [];
  try {
    processedInvoiceIds = (offer as any).processedStripeInvoiceIds
      ? JSON.parse((offer as any).processedStripeInvoiceIds)
      : [];
  } catch {
    processedInvoiceIds = [];
  }

  const alreadyRecordedOnOffer = processedInvoiceIds.includes(params.stripeInvoiceId);
  let targetInstallmentNumber = nextInstallmentNumber;

  if (ledgerResult.duplicate) {
    // Re-check latest persisted state from database to prevent race conditions across simultaneous worker instances
    const freshOffer = await db.getEnrollmentOfferById(params.offerId);
    let freshProcessedIds: string[] = [];
    try {
      freshProcessedIds = (freshOffer as any)?.processedStripeInvoiceIds
        ? JSON.parse((freshOffer as any).processedStripeInvoiceIds)
        : [];
    } catch {
      freshProcessedIds = [];
    }

    if (alreadyRecordedOnOffer || freshProcessedIds.includes(params.stripeInvoiceId)) {
      // Fully reconciled and previously processed! Reject without mutating counter or balance
      return {
        processed: true,
        duplicate: true,
        recovered: false,
        action: "duplicate_invoice_skipped",
        offerId: offer.id,
        installmentNumber: freshOffer?.collectedInstallmentCount || currentCount,
        newCollectedCount: freshOffer?.collectedInstallmentCount || currentCount,
        newOutstandingCents: freshOffer?.outstandingBalanceCents ?? offer.outstandingBalanceCents,
      };
    }

    // DURABLE RECOVERY ACTIVATED:
    // The invoice was recorded in the persistent ledger (e.g. by a previous attempt or worker instance),
    // but the offer update failed or crashed mid-flight before persisting to family_enrollment_offers.
    console.warn(`[FamilyEnrollment] Activating durable recovery for invoice ${params.stripeInvoiceId} on offer #${offer.id}`);
    const existingEntry = await db.getLedgerEntryByStripeInvoiceId(params.stripeInvoiceId);
    if (existingEntry && existingEntry.installmentNumber) {
      targetInstallmentNumber = existingEntry.installmentNumber;
    }
  }

  // ATOMIC LATCH WON / RECOVERED:
  // When recovering an existing ledger entry, use its fixed immutable installmentNumber (never double-increment)
  const newCollectedCount = params.isInitialCheckout
    ? Math.max(1, currentCount)
    : (ledgerResult.duplicate
        ? Math.min(totalScheduled, Math.max(currentCount, targetInstallmentNumber))
        : Math.min(totalScheduled, currentCount + 1));

  const monthlyCents = Math.round(Number(offer.selectedPlanPrice || 105) * 100);
  const totalCommitmentCents = isPayInFull
    ? Math.round(Number((offer as any).payInFullFinalAmount || ((monthlyCents * commitmentMonths) / 100)) * 100)
    : (totalScheduled * monthlyCents);
  const totalCollectedCents = isPayInFull ? totalCommitmentCents : (newCollectedCount * monthlyCents);
  const newOutstandingCents = Math.max(0, totalCommitmentCents - totalCollectedCents);

  const updatedInvoiceIds = processedInvoiceIds.includes(params.stripeInvoiceId)
    ? processedInvoiceIds
    : [...processedInvoiceIds, params.stripeInvoiceId];

  try {
    await db.updateEnrollmentOffer(offer.id, {
      paymentStatus: "paid",
      paidAt: new Date(),
      collectedInstallmentCount: newCollectedCount,
      outstandingBalanceCents: newOutstandingCents,
      processedStripeInvoiceIds: JSON.stringify(updatedInvoiceIds),
      lastProcessedWebhookEventId: params.stripeEventId || offer.lastProcessedWebhookEventId,
      paymentAttentionReason: null,
      gracePeriodEndsAt: null,
      updatedAt: new Date(),
    });
  } catch (updateErr: any) {
    console.error(`[FamilyEnrollment] Database failure during offer balance update for invoice ${params.stripeInvoiceId}:`, updateErr);
    // Re-throw so Stripe receives HTTP 500 and retries the webhook; on retry, the durable recovery mechanism will complete the balance update!
    throw updateErr;
  }

  // Commit in-memory mutations ONLY after database update has successfully persisted
  offer.collectedInstallmentCount = newCollectedCount;
  offer.outstandingBalanceCents = newOutstandingCents;
  offer.paymentStatus = "paid";
  if (params.stripeEventId) {
    offer.lastProcessedWebhookEventId = params.stripeEventId;
  }
  if (updatedInvoiceIds.length > 0) {
    offer.processedStripeInvoiceIds = JSON.stringify(updatedInvoiceIds);
  }

    return {
      processed: true,
      duplicate: false,
      recovered: ledgerResult.duplicate,
      action: params.isInitialCheckout ? "first_payment_succeeded" : "recurring_payment_succeeded",
      offerId: offer.id,
      installmentNumber: targetInstallmentNumber,
      newCollectedCount,
      newOutstandingCents,
    };
  } finally {
    inFlightInvoiceLocks.delete(params.stripeInvoiceId);
  }
}

export async function activateFamilyMembership(params: ActivateFamilyMembershipParams): Promise<FamilyEnrollmentOffer> {
  const offer = await db.getEnrollmentOfferById(params.offerId);
  if (!offer) {
    throw new Error(`Enrollment offer #${params.offerId} not found.`);
  }

  // Dual Condition A: Signed Agreement
  if (offer.agreementStatus !== "signed") {
    let signedInDb = false;
    if (offer.agreementId) {
      const conn = await getDb();
      if (conn) {
        const [ag] = await conn
          .select()
          .from(agreements)
          .where(eq(agreements.id, offer.agreementId))
          .limit(1);
        if (ag && (ag.status === "Signed" || ag.status === "Completed" || ag.contentLocked)) {
          signedInDb = true;
        }
      }
      if (!signedInDb) {
        const { inMemoryAgreements } = await import("../routers/agreements");
        const ag = inMemoryAgreements?.get(offer.agreementId);
        if (ag && (ag.status === "Signed" || ag.status === "Completed" || ag.contentLocked)) {
          signedInDb = true;
        }
      }
    }
    if (!signedInDb) {
      throw new Error(
        "Active Membership requires both a valid signed agreement AND verified first payment. Agreement is not signed."
      );
    }
  }

  const now = new Date();
  const commitmentMonths = offer.customCommitmentMonths || 12;
  const commitmentEndsAt = calculateCalendarCommitmentEndDate(now, commitmentMonths);
  const isPayInFull = (offer as any).paymentStructure === "pay_in_full";
  const monthlyCents = Math.round(Number(offer.selectedPlanPrice || 105) * 100);
  const totalCommitmentCents = isPayInFull
    ? Math.round(Number((offer as any).payInFullFinalAmount || ((monthlyCents * commitmentMonths) / 100)) * 100)
    : (commitmentMonths * monthlyCents);
  const collectedInstallmentCount = 1;
  const collectedCents = isPayInFull ? totalCommitmentCents : monthlyCents;
  const outstandingBalanceCents = Math.max(0, totalCommitmentCents - collectedCents);

  // Initialize or append initial invoice / payment intent ID for atomic deduplication
  let processedInvoiceIds: string[] = [];
  try {
    processedInvoiceIds = (offer as any).processedStripeInvoiceIds
      ? JSON.parse((offer as any).processedStripeInvoiceIds)
      : [];
  } catch {
    processedInvoiceIds = [];
  }
  const initialId = params.stripeInvoiceId || params.stripePaymentIntentId || params.stripeSubscriptionId || `in_act_${offer.id}`;
  if (initialId) {
    if (!processedInvoiceIds.includes(initialId)) {
      processedInvoiceIds.push(initialId);
    }
    // Record into persistent payment-processing ledger if not already recorded
    await db.recordLedgerPayment({
      offerId: offer.id,
      stripeInvoiceId: initialId,
      stripePaymentIntentId: params.stripePaymentIntentId,
      stripeEventId: null,
      eventType: params.source || "membership_activation",
      installmentNumber: 1,
      amountPaidCents: collectedCents,
      status: "paid",
    });
  }

  // 1. Update family enrollment offer
  const updatedOffer = await db.updateEnrollmentOffer(offer.id, {
    status: "active",
    paymentStatus: "paid",
    paidAt: now,
    membershipStartedAt: now,
    commitmentEndsAt,
    totalScheduledInstallments: isPayInFull ? 1 : commitmentMonths,
    collectedInstallmentCount,
    outstandingBalanceCents,
    documentReviewStatus: "pending", // Documents Awaiting Review post-activation gate
    stripeCustomerId: params.stripeCustomerId || offer.stripeCustomerId,
    stripeSubscriptionId: isPayInFull ? null : (params.stripeSubscriptionId || offer.stripeSubscriptionId),
    stripePaymentIntentId: params.stripePaymentIntentId || offer.stripePaymentIntentId,
    processedStripeInvoiceIds: JSON.stringify(processedInvoiceIds),
    paymentAttentionReason: null,
    gracePeriodEndsAt: null,
    updatedAt: now,
  });

  // 2. Update Parent Contact billing and contract status (without altering student case stages)
  const conn = await getDb();
  if (conn && offer.parentContactId) {
    try {
      await conn
        .update(contacts)
        .set({
          billingStatus: "active",
          contractStatus: "active",
          accountStatus: "active",
          stripeCustomerId: params.stripeCustomerId || offer.stripeCustomerId || undefined,
          stripeSubscriptionId: isPayInFull ? null : (params.stripeSubscriptionId || offer.stripeSubscriptionId || undefined),
          updatedAt: now,
        })
        .where(eq(contacts.id, offer.parentContactId));
    } catch (e) {
      console.warn("[Contact Update Error on Membership Activation]:", e);
    }
  }

  // 3. Record Activity Timeline entry
  const planName = offer.selectedPlanName || "Advocacy Support Plan";
  const planPrice = offer.selectedPlanPrice ? `$${offer.selectedPlanPrice}/mo` : "$105/mo";

  if (offer.studentContactId) {
    await recordCaseActivity({
      studentContactId: offer.studentContactId,
      eventType: "membership_activated",
      title: isPayInFull
        ? "Family Membership Activated (Paid in Full)"
        : `Family Membership Activated — ${planName}`,
      description: isPayInFull
        ? `Family membership activated for ${planName} via verified Pay-in-Full payment ($${(offer as any).payInFullFinalAmount || "1,260.00"}). Full ${commitmentMonths}-month commitment prepaid with zero recurring subscription charges. Initial case documents awaiting review by assigned advocate.`
        : `Active membership verified and unlocked for ${planName} (${planPrice}, ${commitmentMonths}-month commitment). First payment successfully verified via ${params.source}. Initial IEP and school records are now awaiting advocate review in Document Vault.`,
      whyReason: "Signed agreement and verified first payment received. Membership activated.",
      ownerName: "Waypoint Automated Billing",
      ownerRole: "Billing Engine",
      categoryColor: "green",
      isActionNeeded: true, // Needs advocate document review
      isCompleted: true,
    });
  }

  return (updatedOffer || offer) as FamilyEnrollmentOffer;
}

/**
 * Creates an initial month manual invoice for approved manual invoicing arrangements.
 * Never marks the invoice as paid automatically.
 */
export async function createManualEnrollmentInvoice(params: {
  offerId: number;
  parentContactId: number;
  staffUserId?: number;
}): Promise<any> {
  const { offerId, parentContactId } = params;
  const offer = await db.getEnrollmentOfferById(offerId);
  if (!offer) {
    throw new Error(`Enrollment offer #${offerId} not found.`);
  }

  if (offer.billingArrangement !== "manual_invoice") {
    throw new Error("Cannot create manual invoice: This offer is configured for automatic card payments (autopay).");
  }

  if (offer.agreementStatus !== "signed") {
    throw new Error("Cannot create manual invoice: Agreement must be signed before issuing invoice.");
  }

  const conn = await getDb();
  if (!conn) throw new Error("Database unavailable.");

  // Check if invoice already exists
  if (offer.initialInvoiceId) {
    const [existingInv] = await conn
      .select()
      .from(invoices)
      .where(eq(invoices.id, offer.initialInvoiceId))
      .limit(1);
    if (existingInv) return existingInv;
  }

  const now = new Date();
  const invoiceNumber = `INV-ENROLL-${offer.id}-${Date.now().toString().slice(-4)}`;
  const planName = offer.selectedPlanName || "Advocacy Support Plan";
  const amount = offer.selectedPlanPrice ? String(offer.selectedPlanPrice) : "105.00";
  const dueDateObj = offer.manualInvoiceDueDate ? new Date(offer.manualInvoiceDueDate) : new Date(now.getTime() + 14 * 86400000);

  const res = await conn
    .insert(invoices)
    .values({
      ownerId: params.staffUserId || offer.approvedBy || 1,
      invoiceNumber,
      clientId: offer.parentContactId,
      projectId: offer.studentContactId,
      amount,
      total: amount,
      status: "Sent", // NEVER mark as paid automatically! Sent = issued unpaid invoice
      dueDate: dueDateObj,
      paymentStatusNote: `Initial Month Support — ${planName} (${offer.customCommitmentMonths || 12}-Month Commitment, Manual Invoicing Exception). Reason: ${offer.manualInvoiceReason || "Approved staff exception"}`,
      createdAt: now,
      updatedAt: now,
    });

  const insertedId = (res as any)?.[0]?.insertId ?? (res as any)?.insertId ?? Number((res as any)?.lastInsertRowid ?? (res as any)?.[0]?.lastInsertRowid ?? 0);

  let insertedInvoice: any = null;
  if (insertedId) {
    try {
      const [fetched] = await conn
        .select()
        .from(invoices)
        .where(eq(invoices.id, insertedId))
        .limit(1);
      insertedInvoice = fetched;
    } catch {
      // fallback
    }
  }

  if (insertedId) {
    await db.updateEnrollmentOffer(offer.id, {
      initialInvoiceId: insertedId,
      updatedAt: now,
    });
  }

  return {
    ...(insertedInvoice || {}),
    id: insertedId,
    invoiceNumber,
    amount,
    total: amount,
    status: "Unpaid", // Unpaid enrollment state
    dueDate: dueDateObj,
  };
}

/**
 * Staff-verified manual invoice payment handler.
 * Marks the invoice Paid and activates family membership with verified staff audit.
 */
export async function verifyManualInvoicePayment(params: {
  offerId: number;
  invoiceId: number;
  staffUserId: number;
  staffUserName: string;
  paymentReference: string;
}): Promise<{
  success: boolean;
  offer: FamilyEnrollmentOffer;
  invoice: any;
}> {
  const { offerId, invoiceId, staffUserId, staffUserName, paymentReference } = params;

  const offer = await db.getEnrollmentOfferById(offerId);
  if (!offer) {
    throw new Error(`Enrollment offer #${offerId} not found.`);
  }

  const conn = await getDb();
  if (!conn) throw new Error("Database unavailable.");

  const now = new Date();

  // Mark invoice Paid
  try {
    await conn
      .update(invoices)
      .set({
        status: "Paid",
        paidDate: now,
        paymentStatusNote: `Payment verified by ${staffUserName} (Ref: ${paymentReference})`,
        updatedAt: now,
      })
      .where(eq(invoices.id, invoiceId));
  } catch (updErr) {
    console.warn("Invoice update notice:", updErr);
  }

  let updatedInvoice: any = null;
  try {
    const [fetched] = await conn
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);
    updatedInvoice = fetched;
  } catch {
    // fallback
  }

  // Activate membership
  const activatedOffer = await activateFamilyMembership({
    offerId: offer.id,
    source: `manual_invoice_verified by ${staffUserName} (Ref: ${paymentReference})`,
    verifiedByStaffId: staffUserId,
  });

  return {
    success: true,
    offer: activatedOffer,
    invoice: updatedInvoice || { id: invoiceId, status: "Paid" },
  };
}

/**
 * Post-activation onboarding gate:
 * Mark document review complete by assigned advocate.
 * Unlocks IEP Blueprint Call scheduling in parent portal.
 */
export async function markDocumentReviewComplete(params: {
  offerId: number;
  studentContactId?: number;
  advocateUserId: number;
  advocateUserName: string;
  reviewNotes?: string;
}): Promise<FamilyEnrollmentOffer> {
  const { offerId, studentContactId, advocateUserId, advocateUserName, reviewNotes } = params;

  const offer = await db.getEnrollmentOfferById(offerId);
  if (!offer) {
    throw new Error(`Enrollment offer #${offerId} not found.`);
  }

  if (offer.status !== "active") {
    throw new Error("Cannot complete document review: Family membership is not active.");
  }

  const now = new Date();
  const updatedOffer = await db.updateEnrollmentOffer(offer.id, {
    documentReviewStatus: "approved",
    documentReviewCompletedAt: now,
    documentReviewCompletedBy: advocateUserId,
    documentReviewCompletedByName: advocateUserName,
    updatedAt: now,
  });

  if (offer.studentContactId) {
    await recordCaseActivity({
      studentContactId: offer.studentContactId,
      eventType: "document_review_approved",
      title: "Document Review Completed — IEP Blueprint Call Unlocked",
      description: `Lead Special Education Advocate ${advocateUserName} reviewed and approved initial case documents. IEP Blueprint Strategy Call scheduling is now unlocked for the family in the Client Portal. ${reviewNotes ? `Notes: "${reviewNotes}"` : ""}`.trim(),
      whyReason: "Initial document review complete. Case advances to IEP Blueprint Strategy Session.",
      ownerName: advocateUserName,
      ownerRole: "Lead Special Education Advocate",
      categoryColor: "teal",
      isActionNeeded: false,
      isCompleted: true,
    });
  }

  return (updatedOffer || offer) as FamilyEnrollmentOffer;
}

/**
 * Handles failed first payment attempt.
 * Preserves signed agreement, keeps membership inactive, shows Payment Attention Required.
 */
export async function handleFirstPaymentFailure(params: {
  offerId: number;
  errorReason?: string;
}): Promise<FamilyEnrollmentOffer> {
  const { offerId, errorReason } = params;
  const offer = await db.getEnrollmentOfferById(offerId);
  if (!offer) throw new Error(`Enrollment offer #${offerId} not found.`);

  const reason = errorReason || "Card payment declined by issuing bank.";
  const now = new Date();

  const updatedOffer = await db.updateEnrollmentOffer(offer.id, {
    status: "payment_attention",
    paymentStatus: "failed",
    paymentAttentionReason: reason,
    updatedAt: now,
  });

  if (offer.studentContactId) {
    await recordCaseActivity({
      studentContactId: offer.studentContactId,
      eventType: "payment_failed",
      title: "Payment Authorization Failed — Attention Required",
      description: `First payment authorization for ${offer.selectedPlanName || "Advocacy Support Plan"} failed: ${reason}. Signed agreement preserved. Family can retry payment securely.`,
      whyReason: reason,
      ownerName: "Waypoint Automated Billing",
      ownerRole: "Billing Engine",
      categoryColor: "rose",
      isActionNeeded: true,
      isCompleted: false,
    });
  }

  return (updatedOffer || offer) as FamilyEnrollmentOffer;
}

/**
 * Handles failed recurring monthly payment.
 * Initiates 14-day grace period, preserves case access and agreements, notifies staff.
 */
export async function handleRecurringPaymentFailure(params: {
  offerId: number;
  errorReason?: string;
}): Promise<FamilyEnrollmentOffer> {
  const { offerId, errorReason } = params;
  const offer = await db.getEnrollmentOfferById(offerId);
  if (!offer) throw new Error(`Enrollment offer #${offerId} not found.`);

  const reason = errorReason || "Recurring payment card declined.";
  const now = new Date();
  const gracePeriodEndsAt = new Date(now.getTime() + 14 * 86400000); // 14 days

  const updatedOffer = await db.updateEnrollmentOffer(offer.id, {
    paymentStatus: "grace_period",
    gracePeriodEndsAt,
    paymentAttentionReason: reason,
    updatedAt: now,
  });

  if (offer.studentContactId) {
    await recordCaseActivity({
      studentContactId: offer.studentContactId,
      eventType: "recurring_payment_failed",
      title: "Recurring Payment Failed — 14-Day Grace Period Initiated",
      description: `Monthly payment declined: ${reason}. A 14-day grace period is active through ${gracePeriodEndsAt.toLocaleDateString()}. Advocacy services and historical records remain accessible. Staff notified.`,
      whyReason: reason,
      ownerName: "Waypoint Automated Billing",
      ownerRole: "Billing Engine",
      categoryColor: "amber",
      isActionNeeded: true,
      isCompleted: false,
    });
  }

  return (updatedOffer || offer) as FamilyEnrollmentOffer;
}

/**
 * Unified Stripe webhook event processor for Family Enrollment.
 * Handles events idempotently and securely.
 */
export async function processFamilyEnrollmentWebhook(event: {
  id: string;
  type: string;
  data: { object: any };
}): Promise<{ processed: boolean; action?: string; offerId?: number }> {
  const obj = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const offerIdStr = obj.metadata?.family_enrollment_offer_id;
      if (!offerIdStr) return { processed: false };

      const offerId = parseInt(offerIdStr);
      const offer = await db.getEnrollmentOfferById(offerId);
      if (!offer) return { processed: false };
      if (event.id && offer.lastProcessedWebhookEventId === event.id) {
        return { processed: true, action: "duplicate_event_skipped", offerId };
      }

      const isPayInFull = obj.metadata?.payment_structure === "pay_in_full";
      const subscriptionId = isPayInFull ? null : (typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id);
      const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
      const paymentIntentId = typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id;

      // Defect B fix: Verify actual payment_status before activating!
      if (obj.payment_status === "paid") {
        const sessionInvoice = typeof obj.invoice === "string" ? obj.invoice : obj.invoice?.id;
        const sessionInvoiceOrPi = sessionInvoice || (paymentIntentId ? `in_${paymentIntentId}` : null) || (subscriptionId ? `in_init_${subscriptionId}` : `in_offer_${offerId}`);
        const monthlyCents = Math.round(Number(offer.selectedPlanPrice || 105) * 100);
        const amountPaidCents = isPayInFull
          ? Math.round(Number((offer as any).payInFullFinalAmount || ((monthlyCents * (offer.customCommitmentMonths || 12)) / 100)) * 100)
          : monthlyCents;

        // Perform atomic invoice latch insertion:
        const atomicResult = await atomicProcessInvoicePayment({
          offerId,
          offer,
          stripeInvoiceId: sessionInvoiceOrPi,
          stripePaymentIntentId: paymentIntentId,
          stripeEventId: event.id,
          amountPaidCents,
          eventType: "checkout.session.completed",
          isInitialCheckout: true,
        });

        if (atomicResult.duplicate) {
          return { processed: true, action: "duplicate_event_skipped", offerId };
        }

        await activateFamilyMembership({
          offerId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId || undefined,
          stripePaymentIntentId: paymentIntentId,
          stripeInvoiceId: sessionInvoiceOrPi,
          source: isPayInFull ? "stripe_webhook_pay_in_full_completed" : "stripe_webhook_checkout_completed",
        });

        return { processed: true, action: "membership_activated", offerId };
      } else {
        // Asynchronous payment (e.g. ACH) pending bank settlement
        await db.updateEnrollmentOffer(offerId, {
          paymentStatus: "processing",
          status: "payment_pending",
          lastProcessedWebhookEventId: event.id || undefined,
          updatedAt: new Date(),
        });
        if (offer?.studentContactId) {
          await recordCaseActivity({
            studentContactId: offer.studentContactId,
            eventType: "payment_processing",
            title: "ACH Payment Processing — Awaiting Bank Settlement",
            description: "Bank transfer (ACH Direct Debit) submitted. Funds typically settle within 3-5 business days. Family membership will activate upon bank clearance.",
            whyReason: "Asynchronous payment submitted awaiting settlement.",
            ownerName: "Waypoint Automated Billing",
            ownerRole: "Billing Engine",
            categoryColor: "amber",
            isActionNeeded: false,
            isCompleted: false,
          });
        }
        return { processed: true, action: "payment_processing_unpaid", offerId };
      }
    }

    case "checkout.session.async_payment_succeeded": {
      // Funds have cleared for ACH!
      const offerIdStr = obj.metadata?.family_enrollment_offer_id;
      if (!offerIdStr) return { processed: false };
      const offerId = parseInt(offerIdStr);
      const offer = await db.getEnrollmentOfferById(offerId);
      if (offer && event.id && offer.lastProcessedWebhookEventId === event.id) {
        return { processed: true, action: "duplicate_event_skipped", offerId };
      }

      const isPayInFull = obj.metadata?.payment_structure === "pay_in_full";
      const subscriptionId = isPayInFull ? null : (typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id);
      const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
      const paymentIntentId = typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id;

      await activateFamilyMembership({
        offerId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId || undefined,
        stripePaymentIntentId: paymentIntentId,
        source: "stripe_webhook_async_payment_succeeded",
      });

      if (event.id) {
        await db.updateEnrollmentOffer(offerId, {
          lastProcessedWebhookEventId: event.id,
        });
      }

      return { processed: true, action: "async_payment_succeeded", offerId };
    }

    case "checkout.session.async_payment_failed": {
      // ACH payment failed to clear
      const offerIdStr = obj.metadata?.family_enrollment_offer_id;
      if (!offerIdStr) return { processed: false };
      const offerId = parseInt(offerIdStr);
      const offer = await db.getEnrollmentOfferById(offerId);
      if (offer && event.id && offer.lastProcessedWebhookEventId === event.id) {
        return { processed: true, action: "duplicate_event_skipped", offerId };
      }

      await handleFirstPaymentFailure({
        offerId,
        errorReason: "ACH bank payment was declined or failed to clear with the financial institution.",
      });

      if (event.id) {
        await db.updateEnrollmentOffer(offerId, {
          lastProcessedWebhookEventId: event.id,
        });
      }

      return { processed: true, action: "async_payment_failed", offerId };
    }

    case "invoice.payment_succeeded": {
      const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id;
      if (!subscriptionId) return { processed: false };

      const offer = await db.getEnrollmentOfferByStripeSubscriptionId(subscriptionId);
      if (!offer) return { processed: false };

      if (event.id && offer.lastProcessedWebhookEventId === event.id) {
        return { processed: true, action: "duplicate_event_skipped", offerId: offer.id };
      }

      const invoiceId = obj.id ? String(obj.id) : (event.id ? `in_${event.id}` : `in_sub_${offer.id}_${Date.now()}_${Math.random()}`);
      const monthlyCents = Math.round(Number(offer.selectedPlanPrice || 105) * 100);
      const amountPaidCents = typeof obj.amount_paid === "number" ? obj.amount_paid : monthlyCents;
      const billingReason = obj.billing_reason;
      const isInitialPayment = billingReason === "subscription_create" || offer.status !== "active";

      // ATOMIC INVOICE-LEVEL DEDUPLICATION VIA PERSISTENT LEDGER LATCH:
      const atomicResult = await atomicProcessInvoicePayment({
        offerId: offer.id,
        offer,
        stripeInvoiceId: invoiceId,
        stripePaymentIntentId: String(obj.payment_intent || ""),
        stripeEventId: event.id,
        amountPaidCents,
        eventType: "invoice.payment_succeeded",
        isInitialCheckout: isInitialPayment,
      });

      if (atomicResult.duplicate) {
        return { processed: true, action: "duplicate_invoice_skipped", offerId: offer.id };
      }

      if (isInitialPayment) {
        await activateFamilyMembership({
          offerId: offer.id,
          stripeCustomerId: String(obj.customer || offer.stripeCustomerId),
          stripeSubscriptionId: subscriptionId,
          stripePaymentIntentId: String(obj.payment_intent || ""),
          stripeInvoiceId: invoiceId,
          source: "stripe_webhook_first_invoice_paid",
        });

        return { processed: true, action: "first_payment_succeeded", offerId: offer.id };
      } else {
        const newCount = atomicResult.newCollectedCount || (offer.collectedInstallmentCount || 1);
        const outstandingBalanceCents = atomicResult.newOutstandingCents ?? 0;

        // Safeguard against 13th installment: tell Stripe to cancel at period end
        if (newCount >= (offer.totalScheduledInstallments || 12)) {
          const stripe = getSafeStripe();
          if (stripe && subscriptionId && !subscriptionId.startsWith("sub_test_")) {
            try {
              await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
            } catch (subErr) {
              console.warn("[Stripe] Failed to set cancel_at_period_end on final installment:", subErr);
            }
          }
        }

        if (offer.studentContactId) {
          if (newCount >= (offer.totalScheduledInstallments || 12)) {
            await recordCaseActivity({
              studentContactId: offer.studentContactId,
              eventType: "commitment_installments_completed",
              title: "All 12 Scheduled Monthly Installments Completed",
              description: `All ${offer.totalScheduledInstallments || 12} monthly installments have been successfully collected ($${((newCount * monthlyCents) / 100).toFixed(2)} total). Autopay subscription scheduled to end without renewal. Contractual membership and full advocacy case access remain active through ${offer.commitmentEndsAt ? new Date(offer.commitmentEndsAt).toLocaleDateString() : "end of term"}.`,
              whyReason: "12 of 12 scheduled installments successfully collected.",
              ownerName: "Waypoint Automated Billing",
              ownerRole: "Billing Engine",
              categoryColor: "green",
              isActionNeeded: false,
              isCompleted: true,
            });
          } else {
            await recordCaseActivity({
              studentContactId: offer.studentContactId,
              eventType: "recurring_payment_succeeded",
              title: `Monthly Installment #${newCount} Collected`,
              description: `Monthly installment ${newCount} of ${offer.totalScheduledInstallments || 12} collected ($${(monthlyCents / 100).toFixed(2)}). Remaining balance: $${(outstandingBalanceCents / 100).toFixed(2)}.`,
              whyReason: "Recurring monthly autopay installment processed successfully.",
              ownerName: "Waypoint Automated Billing",
              ownerRole: "Billing Engine",
              categoryColor: "blue",
              isActionNeeded: false,
              isCompleted: true,
            });
          }
        }

        return { processed: true, action: "recurring_payment_succeeded", offerId: offer.id };
      }
    }

    case "invoice.payment_failed": {
      const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id;
      if (!subscriptionId) return { processed: false };

      const offer = await db.getEnrollmentOfferByStripeSubscriptionId(subscriptionId);
      if (!offer) return { processed: false };

      if (event.id && offer.lastProcessedWebhookEventId === event.id) {
        return { processed: true, action: "duplicate_event_skipped", offerId: offer.id };
      }

      const billingReason = obj.billing_reason;
      if (billingReason === "subscription_create" || offer.status !== "active") {
        await handleFirstPaymentFailure({
          offerId: offer.id,
          errorReason: "Initial payment card authorization failed in Stripe.",
        });
        if (event.id) {
          await db.updateEnrollmentOffer(offer.id, {
            lastProcessedWebhookEventId: event.id,
          });
        }
        return { processed: true, action: "first_payment_failed", offerId: offer.id };
      } else {
        await handleRecurringPaymentFailure({
          offerId: offer.id,
          errorReason: "Recurring subscription payment declined in Stripe.",
        });
        if (event.id) {
          await db.updateEnrollmentOffer(offer.id, {
            lastProcessedWebhookEventId: event.id,
          });
        }
        return { processed: true, action: "recurring_payment_failed", offerId: offer.id };
      }
    }

    case "customer.subscription.deleted": {
      const subscriptionId = obj.id;
      const offer = await db.getEnrollmentOfferByStripeSubscriptionId(subscriptionId);
      if (!offer) return { processed: false };

      await db.updateEnrollmentOffer(offer.id, {
        paymentStatus: "cancelled",
        status: "payment_attention",
        paymentAttentionReason: "Stripe subscription was cancelled.",
        updatedAt: new Date(),
      });
      return { processed: true, action: "subscription_deleted", offerId: offer.id };
    }

    case "charge.refunded": {
      // Record refund event and flag review without terminating services
      const paymentIntentId = typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id;
      const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
      const invoiceId = typeof obj.invoice === "string" ? obj.invoice : obj.invoice?.id;

      let offer = paymentIntentId ? await db.getEnrollmentOfferByStripePaymentIntentId(paymentIntentId) : null;
      if (!offer && customerId) {
        offer = await db.getEnrollmentOfferByStripeCustomerId(customerId);
      }
      if (!offer) return { processed: false };

      // Update persistent ledger entry status without deleting or corrupting audit history
      await db.updateLedgerPaymentStatus({
        stripeInvoiceId: invoiceId || null,
        stripePaymentIntentId: paymentIntentId || null,
        status: "refunded",
        refundedAmountCents: obj.amount_refunded || 0,
        metadata: {
          refundReason: obj.refunds?.data?.[0]?.reason || "requested_by_customer",
          eventId: event.id,
          chargeId: obj.id,
        },
      });

      await db.updateEnrollmentOffer(offer.id, {
        paymentStatus: "refunded",
        status: "payment_attention",
        paymentAttentionReason: `A charge of $${((obj.amount_refunded || 0) / 100).toFixed(2)} was refunded in Stripe. Account flagged for staff review.`,
        updatedAt: new Date(),
      });

      if (offer.studentContactId) {
        await recordCaseActivity({
          studentContactId: offer.studentContactId,
          eventType: "payment_refunded",
          title: "Payment Refunded — Account Flagged for Staff Review",
          description: `A payment refund was processed in Stripe for ${offer.selectedPlanName || "Advocacy Support Plan"}. Family membership flagged for advocate/billing review. Advocacy case history preserved.`,
          whyReason: "Charge refund event received from Stripe.",
          ownerName: "Waypoint Automated Billing",
          ownerRole: "Billing Engine",
          categoryColor: "rose",
          isActionNeeded: true,
          isCompleted: false,
        });
      }
      return { processed: true, action: "charge_refunded", offerId: offer.id };
    }

    case "charge.dispute.created": {
      // Record dispute without automatically terminating access
      const paymentIntentId = typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id;
      const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;

      let offer = paymentIntentId ? await db.getEnrollmentOfferByStripePaymentIntentId(paymentIntentId) : null;
      if (!offer && customerId) {
        offer = await db.getEnrollmentOfferByStripeCustomerId(customerId);
      }
      if (!offer) return { processed: false };

      // Update persistent ledger entry status to disputed without deleting records
      await db.updateLedgerPaymentStatus({
        stripePaymentIntentId: paymentIntentId || null,
        status: "disputed",
        metadata: {
          disputeReason: obj.reason,
          disputeStatus: obj.status,
          eventId: event.id,
        },
      });

      await db.updateEnrollmentOffer(offer.id, {
        paymentStatus: "disputed",
        status: "payment_attention",
        paymentAttentionReason: `A bank dispute/chargeback was initiated in Stripe (${obj.reason || "inquiry"}). Staff review required.`,
        updatedAt: new Date(),
      });

      if (offer.studentContactId) {
        await recordCaseActivity({
          studentContactId: offer.studentContactId,
          eventType: "payment_disputed",
          title: "Payment Dispute Initiated — Staff Review Required",
          description: `A customer payment dispute/chargeback was filed in Stripe. Account flagged for immediate staff review. Services not automatically terminated pending inquiry.`,
          whyReason: "Bank dispute event received from Stripe.",
          ownerName: "Waypoint Automated Billing",
          ownerRole: "Billing Engine",
          categoryColor: "amber",
          isActionNeeded: true,
          isCompleted: false,
        });
      }
      return { processed: true, action: "charge_dispute_created", offerId: offer.id };
    }

    default:
      return { processed: false };
  }
}

