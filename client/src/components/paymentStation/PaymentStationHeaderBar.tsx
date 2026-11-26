import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, Heart, User, ChevronDown, X, Check, FileText, Layers } from "lucide-react";
import { formatCents, type PaymentStationMode } from "@shared/paymentStation";
import type { PickerInvoiceItem, PickerServiceItem } from "./ClientInvoiceModal";

export interface HeaderClientOption {
  id: number;
  name: string;
  email: string | null;
  planTier?: string | null;
  openInvoiceCount?: number;
  openBalanceCents?: number;
}

export interface PaymentStationHeaderBarProps {
  clientName: string;
  selectedClientId: number | null;
  clients: HeaderClientOption[];
  invoices?: PickerInvoiceItem[];
  services?: PickerServiceItem[];
  selectedInvoiceId?: number | null;
  selectedServiceId?: number | null;
  isLoadingClients: boolean;
  mode: PaymentStationMode;
  openClientDropdownTrigger?: number;
  onSelectClient: (clientId: number) => void;
  onClearClient?: () => void;
  onSelectInvoice?: (inv: PickerInvoiceItem) => void;
  onSelectService?: (svc: PickerServiceItem) => void;
  onOpenClientPicker: () => void;
  onOpenDonationModal: () => void;
}

const HEADING_SERIF_FONT =
  '"Playfair Display", "Libre Baskerville", Georgia, "Times New Roman", serif';

