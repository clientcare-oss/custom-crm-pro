import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, User, FileText, Briefcase, Check } from "lucide-react";
import { formatCents } from "@shared/paymentStation";

export interface PickerClientItem {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  planTier: string | null;
  openInvoiceCount: number;
  openBalanceCents: number;
}

export interface PickerInvoiceItem {
  id: number;
  invoiceNumber: string;
  title: string;
  status: string;
  totalCents: number;
  amountPaidCents: number;
  remainingCents: number;
  dueDate: string | null;
}

export interface PickerServiceItem {
  id: number;
  title: string;
  serviceCode: string;
  standardPriceCents: number;
  billingType: string;
}

interface ClientInvoiceModalProps {
  open: boolean;
  initialView: "client" | "purpose";
  onOpenChange: (open: boolean) => void;
  clients: PickerClientItem[];
  selectedClientId: number | null;
  onSelectClient: (clientId: number) => void;
  invoices: PickerInvoiceItem[];
  services: PickerServiceItem[];
  selectedInvoiceId: number | null;
  selectedServiceId: number | null;
  onSelectInvoice: (invoice: PickerInvoiceItem) => void;
  onSelectService: (service: PickerServiceItem) => void;
}

export function ClientInvoiceModal({
  open,
  initialView,
  onOpenChange,
  clients,
  selectedClientId,
  onSelectClient,
  invoices,
  services,
  selectedInvoiceId,
  selectedServiceId,
  onSelectInvoice,
  onSelectService,
}: ClientInvoiceModalProps) {
  const [view, setView] = useState<"client" | "purpose">(initialView);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setView(initialView);
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, initialView]);

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.email, c.phone, c.planTier]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [clients, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#06132C] border border-[#C8A157]/55 text-[#EFF4FF] max-w-[540px] rounded-2xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)]">
        <DialogHeader>
          <DialogTitle
            className="text-[21px] text-[#FFF4D6]"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            {view === "client" ? "Select Client Account" : "Select Invoice or Payment Purpose"}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#9BB0D4]">
            Choose a client and pick an outstanding invoice or authorized Waypoint service.
          </DialogDescription>
        </DialogHeader>

        {/* Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#030B1D] border border-[#5D75A8]/35 mt-1">
          <button
            type="button"
            onClick={() => setView("client")}
            className={`h-8 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer ${
              view === "client" ? "bg-[#4A45C6] text-white" : "text-[#A7B9DC] hover:text-white"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Clients ({clients.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setView("purpose")}
            className={`h-8 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer ${
              view === "purpose" ? "bg-[#4A45C6] text-white" : "text-[#A7B9DC] hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Invoices &amp; Services</span>
          </button>
        </div>

        {view === "client" ? (
          <div className="space-y-3 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8DA2CB]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients by name, email, or phone..."
                className="w-full h-10 rounded-lg bg-[#040D22] border border-[#748DC0]/45 pl-9 pr-3 text-sm text-white placeholder-[#6D81A8] focus:outline-none focus:border-cyan-300"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
              {filteredClients.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#8CA0C7]">
                  No matching clients found.
                </div>
              ) : (
                filteredClients.map((client) => {
                  const selected = client.id === selectedClientId;
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        onSelectClient(client.id);
                        setView("purpose");
                      }}
                      className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selected
                          ? "bg-[#152A56] border-[#DFBE77]"
                          : "bg-[#040D22]/85 border-[#4D6495]/30 hover:border-[#9EB2DC]/55 hover:bg-[#0B1C3E]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate flex items-center gap-2">
                          <span>{client.name}</span>
                          {selected && <Check className="h-3.5 w-3.5 text-[#DFBE77]" />}
                        </div>
                        <div className="text-xs text-[#90A5CE] truncate">
                          {client.email || client.phone || "No email on file"}
                          {client.planTier ? ` · ${client.planTier}` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {client.openInvoiceCount > 0 ? (
                          <>
                            <div className="text-xs font-semibold text-cyan-200 tabular-nums">
                              {formatCents(client.openBalanceCents)}
                            </div>
                            <div className="text-[10.5px] text-[#8DA2CB]">
                              {client.openInvoiceCount} open
                            </div>
                          </>
                        ) : (
                          <span className="text-[11px] text-[#7D92BA]">No open balance</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2 max-h-[340px] overflow-y-auto pr-1">
            {/* Outstanding Invoices */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C6B697] flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>Outstanding Invoices ({invoices.length})</span>
              </div>
              {invoices.length === 0 ? (
                <div className="rounded-lg bg-[#040D22] border border-[#4D6495]/30 p-3 text-xs text-[#8FA4CD]">
                  No open invoices for this client. Choose an authorized service below.
                </div>
              ) : (
                invoices.map((inv) => {
                  const selected = selectedInvoiceId === inv.id;
                  return (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => {
                        onSelectInvoice(inv);
                        onOpenChange(false);
                      }}
                      className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selected
                          ? "bg-[#152A56] border-[#DFBE77]"
                          : "bg-[#040D22]/85 border-[#4D6495]/30 hover:border-[#9EB2DC]/55"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {inv.title}
                        </div>
                        <div className="text-xs text-[#90A5CE]">
                          Invoice {inv.invoiceNumber} · {inv.status}
                          {inv.amountPaidCents > 0
                            ? ` · Paid ${formatCents(inv.amountPaidCents)} of ${formatCents(inv.totalCents)}`
                            : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-cyan-200 tabular-nums">
                          {formatCents(inv.remainingCents)}
                        </div>
                        <div className="text-[10px] text-[#8DA2CB]">Remaining</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Authorized Services & Plans */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C6B697] flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                <span>Authorized Services &amp; Plans ({services.length})</span>
              </div>
              {services.map((svc) => {
                const selected = !selectedInvoiceId && selectedServiceId === svc.id;
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => {
                      onSelectService(svc);
                      onOpenChange(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selected
                        ? "bg-[#152A56] border-[#DFBE77]"
                        : "bg-[#040D22]/85 border-[#4D6495]/30 hover:border-[#9EB2DC]/55"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{svc.title}</div>
                      <div className="text-[11px] text-[#90A5CE]">{svc.serviceCode}</div>
                    </div>
                    <div className="text-sm font-semibold text-[#EAD08B] tabular-nums shrink-0">
                      {svc.standardPriceCents > 0 ? formatCents(svc.standardPriceCents) : "Custom"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
