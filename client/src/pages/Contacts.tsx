import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Loader2, Mail, Phone, ExternalLink, Compass, Search, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { PhoneInput } from "@/components/PhoneInput";
import { validatePhone, formatPhone } from "@/lib/phone";
import ClientCallControls from "@/components/quo/ClientCallControls";
import PageIdBadge from "@/components/PageIdBadge";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";

export default function Contacts() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
  });

  const { data: contacts, isLoading, refetch } = trpc.contacts.list.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
    }
  );

  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    const base = contacts.filter((c: any) => c.jobTitle !== "Student");
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    return base.filter((c: any) => {
      const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const company = (c.company || "").toLowerCase();
      const jobTitle = (c.jobTitle || "").toLowerCase();
      return (
        fullName.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        company.includes(q) ||
        jobTitle.includes(q)
      );
    });
  }, [contacts, searchQuery]);

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Contact created successfully");
      refetch();
      setOpen(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        jobTitle: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create contact");
    },
  });

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Contact updated successfully");
      refetch();
      setOpen(false);
      setEditingId(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        jobTitle: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update contact");
    },
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success("Contact deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete contact");
    },
  });

  const resendPortalLinkMutation = trpc.portalProvisioning.resendPortalLink.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Invitation link sent successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resend portal link");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      toast.error("First and last name are required");
      return;
    }
    const phoneErr = validatePhone(formData.phone);
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }
    // Auto-format phone before saving
    const data = { ...formData, phone: formatPhone(formData.phone) };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (contact: any) => {
    setEditingId(contact.id);
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
      jobTitle: contact.jobTitle || "",
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <ScopedErrorBoundary moduleName="Contacts">
      <div className="min-h-full bg-[#020712] text-[#F0DFC5] flex flex-col">
        {/* ─── Top Full-Bleed Photographic Header Banner ─── */}
        {/* Desktop & Tablet View (Exact 1024:139 photographic header from mockup) */}
        <div className="hidden md:block w-full border-b border-[#8A6731]/40 shadow-[0_12px_36px_rgba(0,0,0,0.95)] overflow-hidden bg-[#020B18]">
          <div
            className="w-full relative aspect-[1024/139] max-w-[1440px] mx-auto bg-no-repeat bg-[length:100%_100%] select-none"
            style={{ backgroundImage: "url('/decor/contacts-header-bg.png')" }}
          >
            {/* Live Interactive Search Pill Input directly over the search bar area (DO NOT ADD FILTERS BUTTON) */}
            <div className="absolute left-[10.25%] top-[60.4%] w-[46.88%] h-[31.65%] flex items-center">
              <div className="relative w-full h-full flex items-center">
                <Search className="absolute left-3.5 sm:left-4 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#7E97B8] pointer-events-none z-10" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find a person, school, district, organization..."
                  className="w-full h-full pl-9 sm:pl-10 pr-8 sm:pr-9 rounded-full bg-[#030917]/95 border border-[#1e3250] text-xs sm:text-sm lg:text-[14px] text-[#F0F6FC] placeholder:text-[#647C9D] focus:outline-none focus:border-[#4B70A6] focus:ring-1 focus:ring-[#4B70A6]/40 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] cursor-text select-text"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 p-1 rounded-full hover:bg-white/10 text-[#7E97B8] hover:text-white transition-colors cursor-pointer z-10"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View (< md) */}
        <div
          className="md:hidden w-full relative border-b border-[#8A6731]/40 shadow-[0_8px_24px_rgba(0,0,0,0.9)] overflow-hidden bg-[#020B18] bg-no-repeat bg-cover bg-right px-4 py-5"
          style={{ backgroundImage: "url('/decor/contacts-header-bg.png')" }}
        >
          <div className="relative z-10 flex flex-col gap-3">
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#F5DCB0] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                Contacts
              </h1>
              <p className="font-serif text-xs text-[#D8B478] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] mt-0.5">
                Everyone connected to Waypoint.
              </p>
            </div>
            <div className="relative flex items-center w-full">
              <Search className="absolute left-3.5 h-4 w-4 text-[#7E97B8] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a person, school, district, organization..."
                className="w-full h-10 pl-9.5 pr-8 rounded-full bg-[#030917]/95 border border-[#1e3250] text-xs text-[#F0F6FC] placeholder:text-[#647C9D] focus:outline-none focus:border-[#4B70A6] focus:ring-1 focus:ring-[#4B70A6]/40 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 p-1 text-[#7E97B8] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Directory Status & Control Strip ─── */}
        <div className="w-full bg-[#030B18] border-b border-[#18283F] px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-serif text-xs font-semibold text-[#D8B478] tracking-wider uppercase drop-shadow-xs">
                Master Directory
              </span>
              <span className="text-xs text-[#9BB2CF] bg-[#07152A] px-2.5 py-1 rounded-full border border-[#1A3152]">
                {filteredContacts.length} {filteredContacts.length === 1 ? "Contact" : "Contacts"}
                {searchQuery ? ` matching "${searchQuery}"` : " total"}
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-[#D8B478] hover:text-white underline cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <PageIdBadge id="PG-002" name="Contacts Directory" />
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingId(null);
                      setFormData({
                        firstName: "",
                        lastName: "",
                        email: "",
                        phone: "",
                        company: "",
                        jobTitle: "",
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#C9A73A] px-4 py-2 font-bold text-slate-950 shadow-md transition-all cursor-pointer text-xs sm:text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingId ? "Edit Contact" : "Add New Contact"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold">
                          First Name *
                        </label>
                        <VoiceInput
                          value={formData.firstName}
                          onChange={(e) =>
                            setFormData({ ...formData, firstName: e.target.value })
                          }
                          placeholder="John"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold">
                          Last Name *
                        </label>
                        <VoiceInput
                          value={formData.lastName}
                          onChange={(e) =>
                            setFormData({ ...formData, lastName: e.target.value })
                          }
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold">Email</label>
                      <VoiceInput
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold">Phone</label>
                      <PhoneInput
                        value={formData.phone}
                        onChange={(val) => setFormData({ ...formData, phone: val })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold">Company</label>
                      <VoiceInput
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                        placeholder="Acme Inc."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold">
                        Job Title
                      </label>
                      <VoiceInput
                        value={formData.jobTitle}
                        onChange={(e) =>
                          setFormData({ ...formData, jobTitle: e.target.value })
                        }
                        placeholder="CEO"
                      />
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="submit"
                        disabled={
                          createMutation.isPending || updateMutation.isPending
                        }
                        className="flex-1 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                      >
                        {createMutation.isPending || updateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : editingId ? (
                          "Update Contact"
                        ) : (
                          "Create Contact"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* ─── Contacts Directory Grid Content ─── */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-xl border border-[#1E3352] bg-[#040D1B]/50 p-16">
              <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredContacts.map((contact: any) => (
                <Card
                  key={contact.id}
                  className="rounded-xl border border-[#1B2F4E] bg-[#051124] p-6 shadow-md transition-all hover:shadow-lg hover:border-[#2C4A75]"
                >
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {contact.firstName} {contact.lastName}
                      </h3>
                      {contact.company && (
                        <p className="text-sm text-muted-foreground">
                          {contact.company}
                        </p>
                      )}
                      {contact.jobTitle && (
                        <p className="text-sm text-muted-foreground/80">
                          {contact.jobTitle}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      {contact.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-foreground hover:text-amber-500 hover:underline transition-colors font-medium"
                          >
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex flex-col gap-1.5 pt-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            <span className="text-foreground font-medium">
                              {formatPhone(contact.phone)}
                            </span>
                          </div>
                          <ClientCallControls
                            contactId={contact.id}
                            contactName={`${contact.firstName} ${contact.lastName}`}
                            phone={contact.phone}
                            quoSyncStatus={contact.quoSyncStatus}
                            quoLastSyncAt={contact.quoLastSyncAt}
                            quoSyncError={contact.quoSyncError}
                            isAdminOrStaff={user?.role !== "client"}
                          />
                        </div>
                      )}
                    </div>

                    {/* Provision Portal Access Button */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      {!contact.portalUserId ? (
                        <span className="text-xs font-semibold text-red-400 bg-red-950/40 border border-red-500/20 px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                          ✗ Portal Inactive
                        </span>
                      ) : contact.portalAccess === "apps_only" ? (
                        <span className="text-xs font-semibold text-purple-400 bg-purple-950/40 border border-purple-500/25 px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                          ✦ Apps Only
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                          ✓ Portal Active
                        </span>
                      )}
                      <ProvisionPortalModal contact={contact} onSuccess={refetch} />
                    </div>

                    {/* Resend Portal Link Button */}
                    {contact.portalUserId && contact.email && (
                      <Button
                        onClick={() => resendPortalLinkMutation.mutate({ contactId: contact.id, email: contact.email })}
                        disabled={resendPortalLinkMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 shadow-sm transition-all flex items-center justify-center gap-1"
                      >
                        {resendPortalLinkMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mail className="h-3.5 w-3.5" />
                        )}
                        Resend Portal Link
                      </Button>
                    )}

                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setLocation(`/client-portal?preview=true&parentContactId=${contact.id}`)}
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-lg border border-amber-500/40 bg-amber-500/5 px-2.5 py-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 shadow-sm transition-all flex items-center justify-center"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1 shrink-0" /> View Portal Preview
                        </Button>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => handleEdit(contact)}
                            variant="outline"
                            size="sm"
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-white/10"
                            title="Edit Contact"
                          >
                            <Edit2 className="h-4 w-4 text-white/70" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(contact.id)}
                            variant="outline"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            className="rounded-lg bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 px-2.5 py-1.5 text-sm font-semibold text-red-400 shadow-sm transition-all disabled:opacity-50"
                            title="Delete Contact"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {(() => {
                        const student = contacts.find((c: any) => c.parentContactId === contact.id && c.jobTitle === "Student");
                        const targetPath = student ? `/contacts/${student.id}` : `/contacts/${contact.id}`;
                        return (
                          <Button
                            onClick={() => setLocation(targetPath)}
                            variant="outline"
                            size="sm"
                            className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 shadow-sm transition-all hover:bg-amber-500/10 flex items-center justify-center cursor-pointer"
                          >
                            <Compass className="h-3.5 w-3.5 mr-1 shrink-0" /> {student ? "Open Student Case" : "View Contact Details"}
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1E3352] bg-[#030C1C]/60 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[#081830] border border-[#1E3352] flex items-center justify-center text-[#7E97B8] mb-4">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#F5DCB0] mb-1">
                {searchQuery ? "No matching contacts found" : "No contacts yet"}
              </h3>
              <p className="text-sm text-[#8AA4C4] max-w-sm mb-4">
                {searchQuery
                  ? `We couldn't find anyone matching "${searchQuery}". Try searching by another name, school, district, or organization.`
                  : "Get started by adding your first client, advocate, school official, or partner."}
              </p>
              {searchQuery ? (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="border-[#1E3352] text-[#D8B478] hover:text-white hover:bg-[#081830]"
                >
                  Clear Search Query
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setEditingId(null);
                    setOpen(true);
                  }}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#B89628] text-slate-950 font-bold"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add First Contact
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </ScopedErrorBoundary>
  );
}

function ProvisionPortalModal({ contact, onSuccess }: { contact: any; onSuccess: () => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState(contact.email || "");
  const [password, setPassword] = useState("TestParent2026!");
  const [result, setResult] = useState<any>(null);
  const [portalAccess, setPortalAccess] = useState(contact.portalAccess || "active");

  const provisionMutation = trpc.portalProvisioning.provisionPortalAccess.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success(data.message);
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to provision portal access");
    },
  });

  const updateContactMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Portal access level updated successfully!");
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update portal access level");
    },
  });

  const resendPortalLinkMutation = trpc.portalProvisioning.resendPortalLink.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Invitation link sent successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resend portal link");
    },
  });

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="outline" 
          className={`gap-1 text-xs transition-all ${
            contact.portalUserId
              ? "border-white/10 bg-white/5 hover:bg-white/10 text-white"
              : "bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold border-transparent"
          }`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {contact.portalUserId ? "Manage Access" : "Provision Portal"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Provision Client Portal Access</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            {contact.portalUserId 
              ? `Manage settings and access levels for ${contact.firstName}'s active client portal.`
              : `Create or activate a portal account for ${contact.firstName} ${contact.lastName} to access their child's case workspace.`
            }
          </p>

          {!contact.portalUserId ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold">Parent Login Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="parent@example.com" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold">Pre-Activated Password</label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="TestParent2026!" />
                <p className="text-[11px] text-muted-foreground">Pre-activated accounts bypass email verification so you can log in instantly.</p>
              </div>

              <Button
                onClick={() => provisionMutation.mutate({ contactId: contact.id, email, password, skipEmailVerification: true })}
                disabled={provisionMutation.isPending || !email.trim()}
                className="w-full gap-2"
              >
                {provisionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate Portal Account"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold">Login Email</label>
                <Input value={email} disabled className="bg-muted/50 cursor-not-allowed text-white/50" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold block">Portal Access Level</label>
                <select
                  value={portalAccess}
                  onChange={(e) => {
                    const nextAccess = e.target.value;
                    setPortalAccess(nextAccess);
                    updateContactMutation.mutate({
                      id: contact.id,
                      portalAccess: nextAccess,
                    });
                  }}
                  disabled={updateContactMutation.isPending}
                  className="w-full text-sm bg-background border border-white/10 rounded-md p-2 text-white outline-none focus:border-amber-500/50"
                >
                  <option value="active">Active (Full Workspace Portal)</option>
                  <option value="apps_only">Smart Apps / Vault Only (Apps Only)</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Use "Smart Apps / Vault Only" for clients who finished their primary service but keep vault/smart apps access.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => resendPortalLinkMutation.mutate({ contactId: contact.id, email: contact.email || email })}
                  disabled={resendPortalLinkMutation.isPending}
                  variant="outline"
                  className="w-full gap-2 border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs py-1.5"
                >
                  {resendPortalLinkMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  Resend Portal Invitation Link
                </Button>
              </div>
            </>
          )}

          {result && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 space-y-2 text-xs">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">✓ Account Provisioned!</p>
              <div className="font-mono bg-background p-2 rounded border space-y-1">
                <div><strong>URL:</strong> https://custom-crm-pro.clientcare-fa6.workers.dev/portal</div>
                <div><strong>Email:</strong> {result.email}</div>
                {result.preActivatedPassword && <div><strong>Password:</strong> {result.preActivatedPassword}</div>}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${result.email}\nPassword: ${result.preActivatedPassword}\nURL: https://custom-crm-pro.clientcare-fa6.workers.dev/portal`);
                  toast.success("Login details copied!");
                }}
              >
                Copy Login Credentials
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
