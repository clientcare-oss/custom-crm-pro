/**
 * Scholarships Page — PG-040-SCH
 * IEP Advocacy family scholarship awards, needs-based fee co-sponsorships, and grant management.
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PageIdBadge from "@/components/PageIdBadge";
import GivingPageLayout from "@/components/giving/GivingPageLayout";
import { AwardScholarshipModal } from "@/components/giving/AwardScholarshipModal";
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Heart,
  Landmark,
  User,
  ExternalLink,
  Sparkles,
} from "lucide-react";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function ScholarshipsPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: scholarships = [], isLoading } = trpc.giving.listScholarships.useQuery();

  const filtered = scholarships.filter((s: any) => {
    const q = search.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.familyContactName.toLowerCase().includes(q) ||
      s.programTier.toLowerCase().includes(q) ||
      s.fundName.toLowerCase().includes(q)
    );
  });

  return (
    <GivingPageLayout>
      {/* ── Sub-Header: Waypoint Navy Plaque Sub-Bar with Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_6px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0B2144] border border-[#C5A059]/40 flex items-center justify-center text-[#FAD77B] shadow-inner">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 
                  className="text-xl md:text-2xl font-bold tracking-wide text-[#FFF4D4]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Scholarships & Advocacy Grants
                </h2>
                <PageIdBadge id="PG-040-SCH" name="Scholarship Grants" />
              </div>
              <p className="text-xs text-[#C6B697]">
                Manage awarded IEP subsidies, evaluation stipends, and recipient families.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs h-9 px-4 gap-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 cursor-pointer self-start md:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Award Scholarship</span>
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center justify-between gap-3 bg-[#030D1C]/90 border border-[#3A2C18] p-3 rounded-xl shadow-inner">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A69371]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, family, program..."
            className="pl-9 bg-[#010814] border-[#3A2C18] text-xs text-[#FFF4D4] placeholder:text-[#A69371]/60 h-8 rounded-lg focus-visible:ring-[#C5A059]"
          />
        </div>
        <span className="text-xs text-[#C6B697] hidden sm:block">
          {filtered.length} active grant{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Table */}
      <Card className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Student & Family</th>
                <th className="py-3.5 px-4">Scholarship Program Tier</th>
                <th className="py-3.5 px-4">Funding Source</th>
                <th className="py-3.5 px-4 text-right">Grant Subsidy</th>
                <th className="py-3.5 px-4">Award Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2A40]/60 text-[#F2E8D5]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white/50">
                    Loading scholarships...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white/50">
                    No scholarships found
                  </td>
                </tr>
              ) : (
                filtered.map((s: any) => (
                  <tr key={s.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                        {s.studentName}
                      </p>
                      <p className="text-[11px] text-white/50">
                        Parent: {s.familyContactName}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[11px]">
                        {s.programTier}
                      </Badge>
                      {s.notes && (
                        <p className="text-[10px] text-white/40 mt-1 truncate max-w-xs">{s.notes}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-white/80 font-medium">{s.fundName}</p>
                      {s.sponsorName && (
                        <p className="text-[10px] text-purple-300 flex items-center gap-1">
                          <Heart className="h-2.5 w-2.5" /> Sponsoring Partner: {s.sponsorName}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-amber-300 text-xs">
                        {formatCurrency(s.monthlyGrantAmount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/70 text-[11px]">
                      {s.awardedAt}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                        Active Grant
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Award & Initiate Scholarship Modal */}
      <AwardScholarshipModal open={modalOpen} onOpenChange={setModalOpen} />
    </GivingPageLayout>
  );
}