export function PaymentStationHeaderBar({
  clientName,
  selectedClientId,
  clients,
  invoices = [],
  services = [],
  selectedInvoiceId = null,
  selectedServiceId = null,
  isLoadingClients,
  mode,
  openClientDropdownTrigger = 0,
  onSelectClient,
  onClearClient,
  onSelectInvoice,
  onSelectService,
  onOpenDonationModal,
}: PaymentStationHeaderBarProps) {
  // "closed" | "client" (Client button fills entire bubble to right & drops matching bar-width window)
  // | "search" (compact type-ahead suggestions ONLY while user is actively typing text)
  const [dropdownMode, setDropdownMode] = useState<"closed" | "client" | "search">("closed");
  const [dropdownTab, setDropdownTab] = useState<"clients" | "invoices">("clients");
  const [searchQuery, setSearchQuery] = useState("");
  const comboRef = useRef<HTMLDivElement>(null);
  const topSearchInputRef = useRef<HTMLInputElement>(null);
  const innerFilterInputRef = useRef<HTMLInputElement>(null);

  const displayClient = clientName || (isLoadingClients ? "Loading..." : "Select client");
  const isClientExpanded = dropdownMode === "client";
  const isCompactSearchOpen = dropdownMode === "search" && searchQuery.trim().length > 0;
  const isDropdownOpen = isClientExpanded || isCompactSearchOpen;

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setDropdownMode("closed");
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownMode("closed");
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Allow register buttons ("Select Client") to open this exact matching top-bar dropdown
  useEffect(() => {
    if (openClientDropdownTrigger > 0) {
      setDropdownTab("clients");
      setDropdownMode("client");
      setTimeout(() => innerFilterInputRef.current?.focus(), 50);
    }
  }, [openClientDropdownTrigger]);

  // Cmd/Ctrl+K opens the matching client dropdown directly on the bar
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setDropdownTab("clients");
        setDropdownMode("client");
        setTimeout(() => innerFilterInputRef.current?.focus(), 40);
      }
    };
    window.addEventListener("keydown", onGlobalKey, true);
    return () => window.removeEventListener("keydown", onGlobalKey, true);
  }, []);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? clients.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q) ||
            (c.planTier || "").toLowerCase().includes(q)
        )
      : clients;
    return list;
  }, [clients, searchQuery]);

  const handleToggleClientButton = () => {
    if (dropdownMode === "client") {
      setDropdownMode("closed");
    } else {
      setDropdownTab("clients");
      setDropdownMode("client");
      setTimeout(() => innerFilterInputRef.current?.focus(), 60);
    }
  };

  const handlePickClient = (id: number) => {
    onSelectClient(id);
    setSearchQuery("");
    setDropdownMode("closed");
    topSearchInputRef.current?.blur();
  };

  return (
    <header
      aria-label="Payment Station navigation and controls"
      className="pos-topbar-pill-frame relative z-30 w-full rounded-[24px] lg:rounded-full"
    >
      <div className="pos-topbar-pill-inner rounded-[21.5px] lg:rounded-full px-3 sm:px-4 lg:px-3.5 xl:px-4 py-2 lg:py-1.5">
        {/* Three-zone center-anchored bar:
            - Left & right wings share equal flex-1 basis-0 space so the Center Cash Register + Payment Station stays DEAD CENTER.
            - Because Left Wing uses min-w-fit, when the Search input expands on typing,
              it smoothly pushes the Center Cash Register + Payment Station to the right with zero overlap. */}
        <div className="flex flex-col lg:flex-row items-center gap-2.5 lg:gap-2">
          {/* ── LEFT WING: NESTED [ 🔍 👤 Client ▾ | Search or select client... ] CAPSULE ── */}
          <div className="w-full lg:w-auto lg:flex-1 lg:basis-0 lg:min-w-fit flex items-center justify-center lg:justify-start">
            <div
              ref={comboRef}
              data-testid="pos-client-bubble-anchor"
              className="relative w-full lg:w-[308px] xl:w-[356px]"
            >
              <div className="pos-topbar-combo-outer rounded-full w-full">
                <div className="pos-topbar-combo-well rounded-full h-[42px] xl:h-[44px] flex items-center p-[2.5px] overflow-hidden">
                  {/* Raised Inner Pill Cap:
                      - Resting: sits on the left [ 🔍 👤 Client ▾ ]
                      - Clicked: smoothly expands to fill 100% of the entire bubble all the way to the right! */}
                  <div
                    className={`pos-topbar-client-cap-rim rounded-full h-full transition-all duration-300 ease-out ${
                      isClientExpanded ? "w-full flex-1" : "shrink-0"
                    }`}
                  >
                    <button
                      type="button"
                      data-testid="pos-change-client-btn"
                      data-expanded={isClientExpanded ? "true" : "false"}
                      aria-expanded={isClientExpanded}
                      aria-haspopup="listbox"
                      onClick={handleToggleClientButton}
                      title={
                        isClientExpanded
                          ? "Close client selector"
                          : `Active client: ${displayClient} — click to open client list`
                      }
                      className={`pos-topbar-client-cap h-full rounded-full px-3 xl:px-3.5 inline-flex items-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 ${
                        isClientExpanded
                          ? "pos-topbar-client-cap-expanded w-full justify-between gap-2"
                          : "gap-1.5"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <Search
                          className="h-[15px] w-[15px] text-[#E6C06A] shrink-0"
                          strokeWidth={2}
                        />
                        <User
                          className="h-[15.5px] w-[15.5px] text-[#E6C06A] shrink-0"
                          strokeWidth={1.85}
                        />
                        <span className="text-[13px] xl:text-[14px] font-medium text-[#F5F7FC] whitespace-nowrap">
                          Client
                        </span>
                        {isClientExpanded && (
                          <>
                            <span
                              aria-hidden="true"
                              className="h-3.5 w-[1px] bg-[#D2A958]/45 mx-1 shrink-0"
                            />
                            <span className="text-[12.5px] xl:text-[13px] text-[#FCE6A6] font-medium truncate">
                              {displayClient}
                            </span>
                          </>
                        )}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-[#E6C06A] shrink-0 transition-transform duration-200 ${
                          isClientExpanded ? "rotate-180" : "rotate-0"
                        }`}
                        strokeWidth={2.4}
                      />
                    </button>
                  </div>

                  {/* Hidden accessible selected client label for screen readers & automated verification */}
                  <span data-testid="pos-selected-client-name" className="sr-only">
                    {displayClient}
                  </span>

                  {/* Live Search Input Well (stays small; does NOT immediately open a dropdown on click/focus — searches as you type) */}
                  {!isClientExpanded && (
                    <div className="flex items-center flex-1 pl-3 pr-3 min-w-0">
                      <input
                        ref={topSearchInputRef}
                        type="text"
                        data-testid="pos-search-clients-btn"
                        aria-label="Search or select client"
                        value={searchQuery}
                        onFocus={() => {
                          if (searchQuery.trim().length > 0) {
                            setDropdownTab("clients");
                            setDropdownMode("search");
                          }
                        }}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          setSearchQuery(nextVal);
                          if (nextVal.trim().length > 0) {
                            setDropdownTab("clients");
                            setDropdownMode("search");
                          } else {
                            setDropdownMode("closed");
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setSearchQuery("");
                            setDropdownMode("closed");
                            topSearchInputRef.current?.blur();
                          } else if (
                            e.key === "Enter" &&
                            searchQuery.trim().length > 0 &&
                            filteredClients.length >= 1
                          ) {
                            handlePickClient(filteredClients[0].id);
                          }
                        }}
                        placeholder="Search or select client..."
                        className="w-full bg-transparent text-[13px] xl:text-[13.5px] text-[#F2F6FF] placeholder-[#CBD6EB]/90 focus:outline-none truncate"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          aria-label="Clear client search"
                          onClick={() => {
                            setSearchQuery("");
                            setDropdownMode("closed");
                            topSearchInputRef.current?.focus();
                          }}
                          className="ml-1 text-[#9DB0D4] hover:text-white cursor-pointer shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── COMPACT TYPE-AHEAD LIVE SEARCH RESULTS (only appears while typing; stays small & sleek) ── */}
              {isCompactSearchOpen && (
                <div
                  role="listbox"
                  data-testid="pos-search-results-popover"
                  aria-label="Matching clients"
                  className="pos-topbar-search-popover-frame absolute left-0 right-0 top-[calc(100%+6px)] w-full z-50"
                >
                  <div className="pos-topbar-search-popover-inner overflow-hidden">
                    <div className="max-h-[164px] overflow-y-auto px-1.5 py-1.5 space-y-0.5">
                      {filteredClients.length === 0 ? (
                        <div className="px-2.5 py-2 text-center text-[11.5px] text-[#9EB0D2]">
                          No matches for &ldquo;{searchQuery.trim()}&rdquo;
                        </div>
                      ) : (
                        filteredClients.map((c) => {
                          const isSelected = c.id === selectedClientId;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handlePickClient(c.id);
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-[10px] border flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-[#152B56]/95 border-[#DFBE77]/70 text-[#FFF4D6]"
                                  : "bg-transparent border-transparent hover:bg-[#0E2044]/90 hover:border-[#CFA657]/35 text-[#EDF2FC]"
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-[12.5px] font-semibold leading-tight truncate">
                                  {c.name}
                                </div>
                                {c.email && (
                                  <div className="text-[10.5px] text-[#8FA4CB] leading-tight truncate">
                                    {c.email}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {typeof c.openBalanceCents === "number" &&
                                  c.openBalanceCents > 0 && (
                                    <span className="px-1.5 py-[1px] rounded bg-amber-400/12 border border-amber-300/30 text-[9.5px] font-semibold text-[#FCE39C] tabular-nums">
                                      {formatCents(c.openBalanceCents)}
                                    </span>
                                  )}
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5 text-[#E6C06A] shrink-0" />
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── MATCHING PHOTOREALISTIC TUBULAR-BRASS & NAVY CLIENT DROPDOWN WINDOW ──
                  Opens when clicking the Client ▾ pill; exact left-to-right width of the bubble bar. */}
              {isClientExpanded && (
                <div
                  role="listbox"
                  data-testid="pos-client-dropdown-panel"
                  aria-label="Client and billing selector"
                  className="pos-topbar-dropdown-frame absolute left-0 right-0 top-[calc(100%+8px)] w-full z-50"
                >
                  <div className="pos-topbar-dropdown-inner overflow-hidden">
                    {/* Header Row: Title + Clients / Invoices toggle */}
                    <div className="px-3.5 pt-3 pb-2 border-b border-[#D2A958]/30 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="text-[14.5px] font-bold text-[#FFF4D6] tracking-wide truncate"
                          style={{ fontFamily: HEADING_SERIF_FONT }}
                        >
                          {dropdownTab === "clients" ? "Select Client" : "Invoices & Services"}
                        </span>
                        <span className="px-1.5 py-[1px] rounded-full bg-[#13264D] border border-[#CFA657]/45 text-[10px] font-semibold text-[#FCE6A6] shrink-0">
                          {dropdownTab === "clients"
                            ? filteredClients.length
                            : invoices.length + services.length}
                        </span>
                      </div>

                      {(invoices.length > 0 || services.length > 0) &&
                        (onSelectInvoice || onSelectService) && (
                          <div className="inline-flex rounded-full bg-[#040D22] border border-[#CFA657]/45 p-[2px] shrink-0">
                            <button
                              type="button"
                              onClick={() => setDropdownTab("clients")}
                              className={`h-[21px] px-2.5 rounded-full text-[10.5px] font-semibold transition-colors cursor-pointer ${
                                dropdownTab === "clients"
                                  ? "bg-gradient-to-b from-[#DFBE77] to-[#A67C32] text-[#081224]"
                                  : "text-[#C9D6EE] hover:text-white"
                              }`}
                            >
                              Clients
                            </button>
                            <button
                              type="button"
                              onClick={() => setDropdownTab("invoices")}
                              className={`h-[21px] px-2.5 rounded-full text-[10.5px] font-semibold transition-colors cursor-pointer ${
                                dropdownTab === "invoices"
                                  ? "bg-gradient-to-b from-[#DFBE77] to-[#A67C32] text-[#081224]"
                                  : "text-[#C9D6EE] hover:text-white"
                              }`}
                            >
                              Invoices
                            </button>
                          </div>
                        )}
                    </div>

                    {dropdownTab === "clients" ? (
                      <>
                        {/* Integrated Brass-Rimmed Filter Input when opened from Client button */}
                        {isClientExpanded && (
                          <div className="px-3 pt-2.5 pb-1.5">
                            <div className="pos-topbar-combo-outer rounded-full">
                              <div className="pos-topbar-combo-well rounded-full h-[33px] px-3 flex items-center gap-2">
                                <Search className="h-3.5 w-3.5 text-[#E6C06A] shrink-0" />
                                <input
                                  ref={innerFilterInputRef}
                                  type="text"
                                  data-testid="pos-client-dropdown-filter"
                                  aria-label="Filter clients"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && filteredClients.length >= 1) {
                                      handlePickClient(filteredClients[0].id);
                                    }
                                  }}
                                  placeholder="Filter by name, email, or plan..."
                                  className="w-full bg-transparent text-[12.5px] text-[#F4F7FF] placeholder-[#8CA1C8] focus:outline-none"
                                />
                                {searchQuery && (
                                  <button
                                    type="button"
                                    aria-label="Clear filter"
                                    onClick={() => {
                                      setSearchQuery("");
                                      innerFilterInputRef.current?.focus();
                                    }}
                                    className="text-[#9DB0D4] hover:text-white cursor-pointer shrink-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Scrollable Client List */}
                        <div className="max-h-[268px] overflow-y-auto px-2.5 py-2 space-y-1">
                          {filteredClients.length === 0 ? (
                            <div className="px-3 py-5 text-center text-[12.5px] text-[#9EB0D2]">
                              No clients match &ldquo;{searchQuery}&rdquo;
                            </div>
                          ) : (
                            filteredClients.map((c) => {
                              const isSelected = c.id === selectedClientId;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handlePickClient(c.id);
                                  }}
                                  className={`w-full px-3 py-2 rounded-[12px] border flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-[#152B56]/95 border-[#DFBE77]/75 text-[#FFF4D6] shadow-[inset_0_1px_1px_rgba(255,244,206,0.18)]"
                                      : "bg-[#071530]/60 border-transparent hover:bg-[#0E2044]/90 hover:border-[#CFA657]/40 text-[#EDF2FC]"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="text-[13px] font-semibold truncate">
                                      {c.name}
                                    </div>
                                    <div className="text-[11px] text-[#8FA4CB] truncate">
                                      {c.email || c.planTier || "Client account"}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {typeof c.openBalanceCents === "number" &&
                                      c.openBalanceCents > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-amber-400/12 border border-amber-300/35 text-[10px] font-semibold text-[#FCE39C] tabular-nums">
                                          {formatCents(c.openBalanceCents)}
                                        </span>
                                      )}
                                    {isSelected && (
                                      <Check className="h-4 w-4 text-[#E6C06A] shrink-0" />
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </>
                    ) : (
                      /* Invoices & Authorized Services View inside exact same bar-sized dropdown */
                      <div className="max-h-[296px] overflow-y-auto px-2.5 py-2 space-y-2.5">
                        {invoices.length > 0 && onSelectInvoice && (
                          <div className="space-y-1">
                            <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C6B697] flex items-center gap-1">
                              <FileText className="h-3 w-3 text-[#DFBE77]" />
                              <span>Open Invoices ({displayClient})</span>
                            </div>
                            {invoices.map((inv) => {
                              const active = selectedInvoiceId === inv.id && mode === "invoice";
                              return (
                                <button
                                  key={inv.id}
                                  type="button"
                                  onClick={() => {
                                    onSelectInvoice(inv);
                                    setDropdownMode("closed");
                                  }}
                                  className={`w-full px-3 py-2 rounded-[12px] border flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                                    active
                                      ? "bg-[#152B56]/95 border-[#DFBE77]/75 text-[#FFF4D6]"
                                      : "bg-[#071530]/60 border-transparent hover:bg-[#0E2044]/90 hover:border-[#CFA657]/40 text-[#EDF2FC]"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="text-[12.5px] font-semibold truncate">
                                      {inv.title}
                                    </div>
                                    <div className="text-[10.5px] text-[#8FA4CB] truncate">
                                      Invoice {inv.invoiceNumber}
                                    </div>
                                  </div>
                                  <span className="text-[12px] font-bold text-[#FCE39C] tabular-nums shrink-0">
                                    {formatCents(inv.remainingCents)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {services.length > 0 && onSelectService && (
                          <div className="space-y-1">
                            <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C6B697] flex items-center gap-1">
                              <Layers className="h-3 w-3 text-[#DFBE77]" />
                              <span>Authorized Services</span>
                            </div>
                            {services.map((svc) => {
                              const active = selectedServiceId === svc.id && mode === "service";
                              return (
                                <button
                                  key={svc.id}
                                  type="button"
                                  onClick={() => {
                                    onSelectService(svc);
                                    setDropdownMode("closed");
                                  }}
                                  className={`w-full px-3 py-2 rounded-[12px] border flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                                    active
                                      ? "bg-[#152B56]/95 border-[#DFBE77]/75 text-[#FFF4D6]"
                                      : "bg-[#071530]/60 border-transparent hover:bg-[#0E2044]/90 hover:border-[#CFA657]/40 text-[#EDF2FC]"
                                  }`}
                                >
                                  <span className="text-[12.5px] font-medium truncate">
                                    {svc.title}
                                  </span>
                                  {svc.standardPriceCents > 0 && (
                                    <span className="text-[11.5px] font-semibold text-[#C6D5F0] tabular-nums shrink-0">
                                      {formatCents(svc.standardPriceCents)}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Subtle Matching Brass Footer */}
                    <div className="px-3.5 py-2 border-t border-[#D2A958]/25 bg-[#040C1E]/85 flex items-center justify-between gap-2 text-[10.5px] text-[#93A8CE]">
                      <span className="truncate">
                        {selectedClientId ? (
                          <>
                            Active: <strong className="text-[#FCE6A6]">{displayClient}</strong>
                          </>
                        ) : (
                          <span>No client active</span>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-2.5 shrink-0">
                        {selectedClientId && onClearClient && (
                          <button
                            type="button"
                            data-testid="pos-dropdown-clear-client-btn"
                            onClick={() => {
                              onClearClient();
                              setDropdownMode("closed");
                            }}
                            className="text-rose-200 hover:text-white font-medium cursor-pointer"
                          >
                            Clear client
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDropdownMode("closed")}
                          className="text-[#DFBE77] hover:text-[#FFF4D6] font-medium cursor-pointer"
                        >
                          Close
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── CENTER ANCHORED CLUSTER: [ |  [3D Brass Cash Register]  Payment Station + Starburst  | ] ── */}
          <div className="flex items-center justify-center gap-3 xl:gap-4 shrink-0">
            <span
              aria-hidden="true"
              className="hidden lg:block h-8 w-[1.5px] bg-gradient-to-b from-transparent via-[#D2A958]/80 to-transparent shrink-0"
            />

            <div className="flex items-center gap-2.5 xl:gap-3">
              <img
                src="/assets/pos/brass-register-emblem.png"
                alt=""
                aria-hidden="true"
                draggable={false}
                className="h-[42px] lg:h-[44px] xl:h-[52px] w-auto shrink-0 object-contain drop-shadow-[0_3px_8px_rgba(0,0,0,0.92)] select-none"
              />

              <div className="flex flex-col items-center">
                <h1
                  className="text-[23px] sm:text-[26px] lg:text-[24px] xl:text-[29px] leading-none tracking-[-0.012em] text-[#FCF9F1] font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.88)]"
                  style={{ fontFamily: HEADING_SERIF_FONT }}
                >
                  Payment Station
                </h1>
                {/* Sculptural 3D Golden 4-Point Nautical Star & Tapered Brass Flourish */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 210 16"
                  className="w-full h-[13px] mt-[1px] overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="posCenterRuleLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#B88632" stopOpacity="0" />
                      <stop offset="55%" stopColor="#E4BA64" stopOpacity="0.92" />
                      <stop offset="100%" stopColor="#FFF2BF" stopOpacity="1" />
                    </linearGradient>
                    <linearGradient id="posCenterRuleRight" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#FFF2BF" stopOpacity="1" />
                      <stop offset="45%" stopColor="#E4BA64" stopOpacity="0.92" />
                      <stop offset="100%" stopColor="#B88632" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Tapered golden lines left & right of star */}
                  <polygon points="10,8 95,7 95,9" fill="url(#posCenterRuleLeft)" />
                  <polygon points="200,8 115,7 115,9" fill="url(#posCenterRuleRight)" />
                  {/* Faceted 3D metallic 4-point brass star */}
                  <path
                    d="M105 0.5 L107.6 5.8 L113.5 8 L107.6 10.2 L105 15.5 L102.4 10.2 L96.5 8 L102.4 5.8 Z"
                    fill="#D8A74C"
                  />
                  <path
                    d="M105 0.5 L105 8 L96.5 8 L102.4 5.8 Z"
                    fill="#FFF2BE"
                  />
                  <path
                    d="M105 8 L113.5 8 L107.6 10.2 L105 15.5 Z"
                    fill="#8C5D18"
                  />
                  <circle cx="105" cy="8" r="1.4" fill="#FFFDF4" />
                </svg>
              </div>
            </div>

            <span
              aria-hidden="true"
              className="hidden lg:block h-8 w-[1.5px] bg-gradient-to-b from-transparent via-[#D2A958]/80 to-transparent shrink-0"
            />
          </div>

          {/* ── RIGHT WING: SYMMETRICAL FULL-PILL DARK NAVY & BRUSHED-BRASS [ ♡ Donation ] BUTTON ── */}
          <div className="w-full lg:w-auto lg:flex-1 lg:basis-0 lg:min-w-fit flex items-center justify-center lg:justify-end">
            <div
              className={`pos-topbar-donation-rim rounded-full w-full sm:w-auto ${
                mode === "donation"
                  ? "shadow-[0_0_20px_rgba(244,210,122,0.5)]"
                  : ""
              }`}
            >
              <button
                type="button"
                data-testid="pos-donation-btn"
                onClick={onOpenDonationModal}
                className="pos-topbar-donation-face w-full sm:w-auto h-[38px] xl:h-[40px] px-6 xl:px-7 rounded-full inline-flex items-center justify-center gap-2.5 text-[15px] xl:text-[16.5px] font-semibold text-[#F8F5EC] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                style={{ fontFamily: HEADING_SERIF_FONT }}
              >
                <Heart
                  className={`h-[17px] w-[17px] xl:h-[18.5px] xl:w-[18.5px] shrink-0 ${
                    mode === "donation"
                      ? "text-[#F8DC94] fill-[#F8DC94]/80"
                      : "text-[#E6C170]"
                  }`}
                  strokeWidth={1.85}
                />
                <span>Donation</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
