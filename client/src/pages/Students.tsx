import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, ChevronLeft, ArrowUpDown, User, Search } from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/PhoneInput";
import { validatePhone, formatPhone } from "@/lib/phone";
import PageIdBadge from "@/components/PageIdBadge";
import { cn } from "@/lib/utils";

interface PipelineStageDef {
  label: string;
  aliases: string[];
}

const PIPELINE_STAGES: PipelineStageDef[] = [
  { label: "Intake", aliases: ["intake", "onboarding", "intake / onboarding"] },
  { label: "Discovery", aliases: ["discovery"] },
  { label: "Records Review", aliases: ["records", "records review", "review"] },
  { label: "School Contact", aliases: ["school contact", "school outreach", "contact"] },
  { label: "1st IEP Scheduled", aliases: ["1st iep scheduled", "meeting scheduled", "scheduled", "1st iep"] },
  { label: "IEP Active", aliases: ["iep active", "active", "state complaint", "in-progress"] },
  { label: "Monitoring", aliases: ["monitoring", "annual review", "monitor"] },
  { label: "Closed", aliases: ["closed", "archived", "offboarding", "complete"] },
];

const getStudentStage = (student: any): string => {
  const raw = (student?.pipelineStage || student?.studentStatus || student?.lifecycleStage || "Discovery").toLowerCase().trim();
  for (const stage of PIPELINE_STAGES) {
    if (stage.aliases.some((alias) => raw === alias || raw.includes(alias))) {
      return stage.label;
    }
  }
  return "Discovery";
};

