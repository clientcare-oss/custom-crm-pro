import React from "react";
import {
  Scale,
  Users,
  Briefcase,
  FileText,
  Eye,
  Pencil,
  MoreVertical,
  Copy,
  FolderInput,
  ToggleLeft,
  ToggleRight,
  Archive,
  RotateCcw,
  History,
  Trash2,
  Clock,
  Sparkles,
  ShieldCheck,
  Award,
  CalendarCheck,
  PenTool,
  Mail,
  Video,
  AlertOctagon,
  Compass,
  FileCheck,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CatalogServiceItem, CatalogFolderItem } from "./serviceTypes";

interface ServiceCardProps {
  service: CatalogServiceItem;
  folders: CatalogFolderItem[];
  onView: (service: CatalogServiceItem) => void;
  onEdit: (service: CatalogServiceItem) => void;
  onDuplicate: (service: CatalogServiceItem) => void;
  onMoveToCategory: (service: CatalogServiceItem, folderId: number | null) => void;
  onToggleActive: (service: CatalogServiceItem) => void;
  onArchive: (service: CatalogServiceItem) => void;
  onRestore: (service: CatalogServiceItem) => void;
  onViewHistory: (service: CatalogServiceItem) => void;
  onDeletePermanent: (service: CatalogServiceItem) => void;
}

