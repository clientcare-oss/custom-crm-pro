import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import {
  File,
  Users,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";
import PageIdBadge from "@/components/PageIdBadge";
import { AuthoritativeIepCard } from "@/components/portal/vault/AuthoritativeIepCard";
import { AiDocumentAnalysisModal } from "@/components/portal/vault/AiDocumentAnalysisModal";

export default function ClientFiles() {
  const [, setLocation] = useLocation();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [activeAnalysisFileId, setActiveAnalysisFileId] = useState<number | null>(null);
  const [activeAnalysisFileName, setActiveAnalysisFileName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Get all contacts to show as clients
  const { data: contacts } = trpc.contacts.list.useQuery();

  // Get files for selected client
  const { data: clientFiles } = trpc.clientFiles.listForAdmin.useQuery(
    { clientId: selectedClientId! },
    { enabled: !!selectedClientId }
  );

  const selectedContact = contacts?.find((c) => c.id === selectedClientId);

  const filteredFiles = (clientFiles || []).filter((file) => {
    if (!searchQuery) return true;
    return (
      file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.documentType && file.documentType.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (file.category && file.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Document Vault & Client Files
            </h1>
            <PageIdBadge id="PG-010-VLT" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Authoritative IEP tracking, automated reading, and family document management
          </p>
        </div>
      </div>

      {selectedClientId ? (
        <div className="space-y-6">
          {/* Back button & Client Overview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/60">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setSelectedClientId(null);
                  setSelectedStudentId(null);
                }}
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-2 rounded-lg border-border text-xs font-semibold"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to All Clients
              </Button>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {selectedContact?.firstName} {selectedContact?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{selectedContact?.email || "No email on record"}</p>
              </div>
            </div>

            {/* Search filter within client files */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search documents or types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>

          {/* AUTHORITATIVE CURRENT IEP CARD & VERSION HISTORY */}
          <AuthoritativeIepCard
            clientId={selectedClientId}
            studentId={selectedStudentId || undefined}
            onViewDocument={(url) => window.open(url, "_blank")}
            onOpenAnalysis={(fileId) => {
              const f = clientFiles?.find((item) => item.id === fileId);
              setActiveAnalysisFileId(fileId);
              setActiveAnalysisFileName(f?.fileName || "Document");
            }}
          />

          {/* Complete Vault Inventory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-wider text-muted-foreground">
                Document Inventory ({filteredFiles.length})
              </h2>
            </div>

            {filteredFiles.length > 0 ? (
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border/60">
                {filteredFiles.map((file) => {
                  const isCurrent = (file as any).isCurrentPlan === 1;
                  const isBase = (file as any).isBaseIep === 1;
                  const isAmend = (file as any).isAmendment === 1;
                  const confirmStatus = (file as any).confirmationStatus;

                  return (
                    <div
                      key={file.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2.5 rounded-lg border ${
                            isCurrent
                              ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                              : "bg-muted/50 border-border text-muted-foreground"
                          }`}
                        >
                          <File className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{file.fileName}</p>
                            {file.documentType && (
                              <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground">
                                {file.documentType}
                              </Badge>
                            )}
                            {isCurrent && (
                              <Badge className="text-[10px] bg-teal-500/20 text-teal-300 border-teal-500/30">
                                Current Plan
                              </Badge>
                            )}
                            {confirmStatus && confirmStatus !== "Unconfirmed" && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  confirmStatus === "Waypoint Confirmed"
                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                    : confirmStatus === "Parent Confirmed"
                                    ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                }`}
                              >
                                {confirmStatus}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                            <span>
                              {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : "Unknown size"}
                            </span>
                            <span>&middot;</span>
                            <span>Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</span>
                            {file.documentDate && (
                              <>
                                <span>&middot;</span>
                                <span className="text-foreground/80">Plan Date: {file.documentDate}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-border gap-1.5"
                          onClick={() => {
                            setActiveAnalysisFileId(file.id);
                            setActiveAnalysisFileName(file.fileName);
                          }}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                          AI Analysis
                        </Button>

                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
                <File className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm font-semibold text-foreground mb-1">No documents found</p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? "Try refining your search terms" : "This client has not uploaded any documents yet"}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Client Directory Grid */
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
            Select a Client to View Document Vault & Current IEP Status
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contacts && contacts.length > 0 ? (
              contacts.map((contact) => (
                <Card
                  key={contact.id}
                  onClick={() => setSelectedClientId(contact.id)}
                  className="cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-teal-500/40 transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-105 transition-transform">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-foreground group-hover:text-teal-300 transition-colors truncate">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{contact.email || "No email"}</p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm font-semibold text-foreground mb-1">No clients yet</p>
                <p className="text-xs text-muted-foreground">Add contacts to start managing their Document Vaults</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI DOCUMENT ANALYSIS MODAL */}
      <AiDocumentAnalysisModal
        isOpen={!!activeAnalysisFileId}
        onClose={() => {
          setActiveAnalysisFileId(null);
          setActiveAnalysisFileName("");
        }}
        fileId={activeAnalysisFileId}
        fileName={activeAnalysisFileName}
      />
    </div>
  );
}
