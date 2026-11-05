import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  PhoneCall,
  ChevronUp,
  Phone,
  PhoneMissed,
  Voicemail,
  CalendarCheck,
  AlertCircle,
  MessageSquare,
  Check,
  X,
  UserPlus,
} from "lucide-react";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import PageIdBadge from "@/components/PageIdBadge";

// Subcomponents
import { CallCenterHeader } from "@/components/callCenter/CallCenterHeader";
import { SearchContactItem } from "@/components/callCenter/QuickContactSearch";
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
import {
  BottomOperationalDeck,
  NeedsAttentionItem,
  ScheduleCallItem,
} from "@/components/callCenter/BottomOperationalDeck";
import { OpenQuoPhoneModal } from "@/components/callCenter/OpenQuoPhoneModal";
import { AddNewContactModal } from "@/components/callCenter/AddNewContactModal";
import { SimulatedCallCard } from "@/components/callCenter/SimulatedCallCard";
import { SimulatedCallState } from "@/components/callCenter/CallCenterTestPanel";
import { LiveCallLogsTable } from "@/components/callCenter/LiveCallLogsTable";
import SmsComposerDialog from "@/components/quo/SmsComposerDialog";

export default function UnassignedCallLogs() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { call, startCall, updateCall, discardCallSession } = useActiveCall();

  // Queries
  const { data: logs = [], refetch: refetchLogs, isFetching } =
    trpc.callLogs.listAll.useQuery({ filter: "all", limit: 100 }, { refetchInterval: 4000 });
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

  // Transform all contacts & leads for Quick Contact Search in header
  const quickSearchContacts: SearchContactItem[] = useMemo(() => {
    const list: SearchContactItem[] = [];
    if (Array.isArray(contactsData)) {
      contactsData.forEach((c: any) => {
        list.push({
          id: c.id,
          name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Contact",
          phone: c.phone || null,
          email: c.email || null,
          status: c.jobTitle === "Client" ? "Client" : c.jobTitle === "Lead" ? "Lead" : "Prospect",
          studentName: c.studentName || null,
          parentName: c.parentName || null,
          preferredCallingStartTime: c.preferredCallingStartTime || "09:00",
          preferredCallingEndTime: c.preferredCallingEndTime || "17:00",
          preferredCallingDays: c.preferredCallingDays || "Mon–Fri",
          confirmedTimeZone: c.confirmedTimeZone || "EST",
          mayCallOutsidePreferredHours: c.mayCallOutsidePreferredHours ?? false,
        });
      });
    }
    if (Array.isArray(leadsData)) {
      leadsData.forEach((l: any) => {
        if (!list.some((existing) => existing.phone && existing.phone === l.parentPhone)) {
          list.push({
            id: 100000 + l.id,
            name: l.parentName || l.name || "Lead Inquiry",
            phone: l.parentPhone || l.phone || null,
            email: l.parentEmail || l.email || null,
            status: "Lead",
            studentName: l.studentName || null,
            preferredCallingStartTime: "09:00",
            preferredCallingEndTime: "17:00",
            preferredCallingDays: "Mon–Fri",
            confirmedTimeZone: "EST",
          });
        }
      });
    }
    return list;
  }, [contactsData, leadsData]);

  // Mark Callback / Follow-Up Handled Mutation
  const updateCallbackMutation = trpc.callLogs.updateCallbackStatus.useMutation({
    onSuccess: () => {
      toast.success("Marked call follow-up as handled");
      utils.callLogs.listAll.invalidate();
    },
    onError: (err) => toast.error(`Failed to update status: ${err.message}`),
  });

  const isBool = (v: unknown): boolean =>
    v === true || v === 1 || v === "1" || v === "true";

  const normalizeDigits = (raw?: string | null): string =>
    String(raw || "").replace(/\D/g, "").slice(-10);

  // Match any phone number to a known CRM Contact or Lead
  const resolveCallerName = useMemo(() => {
    const map = new Map<string, string>();
    quickSearchContacts.forEach((c) => {
      const d = normalizeDigits(c.phone);
      if (d.length >= 7 && !map.has(d)) {
        map.set(d, c.name);
      }
    });
    return (phone?: string | null, direction?: string, toNum?: string | null): string => {
      const targetPhone =
        direction === "outgoing" || direction === "outbound" ? toNum || phone : phone;
      const d = normalizeDigits(targetPhone);
      if (d && map.has(d)) {
        return map.get(d)!;
      }
      return targetPhone || "Quo Caller";
    };
  }, [quickSearchContacts]);

  const formatShortTime = (dateInput?: string | Date) => {
    if (!dateInput) return "";
    try {
      const d = new Date(dateInput);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      }
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return String(dateInput);
    }
  };

  // Real Quo Voice Call Logs (excluding SMS message events)
  const voiceCallLogs = useMemo(() => {
    return logs.filter(
      (l: any) => !(l.eventType || "").startsWith("message.") && !l.smsBody
    );
  }, [logs]);

  // Real Quo Calls from Today
  const callsTodayLogs = useMemo(() => {
    const todayStr = new Date().toDateString();
    return voiceCallLogs.filter((l: any) => {
      try {
        return new Date(l.createdAt).toDateString() === todayStr;
      } catch {
        return false;
      }
    });
  }, [voiceCallLogs]);

  // Real Quo Missed Calls
  const missedCallLogs = useMemo(() => {
    return logs.filter(
      (l: any) =>
        (l.eventType === "call.missed" || isBool(l.isMissed)) &&
        l.callbackStatus !== "completed" &&
        l.callbackStatus !== "dismissed"
    );
  }, [logs]);

  // Real Quo Voicemails
  const voicemailLogs = useMemo(() => {
    return logs
      .filter((l: any) => isBool(l.isVoicemail))
      .map((l: any) => ({
        ...l,
        callerDisplayName: resolveCallerName(l.fromNumber, l.direction, l.toNumber),
      }));
  }, [logs, resolveCallerName]);

  // Real Needs Attention Queue (Missed Calls, Voicemails, and Unassigned Inbound Calls/SMS)
  const needsAttentionItems: NeedsAttentionItem[] = useMemo(() => {
    const items: NeedsAttentionItem[] = [];
    for (const l of logs as any[]) {
      if (l.callbackStatus === "completed" || l.callbackStatus === "dismissed") continue;
      const isVm = isBool(l.isVoicemail);
      const isMissed = l.eventType === "call.missed" || isBool(l.isMissed);
      const isInboundSms = l.eventType === "message.received" && l.status === "unassigned";
      const isUnassignedInboundCall =
        !isVm &&
        !isMissed &&
        !(l.eventType || "").startsWith("message.") &&
        l.status === "unassigned" &&
        (l.direction === "incoming" || l.direction === "inbound");

      if (!isVm && !isMissed && !isInboundSms && !isUnassignedInboundCall) continue;

      const phone =
        l.direction === "outgoing" || l.direction === "outbound"
          ? l.toNumber || l.fromNumber
          : l.fromNumber || l.toNumber;
      const callerName = resolveCallerName(l.fromNumber, l.direction, l.toNumber);

      items.push({
        id: l.id,
        name: callerName,
        phone: phone || "",
        reason: isVm
          ? "Voicemail"
          : isMissed
          ? "Missed call"
          : isInboundSms
          ? `SMS: "${String(l.smsBody || "").slice(0, 28)}"`
          : "Unassigned call",
        time: formatShortTime(l.createdAt),
        type: isVm ? "voicemail" : isMissed ? "missed" : isInboundSms ? "sms" : "call",
        rawLog: l,
      });
    }
    return items;
  }, [logs, resolveCallerName]);

  // Real Scheduled Calls / Appointments from Calendar
  const scheduleItems: ScheduleCallItem[] = useMemo(() => {
    if (!Array.isArray(appointmentsData) || appointmentsData.length === 0) return [];
    return appointmentsData.slice(0, 12).map((apt: any) => {
      const startTime = apt.startTime || apt.date || apt.scheduledAt;
      let formattedTime = "Scheduled";
      if (startTime) {
        try {
          formattedTime = new Date(startTime).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
        } catch {}
      }
      const contactName =
        apt.clientName || apt.studentName || apt.contactName || apt.attendeeName || "Scheduled Client";
      const matchedContact = quickSearchContacts.find(
        (c) => c.name.toLowerCase() === String(contactName).toLowerCase()
      );
      return {
        id: apt.id,
        time: formattedTime,
        title: apt.title || apt.sessionType || "Consultation Call",
        contact: contactName,
        phone: apt.clientPhone || apt.phone || matchedContact?.phone || null,
        completed: apt.status === "completed" || apt.status === "Completed",
      };
    });
  }, [appointmentsData, quickSearchContacts]);

  // Derived Real Counts for the 5 Top Number Blocks
  const callsBlockCount =
    callsTodayLogs.length > 0 ? callsTodayLogs.length : voiceCallLogs.length;
  const callsBlockLabel =
    callsTodayLogs.length > 0 ? "Calls Today" : "Quo Calls";
  const missedCount = missedCallLogs.length;
  const voicemailCount = voicemailLogs.length;
  const callbacksCount = missedCallLogs.length;
  const callsTodayCount = callsBlockCount;
  const scheduledCount = scheduleItems.length;
  const needsAttentionCount = needsAttentionItems.length;

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

  const handleDirectSmsPhone = (phone: string, name?: string) => {
    const clean = phone.replace(/\D/g, "");
    const formatted = clean.length === 10 ? `+1${clean}` : `+${clean}`;
    try {
      window.location.href = `openphone://message?number=${formatted}`;
    } catch {}
    toast.success(`Opening Quo messaging for ${name || phone}...`);
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

  const handleSelectSearchContact = (contact: SearchContactItem) => {
    setShowCallWorkspace(true);
    startCall({
      callerCategory: contact.status === "Client" ? "existing_client" : "new_lead",
      contactId: contact.id < 100000 ? contact.id : undefined,
      contactName: contact.name,
      callerInfo: {
        name: contact.name,
        phone: contact.phone || undefined,
        email: contact.email || undefined,
      },
      studentName: contact.studentName || undefined,
      callType: contact.status === "Client" ? "Current Client" : "New Lead / Sales",
    });
    toast.success(`Loaded ${contact.name} into Call Workspace`);
    setTimeout(() => {
      const el = document.getElementById("call-workspace");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
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
          contacts={quickSearchContacts}
          onSelectContact={handleSelectSearchContact}
          onCallContact={(phone, name) => handleDirectCallPhone(phone, name)}
          onGoToPhoneBook={() => setLocation("/contacts")}
        />

        {/* Quo Integration Settings Drawer / Panel (if toggled) */}
        <QuoSettingsDrawer
          open={showSettings}
          onClose={() => setShowSettings(false)}
          isConfigured={quoStatus?.configured ?? true}
        />

        {/* Main Body Content — Positioned cleanly just below the shelf picture */}
        <div
          className="px-3 sm:px-5 lg:px-6 space-y-4 relative z-10"
          style={{ paddingTop: "calc(100% * 242 / 1024)" }}
        >
          {/* Top Metric & Statistics Boxes (safely centered, not going under leaves) */}
          <CallCenterStats
            callsTodayCount={callsTodayCount}
            callsLabel={callsBlockLabel}
            missedCallsCount={missedCount}
            callbacksCount={callbacksCount}
            voicemailCount={voicemailCount}
            scheduledCallsCount={scheduledCount}
            needsAttentionCount={needsAttentionCount}
            contactsCount={formattedContacts.length}
            activeFilter={activeStatFilter}
            onSelectStat={(key) => {
              setActiveStatFilter(key);
              if (key === "needs-attention") {
                handleScrollToNeedsAttention();
              }
            }}
            onScrollToNeedsAttention={handleScrollToNeedsAttention}
            onScrollToContactList={handleScrollToContactList}
          />

          {/* Interactive Selected Number Block Live Drawer */}
          {activeStatFilter !== "all" && (
            <div className="bg-[#05142B]/95 border border-[#C5A059]/70 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.9),0_0_16px_rgba(197,160,89,0.2)] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#3A2C18]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#020A17] border border-[#C5A059]/50 flex items-center justify-center text-[#FFE394]">
                    {activeStatFilter === "calls" ? (
                      <Phone className="h-3.5 w-3.5" />
                    ) : activeStatFilter === "missed" ? (
                      <PhoneMissed className="h-3.5 w-3.5 text-rose-400" />
                    ) : activeStatFilter === "voicemails" ? (
                      <Voicemail className="h-3.5 w-3.5 text-[#FFE394]" />
                    ) : activeStatFilter === "scheduled" ? (
                      <CalendarCheck className="h-3.5 w-3.5 text-[#C5A059]" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-serif font-bold text-[#FFF4D4]">
                      {activeStatFilter === "calls"
                        ? `${callsBlockLabel} (${callsTodayCount})`
                        : activeStatFilter === "missed"
                        ? `Missed Quo Calls (${missedCount})`
                        : activeStatFilter === "voicemails"
                        ? `Quo Voicemails (${voicemailCount})`
                        : activeStatFilter === "scheduled"
                        ? `Scheduled Calls (${scheduledCount})`
                        : `Needs Attention Queue (${needsAttentionCount})`}
                    </h3>
                    <p className="text-[11px] text-[#C6B697]">
                      Click any record below to call back in Quo, send an SMS, or load into the Call Workspace.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeStatFilter !== "scheduled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const el = document.getElementById("live-quo-feed-section");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="h-7 px-2.5 text-[11px] border-[#3A2C18] bg-[#020A17] text-[#FFE394] hover:bg-[#07162B] rounded-lg cursor-pointer"
                    >
                      Jump to Full Feed
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveStatFilter("all")}
                    className="p-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:text-white cursor-pointer"
                    title="Close filtered block view"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="mt-3 max-h-[260px] overflow-y-auto divide-y divide-[#3A2C18]/60 pr-1">
                {activeStatFilter === "scheduled" ? (
                  scheduleItems.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#C6B697]">
                      No scheduled calls found on your calendar.
                    </div>
                  ) : (
                    scheduleItems.map((item) => (
                      <div
                        key={item.id}
                        className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-[#020A17]/60 rounded-lg"
                      >
                        <div>
                          <div className="text-xs font-serif font-bold text-[#FFF4D4]">
                            {item.title} — {item.contact}
                          </div>
                          <div className="text-[11px] text-[#C6B697]">
                            {item.time} {item.phone ? `• ${item.phone}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.phone && (
                            <Button
                              size="sm"
                              onClick={() => handleDirectCallPhone(item.phone!, item.contact)}
                              className="h-7 px-2.5 text-[11px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] rounded-lg cursor-pointer"
                            >
                              Call in Quo
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLocation("/calendar")}
                            className="h-7 px-2.5 text-[11px] border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] rounded-lg cursor-pointer"
                          >
                            Calendar
                          </Button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  (() => {
                    const list =
                      activeStatFilter === "calls"
                        ? callsTodayLogs.length > 0
                          ? callsTodayLogs
                          : voiceCallLogs
                        : activeStatFilter === "missed"
                        ? missedCallLogs
                        : activeStatFilter === "voicemails"
                        ? voicemailLogs
                        : needsAttentionItems.map((n) => n.rawLog).filter(Boolean);

                    if (list.length === 0) {
                      return (
                        <div className="py-6 text-center text-xs text-[#C6B697]">
                          No Quo records currently in this queue.
                        </div>
                      );
                    }

                    return list.slice(0, 12).map((log: any) => {
                      const phone =
                        log.direction === "outgoing" || log.direction === "outbound"
                          ? log.toNumber || log.fromNumber
                          : log.fromNumber || log.toNumber;
                      const callerName = resolveCallerName(
                        log.fromNumber,
                        log.direction,
                        log.toNumber
                      );
                      const isVm = isBool(log.isVoicemail);
                      const isMissed =
                        log.eventType === "call.missed" || isBool(log.isMissed);

                      return (
                        <div
                          key={log.id}
                          className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-[#020A17]/60 rounded-lg"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-serif font-bold text-[#FFF4D4]">
                                {callerName}
                              </span>
                              <span className="text-[11px] font-mono text-[#A69371]">
                                {phone}
                              </span>
                              {isVm && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
                                  Voicemail
                                </span>
                              )}
                              {isMissed && !isVm && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold">
                                  Missed Call
                                </span>
                              )}
                              {log.recordingUrl && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                                  Audio Ready
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#C6B697] truncate mt-0.5">
                              {formatShortTime(log.createdAt)}
                              {log.durationSeconds
                                ? ` • ${Math.floor(log.durationSeconds / 60)}m ${
                                    log.durationSeconds % 60
                                  }s`
                                : ""}
                              {log.voicemailTranscript || log.transcript || log.smsBody
                                ? ` — "${String(
                                    log.voicemailTranscript || log.transcript || log.smsBody
                                  ).slice(0, 80)}"`
                                : ""}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => handleDirectCallPhone(phone, callerName)}
                              className="h-7 px-2.5 text-[11px] font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] rounded-lg cursor-pointer gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              <span>Call</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDirectSmsPhone(phone, callerName)}
                              className="h-7 px-2 text-[11px] border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:text-white rounded-lg cursor-pointer"
                              title="Send SMS in Quo"
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowCallWorkspace(true);
                                startCall({
                                  callerCategory: "new_lead",
                                  callType: isVm ? "Voicemail Follow-Up" : "Inbound Call",
                                  callerInfo: { name: callerName, phone },
                                  generalNotes:
                                    log.voicemailTranscript ||
                                    log.transcript ||
                                    log.summary ||
                                    log.smsBody ||
                                    `Quo Call #${log.id} (${log.eventType || "call"})`,
                                });
                                toast.success(`Loaded ${callerName} into Call Workspace`);
                                setTimeout(() => {
                                  const el = document.getElementById("call-workspace");
                                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                }, 100);
                              }}
                              className="h-7 px-2 text-[11px] border-[#3A2C18] bg-[#020A17] text-[#FFE394] hover:text-white rounded-lg cursor-pointer"
                              title="Load into Call Workspace"
                            >
                              <UserPlus className="h-3 w-3" />
                            </Button>
                            {(activeStatFilter === "missed" ||
                              activeStatFilter === "needs-attention") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateCallbackMutation.mutate({
                                    id: log.id,
                                    callbackStatus: "completed",
                                  })
                                }
                                className="h-7 px-2 text-[11px] border-[#3A2C18] bg-[#020A17] text-emerald-400 hover:bg-emerald-950/50 rounded-lg cursor-pointer"
                                title="Mark handled"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          )}

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
        needsAttentionItems={needsAttentionItems}
        scheduleItems={scheduleItems}
        voicemailLogs={voicemailLogs as any}
        onCallNumber={handleDirectCallPhone}
        onOpenSms={handleDirectSmsPhone}
        onMarkHandled={(logId) =>
          updateCallbackMutation.mutate({
            id: logId,
            callbackStatus: "completed",
          })
        }
        onLoadIntoWorkspace={(log, callerName) => {
          setShowCallWorkspace(true);
          startCall({
            callerCategory: "new_lead",
            callType: "Inbound Call",
            callerInfo: {
              name: callerName || "Inbound Caller",
              phone: log.fromNumber,
            },
            generalNotes:
              log.voicemailTranscript ||
              log.transcript ||
              log.summary ||
              log.smsBody ||
              `Inbound Call #${log.id} (${log.eventType || "call"})`,
          });
          toast.success(`Loaded ${callerName || log.fromNumber} into Call Workspace`);
          setTimeout(() => {
            const el = document.getElementById("call-workspace");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }}
        onOpenSchedule={() => {
          setLocation("/calendar");
        }}
        onViewAllVoicemails={() => {
          setActiveStatFilter("voicemails");
          const el = document.getElementById("live-quo-feed-section");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onViewAllNeedsAttention={() => {
          setActiveStatFilter("needs-attention");
          const el = document.getElementById("live-quo-feed-section");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onCreateLeadFromVoicemail={(phone, summary) => {
          setShowCallWorkspace(true);
          startCall({
            callerCategory: "new_lead",
            callType: "New Lead / Sales",
            callerInfo: { name: resolveCallerName(phone), phone },
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

      {/* LIVE QUO WEBHOOK & CALL LOG FEED (BOTTOM OF PAGE) */}
      <div id="live-quo-feed-section" className="scroll-mt-6">
        <LiveCallLogsTable
          logs={logs as any}
          isLoading={isFetching}
          externalFilter={activeStatFilter}
          onFilterChange={(nextFilter) => setActiveStatFilter(nextFilter)}
          onRefresh={() => {
            refetchLogs();
            toast.success("Call logs refreshed");
          }}
          onCallNumber={handleDirectCallPhone}
          onOpenSms={handleDirectSmsPhone}
          onAssignToLead={(log) => {
            setShowCallWorkspace(true);
            startCall({
              callerCategory: "new_lead",
              callType: "Inbound Call",
              callerInfo: { name: "Inbound Caller", phone: log.fromNumber },
              generalNotes: `Inbound Call #${log.id} (${log.eventType || "call"})\nFrom: ${log.fromNumber}\nTo: ${log.toNumber}\nDuration: ${log.durationSeconds || 0}s`,
            });
            toast.success(`Loaded Call #${log.id} into Workspace`);
            setTimeout(() => {
              const el = document.getElementById("call-workspace");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          }}
          onOpenSettings={() => setShowSettings(true)}
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
