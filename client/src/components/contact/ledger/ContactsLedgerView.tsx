import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Phone,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Link as LinkIcon,
  ChevronRight,
  Clock,
  Calendar,
  Users,
  Star,
  ExternalLink,
  Edit2,
  Trash2,
  Home,
  Check,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/phone";
import {
  getTimeInZone,
  getCallingStatus,
  detectTimeZoneFromLocation,
  getFriendlyTimeZoneName,
  getTimeDifferenceHours,
  formatTimeDifferenceText,
} from "@shared/timezones";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MetalCornerBolt } from "@/components/ui/MetalPlaqueButton";

export interface ContactItem {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  portalUserId?: number | null;
  portalAccess?: string | null;
  parentContactId?: number | null;
  caseId?: string | null;
  notes?: string | null;
  createdAt?: string | Date;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  confirmedTimeZone?: string | null;
  timezone?: string | null;
  preferredCallingStartTime?: string | null;
  preferredCallingEndTime?: string | null;
  mayCallOutsidePreferredHours?: boolean | null;
  relationship?: string | null;
}

const AREA_CODE_TIMEZONE_MAP: Record<string, string> = {
  // Eastern
  "201": "America/New_York", "202": "America/New_York", "203": "America/New_York",
  "404": "America/New_York", "678": "America/New_York", "770": "America/New_York", "470": "America/New_York",
  "212": "America/New_York", "315": "America/New_York", "516": "America/New_York", "718": "America/New_York",
  "914": "America/New_York", "917": "America/New_York", "617": "America/New_York", "508": "America/New_York",
  "215": "America/New_York", "412": "America/New_York", "216": "America/New_York", "614": "America/New_York",
  "305": "America/New_York", "407": "America/New_York", "813": "America/New_York", "904": "America/New_York",
  "704": "America/New_York", "919": "America/New_York", "803": "America/New_York", "843": "America/New_York",
  "703": "America/New_York", "804": "America/New_York", "410": "America/New_York", "301": "America/New_York",
  // Central
  "312": "America/Chicago", "773": "America/Chicago", "872": "America/Chicago",
  "214": "America/Chicago", "469": "America/Chicago", "972": "America/Chicago",
  "713": "America/Chicago", "281": "America/Chicago", "832": "America/Chicago",
  "512": "America/Chicago", "210": "America/Chicago", "615": "America/Chicago",
  "901": "America/Chicago", "314": "America/Chicago", "816": "America/Chicago",
  "612": "America/Chicago", "651": "America/Chicago", "414": "America/Chicago",
  "504": "America/Chicago", "205": "America/Chicago", "251": "America/Chicago",
  // Mountain
  "303": "America/Denver", "720": "America/Denver", "801": "America/Denver",
  "385": "America/Denver", "505": "America/Denver", "208": "America/Denver",
  "480": "America/Phoenix", "602": "America/Phoenix", "623": "America/Phoenix", "520": "America/Phoenix",
  // Pacific
  "206": "America/Los_Angeles", "253": "America/Los_Angeles", "425": "America/Los_Angeles",
  "503": "America/Los_Angeles", "971": "America/Los_Angeles",
  "213": "America/Los_Angeles", "310": "America/Los_Angeles", "323": "America/Los_Angeles",
  "415": "America/Los_Angeles", "510": "America/Los_Angeles", "650": "America/Los_Angeles",
  "619": "America/Los_Angeles", "858": "America/Los_Angeles", "916": "America/Los_Angeles",
  "702": "America/Los_Angeles", "775": "America/Los_Angeles",
  // Alaska & Hawaii
  "907": "America/Anchorage",
  "808": "Pacific/Honolulu",
};

function getTimeZoneFromPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const clean = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (clean.length < 3) return null;
  const areaCode = clean.slice(0, 3);
  return AREA_CODE_TIMEZONE_MAP[areaCode] || null;
}

export function isStudentContact(c?: ContactItem | null): boolean {
  if (!c) return false;
  if (c.parentContactId != null) return true;
  const title = (c.jobTitle || "").toLowerCase().trim();
  if (title === "student") return true;
  const rel = (c.relationship || "").toLowerCase().trim();
  if (rel === "student" || rel === "child") return true;
  return false;
}

export interface ContactsLedgerViewProps {
  contacts: ContactItem[];
  searchQuery: string;
  onEditContact: (contact: ContactItem) => void;
  onDeleteContact: (id: number) => void;
  onOpenAddContact: () => void;
}

const ALPHABET = [
  "HOME",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
];

type CategoryFilter =
  | "all"
  | "families"
  | "schools"
  | "districts"
  | "professionals"
  | "team";

