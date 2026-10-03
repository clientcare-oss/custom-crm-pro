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
      <DialogContent className="bg-[#05142B] border border-[#3A2C18] text-white rounded-2xl max-w-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-6 max-h-[85vh] flex flex-col">
        <DialogHeader className="border-b border-[#3A2C18] pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base sm:text-lg font-serif font-bold text-[#FFF4D4] tracking-wide">
                {metricTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#C6B697] mt-0.5">
                Underlying records contributing to this metric. Click any record to open workspace.
              </DialogDescription>
            </div>
            <Badge className="bg-[#020A17] text-[#FFE394] border-[#3A2C18] text-xs px-2.5 py-0.5 font-mono">
              {records.length} Records
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-[#C6B697] gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#FFE394]" />
              <span>Loading record details...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 text-xs text-[#A69371]">
              No specific records matching current filter criteria.
            </div>
          ) : (
            records.map((rec: any, idx: number) => (
              <div
                key={rec.id || idx}
                onClick={() => handleNavigate(rec.link)}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-[#020A17]/80 hover:bg-[#071B38] border border-[#3A2C18]/60 hover:border-[#C5A059]/60 transition-all cursor-pointer shadow-sm"
              >
                <div className="space-y-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#FFF4D4] truncate group-hover:text-[#FFE394] transition-colors">
                      {rec.title}
                    </h4>
                    {rec.category && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#05142B] text-[#C6B697] border border-[#3A2C18]">
                        {rec.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#C6B697] truncate">{rec.subtitle}</p>
                  <div className="flex items-center gap-3 text-[11px] text-[#A69371] pt-0.5">
                    {rec.responsibleName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#C5A059]" />
                        {rec.responsibleName}
                      </span>
                    )}
                    {rec.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#C5A059]" />
                        {rec.date}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#05142B] text-[#FFE394] border border-[#3A2C18]">
                    {rec.status}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-[#020A17] border border-[#3A2C18]/60 group-hover:border-[#C5A059]/40 text-[#C6B697] group-hover:text-[#FFE394] flex items-center justify-center transition-colors">
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
