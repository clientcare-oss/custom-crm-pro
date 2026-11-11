import React, { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import {
  UserPlus,
  UserCheck,
  Briefcase,
  Search,
  ExternalLink,
  GraduationCap,
  Phone,
  Mail,
  Plus,
  Compass,
  ArrowRight,
  ChevronRight,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useActiveCall, CallerCategory } from "@/contexts/ActiveCallContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AddNewContactModal } from "./AddNewContactModal";

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
}: CallerIdentitySelectorProps) {
  const [, setLocation] = useLocation();
  const { call, updateCall, setCallerCategory } = useActiveCall();
  const [searchTerm, setSearchTerm] = useState("");
  const [leadSearchTerm, setLeadSearchTerm] = useState("");
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showOtherRoles, setShowOtherRoles] = useState(false);
  const [callNoteForLead, setCallNoteForLead] = useState("");

  // Queries for real CRM data
  const { data: contactsData = [], isLoading: contactsLoading } =
    trpc.contacts.list.useQuery();
  const { data: hydratedLeads = [], isLoading: leadsLoading } =
    trpc.leads.listHydrated.useQuery();

  const logCallToLeadMutation = trpc.leads.logCallToLead.useMutation();

  // Helper to resolve student for any parent contact
  const getStudentForContact = useCallback(
    (contact: any) => {
      if (!contact) return null;
      if (contact.studentName) {
        return {
          id: contact.studentId || null,
          name: contact.studentName,
          gradeLevel: contact.gradeLevel,
          schoolName: contact.schoolName,
        };
      }
      if (contact.jobTitle === "Student") {
        const studentName =
          `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
          contact.name;
        return {
          id: contact.id,
          name: studentName,
          gradeLevel: contact.gradeLevel,
          schoolName: contact.schoolName,
        };
      }
      const child = contactsData.find(
        (c: any) =>
          c.parentContactId === contact.id &&
          (c.jobTitle === "Student" || !c.jobTitle)
      );
      if (child) {
        const childName =
          `${child.firstName || ""} ${child.lastName || ""}`.trim() || child.name;
        return {
          id: child.id,
          name: childName,
          gradeLevel: child.gradeLevel,
          schoolName: child.schoolName,
        };
      }
      return null;
    },
    [contactsData]
  );

  // Filter contacts by search query (focus on primary/parent clients)
  const matchingContacts = useMemo(() => {
    const clientContacts = contactsData.filter((c: any) => c.jobTitle !== "Student");
    if (!searchTerm.trim()) return clientContacts.slice(0, 10);
    const q = searchTerm.toLowerCase();
    return clientContacts
      .filter((c: any) => {
        const name = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const student = getStudentForContact(c);
        const studentName = (student?.name || "").toLowerCase();
        return (
          name.includes(q) ||
          phone.includes(q) ||
          email.includes(q) ||
          studentName.includes(q)
        );
      })
      .slice(0, 10);
  }, [contactsData, searchTerm, getStudentForContact]);

  // Filter hydrated leads
  const matchingLeads = useMemo(() => {
    if (!leadSearchTerm.trim()) return hydratedLeads.slice(0, 12);
    const q = leadSearchTerm.toLowerCase();
    return hydratedLeads
      .filter((l: any) => {
        const pName = (l.parentName || "").toLowerCase();
        const sName = (l.studentNames?.join(" ") || l.studentName || "").toLowerCase();
        const phone = (l.parentPhone || "").toLowerCase();
        const email = (l.parentEmail || "").toLowerCase();
        return (
          pName.includes(q) ||
          sName.includes(q) ||
          phone.includes(q) ||
          email.includes(q)
        );
      })
      .slice(0, 12);
  }, [hydratedLeads, leadSearchTerm]);

  // Selected lead details if active
  const selectedLead = useMemo(() => {
    if (!call.leadId) return null;
    return hydratedLeads.find((l: any) => l.id === call.leadId) || null;
  }, [hydratedLeads, call.leadId]);

  // Selected contact details if active
  const selectedContact = useMemo(() => {
    if (!call.contactId) return null;
    return contactsData.find((c: any) => c.id === call.contactId) || null;
  }, [contactsData, call.contactId]);

  const handleSelectCategory = (cat: CallerCategory) => {
    setCallerCategory(cat);
    if (cat === "lead" || cat === "new_lead") {
      updateCall({
        callerCategory: "new_lead",
        callType: "New Lead / Sales",
      });
      if (onSelectLeadForm) {
        onSelectLeadForm();
      }
    } else if (cat === "discovery_call") {
      updateCall({
        callerCategory: "discovery_call",
        callType: "General Question",
      });
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
    const parentName = lead.parentName || "Prospective Family";
    updateCall({
      leadId: lead.id,
      leadData: lead,
      callerCategory: "discovery_call",
      callerInfo: {
        name: parentName,
        phone: lead.parentPhone || call.callerInfo.phone || "",
        email: lead.parentEmail || call.callerInfo.email || "",
      },
      studentName: lead.studentNames?.join(", ") || lead.studentName || null,
    });
    toast.success(`Selected existing lead: ${parentName} (Stage: ${lead.stageLabel || "Inquiry"})`);
  };

  const handleOpenLeadInLeadCenter = async (lead: any) => {
    const targetStage =
      lead.stage === "active" ? "onboarding" : lead.stage || "inquiry";
    const combinedNote = [callNoteForLead.trim(), (call.generalNotes || "").trim()]
      .filter(Boolean)
      .join(" — ");

    if (combinedNote) {
      try {
        await logCallToLeadMutation.mutateAsync({
          leadId: lead.id,
          callNotes: combinedNote,
        });
      } catch {}
    }

    setLocation(`/leads/${lead.id}/${targetStage}`);
  };

  const handleOpenWorkspace = (contactId: number, studentId?: number | null) => {
    if (onOpenClientWorkspace) {
      onOpenClientWorkspace(contactId, studentId);
    } else {
      setLocation(`/contacts/${contactId}`);
    }
  };

  const handlePickClient = (contact: any) => {
    const fullName =
      `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
      contact.name ||
      "Client";
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
    toast.success(
      `Connected client: ${fullName}${student?.name ? ` (Student: ${student.name})` : ""}`
    );
  };

  const handlePickOtherContact = (contact: any) => {
    const fullName =
      `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
      contact.name ||
      "Contact";
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
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#D8B979] flex items-center gap-2">
          <span>Section 1</span>
          <span className="text-slate-400">•</span>
          <span className="text-white text-base">Who am I talking to?</span>
        </h3>
        <p className="text-xs text-slate-300/80 mt-0.5">
          Start a New Service Inquiry, open an Existing Lead in the Lead Center, or connect an Existing Client.
        </p>
      </div>

      {/* 3 Primary Choices Cards: New Service Inquiry | Existing Lead | Existing Client */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Primary Choice 1: New Service Inquiry */}
        <div
          onClick={() => handleSelectCategory("lead")}
          data-testid="call-center-choice-new-inquiry"
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
            call.callerCategory === "lead" || call.callerCategory === "new_lead"
              ? "bg-[#0C204B] border-[#D8B979] shadow-[0_0_20px_rgba(216,185,121,0.2)]"
              : "bg-[#061830] border-sky-500/20 hover:border-[#D8B979]/50 hover:bg-[#072038]"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#040D26] border border-[#243B67] text-[#D8B979] flex items-center justify-center">
                <UserPlus className="h-5 w-5" />
              </div>
              <Badge className="bg-[#040D26] text-[#D8B979] border-[#243B67] text-[10px] font-bold">
                Inbound Inquiry
              </Badge>
            </div>
            <h4 className="text-base font-bold text-white mt-3">
              New Service Inquiry
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Capture parent & multi-student inquiry details, check for duplicates, and open in the Lead Center.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCategory("lead");
              }}
              className="w-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-xs h-8 rounded-xl shadow-sm gap-1.5 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              New Service Inquiry
            </Button>
          </div>
        </div>

        {/* Primary Choice 2: Existing Lead (Open in Lead Center at Current Stage) */}
        <div
          onClick={() => handleSelectCategory("discovery_call")}
          data-testid="call-center-choice-existing-lead"
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
            call.callerCategory === "discovery_call"
              ? "bg-[#0C204B] border-[#D8B979] shadow-[0_0_20px_rgba(216,185,121,0.2)]"
              : "bg-[#061830] border-sky-500/20 hover:border-[#D8B979]/50 hover:bg-[#072038]"
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#040D26] border border-[#243B67] text-[#D8B979] flex items-center justify-center">
                <Compass className="h-5 w-5" />
              </div>
              <Badge className="bg-[#040D26] text-[#D8B979] border-[#243B67] text-[10px] font-bold">
                Lead Center Journey
              </Badge>
            </div>
            <h4 className="text-base font-bold text-white mt-3">
              Existing Lead
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Check a prospective family’s current stage (Inquiry, Discovery, Decision, Onboarding) and open in Lead Center.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCategory("discovery_call");
              }}
              className="w-full border border-[#28447A] bg-[#040D26] text-white hover:border-[#D8B979] text-xs h-8 rounded-xl font-bold cursor-pointer gap-1.5"
            >
              <Compass className="h-3.5 w-3.5 text-[#D8B979]" />
              {selectedLead ? "Open in Lead Center" : "Select Existing Lead"}
            </Button>
          </div>
        </div>

        {/* Primary Choice 3: Existing Client */}
        <div
          onClick={() => handleSelectCategory("client")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
            call.callerCategory === "client" ||
            call.callerCategory === "existing_client"
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
              variant={
                call.callerCategory === "client" ||
                call.callerCategory === "existing_client"
                  ? "default"
                  : "outline"
              }
              onClick={(e) => {
                e.stopPropagation();
                handleSelectCategory("client");
              }}
              className={`w-full text-xs h-8 rounded-xl font-bold cursor-pointer ${
                call.callerCategory === "client" ||
                call.callerCategory === "existing_client"
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
        <span className="text-slate-400">
          Need to record a call with school personnel, attorney, or partner?
        </span>
        <button
          type="button"
          onClick={() => {
            setShowOtherRoles((v) => !v);
            if (!showOtherRoles) {
              handleSelectCategory("other");
            }
          }}
          className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
            call.callerCategory === "other" ||
            call.callerCategory === "other_contact" ||
            showOtherRoles
              ? "text-purple-300 hover:text-purple-200"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Briefcase className="h-3.5 w-3.5 text-purple-400" />
          <span>Professional / Other Contact</span>
          <ChevronRight
            className={`h-3 w-3 transition-transform ${
              showOtherRoles ? "rotate-90" : ""
            }`}
          />
        </button>
      </div>

      {/* Sub-Panel: Existing Lead Selected — Show Current Stage & Open in Lead Center */}
      {call.callerCategory === "discovery_call" && (
        <div
          className="p-4.5 rounded-2xl bg-[#05102B] border border-[#1E335C] space-y-4 animate-in fade-in"
          data-testid="call-center-existing-lead-panel"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#D8B979]" />
              <span>Existing Family Lead · Open in Lead Center</span>
            </div>
          </div>

          {selectedLead ? (
            <div className="p-4 rounded-xl bg-[#030A1C] border border-[#243B67] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base font-bold text-white">
                      {selectedLead.parentName}
                    </span>
                    <span
                      data-testid="existing-lead-stage-badge"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0C204B] text-[#D8B979] border border-[#28447A]"
                    >
                      <CircleDot className="w-3 h-3 text-[#D8B979]" />
                      Stage: {selectedLead.stageLabel || "Inquiry"}
                    </span>
                  </div>
                  <div className="text-xs text-[#93A8C8] mt-1">
                    {selectedLead.statusSummary} · Next: {selectedLead.nextActionLabel}
                  </div>
                  {selectedLead.studentNames?.length > 0 && (
                    <div className="text-xs text-[#CBD5E1] mt-1 flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-[#D8B979]" />
                      Student(s): {selectedLead.studentNames.join(", ")}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateCall({ leadId: null, leadData: null })}
                    className="border-[#1E335C] bg-[#05102B] text-slate-300 hover:text-white text-xs h-8"
                  >
                    Switch Lead
                  </Button>
                  <Button
                    size="sm"
                    data-testid="open-existing-lead-in-lead-center-btn"
                    onClick={() => handleOpenLeadInLeadCenter(selectedLead)}
                    className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-xs h-8 gap-1.5"
                  >
                    Go to Lead Center
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#16284C] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  value={callNoteForLead}
                  onChange={(e) => setCallNoteForLead(e.target.value)}
                  placeholder="Optional call note to preserve in shared family history..."
                  className="bg-[#05102B] border-[#1E335C] text-white text-xs h-8 flex-1"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={leadSearchTerm}
                  onChange={(e) => setLeadSearchTerm(e.target.value)}
                  placeholder="Search leads by parent name, student name, phone, or email..."
                  className="pl-9.5 bg-[#030A1C] border-[#1E335C] text-white placeholder:text-slate-500 rounded-xl text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {leadsLoading ? (
                  <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                    Loading family leads...
                  </div>
                ) : matchingLeads.length === 0 ? (
                  <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                    No matching leads found. Choose New Service Inquiry to create one.
                  </div>
                ) : (
                  matchingLeads.map((l: any) => (
                    <div
                      key={l.id}
                      onClick={() => handlePickLead(l)}
                      className="p-3 rounded-xl border border-[#182B52] hover:border-[#D8B979] bg-[#030A1C] transition-all cursor-pointer text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold truncate text-white">
                            {l.parentName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0C204B] text-[#D8B979] border border-[#243B67]">
                            {l.stageLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8DA2C4] truncate mt-0.5">
                          {l.statusSummary}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLeadInLeadCenter(l);
                        }}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#0C204B] text-[#D8B979] border border-[#28447A] hover:border-[#D8B979]"
                      >
                        Open in Lead Center
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Sub-Panel: If Existing Client is selected */}
      {(call.callerCategory === "client" ||
        call.callerCategory === "existing_client") && (
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
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 px-3.5 rounded-xl gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Client Workspace
              </Button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by parent name, student name, phone, or email..."
              className="pl-9.5 bg-[#040D1A] border-slate-700 text-white placeholder:text-slate-500 rounded-xl text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {contactsLoading ? (
              <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                Loading client records...
              </div>
            ) : matchingContacts.length === 0 ? (
              <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                No matching client found.
              </div>
            ) : (
              matchingContacts.map((c: any) => {
                const fullName =
                  `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
                  c.name ||
                  "Contact";
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
        </div>
      )}

      {/* Sub-Panel: If Other Contact is selected */}
      {(call.callerCategory === "other" ||
        call.callerCategory === "other_contact" ||
        showOtherRoles) && (
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
                      ? "bg-purple-500 text-white border-purple-400"
                      : "bg-[#061830] border-slate-700 text-slate-300 hover:border-purple-400/50 hover:text-white"
                  }`}
                >
                  {role}
                </button>
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
    </div>
  );
}

export default CallerIdentitySelector;
