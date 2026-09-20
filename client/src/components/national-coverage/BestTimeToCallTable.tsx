import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Phone,
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapClientItem } from "./USCoverageMap";

interface BestTimeToCallTableProps {
  clients: MapClientItem[];
  onCallClient?: (client: MapClientItem) => void;
  onScheduleCall?: (client: MapClientItem) => void;
  onOpenWorkspace?: (clientId: number) => void;
}

export function BestTimeToCallTable({
  clients,
  onCallClient,
  onScheduleCall,
  onOpenWorkspace,
}: BestTimeToCallTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"best" | "name" | "time">("best");

  const filteredAndSorted = useMemo(() => {
    let list = clients.filter((c) => {
      if (statusFilter !== "all" && c.callingStatus !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q) || (c.studentName || "").toLowerCase().includes(q);
        const matchesLocation = c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q) || c.timeZoneName.toLowerCase().includes(q);
        if (!matchesName && !matchesLocation) return false;
      }
      return true;
    });

    if (sortOrder === "best") {
      list.sort((a, b) => {
        const rank = (c: MapClientItem) => {
          if (c.callingStatus === "green") return 1;
          if (c.callingStatus === "yellow") return 2;
          return 3;
        };
        return rank(a) - rank(b);
      });
    } else if (sortOrder === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === "time") {
      list.sort((a, b) => a.diffHours - b.diffHours);
    }

    return list;
  }, [clients, searchQuery, statusFilter, sortOrder]);

  return (
    <div className="w-full rounded-2xl bg-[#07162B]/85 border border-slate-800/80 p-5 shadow-2xl backdrop-blur-md">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
            <Phone className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Best Time to Call
            </h3>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-medium italic">
          Respect time zones. Build stronger relationships.
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter clients by name, city, or state..."
            className="pl-9 h-9 text-xs bg-slate-900/80 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter buttons */}
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium",
                statusFilter === "all" ? "bg-sky-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              )}
            >
              All ({clients.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("green")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5",
                statusFilter === "green" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Good to Call
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("yellow")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5",
                statusFilter === "yellow" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Discretion
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("red")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5",
                statusFilter === "red" ? "bg-rose-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Off Hours
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0a1c36]/90 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3 px-4">Client</th>
              <th className="py-3 px-4">Location (Time Zone)</th>
              <th className="py-3 px-4">Client Local Time</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Recommendation</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No clients match the current filter criteria.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((client) => {
                const statusColor =
                  client.callingStatus === "green"
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                    : client.callingStatus === "yellow"
                    ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                    : "text-rose-400 bg-rose-500/10 border-rose-500/30";

                const dotColor =
                  client.callingStatus === "green"
                    ? "bg-emerald-400"
                    : client.callingStatus === "yellow"
                    ? "bg-amber-400"
                    : "bg-rose-400";

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-900/70 transition-colors group"
                  >
                    {/* Client Name */}
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{client.studentName || client.name}</span>
                        {client.hasMeetingToday && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" title="Meeting Today" />
                        )}
                      </div>
                    </td>

                    {/* Location & Time Zone */}
                    <td className="py-3 px-4 text-slate-300">
                      {client.city}, {client.state} ({client.timeZoneName})
                    </td>

                    {/* Local Time */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {client.localTime}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                          statusColor
                        )}
                      >
                        <span className={cn("w-2 h-2 rounded-full", dotColor)} />
                        {client.callingStatusLabel}
                      </span>
                    </td>

                    {/* Recommendation */}
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {client.recommendation}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                        {onCallClient && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onCallClient(client)}
                            className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 gap-1"
                            title="Call in Call Center"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Call</span>
                          </Button>
                        )}
                        {onScheduleCall && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onScheduleCall(client)}
                            className="h-7 px-2 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/30 gap-1"
                            title="Schedule Call"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Schedule</span>
                          </Button>
                        )}
                        {onOpenWorkspace && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onOpenWorkspace(client.id)}
                            className="h-7 px-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Open Student Workspace"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
