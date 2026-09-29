import React, { useState, useMemo, useCallback } from "react";
import { UserPlus, UserCheck, Briefcase, Search, ExternalLink, GraduationCap, Phone, Mail, Building, Plus, Zap, Compass, Calendar, Clock, Sparkles, PhoneCall, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useActiveCall, CallerCategory } from "@/contexts/ActiveCallContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AddNewContactModal } from "./AddNewContactModal";
import QuickSetupModal from "@/components/QuickSetupModal";

const OTHER_ROLES = [
  "School Staff",
  "Provider / Clinic",
  "Evaluator / Psych",
  "Attorney",
  "Sponsor / Partner",
  "Donor / Supporter",
  "Vendor",
  "Community Partner",
  "Other Professional",
];

interface CallerIdentitySelectorProps {
  onSelectLeadForm?: () => void;
  onOpenClientWorkspace?: (contactId: number, studentId?: number | null) => void;
  onAddNewContactRequest?: () => void;
}

export function CallerIdentitySelector({
  onSelectLeadForm,
  onOpenClientWorkspace,
  onAddNewContactRequest,
}: CallerIdentitySelectorProps) {
  const { call, updateCall, setCallerCategory } = useActiveCall();
  const [searchTerm, setSearchTerm] = useState("");
  const [leadSearchTerm, setLeadSearchTerm] = useState("");
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [showOtherRoles, setShowOtherRoles] = useState(false);

  // Queries for real CRM data
  const { data: contactsData = [], isLoading: contactsLoading } = trpc.contacts.list.useQuery();
  const { data: leadsData = [], isLoading: leadsLoading } = trpc.leads.list.useQuery();

  // Helper to resolve student for any parent contact
  const getStudentForContact = useCallback((contact: any) => {
    if (!contact) return null;
    if (contact.studentName) {
      return { id: contact.studentId || null, name: contact.studentName, gradeLevel: contact.gradeLevel, schoolName: contact.schoolName };
    }
    // Check if the contact itself is marked as a student
    if (contact.jobTitle === "Student") {
      const studentName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.name;
      return { id: contact.id, name: studentName, gradeLevel: contact.gradeLevel, schoolName: contact.schoolName };
    }
    // Look up child contact where parentContactId points to this contact
    const child = contactsData.find((c: any) => c.parentContactId === contact.id && (c.jobTitle === "Student" || !c.jobTitle));
    if (child) {
      const childName = `${child.firstName || ""} ${child.lastName || ""}`.trim() || child.name;
      return { id: child.id, name: childName, gradeLevel: child.gradeLevel, schoolName: child.schoolName };
    }
    return null;
  }, [contactsData]);

  // Filter contacts by search query (focus on primary/parent clients)
  const matchingContacts = useMemo(() => {
    const clientContacts = contactsData.filter((c: any) => c.jobTitle !== "Student");
    if (!searchTerm.trim()) return clientContacts.slice(0, 10);
    const q = searchTerm.toLowerCase();
    return clientContacts.filter((c: any) => {
      const name = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const student = getStudentForContact(c);
      const studentName = (student?.name || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q) || studentName.includes(q);
    }).slice(0, 10);
  }, [contactsData, searchTerm, getStudentForContact]);

  // Filter leads for Discovery Call
  const matchingLeads = useMemo(() => {
    if (!leadSearchTerm.trim()) return leadsData.slice(0, 12);
    const q = leadSearchTerm.toLowerCase();
    return leadsData.filter((l: any) => {
      const pName = (l.parentName || l.name || "").toLowerCase();
      const sName = (l.studentName || "").toLowerCase();
      const phone = (l.parentPhone || l.phone || "").toLowerCase();
      const email = (l.parentEmail || l.email || "").toLowerCase();
      return pName.includes(q) || sName.includes(q) || phone.includes(q) || email.includes(q);
    }).slice(0, 12);
  }, [leadsData, leadSearchTerm]);

  // Today's scheduled discovery calls
  const todaysDiscoveryCalls = useMemo(() => {
    const today = new Date().toDateString();
    return leadsData.filter((l: any) => {
      if (!l.discoveryCallDate) return false;
      return new Date(l.discoveryCallDate).toDateString() === today;
    });
  }, [leadsData]);

  // Selected lead details if active
  const selectedLead = useMemo(() => {
    if (!call.leadId) return null;
    return leadsData.find((l: any) => l.id === call.leadId) || null;
  }, [leadsData, call.leadId]);

  // Selected contact details if active
  const selectedContact = useMemo(() => {
    if (!call.contactId) return null;
    return contactsData.find((c: any) => c.id === call.contactId) || null;
  }, [contactsData, call.contactId]);

  const handleSelectCategory = (cat: CallerCategory) => {
    setCallerCategory(cat);
    if (cat === "discovery_call") {
      updateCall({
        callerCategory: "discovery_call",
        callType: "Discovery Call",
      });
    } else if (cat === "lead" || cat === "new_lead") {
      updateCall({
        callerCategory: "new_lead",
        callType: "New Lead / Sales",
      });
      setShowQuickSetup(true);
      if (onSelectLeadForm) {
        onSelectLeadForm();
      }
    } else if (cat === "client" || cat === "existing_client") {
      updateCall({
        callerCategory: "existing_client",
        callType: "Current Client",
      });
    } else if (cat === "other" || cat === "other_contact") {
      updateCall({
        callerCategory: "other_contact",
        callType: "School / Provider",
      });
    }
  };

  const handlePickLead = (lead: any) => {
    const parentName = lead.parentName || lead.name || "Prospective Parent";
    updateCall({
      leadId: lead.id,
      leadData: lead,
      callerCategory: "discovery_call",
      callType: "Discovery Call",
      callerInfo: {
        name: parentName,
        phone: lead.parentPhone || lead.phone || call.callerInfo.phone || "",
        email: lead.parentEmail || lead.email || call.callerInfo.email || "",
      },
      studentName: lead.studentName || null,
      generalNotes: lead.notes || "",
    });
    toast.success(`Loaded Discovery Call for ${parentName}${lead.studentName ? ` (Student: ${lead.studentName})` : ""}`);
  };

  const handleOpenWorkspace = (contactId: number, studentId?: number | null) => {
    if (onOpenClientWorkspace) {
      onOpenClientWorkspace(contactId, studentId);
    } else {
      window.location.href = `/contacts/${contactId}`;
    }
  };

  const handlePickClient = (contact: any) => {
    const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.name || "Client";
    const student = getStudentForContact(contact);
    updateCall({
      contactId: contact.id,
      contactName: fullName,
      callerInfo: {
        name: fullName,
        phone: contact.phone || call.callerInfo.phone || "",
        email: contact.email || call.callerInfo.email || "",
      },
      studentId: student?.id || contact.studentId || null,
      studentName: student?.name || contact.studentName || null,
      callerCategory: "existing_client",
      callType: call.callType || "Current Client",
    });
    toast.success(`Connected client: ${fullName}${student?.name ? ` (Student: ${student.name})` : ""}`);
  };

  const handlePickOtherContact = (contact: any) => {
    const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.name || "Contact";
    updateCall({
      contactId: contact.id,
      contactName: fullName,
      callerInfo: {
        name: fullName,
        phone: contact.phone || call.callerInfo.phone || "",
        email: contact.email || call.callerInfo.email || "",
      },
      callerCategory: "other_contact",
      callType: call.callType || "School / Provider",
    });
    toast.success(`Connected contact: ${fullName}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
          <span>Section 1</span>
          <span className="text-slate-400">•</span>
          <span className="text-white text-base">Who am I talking to?</span>
        </h3>
        <p className="text-xs text-slate-300/80 mt-0.5">
          Identify the caller to dynamically tailor the call workflow, checklist, and account history.
        </p>
      </div>

      {/* 3 Large Primary Choices Cards: Discovery Call | New Client | Existing Client */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Primary Choice 1: Discovery Call */}
        <div
          onClick={() => handleSelectCategory("discovery_call")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
            call.callerCategory === "discovery_call"
              ? "bg-gradient-to-br from-[#2a1d08] to-[#140e03] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
              : "bg-[#061830] border-sky-500/20 hover:border-amber-400/40 hover:bg-[#072038]"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Compass className="h-5 w-5" />
              </div>
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] font-bold">
                Scheduled Consultation
              </Badge>
            </div>
            <h4 className="text-base font-bold text-white mt-3 group-hover:text-amber-300 transition-colors">
              Discovery Call
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Scheduled prospective family deep-dive. Work through PG-003-DC questions, scripts, service tiers & enrollment.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCategory("discovery_call");
              }}
              className={`w-full text-xs h-8 rounded-xl font-bold cursor-pointer gap-1.5 ${
                call.callerCategory === "discovery_call"
                  ? "bg-amber-400 hover:bg-amber-500 text-slate-950"
                  : "border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 bg-transparent"
              }`}
            >
              <PhoneCall className="h-3.5 w-3.5" />
              {call.leadId ? "Discovery Call Ready" : "Select Scheduled Lead"}
            </Button>
          </div>
        </div>

        {/* Primary Choice 2: New Client */}
        <div
          onClick={() => handleSelectCategory("lead")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
            call.callerCategory === "lead" || call.callerCategory === "new_lead"
              ? "bg-gradient-to-br from-[#082820] to-[#041510] border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              : "bg-[#061830] border-sky-500/20 hover:border-emerald-500/40 hover:bg-[#072038]"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <UserPlus className="h-5 w-5" />
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                Inbound Inquiry
              </Badge>
            </div>
            <h4 className="text-base font-bold text-white mt-3 group-hover:text-emerald-300 transition-colors">
              New Client
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Inbound inquiry or sales discovery. Start new-client intake and record student issues.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCategory("lead");
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-8 rounded-xl shadow-sm gap-1.5 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 text-slate-950" />
              Open Lead Form
            </Button>
          </div>
        </div>

        {/* Primary Choice 3: Existing Client */}
        <div
          onClick={() => handleSelectCategory("client")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
            call.callerCategory === "client" || call.callerCategory === "existing_client"
              ? "bg-gradient-to-br from-[#082245] to-[#051630] border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
              : "bg-[#061830] border-sky-500/20 hover:border-sky-400/40 hover:bg-[#072038]"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
              <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30 text-[10px] font-bold">
                Active Client
              </Badge>
            </div>
            <h4 className="text-base font-bold text-white mt-3 group-hover:text-sky-300 transition-colors">
              Existing Client
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Search contracted parents, select student, and view real-time case telemetry.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <Button
              size="sm"
              variant={call.callerCategory === "client" || call.callerCategory === "existing_client" ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCategory("client");
              }}
              className={`w-full text-xs h-8 rounded-xl font-bold cursor-pointer ${
                call.callerCategory === "client" || call.callerCategory === "existing_client"
                  ? "bg-sky-400 hover:bg-sky-500 text-slate-950"
                  : "border-sky-500/30 text-sky-300 hover:bg-sky-500/10"
              }`}
            >
              Select Existing Client
            </Button>
          </div>
        </div>
      </div>

      {/* Discreet Secondary Role: Professional / Other Contact */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-slate-400">Need to record a call with school personnel, attorney, or partner?</span>
        <button
          type="button"
          onClick={() => {
            setShowOtherRoles((v) => !v);
            if (!showOtherRoles) {
              handleSelectCategory("other");
            }
          }}
          className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
            call.callerCategory === "other" || call.callerCategory === "other_contact" || showOtherRoles
              ? "text-purple-300 hover:text-purple-200"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5 text-purple-400" />
          <span>Professional / Other Contact</span>
          <ChevronRight className={`h-3 w-3 transition-transform ${showOtherRoles ? "rotate-90" : ""}`} />
        </button>
      </div>

      {/* Sub-Panel: If Discovery Call is selected */}
      {call.callerCategory === "discovery_call" && (
        <div className="p-4.5 rounded-2xl bg-[#1a1306] border border-amber-500/40 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="h-4 w-4 text-amber-400" />
              <span>Select Scheduled Lead for Discovery Call</span>
            </div>
            {todaysDiscoveryCalls.length > 0 && (
              <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-[10px] font-bold">
                {todaysDiscoveryCalls.length} Scheduled Today
              </Badge>
            )}
          </div>

          {/* If lead is already selected */}
          {selectedLead ? (
            <div className="p-4 rounded-xl bg-[#0a1829] border border-amber-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-base">
                  {(selectedLead.parentName || selectedLead.name || "L")[0]}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedLead.parentName || selectedLead.name}</span>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                      {selectedLead.status || "Lead"}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-300 flex items-center gap-3 mt-1 flex-wrap">
                    {selectedLead.studentName && (
                      <span className="text-amber-300 font-medium flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
                        Student: {selectedLead.studentName} {selectedLead.studentGrade ? `(${selectedLead.studentGrade})` : ""}
                      </span>
                    )}
                    {(selectedLead.parentPhone || selectedLead.phone) && (
                      <span className="flex items-center gap-1 font-mono text-sky-300">
                        <Phone className="h-3 w-3" /> {selectedLead.parentPhone || selectedLead.phone}
                      </span>
                    )}
                    {selectedLead.discoveryCallDate && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="h-3 w-3 text-amber-400" />
                        Scheduled: {new Date(selectedLead.discoveryCallDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateCall({ leadId: null, leadData: null })}
                  className="border-slate-700 hover:border-amber-400/40 text-slate-300 hover:text-white text-xs h-8 rounded-lg cursor-pointer"
                >
                  Change Lead
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Today's Scheduled Quick Picks */}
              {todaysDiscoveryCalls.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Today's Scheduled Discovery Calls:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {todaysDiscoveryCalls.map((lead: any) => {
                      const pName = lead.parentName || lead.name || "Prospective Parent";
                      return (
                        <div
                          key={lead.id}
                          onClick={() => handlePickLead(lead)}
                          className="p-2.5 rounded-xl bg-[#0d2238] border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer text-xs"
                        >
                          <div className="font-bold text-white truncate">{pName}</div>
                          <div className="text-[11px] text-amber-300 truncate">
                            Student: {lead.studentName || "Not listed"}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {lead.discoveryCallDate ? new Date(lead.discoveryCallDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lead Search Input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={leadSearchTerm}
                  onChange={(e) => setLeadSearchTerm(e.target.value)}
                  placeholder="Search leads by parent name, student name, phone, or email..."
                  className="pl-9.5 bg-[#040D1A] border-slate-700 text-white placeholder:text-slate-500 rounded-xl text-xs h-9"
                />
              </div>

              {/* Matching leads grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {leadsLoading ? (
                  <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                    Loading lead records...
                  </div>
                ) : matchingLeads.length === 0 ? (
                  <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                    No matching leads found. You can create a new lead in Section 1.
                  </div>
                ) : (
                  matchingLeads.map((l: any) => {
                    const pName = l.parentName || l.name || "Prospective Parent";
                    return (
                      <div
                        key={l.id}
                        onClick={() => handlePickLead(l)}
                        className="p-3 rounded-xl border border-slate-800 hover:border-amber-400/50 bg-[#061830] transition-all cursor-pointer text-xs flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-bold truncate text-white">{pName}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {l.parentPhone || l.phone || l.parentEmail || "No contact info"}
                          </div>
                          {l.studentName && (
                            <div className="text-[11px] text-amber-300 font-medium truncate flex items-center gap-1 mt-0.5">
                              <GraduationCap className="h-3 w-3 text-amber-400" />
                              <span>Student: {l.studentName}</span>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 px-2 cursor-pointer"
                        >
                          Select
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Sub-Panel: If Existing Client is selected */}
      {(call.callerCategory === "client" || call.callerCategory === "existing_client") && (
        <div className="p-4.5 rounded-2xl bg-[#092244] border border-sky-500/30 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="h-4 w-4 text-sky-400" />
              <span>Search Client Records (Actual CRM Data)</span>
            </div>
            {call.contactId && (
              <Button
                size="sm"
                onClick={() => handleOpenWorkspace(call.contactId!, call.studentId)}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 px-3.5 rounded-xl gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Client Workspace
              </Button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by parent name, student name, phone, or email..."
              className="pl-9.5 bg-[#040D1A] border-slate-700 text-white placeholder:text-slate-500 rounded-xl text-xs h-9"
            />
          </div>

          {/* Quick matching clients list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {contactsLoading ? (
              <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                Loading client records...
              </div>
            ) : matchingContacts.length === 0 ? (
              <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                No matching client found. You can add them as a New Lead or create a contact.
              </div>
            ) : (
              matchingContacts.map((c: any) => {
                const fullName = `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.name || "Contact";
                const isSelected = call.contactId === c.id;
                const student = getStudentForContact(c);
                return (
                  <div
                    key={c.id}
                    onClick={() => handlePickClient(c)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs flex items-center justify-between ${
                      isSelected
                        ? "bg-sky-500/20 border-sky-400 text-white font-semibold"
                        : "bg-[#061830] border-slate-800 hover:border-sky-500/40 text-slate-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-bold truncate text-white">{fullName}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {c.phone || c.email || "No phone listed"}
                      </div>
                      {student?.name && (
                        <div className="text-[11px] text-amber-300 font-medium truncate flex items-center gap-1 mt-0.5">
                          <GraduationCap className="h-3 w-3 text-amber-400" />
                          <span>Student: {student.name}</span>
                          {student.gradeLevel && (
                            <span className="text-slate-400 font-normal">({student.gradeLevel})</span>
                          )}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Badge className="bg-sky-400 text-slate-950 text-[10px] font-bold shrink-0">
                        Selected
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Client Card Snapshot */}
          {selectedContact && (
            <div className="p-3.5 rounded-xl bg-[#040D1A] border border-sky-500/30 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-300 font-bold">
                  {call.callerInfo.name ? call.callerInfo.name[0] : "C"}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{call.callerInfo.name}</span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      Active Account
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5 flex-wrap">
                    {call.callerInfo.phone && (
                      <span className="flex items-center gap-1 font-mono text-sky-300">
                        <Phone className="h-3 w-3" /> {call.callerInfo.phone}
                      </span>
                    )}
                    {call.callerInfo.email && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Mail className="h-3 w-3" /> {call.callerInfo.email}
                      </span>
                    )}
                    {(call.studentName || getStudentForContact(selectedContact)?.name) && (
                      <span className="text-amber-300 font-medium flex items-center gap-1">
                        <GraduationCap className="h-3 w-3 text-amber-400" />
                        Student: {call.studentName || getStudentForContact(selectedContact)?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Student selection toggle if client has multiple */}
              <div className="flex items-center gap-2">
                <Input
                  value={call.studentName || ""}
                  onChange={(e) => updateCall({ studentName: e.target.value })}
                  placeholder="Student name (optional)..."
                  className="bg-[#061830] border-slate-700 text-white text-xs h-8 w-44 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Panel: If Other Contact is selected */}
      {(call.callerCategory === "other" || call.callerCategory === "other_contact" || showOtherRoles) && (
        <div className="p-4.5 rounded-2xl bg-[#130b20] border border-purple-500/30 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-400" />
              <span>Select Professional Role & Contact</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddContactModal(true)}
              className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs h-7 rounded-lg gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Quick Add Contact
            </Button>
          </div>

          {/* Professional Role Selection Chips */}
          <div className="flex flex-wrap gap-2">
            {OTHER_ROLES.map((role) => {
              const isSelected = call.otherRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => updateCall({ otherRole: role })}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-purple-500 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                      : "bg-[#061830] border-slate-700 text-slate-300 hover:border-purple-400/50 hover:text-white"
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>

          {/* Search Input for Existing Directory */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search partner, school district, clinic, or evaluator..."
              className="pl-9.5 bg-[#040D1A] border-slate-700 text-white placeholder:text-slate-500 rounded-xl text-xs h-9"
            />
          </div>

          {/* Matching contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {matchingContacts.map((c: any) => {
              const fullName = `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.name || "Contact";
              const isSelected = call.contactId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handlePickOtherContact(c)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer text-xs flex items-center justify-between ${
                    isSelected
                      ? "bg-purple-500/20 border-purple-400 text-white font-semibold"
                      : "bg-[#061830] border-slate-800 hover:border-purple-500/40 text-slate-200"
                  }`}
                >
                  <div className="truncate">
                    <div className="font-bold text-white truncate">{fullName}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {c.company || c.phone || "Professional Contact"}
                    </div>
                  </div>
                  {isSelected && (
                    <Badge className="bg-purple-400 text-slate-950 text-[10px] font-bold shrink-0">
                      Active
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Quick Add Contact */}
      <AddNewContactModal
        open={showAddContactModal}
        onOpenChange={setShowAddContactModal}
        onSuccess={(newC) => {
          if (newC?.name) {
            updateCall({
              contactName: newC.name,
              callerInfo: {
                name: newC.name,
                phone: newC.phone || "",
                email: newC.email || "",
              },
            });
            toast.success(`Contact ${newC.name} added and selected`);
          }
        }}
      />

      {/* Modal: Quick Client Setup (Portal Creation) */}
      <QuickSetupModal
        open={showQuickSetup}
        onClose={() => setShowQuickSetup(false)}
        initialData={{
          parentPhone: call.callerInfo?.phone || "",
          parentFirstName: call.callerInfo?.name ? call.callerInfo.name.split(" ")[0] : "",
          parentLastName: call.callerInfo?.name ? call.callerInfo.name.split(" ").slice(1).join(" ") : "",
          studentFirstName: call.studentName ? call.studentName.split(" ")[0] : "",
          studentLastName: call.studentName ? call.studentName.split(" ").slice(1).join(" ") : "",
        }}
      />
    </div>
  );
}

export default CallerIdentitySelector;
