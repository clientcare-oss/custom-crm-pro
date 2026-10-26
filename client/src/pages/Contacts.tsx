import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import VoiceInput from "@/components/VoiceInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, X, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { PhoneInput } from "@/components/PhoneInput";
import { validatePhone, formatPhone } from "@/lib/phone";
import PageIdBadge from "@/components/PageIdBadge";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import MetalPlaqueButton from "@/components/ui/MetalPlaqueButton";
import ContactsLedgerView from "@/components/contact/ledger/ContactsLedgerView";

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
    bestTimeToCall: "",
  });

  const { data: contacts, isLoading, refetch } = trpc.contacts.list.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
    }
  );

  const [searchQuery, setSearchQuery] = useState("");

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
        bestTimeToCall: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create contact");
    },
  });

  const createSamplePairMutation = trpc.contacts.createSamplePair.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Sample student & parent pair created!");
      refetch();
    },
    onError: (e) => toast.error(e.message || "Failed to create sample pair"),
  });

  const handleFillSample = () => {
    setFormData({
      firstName: "Sarah",
      lastName: "Sterling",
      email: "sarah.sterling@sample.waypointadvocates.com",
      phone: "(404) 555-0182",
      company: "Sterling Family",
      jobTitle: "Parent / Guardian",
      bestTimeToCall: "Mornings before 11:00 AM",
    });
    toast.info("Sample contact data populated");
  };

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
        bestTimeToCall: "",
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

  const handleOpenAddContact = () => {
    setEditingId(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      jobTitle: "",
      bestTimeToCall: "",
    });
    setOpen(true);
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
      bestTimeToCall: contact.bestTimeToCall || "",
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
      <div className="min-h-screen w-full relative bg-[#07152B] text-[#F0DFC5] flex flex-col">
        {/* Fixed Viewport Desk Background: Locks to screen viewport so the full desk, lamp, books, and pen fit 100% in view */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: "url('/decor/contacts-desk-bg.png?v=20261001-v4')",
            backgroundSize: "100% 100%",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* ─── Top Header Deck: Title, Search Bar, Add Contact Button, Page ID Badge ─── */}
        <div className="w-full relative z-20 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2 select-none">
          {/* Rule E: Page ID Badge in top-right */}
          <div className="absolute top-4 right-4 sm:right-6 z-30">
            <PageIdBadge id="PG-002" name="Contacts Directory" />
          </div>

          <div className="flex flex-col gap-3 sm:gap-3.5 max-w-7xl">
            {/* Crisp Gold Typography for Contacts & Subtitle */}
            <div className="flex flex-col justify-start">
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-[36px] font-bold tracking-wide leading-none bg-gradient-to-b from-[#FFF2D9] via-[#F3D193] to-[#C79641] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                Contacts
              </h1>
              <p className="font-serif text-xs sm:text-sm lg:text-[14px] font-medium text-[#E8D1A7] mt-1.5 leading-none tracking-normal drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                Everyone connected to Waypoint.
              </p>
            </div>

            {/* Search Bar + Gold Add Contact Button */}
            <div className="flex items-center gap-2.5 max-w-2xl">
              <div className="relative flex-1 h-10 sm:h-11 flex items-center min-w-0">
                <Search className="absolute left-3.5 sm:left-4 h-4 w-4 text-[#7E97B8] pointer-events-none z-10" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find a person, school, district, organization..."
                  className="w-full h-full pl-10 pr-9 rounded-xl bg-[#030917]/95 border border-[#1e3250] text-xs sm:text-sm lg:text-[14px] text-[#F0F6FC] placeholder:text-[#647C9D] focus:outline-none focus:border-[#4B70A6] focus:ring-1 focus:ring-[#4B70A6]/40 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] cursor-text select-text"
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

              {/* Quick Add Sample Pair Button */}
              <Button
                type="button"
                onClick={() => createSamplePairMutation.mutate({})}
                disabled={createSamplePairMutation.isPending}
                size="sm"
                className="h-10 sm:h-11 px-3 sm:px-3.5 rounded-xl text-xs sm:text-sm font-serif font-semibold gap-1.5 cursor-pointer bg-gradient-to-b from-[#142640] via-[#0C1A2E] to-[#071322] text-[#F5DC9F] border border-[#C5A059]/60 shadow-[0_2px_8px_rgba(0,0,0,0.7)] hover:border-[#FFE29A] hover:bg-[#1A3152] transition-all shrink-0"
                title="Quickly create a realistic sample student & parent pair"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F3C876] shrink-0" />
                <span>{createSamplePairMutation.isPending ? "Adding..." : "Add Sample Pair"}</span>
              </Button>

              {/* Old-World Forged Brass Plaque Add Contact Button */}
              <MetalPlaqueButton
                onClick={handleOpenAddContact}
                className="h-10 sm:h-11"
                title="Add New Contact"
              >
                Add Contact
              </MetalPlaqueButton>
            </div>
          </div>
        </div>

        {/* Contact Create / Edit Dialog Modal */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden bg-[#0A1729] border border-[#B88943]/50 text-[#F0DFC5] rounded-2xl shadow-2xl">
            <div className="p-4 sm:p-5 pb-3 border-b border-[#B88943]/25 shrink-0 flex items-center justify-between gap-2 bg-[#091526]">
              <DialogTitle className="font-serif text-lg font-bold text-white">
                {editingId ? "Edit Contact" : "Add New Contact"}
              </DialogTitle>
              {!editingId && (
                <button
                  type="button"
                  onClick={handleFillSample}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-serif font-bold bg-[#E9BA6B]/15 text-[#FCE09E] border border-[#E9BA6B]/40 hover:bg-[#E9BA6B]/25 transition-all cursor-pointer shadow-xs"
                  title="Autofill realistic sample contact data"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FCE09E]" />
                  <span>Fill Sample</span>
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0">
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
                    <div className="space-y-2 pt-1 border-t border-[#1e3250]/60">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold flex items-center gap-1.5 text-[#F0DFC5]">
                          <Clock className="h-3.5 w-3.5 text-[#E5C175]" />
                          Preferred Contact Time
                        </label>
                        <span className="text-[11px] text-[#A69371]">e.g., Weekdays before 1pm</span>
                      </div>
                      <VoiceInput
                        value={formData.bestTimeToCall}
                        onChange={(e) =>
                          setFormData({ ...formData, bestTimeToCall: e.target.value })
                        }
                        placeholder="e.g., Weekdays before 1:00 PM, Mornings 9am–11am"
                      />
                      {/* Rapid preset chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {[
                          "Weekdays before 1:00 PM",
                          "Mornings (9am – 12pm)",
                          "Afternoons (1pm – 5pm)",
                          "Evenings after 5:00 PM",
                          "Anytime (Standard Hours)",
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setFormData({ ...formData, bestTimeToCall: preset })}
                            className={cn(
                              "text-[10.5px] px-2 py-0.5 rounded-md border transition-all cursor-pointer",
                              formData.bestTimeToCall === preset
                                ? "bg-[#C5A059] text-[#07162B] font-bold border-[#FFE394] shadow-xs"
                                : "bg-[#091D38]/80 text-[#C6B697] border-[#1E3A63] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
                            )}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <MetalPlaqueButton
                        type="submit"
                        disabled={
                          createMutation.isPending || updateMutation.isPending
                        }
                        className="w-full h-11"
                      >
                        {createMutation.isPending || updateMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-[#241703]" /> Saving...
                          </span>
                        ) : editingId ? (
                          "Update Contact"
                        ) : (
                          "Create Contact"
                        )}
                      </MetalPlaqueButton>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

        {/* ─── Main Content: Ledger Book Resting on Executive Desk ─── */}
        <div className="w-full relative z-10 -mt-4 sm:-mt-6 lg:-mt-7 pb-6 drop-shadow-[0_12px_32px_rgba(0,0,0,0.85)]">
          <ContactsLedgerView
            contacts={contacts || []}
            searchQuery={searchQuery}
            onEditContact={handleEdit}
            onDeleteContact={handleDelete}
            onOpenAddContact={handleOpenAddContact}
          />
        </div>
      </div>
    </ScopedErrorBoundary>
  );
}
