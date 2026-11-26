import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  UserCheck,
  UserPlus,
} from "lucide-react";
import {
  DONATION_FUND_OPTIONS,
  evaluateDonationCompliance,
  parseCurrencyInputToCents,
} from "@shared/paymentStation";

export interface RegisterDonationClientOption {
  id: number;
  name: string;
  email: string | null;
}

export interface RegisterDonationFormState {
  donorSource: "account" | "custom";
  donorClientId: number | null;
  donorName: string;
  donorEmail: string;
  donorAddress: string;
  fundId: string;
  fundName: string;
  noGoodsOrServicesProvided: boolean;
  goodsOrServicesDescription: string;
  goodsOrServicesFmvInput: string;
  note: string;
}

export interface RegisterDonationPanelProps {
  clients: RegisterDonationClientOption[];
  amountCents: number;
  donationForm: RegisterDonationFormState;
  onUpdateDonationForm: (patch: Partial<RegisterDonationFormState>) => void;
  onSelectDonorAccount: (clientId: number | null) => void;
  onSelectQuickAmount: (cents: number) => void;
  onContinueToPayment: () => void;
  compact?: boolean;
}

const QUICK_DONATION_CENTS = [2500, 5000, 10000, 25000];

export function RegisterDonationPanel({
  clients,
  amountCents,
  donationForm,
  onUpdateDonationForm,
  onSelectDonorAccount,
  onSelectQuickAmount,
  onContinueToPayment,
  compact = false,
}: RegisterDonationPanelProps) {
  const fmvCents = donationForm.noGoodsOrServicesProvided
    ? 0
    : parseCurrencyInputToCents(donationForm.goodsOrServicesFmvInput);

  const compliance = evaluateDonationCompliance({
    donorName: donationForm.donorName,
    donorEmail: donationForm.donorEmail,
    donorAddress: donationForm.donorAddress,
    amountCents,
    fundId: donationForm.fundId,
    noGoodsOrServicesProvided: donationForm.noGoodsOrServicesProvided,
    goodsOrServicesDescription: donationForm.goodsOrServicesDescription,
    goodsOrServicesFmvCents: fmvCents,
    is501c3Active: false,
  });

  const primaryStatusText =
    compliance.blockingIssues[0] ||
    compliance.warnings[0] ||
    "501(c)(3) record ready · Non-deductible until approved";

  const statusTone =
    compliance.blockingIssues.length > 0
      ? "fail"
      : compliance.warnings.length > 0
        ? "warn"
        : "pass";

  return (
    <div
      data-testid="pos-register-donation-panel"
      className={`flex flex-col justify-between ${compact ? "gap-1 min-h-[112px]" : "gap-1.5 min-h-[136px]"}`}
    >
      {/* Row 1: Attach Account OR Enter New Supporter Details */}
      <div className="flex items-center gap-1.5">
        <div
          role="group"
          aria-label="Donor source"
          className="inline-flex rounded-[7px] bg-[#040D22] border border-[#5B72A3]/45 p-[2px] shrink-0"
        >
          <button
            type="button"
            data-testid="pos-donor-source-account"
            onClick={() => onUpdateDonationForm({ donorSource: "account" })}
            className={`${compact ? "h-[21px]" : "h-[24px]"} px-2 rounded-[5px] text-[10.5px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
              donationForm.donorSource === "account"
                ? "bg-[#3C3B9E] text-white"
                : "text-[#A7B9DC] hover:text-white"
            }`}
          >
            <UserCheck className="h-3 w-3 shrink-0" />
            <span>Account</span>
          </button>
          <button
            type="button"
            data-testid="pos-donor-source-custom"
            onClick={() =>
              onUpdateDonationForm({
                donorSource: "custom",
                donorClientId: null,
              })
            }
            className={`${compact ? "h-[21px]" : "h-[24px]"} px-2 rounded-[5px] text-[10.5px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
              donationForm.donorSource === "custom"
                ? "bg-[#3C3B9E] text-white"
                : "text-[#A7B9DC] hover:text-white"
            }`}
          >
            <UserPlus className="h-3 w-3 shrink-0" />
            <span>New</span>
          </button>
        </div>

        {donationForm.donorSource === "account" ? (
          <div className={`pos-field-well rounded-[7px] ${compact ? "h-[25px]" : "h-[29px]"} px-2 flex items-center flex-1 min-w-0`}>
            <select
              aria-label="Attach donation to client account"
              data-testid="pos-donor-account-select"
              value={donationForm.donorClientId ?? ""}
              onChange={(e) => {
                const id = Number(e.target.value) || null;
                onSelectDonorAccount(id);
              }}
              className="w-full bg-transparent text-[12px] text-[#F4F7FF] focus:outline-none truncate cursor-pointer"
            >
              <option value="" className="bg-[#071530] text-white">
                Select account...
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#071530] text-white">
                  {c.name}
                  {c.email ? ` (${c.email})` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 flex-1 min-w-0">
            <div className={`pos-field-well rounded-[7px] ${compact ? "h-[25px]" : "h-[29px]"} px-2 flex items-center`}>
              <input
                type="text"
                data-testid="pos-donor-name-input"
                aria-label="Donor full legal name"
                value={donationForm.donorName}
                onChange={(e) => onUpdateDonationForm({ donorName: e.target.value })}
                placeholder="Donor legal name *"
                className="w-full bg-transparent text-[11.5px] text-[#F4F7FF] placeholder-[#6C7FA6] focus:outline-none"
              />
            </div>
            <div className={`pos-field-well rounded-[7px] ${compact ? "h-[25px]" : "h-[29px]"} px-2 flex items-center`}>
              <input
                type="email"
                data-testid="pos-donor-email-input"
                aria-label="Donor receipt email"
                value={donationForm.donorEmail}
                onChange={(e) => onUpdateDonationForm({ donorEmail: e.target.value })}
                placeholder="Receipt email"
                className="w-full bg-transparent text-[11.5px] text-[#F4F7FF] placeholder-[#6C7FA6] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Row 2: 501(c)(3) Mailing Address + Restricted/Unrestricted Fund Designation */}
      <div className="grid grid-cols-[1.28fr_1fr] gap-1.5">
        <div className={`pos-field-well rounded-[7px] ${compact ? "h-[25px]" : "h-[28px]"} px-2 flex items-center`}>
          <input
            type="text"
            data-testid="pos-donor-address-input"
            aria-label="Donor mailing address for IRS receipt"
            value={donationForm.donorAddress}
            onChange={(e) => onUpdateDonationForm({ donorAddress: e.target.value })}
            placeholder="Mailing address (IRS ≥$250 / Sch. B)"
            className="w-full bg-transparent text-[11px] text-[#F4F7FF] placeholder-[#6C7FA6] focus:outline-none"
          />
        </div>
        <div className={`pos-field-well rounded-[7px] ${compact ? "h-[25px]" : "h-[28px]"} px-2 flex items-center`}>
          <select
            aria-label="Donation fund designation"
            data-testid="pos-donor-fund-select"
            value={donationForm.fundId}
            onChange={(e) => {
              const found =
                DONATION_FUND_OPTIONS.find((f) => f.id === e.target.value) ||
                DONATION_FUND_OPTIONS[0];
              onUpdateDonationForm({ fundId: found.id, fundName: found.name });
            }}
            className="w-full bg-transparent text-[11px] text-[#F4F7FF] focus:outline-none truncate cursor-pointer"
          >
            {DONATION_FUND_OPTIONS.map((f) => (
              <option key={f.id} value={f.id} className="bg-[#071530] text-white">
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: IRC §170/§6115 Quid Pro Quo Disclosure + Quick Presets (or FMV inputs if benefits provided) */}
      <div className="flex items-center justify-between gap-1.5 min-h-[26px]">
        <label className="inline-flex items-center gap-1.5 text-[10.5px] text-[#D7E1F5] cursor-pointer shrink-0">
          <input
            type="checkbox"
            data-testid="pos-donor-no-goods-checkbox"
            checked={donationForm.noGoodsOrServicesProvided}
            onChange={(e) =>
              onUpdateDonationForm({
                noGoodsOrServicesProvided: e.target.checked,
                ...(e.target.checked
                  ? { goodsOrServicesFmvInput: "", goodsOrServicesDescription: "" }
                  : {}),
              })
            }
            className="rounded border-[#6D85B8] bg-[#040D21] accent-[#D4A64A]"
          />
          <span className="whitespace-nowrap">No goods/services</span>
        </label>

        {donationForm.noGoodsOrServicesProvided ? (
          <div className="flex items-center gap-1 shrink-0">
            {QUICK_DONATION_CENTS.map((cents) => {
              const active = amountCents === cents;
              return (
                <button
                  key={cents}
                  type="button"
                  onClick={() => onSelectQuickAmount(cents)}
                  className={`h-[23px] px-1.5 rounded-[5px] border text-[10.5px] font-semibold transition-colors cursor-pointer ${
                    active
                      ? "bg-[#DFBE77]/22 border-[#DFBE77] text-[#FFF1C4]"
                      : "bg-[#081631]/90 border-[#5B72A3]/40 text-[#C6D5F0] hover:border-[#CFA657]/75"
                  }`}
                >
                  ${cents / 100}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <div className="pos-field-well rounded-[6px] h-[25px] px-1.5 flex items-center w-[76px] shrink-0">
              <span className="text-[10px] text-[#CFA657] mr-0.5">$</span>
              <input
                type="text"
                inputMode="decimal"
                data-testid="pos-donor-fmv-input"
                aria-label="Fair market value of goods or services"
                value={donationForm.goodsOrServicesFmvInput}
                onChange={(e) =>
                  onUpdateDonationForm({ goodsOrServicesFmvInput: e.target.value })
                }
                placeholder="FMV"
                className="w-full bg-transparent text-[10.5px] text-[#F4F7FF] placeholder-[#6C7FA6] focus:outline-none"
              />
            </div>
            <div className="pos-field-well rounded-[6px] h-[25px] px-1.5 flex items-center flex-1 min-w-0">
              <input
                type="text"
                aria-label="Description of goods or services provided"
                value={donationForm.goodsOrServicesDescription}
                onChange={(e) =>
                  onUpdateDonationForm({ goodsOrServicesDescription: e.target.value })
                }
                placeholder="Benefit desc."
                className="w-full bg-transparent text-[10.5px] text-[#F4F7FF] placeholder-[#6C7FA6] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Row 4: Live 501(c)(3) Compliance Status Strip + Continue to Card/Payment Button */}
      <div
        data-testid="pos-donation-compliance-strip"
        data-compliance-status={statusTone}
        className={`rounded-[7px] border px-2 py-1 flex items-center justify-between gap-2 ${
          statusTone === "fail"
            ? "bg-[#43111A]/85 border-rose-400/60 text-rose-100"
            : statusTone === "warn"
              ? "bg-[#2C210B]/85 border-amber-400/55 text-amber-100"
              : "bg-[#0B2922]/85 border-emerald-400/45 text-emerald-100"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 text-[10px] leading-tight">
          {statusTone === "fail" ? (
            <AlertCircle className="h-3.5 w-3.5 text-rose-300 shrink-0" />
          ) : statusTone === "warn" ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-300 shrink-0" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
          )}
          <span className="truncate">{primaryStatusText}</span>
        </div>

        <button
          type="button"
          data-testid="pos-donation-next-payment-btn"
          onClick={onContinueToPayment}
          className="h-[21px] px-2 rounded-[5px] bg-[#142952] hover:bg-[#1E3B72] border border-[#CFA657]/65 text-[10px] font-semibold text-[#FFF0C2] inline-flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <span>Payment</span>
          <ArrowRight className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}
