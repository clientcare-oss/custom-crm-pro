import React, { useState } from "react";
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
  CheckCircle2,
  X,
  FileText,
  UserCheck,
  Send,
  Sparkles,
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

  const filteredContacts = contacts.filter((c) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Client":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            Client
          </Badge>
        );
      case "Lead":
        return (
          <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            Lead
          </Badge>
        );
      case "Prospect":
      default:
        return (
          <Badge className="bg-slate-700/40 text-slate-300 border-slate-600 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
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
    <div className="rounded-2xl bg-[#061830] border border-sky-500/20 p-5 space-y-4 shadow-sm">
      {/* Header with Title and + Add New Contact */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-white font-bold text-base tracking-tight">
          <Search className="h-4.5 w-4.5 text-sky-400" />
          <span>Contact Lookup</span>
        </div>
        <Button
          onClick={onAddNewContact}
          variant="outline"
          size="sm"
          className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 hover:text-white text-xs font-semibold gap-1.5 h-8 rounded-xl"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add New Contact
        </Button>
      </div>

      {/* Search Bar with Gold Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, email, or client ID..."
            className="pl-9.5 pr-4 py-2 bg-[#040D1A] border-slate-800 text-white placeholder:text-slate-500 rounded-xl focus:border-amber-400 text-sm h-10"
          />
        </div>
        <Button
          onClick={() => {
            if (filteredContacts.length === 0) {
              toast.info("No matching contact found");
            }
          }}
          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-4 h-10 rounded-xl gap-1.5 text-xs sm:text-sm"
        >
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {/* Inline Selected Contact Snapshot Workspace */}
      {selectedContact && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#092244] to-[#0a2750] border border-sky-400/40 space-y-3 relative shadow-md">
          <button
            onClick={() => setSelectedContact(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            title="Close Snapshot"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 font-bold text-sm">
              <AvatarFallback className="bg-[#040D1A] text-amber-400 font-bold">
                {getInitials(selectedContact.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-white">{selectedContact.name}</span>
                {getStatusBadge(selectedContact.status)}
                {selectedContact.city && (
                  <span className="text-xs text-slate-300">
                    • {selectedContact.city}{selectedContact.state ? `, ${selectedContact.state}` : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap">
                {selectedContact.phone && (
                  <span className="font-mono text-sky-300">{selectedContact.phone}</span>
                )}
                {selectedContact.email && (
                  <span className="text-slate-400">{selectedContact.email}</span>
                )}
                {selectedContact.studentName && (
                  <span className="flex items-center gap-1 text-amber-300">
                    <GraduationCap className="h-3 w-3" />
                    Student: {selectedContact.studentName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Snapshot Action Bar */}
          <div className="flex items-center gap-2 pt-2 border-t border-sky-500/20 flex-wrap">
            <Button
              size="sm"
              onClick={() => onCallInQuo(selectedContact)}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold h-7 px-3 text-xs gap-1.5 rounded-lg"
            >
              <Phone className="h-3.5 w-3.5 fill-current" />
              Call in Quo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenSms(selectedContact)}
              className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 h-7 px-3 text-xs gap-1.5 rounded-lg"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Text
            </Button>
            {onScheduleAppointment && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onScheduleAppointment(selectedContact)}
                className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 h-7 px-3 text-xs gap-1.5 rounded-lg"
              >
                <Calendar className="h-3.5 w-3.5" />
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
                className="border-amber-400/30 text-amber-300 hover:bg-amber-400/10 h-7 px-3 text-xs gap-1.5 rounded-lg ml-auto"
              >
                <FileText className="h-3.5 w-3.5" />
                Prefill Intake
              </Button>
            )}
            <a
              href={`/contacts/${selectedContact.id}`}
              className="text-xs text-sky-400 hover:text-sky-300 underline font-medium flex items-center gap-1 ml-2"
            >
              Full Record <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Recent Contacts List */}
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Recent Contacts
        </div>

        <div className="space-y-2">
          {filteredContacts.slice(0, 4).map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[#040D1A]/70 border border-slate-800 hover:border-sky-500/30 transition-all flex-wrap gap-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 rounded-lg bg-[#092244] border border-sky-400/20 text-sky-300 font-bold text-xs flex-shrink-0">
                  <AvatarFallback className="bg-[#092244] text-sky-300 font-bold">
                    {getInitials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{c.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                    <span className="font-mono text-slate-300">{c.phone || "No phone"}</span>
                    {c.city && <span>• {c.city}{c.state ? `, ${c.state}` : ""}</span>}
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons matching reference mockup */}
              <div className="flex items-center gap-2 ml-auto">
                <div className="hidden sm:block">
                  {getStatusBadge(c.status)}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedContact(c)}
                  className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs h-8 px-2.5 rounded-lg gap-1"
                >
                  <MessageSquare className="h-3 w-3" />
                  Open
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCallInQuo(c)}
                  className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs h-8 px-2.5 rounded-lg gap-1"
                >
                  <Phone className="h-3 w-3" />
                  Call in Quo
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenSms(c)}
                  className="border-sky-500/30 text-sky-300 hover:bg-sky-500/10 text-xs h-8 px-2.5 rounded-lg gap-1"
                >
                  <Send className="h-3 w-3" />
                  Text
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white rounded-lg"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#061830] border-slate-700 text-slate-100">
                    <DropdownMenuItem
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
                      <DropdownMenuItem onClick={() => onPrefillIntake(c)}>
                        Prefill into Call Intake
                      </DropdownMenuItem>
                    )}
                    {onScheduleAppointment && (
                      <DropdownMenuItem onClick={() => onScheduleAppointment(c)}>
                        Schedule Appointment
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DropdownMenuItem
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
