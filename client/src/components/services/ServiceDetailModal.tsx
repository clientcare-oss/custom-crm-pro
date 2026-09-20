import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  History,
  Pencil,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { CatalogServiceItem, CatalogFolderItem } from "./serviceTypes";

interface ServiceDetailModalProps {
  open: boolean;
  onClose: () => void;
  service: CatalogServiceItem | null;
  folders: CatalogFolderItem[];
  onEdit: (service: CatalogServiceItem) => void;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  open,
  onClose,
  service,
  folders,
  onEdit,
}) => {
  if (!service) return null;

  const folder = folders.find((f) => f.id === service.folderId);
  const formattedPrice = (service.standardPrice / 100).toLocaleString("en-US", {
    style: "currency",
    currency: service.currency || "USD",
    maximumFractionDigits: 0,
  });

  // Query audit events for this service
  const { data: auditEvents } = trpc.services.events.useQuery(
    { serviceId: service.id, limit: 10 },
    { enabled: open && !!service.id }
  );

  let deliverables: any[] = [];
  try {
    if (Array.isArray(service.includedItems)) {
      deliverables = service.includedItems;
    } else if (typeof service.includedItems === "string") {
      deliverables = JSON.parse(service.includedItems);
    }
  } catch {
    deliverables = [];
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-[#001035] border border-blue-900/60 text-slate-100 max-h-[85vh] overflow-y-auto shadow-2xl">
        <DialogHeader className="border-b border-blue-900/40 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#000821] border border-blue-500/30 text-sky-400">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  {service.clientFacingTitle || service.name}
                </DialogTitle>
                <div className="text-xs text-sky-400/70 font-mono mt-0.5">{service.serviceCode}</div>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(service);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 rounded-xl shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Service
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Price & Turnaround Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#082043] border border-sky-500/25">
            <div>
              <div className="text-xs text-blue-200/75">Standard Price</div>
              <div className="text-lg font-extrabold text-white mt-0.5">{formattedPrice}</div>
              <div className="text-[11px] text-blue-300/60">
                {service.billingType === "recurring" ? `per ${service.billingInterval || "mo"}` : "one-time"}
              </div>
            </div>

            <div>
              <div className="text-xs text-blue-200/75">Turnaround Time</div>
              <div className="text-sm font-semibold text-white mt-1">
                {service.deliveryTimeLabel || "Standard"}
              </div>
            </div>

            <div>
              <div className="text-xs text-blue-200/75">Status</div>
              <div className="mt-1">
                {service.isArchived ? (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40">
                    Archived
                  </span>
                ) : service.isActive ? (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#000821] text-blue-300/80 border border-blue-800/50">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-blue-200/75">Stripe Sync</div>
              <div className="text-xs font-semibold text-blue-100 mt-1 capitalize">
                {service.stripeSyncStatus.replace(/_/g, " ")}
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-3">
            {service.shortDescription && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Short Description
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{service.shortDescription}</p>
              </div>
            )}

            {service.fullDescription && (
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Scope of Service
                </div>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{service.fullDescription}</p>
              </div>
            )}

            {service.internalInstructions && (
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/40">
                <div className="text-xs font-semibold text-amber-300 mb-1">Internal Advocate Instructions</div>
                <p className="text-xs text-slate-300 leading-relaxed">{service.internalInstructions}</p>
              </div>
            )}
          </div>

          {/* Included Deliverables */}
          {deliverables.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Included Deliverables ({deliverables.length})
              </div>
              <div className="space-y-1.5">
                {deliverables.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#082043] border border-sky-500/20 text-xs text-blue-100"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Change History */}
          <div>
            <div className="text-xs font-semibold text-sky-400/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Change History
            </div>
            {auditEvents && auditEvents.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {auditEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#082043]/70 border border-blue-900/30 text-[11px] text-blue-200"
                  >
                    <span className="font-medium text-sky-300">{evt.eventType.replace(/_/g, " ")}</span>
                    <span className="text-blue-300/70">by {evt.actor}</span>
                    <span className="text-blue-400/60">
                      {new Date(evt.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-blue-300/60 italic p-2 bg-[#082043]/40 rounded-lg">
                No recent changes recorded.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
