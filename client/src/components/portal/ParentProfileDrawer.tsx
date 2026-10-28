import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Pencil,
  RotateCcw,
  Sparkles,
  Info,
  HeartHandshake,
  UsersRound,
  ExternalLink,
  ChevronRight,
  Send,
  KeyRound
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ParentProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parentContactId?: number | null;
  studentContactId?: number | null;
  clientName?: string;
  isStaffView?: boolean;
}

type EditSection = "none" | "personal" | "email" | "phone" | "address" | "preferences" | "emergency";

export function ParentProfileDrawer({
  isOpen,
  onClose,
  parentContactId,
  studentContactId,
  clientName = "Valued Parent",
  isStaffView = false,
}: ParentProfileDrawerProps) {
  const utils = trpc.useUtils();

  // Query parent profile data
  const { data: profile, isLoading, refetch } = trpc.parentProfile.getProfile.useQuery(
    {
      parentContactId: parentContactId || undefined,
      studentContactId: studentContactId || undefined,
    },
    { enabled: isOpen }
  );

  // Active edit section state
  const [activeSection, setActiveSection] = useState<EditSection>("none");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form states
  const [personalForm, setPersonalForm] = useState({
    firstName: "",
    lastName: "",
    preferredName: "",
  });

  const [addressForm, setAddressForm] = useState({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
  });

  const [prefForm, setPrefForm] = useState({
    preferredCommunicationMethod: "Email",
    preferredCallingStartTime: "09:00",
    preferredCallingEndTime: "17:00",
    preferredCallingDays: "Monday - Friday",
  });

  const [emergencyForm, setEmergencyForm] = useState({
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
  });

  // Email verification flow states
  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [lastEmailToken, setLastEmailToken] = useState("");

  // Phone verification flow states
  const [newPhoneInput, setNewPhoneInput] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpInput, setPhoneOtpInput] = useState("");
  const [lastPhoneCode, setLastPhoneCode] = useState("");

  // Populate local form fields when profile is loaded
  useEffect(() => {
    if (profile) {
      setPersonalForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        preferredName: profile.preferredName || "",
      });
      setAddressForm({
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zipCode: profile.zipCode || "",
        country: profile.country || "USA",
      });
      setPrefForm({
        preferredCommunicationMethod: profile.preferredCommunicationMethod || "Email",
        preferredCallingStartTime: profile.preferredCallingStartTime || "09:00",
        preferredCallingEndTime: profile.preferredCallingEndTime || "17:00",
        preferredCallingDays: profile.preferredCallingDays || "Monday - Friday",
      });
      setEmergencyForm({
        emergencyContactName: profile.emergencyContactName || "",
        emergencyContactRelationship: profile.emergencyContactRelationship || "",
        emergencyContactPhone: profile.emergencyContactPhone || "",
      });
    }
  }, [profile]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleAttemptClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasUnsavedChanges]);

  // Mutations
  const updateProfileMutation = trpc.parentProfile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setActiveSection("none");
      setHasUnsavedChanges(false);
      refetch();
      utils.portal.getMyStudents.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile.");
    },
  });

  const requestEmailMutation = trpc.parentProfile.requestEmailChange.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setEmailVerificationSent(true);
      setLastEmailToken(data.token);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to request email change.");
    },
  });

  const verifyEmailMutation = trpc.parentProfile.verifyEmailChange.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setEmailVerificationSent(false);
      setActiveSection("none");
      setHasUnsavedChanges(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Verification failed.");
    },
  });

  const requestPhoneMutation = trpc.parentProfile.requestPhoneChange.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setPhoneOtpSent(true);
      setLastPhoneCode(data.code);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to request phone change.");
    },
  });

  const verifyPhoneMutation = trpc.parentProfile.verifyPhoneChange.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setPhoneOtpSent(false);
      setActiveSection("none");
      setHasUnsavedChanges(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Phone verification failed.");
    },
  });

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to discard them?")) {
        setActiveSection("none");
        setHasUnsavedChanges(false);
        onClose();
      }
    } else {
      setActiveSection("none");
      onClose();
    }
  };

  const handleSavePersonal = () => {
    if (!profile?.id) return;
    updateProfileMutation.mutate({
      parentContactId: profile.id,
      updates: {
        preferredName: personalForm.preferredName,
        firstName: personalForm.firstName,
        lastName: personalForm.lastName,
      },
    });
  };

  const handleSaveAddress = () => {
    if (!profile?.id) return;
    updateProfileMutation.mutate({
      parentContactId: profile.id,
      updates: addressForm,
    });
  };

  const handleSavePreferences = () => {
    if (!profile?.id) return;
    updateProfileMutation.mutate({
      parentContactId: profile.id,
      updates: prefForm,
    });
  };

  const handleSaveEmergency = () => {
    if (!profile?.id) return;
    updateProfileMutation.mutate({
      parentContactId: profile.id,
      updates: emergencyForm,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Dark overlay backdrop */}
      <div
        className="absolute inset-0 bg-[#000511]/75 backdrop-blur-[3px] transition-opacity duration-250 animate-in fade-in"
        onClick={handleAttemptClose}
      />

      {/* Sliding Drawer Container */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-xl bg-gradient-to-b from-[#07162B] via-[#051428] to-[#020A17] border-l border-[#3A2C18]/80 text-[#F1E8D9] shadow-2xl flex flex-col h-full transform transition-transform duration-250 ease-out animate-in slide-in-from-right">
          
          {/* ─── Header ──────────────────────────────────────────────────────── */}
          <div className="p-6 border-b border-[#3A2C18]/60 bg-[#030D1A]/80 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#C5A059]/15 text-[#FAD77B] border border-[#C5A059]/30">
                  PG-023-PRF · Waypoint Identity
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[#A69371]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Account Protected
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4] tracking-wide">
                My Profile
              </h2>
              <p className="text-xs text-[#C6B697]">
                Manage your personal information, contact methods, and advocacy communication preferences.
              </p>
            </div>

            <button
              onClick={handleAttemptClose}
              className="p-2 rounded-lg border border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#102B4E]/50 transition-colors cursor-pointer"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ─── Content Body (Vertical Scrolling) ──────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
            
            {/* Account Protection Policy Banner */}
            <div className="p-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17]/80 text-xs text-[#C6B697] flex items-start gap-3 shadow-inner">
              <Lock className="w-4 h-4 text-[#D8B467] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#FFF4D4] block font-sans">Permanent Contact Protection Active</strong>
                <span>
                  Updates are recorded into Waypoint's permanent, append-only history. Previous emails, phone numbers, and signed agreements remain connected to your family account ID for legitimate case-management and legal compliance.
                </span>
              </div>
            </div>

            {/* ─── Section 1: Personal Details ──────────────────────────────── */}
            <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-[#3A2C18]/60 pb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#D8B467]" />
                  <h3 className="font-serif font-bold text-[#FFF4D4]">Personal Details</h3>
                </div>
                {activeSection !== "personal" && (
                  <button
                    onClick={() => {
                      setActiveSection("personal");
                      setHasUnsavedChanges(true);
                    }}
                    className="flex items-center gap-1 text-xs text-[#D8B467] hover:text-[#FFF4D4] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {activeSection === "personal" ? (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#A69371] block mb-1">First Legal Name</label>
                      <input
                        type="text"
                        value={personalForm.firstName}
                        onChange={(e) => setPersonalForm({ ...personalForm, firstName: e.target.value })}
                        className="w-full bg-[#020A17] border border-[#3A2C18] rounded-md px-3 py-1.5 text-xs text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#A69371] block mb-1">Last Legal Name</label>
                      <input
                        type="text"
                        value={personalForm.lastName}
                        onChange={(e) => setPersonalForm({ ...personalForm, lastName: e.target.value })}
                        className="w-full bg-[#020A17] border border-[#3A2C18] rounded-md px-3 py-1.5 text-xs text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#382806]/50 border border-[#B88728]/30 text-[11px] text-[#FAD77B] flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#F1CB6C]" />
                    <span>
                      Notice: Modifying your legal name enters a staff-review workflow to ensure alignment with existing signed contracts and advocate representation agreements.
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#A69371] block mb-1">Preferred Name / Salutation</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Jane, Ms. Sarah"
                      value={personalForm.preferredName}
                      onChange={(e) => setPersonalForm({ ...personalForm, preferredName: e.target.value })}
                      className="w-full bg-[#020A17] border border-[#3A2C18] rounded-md px-3 py-1.5 text-xs text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#3A2C18]/60">
                    <button
                      onClick={() => {
                        setActiveSection("none");
                        setHasUnsavedChanges(false);
                      }}
                      className="px-3 py-1.5 rounded text-xs border border-[#3A2C18] text-[#C6B697] hover:bg-[#102B4E]/40"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePersonal}
                      disabled={updateProfileMutation.isPending}
                      className="px-4 py-1.5 rounded text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-md hover:brightness-110"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#A69371] block">Full Legal Name</span>
                    <span className="font-serif text-[#FFF4D4] text-sm">
                      {profile?.firstName} {profile?.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A69371] block">Preferred Name</span>
                    <span className="text-[#F1E8D9]">
                      {profile?.preferredName || "--"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A69371] block">Account Designation</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Primary Account Holder
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A69371] block">Account Key</span>
                    <span className="font-mono text-[#D8B467]">
                      WP-ACC-{profile?.id || "---"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Section 2: Contact Information ───────────────────────────── */}
            <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-[#3A2C18]/60 pb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#D8B467]" />
                  <h3 className="font-serif font-bold text-[#FFF4D4]">Contact Information</h3>
                </div>
              </div>

              {/* Primary Email Item */}
              <div className="p-3 rounded-lg border border-[#3A2C18]/80 bg-[#020A17]/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#A69371] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#38BDF8]" />
                    Primary Email Address
                  </span>
                  {activeSection !== "email" && (
                    <button
                      onClick={() => {
                        setActiveSection("email");
                        setNewEmailInput("");
                        setEmailVerificationSent(false);
                      }}
                      className="text-[11px] text-[#D8B467] hover:underline cursor-pointer"
                    >
                      Change Email
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-[#FFF4D4]">
                    {profile?.email || "No email on file"}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                    Verified
                  </span>
                </div>

                {/* Email Change Flow */}
                {activeSection === "email" && (
                  <div className="pt-2 border-t border-[#3A2C18]/60 space-y-2.5">
                    {!emailVerificationSent ? (
                      <>
                        <label className="text-[11px] text-[#C6B697] block">
                          Enter proposed new primary email:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            placeholder="name@example.com"
                            value={newEmailInput}
                            onChange={(e) => setNewEmailInput(e.target.value)}
                            className="flex-1 bg-[#020A17] border border-[#3A2C18] rounded px-3 py-1.5 text-xs text-[#FFF4D4]"
                          />
                          <button
                            onClick={() => {
                              if (!profile?.id || !newEmailInput.includes("@")) {
                                toast.error("Please enter a valid email address.");
                                return;
                              }
                              requestEmailMutation.mutate({
                                parentContactId: profile.id,
                                newEmail: newEmailInput,
                              });
                            }}
                            disabled={requestEmailMutation.isPending}
                            className="px-3 py-1.5 rounded bg-[#C5A059] text-[#07162B] font-bold text-xs hover:brightness-110 flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>{requestEmailMutation.isPending ? "Sending..." : "Send Link"}</span>
                          </button>
                          <button
                            onClick={() => setActiveSection("none")}
                            className="px-2 py-1 text-xs border border-[#3A2C18] rounded text-[#A69371]"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-[10px] text-[#A69371]">
                          A single-use verification link will be sent to the new address. Your current email remains fully active until confirmed.
                        </p>
                      </>
                    ) : (
                      <div className="p-2.5 rounded bg-[#0B1E3B]/80 border border-[#1D4A7A] space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[#7BB4F0]">
                          <CheckCircle2 className="w-4 h-4 text-[#38BDF8]" />
                          <span>Verification link dispatched to <strong>{newEmailInput}</strong>.</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#A69371]">Simulate verification click:</span>
                          <button
                            onClick={() => {
                              verifyEmailMutation.mutate({ token: lastEmailToken });
                            }}
                            className="px-2.5 py-1 rounded bg-[#38BDF8]/20 border border-[#38BDF8]/40 text-[#7BB4F0] font-semibold hover:bg-[#38BDF8]/30"
                          >
                            Confirm Email Now
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Primary Mobile Phone Item */}
              <div className="p-3 rounded-lg border border-[#3A2C18]/80 bg-[#020A17]/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#A69371] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Mobile Phone Number
                  </span>
                  {activeSection !== "phone" && (
                    <button
                      onClick={() => {
                        setActiveSection("phone");
                        setNewPhoneInput("");
                        setPhoneOtpSent(false);
                      }}
                      className="text-[11px] text-[#D8B467] hover:underline cursor-pointer"
                    >
                      Change Phone
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-[#FFF4D4]">
                    {profile?.phone || "No mobile phone on file"}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                    Verified
                  </span>
                </div>

                {/* Phone Change Flow */}
                {activeSection === "phone" && (
                  <div className="pt-2 border-t border-[#3A2C18]/60 space-y-2.5">
                    {!phoneOtpSent ? (
                      <>
                        <label className="text-[11px] text-[#C6B697] block">
                          Enter proposed new mobile number:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            placeholder="(404) 555-0199"
                            value={newPhoneInput}
                            onChange={(e) => setNewPhoneInput(e.target.value)}
                            className="flex-1 bg-[#020A17] border border-[#3A2C18] rounded px-3 py-1.5 text-xs text-[#FFF4D4]"
                          />
                          <button
                            onClick={() => {
                              if (!profile?.id || newPhoneInput.length < 7) {
                                toast.error("Please enter a valid phone number.");
                                return;
                              }
                              requestPhoneMutation.mutate({
                                parentContactId: profile.id,
                                newPhone: newPhoneInput,
                              });
                            }}
                            disabled={requestPhoneMutation.isPending}
                            className="px-3 py-1.5 rounded bg-[#C5A059] text-[#07162B] font-bold text-xs hover:brightness-110 flex items-center gap-1"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>{requestPhoneMutation.isPending ? "Sending..." : "Send Code"}</span>
                          </button>
                          <button
                            onClick={() => setActiveSection("none")}
                            className="px-2 py-1 text-xs border border-[#3A2C18] rounded text-[#A69371]"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-2.5 rounded bg-[#0B1E3B]/80 border border-[#1D4A7A] space-y-2">
                        <div className="flex items-center gap-2 text-xs text-[#7BB4F0]">
                          <CheckCircle2 className="w-4 h-4 text-[#38BDF8]" />
                          <span>One-time 6-digit code sent to <strong>{newPhoneInput}</strong> (Demo code: {lastPhoneCode})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={phoneOtpInput}
                            onChange={(e) => setPhoneOtpInput(e.target.value)}
                            className="w-36 bg-[#020A17] border border-[#3A2C18] rounded px-2.5 py-1 text-xs font-mono text-center text-[#FFF4D4]"
                          />
                          <button
                            onClick={() => {
                              if (!profile?.id) return;
                              verifyPhoneMutation.mutate({
                                parentContactId: profile.id,
                                code: phoneOtpInput || lastPhoneCode,
                              });
                            }}
                            className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500"
                          >
                            Verify & Activate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Alternate Phone */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[#A69371]">Alternate / Home Phone</span>
                <span className="font-mono text-[#F1E8D9]">
                  {profile?.altPhone || "Not specified"}
                </span>
              </div>
            </div>

            {/* ─── Section 3: Mailing Address ───────────────────────────────── */}
            <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-[#3A2C18]/60 pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#D8B467]" />
                  <h3 className="font-serif font-bold text-[#FFF4D4]">Mailing Address</h3>
                </div>
                {activeSection !== "address" && (
                  <button
                    onClick={() => {
                      setActiveSection("address");
                      setHasUnsavedChanges(true);
                    }}
                    className="flex items-center gap-1 text-xs text-[#D8B467] hover:text-[#FFF4D4] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {activeSection === "address" ? (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[11px] text-[#A69371] block mb-1">Street Address</label>
                    <input
                      type="text"
                      placeholder="123 Peach Street NW"
                      value={addressForm.address}
                      onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                      className="w-full bg-[#020A17] border border-[#3A2C18] rounded px-3 py-1.5 text-xs text-[#FFF4D4]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] text-[#A69371] block mb-1">City</label>
                      <input
                        type="text"
                        placeholder="Atlanta"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        className="w-full bg-[#020A17] border border-[#3A2C18] rounded px-3 py-1.5 text-xs text-[#FFF4D4]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#A69371] block mb-1">State</label>
                      <input
                        type="text"
                        placeholder="GA"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        className="w-full bg-[#020A17] border border-[#3A2C18] rounded px-3 py-1.5 text-xs text-[#FFF4D4]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#A69371] block mb-1">ZIP Code</label>
                      <input
                        type="text"
                        placeholder="30301"
                        value={addressForm.zipCode}
                        onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })}
                        className="w-full bg-[#020A17] border border-[#3A2C18] rounded px-3 py-1.5 text-xs text-[#FFF4D4]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#3A2C18]/60">
                    <button
                      onClick={() => {
                        setActiveSection("none");
                        setHasUnsavedChanges(false);
                      }}
                      className="px-3 py-1.5 rounded text-xs border border-[#3A2C18] text-[#C6B697]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAddress}
                      disabled={updateProfileMutation.isPending}
                      className="px-4 py-1.5 rounded text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B]"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Address"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#F1E8D9]">
                  {profile?.address ? (
                    <div>
                      <div>{profile.address}</div>
                      <div>
                        {profile.city}, {profile.state} {profile.zipCode}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[#A69371] italic">No mailing address on file</span>
                  )}
                </div>
              )}
            </div>

            {/* ─── Section 4: Communication Preferences ──────────────────────── */}
            <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-[#3A2C18]/60 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D8B467]" />
                  <h3 className="font-serif font-bold text-[#FFF4D4]">Communication Preferences</h3>
                </div>
                {activeSection !== "preferences" && (
                  <button
                    onClick={() => {
                      setActiveSection("preferences");
                      setHasUnsavedChanges(true);
                    }}
                    className="flex items-center gap-1 text-xs text-[#D8B467] hover:text-[#FFF4D4] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {activeSection === "preferences" ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-[11px] text-[#A69371] block mb-1.5">Preferred Contact Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Email", "Phone", "Text"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPrefForm({ ...prefForm, preferredCommunicationMethod: method })}
                          className={cn(
                            "py-1.5 px-3 rounded text-xs font-semibold border transition-all text-center",
                            prefForm.preferredCommunicationMethod === method
                              ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394]/50"
                              : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:bg-[#07162B]"
                          )}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#A69371] block mb-1">Earliest Call Time</label>
                      <input
                        type="time"
                        value={prefForm.preferredCallingStartTime}
                        onChange={(e) => setPrefForm({ ...prefForm, preferredCallingStartTime: e.target.value })}
                        className="w-full bg-[#020A17] border border-[#3A2C18] rounded px-3 py-1.5 text-xs text-[#FFF4D4]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#A69371] block mb-1">Latest Call Time</label>
                      <input
                        type="time"
                        value={prefForm.preferredCallingEndTime}
                        onChange={(e) => setPrefForm({ ...prefForm, preferredCallingEndTime: e.target.value })}
                        className="w-full bg-[#020A17] border border-[#3A2C18] rounded px-3 py-1.5 text-xs text-[#FFF4D4]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#3A2C18]/60">
                    <button
                      onClick={() => {
                        setActiveSection("none");
                        setHasUnsavedChanges(false);
                      }}
                      className="px-3 py-1.5 rounded text-xs border border-[#3A2C18] text-[#C6B697]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePreferences}
                      disabled={updateProfileMutation.isPending}
                      className="px-4 py-1.5 rounded text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B]"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#A69371] block">Primary Channel</span>
                    <span className="font-semibold text-[#FFF4D4] mt-0.5 inline-block px-2 py-0.5 rounded bg-[#020A17] border border-[#3A2C18]">
                      {profile?.preferredCommunicationMethod || "Email"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A69371] block">Preferred Hours</span>
                    <span className="text-[#F1E8D9]">
                      {profile?.preferredCallingStartTime || "09:00"} - {profile?.preferredCallingEndTime || "17:00"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Section 5: Emergency Contact ─────────────────────────────── */}
            <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-[#3A2C18]/60 pb-2">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-[#D8B467]" />
                  <div>
                    <h3 className="font-serif font-bold text-[#FFF4D4]">Emergency Contact</h3>
                    <span className="text-[10px] text-[#A69371]">
                      Authorized staff reference for urgent situations.
                    </span>
                  </div>
                </div>
                {activeSection !== "emergency" && (
                  <button
                    onClick={() => {
                      setActiveSection("emergency");
                      setHasUnsavedChanges(true);
                    }}
                    className="flex items-center gap-1 text-xs text-[#D8B467] hover:text-[#FFF4D4] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {activeSection === "emergency" ? (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[11px] text-[#A69371] block mb-1">Contact Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Grandma Rose, Uncle David"
                      value={emergencyForm.emergencyContactName}
                      onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyContactName: e.target.value })}
                      className="w-full bg-[#020A17] border border-[#3A2C18] rounded px-3 py-1.5 text-xs text-[#FFF4D4]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-[#A69371] block mb-1">Relationship</label>
                      <input
                        type="text"
                        placeholder="Grandparent, Co-Guardian"
                        value={emergencyForm.emergencyContactRelationship}
                        onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyContactRelationship: e.target.value })}
                        className="w-full bg-[#020A17] border border-[#3A2C18] rounded px-3 py-1.5 text-xs text-[#FFF4D4]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#A69371] block mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="(404) 555-0188"
                        value={emergencyForm.emergencyContactPhone}
                        onChange={(e) => setEmergencyForm({ ...emergencyForm, emergencyContactPhone: e.target.value })}
                        className="w-full bg-[#020A17] border border-[#3A2C18] rounded px-3 py-1.5 text-xs text-[#FFF4D4]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#3A2C18]/60">
                    <button
                      onClick={() => {
                        setActiveSection("none");
                        setHasUnsavedChanges(false);
                      }}
                      className="px-3 py-1.5 rounded text-xs border border-[#3A2C18] text-[#C6B697]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEmergency}
                      disabled={updateProfileMutation.isPending}
                      className="px-4 py-1.5 rounded text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B]"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Emergency Contact"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#F1E8D9]">
                  {profile?.emergencyContactName ? (
                    <div className="space-y-1">
                      <div className="font-semibold text-[#FFF4D4]">
                        {profile.emergencyContactName} ({profile.emergencyContactRelationship || "Relation not specified"})
                      </div>
                      <div className="font-mono text-[#D8B467]">
                        {profile.emergencyContactPhone}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[#A69371] italic">No emergency contact specified</span>
                  )}
                </div>
              )}
            </div>

            {/* ─── Section 6: Linked Students (Multi-Student Harmonization) ──── */}
            <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#05142B]/90 shadow-md space-y-3">
              <div className="flex items-center gap-2 border-b border-[#3A2C18]/60 pb-2">
                <UsersRound className="w-4 h-4 text-[#D8B467]" />
                <div>
                  <h3 className="font-serif font-bold text-[#FFF4D4]">Linked Student Cases</h3>
                  <span className="text-[10px] text-[#A69371]">
                    Family records connected to this verified parent account.
                  </span>
                </div>
              </div>

              {profile?.students && profile.students.length > 0 ? (
                <div className="space-y-2">
                  {profile.students.map((st) => (
                    <div
                      key={st.id}
                      className="p-2.5 rounded-lg border border-[#3A2C18]/60 bg-[#020A17]/70 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-medium text-[#FFF4D4] text-xs">
                          {st.firstName} {st.lastName}
                        </span>
                        <span className="text-[10px] text-[#A69371] block">
                          Case {st.caseId || `STU-${st.id}`} · {st.gradeLevel || "Grade Not Specified"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#FAD77B] px-2 py-0.5 rounded bg-[#382806]/60 border border-[#B88728]/40">
                        Shared Contact
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#A69371] italic">
                  No sibling student records linked.
                </div>
              )}
            </div>

          </div>

          {/* ─── Footer ──────────────────────────────────────────────────────── */}
          <div className="p-4 border-t border-[#3A2C18]/60 bg-[#030D1A]/90 backdrop-blur-md flex items-center justify-between text-xs text-[#A69371] shrink-0">
            <span>Waypoint Advocates · Parent Care</span>
            <button
              onClick={handleAttemptClose}
              className="px-4 py-1.5 rounded-md border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] font-medium"
            >
              Done
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