// Icon mapper for service cards
function getServiceIcon(iconName?: string, serviceCode?: string, className: string = "w-5 h-5") {
  if (serviceCode === "state_complaint_support" || iconName === "scale") {
    return <Scale className={`${className} text-purple-400`} />;
  }
  if (serviceCode?.startsWith("advocacy_plan") || iconName === "users") {
    return <Users className={`${className} text-blue-400`} />;
  }
  if (serviceCode === "iep_full_representation" || iconName === "briefcase") {
    return <Briefcase className={`${className} text-indigo-400`} />;
  }
  if (serviceCode === "annual_advocacy_retainer" || iconName === "award") {
    return <Award className={`${className} text-amber-400`} />;
  }
  if (serviceCode === "iep_document_review" || iconName === "file-text" || iconName === "file-search") {
    return <FileText className={`${className} text-teal-400`} />;
  }
  if (serviceCode === "iep_meeting_preparation" || iconName === "calendar-check") {
    return <CalendarCheck className={`${className} text-blue-400`} />;
  }
  if (serviceCode === "parent_concern_statement" || iconName === "pen-tool") {
    return <PenTool className={`${className} text-teal-400`} />;
  }
  if (serviceCode === "school_communication_support" || iconName === "mail") {
    return <Mail className={`${className} text-teal-400`} />;
  }
  if (serviceCode === "advocate_meeting_attendance" || iconName === "video") {
    return <Video className={`${className} text-blue-400`} />;
  }
  if (serviceCode === "discipline_emergency_review" || iconName === "alert-octagon") {
    return <AlertOctagon className={`${className} text-red-400`} />;
  }
  if (serviceCode === "transition_plan_review" || iconName === "compass") {
    return <Compass className={`${className} text-cyan-400`} />;
  }
  if (serviceCode === "pwn_review" || iconName === "file-check") {
    return <FileCheck className={`${className} text-teal-400`} />;
  }
  if (serviceCode === "bip_fba_audit" || iconName === "heart-pulse") {
    return <HeartPulse className={`${className} text-teal-400`} />;
  }

  return <Briefcase className={`${className} text-blue-400`} />;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  folders,
  onView,
  onEdit,
  onDuplicate,
  onMoveToCategory,
  onToggleActive,
  onArchive,
  onRestore,
  onViewHistory,
  onDeletePermanent,
}) => {
  // Pricing formatting: amounts in cents
  const formattedPrice = (service.standardPrice / 100).toLocaleString("en-US", {
    style: "currency",
    currency: service.currency || "USD",
    maximumFractionDigits: 0,
  });

  const priceLabel =
    service.billingType === "recurring"
      ? `${formattedPrice} / ${service.billingInterval || "month"}`
      : `${formattedPrice} one-time`;

  // Plan availability description tag
  let planTagText = "";
  if (service.serviceCode === "advocacy_plan_105") {
    planTagText = "Included for: $105 Plan";
  } else if (service.serviceCode === "advocacy_plan_55") {
    planTagText = "Included for: $55 Plan";
  } else if (service.serviceCode === "state_complaint_support") {
    planTagText = "Available to: All Plans & Standalone ($200)";
  } else if (service.deliveryTimeLabel) {
    planTagText = `Turnaround: ${service.deliveryTimeLabel}`;
  }

  const isMembership = service.billingType === "recurring";
  const isAddOn = service.availableAsAddOn;

  return (
    <div className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-3.5 rounded-xl bg-[#001035] border border-blue-900/60 hover:border-sky-400/50 hover:bg-[#001848] transition-all shadow-md gap-3">
      {/* Left side: Icon & Details */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Icon box */}
        <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#000821] border border-blue-500/30 shrink-0 mt-0.5">
          {getServiceIcon(service.icon, service.serviceCode, "w-4.5 h-4.5")}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white truncate tracking-tight">
              {service.clientFacingTitle || service.name}
            </h3>
          </div>

          {/* Pricing & Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
            <span className="text-xs sm:text-sm font-bold text-sky-200 font-mono">{priceLabel}</span>

            {/* Status Pill */}
            {service.isArchived ? (
              <span className="px-1.5 py-0.5 text-[10.5px] font-semibold rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/40">
                Archived
              </span>
            ) : service.isActive ? (
              <span className="px-1.5 py-0.5 text-[10.5px] font-semibold rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                Active
              </span>
            ) : (
              <span className="px-1.5 py-0.5 text-[10.5px] font-semibold rounded-md bg-[#000821] text-blue-300/80 border border-blue-800/50">
                Inactive
              </span>
            )}

            {/* Service Type Badges */}
            {isMembership && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10.5px] font-semibold rounded-md bg-purple-950/60 text-purple-300 border border-purple-800/40">
                <Users className="w-2.5 h-2.5" />
                Membership
              </span>
            )}

            {!isMembership && isAddOn && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10.5px] font-semibold rounded-md bg-blue-950/60 text-blue-300 border border-blue-800/40">
                <Sparkles className="w-2.5 h-2.5" />
                Add-On
              </span>
            )}

            {service.priorityEnabled && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10.5px] font-semibold rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/40">
                Priority
              </span>
            )}
          </div>

          {/* Description */}
          {service.shortDescription && (
            <p className="text-xs text-blue-100/85 line-clamp-1 sm:line-clamp-2 mt-0.5 leading-snug font-normal">
              {service.shortDescription}
            </p>
          )}

          {/* Plan Availability note */}
          {planTagText && (
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-medium text-blue-200/75 truncate">
              <span>{planTagText}</span>
              {service.serviceCode && (
                <span className="text-sky-400/60 font-mono text-[10px]">
                  ({service.serviceCode})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onView(service)}
          className="border border-sky-500/25 bg-[#082043] hover:bg-[#0D3A68] text-blue-100 text-xs gap-1 h-7.5 px-2.5 rounded-lg cursor-pointer shadow-sm"
        >
          <Eye className="w-3 h-3 text-sky-400" />
          View
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={() => onEdit(service)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs gap-1 h-7.5 px-2.5 rounded-lg cursor-pointer shadow-sm"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </Button>

        {/* Three-dot actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7.5 w-7.5 text-blue-300/70 hover:text-white hover:bg-[#082043] rounded-lg cursor-pointer"
              aria-label="More actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#001035] border border-sky-500/30 text-blue-100 min-w-[210px] shadow-2xl">
            <DropdownMenuItem onClick={() => onDuplicate(service)} className="cursor-pointer gap-2 hover:bg-[#082043] focus:bg-[#082043]">
              <Copy className="w-4 h-4 text-sky-400" />
              Duplicate Service
            </DropdownMenuItem>

            {/* Move to Category Submenu items */}
            {folders.length > 0 && (
              <>
                <DropdownMenuSeparator className="bg-blue-900/50" />
                <div className="px-2 py-1 text-[11px] font-semibold text-sky-300/70 uppercase tracking-wider">
                  Move to Category
                </div>
                {folders
                  .filter((f) => !f.isArchived && f.id !== service.folderId)
                  .slice(0, 5)
                  .map((f) => (
                    <DropdownMenuItem
                      key={f.id}
                      onClick={() => onMoveToCategory(service, f.id)}
                      className="cursor-pointer gap-2 text-xs truncate"
                    >
                      <FolderInput className="w-3.5 h-3.5 text-blue-400" />
                      {f.name}
                    </DropdownMenuItem>
                  ))}
                {service.folderId !== null && (
                  <DropdownMenuItem
                    onClick={() => onMoveToCategory(service, null)}
                    className="cursor-pointer gap-2 text-xs text-slate-400"
                  >
                    <FolderInput className="w-3.5 h-3.5 text-slate-500" />
                    Move to Unfiled
                  </DropdownMenuItem>
                )}
              </>
            )}

            <DropdownMenuSeparator className="bg-blue-900/40" />

            <DropdownMenuItem onClick={() => onToggleActive(service)} className="cursor-pointer gap-2">
              {service.isActive ? (
                <>
                  <ToggleLeft className="w-4 h-4 text-amber-400" />
                  Deactivate Service
                </>
              ) : (
                <>
                  <ToggleRight className="w-4 h-4 text-emerald-400" />
                  Activate Service
                </>
              )}
            </DropdownMenuItem>

            {service.isArchived ? (
              <DropdownMenuItem onClick={() => onRestore(service)} className="cursor-pointer gap-2 text-emerald-400">
                <RotateCcw className="w-4 h-4" />
                Restore to Catalog
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onArchive(service)} className="cursor-pointer gap-2 text-amber-300">
                <Archive className="w-4 h-4" />
                Archive Service
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => onViewHistory(service)} className="cursor-pointer gap-2">
              <History className="w-4 h-4 text-slate-400" />
              View Change History
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-blue-900/40" />

            <DropdownMenuItem
              onClick={() => onDeletePermanent(service)}
              className="cursor-pointer gap-2 text-rose-400 hover:text-rose-300 focus:text-rose-300"
            >
              <Trash2 className="w-4 h-4" />
              Delete Permanently...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
