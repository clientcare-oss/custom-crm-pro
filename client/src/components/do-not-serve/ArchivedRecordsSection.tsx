import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChevronRight,
  ExternalLink,
  Loader2,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDoNotServeTimestamp, normalizePhoneForMatch } from "@shared/doNotServe";
import type { BlacklistClientTarget } from "./BlacklistClientDrawer";
import { DNS_THEME, formatPhoneDisplay } from "./doNotServeStyles";

interface ArchivedRecordsSectionProps {
  canEdit: boolean;
  crmTimeZone: string;
  onRequestBlacklist: (target: BlacklistClientTarget) => void;
  onOpenRestrictionDetail: (entryId: number) => void;
}

function isStudentContactRecord(c: any): boolean {
  if (!c) return false;
  const title = String(c.jobTitle || "").toLowerCase().trim();
  if (title.includes("student")) return true;
  if (c.parentContactId != null && c.parentContactId > 0) return true;
  if (c.studentStatus || c.gradeLevel || c.schoolName || c.caseId) return true;
  return false;
}

export function isArchivedContactRecord(c: any): boolean {
  if (!c) return false;
  if (Boolean(c.archivedAt)) return true;
  const acct = String(c.accountStatus || "").toLowerCase().trim();
  const stuStatus = String(c.studentStatus || "").toLowerCase().trim();
  if (acct === "closed" || acct === "archived" || stuStatus === "archived") {
    return true;
  }
  const tags = String(c.tags || "")
    .toLowerCase()
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.includes("archived");
}

function formatArchivedTimestamp(raw: unknown, timeZone: string): string | null {
  if (!raw) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime())
      ? null
      : formatDoNotServeTimestamp(raw.toISOString(), timeZone);
  }
  if (typeof raw === "number") {
    const ms = raw < 10_000_000_000 ? raw * 1000 : raw;
    const d = new Date(ms);
    return Number.isNaN(d.getTime())
      ? null
      : formatDoNotServeTimestamp(d.toISOString(), timeZone);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      const ms = num < 10_000_000_000 ? num * 1000 : num;
      const d = new Date(ms);
      return Number.isNaN(d.getTime())
        ? null
        : formatDoNotServeTimestamp(d.toISOString(), timeZone);
    }
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime())
      ? null
      : formatDoNotServeTimestamp(d.toISOString(), timeZone);
  }
  return null;
}

