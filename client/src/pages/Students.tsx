import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, ChevronLeft, ArrowUpDown, User } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/PhoneInput";
import { validatePhone, formatPhone } from "@/lib/phone";

const PLACEHOLDER_STAGES = [
  { label: "Intake", count: 0 },
  { label: "Discovery", count: 0 },
  { label: "Records Review", count: 0 },
  { label: "School Contact", count: 0 },
  { label: "1st IEP Scheduled", count: 0 },
  { label: "IEP Active", count: 0 },
  { label: "Monitoring", count: 0 },
  { label: "Closed", count: 0 },
];

export default function Students() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
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
  const parents = (contacts ?? []).filter((c) => c.jobTitle !== "Student");
  // Quick lookup: parentContactId → { name, id }
  const parentMap = new Map<number, { name: string; id: number }>();
  parents.forEach((p) => parentMap.set(p.id, { name: `${p.firstName} ${p.lastName}`, id: p.id }));

  // Filter to student contacts (jobTitle === "Student") or show all if none tagged
  const allContacts = contacts ?? [];
  const students = allContacts.filter((c) => c.jobTitle === "Student");
  const displayList = students.length > 0 ? students : allContacts;

  const sorted = [...displayList].sort((a, b) => {
    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
    return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });

  const totalAll = displayList.length;

  const scrollPipeline = (dir: "left" | "right") => {
    if (pipelineRef.current) {
      pipelineRef.current.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Students</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm hover:shadow-md">
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
                  <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Woolbert" required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold">Last Name *</label>
                  <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Sheep" required />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold">Family Name</label>
                <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Sheep Family" />
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
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="parent@email.com" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold">Phone</label>
                <PhoneInput value={formData.phone} onChange={(val) => setFormData({ ...formData, phone: val })} />
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full bg-accent text-accent-foreground font-semibold">
                {createMutation.isPending ? "Adding..." : "Add Student"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline bar — placeholder */}
      <div className="px-8 pb-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
          <span>IEP Pipeline</span>
          <span className="ml-1 text-muted-foreground/50">(coming soon)</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => scrollPipeline("left")} className="p-1 rounded hover:bg-muted text-muted-foreground flex-shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div ref={pipelineRef} className="flex gap-2 overflow-x-auto scrollbar-none flex-1 pb-1">
            {/* All pill */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg border-2 border-foreground bg-foreground text-background px-4 py-2 min-w-[64px] cursor-pointer">
              <span className="text-xl font-bold leading-none">{totalAll}</span>
              <span className="text-xs mt-0.5">All</span>
            </div>
            {PLACEHOLDER_STAGES.map((stage) => (
              <div
                key={stage.label}
                className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg border border-border bg-card px-4 py-2 min-w-[80px] cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <span className="text-xl font-bold leading-none text-muted-foreground">{stage.count}</span>
                <span className="text-xs mt-0.5 text-muted-foreground text-center leading-tight">{stage.label}</span>
              </div>
            ))}
          </div>
          <button onClick={() => scrollPipeline("right")} className="p-1 rounded hover:bg-muted text-muted-foreground flex-shrink-0">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-8 pb-8 flex-1 overflow-auto">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Table header */}
          <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            {displayList.length} {displayList.length === 1 ? "student" : "students"}
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
                    className="inline-flex items-center gap-1 hover:text-accent transition-colors"
                  >
                    Name <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden md:table-cell">Family / Parent</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden lg:table-cell">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden xl:table-cell">Last Updated</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden xl:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Loading students...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No students yet. Click <strong>Add Student</strong> to get started.
                  </td>
                </tr>
              ) : (
                sorted.map((contact) => (
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
                        <span className="font-semibold text-foreground group-hover:text-accent transition-colors">
                          {contact.firstName} {contact.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                      {contact.parentContactId && parentMap.has(contact.parentContactId) ? (
                        <button
                          onClick={() => setLocation(`/contacts/${contact.parentContactId}`)}
                          className="flex items-center gap-1.5 group/parent"
                          title="Go to parent contact"
                        >
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            {parentMap.get(contact.parentContactId)!.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-foreground group-hover/parent:text-emerald-600 dark:group-hover/parent:text-emerald-400 transition-colors font-medium">
                            {parentMap.get(contact.parentContactId)!.name}
                          </span>
                        </button>
                      ) : contact.company ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="h-3.5 w-3.5 flex-shrink-0" />
                          {contact.company}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {contact.jobTitle || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell text-xs">
                      {new Date(contact.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-semibold">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
