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
import { Plus, Trash2, Edit2, Loader2, Mail, Phone, ExternalLink, Compass } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { PhoneInput } from "@/components/PhoneInput";
import { validatePhone, formatPhone } from "@/lib/phone";

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
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your business contacts and leads
          </p>
        </div>
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
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md"
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

      {/* Contacts List */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-muted/50 p-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : contacts && contacts.filter(c => c.jobTitle !== "Student").length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.filter(c => c.jobTitle !== "Student").map((contact) => (
            <Card
              key={contact.id}
              className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-foreground hover:text-amber-500 hover:underline transition-colors font-medium"
                      >
                        {formatPhone(contact.phone)}
                      </a>
                    </div>
                  )}
                </div>

                {/* Provision Portal Access Button */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  {!contact.portalUserId ? (
                    <span className="text-xs font-semibold text-red-400 bg-red-950/40 border border-red-500/20 px-2 py-1 rounded-md flex items-center gap-1">
                      ✗ Portal Inactive
                    </span>
                  ) : contact.portalAccess === "apps_only" ? (
                    <span className="text-xs font-semibold text-purple-400 bg-purple-950/40 border border-purple-500/25 px-2 py-1 rounded-md flex items-center gap-1">
                      ✦ Apps Only
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-1 rounded-md flex items-center gap-1">
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
                    const targetPath = student ? `/project-workspace/${student.id}` : `/contacts/${contact.id}`;
                    return (
                      <Button
                        onClick={() => setLocation(targetPath)}
                        variant="outline"
                        size="sm"
                        className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 shadow-sm transition-all hover:bg-amber-500/10 flex items-center justify-center"
                      >
                        <Compass className="h-3.5 w-3.5 mr-1 shrink-0" /> Go to Workspace
                      </Button>
                    );
                  })()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <p className="text-muted-foreground">
            No contacts yet. Create your first contact to get started.
          </p>
        </Card>
      )}
    </div>
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
