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
  Lock,
  Unlock,
  AlertTriangle,
  Package,
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

  // Query package allowances if this is an advocacy package
  const { data: packageAllowancesData } = trpc.services.getPackageAllowances.useQuery(
    { planKey: service.serviceCode, planName: service.name },
    { enabled: open && !!service.isAdvocacyPackage }
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

          {/* Advocacy Package Allowances Section */}
          {service.isAdvocacyPackage && (
            <div className="rounded-xl border border-sky-500/30 bg-[#001035] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>📊 Included Services & Allowances</span>
                      {packageAllowancesData?.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#001744] text-sky-300 border border-sky-500/40">
                          <Lock className="w-2.5 h-2.5 text-sky-400" />
                          Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950/60 text-blue-300 border border-blue-800/40">
                          <Unlock className="w-2.5 h-2.5 text-blue-400" />
                          Unlocked
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-blue-200/70">
                      Standard client entitlements connected to Student → Details → Service Allowances & Usage.
                    </p>
                  </div>
                </div>
              </div>

              {packageAllowancesData?.allowances && packageAllowancesData.allowances.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-blue-900/60 bg-[#000d2b]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-sky-500/20 bg-[#082043] text-[10.5px] uppercase font-bold text-sky-200 tracking-wider">
                        <th className="py-2 px-3">Service</th>
                        <th className="py-2 px-2 text-center">Included</th>
                        <th className="py-2 px-2 text-center">Allowance</th>
                        <th className="py-2 px-2 text-center">Quantity</th>
                        <th className="py-2 px-3 text-right">Tracking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-900/40 font-medium">
                      {packageAllowancesData.allowances.map((item) => {
                        const isInc = item.allowanceType !== "not_included";
                        return (
                          <tr key={item.serviceKey} className="hover:bg-[#001744]/60 transition-colors">
                            <td className="py-2 px-3 text-white">
                              <div className="font-semibold text-xs">{item.serviceName}</div>
                              <div className="text-[10px] font-mono text-sky-400/60">{item.serviceKey}</div>
                            </td>
                            <td className="py-2 px-2 text-center">
                              {isInc ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-600/40 text-[11px] font-bold">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-slate-500 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {item.allowanceType === "unlimited" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-950/80 text-sky-300 border border-sky-500/40">
                                  Unlimited (∞)
                                </span>
                              ) : item.allowanceType === "limited" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-950/80 text-blue-200 border border-blue-700/40">
                                  Limited
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">Not Included</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center font-mono font-bold text-sky-200">
                              {item.allowanceType === "unlimited" ? (
                                <span className="text-sky-300 font-extrabold text-sm">∞</span>
                              ) : item.allowanceType === "limited" ? (
                                <span className="text-emerald-300 text-xs">{item.baseAllowance}</span>
                              ) : (
                                <span className="text-slate-500 text-xs">0</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className="text-[10.5px] text-blue-300/80 capitalize">
                                {item.trackingMethod || "Calendar"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/50 text-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>No service allowances configured yet for this package. Click "Edit Service" to configure.</span>
                </div>
              )}
            </div>
          )}

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
