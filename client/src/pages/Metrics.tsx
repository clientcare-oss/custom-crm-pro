import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ScopedErrorBoundary from "@/components/ScopedErrorBoundary";
import MetricsHeader, { MetricsFilterState } from "@/components/metrics/MetricsHeader";
import SnapshotCards from "@/components/metrics/SnapshotCards";
import LeadJourneySection from "@/components/metrics/LeadJourneySection";
import PlansRevenueSection from "@/components/metrics/PlansRevenueSection";
import TimeWorkloadSection from "@/components/metrics/TimeWorkloadSection";
import ServicesDeliveredSection from "@/components/metrics/ServicesDeliveredSection";
import AdvocacyOutcomesSection from "@/components/metrics/AdvocacyOutcomesSection";
import ClientReadinessSection from "@/components/metrics/ClientReadinessSection";
import ClientContinuitySection from "@/components/metrics/ClientContinuitySection";
import FamilyExperienceSection from "@/components/metrics/FamilyExperienceSection";
import MetricDrilldownModal from "@/components/metrics/MetricDrilldownModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, SlidersHorizontal, Check } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_FILTERS: MetricsFilterState = {
  dateRange: "30d",
  compareWithPrevious: true,
  advocateId: "all",
  planTier: "all",
  state: "all",
  district: "all",
  caseType: "all",
};