export default function ContactsLedgerView({
  contacts,
  searchQuery,
  onEditContact,
  onDeleteContact,
  onOpenAddContact,
}: ContactsLedgerViewProps) {
  const [, setLocation] = useLocation();

  // CRM Global Theme: "navy" (dark leather) or "blue" (antique vellum parchment)
  const { theme } = useTheme();
  const isLight = theme === "blue";

  // Category filter
  const [category, setCategory] = useState<CategoryFilter>("all");

  // Alphabet thumb index selection ("HOME" = all letters, or 'A', 'B', etc.)
  const [selectedLetter, setSelectedLetter] = useState<string | null>("HOME");

  // Mobile page view tab: "directory" (left page) or "dossier" (right page)
  const [mobileTab, setMobileTab] = useState<"directory" | "dossier">("directory");

  // Helper to determine contact badge / classification
  const getContactBadge = (c: ContactItem) => {
    const title = (c.jobTitle || "").toLowerCase();
    const comp = (c.company || "").toLowerCase();

    if (comp.includes("waypoint") || title.includes("advocate") || title.includes("founder")) {
      return { label: "Team", type: "team" as const };
    }
    if (title.includes("psychologist") || title.includes("slp") || title.includes("therap") || title.includes("attorney")) {
      return { label: "Professional", type: "professional" as const };
    }
    if (title.includes("case manager") || title.includes("teacher") || comp.includes("elementary") || comp.includes("high school") || comp.includes("middle school")) {
      return { label: "School Staff", type: "school" as const };
    }
    if (title.includes("director") || comp.includes("district") || comp.includes("county")) {
      return { label: "District", type: "district" as const };
    }
    if (c.portalUserId || title === "parent" || (!c.jobTitle && !c.company)) {
      return { label: "★ Active Family", type: "active-family" as const };
    }
    return { label: "Contact", type: "default" as const };
  };

  // Helper to match category filter
  const matchCategory = (c: ContactItem, cat: CategoryFilter) => {
    if (cat === "all") return true;
    const badge = getContactBadge(c);
    const title = (c.jobTitle || "").toLowerCase();
    const comp = (c.company || "").toLowerCase();

    if (cat === "families") {
      return badge.type === "active-family" || title.includes("parent");
    }
    if (cat === "schools") {
      return badge.type === "school" || comp.includes("school") || comp.includes("elementary") || comp.includes("high");
    }
    if (cat === "districts") {
      return badge.type === "district" || comp.includes("district") || comp.includes("county");
    }
    if (cat === "professionals") {
      return badge.type === "professional";
    }
    if (cat === "team") {
      return badge.type === "team";
    }
    return true;
  };

  // Filtered contacts based on category, search, and letter
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Students are NOT contacts — they are solely a linked project case or file
      if (isStudentContact(c)) return false;

      if (!matchCategory(c, category)) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
        const email = (c.email || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        const company = (c.company || "").toLowerCase();
        const jobTitle = (c.jobTitle || "").toLowerCase();
        // Also match if any linked child has this name (e.g. searching student finds their parent!)
        const matchesChild = contacts.some(
          (child) =>
            child.parentContactId === c.id &&
            `${child.firstName || ""} ${child.lastName || ""}`.toLowerCase().includes(q)
        );
        const match =
          fullName.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          company.includes(q) ||
          jobTitle.includes(q) ||
          matchesChild;
        if (!match) return false;
      }

      // Letter filter
      if (selectedLetter && selectedLetter !== "HOME") {
        const lastInitial = (c.lastName || c.firstName || "")[0]?.toUpperCase();
        if (lastInitial !== selectedLetter) return false;
      }

      return true;
    });
  }, [contacts, category, searchQuery, selectedLetter]);

  // Group contacts alphabetically by last name initial
  const groupedContacts = useMemo(() => {
    // Sort contacts by lastName, firstName
    const sorted = [...filteredContacts].sort((a, b) => {
      const lastA = (a.lastName || a.firstName || "").toLowerCase();
      const lastB = (b.lastName || b.firstName || "").toLowerCase();
      return lastA.localeCompare(lastB);
    });

    const groups: { letter: string; items: ContactItem[] }[] = [];
    sorted.forEach((item) => {
      const letter = (item.lastName || item.firstName || "?")[0]?.toUpperCase() || "?";
      const existing = groups.find((g) => g.letter === letter);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({ letter, items: [item] });
      }
    });
    return groups;
  }, [filteredContacts]);

  // Set of letters that have contacts under the current category & search query
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    contacts.forEach((c) => {
      // Students are NOT contacts — they are solely a linked project case or file
      if (isStudentContact(c)) return;
      if (!matchCategory(c, category)) return;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
        // Also match if any linked student has this name
        const matchesChild = contacts.some(
          (child) =>
            child.parentContactId === c.id &&
            `${child.firstName || ""} ${child.lastName || ""}`.toLowerCase().includes(q)
        );
        if (!fullName.includes(q) && !matchesChild) return;
      }
      const initial = (c.lastName || c.firstName || "").trim()[0]?.toUpperCase();
      if (initial) letters.add(initial);
    });
    return letters;
  }, [contacts, category, searchQuery]);

  // Selected contact for the right-page dossier (always a true contact, never a student)
  const [selectedContactId, setSelectedContactId] = useState<number | null>(() => {
    const firstContact = contacts.find((c) => !isStudentContact(c));
    return firstContact?.id ?? null;
  });

  // Keep selected contact synced if list changes
  const activeContact = useMemo(() => {
    if (selectedContactId) {
      const found = contacts.find((c) => c.id === selectedContactId && !isStudentContact(c));
      if (found) return found;
    }
    const firstContact = filteredContacts.find((c) => !isStudentContact(c));
    return firstContact || contacts.find((c) => !isStudentContact(c)) || null;
  }, [contacts, selectedContactId, filteredContacts]);

  // dossierContact: The primary contact person displayed at the top of the dossier.
  // Active contact is already guaranteed to be a contact (never a student).
  const dossierContact = activeContact;

  // dossierStudents: The linked student case(s) / files for this contact
  const dossierStudents = useMemo(() => {
    if (!activeContact) return [];
    return contacts.filter((c) => c.parentContactId === activeContact.id);
  }, [activeContact, contacts]);

  // Initials generator
  const getInitials = (first?: string | null, last?: string | null) => {
    const f = (first || "").trim()[0] || "";
    const l = (last || "").trim()[0] || "";
    return (f + l).toUpperCase() || "WP";
  };

  const activeBadge = dossierContact ? getContactBadge(dossierContact) : null;

  // Live clock tick (every 30 seconds)
  const [liveNow, setLiveNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Time Zone Intelligence for active dossier contact
  const dossierTimeZone = useMemo(() => {
    if (!dossierContact) return "America/New_York";
    if (dossierContact.confirmedTimeZone) return dossierContact.confirmedTimeZone;
    if (dossierContact.timezone) return dossierContact.timezone;
    if (dossierContact.city || dossierContact.state || dossierContact.zipCode) {
      const detected = detectTimeZoneFromLocation(
        dossierContact.city || undefined,
        dossierContact.state || undefined,
        dossierContact.zipCode || undefined
      );
      if (detected?.timeZone) return detected.timeZone;
    }
    const fromPhone = getTimeZoneFromPhone(dossierContact.phone);
    if (fromPhone) return fromPhone;
    return "America/New_York";
  }, [dossierContact]);

  const contactTime = useMemo(() => {
    return getTimeInZone(dossierTimeZone, liveNow);
  }, [dossierTimeZone, liveNow]);

  const callingStatus = useMemo(() => {
    return getCallingStatus(
      dossierTimeZone,
      {
        preferredStart: dossierContact?.preferredCallingStartTime,
        preferredEnd: dossierContact?.preferredCallingEndTime,
        mayCallOutsidePreferred: dossierContact?.mayCallOutsidePreferredHours ?? false,
      },
      liveNow
    );
  }, [dossierTimeZone, dossierContact, liveNow]);

  const diffHours = useMemo(() => {
    return getTimeDifferenceHours(dossierTimeZone, "America/New_York", liveNow);
  }, [dossierTimeZone, liveNow]);

  const diffText = useMemo(() => {
    return formatTimeDifferenceText(diffHours);
  }, [diffHours]);

  return (
    <div
      className={cn(
        "w-full flex-shrink-0 relative overflow-hidden select-none",
        "h-[740px] sm:h-[780px] lg:h-[820px] min-h-[740px] sm:min-h-[780px] lg:min-h-[820px] max-h-[740px] sm:max-h-[780px] lg:max-h-[820px]"
      )}
      style={{
        backgroundImage: `url(${
          isLight
            ? "/decor/contacts-ledger-light.png?v=20261006"
            : "/decor/contacts-ledger-dark.png?v=20261006"
        })`,
        backgroundColor: "transparent",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center top",
      }}
    >
      {/* Mobile Tab Switcher (Visible only on < lg screens) */}
      <div className="lg:hidden absolute top-2 right-3 z-30 flex items-center bg-[#071324]/90 backdrop-blur-sm p-1 rounded-xl border border-[#1b2d45] shadow-lg">
        <button
          type="button"
          onClick={() => setMobileTab("directory")}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer",
            mobileTab === "directory"
              ? "bg-[#D4AF37] text-slate-950 shadow-sm"
              : "text-[#C5B495] hover:text-white"
          )}
        >
          Directory
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("dossier")}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer",
            mobileTab === "dossier"
              ? "bg-[#D4AF37] text-slate-950 shadow-sm"
              : "text-[#C5B495] hover:text-white"
          )}
        >
          Dossier
        </button>
      </div>

      {/* ─── Inner Spread Grid: Left Page, Spine, Right Page, Alphabet Rail ─── */}
      <div className="absolute inset-0 flex">
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* LEFT PAGE: Category Tabs + Alphabetical Contacts Directory         */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div
            className={cn(
              "w-full lg:w-[47.2%] h-full pt-[7.8%] lg:pt-[8.5%] pb-[7.5%] lg:pb-[8.2%] pl-[5.5%] pr-[2.5%] flex flex-col z-10",
              mobileTab === "dossier" ? "hidden lg:flex" : "flex"
            )}
          >
            {/* Top Category Filter Tabs Strip */}
            <div className="flex flex-col gap-1.5 pb-2.5 pt-0.5 border-b border-white/10 select-none">
              {/* Total Contacts Count Indicator (Top Centered) */}
              <div className="flex items-center justify-center gap-2">
                <span className={cn("h-px w-8 sm:w-12", isLight ? "bg-[#C2AE88]/40" : "bg-[#D4AF37]/25")} />
                <span
                  className={cn(
                    "text-[10px] sm:text-[11px] font-serif font-semibold tracking-wider uppercase",
                    isLight ? "text-[#73634B]" : "text-[#E8D1A7]"
                  )}
                >
                  {filteredContacts.length}{" "}
                  {filteredContacts.length === 1 ? "Contact" : "Contacts"} in Directory
                </span>
                <span className={cn("h-px w-8 sm:w-12", isLight ? "bg-[#C2AE88]/40" : "bg-[#D4AF37]/25")} />
              </div>

              {/* 6 Category Filter Buttons: Balanced 3x2 Grid (No Horizontal Scrolling) */}
              <div className="grid grid-cols-3 gap-1 w-full">
                {[
                  { id: "all", label: "All" },
                  { id: "families", label: "Families" },
                  { id: "schools", label: "Schools" },
                  { id: "districts", label: "Districts" },
                  { id: "professionals", label: "Professionals" },
                  { id: "team", label: "Team" },
                ].map((t) => {
                  const isActive = category === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setCategory(t.id as CategoryFilter);
                        if (t.id === "all") {
                          setSelectedLetter("HOME");
                        }
                      }}
                      className={cn(
                        "py-1 px-1 rounded-lg text-[11px] sm:text-xs font-serif text-center transition-all cursor-pointer truncate",
                        isActive
                          ? isLight
                            ? "bg-[#D9C49D] text-[#1F1404] font-bold shadow-xs border border-[#A6884E]"
                            : "bg-[#091A33]/90 text-[#FFF2D9] font-bold border border-[#E5C175]/60 shadow-[0_0_8px_rgba(229,193,117,0.3)]"
                          : isLight
                          ? "text-[#5C4D38] hover:text-[#1F1404] hover:bg-[#EAE0CA] border border-transparent"
                          : "text-[#8CA4C4] hover:text-white hover:bg-white/5 border border-transparent"
                      )}
                      title={t.label}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Alphabetical Directory List */}
            <div className="flex-1 overflow-y-auto pr-1.5 pt-3 space-y-4 custom-scrollbar">
              {groupedContacts.length === 0 ? (
                <div className="w-full flex flex-col items-center text-center pt-14 sm:pt-20 px-6 select-none">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border mb-3 shadow-xs",
                      isLight
                        ? "bg-[#EAE0CA] border-[#C2AE88] text-[#523F1F]"
                        : "bg-[#091D38]/80 border-[#1E4377] text-[#D4AF37]"
                    )}
                  >
                    <Users className="h-5 w-5" />
                  </div>
                  <p
                    className={cn(
                      "font-serif text-base sm:text-lg font-bold",
                      isLight ? "text-[#3D2908]" : "text-[#FFF0D4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    )}
                  >
                    No contacts found
                  </p>
                  <p
                    className={cn(
                      "text-xs sm:text-[13px] mt-1.5 max-w-xs leading-relaxed",
                      isLight ? "text-[#6B5A45]" : "text-[#A3B8D4]"
                    )}
                  >
                    {selectedLetter && selectedLetter !== "HOME"
                      ? `No contacts with initial "${selectedLetter}" in this category.`
                      : "Try clearing your search or picking another filter."}
                  </p>
                </div>
              ) : (
                groupedContacts.map((group) => (
                  <div key={group.letter} className="space-y-1.5">
                    {/* Section Initial Header with Gold Rule */}
                    <div className="flex items-center gap-2 pt-1 pb-1">
                      <span
                        className={cn(
                          "font-serif text-base sm:text-lg font-bold drop-shadow-xs",
                          isLight ? "text-[#8B5E14]" : "text-[#FCE09E]"
                        )}
                      >
                        {group.letter}
                      </span>
                      <div
                        className={cn(
                          "flex-1 h-[1px]",
                          isLight
                            ? "bg-gradient-to-r from-[#B89650]/50 to-transparent"
                            : "bg-gradient-to-r from-[#D4AF37]/40 via-[#8A6731]/30 to-transparent"
                        )}
                      />
                    </div>

                    {/* Contacts under this letter */}
                    <div className="space-y-1.5">
                      {group.items.map((contact) => {
                        const isSelected = activeContact?.id === contact.id;
                        const badge = getContactBadge(contact);
                        const initials = getInitials(contact.firstName, contact.lastName);

                        return (
                          <div
                            key={contact.id}
                            onClick={() => {
                              setSelectedContactId(contact.id);
                              setMobileTab("dossier");
                            }}
                            className={cn(
                              "w-full rounded-xl px-2.5 sm:px-3 py-2 flex items-center justify-between gap-2.5 cursor-pointer transition-all text-left group select-none",
                              isSelected
                                ? isLight
                                  ? "bg-[#D8C29A]/80 border border-[#8C6418] shadow-[0_2px_8px_rgba(140,100,24,0.25)]"
                                  : "bg-[#0B1E38]/85 border border-[#E5C175] shadow-[0_0_12px_rgba(229,193,117,0.32),inset_0_1px_1px_rgba(255,255,255,0.1)]"
                                : isLight
                                ? "hover:bg-[#E2D4BC]/60 border border-transparent"
                                : "hover:bg-[#07172C]/60 border border-transparent"
                            )}
                          >
                            {/* Left: Initials Avatar + Name & Subtitle */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-serif font-bold text-xs sm:text-sm shrink-0 border transition-all",
                                  isSelected
                                    ? isLight
                                      ? "bg-[#4A3205] text-[#FFE8A3] border-[#8C6418] shadow-xs"
                                      : "bg-[#051124] text-[#FCE09E] border-[#E5C175] shadow-[0_0_8px_rgba(229,193,117,0.35)]"
                                    : isLight
                                    ? "bg-[#D2BD93] text-[#2E1E05] border-[#9E7F47]"
                                    : "bg-[#051020] text-[#CBD5E1] border-[#1E3554] group-hover:border-[#D4AF37]/50"
                                )}
                              >
                                {initials}
                              </div>

                              <div className="min-w-0">
                                <h4
                                  className={cn(
                                    "font-serif text-xs sm:text-sm font-bold truncate leading-tight",
                                    isLight ? "text-[#1C1405]" : "text-[#F8F1E4]"
                                  )}
                                >
                                  {contact.lastName}, {contact.firstName}
                                </h4>
                                <p
                                  className={cn(
                                    "text-[10.5px] sm:text-[11.5px] truncate leading-tight mt-0.5",
                                    isLight ? "text-[#5C4A32]" : "text-[#8CA4C4]"
                                  )}
                                >
                                  {(() => {
                                    const kids = contacts.filter((c) => c.parentContactId === contact.id);
                                    if (kids.length > 0) {
                                      return `Parent of ${kids.map((k) => `${k.firstName} ${k.lastName}`).join(", ")}`;
                                    }
                                    return `${contact.jobTitle || "Contact"}${contact.company ? ` · ${contact.company}` : ""}`;
                                  })()}
                                </p>
                              </div>
                            </div>

                            {/* Right: Role Badge & Arrow */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {badge.type === "active-family" && (
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-serif font-bold tracking-tight whitespace-nowrap",
                                    isLight
                                      ? "bg-[#E5BF65] text-[#291A04] border border-[#8C6418]"
                                      : "bg-[#33220A] text-[#FCE09E] border border-[#E5C175]/60"
                                  )}
                                >
                                  ★ Active Family
                                </span>
                              )}
                              {badge.type === "team" && (
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-serif font-semibold whitespace-nowrap",
                                    isLight
                                      ? "bg-[#B4D3F7] text-[#0A264D] border border-[#528AC9]"
                                      : "bg-[#091D3B] text-[#93C5FD] border border-[#1D4E89]"
                                  )}
                                >
                                  Team
                                </span>
                              )}
                              {badge.type === "professional" && (
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-serif font-semibold whitespace-nowrap",
                                    isLight
                                      ? "bg-[#D8C7F0] text-[#261042] border border-[#8C63BF]"
                                      : "bg-[#1E112E] text-[#D8B4FE] border border-[#552B80]"
                                  )}
                                >
                                  Professional
                                </span>
                              )}
                              {badge.type === "school" && (
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-serif font-semibold whitespace-nowrap",
                                    isLight
                                      ? "bg-[#BEE5F5] text-[#052A3B] border border-[#4899BD]"
                                      : "bg-[#0A2338] text-[#7DD3FC] border border-[#1A5B8A]"
                                  )}
                                >
                                  School Staff
                                </span>
                              )}
                              {badge.type === "district" && (
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-serif font-semibold whitespace-nowrap",
                                    isLight
                                      ? "bg-[#C4EFE7] text-[#06332C] border border-[#44A392]"
                                      : "bg-[#082B29] text-[#5EEAD4] border border-[#14665E]"
                                  )}
                                >
                                  District
                                </span>
                              )}

                              <ChevronRight
                                className={cn(
                                  "h-3.5 w-3.5 transition-transform",
                                  isSelected
                                    ? isLight
                                      ? "text-[#8C6418] translate-x-0.5"
                                      : "text-[#FCE09E] translate-x-0.5"
                                    : "text-white/30 group-hover:text-white/60"
                                )}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* CENTER BOOK SPINE (Visual divider & stitching)                     */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="hidden lg:block w-[4.8%] h-full pointer-events-none select-none" />

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* RIGHT PAGE: Selected Contact Dossier                               */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div
            className={cn(
              "w-full lg:w-[41.8%] h-full pt-[7.8%] lg:pt-[8.5%] pb-[7.5%] lg:pb-[8.2%] pl-[2%] pr-[3.5%] flex flex-col z-10",
              mobileTab === "directory" ? "hidden lg:flex" : "flex"
            )}
          >
            {dossierContact ? (
              <div className="h-full flex flex-col space-y-3 select-none overflow-y-auto custom-scrollbar pr-1">
                {/* 1. Dossier Header: Avatar + Name + Subtitle + Action Buttons */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Large Initials Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-serif font-black text-xl sm:text-2xl border-2 shadow-lg",
                          isLight
                            ? "bg-gradient-to-br from-[#EFE0C2] to-[#C9B388] text-[#291802] border-[#8C6418]"
                            : "bg-gradient-to-br from-[#0F2647] to-[#040C1A] text-[#FFF2D9] border-[#E5C175] shadow-[0_0_16px_rgba(229,193,117,0.35)]"
                        )}
                      >
                        {getInitials(dossierContact.firstName, dossierContact.lastName)}
                      </div>
                    </div>

                    {/* Contact Header Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top Line: Tags & Badges (Active Family, etc.) */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                        {activeBadge && (
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[11px] font-serif font-bold tracking-tight whitespace-nowrap shadow-xs",
                              isLight
                                ? "bg-[#E5BF65] text-[#291A04] border border-[#8C6418]"
                                : "bg-[#33220A] text-[#FCE09E] border border-[#E5C175]/60 shadow-[0_0_8px_rgba(229,193,117,0.25)]"
                            )}
                          >
                            {activeBadge.label}
                          </span>
                        )}
                      </div>

                      {/* Parent / Contact Name (Dropped down, uninhibited full width) */}
                      <h2
                        className={cn(
                          "font-serif text-xl sm:text-2xl lg:text-[26px] font-bold tracking-tight truncate leading-tight drop-shadow-xs",
                          isLight ? "text-[#1C1405]" : "text-[#FFF2D9]"
                        )}
                      >
                        {dossierContact.firstName} {dossierContact.lastName}
                      </h2>

                      {/* Professional subtitle (only if no linked students, e.g. advocate or school personnel) */}
                      {dossierStudents.length === 0 && dossierContact.jobTitle && (
                        <p
                          className={cn(
                            "font-serif text-xs sm:text-sm font-medium mt-1 truncate",
                            isLight ? "text-[#5C4A32]" : "text-[#C7B596]"
                          )}
                        >
                          {dossierContact.jobTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Buttons Bar: Call, Email, Message, Dropdown Menu */}
                  <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                    {dossierContact.phone ? (
                      <a
                        href={`tel:${dossierContact.phone}`}
                        className={cn(
                          "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold transition-all border cursor-pointer shadow-xs",
                          isLight
                            ? "bg-[#EAE0CA] hover:bg-[#D9C7A7] text-[#2B1C05] border-[#9E8353]"
                            : "bg-[#091D38]/90 hover:bg-[#0E2C54] text-[#E0ECFC] border-[#1D3D69]"
                        )}
                      >
                        <Phone className="h-3.5 w-3.5 text-[#E5C175]" />
                        <span>Call</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-serif font-medium opacity-40 border border-white/10"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>Call</span>
                      </button>
                    )}

                    {dossierContact.email ? (
                      <a
                        href={`mailto:${dossierContact.email}`}
                        className={cn(
                          "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold transition-all border cursor-pointer shadow-xs",
                          isLight
                            ? "bg-[#EAE0CA] hover:bg-[#D9C7A7] text-[#2B1C05] border-[#9E8353]"
                            : "bg-[#091D38]/90 hover:bg-[#0E2C54] text-[#E0ECFC] border-[#1D3D69]"
                        )}
                      >
                        <Mail className="h-3.5 w-3.5 text-[#E5C175]" />
                        <span>Email</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-serif font-medium opacity-40 border border-white/10"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>Email</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setLocation("/messages")}
                      className={cn(
                        "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold transition-all border cursor-pointer shadow-xs",
                        isLight
                          ? "bg-[#EAE0CA] hover:bg-[#D9C7A7] text-[#2B1C05] border-[#9E8353]"
                          : "bg-[#091D38]/90 hover:bg-[#0E2C54] text-[#E0ECFC] border-[#1D3D69]"
                      )}
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-[#E5C175]" />
                      <span>Message</span>
                    </button>

                    {/* More Actions Dropdown Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "p-2 rounded-xl border transition-all cursor-pointer shadow-xs",
                            isLight
                              ? "bg-[#EAE0CA] hover:bg-[#D9C7A7] text-[#2B1C05] border-[#9E8353]"
                              : "bg-[#091D38]/90 hover:bg-[#0E2C54] text-[#E0ECFC] border-[#1D3D69]"
                          )}
                          title="More options"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#051124] border border-[#1E3A63] text-[#F0DFC5] rounded-xl shadow-2xl p-1 min-w-[190px]"
                      >
                        <DropdownMenuItem
                          onClick={() =>
                            setLocation(
                              `/client-portal?preview=true&parentContactId=${dossierContact.id}`
                            )
                          }
                          className="flex items-center gap-2 cursor-pointer hover:bg-white/10 text-xs py-2 rounded-lg"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-[#E5C175]" />
                          <span>View Portal Preview</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onEditContact(dossierContact)}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white/10 text-xs py-2 rounded-lg"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-[#93C5FD]" />
                          <span>Edit Contact</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteContact(dossierContact.id)}
                          className="flex items-center gap-2 cursor-pointer hover:bg-red-950/60 text-red-400 text-xs py-2 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Contact</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Forged Metal Chronometer & Calling Safety Plaque */}
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-xl border transition-all select-none px-3 sm:px-3.5 py-2",
                      // 3D Metal Plaque Body
                      isLight
                        ? "bg-gradient-to-b from-[#F9F1DC] via-[#EADBBD] to-[#CEBA92] border-[#8C6418] shadow-[0_3px_8px_rgba(70,45,10,0.22),inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-1px_1.5px_rgba(0,0,0,0.15)] ring-1 ring-[#FFEAA3]/50"
                        : "bg-gradient-to-b from-[#132847] via-[#0B1A30] to-[#050E1C] border-[#B88E35] shadow-[0_4px_16px_rgba(0,0,0,0.7),inset_0_1px_1.5px_rgba(255,235,170,0.35),inset_0_-1.5px_2px_rgba(0,0,0,0.85)] ring-1 ring-[#FFEAA3]/25"
                    )}
                    title={`${callingStatus.recommendation}${diffHours !== 0 ? ` · ${diffText}` : ""}`}
                  >
                    {/* Top specular reflection hairline */}
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFEAA3]/60 to-transparent pointer-events-none" />

                    {/* 4 Corner Bolts */}
                    <MetalCornerBolt className="top-1 left-1.5" />
                    <MetalCornerBolt className="top-1 right-1.5" />
                    <MetalCornerBolt className="bottom-1 left-1.5" />
                    <MetalCornerBolt className="bottom-1 right-1.5" />

                    <div className="flex items-center justify-between gap-2 pl-2 sm:pl-2.5 pr-2 sm:pr-2.5">
                      {/* Left: Chronometer & Time Display */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border",
                            isLight
                              ? "bg-[#EFE2C6] border-[#A88849] text-[#5A3E09] shadow-xs"
                              : "bg-[#061224] border-[#D4AF37]/50 text-[#FCE09E] shadow-[0_0_8px_rgba(212,175,55,0.3)]"
                          )}
                        >
                          <Clock className="h-3.5 w-3.5" />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={cn(
                              "text-[10px] uppercase font-serif font-bold tracking-wider",
                              isLight ? "text-[#5C4212]" : "text-[#E8D1A7]"
                            )}
                          >
                            Local Time:
                          </span>
                          <span
                            className={cn(
                              "font-mono font-bold text-xs sm:text-sm tracking-tight",
                              isLight ? "text-[#1F1404]" : "text-[#FFFFFF] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                            )}
                          >
                            {contactTime.timeString}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-sans font-bold px-1.5 py-0.5 rounded border tracking-wider",
                              isLight
                                ? "bg-[#DFCB9F] border-[#9E7D3F] text-[#3D2704]"
                                : "bg-[#040C1A] border-[#D4AF37]/40 text-[#FCE09E]"
                            )}
                          >
                            {contactTime.tzAbbr}
                          </span>
                          {diffHours !== 0 && (
                            <span
                              className={cn(
                                "text-[10px] font-serif font-medium hidden sm:inline",
                                isLight ? "text-[#735828]" : "text-[#A9C1DE]"
                              )}
                            >
                              · {diffText}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Jewel Enamel Safety Badge */}
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shrink-0 transition-all shadow-xs",
                          callingStatus.status === "green"
                            ? isLight
                              ? "bg-[#D1F2DD] border-[#38A169] text-[#0D4D28]"
                              : "bg-gradient-to-r from-emerald-950/90 to-[#022417] border-emerald-500/60 text-emerald-300 shadow-[inset_0_1px_2px_rgba(110,231,183,0.3),0_0_10px_rgba(16,185,129,0.25)]"
                            : callingStatus.status === "yellow"
                            ? isLight
                              ? "bg-[#FEF0C7] border-[#D97706] text-[#78350F]"
                              : "bg-gradient-to-r from-amber-950/90 to-[#291A04] border-amber-500/60 text-amber-300 shadow-[inset_0_1px_2px_rgba(252,211,77,0.3),0_0_10px_rgba(245,158,11,0.25)]"
                            : isLight
                            ? "bg-[#FEE4E2] border-[#E11D48] text-[#881337]"
                            : "bg-gradient-to-r from-rose-950/90 to-[#2A050D] border-rose-500/60 text-rose-300 shadow-[inset_0_1px_2px_rgba(253,164,175,0.3),0_0_10px_rgba(244,63,94,0.25)]"
                        )}
                      >
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0 ring-1",
                            callingStatus.status === "green"
                              ? "bg-emerald-400 ring-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.95)] animate-pulse"
                              : callingStatus.status === "yellow"
                              ? "bg-amber-400 ring-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.95)]"
                              : "bg-rose-400 ring-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.95)]"
                          )}
                        />
                        <span className="text-xs font-serif font-bold tracking-tight whitespace-nowrap">
                          {callingStatus.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Middle Section: Linked Student Case(s) (Parent of) */}
                <div
                  className={cn(
                    "p-3 sm:p-3.5 rounded-2xl border transition-all select-none",
                    isLight
                      ? "bg-[#EFE4CA]/80 border-[#C7B594] shadow-xs"
                      : "bg-[#07172C]/75 border-[#182C48] shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <LinkIcon className="h-4 w-4 text-[#D4AF37]" />
                      <span
                        className={cn(
                          "font-serif text-xs font-bold uppercase tracking-wider",
                          isLight ? "text-[#3D2908]" : "text-[#FCE09E]"
                        )}
                      >
                        Parent of
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLocation("/students")}
                      className={cn(
                        "text-[11px] font-serif font-semibold underline cursor-pointer",
                        isLight ? "text-[#785412] hover:text-[#2E1D02]" : "text-[#D4AF37] hover:text-white"
                      )}
                    >
                      All Students
                    </button>
                  </div>

                  {dossierStudents.length > 0 ? (
                    <div className="space-y-1.5">
                      {dossierStudents.map((student) => (
                        <div
                          key={student.id}
                          onClick={() => setLocation(`/contacts/${student.id}`)}
                          className={cn(
                            "flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer group",
                            isLight
                              ? "bg-[#F8EFE0] hover:bg-[#FFF8ED] border-[#D1BE9B]"
                              : "bg-[#040E1E]/90 hover:bg-[#091D38] border-[#1E375C]"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center font-serif font-bold text-xs border shrink-0",
                                isLight
                                  ? "bg-[#D9C49D] text-[#2E1E05] border-[#A88C56]"
                                  : "bg-[#0A233D] text-[#93C5FD] border-[#1F548A]"
                              )}
                            >
                              {getInitials(student.firstName, student.lastName)}
                            </div>
                            <div>
                              <h5
                                className={cn(
                                  "font-serif text-xs sm:text-sm font-bold leading-tight group-hover:text-[#D4AF37] transition-colors",
                                  isLight ? "text-[#1C1405]" : "text-[#F4E8D3]"
                                )}
                              >
                                {student.firstName} {student.lastName}
                              </h5>
                              <p
                                className={cn(
                                  "text-[10.5px] mt-0.5",
                                  isLight ? "text-[#63533E]" : "text-[#8CA4C4]"
                                )}
                              >
                                Student Case File · Click to Open
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p
                      className={cn(
                        "text-xs italic py-2 text-center",
                        isLight ? "text-[#7B6A53]" : "text-[#7990AF]"
                      )}
                    >
                      No linked student cases recorded for this contact.
                    </p>
                  )}
                </div>

                {/* 3. Activity & Relationship Cards (Spacious 2-column layout so no words or names truncate) */}
                <div className="grid grid-cols-2 gap-2.5 select-none pt-0.5">
                  {/* Card 1: Next Event (Full width: Event, Date, and Student name have plenty of space) */}
                  <div
                    className={cn(
                      "col-span-2 p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[86px]",
                      isLight
                        ? "bg-[#EFE3C8]/80 border-[#C7B594] shadow-xs"
                        : "bg-[#07162C]/80 border-[#182C48] shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                        <span
                          className={cn(
                            "text-[10.5px] font-serif font-bold uppercase tracking-wider",
                            isLight ? "text-[#5C451D]" : "text-[#C7B596]"
                          )}
                        >
                          Next Event
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-serif font-semibold",
                          isLight ? "text-[#785412]" : "text-[#D4AF37]"
                        )}
                      >
                        Oct 14, 2024
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p
                        className={cn(
                          "font-serif text-sm font-bold leading-tight",
                          isLight ? "text-[#1F1505]" : "text-[#FFF2D9]"
                        )}
                      >
                        IEP Meeting
                      </p>
                      {dossierStudents.length > 0 && (
                        <p
                          className={cn(
                            "text-xs font-medium",
                            isLight ? "text-[#785412]" : "text-[#E5C175]"
                          )}
                        >
                          Student: {dossierStudents.map((s) => `${s.firstName} ${s.lastName}`).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Last Contact (Expanded width so date never wraps) */}
                  <div
                    className={cn(
                      "p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[82px]",
                      isLight
                        ? "bg-[#EFE3C8]/80 border-[#C7B594] shadow-xs"
                        : "bg-[#07162C]/80 border-[#182C48] shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                      <span
                        className={cn(
                          "text-[10px] font-serif font-bold uppercase tracking-wider whitespace-nowrap",
                          isLight ? "text-[#5C451D]" : "text-[#C7B596]"
                        )}
                      >
                        Last Contact
                      </span>
                    </div>
                    <div>
                      <p
                        className={cn(
                          "font-serif text-xs sm:text-sm font-bold leading-tight whitespace-nowrap",
                          isLight ? "text-[#1F1505]" : "text-[#FFF2D9]"
                        )}
                      >
                        Sep 28, 2024
                      </p>
                      <p
                        className={cn(
                          "text-[10.5px] mt-0.5",
                          isLight ? "text-[#6B5A45]" : "text-[#8CA4C4]"
                        )}
                      >
                        Email
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Relationship (Expanded width so RELATIONSHIP fits with room to spare) */}
                  <div
                    className={cn(
                      "p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[82px]",
                      isLight
                        ? "bg-[#EFE3C8]/80 border-[#C7B594] shadow-xs"
                        : "bg-[#07162C]/80 border-[#182C48] shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                      <span
                        className={cn(
                          "text-[10px] font-serif font-bold uppercase tracking-wider whitespace-nowrap",
                          isLight ? "text-[#5C451D]" : "text-[#C7B596]"
                        )}
                      >
                        Relationship
                      </span>
                    </div>
                    <div>
                      <p
                        className={cn(
                          "font-serif text-xs sm:text-sm font-bold leading-tight truncate",
                          isLight ? "text-[#1F1505]" : "text-[#FFF2D9]"
                        )}
                      >
                        {dossierContact.jobTitle || (dossierStudents.length > 0 ? "Parent" : "Contact")}
                      </p>
                      <p
                        className={cn(
                          "text-[10.5px] mt-0.5 truncate",
                          isLight ? "text-[#6B5A45]" : "text-[#8CA4C4]"
                        )}
                      >
                        {dossierContact.company && dossierContact.company !== "Test Family"
                          ? dossierContact.company
                          : dossierStudents.length > 0
                          ? "Client Family"
                          : "Waypoint Contact"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center text-center pt-14 sm:pt-20 px-6 select-none">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border mb-3 shadow-xs",
                    isLight
                      ? "bg-[#EAE0CA] border-[#C2AE88] text-[#523F1F]"
                      : "bg-[#091D38]/80 border-[#1E4377] text-[#D4AF37]"
                  )}
                >
                  <Star className="h-5 w-5" />
                </div>
                <p
                  className={cn(
                    "font-serif text-base sm:text-lg font-bold",
                    isLight ? "text-[#3D2908]" : "text-[#FFF0D4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  )}
                >
                  Select a contact
                </p>
                <p
                  className={cn(
                    "text-xs sm:text-[13px] mt-1.5 max-w-xs leading-relaxed",
                    isLight ? "text-[#6B5A45]" : "text-[#A3B8D4]"
                  )}
                >
                  Click any entry from the left directory page to open their full dossier here.
                </p>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* CUSTOM UI ALPHABET THUMB INDEX TABS                                 */}
          {/* 100% UI component: decoupled from background, scales dynamically   */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="w-[5.8%] lg:w-[5.2%] xl:w-[4.8%] h-full pt-[7.8%] lg:pt-[8.5%] pb-[7.5%] lg:pb-[8.2%] pr-0 sm:pr-0.5 translate-x-1.5 sm:translate-x-2 lg:translate-x-2.5 flex flex-col items-stretch justify-between z-20 select-none gap-[1px]">
            {ALPHABET.map((letter) => {
              const isHome = letter === "HOME";
              const isSelected =
                (isHome && selectedLetter === "HOME") ||
                (!isHome && selectedLetter === letter);
              const hasContacts = isHome || availableLetters.has(letter);
              const letterCount = isHome
                ? contacts.filter((c) => matchCategory(c, category)).length
                : contacts.filter(
                    (c) =>
                      matchCategory(c, category) &&
                      (c.lastName || c.firstName || "")
                        .trim()
                        .toUpperCase()
                        .startsWith(letter)
                  ).length;

              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => {
                    setSelectedLetter(isHome ? "HOME" : letter);
                    setMobileTab("directory");
                  }}
                  className={cn(
                    "w-full flex-1 flex items-center justify-center transition-colors duration-150 cursor-pointer font-serif select-none relative group",
                    // Shape: Flat left edge attached directly to the book, curved die-cut right edge
                    "rounded-l-none rounded-r-md sm:rounded-r-lg border-y border-r border-l-0 text-[10px] sm:text-[11px] xl:text-[12px]",
                    // Seam shadow on the left edge so tab appears naturally bound under the page
                    "before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-black/30 before:pointer-events-none",
                    isSelected
                      ? isLight
                        ? "bg-gradient-to-r from-[#D4AF37] via-[#E5BF65] to-[#B89230] text-[#1F1202] font-black border-[#5E420C] shadow-[0_2px_10px_rgba(94,66,12,0.4),inset_0_1px_1px_rgba(255,255,255,0.8)] z-30"
                        : "bg-gradient-to-r from-[#FFE8B3] via-[#F5B544] to-[#C78F2E] text-[#1A0F02] font-black border-[#FFF2D0] shadow-[0_0_14px_rgba(245,181,68,0.75),inset_0_1px_1px_rgba(255,255,255,0.9)] z-30"
                      : isLight
                      ? "bg-[#EFE4CE] hover:bg-[#FFF8EC] border-[#C4B18B] text-[#3B2506] hover:text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                      : "bg-[#091D38] hover:bg-[#12335E] border-[#1E4377] text-[#F3E5CC] hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                  )}
                  title={
                    isHome
                      ? `All Contacts (${contacts.filter((c) => matchCategory(c, category)).length})`
                      : `${letter} (${letterCount} ${
                          letterCount === 1 ? "contact" : "contacts"
                        })`
                  }
                >
                  {isHome ? (
                    <Home className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  ) : (
                    <span
                      className={cn(
                        "transition-colors",
                        isSelected
                          ? "font-black"
                          : hasContacts
                          ? "font-bold text-[#FFF5E0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                          : "font-bold text-[#E2D4BE] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                      )}
                    >
                      {letter}
                    </span>
                  )}

                  {/* Active Indicator Micro-pip inside right edge */}
                  {isSelected && (
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#1A0F02]/80 shadow-xs pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
