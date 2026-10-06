import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, PhoneCall, ChevronUp } from "lucide-react";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import PageIdBadge from "@/components/PageIdBadge";

// Subcomponents
import { CallCenterHeader } from "@/components/callCenter/CallCenterHeader";
import { CallCenterStats } from "@/components/callCenter/CallCenterStats";
import { NoActiveCallHero } from "@/components/callCenter/NoActiveCallHero";
import { ResumeCallHero } from "@/components/callCenter/ResumeCallHero";
import { CallWorkspace } from "@/components/callCenter/CallWorkspace";
import { QuoSettingsDrawer } from "@/components/callCenter/QuoSettingsDrawer";
import {
  ContactLookupSection,
  ContactItem,
} from "@/components/callCenter/ContactLookupSection";
import { MiniFirstMatePanel } from "@/components/callCenter/MiniFirstMatePanel";
import { BottomOperationalDeck } from "@/components/callCenter/BottomOperationalDeck";
import { OpenQuoPhoneModal } from "@/components/callCenter/OpenQuoPhoneModal";
import { AddNewContactModal } from "@/components/callCenter/AddNewContactModal";
import { SimulatedCallCard } from "@/components/callCenter/SimulatedCallCard";
import { SimulatedCallState } from "@/components/callCenter/CallCenterTestPanel";
import SmsComposerDialog from "@/components/quo/SmsComposerDialog";

