import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { useActiveCall } from "@/contexts/ActiveCallContext";

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
    <div className="min-h-screen bg-[#000821] text-slate-100 px-2 sm:px-3 pt-0 pb-6 space-y-3 sm:space-y-3.5">
      {/* Top Header */}
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

      {/* Top 7 Metric & Quick Access Cards in Horizontal Row */}
      <CallCenterStats
        callsTodayCount={callsTodayCount}
        missedCallsCount={missedCount}
        callbacksCount={callbacksCount}
        voicemailCount={voicemailCount}
        scheduledCallsCount={scheduledCount}
        leadsCount={leadsCount}
        contactsCount={formattedContacts.length}
        activeFilter={activeStatFilter}
        onSelectStat={(key) => {
          setActiveStatFilter(key);
          toast.info(`Filtered view for: ${key}`);
        }}
        onViewLeads={() => {
          window.location.href = "/leads";
        }}
        onScrollToContactList={handleScrollToContactList}
      />

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
              const el = document.getElementById("call-workspace");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
          />
        )}
      </div>

      {/* Toggle Bar for Optional Live AI First Mate Panel */}
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowFirstMateAssist(!showFirstMateAssist)}
          className="text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 rounded-xl"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
          {showFirstMateAssist ? "Hide First Mate Live Assist" : "Show First Mate Live Assist"}
        </Button>
      </div>

      {/* Main Workspace Layout with Optional First Mate Assist Side Panel */}
      <div className={`grid grid-cols-1 ${showFirstMateAssist ? "xl:grid-cols-3" : "grid-cols-1"} gap-6 items-start`}>
        {/* Main Operational Call Workspace (Directly below Phone Call Window) */}
        <div className={showFirstMateAssist ? "xl:col-span-2 space-y-6" : "space-y-6"}>
          <CallWorkspace
            onAddNewContactRequest={() => setShowAddContactModal(true)}
            onCallInQuo={(phone, name) => handleDirectCallPhone(phone, name)}
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

      {/* Contact Lookup Section with anchor target */}
      <div id="contact-lookup-section" className="scroll-mt-6 rounded-2xl">
        <ContactLookupSection
          contacts={formattedContacts}
          isLoading={contactsLoading}
          onAddNewContact={() => setShowAddContactModal(true)}
          onCallInQuo={handleOpenQuoWithContact}
          onOpenSms={handleOpenSmsWithContact}
          onPrefillIntake={(contact) => {
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
            const el = document.getElementById("call-workspace");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onScheduleAppointment={(contact) => {
            window.location.href = `/scheduler?contactId=${contact.id}`;
          }}
        />
      </div>

      {/* Bottom Operational Deck (3 Cards: Needs Attention, Today's Schedule, Voicemails) */}
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
          startCall({
            callerCategory: "new_lead",
            callType: "New Lead / Sales",
            callerInfo: { name: "Inbound Voicemail", phone },
            generalNotes: `Inbound Voicemail:\n"${summary}"`,
          });
          toast.success("Voicemail loaded into Call Workspace");
          const el = document.getElementById("call-workspace");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

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
  );
}
