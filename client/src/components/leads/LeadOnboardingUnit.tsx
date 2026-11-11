import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  ShieldCheck,
  FileSignature,
  CreditCard,
  UserCheck,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Lock,
  ArrowRight,
  Users,
} from "lucide-react";

interface LeadOnboardingUnitProps {
  workspace: any;
  onRefresh: () => void;
}

export function LeadOnboardingUnit({
  workspace,
  onRefresh,
}: LeadOnboardingUnitProps) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const enrollment = workspace.enrollment || {};
  const activeOffer = enrollment.activeOffer;
  const requirements: any[] = enrollment.onboardingRequirements || [];
  const blockers: string[] = enrollment.onboardingBlockers || [];
  const canActivate = Boolean(enrollment.canActivate);
  const isActivated = workspace.journey?.stage === "active" || workspace.lead?.status === "Won";

  const requiredItems = requirements.filter((r) => r.required);
  const optionalItems = requirements.filter((r) => !r.required);

  const [selectedPlanKey, setSelectedPlanKey] = useState<string>(
    activeOffer?.selectedPlanKey || "anchor"
  );
  const [signerName, setSignerName] = useState<string>(
    workspace.lead?.parentName || ""
  );
  const [paymentRef, setPaymentRef] = useState<string>("");

  const advanceMutation = trpc.leads.advanceOnboarding.useMutation({
    onSuccess: (_, vars) => {
      utils.leads.getWorkspace.invalidate({ leadId: workspace.lead.id });
      utils.leads.listHydrated.invalidate();
      onRefresh();
      if (vars.action === "select_plan") {
        toast.success("Service plan confirmed · Agreement generated");
      } else if (vars.action === "mark_agreement_signed") {
        toast.success("Signed agreement recorded in enrollment state");
      } else if (vars.action === "issue_manual_invoice") {
        toast.success("Initial family invoice generated");
      } else if (vars.action === "verify_payment") {
        toast.success("Initial payment verified");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Could not update onboarding step");
    },
  });

  const activateMutation = trpc.leads.activateClient.useMutation({
    onSuccess: () => {
      toast.success("Client activated! Family transitioned into Active Services.");
      utils.leads.getWorkspace.invalidate({ leadId: workspace.lead.id });
      utils.leads.listHydrated.invalidate();
      onRefresh();
    },
    onError: (err) => {
      toast.error(err.message || "Cannot activate client yet");
    },
  });

  const primaryStudent = workspace.students?.[0];
  const nextIncompleteRequired = requiredItems.find((r) => !r.completed);
  const nextIncompleteOptional = optionalItems.find((r) => !r.completed);

  const handlePrimaryNextOnboardingAction = () => {
    if (isActivated) {
      if (primaryStudent?.id) {
        setLocation(`/students/${primaryStudent.id}`);
      }
      return;
    }
    if (canActivate) {
      activateMutation.mutate({ leadId: workspace.lead.id });
      return;
    }
    if (nextIncompleteRequired?.key === "agreement") {
      advanceMutation.mutate({
        leadId: workspace.lead.id,
        action: "mark_agreement_signed",
        planKey: selectedPlanKey,
        signerName: signerName || workspace.lead?.parentName,
      });
      return;
    }
    if (nextIncompleteRequired?.key === "payment") {
      advanceMutation.mutate({
        leadId: workspace.lead.id,
        action: "verify_payment",
        paymentReference: paymentRef || "VERIFIED-INITIAL-PAYMENT",
      });
      return;
    }
  };

  return (
    <div className="space-y-6" data-testid="onboarding-unit-workspace">
      {/* Top Activation Readiness Banner */}
      <div className="rounded-xl border border-[#1E335C] bg-[#06122E]/95 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[#16284C]">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#D8B979]">
              {isActivated ? "Active Client Services" : "Stage 4 · Client Onboarding"}
            </span>
            <h2
              className="text-2xl font-serif text-[#F8FAFC] mt-0.5 flex items-center gap-2.5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {isActivated ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <span>Active Client · Connected to Student Workspace</span>
                </>
              ) : (
                <span>Onboarding & Activation Readiness</span>
              )}
            </h2>
            <p className="text-xs text-[#93A8C8] mt-1">
              {isActivated
                ? "Onboarding complete. This family is active in client services."
                : nextIncompleteRequired
                ? `Next step: ${nextIncompleteRequired.label} (${nextIncompleteRequired.statusLabel})`
                : nextIncompleteOptional
                ? `Required steps complete · Next optional step: ${nextIncompleteOptional.label}`
                : "All onboarding steps satisfied · Ready to activate client services."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isActivated ? (
              primaryStudent?.id ? (
                <button
                  type="button"
                  onClick={() => setLocation(`/students/${primaryStudent.id}`)}
                  data-testid="open-student-workspace-btn"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040B1C] shadow-lg hover:brightness-105 transition-all cursor-pointer"
                >
                  Open Student Workspace
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : null
            ) : !canActivate && nextIncompleteRequired ? (
              <button
                type="button"
                onClick={handlePrimaryNextOnboardingAction}
                disabled={advanceMutation.isPending}
                data-testid="onboarding-next-step-primary-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040B1C] shadow-lg hover:brightness-105 transition-all cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                {nextIncompleteRequired.key === "agreement"
                  ? "Complete Next Step: Record Signed Agreement"
                  : "Complete Next Step: Verify Initial Payment"}
              </button>
            ) : null}

            {!isActivated && (
              <button
                type="button"
                onClick={() =>
                  activateMutation.mutate({
                    leadId: workspace.lead.id,
                  })
                }
                disabled={!canActivate || activateMutation.isPending}
                data-testid="activate-client-btn"
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  canActivate
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040B1C] shadow-lg hover:brightness-105 cursor-pointer"
                    : "bg-[#0B1B3D] text-[#64748B] border border-[#1E335C] cursor-not-allowed"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                {activateMutation.isPending ? "Activating..." : "Activate Client"}
              </button>
            )}
          </div>
        </div>

        {/* Specific Missing Requirement Banner when blocked */}
        {!isActivated && blockers.length > 0 && (
          <div
            className="mt-4 rounded-lg bg-[#0A1938] border border-[#28447A] p-3.5 flex items-start gap-3"
            data-testid="onboarding-blockers-banner"
          >
            <AlertCircle className="w-4 h-4 text-[#D8B979] shrink-0 mt-0.5" />
            <div className="text-xs text-[#CBD5E1]">
              <span className="font-semibold text-white block mb-0.5">
                Required before client activation:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[#93A8C8]">
                {blockers.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Family Account Billing & Shared Student Record Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="rounded-lg bg-[#030A1C]/90 border border-[#16284C] p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-[#7E95B8]">
              Family Account Billing
            </div>
            <div className="text-sm font-medium text-[#F8FAFC] mt-1">
              {activeOffer?.selectedPlanName
                ? `${activeOffer.selectedPlanName} Plan ($${activeOffer.selectedPlanPrice || 105}/mo)`
                : "No plan selected yet"}
            </div>
            <div className="text-[11px] text-[#8DA2C4] mt-0.5">
              Billed once at family account level ({workspace.lead?.parentName})
            </div>
          </div>

          <div className="rounded-lg bg-[#030A1C]/90 border border-[#16284C] p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-[#7E95B8]">
              Connected Student Record(s)
            </div>
            <div className="text-sm font-medium text-[#F8FAFC] mt-1 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#D8B979]" />
              {workspace.students?.length || 1} Student(s) Linked
            </div>
            <div className="text-[11px] text-[#8DA2C4] mt-0.5">
              {workspace.students
                ?.map((s: any) => `${s.firstName} ${s.lastName}`.trim())
                .join(", ")}
            </div>
          </div>

          <div className="rounded-lg bg-[#030A1C]/90 border border-[#16284C] p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-[#7E95B8]">
              Workspace Architecture
            </div>
            <div className="text-sm font-medium text-emerald-300 mt-1">
              Unified Student & Family Record
            </div>
            <div className="text-[11px] text-[#8DA2C4] mt-0.5">
              Internal Student Workspace & Parent Student Home share the same record
            </div>
          </div>
        </div>

        {/* Carried-Forward Inquiry & Discovery Summary */}
        <div
          className="mt-4 rounded-lg bg-[#030A1C]/90 border border-[#16284C] p-4 grid grid-cols-1 md:grid-cols-2 gap-4"
          data-testid="onboarding-carried-forward-context"
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[#D8B979]">
              Carried-Forward Family Concerns & Goals
            </div>
            <p className="text-xs text-[#E2E8F0] mt-1">
              <strong className="text-[#93A8C8]">Concerns:</strong>{" "}
              {workspace.journey?.concerns ||
                workspace.inquiry?.concerns ||
                "Recorded in family file"}
            </p>
            <p className="text-xs text-[#E2E8F0] mt-1">
              <strong className="text-[#93A8C8]">Desired Outcome:</strong>{" "}
              {workspace.journey?.desiredOutcome ||
                workspace.inquiry?.desiredOutcome ||
                "Recorded in family file"}
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[#D8B979]">
              Advocate Assignment & Discovery Summary
            </div>
            <p className="text-xs text-[#E2E8F0] mt-1">
              <strong className="text-[#93A8C8]">Responsible Advocate:</strong>{" "}
              {workspace.journey?.assignedAdvocate ||
                workspace.inquiry?.assignedAdvocate ||
                "Byron Honea (Lead Special Education Advocate)"}{" "}
              · <strong className="text-[#93A8C8]">Time Zone:</strong>{" "}
              {workspace.journey?.timeZone ||
                workspace.inquiry?.timeZone ||
                "Eastern"}
            </p>
            {workspace.discovery?.draft?.summary && (
              <p className="text-xs text-[#93A8C8] mt-1 line-clamp-2">
                <strong className="text-[#CBD5E1]">Discovery Summary:</strong>{" "}
                {workspace.discovery.draft.summary}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Required Items Section */}
      <div className="rounded-xl border border-[#1E335C] bg-[#06122E]/95 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between pb-4 border-b border-[#16284C]">
          <div>
            <h3 className="text-base font-semibold text-[#F8FAFC]">
              Required for Activation
            </h3>
            <p className="text-xs text-[#8DA2C4]">
              These items must be completed in connected systems before activating the client.
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#0C204B] text-[#D8B979] border border-[#243B67]">
            {requiredItems.filter((r) => r.completed).length} of {requiredItems.length} Complete
          </span>
        </div>

        <div className="divide-y divide-[#16284C]">
          {requiredItems.map((req) => (
            <div
              key={req.key}
              data-testid={`onboarding-req-${req.key}`}
              className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                {req.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-[#D8B979] shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#F8FAFC]">
                      {req.label}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        req.completed
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-[#0C204B] text-[#D8B979] border border-[#243B67]"
                      }`}
                    >
                      {req.statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[#8DA2C4] mt-1">{req.detail}</p>
                </div>
              </div>

              {/* Connected Action Controls for each requirement */}
              <div className="flex flex-wrap items-center gap-2.5">
                {req.key === "agreement" && !req.completed && (
                  <>
                    {!activeOffer?.selectedPlanKey && (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedPlanKey}
                          onChange={(e) => setSelectedPlanKey(e.target.value)}
                          className="rounded-lg bg-[#030A1C] border border-[#243B67] px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="navigator">Navigator ($55/mo)</option>
                          <option value="anchor">Anchor ($105/mo)</option>
                          <option value="family">Family ($135/mo)</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            advanceMutation.mutate({
                              leadId: workspace.lead.id,
                              action: "select_plan",
                              planKey: selectedPlanKey,
                            })
                          }
                          disabled={advanceMutation.isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#122856] text-white border border-[#2C4880] hover:bg-[#193570]"
                        >
                          Generate Agreement
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Parent Signer Name"
                        className="rounded-lg bg-[#030A1C] border border-[#243B67] px-2.5 py-1.5 text-xs text-white w-40"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          advanceMutation.mutate({
                            leadId: workspace.lead.id,
                            action: "mark_agreement_signed",
                            planKey: selectedPlanKey,
                            signerName: signerName || workspace.lead?.parentName,
                          })
                        }
                        disabled={advanceMutation.isPending}
                        data-testid="record-signed-agreement-btn"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#122856] text-[#F8FAFC] border border-[#345494] hover:border-[#D8B979]"
                      >
                        <FileSignature className="w-3.5 h-3.5 text-[#D8B979]" />
                        Record Signed Agreement
                      </button>
                    </div>
                  </>
                )}

                {req.key === "agreement" && req.agreementId && (
                  <button
                    type="button"
                    onClick={() => setLocation("/agreements")}
                    className="inline-flex items-center gap-1 text-xs text-[#93A8C8] hover:text-white px-2.5 py-1.5 rounded-lg border border-[#1E335C] bg-[#030A1C]"
                  >
                    View in Agreements
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}

                {req.key === "payment" && !req.completed && (
                  <div className="flex flex-wrap items-center gap-2">
                    {!req.invoiceId && (
                      <button
                        type="button"
                        onClick={() =>
                          advanceMutation.mutate({
                            leadId: workspace.lead.id,
                            action: "issue_manual_invoice",
                          })
                        }
                        disabled={advanceMutation.isPending}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#09183A] text-[#CBD5E1] border border-[#243B67] hover:text-white"
                      >
                        Issue Invoice
                      </button>
                    )}
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="Receipt / Check / Stripe Ref"
                      className="rounded-lg bg-[#030A1C] border border-[#243B67] px-2.5 py-1.5 text-xs text-white w-44"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        advanceMutation.mutate({
                          leadId: workspace.lead.id,
                          action: "verify_payment",
                          paymentReference: paymentRef || undefined,
                        })
                      }
                      disabled={advanceMutation.isPending}
                      data-testid="verify-payment-btn"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#122856] text-[#F8FAFC] border border-[#345494] hover:border-[#D8B979]"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-[#D8B979]" />
                      Verify Initial Payment
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional / Post-Activation Items Section */}
      <div className="rounded-xl border border-[#1E335C] bg-[#06122E]/90 p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#16284C]">
          <div>
            <h3 className="text-sm font-semibold text-[#F8FAFC]">
              Optional & Post-Activation Items
            </h3>
            <p className="text-xs text-[#8DA2C4]">
              These steps are supported during or after activation and do not block transitioning the family to Active Services.
            </p>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-[#7E95B8]">
            Non-Blocking
          </span>
        </div>

        <div className="divide-y divide-[#16284C]">
          {optionalItems.map((item) => (
            <div
              key={item.key}
              data-testid={`onboarding-opt-${item.key}`}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                {item.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-[#64748B] shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#E2E8F0]">
                      {item.label}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#030A1C] text-[#93A8C8] border border-[#182B52]">
                      Optional · {item.statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[#7E95B8] mt-0.5">{item.detail}</p>
                </div>
              </div>

              {item.key === "portal_access" && primaryStudent?.id && (
                <button
                  type="button"
                  onClick={() => setLocation(`/students/${primaryStudent.id}`)}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs text-[#93A8C8] hover:text-white px-3 py-1.5 rounded-lg border border-[#1E335C] bg-[#030A1C]"
                >
                  Open Student Record
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
