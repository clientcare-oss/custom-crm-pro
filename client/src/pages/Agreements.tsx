import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageIdBadge from "@/components/PageIdBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  FileSignature,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  Eye,
  FileText,
  User,
  GraduationCap,
  Download,
  Ban,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { GenerateAgreementModal } from "@/components/agreements/GenerateAgreementModal";
import { AgreementTemplateModal } from "@/components/agreements/AgreementTemplateModal";
import { AgreementDetailModal } from "@/components/agreements/AgreementDetailModal";

export default function Agreements() {
  const [activeTab, setActiveTab] = useState<"all" | "awaiting" | "completed" | "templates">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingAgreementId, setViewingAgreementId] = useState<number | null>(null);

  // Queries
  const { data: agreements = [], isLoading: loadingAgreements, refetch: refetchAgreements } = trpc.agreements.list.useQuery();
  const { data: templates = [], isLoading: loadingTemplates, refetch: refetchTemplates } = trpc.agreements.listTemplates.useQuery();

  // Filtered agreements
  const filteredAgreements = useMemo(() => {
    return agreements.filter((ag: any) => {
      // Tab filter
      if (activeTab === "awaiting") {
        if (!["Sent", "Awaiting_Signature", "Viewed"].includes(ag.status)) return false;
      } else if (activeTab === "completed") {
        if (!["Completed", "Signed"].includes(ag.status)) return false;
      }

      // Dropdown status filter
      if (statusFilter !== "all" && ag.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = ag.title.toLowerCase().includes(q);
        const clientMatch = ag.clientName?.toLowerCase().includes(q);
        const tplMatch = ag.templateName?.toLowerCase().includes(q);
        const idMatch = `ag-${ag.id}`.includes(q);
        return titleMatch || clientMatch || tplMatch || idMatch;
      }

      return true;
    });
  }, [agreements, activeTab, statusFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const awaiting = agreements.filter((a: any) => ["Sent", "Awaiting_Signature", "Viewed"].includes(a.status)).length;
    const completed = agreements.filter((a: any) => ["Completed", "Signed"].includes(a.status)).length;
    return {
      all: agreements.length,
      awaiting,
      completed,
      templates: templates.length,
    };
  }, [agreements, templates]);

  const handleOpenDetail = (id: number) => {
    setViewingAgreementId(id);
    setDetailModalOpen(true);
  };

  const handleEditTemplate = (id: number) => {
    setEditingTemplateId(id);
    setTemplateModalOpen(true);
  };

  const handleNewTemplate = () => {
    setEditingTemplateId(null);
    setTemplateModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
      case "Signed":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1 text-[11px]">
            <CheckCircle2 className="w-3 h-3" /> Executed
          </Badge>
        );
      case "Sent":
      case "Awaiting_Signature":
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1 text-[11px]">
            <Clock className="w-3 h-3" /> Awaiting Signature
          </Badge>
        );
      case "Viewed":
        return (
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 gap-1 text-[11px]">
            <Eye className="w-3 h-3" /> Viewed
          </Badge>
        );
      case "Voided":
        return (
          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 gap-1 text-[11px]">
            <Ban className="w-3 h-3" /> Voided
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[11px]">
            Draft
          </Badge>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,181,68,0.2)]">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Agreements</h1>
                  <PageIdBadge id="PG-046" />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Canonical legal documents, e-signatures, and verified Document Vault archive.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNewTemplate}
              className="border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 gap-1.5 text-xs h-9 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              New Template
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setGenerateModalOpen(true)}
              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs h-9 gap-1.5 shadow-[0_0_16px_rgba(245,181,68,0.25)] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              New Agreement
            </Button>
          </div>
        </div>

        {/* Tab & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                All Agreements ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="awaiting" className="text-xs data-[state=active]:bg-amber-400/20 data-[state=active]:text-amber-300">
                Awaiting Signature ({counts.awaiting})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
                Completed ({counts.completed})
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Templates ({counts.templates})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search client, title, ID..."
                className="pl-8 h-8 text-xs bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-500 rounded-lg focus:border-amber-400"
              />
            </div>

            {activeTab !== "templates" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-lg bg-slate-900 border border-slate-800 px-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="completed">Completed</option>
                <option value="voided">Voided</option>
              </select>
            )}
          </div>
        </div>

        {/* Content Area */}
        {activeTab === "templates" ? (
          /* TEMPLATES VIEW */
          <div className="space-y-4">
            {loadingTemplates ? (
              <div className="py-20 text-center text-xs text-slate-400">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                <FileSignature className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">No agreement templates created yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Create reusable agreement templates with merge fields, required acknowledgments, and signature rules.
                </p>
                <Button
                  onClick={handleNewTemplate}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs h-8 cursor-pointer"
                >
                  Create First Template
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((tpl: any) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleEditTemplate(tpl.id)}
                    className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] text-amber-400/90 border-amber-400/30 capitalize">
                          {tpl.agreementType.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-[10px] text-slate-500">v{tpl.version}</span>
                      </div>

                      <h3 className="text-sm font-bold text-white mt-2 group-hover:text-amber-300 transition-colors">
                        {tpl.name}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {tpl.description || "Reusable agreement template with automated merge tokens."}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Updated {new Date(tpl.updatedAt).toLocaleDateString()}</span>
                      <span className="text-amber-400/80 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        Edit Terms <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* AGREEMENTS INSTANCES VIEW */
          <div className="space-y-4">
            {loadingAgreements ? (
              <div className="py-20 text-center text-xs text-slate-400">Loading agreements...</div>
            ) : filteredAgreements.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">No agreements found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  {searchQuery
                    ? "Try adjusting your search query or status filter."
                    : "Generate your first client agreement from a template."}
                </p>
                <Button
                  onClick={() => setGenerateModalOpen(true)}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs h-8 cursor-pointer"
                >
                  Generate Agreement
                </Button>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/90 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4 font-semibold">Ref ID</th>
                        <th className="py-3 px-4 font-semibold">Agreement Title</th>
                        <th className="py-3 px-4 font-semibold">Client / Parent</th>
                        <th className="py-3 px-4 font-semibold">Template</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold">Updated</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredAgreements.map((ag: any) => (
                        <tr
                          key={ag.id}
                          onClick={() => handleOpenDetail(ag.id)}
                          className="hover:bg-slate-850/60 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                            AG-{ag.id.toString().padStart(5, "0")}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-white group-hover:text-amber-300 transition-colors">
                            <div className="flex items-center gap-1.5">
                              {ag.contentLocked ? <Lock className="w-3 h-3 text-amber-400/80" /> : null}
                              <span>{ag.title}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-blue-400" />
                              <span>{ag.clientName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {ag.templateName}
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(ag.status)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {ag.completedAt
                              ? `Executed ${new Date(ag.completedAt).toLocaleDateString()}`
                              : ag.sentAt
                              ? `Sent ${new Date(ag.sentAt).toLocaleDateString()}`
                              : `Created ${new Date(ag.createdAt).toLocaleDateString()}`}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(ag.id);
                              }}
                              className="h-7 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <GenerateAgreementModal
          isOpen={generateModalOpen}
          onClose={() => setGenerateModalOpen(false)}
          onSuccess={(newId) => {
            refetchAgreements();
            handleOpenDetail(newId);
          }}
        />

        <AgreementTemplateModal
          isOpen={templateModalOpen}
          onClose={() => setTemplateModalOpen(false)}
          templateId={editingTemplateId}
          onSuccess={() => {
            refetchTemplates();
          }}
        />

        <AgreementDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setViewingAgreementId(null);
          }}
          agreementId={viewingAgreementId}
          onRefresh={() => {
            refetchAgreements();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
