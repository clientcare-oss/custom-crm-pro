import React, { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Search, Phone, Clock, User, X, BookUser, ExternalLink, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SearchContactItem {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  studentName?: string | null;
  parentName?: string | null;
  preferredCallingStartTime?: string | null;
  preferredCallingEndTime?: string | null;
  preferredCallingDays?: string | null;
  confirmedTimeZone?: string | null;
  mayCallOutsidePreferredHours?: boolean | null;
}

interface QuickContactSearchProps {
  contacts: SearchContactItem[];
  onSelectContact?: (contact: SearchContactItem) => void;
  onCallContact?: (phone: string, name?: string) => void;
  onGoToPhoneBook?: () => void;
}

/**
 * Evaluates whether current local time is within contact's approved calling window
 */
function getCallingApprovalStatus(contact: SearchContactItem) {
  const startTime = contact.preferredCallingStartTime || "09:00";
  const endTime = contact.preferredCallingEndTime || "17:00";
  const timeZone = contact.confirmedTimeZone || "EST";
  const days = contact.preferredCallingDays || "Mon–Fri";

  // Parse hours
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeVal = currentHour * 60 + currentMinute;

  const parseTimeToMinutes = (timeStr: string) => {
    const clean = timeStr.trim().toLowerCase();
    const isPM = clean.includes("pm");
    const isAM = clean.includes("am");
    const digits = clean.replace(/[^0-9:]/g, "").split(":");
    let h = parseInt(digits[0], 10) || 0;
    const m = parseInt(digits[1], 10) || 0;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + m;
  };

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  const isInWindow = currentTimeVal >= startMinutes && currentTimeVal <= endMinutes;

  // Format human-friendly display
  const formatHourString = (str: string) => {
    if (str.toLowerCase().includes("am") || str.toLowerCase().includes("pm")) {
      return str;
    }
    const [hStr, mStr] = str.split(":");
    let h = parseInt(hStr, 10) || 9;
    const m = mStr ? `:${mStr}` : ":00";
    const ampm = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}${m} ${ampm}`;
  };

  const displayWindow = `${formatHourString(startTime)} – ${formatHourString(endTime)} (${timeZone})`;

  return {
    isInWindow,
    displayWindow,
    days,
    timeZone,
  };
}

export function QuickContactSearch({
  contacts = [],
  onSelectContact,
  onCallContact,
  onGoToPhoneBook,
}: QuickContactSearchProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter contacts
  const filtered = useMemo(() => {
    if (!query.trim()) return contacts.slice(0, 6);
    const q = query.toLowerCase().trim();
    return contacts
      .filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(q);
        const phoneMatch = c.phone?.toLowerCase().includes(q);
        const studentMatch = c.studentName?.toLowerCase().includes(q);
        const emailMatch = c.email?.toLowerCase().includes(q);
        return nameMatch || phoneMatch || studentMatch || emailMatch;
      })
      .slice(0, 8);
  }, [contacts, query]);

  const handleSelect = (contact: SearchContactItem) => {
    onSelectContact?.(contact);
    setIsOpen(false);
    setQuery("");
  };

  const handlePhoneBookClick = () => {
    setIsOpen(false);
    if (onGoToPhoneBook) {
      onGoToPhoneBook();
    } else {
      setLocation("/contacts");
    }
  };

  return (
    <div ref={containerRef} className="relative z-50">
      {/* Sculpted Admiralty Search Bar Pill */}
      <div className="adm-input-field flex items-center gap-2 rounded-xl px-3 py-1.5 w-44 sm:w-64 md:w-72">
        <Search className="h-3.5 w-3.5 text-[#ECC97B] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Quick find contact..."
          className="bg-transparent text-xs text-[#FAF6EC] placeholder:text-[#9FB1C8]/75 outline-none w-full min-w-0"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="text-[#9FB1C8] hover:text-[#FAF6EC] p-0.5 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <kbd className="hidden md:inline-block text-[9px] uppercase px-1.5 py-0.2 rounded border border-[#8a7052]/55 bg-[#09182c] text-[#E9CFA0] font-mono">
            /
          </kbd>
        )}
      </div>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div className="adm-cal-dropdown absolute top-full left-0 mt-2 w-[340px] sm:w-[420px] max-w-[90vw] rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Bar with 'Go to Phone Book' Button */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#8a7052]/40 bg-[#071324]/90">
            <span className="text-[11px] font-semibold text-[#E9CFA0] uppercase tracking-wider">
              {query ? `Contacts matching "${query}"` : "Recent Contacts"}
            </span>

            {/* Go to Phone Book Option */}
            <button
              type="button"
              onClick={handlePhoneBookClick}
              className="adm-cal-pill flex items-center gap-1.5 text-xs font-bold text-[#ECC97B] hover:text-[#FAF6EC] px-2.5 py-1 rounded-lg cursor-pointer group"
            >
              <BookUser className="h-3.5 w-3.5 text-[#ECC97B] group-hover:scale-110 transition-transform" />
              <span>Go to Phone Book</span>
              <ArrowRight className="h-3 w-3 text-[#C6B697] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Results List */}
          <div className="max-h-[360px] overflow-y-auto space-y-1.5 p-2">
            {filtered.length > 0 ? (
              filtered.map((c) => {
                const approval = getCallingApprovalStatus(c);
                const hasPhone = Boolean(c.phone);

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className="adm-inset-row p-3 rounded-xl cursor-pointer group space-y-1.5"
                  >
                    {/* Top Row: Name + Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="adm-icon-tile w-7 h-7 rounded-lg flex items-center justify-center text-[#ECC97B] shrink-0 font-bold text-xs">
                          {c.name ? c.name[0] : <User className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-serif font-bold text-sm text-[#FAF6EC] group-hover:text-[#FFF5DC] transition-colors truncate block">
                            {c.name}
                          </span>
                          {c.studentName && (
                            <span className="text-[11px] text-[#C6D4E6] truncate block">
                              Student: <strong className="text-[#ECC97B]">{c.studentName}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {c.status && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#8a7052]/55 bg-[#061224] text-[#E9CFA0] shrink-0">
                          {c.status}
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Phone Number */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <div className="flex items-center gap-1.5 text-[#E5C175] font-mono">
                        <Phone className="h-3.5 w-3.5 text-[#ECC97B]" />
                        <span>{c.phone || "No phone listed"}</span>
                      </div>

                      {hasPhone && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (c.phone) onCallContact?.(c.phone, c.name);
                          }}
                          className="adm-cal-pill-active h-6 px-2.5 text-[11px] font-bold rounded-md cursor-pointer gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          <span>Call</span>
                        </Button>
                      )}
                    </div>

                    {/* Bottom Row: Approval Time to Call */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <div
                        className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border w-full ${
                          approval.isInWindow
                            ? "bg-emerald-950/45 border-emerald-500/35 text-emerald-300"
                            : "bg-[#050e1c]/90 border-[#8a7052]/45 text-[#E9CFA0]"
                        }`}
                      >
                        <Clock className={`h-3 w-3 shrink-0 ${approval.isInWindow ? "text-emerald-400" : "text-[#ECC97B]"}`} />
                        <span className="truncate">
                          <strong>Approved to Call:</strong> {approval.displayWindow}
                        </span>
                        <span className="ml-auto shrink-0 flex items-center gap-1">
                          {approval.isInWindow ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-[10px] text-emerald-400 font-bold uppercase">Open</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span className="text-[10px] text-amber-300 font-bold uppercase">Off-Hours</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-5 text-center space-y-2">
                <p className="text-xs text-[#C6D4E6]">
                  No contacts found matching &ldquo;{query}&rdquo;
                </p>
                <Button
                  size="sm"
                  onClick={handlePhoneBookClick}
                  className="adm-cal-pill-active font-bold text-xs rounded-xl gap-1.5 cursor-pointer"
                >
                  <BookUser className="h-3.5 w-3.5" />
                  <span>Browse Full Phone Book</span>
                </Button>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 border-t border-[#8a7052]/40 bg-[#061121] flex items-center justify-between text-[11px]">
            <span className="text-[#9FB1C8] px-1">
              Press <strong>Esc</strong> to close
            </span>
            <button
              type="button"
              onClick={handlePhoneBookClick}
              className="text-[#ECC97B] hover:text-[#FAF6EC] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Open Phone Book Directory</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickContactSearch;
