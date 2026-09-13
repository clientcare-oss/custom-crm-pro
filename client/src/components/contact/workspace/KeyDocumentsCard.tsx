import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Folder,
  FileText,
  ArrowRight,
  MoreVertical,
  Eye,
  Download,
  Lock,
  Globe,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export interface CaseDocItem {
  id: string | number;
  name: string;
  type: string;
  source: "Original" | "Waypoint" | "School" | "Parent";
  date: string;
  isParentVisible?: boolean;
  url?: string;
}

interface KeyDocumentsCardProps {
  documents: CaseDocItem[];
  onViewAllDocuments: () => void;
  onPreviewDoc: (doc: CaseDocItem) => void;
  onToggleVisibility?: (doc: CaseDocItem) => void;
}

export function KeyDocumentsCard({
  documents,
  onViewAllDocuments,
  onPreviewDoc,
  onToggleVisibility,
}: KeyDocumentsCardProps) {
  const getSourceBadgeClass = (source: string) => {
    switch (source) {
      case "Original":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      case "Waypoint":
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
      case "School":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "Parent":
        return "bg-purple-500/15 text-purple-300 border-purple-500/30";
      default:
        return "bg-slate-700/50 text-slate-300 border-slate-600/40";
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0A1A33] to-[#07162B] border border-[#0E274D] p-5 shadow-lg flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0E274D] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-[#F5B544]" />
            <h3 className="text-base font-bold text-white font-serif tracking-wide">
              Key Case Documents
            </h3>
          </div>
          <button
            onClick={onViewAllDocuments}
            className="text-xs font-semibold text-[#F5B544] hover:text-[#F5B544]/80 inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View All Documents</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Document List */}
        <div className="space-y-2">
          {documents.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 italic">
              No case documents uploaded yet.
            </div>
          ) : (
            documents.slice(0, 5).map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#07162B]/80 hover:bg-[#0F2342] border border-[#0E274D] transition-colors group"
              >
                <div
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                  onClick={() => onPreviewDoc(doc)}
                >
                  <FileText className="h-4 w-4 text-slate-400 group-hover:text-[#F5B544] shrink-0 transition-colors" />
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                    {doc.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider",
                      getSourceBadgeClass(doc.source)
                    )}
                  >
                    {doc.source}
                  </span>

                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    {doc.date}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] cursor-pointer">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#07162B] border-[#0E274D] text-slate-200 shadow-xl">
                      <DropdownMenuItem
                        onClick={() => onPreviewDoc(doc)}
                        className="gap-2 cursor-pointer text-xs"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#F5B544]" />
                        <span>Preview Document</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (doc.url) window.open(doc.url, "_blank");
                          else toast.info("Downloading " + doc.name);
                        }}
                        className="gap-2 cursor-pointer text-xs"
                      >
                        <Download className="h-3.5 w-3.5 text-blue-400" />
                        <span>Download</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[#0E274D]" />
                      <DropdownMenuItem
                        onClick={() => {
                          if (onToggleVisibility) onToggleVisibility(doc);
                          toast.success(`Visibility updated: ${doc.isParentVisible ? "Waypoint Only" : "Parent Visible"}`);
                        }}
                        className="gap-2 cursor-pointer text-xs"
                      >
                        {doc.isParentVisible ? (
                          <>
                            <Lock className="h-3.5 w-3.5 text-amber-400" />
                            <span>Make Waypoint Only</span>
                          </>
                        ) : (
                          <>
                            <Globe className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Make Parent Visible</span>
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