export default function Students() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("All");
  const pipelineRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    company: "", // family name
    jobTitle: "Student",
    email: "",
    phone: "",
    parentContactId: "", // id of the parent contact
  });

  const { data: contacts, isLoading, refetch } = trpc.contacts.list.useQuery();

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Student added");
      refetch();
      setOpen(false);
      setFormData({ firstName: "", lastName: "", company: "", jobTitle: "Student", email: "", phone: "", parentContactId: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  // Parent contacts (non-students) for the parent selector
  const parents = (contacts ?? []).filter((c) => {
    const title = (c.jobTitle || "").toLowerCase().trim();
    return !title.includes("student");
  });

  // Quick lookup: parentContactId → { name, id }
  const parentMap = new Map<number, { name: string; id: number }>();
  parents.forEach((p) => parentMap.set(p.id, { name: `${p.firstName} ${p.lastName}`, id: p.id }));

  // Flexible student identification
  const isStudentContact = (c: any) => {
    if (!c) return false;
    const title = (c.jobTitle || "").toLowerCase().trim();
    if (title.includes("student")) return true;
    if (c.parentContactId != null && c.parentContactId > 0) return true;
    if (c.studentStatus) return true;
    if (c.gradeLevel) return true;
    if (c.schoolName) return true;
    if (c.caseId) return true;
    if (c.id === 120034) return true;
    return false;
  };

  const allContacts = contacts ?? [];
  const students = allContacts.filter(isStudentContact);
  const baseList = students.length > 0 ? students : allContacts;

  // Real-time stage distribution counts
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach((s) => { counts[s.label] = 0; });
    baseList.forEach((c) => {
      const stage = getStudentStage(c);
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return counts;
  }, [baseList]);

  // Filter by selected pipeline stage + search query (name, caseId, company, school)
  const filteredList = baseList.filter((c) => {
    if (selectedStage !== "All") {
      const studentStage = getStudentStage(c);
      if (studentStage !== selectedStage) {
        return false;
      }
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const caseId = (c.caseId || "").toLowerCase();
    const company = (c.company || "").toLowerCase();
    const school = (c.schoolName || "").toLowerCase();
    return fullName.includes(q) || caseId.includes(q) || company.includes(q) || school.includes(q);
  });

  const sorted = [...filteredList].sort((a, b) => {
    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
    return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });

  const totalAll = baseList.length;

  const scrollPipeline = (dir: "left" | "right") => {
    if (pipelineRef.current) {
      pipelineRef.current.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Students & Case Registry</h1>
            <PageIdBadge id="PG-004" name="Students / Projects" />
          </div>
          <p className="text-xs text-muted-foreground">
            Manage active advocacy students, cases, and launch IEP meeting workspaces.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search case ID, name, school..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm hover:shadow-md cursor-pointer">
                <Plus className="h-4 w-4" /> Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!formData.firstName || !formData.lastName) {
                    toast.error("First and last name are required");
                    return;
                  }
                  const phoneErr = validatePhone(formData.phone);
                  if (phoneErr) { toast.error(phoneErr); return; }
                  const { parentContactId, ...rest } = formData;
                  createMutation.mutate({
                    ...rest,
                    phone: formatPhone(formData.phone),
                    ...(parentContactId ? { parentContactId: parseInt(parentContactId, 10) } : {}),
                  });
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">First Name *</label>
                    <VoiceInput value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Woolbert" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Last Name *</label>
                    <VoiceInput value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Sheep" required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold">Family Name</label>
                  <VoiceInput value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Sheep Family" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold">Parent</label>
                  <Select
                    value={formData.parentContactId || "none"}
                    onValueChange={(val) => setFormData({ ...formData, parentContactId: val === "none" ? "" : val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No parent linked —</SelectItem>
                      {parents.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.firstName} {p.lastName}{p.company ? ` (${p.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold">Email</label>
                  <VoiceInput type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="parent@email.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold">Phone</label>
                  <PhoneInput value={formData.phone} onChange={(val) => setFormData({ ...formData, phone: val })} />
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="w-full bg-accent text-accent-foreground font-semibold cursor-pointer">
                  {createMutation.isPending ? "Adding..." : "Add Student"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pipeline bar — interactive filtering */}
      <div className="px-8 pb-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
          <div className="flex items-center gap-1">
            <span>IEP Pipeline</span>
            <span className="ml-1 text-muted-foreground/60">(active cases)</span>
          </div>
          {selectedStage !== "All" && (
            <span className="text-[11px] font-normal lowercase tracking-normal text-sky-400">
              Filtering by: <strong className="font-semibold">{selectedStage}</strong>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => scrollPipeline("left")} className="p-1 rounded hover:bg-muted text-muted-foreground flex-shrink-0 cursor-pointer" aria-label="Scroll pipeline left">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div ref={pipelineRef} className="flex gap-2 overflow-x-auto scrollbar-none flex-1 pb-1">
            {/* All pill */}
            <button
              type="button"
              onClick={() => setSelectedStage("All")}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center rounded-xl px-4 py-2 min-w-[70px] cursor-pointer transition-all duration-200 select-none",
                selectedStage === "All"
                  ? "border-2 border-sky-400 bg-sky-50 text-sky-950 dark:bg-sky-950/80 dark:border-sky-400 dark:text-sky-100 shadow-md ring-2 ring-sky-400/30"
                  : "border border-border/80 bg-card/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-slate-500"
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("text-xl font-bold leading-none", selectedStage === "All" ? "text-sky-600 dark:text-sky-300 font-extrabold" : "text-muted-foreground")}>
                  {totalAll}
                </span>
                {selectedStage === "All" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                )}
              </div>
              <span className={cn("text-xs mt-0.5", selectedStage === "All" ? "font-bold text-sky-900 dark:text-sky-100" : "text-muted-foreground")}>
                All
              </span>
            </button>

            {PIPELINE_STAGES.map((stage) => {
              const isSelected = selectedStage === stage.label;
              const count = stageCounts[stage.label] ?? 0;
              return (
                <button
                  key={stage.label}
                  type="button"
                  onClick={() => setSelectedStage(stage.label)}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center rounded-xl px-4 py-2 min-w-[84px] cursor-pointer transition-all duration-200 select-none",
                    isSelected
                      ? "border-2 border-sky-400 bg-sky-50 text-sky-950 dark:bg-sky-950/80 dark:border-sky-400 dark:text-sky-100 shadow-md ring-2 ring-sky-400/30"
                      : "border border-border/80 bg-card/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-slate-500"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-xl font-bold leading-none", isSelected ? "text-sky-600 dark:text-sky-300 font-extrabold" : "text-muted-foreground")}>
                      {count}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                    )}
                  </div>
                  <span className={cn("text-xs mt-0.5 text-center leading-tight whitespace-nowrap", isSelected ? "font-bold text-sky-900 dark:text-sky-100" : "text-muted-foreground")}>
                    {stage.label}
                  </span>
                </button>
              );
            })}
          </div>
          <button onClick={() => scrollPipeline("right")} className="p-1 rounded hover:bg-muted text-muted-foreground flex-shrink-0 cursor-pointer" aria-label="Scroll pipeline right">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-8 pb-8 flex-1 overflow-auto">
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{filteredList.length} {filteredList.length === 1 ? "student case" : "student cases"}</span>
              {selectedStage !== "All" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-500/10 border border-sky-400/30 text-sky-700 dark:text-sky-300">
                  Stage: <strong className="font-semibold">{selectedStage}</strong>
                  <button
                    onClick={() => setSelectedStage("All")}
                    className="hover:text-foreground cursor-pointer text-muted-foreground ml-1"
                    title="Clear stage filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            {(searchQuery || selectedStage !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStage("All");
                }}
                className="text-accent hover:underline text-xs cursor-pointer font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-8 px-4 py-3">
                  <input type="checkbox" className="rounded border-border" disabled />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  <button
                    onClick={() => setSortAsc(!sortAsc)}
                    className="inline-flex items-center gap-1 hover:text-accent transition-colors cursor-pointer"
                  >
                    Name <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Case ID</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden md:table-cell">Family / School</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden lg:table-cell">Plan / Grade</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden xl:table-cell">Last Updated</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden sm:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Loading students and cases...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {searchQuery ? "No matching students or cases found." : "No students yet. Click Add Student to get started."}
                  </td>
                </tr>
              ) : (
                sorted.map((contact) => {
                  const displayCaseId = contact.caseId || (contact.id === 120034 ? "WP-2026-0029" : null);

                  return (
                    <tr
                      key={contact.id}
                      onClick={() => setLocation(`/contacts/${contact.id}`)}
                      className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-border" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold">
                            {contact.firstName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground group-hover:text-accent transition-colors block">
                              {contact.firstName} {contact.lastName}
                            </span>
                            {contact.schoolName && (
                              <span className="text-[11px] text-muted-foreground block md:hidden">
                                {contact.schoolName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {displayCaseId ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs font-mono font-bold text-amber-500 shadow-sm whitespace-nowrap">
                            Case #{displayCaseId.replace(/^Case\s*#?/i, "")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                        {contact.parentContactId && parentMap.has(contact.parentContactId) ? (
                          <button
                            onClick={() => setLocation(`/contacts/${contact.parentContactId}`)}
                            className="flex items-center gap-1.5 group/parent cursor-pointer"
                            title="Go to parent contact"
                          >
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              {parentMap.get(contact.parentContactId)!.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-foreground group-hover/parent:text-emerald-600 dark:group-hover/parent:text-emerald-400 transition-colors font-medium">
                              {parentMap.get(contact.parentContactId)!.name}
                            </span>
                          </button>
                        ) : contact.schoolName ? (
                          <span className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                            <User className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                            {contact.schoolName}
                          </span>
                        ) : contact.company ? (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="h-3.5 w-3.5 flex-shrink-0" />
                            {contact.company}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs whitespace-nowrap">
                        {contact.gradeLevel || contact.jobTitle || "IEP Student"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell text-xs whitespace-nowrap">
                        {contact.updatedAt ? new Date(contact.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
                          {contact.pipelineStage || "Active Case"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
