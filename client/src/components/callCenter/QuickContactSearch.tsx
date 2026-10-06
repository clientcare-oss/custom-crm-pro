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
      {/* Search Bar Input Pill */}
      <div className="flex items-center gap-2 bg-[#020A17]/85 border border-[#8C6418]/50 hover:border-[#C5A059] focus-within:border-[#FFE394] focus-within:shadow-[0_0_12px_rgba(245,216,138,0.3)] shadow-inner rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 w-44 sm:w-64 md:w-72 transition-all">
        <Search className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
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
          className="bg-transparent text-xs text-[#FFF4D4] placeholder:text-[#A69371]/80 outline-none w-full min-w-0"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="text-[#A69371] hover:text-[#FFF4D4] p-0.5 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <kbd className="hidden md:inline-block text-[9px] uppercase px-1.5 py-0.2 rounded border border-[#8C6418]/40 bg-[#07162B] text-[#A69371] font-mono">
            /
          </kbd>
        )}
      </div>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[340px] sm:w-[420px] max-w-[90vw] bg-[#030D1A]/98 border border-[#8C6418]/70 rounded-2xl shadow-[0_16px_36px_rgba(0,0,0,0.95),0_0_20px_rgba(197,160,89,0.15)] overflow-hidden backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Bar with 'Go to Phone Book' Button */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#3A2C18] bg-[#020A17]/90">
            <span className="text-[11px] font-semibold text-[#A69371] uppercase tracking-wider">
              {query ? `Contacts matching "${query}"` : "Recent Contacts"}
            </span>

            {/* Go to Phone Book Option */}
            <button
              type="button"
              onClick={handlePhoneBookClick}
              className="flex items-center gap-1.5 text-xs font-bold text-[#FFE394] hover:text-[#FFF4D4] bg-[#05142B] hover:bg-[#07162B] border border-[#8C6418]/60 px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer group"
            >
              <BookUser className="h-3.5 w-3.5 text-[#C5A059] group-hover:scale-110 transition-transform" />
              <span>Go to Phone Book</span>
              <ArrowRight className="h-3 w-3 text-[#A69371] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Results List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-[#3A2C18]/50 p-1">
            {filtered.length > 0 ? (
              filtered.map((c) => {
                const approval = getCallingApprovalStatus(c);
                const hasPhone = Boolean(c.phone);

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className="p-3 hover:bg-[#07162B] transition-colors rounded-xl cursor-pointer group space-y-1.5"
                  >
                    {/* Top Row: Name + Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#020A17] border border-[#8C6418]/50 flex items-center justify-center text-[#FFE394] shrink-0 font-bold text-xs">
                          {c.name ? c.name[0] : <User className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-serif font-bold text-sm text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors truncate block">
                            {c.name}
                          </span>
                          {c.studentName && (
                            <span className="text-[11px] text-[#C6B697] truncate block">
                              Student: <strong className="text-[#FFE394]">{c.studentName}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {c.status && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#8C6418]/40 bg-[#020A17] text-[#D8C7A5] shrink-0">
                          {c.status}
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Phone Number */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <div className="flex items-center gap-1.5 text-[#E5C175] font-mono">
                        <Phone className="h-3.5 w-3.5 text-[#C5A059]" />
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
                          className="h-6 px-2 text-[11px] font-bold text-[#07162B] bg-gradient-to-r from-[#DFBE77] to-[#C5A059] hover:brightness-110 rounded-md border border-[#FFE394]/50 cursor-pointer shadow-xs gap-1"
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
                            ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                            : "bg-[#020A17]/80 border-[#8C6418]/40 text-[#FFE394]"
                        }`}
                      >
                        <Clock className={`h-3 w-3 shrink-0 ${approval.isInWindow ? "text-emerald-400" : "text-[#C5A059]"}`} />
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
                <p className="text-xs text-[#C6B697]">
                  No contacts found matching &ldquo;{query}&rdquo;
                </p>
                <Button
                  size="sm"
                  onClick={handlePhoneBookClick}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs rounded-xl border border-[#FFE394]/50 shadow-md gap-1.5 cursor-pointer"
                >
                  <BookUser className="h-3.5 w-3.5" />
                  <span>Browse Full Phone Book</span>
                </Button>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2 border-t border-[#3A2C18] bg-[#020A17] flex items-center justify-between text-[11px]">
            <span className="text-[#A69371] px-1">
              Press <strong>Esc</strong> to close
            </span>
            <button
              type="button"
              onClick={handlePhoneBookClick}
              className="text-[#FFE394] hover:text-[#FFF4D4] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
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