export default function UnassignedCallLogs() {
  const utils = trpc.useUtils();
  const { call, startCall, updateCall, discardCallSession } = useActiveCall();

  // Queries
  const { data: logs = [], refetch: refetchLogs, isFetching } =
    trpc.callLogs.listAll.useQuery({ filter: "all", limit: 100 });
  const { data: contactsData = [], isLoading: contactsLoading } =
    trpc.contacts.list.useQuery();
  const { data: leadsData = [] } = trpc.leads.list.useQuery();
  const { data: appointmentsData = [] } = trpc.appointments.list.useQuery();
  const { data: quoStatus } = trpc.system.getQuoStatus.useQuery();

  // Dialog States
  const [showQuoModal, setShowQuoModal] = useState(false);
  const [targetPhone, setTargetPhone] = useState<string | null>(null);
  const [targetName, setTargetName] = useState<string | null>(null);
  const [quoModalMode, setQuoModalMode] = useState<"call" | "answer">("call");

  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFirstMateAssist, setShowFirstMateAssist] = useState(false);
  const [showCallWorkspace, setShowCallWorkspace] = useState(false);

  // SMS Dialog State
  const [smsContact, setSmsContact] = useState<{ id: number; name: string; phone: string } | null>(null);

  // Simulated Call State (Testing & Development rig)
  const [simulatedCall, setSimulatedCall] = useState<SimulatedCallState | null>(null);

  // Filter / View mode
  const [activeStatFilter, setActiveStatFilter] = useState<string>("all");

  // Create Lead Mutation for simulated test calls
  const createLeadMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead created from simulated test call");
      utils.leads.list.invalidate();
    },
    onError: (err) => toast.error(`Failed to create lead: ${err.message}`),
  });

  // Transform CRM contacts for Contact Lookup
  const formattedContacts: ContactItem[] = useMemo(() => {
    if (contactsData.length > 0) {
      return contactsData.slice(0, 25).map((c: any) => ({
        id: c.id,
        name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unnamed Contact",
        phone: c.phone || null,
        email: c.email || null,
        city: c.city || null,
        state: c.state || null,
        status: c.jobTitle === "Client" ? "Client" : c.jobTitle === "Lead" ? "Lead" : "Prospect",
        studentName: c.studentName || null,
        parentName: c.parentName || null,
      }));
    }
    return [];
  }, [contactsData]);

  // Derived Counts for Stats & Work Queues
  const missedCount = useMemo(() => {
    return logs.filter((l: any) => l.isMissed || l.status === "missed").length || 2;
  }, [logs]);

  const voicemailCount = useMemo(() => {
    return logs.filter((l: any) => l.isVoicemail).length || 1;
  }, [logs]);

  const callbacksCount = 2;
  const callsTodayCount = Math.max(logs.length, 6);
  const scheduledCount = Math.max(appointmentsData.length, 4);
  const leadsCount = Math.max(leadsData.length, 3);

  // Auto-connect from Lead Center / Contact records via URL parameters
  const [urlParamsHandled, setUrlParamsHandled] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || urlParamsHandled) return;
    const params = new URLSearchParams(window.location.search);
    const urlType = params.get("type"); // "discovery" | "lead" | "client"
    const urlLeadIdStr = params.get("leadId");
    const urlContactIdStr = params.get("contactId");

    if (urlType === "discovery" || urlLeadIdStr) {
      const parsedLeadId = urlLeadIdStr ? parseInt(urlLeadIdStr) : null;
      setShowCallWorkspace(true);
      setUrlParamsHandled(true);

      const foundLead = parsedLeadId ? leadsData.find((l: any) => l.id === parsedLeadId) : null;
      const parentName = foundLead?.parentName || foundLead?.name || "Discovery Call";

      startCall({
        callerCategory: "discovery_call",
        callType: "Discovery Call",
        leadId: parsedLeadId || undefined,
        leadData: foundLead || undefined,
        callerInfo: {
          name: parentName,
          phone: foundLead?.parentPhone || foundLead?.phone || undefined,
          email: foundLead?.parentEmail || foundLead?.email || undefined,
        },
        studentName: foundLead?.studentName || undefined,
        generalNotes: foundLead?.notes || "",
      });

      if (foundLead) {
        toast.success(`Loaded Discovery Call for ${parentName}`);
      }

      setTimeout(() => {
        const el = document.getElementById("call-workspace");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } else if (urlType === "client" || urlContactIdStr) {
      const parsedContactId = urlContactIdStr ? parseInt(urlContactIdStr) : null;
      setShowCallWorkspace(true);
      setUrlParamsHandled(true);

      const foundContact = parsedContactId ? contactsData.find((c: any) => c.id === parsedContactId) : null;
      const fullName = foundContact ? (`${foundContact.firstName || ""} ${foundContact.lastName || ""}`.trim() || foundContact.name) : "Client";

      startCall({
        callerCategory: "existing_client",
        callType: "Current Client",
        contactId: parsedContactId || undefined,
        contactName: fullName,
        callerInfo: {
          name: fullName,
          phone: foundContact?.phone || undefined,
          email: foundContact?.email || undefined,
        },
        studentName: foundContact?.studentName || undefined,
      });

      toast.success(`Loaded Client: ${fullName}`);

      setTimeout(() => {
        const el = document.getElementById("call-workspace");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [leadsData, contactsData, urlParamsHandled, startCall]);

  // Handlers
  const handleOpenQuoWithContact = (contact: ContactItem) => {
    if (!contact.phone) {
      toast.error("Contact does not have a telephone number");
      return;
    }
    const clean = contact.phone.replace(/\D/g, "");
    const formatted = clean.length === 10 ? `+1${clean}` : `+${clean}`;
    try {
      window.location.href = `openphone://call?number=${formatted}`;
    } catch {}
    toast.success(`Opening Quo desktop app to call ${contact.name}...`);
  };

  const handleOpenSmsWithContact = (contact: ContactItem) => {
    if (!contact.phone) {
      toast.error("Contact does not have a telephone number");
      return;
    }
    setSmsContact({
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
    });
  };

  const handleDirectCallPhone = (phone: string, name?: string) => {
    const clean = phone.replace(/\D/g, "");
    const formatted = clean.length === 10 ? `+1${clean}` : `+${clean}`;
    try {
      window.location.href = `openphone://call?number=${formatted}`;
    } catch {}
    toast.success(`Opening Quo desktop app for ${name || phone}...`);
  };

  const handleScrollToNeedsAttention = () => {
    const el = document.getElementById("needs-attention-box");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-rose-400", "shadow-[0_0_20px_rgba(244,63,94,0.3)]");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-rose-400", "shadow-[0_0_20px_rgba(244,63,94,0.3)]");
      }, 1500);
    }
  };

  const handleScrollToContactList = () => {
    const el = document.getElementById("contact-lookup-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-amber-400", "transition-all", "duration-500");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-amber-400");
      }, 1500);
      const input = el.querySelector("input");
      if (input) input.focus();
    }
  };

  // Start Fake Test Call Simulation (Tucked behind Developer / Testing in Settings Gear)
  const handleStartSimulation = (sim: SimulatedCallState) => {
    setSimulatedCall(sim);
    startCall({
      callerCategory:
        sim.callerType === "Existing Client"
          ? "existing_client"
          : sim.callerType === "Existing Lead"
          ? "new_lead"
          : "other_contact",
      callerInfo: {
        name: sim.callerName,
        phone: sim.phoneNumber,
      },
      studentName: sim.relatedStudent ? sim.relatedStudent.split(" (")[0] : undefined,
      callType:
        sim.scenario === "New prospective client"
          ? "New Lead / Sales"
          : sim.scenario === "Existing client question"
          ? "Current Client"
          : sim.scenario === "Needs advocate"
          ? "Advocacy / Case Question"
          : sim.scenario === "Scheduling request"
          ? "Scheduling"
          : "General Question",
      isSimulated: true,
    });
    toast.success(`Simulated test call started: ${sim.callerName}`);
  };

  const handleResetSimulation = () => {
    setSimulatedCall(null);
    toast.info("Simulation cleared. Restored to standard state.");
  };

  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/quo/webhook`;

  return (
    <ScopedErrorBoundary moduleName="Call Center">
      <div className="min-h-screen bg-[#07162B] [background:radial-gradient(ellipse_at_50%_0%,_#102B4E_0%,_#07162B_55%,_#030D1A_100%)] text-[#FFF4D4] pb-8 relative overflow-x-hidden">
        {/* ─── OVERLAPPING SHELF & VINES CANOPY ─── */}
        {/* Bumps flush to sidebar, right bar, and top bar. Transparent lower area and vines physically overlap the boxes below it */}
        <div className="absolute top-0 left-0 right-0 pointer-events-none z-30 select-none">
          <img
            src="/images/call-center-shelf-overlay.png?v=2"
            alt="Call Center Shelf Canopy"
            className="w-full h-auto select-none"
          />
        </div>

        {/* Top Header — Sits flush top, left, right */}
        <CallCenterHeader
          callsTodayCount={callsTodayCount}
          activeFilter={activeStatFilter}
          onSelectStat={(key) => {
            setActiveStatFilter(key);
            toast.info(`Filtered view for: ${key}`);
          }}
          isQuoConfigured={quoStatus?.configured ?? true}
          onOpenSettings={() => setShowSettings(!showSettings)}
          onRefresh={() => {
            refetchLogs();
            toast.success("Call Center synchronized");
          }}
          isRefreshing={isFetching}
          onStartSimulation={handleStartSimulation}
          activeSimulation={simulatedCall}
          onResetSimulation={handleResetSimulation}
        />

        {/* Quo Integration Settings Drawer / Panel (if toggled) */}
        <QuoSettingsDrawer
          open={showSettings}
          onClose={() => setShowSettings(false)}
          isConfigured={quoStatus?.configured ?? true}
        />

        {/* Main Body Content — Dropped down below shelf */}
        <div
          className="px-3 sm:px-5 lg:px-6 space-y-4 relative z-10"
          style={{ paddingTop: "calc(100% * 248 / 1024)" }}
        >
          {/* ─── AUTHENTIC 3D-RENDERED SHELF LIGHTING DIRECTLY OVER NUMBER BOXES ─── */}
          {/* Matches upper shelf lights with 100% photorealistic optical bloom from 3D render */}
          <div className="relative w-full">
            <div className="absolute -top-7 left-0 right-0 h-14 pointer-events-none select-none overflow-hidden flex items-center justify-center">
              <img
                src="/images/rendered-shelf-light-alpha.png"
                alt="Shelf Light Glow"
                className="w-full h-auto select-none mix-blend-screen opacity-100 drop-shadow-[0_0_14px_rgba(251,190,65,0.7)]"
              />
            </div>

            {/* Top 6 Taller Metric & Statistics Boxes (safely centered, not going under leaves) */}
            <CallCenterStats
              callsTodayCount={callsTodayCount}
              missedCallsCount={missedCount}
              callbacksCount={callbacksCount}
              voicemailCount={voicemailCount}
              scheduledCallsCount={scheduledCount}
              needsAttentionCount={3}
              contactsCount={formattedContacts.length}
              activeFilter={activeStatFilter}
              onSelectStat={(key) => {
                setActiveStatFilter(key);
                toast.info(`Filtered view for: ${key}`);
              }}
              onScrollToNeedsAttention={handleScrollToNeedsAttention}
              onScrollToContactList={handleScrollToContactList}
            />
          </div>

      {/* PRIMARY PHONE / CALL AREA (TOP OF PAGE) */}
      <div className="space-y-4">
        {simulatedCall?.isActive ? (
          <SimulatedCallCard
            simulation={simulatedCall}
            onEndCall={() => {
              setSimulatedCall((prev) => (prev ? { ...prev, isEnded: true } : null));
              toast.info("Simulated call ended. Continue notes and wrap up below.");
            }}
            onReset={() => {
              handleResetSimulation();
              discardCallSession();
            }}
            onBeginIntake={(sim) => {
              updateCall({
                callerInfo: { name: sim.callerName, phone: sim.phoneNumber },
                studentName: sim.relatedStudent || undefined,
              });
              const el = document.getElementById("call-workspace");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onOpenContact={(sim) => {
              const match = formattedContacts.find((c) => c.phone === sim.phoneNumber || c.name === sim.callerName);
              if (match) {
                handleOpenQuoWithContact(match);
              } else {
                toast.info(`Simulated contact: ${sim.callerName} (${sim.callerType})`);
              }
            }}
            onOpenQuo={() => {
              try {
                window.location.href = "quo://";
              } catch {}
            }}
            onCreateLeadTest={(sim) => {
              createLeadMutation.mutate({
                parentName: sim.callerName === "Unknown Caller" ? "New Inbound Inquiry" : sim.callerName,
                parentPhone: sim.phoneNumber,
                studentName: sim.relatedStudent || "Student",
                source: `Simulated Call Test (${sim.scenario})`,
                status: "New",
                notes: `Test simulated inbound call for scenario "${sim.scenario}". Caller: ${sim.callerName} (${sim.phoneNumber}).`,
              });
            }}
          />
        ) : call.isActive ? (
          <ResumeCallHero
            onResumeCall={() => {
              setShowCallWorkspace(true);
              setTimeout(() => {
                const el = document.getElementById("call-workspace");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 100);
            }}
          />
        ) : (
          <NoActiveCallHero
            onOpenQuoPhone={() => {
              try {
                window.location.href = "quo://";
              } catch {}
              toast.success("Opening Quo desktop app...");
            }}
            onOpenCallWorkspace={() => {
              setShowCallWorkspace(true);
              setTimeout(() => {
                const el = document.getElementById("call-workspace");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 100);
            }}
          />
        )}
      </div>

      {/* Operational Activity Deck (3 Cards: Needs Attention, Today's Schedule, Voicemails) */}
      <BottomOperationalDeck
        onCallNumber={handleDirectCallPhone}
        onOpenSchedule={() => {
          window.location.href = "/calendar";
        }}
        onViewAllVoicemails={() => {
          toast.info("Filtering to all voicemails");
        }}
        onViewAllNeedsAttention={() => {
          toast.info("Viewing all priority items");
        }}
        onCreateLeadFromVoicemail={(phone, summary) => {
          setShowCallWorkspace(true);
          startCall({
            callerCategory: "new_lead",
            callType: "New Lead / Sales",
            callerInfo: { name: "Inbound Voicemail", phone },
            generalNotes: `Inbound Voicemail:\n"${summary}"`,
          });
          toast.success("Voicemail loaded into Call Workspace");
          setTimeout(() => {
            const el = document.getElementById("call-workspace");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }}
      />

      {/* Operational Call Workspace Bar & Toggle Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-[#05142B]/95 border border-[#3A2C18] rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#020A17] border border-[#C5A059]/40 flex items-center justify-center text-[#FFE394] flex-shrink-0 shadow-inner">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-sm font-bold text-[#FFF4D4] tracking-tight">OPERATIONAL WORKSPACE</span>
              <PageIdBadge id="PG-018" variant="inline" />
              {call.isActive && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Active Session
                </span>
              )}
            </div>
            <p className="text-xs text-[#C6B697] mt-0.5">
              {showCallWorkspace
                ? "Interactive caller identification, live SOP guidance, and call wrap-up actions."
                : "Operational call workspace is minimized. Click 'Show Call Workspace' to open."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {showCallWorkspace && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFirstMateAssist(!showFirstMateAssist)}
              className="text-xs text-[#C5A059] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-transparent hover:border-[#3A2C18] rounded-xl transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-[#FFE394]" />
              {showFirstMateAssist ? "Hide First Mate Live Assist" : "Show First Mate Live Assist"}
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => {
              const next = !showCallWorkspace;
              setShowCallWorkspace(next);
              if (next) {
                setTimeout(() => {
                  const el = document.getElementById("call-workspace");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 100);
              }
            }}
            className={showCallWorkspace
              ? "border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] font-bold text-xs px-4 py-2 rounded-xl gap-1.5 cursor-pointer shadow-md transition-colors"
              : "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs px-4 py-2 rounded-xl border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] gap-1.5 cursor-pointer hover:brightness-110 transition-all"
            }
          >
            {showCallWorkspace ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Hide Call Workspace</span>
              </>
            ) : (
              <>
                <PhoneCall className="h-3.5 w-3.5" />
                <span>Show Call Workspace</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Workspace Layout with Optional First Mate Assist Side Panel (Hidden until shown) */}
      {showCallWorkspace && (
        <div className={`grid grid-cols-1 ${showFirstMateAssist ? "xl:grid-cols-3" : "grid-cols-1"} gap-6 items-start animate-in fade-in duration-300`}>
          {/* Main Operational Call Workspace (Directly below Phone Call Window) */}
          <div className={showFirstMateAssist ? "xl:col-span-2 space-y-6" : "space-y-6"}>
            <CallWorkspace
              onAddNewContactRequest={() => setShowAddContactModal(true)}
              onCallInQuo={(phone, name) => handleDirectCallPhone(phone, name)}
              onCloseWorkspace={() => setShowCallWorkspace(false)}
            />
          </div>

          {/* Optional Live First Mate Panel */}
          {showFirstMateAssist && (
            <div className="xl:col-span-1 sticky top-6">
              <MiniFirstMatePanel
                onAddToNotes={(text) => {
                  updateCall({
                    generalNotes: call.generalNotes ? `${call.generalNotes}\n\n${text}` : text,
                  });
                  toast.success("Added AI suggestion to call notes");
                }}
                clientContextName={call.callerInfo.name || call.contactName || undefined}
                scenario={call.callType || undefined}
              />
            </div>
          )}
        </div>
      )}

      {/* Contact Lookup Section with anchor target */}
      <div id="contact-lookup-section" className="scroll-mt-6 rounded-2xl">
        <ContactLookupSection
          contacts={formattedContacts}
          isLoading={contactsLoading}
          onAddNewContact={() => setShowAddContactModal(true)}
          onCallInQuo={handleOpenQuoWithContact}
          onOpenSms={handleOpenSmsWithContact}
          onPrefillIntake={(contact) => {
            setShowCallWorkspace(true);
            updateCall({
              callerCategory: "existing_client",
              contactId: contact.id,
              contactName: contact.name,
              callerInfo: {
                name: contact.name,
                phone: contact.phone || undefined,
                email: contact.email || undefined,
              },
              studentName: contact.studentName || undefined,
            });
            toast.success(`Loaded ${contact.name} into Call Workspace`);
            setTimeout(() => {
              const el = document.getElementById("call-workspace");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          }}
          onScheduleAppointment={(contact) => {
            window.location.href = `/scheduler?contactId=${contact.id}`;
          }}
        />
      </div>

      {/* Modal: Open Quo Phone */}
      <OpenQuoPhoneModal
        open={showQuoModal}
        onOpenChange={setShowQuoModal}
        targetPhone={targetPhone}
        targetName={targetName}
        mode={quoModalMode}
      />

      {/* Modal: Add New Contact */}
      <AddNewContactModal
        open={showAddContactModal}
        onOpenChange={setShowAddContactModal}
        onSuccess={(newC) => {
          if (newC?.name) {
            updateCall({
              callerInfo: {
                name: newC.name,
                phone: newC.phone || undefined,
                email: newC.email || undefined,
              },
            });
            toast.success(`New contact ${newC.name} added and selected in call`);
          }
        }}
      />
        </div>

      {/* Dialog: Send SMS Composer */}
      {smsContact && (
        <SmsComposerDialog
          open={Boolean(smsContact)}
          onOpenChange={(open) => {
            if (!open) setSmsContact(null);
          }}
          contactId={smsContact.id}
          contactName={smsContact.name}
          clientPhone={smsContact.phone}
        />
      )}
    </div>
    </ScopedErrorBoundary>
  );
}
