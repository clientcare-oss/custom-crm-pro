import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageIdBadge from "@/components/PageIdBadge";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Ban,
  Sparkles,
  ArrowRight,
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
          <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 gap-1 text-[11px]">
            <CheckCircle2 className="w-3 h-3" /> Executed
          </Badge>
        );
      case "Sent":
      case "Awaiting_Signature":
        return (
          <Badge className="bg-[#020A17] text-[#FFE394] border border-[#C5A059]/40 gap-1 text-[11px]">
            <Clock className="w-3 h-3" /> Awaiting Signature
          </Badge>
        );
      case "Viewed":
        return (
          <Badge className="bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 gap-1 text-[11px]">
            <Eye className="w-3 h-3" /> Viewed
          </Badge>
        );
      case "Voided":
        return (
          <Badge className="bg-red-950/60 text-red-300 border border-red-500/30 gap-1 text-[11px]">
            <Ban className="w-3 h-3" /> Voided
          </Badge>
        );
      default:
        return (
          <Badge className="bg-[#020A17] text-[#A69371] border border-[#3A2C18] text-[11px]">
            Draft
          </Badge>
        );
    }
  };

  return (
    <DashboardLayout>
      <ScopedErrorBoundary moduleName="Agreements Engine">
        <div 
          className="min-h-screen w-full relative overflow-x-hidden bg-[#07162B] text-slate-100"
          style={{
            backgroundColor: "#07162B",
            backgroundImage: "radial-gradient(ellipse at 50% 0%, #102B4E 0%, #07162B 55%, #030D1A 100%)",
          }}
        >
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Top Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3A2C18] pb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394] shadow-md shadow-black/40">
                  <FileSignature className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-wide text-[#FFF4D4]">Agreements</h1>
                    <PageIdBadge id="PG-046" />
                  </div>
                  <p className="text-xs sm:text-sm text-[#C6B697] mt-1">
                    Canonical legal documents, e-signatures, and verified Document Vault archive.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNewTemplate}
                  className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] gap-1.5 text-xs h-9 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#FFE394]" />
                  New Template
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setGenerateModalOpen(true)}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 gap-1.5 border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  New Agreement
                </Button>
              </div>
            </div>

            {/* Tab & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3A2C18] pb-4">
              <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
                <TabsList className="bg-[#020A17] border border-[#3A2C18] p-1 rounded-xl">
                  <TabsTrigger
                    value="all"
                    className="text-xs text-[#C6B697] data-[state=active]:bg-[#05142B] data-[state=active]:text-[#FFE394] data-[state=active]:border data-[state=active]:border-[#C5A059]/50 shadow-inner"
                  >
                    All Agreements ({counts.all})
                  </TabsTrigger>
                  <TabsTrigger
                    value="awaiting"
                    className="text-xs text-[#C6B697] data-[state=active]:bg-[#05142B] data-[state=active]:text-[#FFE394] data-[state=active]:border data-[state=active]:border-[#C5A059]/50 shadow-inner"
                  >
                    Awaiting Signature ({counts.awaiting})
                  </TabsTrigger>
                  <TabsTrigger
                    value="completed"
                    className="text-xs text-[#C6B697] data-[state=active]:bg-[#05142B] data-[state=active]:text-[#FFE394] data-[state=active]:border data-[state=active]:border-[#C5A059]/50 shadow-inner"
                  >
                    Completed ({counts.completed})
                  </TabsTrigger>
                  <TabsTrigger
                    value="templates"
                    className="text-xs text-[#C6B697] data-[state=active]:bg-[#05142B] data-[state=active]:text-[#FFE394] data-[state=active]:border data-[state=active]:border-[#C5A059]/50 shadow-inner"
                  >
                    Templates ({counts.templates})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A69371]" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client, title, ID..."
                    className="pl-8 h-8 text-xs bg-[#020A17]/90 border border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371] rounded-lg focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                  />
                </div>

                {activeTab !== "templates" && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 rounded-lg bg-[#020A17]/90 border border-[#3A2C18] px-2 text-xs text-[#FFF4D4] focus:outline-none focus:border-[#C5A059] cursor-pointer"
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
                  <div className="py-20 text-center text-xs text-[#C6B697]">Loading templates...</div>
                ) : templates.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-[#3A2C18] rounded-2xl bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
                    <FileSignature className="w-10 h-10 text-[#A69371] mx-auto mb-3" />
                    <h3 className="text-sm font-serif font-bold text-[#FFF4D4]">No agreement templates created yet</h3>
                    <p className="text-xs text-[#C6B697] max-w-sm mx-auto mt-1 mb-4">
                      Create reusable agreement templates with merge fields, required acknowledgments, and signature rules.
                    </p>
                    <Button
                      onClick={handleNewTemplate}
                      className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 cursor-pointer border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
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
                        className="p-5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] hover:border-[#C5A059]/60 transition-all cursor-pointer flex flex-col justify-between group shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.9)]"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant="outline" className="text-[10px] bg-[#020A17] text-[#FFE394] border border-[#3A2C18] capitalize">
                              {tpl.agreementType.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-[10px] text-[#A69371]">v{tpl.version}</span>
                          </div>

                          <h3 className="text-sm font-serif font-bold text-[#FFF4D4] mt-2 group-hover:text-[#FFE394] transition-colors">
                            {tpl.name}
                          </h3>

                          <p className="text-xs text-[#C6B697] line-clamp-2 mt-1 leading-relaxed">
                            {tpl.description || "Reusable agreement template with automated merge tokens."}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#3A2C18] flex items-center justify-between text-[11px] text-[#A69371]">
                          <span>Updated {new Date(tpl.updatedAt).toLocaleDateString()}</span>
                          <span className="text-[#FFE394] font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
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
                  <div className="py-20 text-center text-xs text-[#C6B697]">Loading agreements...</div>
                ) : filteredAgreements.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-[#3A2C18] rounded-2xl bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
                    <FileText className="w-10 h-10 text-[#A69371] mx-auto mb-3" />
                    <h3 className="text-sm font-serif font-bold text-[#FFF4D4]">No agreements found</h3>
                    <p className="text-xs text-[#C6B697] max-w-sm mx-auto mt-1 mb-4">
                      {searchQuery
                        ? "Try adjusting your search query or status filter."
                        : "Generate your first client agreement from a template."}
                    </p>
                    <Button
                      onClick={() => setGenerateModalOpen(true)}
                      className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 cursor-pointer border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)]"
                    >
                      Generate Agreement
                    </Button>
                  </div>
                ) : (
                  <div className="border border-[#3A2C18] rounded-xl overflow-hidden bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#3A2C18] bg-[#020A17]/80 text-[#C6B697] uppercase text-[10px] tracking-wider">
                            <th className="py-3 px-4 font-semibold">Ref ID</th>
                            <th className="py-3 px-4 font-semibold">Agreement Title</th>
                            <th className="py-3 px-4 font-semibold">Client / Parent</th>
                            <th className="py-3 px-4 font-semibold">Template</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                            <th className="py-3 px-4 font-semibold">Updated</th>
                            <th className="py-3 px-4 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3A2C18]/60">
                          {filteredAgreements.map((ag: any) => (
                            <tr
                              key={ag.id}
                              onClick={() => handleOpenDetail(ag.id)}
                              className="hover:bg-[#07162B] transition-colors cursor-pointer group"
                            >
                              <td className="py-3.5 px-4 font-mono text-[#A69371] text-[11px]">
                                AG-{ag.id.toString().padStart(5, "0")}
                              </td>
                              <td className="py-3.5 px-4 font-serif font-semibold text-sm text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors">
                                <div className="flex items-center gap-1.5">
                                  {ag.contentLocked ? <Lock className="w-3.5 h-3.5 text-[#FFE394]" /> : null}
                                  <span>{ag.title}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-[#C6B697]">
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-[#FFE394]" />
                                  <span>{ag.clientName}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-[#A69371] text-[11px]">
                                {ag.templateName}
                              </td>
                              <td className="py-3.5 px-4">
                                {getStatusBadge(ag.status)}
                              </td>
                              <td className="py-3.5 px-4 text-[#A69371] text-[11px]">
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
                                  className="h-7 px-2.5 text-xs border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] cursor-pointer"
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
        </div>
      </ScopedErrorBoundary>
    </DashboardLayout>
  );
}
