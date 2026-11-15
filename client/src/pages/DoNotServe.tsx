import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Loader2, Lock, Plus, Search, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PageIdBadge from "@/components/PageIdBadge";
import ScopedErrorBoundary from "@/components/ScopedErrorBoundary";
import { OffboardingModal } from "@/components/contact/workspace/dialogs/OffboardingModal";
import { AddRestrictedPersonDrawer } from "@/components/do-not-serve/AddRestrictedPersonDrawer";
import { ArchivedRecordsSection } from "@/components/do-not-serve/ArchivedRecordsSection";
import {
  BlacklistClientDrawer,
  type BlacklistClientTarget,
} from "@/components/do-not-serve/BlacklistClientDrawer";
import { DoNotServeDetailDrawer } from "@/components/do-not-serve/DoNotServeDetailDrawer";
import {
  DNS_THEME,
  PROVIDER_SCOPE_NOTE,
  formatPhoneDisplay,
} from "@/components/do-not-serve/doNotServeStyles";

type ArchiveLocalView = "archived" | "do-not-serve";

function resolveInitialArchiveView(pathname: string): ArchiveLocalView {
  if (pathname === "/do-not-serve" || pathname.startsWith("/do-not-serve/")) {
    return "do-not-serve";
  }
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const viewParam = (params.get("view") || params.get("tab") || "").toLowerCase();
    if (viewParam === "do-not-serve" || viewParam === "do_not_serve" || viewParam === "restrictions") {
      return "do-not-serve";
    }
  }
  return "archived";
}