export default function Metrics() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<MetricsFilterState>(DEFAULT_FILTERS);

  // Drilldown modal state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null);
  const [selectedMetricTitle, setSelectedMetricTitle] = useState("");

  // Customize sections visibility state
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState({
    snapshot: true,
    leadJourney: true,
    plansRevenue: true,
    timeWorkload: true,
    servicesDelivered: true,
    advocacyOutcomes: true,
    clientReadiness: true,
    clientContinuity: true,
    familyExperience: true,
  });

  // Queries
  const { data: snapshotData, isLoading: isSnapshotLoading } = trpc.metrics.getSnapshot.useQuery(
    filters,
    { refetchInterval: 30000 }
  );

  const { data: leadJourneyData } = trpc.metrics.getLeadJourney.useQuery(filters);
  const { data: plansRevenueData } = trpc.metrics.getPlansRevenue.useQuery(filters);
  const { data: timeWorkloadData } = trpc.metrics.getTimeWorkload.useQuery(filters);
  const { data: servicesData } = trpc.metrics.getServicesDelivered.useQuery(filters);
  const { data: outcomesData } = trpc.metrics.getAdvocacyOutcomes.useQuery(filters);
  const { data: readinessData } = trpc.metrics.getClientReadiness.useQuery(filters);
  const { data: continuityData } = trpc.metrics.getClientContinuity.useQuery(filters);
  const { data: experienceData } = trpc.metrics.getFamilyExperience.useQuery(filters);

  const handleFilterChange = (newFilters: Partial<MetricsFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    toast.success("Filters reset to default 30-day view");
  };

  const handleOpenDrilldown = (key: string, title: string) => {
    setSelectedMetricKey(key);
    setSelectedMetricTitle(title);
    setDrilldownOpen(true);
  };

  const handleExportReport = () => {
    if (!snapshotData || !leadJourneyData) {
      toast.error("Metrics still loading, please wait...");
      return;
    }

    // Build CSV content
    const rows = [
      ["Waypoint Advocates - Operational Metrics Report"],
      ["Date Range", filters.dateRange],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Metric", "Value", "Previous Period Change (%)"],
      ["New Leads", snapshotData.newLeads.value, `${snapshotData.newLeads.change}%`],
      ["Conversion Rate", `${snapshotData.conversionRate.value}%`, `${snapshotData.conversionRate.change}%`],
      ["Active Families", snapshotData.activeFamilies.value, `${snapshotData.activeFamilies.change}%`],
      ["Revenue Collected", `$${snapshotData.revenue.value}`, `${snapshotData.revenue.change}%`],
      ["Advocacy Hours", `${snapshotData.advocacyHours.value} hrs`, `${snapshotData.advocacyHours.change}%`],
      ["Renewals Due", snapshotData.renewalsDue.value, `${snapshotData.renewalsDue.change}%`],
      [],
      ["Lead Journey Funnel Stages", "Count", "Conversion Rate", "Avg Days"],
      ...leadJourneyData.funnelStages.map((s) => [s.stage, s.count, `${s.conversionRate}%`, `${s.avgDays} days`]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `waypoint_metrics_${filters.dateRange}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Metrics report exported as CSV!");
  };

  return (
    <ScopedErrorBoundary moduleName="Waypoint Metrics Console">
      <div className="min-h-screen bg-[#000821] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8 font-sans select-none">
        {/* ── Universal Header with Multi-Dimensional Filters ── */}
        <MetricsHeader
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onExportReport={handleExportReport}
          onCustomizeDashboard={() => setCustomizeOpen(true)}
        />

        {/* ── Section 2: Top-Level Snapshot Cards ── */}
        {visibleSections.snapshot && (
          <div>
            {isSnapshotLoading || !snapshotData ? (
              <div className="h-36 rounded-2xl bg-[#07162B] border border-sky-500/20 flex items-center justify-center text-xs text-blue-200/50 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>Loading top-level metrics snapshot...</span>
              </div>
            ) : (
              <SnapshotCards data={snapshotData} onCardClick={handleOpenDrilldown} />
            )}
          </div>
        )}

        {/* ── Section 3: Lead Journey ── */}
        {visibleSections.leadJourney && leadJourneyData && (
          <LeadJourneySection
            data={leadJourneyData}
            onStageClick={(stage) => handleOpenDrilldown("new_leads", `Stage: ${stage}`)}
          />
        )}

        {/* ── Section 4: Plans & Revenue ── */}
        {visibleSections.plansRevenue && plansRevenueData && (
          <PlansRevenueSection data={plansRevenueData} />
        )}

        {/* ── Section 5: Team Time and Workload ── */}
        {visibleSections.timeWorkload && timeWorkloadData && (
          <TimeWorkloadSection
            data={timeWorkloadData}
            onStudentClick={(stId) => handleOpenDrilldown("advocacy_hours", `Student Case #${stId}`)}
          />
        )}

        {/* ── Section 6: Services Delivered ── */}
        {visibleSections.servicesDelivered && servicesData && (
          <ServicesDeliveredSection
            data={servicesData}
            onMetricClick={handleOpenDrilldown}
          />
        )}

        {/* ── Section 7: Advocacy Outcomes ── */}
        {visibleSections.advocacyOutcomes && outcomesData && (
          <AdvocacyOutcomesSection data={outcomesData} />
        )}

        {/* ── Section 8: Client Readiness & Needs Attention ── */}
        {visibleSections.clientReadiness && readinessData && (
          <ClientReadinessSection
            data={readinessData}
            onStudentClick={(stId) => handleOpenDrilldown("documents_missing", `Action Item: Student #${stId}`)}
          />
        )}

        {/* ── Section 9: Client Continuity ── */}
        {visibleSections.clientContinuity && continuityData && (
          <ClientContinuitySection data={continuityData} />
        )}

        {/* ── Section 10: Family Experience & Testimonials ── */}
        {visibleSections.familyExperience && experienceData && (
          <FamilyExperienceSection data={experienceData} />
        )}

        {/* ── Drilldown Modal ── */}
        <MetricDrilldownModal
          open={drilldownOpen}
          onOpenChange={setDrilldownOpen}
          metricKey={selectedMetricKey}
          metricTitle={selectedMetricTitle}
          filters={filters}
        />

        {/* ── Customize Dashboard Modal ── */}
        <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
          <DialogContent className="bg-[#001433] border border-sky-500/30 text-white rounded-3xl max-w-md shadow-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                Customize Metrics Dashboard
              </DialogTitle>
              <DialogDescription className="text-xs text-blue-200/70">
                Toggle the operational sections you want visible on this workstation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              {[
                { key: "snapshot", label: "Top-Level Snapshot (6 Cards)" },
                { key: "leadJourney", label: "Lead Journey (7-Stage Funnel & Demographics)" },
                { key: "plansRevenue", label: "Plans & Revenue (Matrix & Profitability)" },
                { key: "timeWorkload", label: "Where Our Time Goes (12 Work Types & Capacity)" },
                { key: "servicesDelivered", label: "Services Delivered (Clickable Volume)" },
                { key: "advocacyOutcomes", label: "Advocacy Outcomes (Goals & IDEA Risk)" },
                { key: "clientReadiness", label: "Client Readiness & Needs Attention" },
                { key: "clientContinuity", label: "Client Continuity (Renewals & Cancellations)" },
                { key: "familyExperience", label: "Family Experience (Ratings & Testimonials)" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#000E26] border border-sky-500/15"
                >
                  <Label className="text-xs font-semibold text-slate-200">{item.label}</Label>
                  <Switch
                    checked={(visibleSections as any)[item.key]}
                    onCheckedChange={(checked) =>
                      setVisibleSections((prev) => ({ ...prev, [item.key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => {
                  setCustomizeOpen(false);
                  toast.success("Dashboard preferences saved");
                }}
                className="h-8 px-4 text-xs font-bold bg-[#0062E3] hover:bg-[#0070F3] text-white rounded-xl"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ScopedErrorBoundary>
  );
}
