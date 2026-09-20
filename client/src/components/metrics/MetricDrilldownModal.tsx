import React from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  User,
  Calendar,
  AlertCircle,
  FileText,
  Loader2,
  ChevronRight,
} from "lucide-react";

interface MetricDrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricKey: string | null;
  metricTitle: string;
  filters?: any;
}

export default function MetricDrilldownModal({
  open,
  onOpenChange,
  metricKey,
  metricTitle,
  filters,
}: MetricDrilldownModalProps) {
  const [, setLocation] = useLocation();

  const { data: records = [], isLoading } = trpc.metrics.getDrilldown.useQuery(
    {
      metricKey: metricKey || "",
      filters,
    },
    {
      enabled: open && !!metricKey,
    }
  );

  const handleNavigate = (link: string) => {
    onOpenChange(false);
    setLocation(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#001433] border border-sky-500/30 text-white rounded-3xl max-w-2xl shadow-[0_25px_60px_rgba(0,10,35,0.9)] p-6 max-h-[85vh] flex flex-col">
        <DialogHeader className="border-b border-sky-500/15 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-wide">
                {metricTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-blue-200/70 mt-0.5">
                Underlying records contributing to this metric. Click any record to open workspace.
              </DialogDescription>
            </div>
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 text-xs px-2.5 py-0.5">
              {records.length} Records
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-blue-200/60 gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span>Loading record details...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 text-xs text-blue-200/50">
              No specific records matching current filter criteria.
            </div>
          ) : (
            records.map((rec: any, idx: number) => (
              <div
                key={rec.id || idx}
                onClick={() => handleNavigate(rec.link)}
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-[#000E26] hover:bg-[#00183F] border border-sky-500/20 hover:border-sky-400/50 transition-all cursor-pointer shadow-sm"
              >
                <div className="space-y-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-sky-300 transition-colors">
                      {rec.title}
                    </h4>
                    {rec.category && (
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-blue-900/60 text-blue-200 border border-blue-700/50">
                        {rec.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-200/75 truncate">{rec.subtitle}</p>
                  <div className="flex items-center gap-3 text-[11px] text-blue-300/60 pt-0.5">
                    {rec.responsibleName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-sky-400" />
                        {rec.responsibleName}
                      </span>
                    )}
                    {rec.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-sky-400" />
                        {rec.date}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-400/30">
                    {rec.status}
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-sky-500/10 group-hover:bg-sky-500/25 text-sky-400 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
