import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import QuickSetupModal from "@/components/QuickSetupModal";
import { LeadCenterHeader } from "@/components/leads/LeadCenterHeader";
import { DiscoveryCallsSection } from "@/components/leads/DiscoveryCallsSection";
import { LeadPipelineColumn } from "@/components/leads/LeadPipelineColumn";
import { LeadModal } from "@/components/leads/LeadModal";
import {
  LEAD_STATUSES,
  emptyForm,
  parseDiscoveryDateTime,
  resolveDiscoveryCallLocation,
  type LeadStatus,
  type LeadFormData,
  type DiscoveryCallItem,
} from "@/components/leads/types";
import {
  getTimeInZone,
  getCallingStatus,
  getTimeDifferenceHours,
  formatTimeDifferenceText,
} from "@shared/timezones";

export default function Leads() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<LeadFormData>(emptyForm);

  const { data: leads, isLoading, refetch } = trpc.leads.list.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
    }
  );

  const { data: appointments = [] } = trpc.appointments.list.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
    }
  );

  const { data: contacts = [] } = trpc.contacts.list.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
    }
  );

  const createMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead created successfully");
      refetch();
      setOpen(false);
      setFormData(emptyForm);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create lead");
    },
  });

  const updateMutation = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Lead updated successfully");
      refetch();
      setOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update lead");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalDiscoveryDate: Date | undefined = undefined;
    if (formData.discoveryCallDate) {
      const [yearStr, monthStr, dayStr] = formData.discoveryCallDate.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);

      let hours = 10;
      let minutes = 0;
      if (formData.discoveryCallTime) {
        const [hStr, mStr] = formData.discoveryCallTime.split(":");
        hours = parseInt(hStr, 10) || 0;
        minutes = parseInt(mStr, 10) || 0;
      }
      finalDiscoveryDate = new Date(year, month, day, hours, minutes, 0, 0);
    }

    const editingLead = editingId ? (leads || []).find((l: any) => l.id === editingId) : null;
    const payload = {
      contactId: editingLead?.contactId,
      source: formData.source || undefined,
      value: formData.value || undefined,
      status: formData.status,
      notes: formData.notes || undefined,
      parentName: formData.parentName || undefined,
      parentPhone: formData.parentPhone || undefined,
      studentName: formData.studentName || undefined,
      studentAge: formData.studentAge ? parseInt(formData.studentAge) : undefined,
      studentGrade: formData.studentGrade || undefined,
      discoveryCallDate: finalDiscoveryDate,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (lead: any) => {
    setEditingId(lead.id);

    let dateStr = "";
    let timeStr = "";

    if (lead.discoveryCallDate) {
      const parsed = parseDiscoveryDateTime(lead.discoveryCallDate);
      dateStr = parsed.isoDateStr;
      timeStr = parsed.timeStr;

      // If time isn't explicitly set on lead.discoveryCallDate, check if there's a matching appointment with a start time
      if (!timeStr) {
        const matchingApt = (appointments as any[]).find((apt) => {
          if (!apt.startTime) return false;
          const aptD = new Date(apt.startTime);
          const isSameDay =
            aptD.getFullYear() === parsed.dateObj.getFullYear() &&
            aptD.getMonth() === parsed.dateObj.getMonth() &&
            aptD.getDate() === parsed.dateObj.getDate();
          const matchesContact = lead.contactId && apt.clientId === lead.contactId;
          const matchesParent =
            lead.parentName &&
            apt.parentName &&
            apt.parentName.toLowerCase().includes(lead.parentName.toLowerCase());
          const matchesStudent =
            lead.studentName &&
            apt.studentName &&
            apt.studentName.toLowerCase().includes(lead.studentName.toLowerCase());
          return isSameDay && (matchesContact || matchesParent || matchesStudent);
        });

        if (matchingApt?.startTime) {
          const aptD = new Date(matchingApt.startTime);
          timeStr = `${String(aptD.getHours()).padStart(2, "0")}:${String(aptD.getMinutes()).padStart(2, "0")}`;
        }
      }
    }

    // Hydrate missing fields from contacts if lead was linked to a contact
    let parentName = lead.parentName || "";
    let parentPhone = lead.parentPhone || "";
    let studentName = lead.studentName || "";
    let studentAge = lead.studentAge?.toString() || "";
    let studentGrade = lead.studentGrade || "";

    if (lead.contactId && contacts) {
      const contact = (contacts as any[]).find((c: any) => c.id === lead.contactId);
      if (contact) {
        if (!parentName) {
          parentName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
        }
        if (!parentPhone) {
          parentPhone = contact.phone || "";
        }
      }
      const studentContact = (contacts as any[]).find(
        (c: any) => c.parentContactId === lead.contactId || (c.id === lead.contactId && c.parentContactId)
      );
      if (studentContact) {
        if (!studentName) {
          studentName = `${studentContact.firstName || ""} ${studentContact.lastName || ""}`.trim();
        }
        if (!studentGrade) {
          studentGrade = studentContact.gradeLevel || "";
        }
      }
    }

    if (!studentName && lead.notes) {
      const match = lead.notes.match(/Student:\s*([^.\n,]+)/i);
      if (match && match[1]) {
        studentName = match[1].trim();
      }
    }

    setFormData({
      source: lead.source || "",
      value: (lead.value || 0).toString(),
      status: lead.status,
      notes: lead.notes || "",
      parentName,
      parentPhone,
      studentName,
      studentAge,
      studentGrade,
      discoveryCallDate: dateStr,
      discoveryCallTime: timeStr,
    });
    setOpen(true);
  };

  // Group leads by status
  const leadsByStatus = useMemo(() => {
    return LEAD_STATUSES.reduce(
      (acc, status) => {
        acc[status] = leads?.filter((l) => l.status === status) || [];
        return acc;
      },
      {} as Record<LeadStatus, any[]>
    );
  }, [leads]);

  // Unified Discovery Calls Processing
  const allDiscoveryCalls = useMemo(() => {
    const list: DiscoveryCallItem[] = [];
    const seenLeadIds = new Set<number>();
    const now = new Date();

    // 1. Process Leads with discoveryCallDate
    (leads || []).forEach((lead) => {
      if (lead.discoveryCallDate) {
        const parsed = parseDiscoveryDateTime(lead.discoveryCallDate);
        if (!isNaN(parsed.dateObj.getTime())) {
          seenLeadIds.add(lead.id);

          const matchingApt = (appointments as any[]).find((apt) => {
            if (!apt.startTime) return false;
            const aptD = new Date(apt.startTime);
            const isSameDay =
              aptD.getFullYear() === parsed.dateObj.getFullYear() &&
              aptD.getMonth() === parsed.dateObj.getMonth() &&
              aptD.getDate() === parsed.dateObj.getDate();
            const matchesContact = lead.contactId && apt.clientId === lead.contactId;
            const matchesParent =
              lead.parentName &&
              apt.parentName &&
              apt.parentName.toLowerCase().includes(lead.parentName.toLowerCase());
            const matchesStudent =
              lead.studentName &&
              apt.studentName &&
              apt.studentName.toLowerCase().includes(lead.studentName.toLowerCase());
            return isSameDay && (matchesContact || matchesParent || matchesStudent);
          });

          const effectiveDate = matchingApt?.startTime ? new Date(matchingApt.startTime) : parsed.dateObj;
          const hasSpecificTime = matchingApt?.startTime || parsed.hasSpecificTime;

          const timeDisplay = hasSpecificTime
            ? effectiveDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : "Time TBD";

          const dateDisplay = effectiveDate.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          });

          let resolvedParent = lead.parentName;
          let resolvedPhone = lead.parentPhone;
          let resolvedStudent = lead.studentName;
          let resolvedAge = lead.studentAge;
          let resolvedGrade = lead.studentGrade;
          let matchedContact: any = null;

          if (lead.contactId && contacts) {
            matchedContact = (contacts as any[]).find((x: any) => x.id === lead.contactId);
            if (matchedContact) {
              if (!resolvedParent) {
                resolvedParent = `${matchedContact.firstName || ""} ${matchedContact.lastName || ""}`.trim() || undefined;
              }
              resolvedPhone = resolvedPhone || matchedContact.phone || undefined;
            }
          }
          if (!resolvedStudent && lead.contactId && contacts) {
            const sc = (contacts as any[]).find(
              (x: any) => x.parentContactId === lead.contactId || (x.id === lead.contactId && x.parentContactId)
            );
            if (sc) {
              resolvedStudent = `${sc.firstName || ""} ${sc.lastName || ""}`.trim() || undefined;
              resolvedGrade = resolvedGrade || sc.gradeLevel || undefined;
            }
          }
          if (!resolvedStudent && lead.notes) {
            const match = lead.notes.match(/Student:\s*([^.\n,]+)/i);
            if (match && match[1]) {
              resolvedStudent = match[1].trim();
            }
          }

          const loc = resolveDiscoveryCallLocation(matchedContact, resolvedPhone, lead.notes);
          const clientTimeInfo = getTimeInZone(loc.timeZone, now);
          const callingStatus = getCallingStatus(loc.timeZone, {}, now);
          const diffHours = getTimeDifferenceHours(loc.timeZone, "America/New_York", now);
          const diffText = formatTimeDifferenceText(diffHours);

          list.push({
            id: `lead-${lead.id}`,
            leadId: lead.id,
            lead,
            parentName: resolvedParent || "Prospective Family",
            parentPhone: resolvedPhone,
            studentName: resolvedStudent,
            studentAge: resolvedAge,
            studentGrade: resolvedGrade,
            inquiryReason: lead.notes || (lead.source ? `Source: ${lead.source}` : undefined),
            date: effectiveDate,
            timeDisplay,
            dateDisplay,
            timeZone: loc.timeZone,
            city: loc.city,
            state: loc.state,
            friendlyTz: loc.friendlyTz,
            clientTimeInfo,
            callingStatus,
            diffHours,
            diffText,
          });
        }
      }
    });

    // 2. Process Appointments marked as Discovery Call that aren't already included
    (appointments as any[]).forEach((apt) => {
      const isDiscovery =
        apt.title?.toLowerCase().includes("discovery") ||
        apt.meetingType?.toLowerCase().includes("discovery");

      if (isDiscovery && apt.startTime) {
        const aptD = new Date(apt.startTime);
        if (!isNaN(aptD.getTime())) {
          const matchingLead = (leads || []).find((l) => {
            const matchesId = l.contactId && apt.clientId === l.contactId;
            const matchesParent =
              l.parentName &&
              apt.parentName &&
              apt.parentName.toLowerCase().includes(l.parentName.toLowerCase());
            const matchesStudent =
              l.studentName &&
              apt.studentName &&
              apt.studentName.toLowerCase().includes(l.studentName.toLowerCase());
            return matchesId || matchesParent || matchesStudent;
          });

          if (matchingLead && seenLeadIds.has(matchingLead.id)) {
            return;
          }

          if (matchingLead) {
            seenLeadIds.add(matchingLead.id);
          }

          const timeDisplay = aptD.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
          const dateDisplay = aptD.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          });

          let matchedContact: any = null;
          if (apt.clientId && contacts) {
            matchedContact = (contacts as any[]).find((c: any) => c.id === apt.clientId);
          } else if (matchingLead?.contactId && contacts) {
            matchedContact = (contacts as any[]).find((c: any) => c.id === matchingLead.contactId);
          }

          const resolvedPhone = apt.parentPhone || matchingLead?.parentPhone;
          const loc = resolveDiscoveryCallLocation(matchedContact, resolvedPhone, apt.description || matchingLead?.notes);
          const clientTimeInfo = getTimeInZone(loc.timeZone, now);
          const callingStatus = getCallingStatus(loc.timeZone, {}, now);
          const diffHours = getTimeDifferenceHours(loc.timeZone, "America/New_York", now);
          const diffText = formatTimeDifferenceText(diffHours);

          list.push({
            id: `apt-${apt.id}`,
            leadId: matchingLead?.id,
            lead: matchingLead || null,
            parentName: apt.parentName || matchingLead?.parentName || "Prospective Family",
            parentPhone: resolvedPhone,
            studentName: apt.studentName || matchingLead?.studentName,
            studentAge: matchingLead?.studentAge,
            studentGrade: matchingLead?.studentGrade,
            inquiryReason:
              apt.description || matchingLead?.notes || (apt.title ? `Title: ${apt.title}` : undefined),
            date: aptD,
            timeDisplay,
            dateDisplay,
            timeZone: loc.timeZone,
            city: loc.city,
            state: loc.state,
            friendlyTz: loc.friendlyTz,
            clientTimeInfo,
            callingStatus,
            diffHours,
            diffText,
          });
        }
      }
    });

    return list;
  }, [leads, appointments, contacts]);

  const { todaysCalls, upcomingCalls } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const todayList = allDiscoveryCalls
      .filter((c) => c.date >= todayStart && c.date <= todayEnd)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const upcomingList = allDiscoveryCalls
      .filter((c) => c.date > todayEnd)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return { todaysCalls: todayList, upcomingCalls: upcomingList };
  }, [allDiscoveryCalls]);

  const handleOpenRecord = (call: DiscoveryCallItem) => {
    if (call.lead) {
      handleEdit(call.lead);
    } else {
      const matched = (leads || []).find((l: any) =>
        (call.leadId && l.id === call.leadId) ||
        (call.studentName && l.studentName && l.studentName.toLowerCase().includes(call.studentName.toLowerCase())) ||
        (call.parentName && l.parentName && l.parentName.toLowerCase().includes(call.parentName.toLowerCase()))
      );
      if (matched) {
        handleEdit(matched);
      } else {
        setEditingId(null);
        setFormData({
          ...emptyForm,
          parentName: call.parentName && !call.parentName.includes("Prospective") ? call.parentName : "",
          parentPhone: call.parentPhone || "",
          studentName: call.studentName || "",
          studentAge: call.studentAge ? String(call.studentAge) : "",
          studentGrade: call.studentGrade || "",
          discoveryCallDate: call.date ? `${call.date.getFullYear()}-${String(call.date.getMonth() + 1).padStart(2, "0")}-${String(call.date.getDate()).padStart(2, "0")}` : "",
          discoveryCallTime: call.date ? `${String(call.date.getHours()).padStart(2, "0")}:${String(call.date.getMinutes()).padStart(2, "0")}` : "",
        });
        setOpen(true);
      }
    }
  };

  return (
    <ScopedErrorBoundary moduleName="Lead Center">
      <div
        className="space-y-6 p-4 sm:p-6 lg:p-8 min-h-screen text-slate-100 relative overflow-x-hidden"
        style={{
          backgroundColor: "#07162B",
          backgroundImage: "radial-gradient(ellipse at 50% 0%, #102B4E 0%, #07162B 55%, #030D1A 100%)",
        }}
      >
        {/* Header */}
        <LeadCenterHeader
          onManageForms={() => setLocation("/leads/forms")}
          onViewDiscoveryProcess={() => setLocation("/leads/0/discovery")}
          onQuickSetup={() => setQuickSetupOpen(true)}
          onAddLead={() => {
            setEditingId(null);
            setFormData(emptyForm);
            setOpen(true);
          }}
        />

        {/* Sections 1 & 2: Today's and Upcoming Discovery Calls */}
        <DiscoveryCallsSection
          todaysCalls={todaysCalls}
          upcomingCalls={upcomingCalls}
          onOpenRecord={handleOpenRecord}
          onStartCall={(leadId) => setLocation(`/call-center?type=discovery&leadId=${leadId}`)}
        />

        {/* Clear Visual Maritime Brass Divider */}
        <div className="border-t border-[#3A2C18] my-3" />

        {/* Section 3: Discovery Pipeline */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#FFF4D4]">
              Discovery Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-[#C6B697] mt-0.5">
              Track families through your discovery stages, consultation milestones, and client enrollment.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-[#3A2C18] bg-[#05142B]/50 p-12">
              <Loader2 className="size-6 animate-spin text-[#FFE394]" />
            </div>
          ) : (
            <div className="flex items-start gap-4 overflow-x-auto pb-6 pt-1 select-none min-h-[calc(100vh-220px)] no-scrollbar">
              {LEAD_STATUSES.map((status) => (
                <LeadPipelineColumn
                  key={status}
                  status={status}
                  leads={leadsByStatus[status]}
                  onEdit={handleEdit}
                  onBeginCall={(leadId) => setLocation(`/call-center?type=discovery&leadId=${leadId}`)}
                  onViewContact={(contactId) => setLocation(`/contacts/${contactId}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Lead Modal */}
        <LeadModal
          open={open}
          onOpenChange={setOpen}
          editingId={editingId}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
        />

        {/* Quick Setup Modal */}
        <QuickSetupModal open={quickSetupOpen} onClose={() => setQuickSetupOpen(false)} />
      </div>
    </ScopedErrorBoundary>
  );
}
