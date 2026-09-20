import React from "react";
import { Eye, Pencil, MoreVertical, Archive, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CatalogServiceItem, CatalogFolderItem } from "./serviceTypes";

interface ServiceListViewProps {
  services: CatalogServiceItem[];
  folders: CatalogFolderItem[];
  onView: (service: CatalogServiceItem) => void;
  onEdit: (service: CatalogServiceItem) => void;
  onDuplicate: (service: CatalogServiceItem) => void;
  onToggleActive: (service: CatalogServiceItem) => void;
  onArchive: (service: CatalogServiceItem) => void;
  onRestore: (service: CatalogServiceItem) => void;
  onDeletePermanent: (service: CatalogServiceItem) => void;
}

export const ServiceListView: React.FC<ServiceListViewProps> = ({
  services,
  folders,
  onView,
  onEdit,
  onDuplicate,
  onToggleActive,
  onArchive,
  onRestore,
  onDeletePermanent,
}) => {
  const folderMap = new Map<number, string>();
  for (const f of folders) {
    folderMap.set(f.id, f.name);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-blue-900/60 bg-[#001035] shadow-lg">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-sky-500/25 bg-[#082043] text-[11px] font-semibold text-sky-200/90 uppercase tracking-wider">
            <th className="py-2.5 px-3">Service</th>
            <th className="py-2.5 px-3">Category</th>
            <th className="py-2.5 px-3">Pricing</th>
            <th className="py-2.5 px-3">Turnaround / Plan</th>
            <th className="py-2.5 px-3">Status</th>
            <th className="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-900/40 text-xs">
          {services.map((service) => {
            const folderName = service.folderId ? folderMap.get(service.folderId) || "Category" : "Unfiled";
            const formattedPrice = (service.standardPrice / 100).toLocaleString("en-US", {
              style: "currency",
              currency: service.currency || "USD",
              maximumFractionDigits: 0,
            });
            const priceLabel =
              service.billingType === "recurring"
                ? `${formattedPrice} / ${service.billingInterval || "mo"}`
                : `${formattedPrice} one-time`;

            return (
              <tr key={service.id} className="hover:bg-[#001848] transition-colors">
                <td className="py-2 px-3">
                  <div className="font-semibold text-white text-xs sm:text-sm">{service.clientFacingTitle || service.name}</div>
                  <div className="font-mono text-[10px] text-sky-400/60">{service.serviceCode}</div>
                </td>
                <td className="py-2 px-3 text-blue-100/90">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#000821] border border-blue-800/50 text-sky-300">
                    {folderName}
                  </span>
                </td>
                <td className="py-2 px-3 font-bold text-sky-200 font-mono text-xs">{priceLabel}</td>
                <td className="py-2 px-3 text-[11px] text-blue-200/80">
                  {service.deliveryTimeLabel || "Standard delivery"}
                </td>
                <td className="py-2 px-3">
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
                </td>
                <td className="py-2 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(service)}
                      className="h-7 px-2 text-blue-200 hover:text-white hover:bg-[#082043] rounded-md text-xs cursor-pointer"
                    >
                      <Eye className="w-3 h-3 mr-1 text-sky-400" />
                      View
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onEdit(service)}
                      className="h-7 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium cursor-pointer shadow-sm"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-300/70 hover:text-white rounded-md cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#001035] border border-sky-500/30 text-blue-100 shadow-2xl">
                        <DropdownMenuItem onClick={() => onDuplicate(service)} className="cursor-pointer hover:bg-[#082043] focus:bg-[#082043]">
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleActive(service)} className="cursor-pointer hover:bg-[#082043] focus:bg-[#082043]">
                          {service.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        {service.isArchived ? (
                          <DropdownMenuItem onClick={() => onRestore(service)} className="cursor-pointer text-emerald-400 hover:bg-[#082043] focus:bg-[#082043]">
                            Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => onArchive(service)} className="cursor-pointer text-amber-300 hover:bg-[#082043] focus:bg-[#082043]">
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onDeletePermanent(service)}
                          className="cursor-pointer text-rose-400 hover:bg-rose-950/40 focus:bg-rose-950/40"
                        >
                          Delete Permanently...
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
