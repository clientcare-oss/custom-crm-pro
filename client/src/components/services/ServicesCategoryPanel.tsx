import React from "react";
import {
  LayoutGrid,
  ShieldCheck,
  Scale,
  Briefcase,
  FileText,
  Users,
  Lightbulb,
  HeartHandshake,
  AlertTriangle,
  Compass,
  MoreHorizontal,
  Plus,
  Folder,
  Archive,
  Pencil,
} from "lucide-react";
import type { CatalogFolderItem, CatalogServiceItem } from "./serviceTypes";

interface ServicesCategoryPanelProps {
  folders: CatalogFolderItem[];
  services: CatalogServiceItem[];
  selectedFolderId: number | null; // null = all
  isUnfiledSelected: boolean;
  onSelectAll: () => void;
  onSelectFolder: (folderId: number) => void;
  onSelectUnfiled: () => void;
  onNewCategory: () => void;
  onEditCategory?: (folder: CatalogFolderItem) => void;
}

// Icon mapper for categories
function renderFolderIcon(iconName?: string, className: string = "w-4 h-4") {
  switch (iconName) {
    case "shield-check":
    case "memberships":
      return <ShieldCheck className={className} />;
    case "scale":
    case "state_complaints":
      return <Scale className={className} />;
    case "briefcase":
    case "representation":
      return <Briefcase className={className} />;
    case "file-text":
    case "audits_sessions":
      return <FileText className={className} />;
    case "users":
    case "meeting_support":
      return <Users className={className} />;
    case "lightbulb":
    case "strategy_sessions":
      return <Lightbulb className={className} />;
    case "heart-handshake":
    case "behavior_support":
      return <HeartHandshake className={className} />;
    case "alert-triangle":
    case "discipline_safety":
      return <AlertTriangle className={className} />;
    case "compass":
    case "transition_support":
      return <Compass className={className} />;
    default:
      return <MoreHorizontal className={className} />;
  }
}

export const ServicesCategoryPanel: React.FC<ServicesCategoryPanelProps> = ({
  folders,
  services,
  selectedFolderId,
  isUnfiledSelected,
  onSelectAll,
  onSelectFolder,
  onSelectUnfiled,
  onNewCategory,
  onEditCategory,
}) => {
  // Compute count of active non-archived services per folder
  const activeServices = services.filter((s) => !s.isArchived);
  const totalCount = activeServices.length;
  const unfiledCount = activeServices.filter((s) => s.folderId === null || s.folderId === undefined).length;

  const isAllSelected = selectedFolderId === null && !isUnfiledSelected;

  return (
    <div className="w-full lg:w-48 xl:w-56 shrink-0 bg-[#001035] border border-blue-900/60 shadow-lg rounded-xl p-3 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400/80">Categories</h2>
        </div>

        <nav className="space-y-0.5" aria-label="Services categories">
          {/* All Services */}
          <button
            type="button"
            onClick={onSelectAll}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isAllSelected
                ? "bg-blue-600 text-white shadow-xs ring-1 ring-sky-400/40 font-semibold"
                : "text-blue-100/90 hover:text-white hover:bg-[#082043]"
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutGrid className={`w-3.5 h-3.5 ${isAllSelected ? "text-sky-200" : "text-sky-400"}`} />
              <span>All Services</span>
            </div>
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                isAllSelected ? "bg-[#000821] text-sky-200" : "bg-[#000821]/80 text-blue-200/80 border border-blue-900/40"
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* Folder Categories */}
          {folders
            .filter((f) => !f.isArchived)
            .map((folder) => {
              const count = activeServices.filter((s) => s.folderId === folder.id).length;
              const isSelected = selectedFolderId === folder.id;

              return (
                <div key={folder.id} className="group relative flex items-center">
                  <button
                    type="button"
                    onClick={() => onSelectFolder(folder.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs ring-1 ring-sky-400/40 font-semibold"
                        : "text-blue-100/90 hover:text-white hover:bg-[#082043]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className={isSelected ? "text-sky-200" : "text-sky-400"}>
                        {renderFolderIcon(folder.icon || folder.slug, "w-3.5 h-3.5")}
                      </span>
                      <span className="truncate">{folder.name}</span>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                        isSelected ? "bg-[#000821] text-sky-200" : "bg-[#000821]/80 text-blue-200/80 border border-blue-900/40"
                      }`}
                    >
                      {count}
                    </span>
                  </button>

                  {/* Quick Edit Folder Trigger */}
                  {onEditCategory && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCategory(folder);
                      }}
                      className="opacity-0 group-hover:opacity-100 absolute right-7 p-0.5 text-blue-300 hover:text-white transition-opacity"
                      title="Edit category"
                      aria-label={`Edit ${folder.name}`}
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}

          {/* Unfiled if exists */}
          {unfiledCount > 0 && (
            <button
              type="button"
              onClick={onSelectUnfiled}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isUnfiledSelected
                  ? "bg-blue-600 text-white shadow-xs ring-1 ring-sky-400/40 font-semibold"
                  : "text-blue-100/80 hover:text-white hover:bg-[#082043]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-blue-400" />
                <span>Unfiled</span>
              </div>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-[#000821]/80 text-blue-200/80 border border-blue-900/40">
                {unfiledCount}
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* New Category Button */}
      <div className="pt-2.5 mt-2.5 border-t border-blue-900/40">
        <button
          type="button"
          onClick={onNewCategory}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold text-sky-300 hover:text-sky-100 hover:bg-[#082043] border border-dashed border-sky-500/30 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New Category
        </button>
      </div>
    </div>
  );
};
