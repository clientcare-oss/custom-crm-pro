import React from "react";
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileQuestion,
  UserX,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface ClientReadinessSectionProps {
  data: {
    averageOnboardingDays: number;
    incompleteOnboardingCount: number;
    timeFromPaymentToAdvocacyDays: number;
    requiredDocumentsReceived: number;
    requiredDocumentsMissing: number;
    averageTimeToReceiveRecordsDays: number;
    clientsBlockedByMissingRecords: number;
    mostCommonlyMissingDocuments: Array<{ documentName: string; missingCount: number }>;
    needsAttentionDeck: Array<{
      id: string;
      category: string;
      title: string;
      studentId: number;
      action: string;
      severity: string;
    }>;
  };
  onStudentClick?: (studentId: number) => void;
}

export default function ClientReadinessSection({
  data,
  onStudentClick,
}: ClientReadinessSectionProps) {
  return (
    <div className="space-y-6">
      {/* ── Section Title ── */}
      <div className="border-b border-[#3A2C18] pb-3">
        <h2 className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2">
          <span>Client Readiness</span>
        </h2>
        <p className="text-xs text-[#C6B697] mt-0.5">
          Intake velocity, document collection bottlenecks, and proactive client readiness alerts.
        </p>
      </div>

      {/* ── Metric Snapshot Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] text-center space-y-1">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Avg Onboarding</span>
          <div className="text-xl sm:text-2xl font-black text-[#FFF4D4] font-serif">
            {data.averageOnboardingDays} days
          </div>
          <span className="text-[10px] text-[#A69371]">Payment to Complete</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] text-center space-y-1">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Advocacy Start</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-serif">
            {data.timeFromPaymentToAdvocacyDays} days
          </div>
          <span className="text-[10px] text-[#A69371]">First Session Launch</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] text-center space-y-1">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Records Ingest</span>
          <div className="text-xl sm:text-2xl font-black text-[#FFE394] font-serif">
            {data.averageTimeToReceiveRecordsDays} days
          </div>
          <span className="text-[10px] text-[#A69371]">Avg school record receipt</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] text-center space-y-1">
          <span className="text-[10px] font-bold text-rose-400 uppercase block">Blocked Clients</span>
          <div className="text-xl sm:text-2xl font-black text-rose-400 font-serif">
            {data.clientsBlockedByMissingRecords} cases
          </div>
          <span className="text-[10px] text-[#A69371]">Missing critical records</span>
        </div>
      </div>

      {/* ── Bottom Grid: Most Commonly Missing Documents & Needs Attention Deck ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Most Commonly Missing Documents */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
              <FileQuestion className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Most Commonly Missing Documents</span>
            </h3>
            <span className="text-[10px] text-[#A69371] font-medium">Frequency</span>
          </div>

          <div className="space-y-2">
            {data.mostCommonlyMissingDocuments.map((doc) => (
              <div
                key={doc.documentName}
                className="flex items-center justify-between p-3 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <FileText className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                  <span className="text-[#E8DCC4] font-medium truncate">{doc.documentName}</span>
                </div>
                <span className="font-bold font-mono text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-500/30 shrink-0">
                  {doc.missingCount} cases
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Proactive "Needs Attention" Panel */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif font-bold text-[#DFBE77] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Needs Attention Deck</span>
            </h3>
            <span className="text-[10px] text-[#DFBE77] font-mono">
              {data.needsAttentionDeck.length} Action Items
            </span>
          </div>

          <div className="space-y-2.5">
            {data.needsAttentionDeck.map((item) => (
              <div
                key={item.id}
                onClick={() => onStudentClick && onStudentClick(item.studentId)}
                className="p-3 rounded-lg bg-[#020A17]/80 hover:bg-[#071B38] border border-[#3A2C18]/60 hover:border-[#C5A059]/60 transition-all cursor-pointer space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#DFBE77]/15 text-[#FFE394] border border-[#DFBE77]/30 font-bold">
                    {item.category}
                  </span>
                  <span className="text-[11px] font-bold text-[#FFE394] group-hover:underline flex items-center gap-0.5">
                    <span>{item.action}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>

                <p className="text-xs font-semibold text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors">
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
