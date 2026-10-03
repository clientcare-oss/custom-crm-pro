import React, { useState, useMemo } from "react";
import {
  Search,
  UserPlus,
  Phone,
  MessageSquare,
  ExternalLink,
  MoreHorizontal,
  GraduationCap,
  Calendar,
  Clock,
  X,
  FileText,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getTimeInZone,
  getCallingStatus,
  detectTimeZoneFromLocation,
  getFriendlyTimeZoneName,
} from "@shared/timezones";

export interface ContactItem {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  status: "Client" | "Lead" | "Prospect" | string;
  studentName?: string | null;
  parentName?: string | null;
  assignedAdvocate?: string | null;
  nextAppointment?: string | null;
  notes?: string | null;
  timeZone?: string | null;
  preferredCallingStartTime?: string | null;
  preferredCallingEndTime?: string | null;
}

interface ContactLookupSectionProps {
  contacts: ContactItem[];
  isLoading?: boolean;
  onAddNewContact: () => void;
  onCallInQuo: (contact: ContactItem) => void;
  onOpenSms: (contact: ContactItem) => void;
  onPrefillIntake?: (contact: ContactItem) => void;
  onScheduleAppointment?: (contact: ContactItem) => void;
}

export function ContactLookupSection({
  contacts,
  isLoading = false,
  onAddNewContact,
  onCallInQuo,
  onOpenSms,
  onPrefillIntake,
  onScheduleAppointment,
}: ContactLookupSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
  const [sortByBestTime, setSortByBestTime] = useState(false);

  const filteredContacts = useMemo(() => {
    const list = contacts.filter((c) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.city && c.city.toLowerCase().includes(term)) ||
        (c.studentName && c.studentName.toLowerCase().includes(term))
      );
    });

    if (sortByBestTime) {
      list.sort((a, b) => {
        const tzA = a.timeZone || detectTimeZoneFromLocation(a.city || undefined, a.state || undefined).timeZone;
        const tzB = b.timeZone || detectTimeZoneFromLocation(b.city || undefined, b.state || undefined).timeZone;
        const statusA = getCallingStatus(tzA, { preferredStart: a.preferredCallingStartTime, preferredEnd: a.preferredCallingEndTime });
        const statusB = getCallingStatus(tzB, { preferredStart: b.preferredCallingStartTime, preferredEnd: b.preferredCallingEndTime });
        const rank = (s: string) => (s === "green" ? 1 : s === "yellow" ? 2 : 3);
        return rank(statusA.status) - rank(statusB.status);
      });
    }

    return list;
  }, [contacts, searchTerm, sortByBestTime]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Client":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            Client
          </Badge>
        );
      case "Lead":
        return (
          <Badge className="bg-[#C5A059]/15 text-[#FFE394] border border-[#C5A059]/40 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            Lead
          </Badge>
        );
      case "Prospect":
      default:
        return (
          <Badge className="bg-[#020A17] text-[#C6B697] border border-[#3A2C18] text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            Prospect
          </Badge>
        );
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
      {/* Header with Title and + Add New Contact */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5 text-[#FFF4D4] font-serif font-bold text-base tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#C5A059]">
            <Search className="h-4 w-4" />
          </div>
          <span>Contact Lookup</span>
        </div>
        <Button
          onClick={onAddNewContact}
          variant="outline"
          size="sm"
          className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs font-semibold gap-1.5 h-8 rounded-xl transition-colors cursor-pointer"
        >
          <UserPlus className="h-3.5 w-3.5 text-[#C5A059]" />
          Add New Contact
        </Button>
      </div>

      {/* Search Bar with Warm Gold Action */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7A58]" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, email, or student name..."
            className="pl-9.5 pr-4 py-2 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#8C7A58] rounded-xl focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/50 text-sm h-10 transition-colors"
          />
        </div>
        <Button
          onClick={() => {
            if (filteredContacts.length === 0) {
              toast.info("No matching contact found");
            }
          }}
          className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold px-4 h-10 rounded-xl gap-1.5 text-xs sm:text-sm border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-110 cursor-pointer"
        >
          <Search className="h-4 w-4" />
          Search
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => setSortByBestTime((prev) => !prev)}
          className={cn(
            "h-10 px-3.5 rounded-xl gap-1.5 text-xs font-semibold border transition-all cursor-pointer",
            sortByBestTime
              ? "bg-[#C5A059] border-[#FFE394] text-[#07162B] font-bold shadow-md shadow-[#C5A059]/20"
              : "border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B]"
          )}
          title="Order contacts by safe calling window"
        >
          <Clock className={cn("w-4 h-4", sortByBestTime ? "text-[#07162B]" : "text-[#C5A059]")} />
          <span className="hidden sm:inline">Best Time to Call</span>
        </Button>
      </div>

      {/* Inline Selected Contact Snapshot Workspace */}
      {selectedContact && (
        <div className="p-4 rounded-xl bg-[#020A17]/90 border border-[#C5A059]/40 space-y-3 relative shadow-[0_6px_20px_rgba(0,0,0,0.7)] animate-in fade-in">
          <button
            onClick={() => setSelectedContact(null)}
            className="absolute top-3 right-3 text-[#A69371] hover:text-[#FFF4D4] p-1 rounded-lg hover:bg-[#07162B] border border-transparent hover:border-[#3A2C18] transition-colors"
            title="Close Snapshot"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 rounded-xl bg-[#07162B] border border-[#C5A059]/50 text-[#FFE394] font-bold text-sm">
              <AvatarFallback className="bg-[#07162B] text-[#FFE394] font-serif font-bold">
                {getInitials(selectedContact.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-serif text-base font-bold text-[#FFF4D4]">{selectedContact.name}</span>
                {getStatusBadge(selectedContact.status)}
                {selectedContact.city && (
                  <span className="text-xs text-[#C6B697]">
                    • {selectedContact.city}{selectedContact.state ? `, ${selectedContact.state}` : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#C6B697] mt-1 flex-wrap">
                {selectedContact.phone && (
                  <span className="font-mono text-[#FFE394]">{selectedContact.phone}</span>
                )}
                {selectedContact.email && (
                  <span className="text-[#A69371]">{selectedContact.email}</span>
                )}
                {selectedContact.studentName && (
                  <span className="flex items-center gap-1 text-[#FAD77B]">
                    <GraduationCap className="h-3 w-3" />
                    Student: {selectedContact.studentName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Snapshot Action Bar */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#3A2C18]/60 flex-wrap">
            <Button
              size="sm"
              onClick={() => onCallInQuo(selectedContact)}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold h-7 px-3 text-xs gap-1.5 rounded-lg border border-[#FFE394]/40 hover:brightness-110 cursor-pointer"
            >
              <Phone className="h-3.5 w-3.5 fill-current" />
              Call in Quo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenSms(selectedContact)}
              className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] h-7 px-3 text-xs gap-1.5 rounded-lg cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 text-[#C5A059]" />
              Text
            </Button>
            {onScheduleAppointment && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onScheduleAppointment(selectedContact)}
                className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] h-7 px-3 text-xs gap-1.5 rounded-lg cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-[#C5A059]" />
                Schedule
              </Button>
            )}
            {onPrefillIntake && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onPrefillIntake(selectedContact);
                  toast.success("Contact information prefilled into Call Intake");
                }}
                className="border border-[#C5A059]/40 bg-[#07162B] text-[#FFE394] hover:bg-[#C5A059]/20 h-7 px-3 text-xs gap-1.5 rounded-lg ml-auto cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                Prefill Intake
              </Button>
            )}
            <a
              href={`/contacts/${selectedContact.id}`}
              className="text-xs text-[#C5A059] hover:text-[#FFE394] underline font-medium flex items-center gap-1 ml-2 transition-colors"
            >
              Full Record <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Recent Contacts List */}
      <div>
        <div className="text-xs font-semibold text-[#A69371] uppercase tracking-wider mb-2 font-mono">
          Recent Contacts
        </div>

        <div className="space-y-2">
          {filteredContacts.slice(0, 4).map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[#020A17]/85 border border-[#3A2C18] hover:border-[#C5A059]/60 transition-all flex-wrap gap-2 shadow-inner"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 rounded-lg bg-[#07162B] border border-[#3A2C18] text-[#FFE394] font-serif font-bold text-xs flex-shrink-0">
                  <AvatarFallback className="bg-[#07162B] text-[#FFE394] font-serif font-bold">
                    {getInitials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm font-bold text-[#FFF4D4] truncate">{c.name}</span>
                  </div>
                  <div className="text-xs text-[#C6B697] truncate flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="font-mono text-[#D8C7A5]">{c.phone || "No phone"}</span>
                    {c.city && <span>• {c.city}{c.state ? `, ${c.state}` : ""}</span>}
                    {(() => {
                      const detected = detectTimeZoneFromLocation(c.city || undefined, c.state || undefined).timeZone;
                      const tz = c.timeZone || detected;
                      const timeInfo = getTimeInZone(tz);
                      const calling = getCallingStatus(tz, {
                        preferredStart: c.preferredCallingStartTime,
                        preferredEnd: c.preferredCallingEndTime,
                      });
                      return (
                        <span className="inline-flex items-center gap-1 text-[11px] ml-1 bg-[#05142B] px-1.5 py-0.5 rounded border border-[#3A2C18]">
                          <Clock className="w-3 h-3 text-[#C5A059]" />
                          <span className="font-mono font-medium text-[#FFF4D4]">{timeInfo.timeString}</span>
                          <span className="text-[#A69371]">({getFriendlyTimeZoneName(tz)})</span>
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              calling.status === "green"
                                ? "bg-emerald-400"
                                : calling.status === "yellow"
                                ? "bg-amber-400"
                                : "bg-rose-400"
                            )}
                          />
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <div className="hidden sm:block">
                  {getStatusBadge(c.status)}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedContact(c)}
                  className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-8 px-2.5 rounded-lg gap-1 cursor-pointer transition-colors"
                >
                  <MessageSquare className="h-3 w-3 text-[#C5A059]" />
                  Open
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCallInQuo(c)}
                  className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-8 px-2.5 rounded-lg gap-1 cursor-pointer transition-colors"
                >
                  <Phone className="h-3 w-3 text-[#C5A059]" />
                  Call in Quo
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenSms(c)}
                  className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-8 px-2.5 rounded-lg gap-1 cursor-pointer transition-colors"
                >
                  <Send className="h-3 w-3 text-[#C5A059]" />
                  Text
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#07162B] rounded-lg cursor-pointer"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
                    <DropdownMenuItem
                      className="focus:bg-[#020A17] focus:text-[#FFE394] cursor-pointer"
                      onClick={() => {
                        if (c.phone) {
                          navigator.clipboard.writeText(c.phone);
                          toast.success("Phone number copied");
                        }
                      }}
                    >
                      Copy Phone Number
                    </DropdownMenuItem>
                    {onPrefillIntake && (
                      <DropdownMenuItem
                        className="focus:bg-[#020A17] focus:text-[#FFE394] cursor-pointer"
                        onClick={() => onPrefillIntake(c)}
                      >
                        Prefill into Call Intake
                      </DropdownMenuItem>
                    )}
                    {onScheduleAppointment && (
                      <DropdownMenuItem
                        className="focus:bg-[#020A17] focus:text-[#FFE394] cursor-pointer"
                        onClick={() => onScheduleAppointment(c)}
                      >
                        Schedule Appointment
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-[#3A2C18]" />
                    <DropdownMenuItem
                      className="focus:bg-[#020A17] focus:text-[#FFE394] cursor-pointer"
                      onClick={() => {
                        window.location.href = `/contacts/${c.id}`;
                      }}
                    >
                      Open Full CRM Record
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ContactLookupSection;