export default function DoNotServe() {
  const [location] = useLocation();
  const utils = trpc.useUtils();

  const [activeView, setActiveView] = useState<ArchiveLocalView>(() =>
    resolveInitialArchiveView(
      typeof window !== "undefined" ? window.location.pathname : location
    )
  );

  useEffect(() => {
    const currentPathname =
      typeof window !== "undefined" ? window.location.pathname : location;
    setActiveView(resolveInitialArchiveView(currentPathname));
  }, [location]);

  const handleSelectView = (nextView: ArchiveLocalView) => {
    setActiveView(nextView);
    if (typeof window !== "undefined") {
      const nextUrl =
        nextView === "do-not-serve" ? "/archive?view=do-not-serve" : "/archive";
      window.history.replaceState(null, "", nextUrl);
    }
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "lifted">("active");
  const [addOpen, setAddOpen] = useState(false);
  const [blacklistTarget, setBlacklistTarget] = useState<BlacklistClientTarget | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [undoBanner, setUndoBanner] = useState<{
    entryId: number;
    displayName: string;
  } | null>(null);
  const [offboardingContactId, setOffboardingContactId] = useState<number | null>(null);
  const [showScopeDetails, setShowScopeDetails] = useState(false);

  const { data: contextInfo } = trpc.doNotServe.getContextInfo.useQuery();
  const canEdit = contextInfo?.permissions?.canEdit ?? true;
  const crmTimeZone = contextInfo?.crmTimeZone || "America/New_York";

  const {
    data: listData,
    isLoading,
    error,
    refetch,
  } = trpc.doNotServe.list.useQuery(
    {
      status: statusFilter,
      search: search.trim() || undefined,
    },
    { enabled: activeView === "do-not-serve" }
  );
  const entries = listData?.rows || [];

  const { data: offboardingContact } = trpc.contacts.get.useQuery(
    { id: offboardingContactId ?? 0 },
    { enabled: Boolean(offboardingContactId && offboardingContactId > 0) }
  );

  const undoMutation = trpc.doNotServe.undoCreate.useMutation({
    onSuccess: async () => {
      const undoneName = undoBanner?.displayName || "Record";
      setUndoBanner(null);
      await Promise.all([
        utils.doNotServe.list.invalidate(),
        utils.doNotServe.getActiveContactFlags.invalidate(),
      ]);
      toast.success(`Reversed restriction for ${undoneName} ("Added in error").`);
    },
    onError: (err) => {
      toast.error(err.message || "Unable to undo restriction.");
    },
  });

  return (
    <ScopedErrorBoundary moduleName="Archive">
      <div
        className={cn(
          "min-h-screen w-full max-w-full overflow-x-hidden flex flex-col",
          DNS_THEME.pageBg
        )}
        style={DNS_THEME.ambientGlowStyle}
      >
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 pt-7 pb-12 flex-1 flex flex-col">
          {/* Quiet Top Eyebrow */}
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <div className="inline-flex items-center gap-2 text-xs text-[#9FB0CF]">
              <Lock className="w-3.5 h-3.5 text-[#DFC07C]" />
              <span>Staff only</span>
            </div>
            <div className="flex items-center gap-2">
              <PageIdBadge
                id={activeView === "do-not-serve" ? "PG-048-DNS" : "PG-048"}
                name={activeView === "do-not-serve" ? "Archive → Do Not Serve" : "Archive"}
              />
            </div>
          </div>

          {/* Overall Page Heading & Contextual Action */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
            <div className="space-y-1.5 min-w-0">
              <h1 className="font-serif text-3xl sm:text-[38px] font-normal tracking-tight text-[#F5F8FD] leading-tight">
                Archive
              </h1>
              <p className="text-sm text-[#9FB0CF]">
                {activeView === "archived"
                  ? "Closed records. Kept within reach."
                  : "Internal service restrictions and matching alerts across connected channels."}
              </p>
            </div>

            {activeView === "do-not-serve" && canEdit && (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className={cn(
                  DNS_THEME.goldPrimaryBtn,
                  "h-10 px-4 text-sm inline-flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
                )}
              >
                <Plus className="w-4 h-4" />
                <span>Add person</span>
              </button>
            )}
          </div>

          {/* Two Simple Local Views: Archived records | Do Not Serve */}
          <div className="mb-6 border-b border-[#182746]">
            <div
              role="tablist"
              aria-label="Archive views"
              className="flex items-center gap-6 flex-wrap"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeView === "archived"}
                onClick={() => handleSelectView("archived")}
                className={cn(
                  "pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px",
                  activeView === "archived"
                    ? "border-[#DFC07C] text-[#F5F8FD]"
                    : "border-transparent text-[#8EA2C8] hover:text-[#DCE5F5]"
                )}
              >
                Archived records
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeView === "do-not-serve"}
                onClick={() => handleSelectView("do-not-serve")}
                className={cn(
                  "pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px",
                  activeView === "do-not-serve"
                    ? "border-[#DFC07C] text-[#F5F8FD]"
                    : "border-transparent text-[#8EA2C8] hover:text-[#DCE5F5]"
                )}
              >
                Do Not Serve
              </button>
            </div>
          </div>

          {/* Post-Save Calm Confirmation with Immediate Undo */}
          {undoBanner && (
            <div
              role="status"
              className="mb-5 rounded-md bg-[#071535] border border-[#DFC07C]/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
            >
              <p className="text-sm text-[#EEF3FA]">
                Restriction saved for{" "}
                <span className="font-medium">{undoBanner.displayName}</span>.
              </p>
              <div className="flex items-center gap-3">
                {activeView === "archived" && (
                  <button
                    type="button"
                    onClick={() => handleSelectView("do-not-serve")}
                    className="text-xs text-[#9FB0CF] hover:text-white underline-offset-2 hover:underline cursor-pointer"
                  >
                    Open Do Not Serve
                  </button>
                )}
                <button
                  type="button"
                  disabled={undoMutation.isPending}
                  onClick={() => undoMutation.mutate({ id: undoBanner.entryId })}
                  className="text-sm font-medium text-[#DFC07C] hover:underline cursor-pointer disabled:opacity-50"
                >
                  {undoMutation.isPending ? "Undoing…" : "Undo"}
                </button>
                <button
                  type="button"
                  onClick={() => setUndoBanner(null)}
                  className="text-[#7E92B8] hover:text-white p-1 cursor-pointer"
                  aria-label="Dismiss notice"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {activeView === "archived" ? (
            <ArchivedRecordsSection
              canEdit={canEdit}
              crmTimeZone={crmTimeZone}
              onRequestBlacklist={(target) => setBlacklistTarget(target)}
              onOpenRestrictionDetail={(entryId) => setSelectedEntryId(entryId)}
            />
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Single Search Field + Small Active / Lifted Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-[#7E92B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, phone, or email"
                    aria-label="Search name, phone, or email"
                    className={cn(DNS_THEME.input, "h-11 pl-10 pr-9 text-sm")}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7E92B8] hover:text-white cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div
                  role="tablist"
                  aria-label="Restriction status filter"
                  className="inline-flex items-center rounded-md bg-[#051029] border border-[#1E3158] p-1 shrink-0 self-start sm:self-auto"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === "active"}
                    onClick={() => setStatusFilter("active")}
                    className={cn(
                      "px-3.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer",
                      statusFilter === "active"
                        ? "bg-[#10224A] text-[#F5F8FD] border border-[#2C4478]"
                        : "text-[#8EA2C8] hover:text-[#DCE5F5]"
                    )}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === "lifted"}
                    onClick={() => setStatusFilter("lifted")}
                    className={cn(
                      "px-3.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer",
                      statusFilter === "lifted"
                        ? "bg-[#10224A] text-[#F5F8FD] border border-[#2C4478]"
                        : "text-[#8EA2C8] hover:text-[#DCE5F5]"
                    )}
                  >
                    Lifted
                  </button>
                </div>
              </div>

              {/* Clean Register List */}
              <div className="flex-1">
                {isLoading ? (
                  <div className="py-16 flex items-center justify-center gap-2.5 text-sm text-[#9FB0CF]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#DFC07C]" />
                    <span>Loading register…</span>
                  </div>
                ) : error ? (
                  <div className="rounded-md bg-[#06122E] border border-[#1E3158] p-6 text-center space-y-3">
                    <p className="text-sm text-[#DCE5F5]">
                      {error.message || "Unable to load Do Not Serve records."}
                    </p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className={cn(DNS_THEME.secondaryBtn, "h-9 px-4 text-xs")}
                    >
                      Retry
                    </button>
                  </div>
                ) : !entries || entries.length === 0 ? (
                  <div className="rounded-md bg-[#040D22]/80 border border-[#172647] py-14 px-6 text-center space-y-1.5">
                    <p className="font-serif text-base text-[#DCE5F5]">
                      {search.trim()
                        ? "No matching records found"
                        : statusFilter === "active"
                        ? "No active restrictions recorded"
                        : "No lifted restrictions recorded"}
                    </p>
                    <p className="text-xs text-[#7E92B8]">
                      {search.trim()
                        ? "Try searching by full name, phone number, or email address."
                        : statusFilter === "active"
                        ? "Archived clients blacklisted by staff or manual entries will appear here."
                        : "Restrictions lifted by authorized staff remain archived here with full history."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border border-[#182746] bg-[#040D23]/85 divide-y divide-[#162544] overflow-hidden">
                    {entries.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedEntryId(row.id)}
                        className={cn(
                          "w-full px-4 sm:px-5 py-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 cursor-pointer",
                          DNS_THEME.rowHover
                        )}
                      >
                        {/* Name + Subtle Unlinked vs Client Distinction */}
                        <div className="min-w-0 flex items-center gap-2.5 flex-wrap">
                          <span className="font-serif text-base sm:text-[17px] text-[#F4F7FC] break-words">
                            {row.displayName}
                          </span>
                          {!row.linkedContactId && (
                            <span className="text-[11px] text-[#7E92B8] px-2 py-0.5 rounded bg-[#081634] border border-[#1C2F57]">
                              Non-client
                            </span>
                          )}
                        </div>

                        {/* Primary Phone + Concise Restriction Status + Chevron */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-7 shrink-0">
                          <span className="text-sm text-[#9FB0CF] tabular-nums">
                            {formatPhoneDisplay(row.primaryPhone)}
                          </span>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "text-xs font-medium",
                                row.status === "active" ? "text-[#DFC07C]" : "text-[#8EA2C8]"
                              )}
                            >
                              {row.status === "active"
                                ? row.appliesTo === "household"
                                  ? "Restricted · Household"
                                  : "Restricted"
                                : "Lifted"}
                            </span>
                            <ChevronRight className="w-4 h-4 text-[#6E82A6]" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quiet Internal Footer & Truthful Channel Coverage Disclosure */}
          <footer className="mt-12 pt-5 border-t border-[#162544] space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-[#7E92B8]">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>
                  Internal records only · Never shown in Parent Portal or public forms
                </span>
              </span>
              <button
                type="button"
                onClick={() => setShowScopeDetails((v) => !v)}
                className="text-[#9FB0CF] hover:text-white underline-offset-2 hover:underline cursor-pointer"
              >
                {showScopeDetails ? "Hide channel coverage" : "Channel coverage & limits"}
              </button>
            </div>
            {showScopeDetails && (
              <p className="text-xs text-[#7E92B8] leading-relaxed">
                {PROVIDER_SCOPE_NOTE}
              </p>
            )}
          </footer>
        </div>

        {/* Blacklist Client Drawer (from Archived records) */}
        <BlacklistClientDrawer
          open={Boolean(blacklistTarget)}
          onOpenChange={(open) => {
            if (!open) setBlacklistTarget(null);
          }}
          target={blacklistTarget}
          onSaved={(res) => {
            setBlacklistTarget(null);
            setStatusFilter("active");
            setUndoBanner(res);
          }}
          onOpenExistingEntry={(entryId) => {
            setBlacklistTarget(null);
            setSelectedEntryId(entryId);
          }}
          onOpenOffboarding={(contactId) => {
            setBlacklistTarget(null);
            setOffboardingContactId(contactId);
          }}
        />

        {/* Manual Non-Client Add Drawer */}
        <AddRestrictedPersonDrawer
          open={addOpen}
          onOpenChange={setAddOpen}
          onSaved={(res) => {
            setStatusFilter("active");
            setUndoBanner(res);
          }}
        />

        {/* Detail Drawer */}
        <DoNotServeDetailDrawer
          entryId={selectedEntryId}
          open={Boolean(selectedEntryId)}
          onOpenChange={(open) => {
            if (!open) setSelectedEntryId(null);
          }}
          onOpenOffboarding={(contactId) => setOffboardingContactId(contactId)}
        />

        {/* Existing Offboarding Workflow Modal */}
        {offboardingContact && (
          <OffboardingModal
            open={Boolean(offboardingContactId)}
            onOpenChange={(open) => {
              if (!open) setOffboardingContactId(null);
            }}
            contactId={offboardingContact.id}
            contact={offboardingContact}
            onSuccess={() => {
              utils.contacts.get.invalidate({ id: offboardingContact.id });
              utils.contacts.list.invalidate();
            }}
          />
        )}
      </div>
    </ScopedErrorBoundary>
  );
}
