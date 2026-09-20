import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MapClientItem } from "./USCoverageMap";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  MapPin,
  RefreshCw,
  ExternalLink,
  Edit3,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface LocationRepairQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: MapClientItem[];
  onLocationRepaired?: () => void;
}

export function LocationRepairQueueModal({
  isOpen,
  onClose,
  clients,
  onLocationRepaired,
}: LocationRepairQueueModalProps) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Selected client for inline quick repair
  const [editingClient, setEditingClient] = useState<MapClientItem | null>(null);
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editZip, setEditZip] = useState("");

  // Mutations
  const recalculateMutation = trpc.nationalCoverage.recalculateContactLocation.useMutation({
    onSuccess: () => {
      toast.success("Location recalculated successfully");
      utils.nationalCoverage.getOverview.invalidate();
      onLocationRepaired?.();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to recalculate location");
    },
  });

  const updateLocationMutation = trpc.nationalCoverage.updateClientLocation.useMutation({
    onSuccess: () => {
      toast.success("Client location updated and geocoded!");
      setEditingClient(null);
      utils.nationalCoverage.getOverview.invalidate();
      onLocationRepaired?.();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update location");
    },
  });

  const handleStartEdit = (client: MapClientItem) => {
    setEditingClient(client);
    setEditCity(client.city || "");
    setEditState(client.state || "");
    setEditZip(client.zipCode || "");
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    await updateLocationMutation.mutateAsync({
      clientId: editingClient.id,
      city: editCity.trim(),
      state: editState.trim(),
      zipCode: editZip.trim() || undefined,
    });
  };

  const handleRecalculate = async (clientId: number) => {
    await recalculateMutation.mutateAsync({ contactId: clientId });
  };

  const handleOpenClient = (clientId: number) => {
    onClose();
    setLocation(`/contacts/${clientId}`);
  };

  // Determine what information is missing (City location is all we need!)
  const getMissingReason = (c: MapClientItem) => {
    const missing: string[] = [];
    if (!c.city?.trim()) missing.push("City");
    if (!c.state?.trim()) missing.push("State");
    if (missing.length === 0) return "Ready for Centroid";
    return `Missing: ${missing.join(", ")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#031326] border border-[#174275] text-white p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <DialogTitle className="text-lg font-bold text-white tracking-wide">
              Clients Needing Location ({clients.length})
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            City location is all we need — full street addresses are never collected, required, or transmitted.
            Enter a city and state to establish a geographic centroid and position this client on the map.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Edit Overlay */}
        {editingClient && (
          <div className="rounded-xl bg-slate-900/90 border border-sky-500/50 p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400">
                Repair Location: {editingClient.studentName || editingClient.name}
              </span>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">City</label>
                <Input
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="e.g. Kennesaw"
                  className="bg-slate-950 border-slate-700 text-xs h-8 text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">State</label>
                <Input
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  placeholder="e.g. GA"
                  className="bg-slate-950 border-slate-700 text-xs h-8 text-white uppercase"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">ZIP Code (Optional)</label>
                <Input
                  value={editZip}
                  onChange={(e) => setEditZip(e.target.value)}
                  placeholder="e.g. 30144 (Optional)"
                  className="bg-slate-950 border-slate-700 text-xs h-8 text-white"
                  maxLength={5}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditingClient(null)}
                className="h-8 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEdit}
                disabled={updateLocationMutation.isPending}
                className="h-8 text-xs bg-sky-600 hover:bg-sky-500 text-white font-semibold"
              >
                {updateLocationMutation.isPending ? "Saving..." : "Save & Geocode"}
              </Button>
            </div>
          </div>
        )}

        {/* Repair Queue List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {clients.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-200">All Client Locations Verified</p>
              <p className="text-xs text-slate-400">Every active client currently has valid map coordinates.</p>
            </div>
          ) : (
            clients.map((c) => {
              const missingText = getMissingReason(c);
              return (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 gap-3 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {c.studentName || c.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                        {missingText}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>
                        {c.city || "—"}, {c.state || "—"} {c.zipCode || ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRecalculate(c.id)}
                      disabled={recalculateMutation.isPending}
                      title="Recalculate coordinates from existing fields"
                      className="h-7 px-2 text-[11px] text-slate-400 hover:text-white"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Recalculate
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartEdit(c)}
                      title="Enter city, state, or ZIP"
                      className="h-7 px-2 text-[11px] border-slate-700 hover:bg-slate-800 text-sky-400"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Repair
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenClient(c.id)}
                      title="Open full contact record"
                      className="h-7 px-2 text-[11px] text-slate-400 hover:text-white"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Record
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
          <span>Privacy rule: City location is all we need — street addresses are never collected or transmitted.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            className="border-slate-700 text-slate-300 hover:text-white text-xs h-7"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