export function ArchivedRecordsSection({
  canEdit,
  crmTimeZone,
  onRequestBlacklist,
  onOpenRestrictionDetail,
}: ArchivedRecordsSectionProps) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  const {
    data: contacts,
    isLoading,
    error,
    refetch,
  } = trpc.contacts.list.useQuery();

  const { data: restrictedContactMap } =
    trpc.doNotServe.getActiveContactFlags.useQuery();

  const unarchiveMutation = trpc.contacts.unarchive.useMutation({
    onSuccess: async () => {
      setSelectedContactId(null);
      await utils.contacts.list.invalidate();
      toast.success(
        "Record unarchived. Any active Do Not Serve restriction remains unchanged."
      );
    },
    onError: (err) => {
      toast.error(err.message || "Unable to unarchive record.");
    },
  });

  const archivedRecords = useMemo(() => {
    if (!contacts) return [];
    const q = search.trim().toLowerCase();
    const qPhone = normalizePhoneForMatch(search);

    return contacts
      .filter((c: any) => isArchivedContactRecord(c))
      .filter((c: any) => {
        if (!q) return true;
        const fullName = `${c.firstName || ""} ${c.lastName || ""}`
          .trim()
          .toLowerCase();
        const email = String(c.email || "").toLowerCase();
        const rawPhone = String(c.phone || "").toLowerCase();
        const normPhone = normalizePhoneForMatch(c.phone || "");

        if (fullName.includes(q) || email.includes(q) || rawPhone.includes(q)) {
          return true;
        }
        if (qPhone && normPhone && normPhone.includes(qPhone)) {
          return true;
        }
        return false;
      })
      .sort((a: any, b: any) => {
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [contacts, search]);

  const selectedContact = useMemo(() => {
    if (!selectedContactId || !contacts) return null;
    return contacts.find((c: any) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  const selectedRestriction = selectedContact
    ? restrictedContactMap?.[selectedContact.id] || null
    : null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Search Field */}
      <div className="mb-5">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#7E92B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, or email"
            aria-label="Search archived records by name, phone, or email"
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
      </div>

      {/* Archived List */}
      <div className="flex-1">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-2.5 text-sm text-[#9FB0CF]">
            <Loader2 className="w-4 h-4 animate-spin text-[#DFC07C]" />
            <span>Loading archived records…</span>
          </div>
        ) : error ? (
          <div className="rounded-md bg-[#06122E] border border-[#1E3158] p-6 text-center space-y-3">
            <p className="text-sm text-[#DCE5F5]">
              {error.message || "Unable to load archived records."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className={cn(DNS_THEME.secondaryBtn, "h-9 px-4 text-xs")}
            >
              Retry
            </button>
          </div>
        ) : archivedRecords.length === 0 ? (
          <div className="rounded-md bg-[#040D22]/80 border border-[#172647] py-14 px-6 text-center space-y-1.5">
            <p className="font-serif text-base text-[#DCE5F5]">
              {search.trim()
                ? "No matching archived records found"
                : "No archived records yet"}
            </p>
            <p className="text-xs text-[#7E92B8]">
              {search.trim()
                ? "Try searching by full name, phone number, or email address."
                : "Closed records moved to Archive from Contacts or Student Workspace remain kept within reach here."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-[#182746] bg-[#040D23]/85 divide-y divide-[#162544] overflow-hidden">
            {archivedRecords.map((record: any) => {
              const fullName =
                `${record.firstName || ""} ${record.lastName || ""}`.trim() ||
                record.email ||
                `Record #${record.id}`;
              const activeFlag = restrictedContactMap?.[record.id] || null;
              const isSelected = selectedContactId === record.id;

              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedContactId(record.id)}
                  className={cn(
                    "w-full px-4 sm:px-5 py-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 cursor-pointer",
                    DNS_THEME.rowHover,
                    isSelected && "bg-[#09183B]"
                  )}
                >
                  <div className="min-w-0 flex items-center gap-2.5 flex-wrap">
                    <span className="font-serif text-base sm:text-[17px] text-[#F4F7FC] break-words">
                      {fullName}
                    </span>
                    {activeFlag && (
                      <span className={DNS_THEME.quietGoldPill}>
                        {activeFlag.appliesTo === "household"
                          ? "Restricted · Household"
                          : "Restricted"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-7 shrink-0">
                    <span className="text-sm text-[#9FB0CF] tabular-nums break-all sm:break-normal">
                      {record.phone
                        ? formatPhoneDisplay(record.phone)
                        : record.email || "—"}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-[#8EA2C8]">Archived</span>
                      <ChevronRight className="w-4 h-4 text-[#6E82A6]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Focused Archived Record Detail Drawer */}
      <Sheet
        open={Boolean(selectedContact)}
        onOpenChange={(open) => {
          if (!open) setSelectedContactId(null);
        }}
      >
        <SheetContent
          side="right"
          className={cn(
            "w-full sm:max-w-[460px] p-0 flex flex-col gap-0 overflow-hidden [&>button]:hidden",
            DNS_THEME.drawerContent
          )}
        >
          <SheetTitle className="sr-only">
            {selectedContact
              ? `Archived record · ${selectedContact.firstName || ""} ${selectedContact.lastName || ""}`.trim()
              : "Archived record"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Archived client record details and contextual actions including Blacklist client.
          </SheetDescription>

          {selectedContact && (
            <>
              <div className="px-6 pt-6 pb-5 border-b border-[#192848] shrink-0">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[#8EA2C8] font-medium">
                      ARCHIVED RECORD
                    </span>
                    <span className="text-[10px] font-mono text-[#6E82A6] px-1.5 py-0.5 rounded bg-[#071430] border border-[#1B2D52]">
                      PG-048-ARC
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedContactId(null)}
                    className="p-1.5 rounded-md text-[#8EA2C8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    aria-label="Close drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <h2 className="font-serif text-[26px] leading-tight font-normal text-[#F5F8FD] break-words">
                    {`${selectedContact.firstName || ""} ${selectedContact.lastName || ""}`.trim() ||
                      selectedContact.email ||
                      `Record #${selectedContact.id}`}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={DNS_THEME.quietNeutralPill}>Archived</span>
                    {selectedRestriction && (
                      <span className={DNS_THEME.quietGoldPill}>
                        {selectedRestriction.appliesTo === "household"
                          ? "Restricted · Household"
                          : "Restricted"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#9FB0CF]">
                  {selectedContact.phone && (
                    <span>{formatPhoneDisplay(selectedContact.phone)}</span>
                  )}
                  {selectedContact.email && (
                    <span className="break-all">{selectedContact.email}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedContact.id;
                      const isStu = isStudentContactRecord(selectedContact);
                      setSelectedContactId(null);
                      setLocation(isStu ? `/students/${id}` : `/contacts/${id}`);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-[#DFC07C] hover:underline cursor-pointer"
                  >
                    <span>Open record</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Archive Context */}
                <section className="space-y-2">
                  <h3 className="text-xs uppercase tracking-[0.14em] text-[#8EA2C8] font-medium">
                    Archive status
                  </h3>
                  <div className="rounded-md bg-[#051029] border border-[#192848] p-3.5 space-y-1.5">
                    <p className="text-sm text-[#EEF3FA] leading-relaxed break-words">
                      {(selectedContact as any).archiveReason ||
                        "Closed record kept in Archive."}
                    </p>
                    {formatArchivedTimestamp(
                      (selectedContact as any).archivedAt,
                      crmTimeZone
                    ) && (
                      <p className="text-xs text-[#7E92B8]">
                        Archived{" "}
                        {formatArchivedTimestamp(
                          (selectedContact as any).archivedAt,
                          crmTimeZone
                        )}
                      </p>
                    )}
                  </div>
                </section>

                {/* Do Not Serve Status / Action */}
                <section className="space-y-2.5 pt-1 border-t border-[#192848]">
                  <h3 className="text-xs uppercase tracking-[0.14em] text-[#8EA2C8] font-medium pt-3">
                    Service restriction
                  </h3>
                  {selectedRestriction ? (
                    <div className="rounded-md bg-[#061430] border border-[#DFC07C]/35 p-3.5 space-y-2.5">
                      <p className="text-sm text-[#EEF3FA] leading-relaxed">
                        This record has an active{" "}
                        <span className="text-[#DFC07C] font-medium">
                          Do Not Serve
                        </span>{" "}
                        restriction (
                        {selectedRestriction.appliesTo === "household"
                          ? "Household"
                          : "Individual"}{" "}
                        scope).
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const entryId = selectedRestriction.entryId;
                          setSelectedContactId(null);
                          onOpenRestrictionDetail(entryId);
                        }}
                        className="text-xs font-medium text-[#DFC07C] hover:underline cursor-pointer"
                      >
                        View restriction →
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#9FB0CF] leading-relaxed">
                      Archive status and Do Not Serve status are separate. Use{" "}
                      <span className="text-[#DCE5F5]">Blacklist client</span>{" "}
                      only when Waypoint will not provide future services and
                      staff should be alerted on matching contact details.
                    </p>
                  )}
                </section>
              </div>

              <div className="px-6 py-4 border-t border-[#192848] bg-[#030A1C] shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {canEdit && Boolean((selectedContact as any).archivedAt) ? (
                  <button
                    type="button"
                    disabled={unarchiveMutation.isPending}
                    onClick={() =>
                      unarchiveMutation.mutate({ id: selectedContact.id })
                    }
                    className={cn(
                      DNS_THEME.secondaryBtn,
                      "h-10 px-4 text-sm inline-flex items-center justify-center gap-2"
                    )}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {unarchiveMutation.isPending ? "Unarchiving…" : "Unarchive"}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedContactId(null)}
                    className={cn(DNS_THEME.secondaryBtn, "h-10 px-4 text-sm")}
                  >
                    Close
                  </button>
                )}

                {selectedRestriction ? (
                  <button
                    type="button"
                    onClick={() => {
                      const entryId = selectedRestriction.entryId;
                      setSelectedContactId(null);
                      onOpenRestrictionDetail(entryId);
                    }}
                    className={cn(DNS_THEME.goldPrimaryBtn, "h-10 px-5 text-sm")}
                  >
                    View restriction
                  </button>
                ) : (
                  canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        const target: BlacklistClientTarget = {
                          contactId: selectedContact.id,
                          name:
                            `${selectedContact.firstName || ""} ${selectedContact.lastName || ""}`.trim() ||
                            selectedContact.email ||
                            `Record #${selectedContact.id}`,
                          phone: selectedContact.phone || null,
                          email: selectedContact.email || null,
                        };
                        setSelectedContactId(null);
                        onRequestBlacklist(target);
                      }}
                      className={cn(DNS_THEME.goldPrimaryBtn, "h-10 px-5 text-sm")}
                    >
                      Blacklist client
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

