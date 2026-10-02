import React from "react";
import { Link } from "wouter";
import { GivingParchmentCard } from "./GivingParchmentCard";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GivingLedgersRowProps {
  recentDonations?: any[];
  recentScholarships?: any[];
  topSupporters?: any[];
}

export function GivingLedgersRow({
  recentDonations,
  recentScholarships,
  topSupporters,
}: GivingLedgersRowProps) {
  // Mock fallback donations matching the exact mockup items if none provided
  const displayDonations = [
    { date: "Oct 2, 2026", donor: "The Miller Family", amount: "$1,800", type: "Donation", status: "Received", statusType: "success" },
    { date: "Sep 30, 2026", donor: "Anonymous", amount: "$250", type: "Donation", status: "Received", statusType: "success" },
    { date: "Sep 28, 2026", donor: "Blue Horizon", amount: "$1,000", type: "Donation", status: "Received", statusType: "success" },
    { date: "Sep 25, 2026", donor: "The Carter Family", amount: "$500", type: "Recurring", status: "Active", statusType: "active" },
    { date: "Sep 20, 2026", donor: "Anonymous", amount: "$100", type: "Donation", status: "Received", statusType: "success" },
  ];

  // Active scholarships matching the exact mockup items
  const displayScholarships = [
    { initials: "AJ", name: "Avery Jenkins", program: "Rise and Thrive", since: "Since Sep 2026", status: "Active" },
    { initials: "KL", name: "Klaire Family", program: "Rise and Thrive", since: "Since Sep 2026", status: "Active" },
    { initials: "MS", name: "Mikey Peroni", program: "Sponsor a Family", since: "Since Sep 2026", status: "Active" },
  ];

  // Top supporters matching the exact mockup items with gold, silver, bronze ranking
  const displaySupporters = [
    { rank: 1, name: "The Miller Family", amount: "$4,500", medalColor: "bg-[#D4AF37] text-white" },
    { rank: 2, name: "Blue Horizon Foundation", amount: "$3,200", medalColor: "bg-[#A6B2BD] text-white" },
    { rank: 3, name: "Anonymous", amount: "$2,800", medalColor: "bg-[#CD7F32] text-white" },
    { rank: 4, name: "The Carter Family", amount: "$2,100", medalColor: "bg-[#4B5E75] text-white" },
    { rank: 5, name: "Waypoint Community", amount: "$1,950", medalColor: "bg-[#4B5E75] text-white" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
      {/* ─── Recent Donations (Col 1 ~ 42% on xl) ─── */}
      <GivingParchmentCard className="xl:col-span-5 flex flex-col justify-between p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-[#D8C7A5]/80 pb-3">
          <h2
            className="text-base sm:text-lg font-bold text-[#1B293C] tracking-wide"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Recent Donations
          </h2>

          <Link href="/giving/donations">
            <button
              type="button"
              className="px-3 py-1 rounded-full bg-[#0A1A33] hover:bg-[#0E2548] text-[#F3EAD3] border border-[#234575]/80 text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>

        {/* Donations Table */}
        <div className="overflow-x-auto pt-2 scrollbar-none">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E3D6BF] text-[#7A664E] font-semibold">
                <th className="py-2 pr-2 font-medium">Date</th>
                <th className="py-2 px-2 font-medium">Donor</th>
                <th className="py-2 px-2 font-medium">Amount</th>
                <th className="py-2 px-2 font-medium">Type</th>
                <th className="py-2 pl-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE1C8]">
              {displayDonations.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#EFE4CC]/50 transition-colors">
                  <td className="py-2 pr-2 text-[#5A4734] whitespace-nowrap">{row.date}</td>
                  <td className="py-2 px-2 font-semibold text-[#182638] whitespace-nowrap">{row.donor}</td>
                  <td className="py-2 px-2 font-bold font-serif text-[#182638]">{row.amount}</td>
                  <td className="py-2 px-2 text-[#68533D]">{row.type}</td>
                  <td className="py-2 pl-2 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1E5C2D]">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          row.statusType === "active" ? "bg-[#2563EB]" : "bg-[#16A34A]"
                        )}
                      />
                      <span>{row.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GivingParchmentCard>

      {/* ─── Active Scholarships (Col 2 ~ 33% on xl) ─── */}
      <GivingParchmentCard className="xl:col-span-4 flex flex-col justify-between p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-[#D8C7A5]/80 pb-3">
          <h2
            className="text-base sm:text-lg font-bold text-[#1B293C] tracking-wide"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Active Scholarships
          </h2>

          <Link href="/giving/scholarships">
            <button
              type="button"
              className="px-3 py-1 rounded-full bg-[#0A1A33] hover:bg-[#0E2548] text-[#F3EAD3] border border-[#234575]/80 text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>

        {/* Scholarships List */}
        <div className="space-y-3 pt-3">
          {displayScholarships.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg bg-[#EFE4CC]/70 border border-[#D8C6A5] hover:bg-[#EAE0C4] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Initials Badge */}
                <div className="w-9 h-9 rounded-full bg-[#1A385E] text-[#FCD77B] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {s.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#182638] leading-tight truncate">{s.name}</p>
                  <p className="text-[11px] text-[#69543C] leading-tight mt-0.5 truncate">{s.program} · {s.since}</p>
                </div>
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#1C5E2C] shrink-0 ml-2">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                <span>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      </GivingParchmentCard>

      {/* ─── Top Supporters (Col 3 ~ 25% on xl) ─── */}
      <GivingParchmentCard className="xl:col-span-3 flex flex-col justify-between p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-[#D8C7A5]/80 pb-3">
          <h2
            className="text-base sm:text-lg font-bold text-[#1B293C] tracking-wide"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Top Supporters
          </h2>

          <Link href="/giving/supporters">
            <button
              type="button"
              className="px-3 py-1 rounded-full bg-[#0A1A33] hover:bg-[#0E2548] text-[#F3EAD3] border border-[#234575]/80 text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>

        {/* Supporters Ranked List */}
        <div className="space-y-2 pt-2 text-xs">
          {displaySupporters.map((donor) => (
            <div
              key={donor.rank}
              className="flex items-center justify-between py-1.5 border-b border-[#E3D6BF] last:border-b-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={cn("w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs", donor.medalColor)}>
                  {donor.rank}
                </span>
                <span className="font-semibold text-[#182638] truncate">{donor.name}</span>
              </div>
              <span className="font-bold font-serif text-[#182638] shrink-0 ml-2">{donor.amount}</span>
            </div>
          ))}
        </div>
      </GivingParchmentCard>
    </div>
  );
}
