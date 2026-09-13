/**
 * Website Tools Overview Page — PG-040-WEB
 * Create and manage donation forms, campaign pages, buttons, progress bars, and shareable fundraising tools.
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PageIdBadge from "@/components/PageIdBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Globe,
  Plus,
  Search,
  FileText,
  MousePointerClick,
  Layers,
  BarChart2,
  Megaphone,
  UserPlus,
  Eye,
  Pencil,
  Copy,
  Code2,
  MoreVertical,
  Landmark,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Archive,
  Trash2,
  Sparkles,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import CreateEditWebsiteToolModal from "@/components/giving/website-tools/CreateEditWebsiteToolModal";
import WebsiteToolPreviewModal from "@/components/giving/website-tools/WebsiteToolPreviewModal";
import ShareWebsiteToolModal from "@/components/giving/website-tools/ShareWebsiteToolModal";

const TYPE_ICONS: Record<string, any> = {
  donation_form: FileText,
  donate_button: MousePointerClick,
  floating_button: Layers,
  progress_bar: BarChart2,
  campaign_page: Megaphone,
  supporter_signup: UserPlus,
};

const TYPE_LABELS: Record<string, string> = {
  donation_form: "Donation Form",
  donate_button: "Donate Button",
  floating_button: "Floating Button",
  progress_bar: "Goal / Progress Bar",
  campaign_page: "Campaign Page",
  supporter_signup: "Supporter Signup",
};

export default function WebsiteToolsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toolToEdit, setToolToEdit] = useState<any | null>(null);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [toolToPreview, setToolToPreview] = useState<any | null>(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [toolToShare, setToolToShare] = useState<any | null>(null);

  const utils = trpc.useUtils();
  const { data: tools = [], isLoading } = trpc.giving.listWebsiteTools.useQuery({
    type: typeFilter,
    status: statusFilter,
    search: search || undefined,
  });

  const deleteToolMutation = trpc.giving.deleteWebsiteTool.useMutation({
    onSuccess: () => {
      toast.success("Website tool deleted");
      utils.giving.listWebsiteTools.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to delete tool"),
  });

  const updateToolMutation = trpc.giving.updateWebsiteTool.useMutation({
    onSuccess: () => {
      toast.success("Tool status updated");
      utils.giving.listWebsiteTools.invalidate();
    },
  });

  // Calculate summary metrics
  const activeCount = tools.filter((t) => t.status === "active").length;
  const totalRaisedCents = tools.reduce((sum, t) => sum + (t.amountRaisedCents || 0), 0);
  const totalDonationsCount = tools.reduce((sum, t) => sum + (t.donationsGeneratedCount || 0), 0);

  const handleCopyLink = (tool: any) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://waypointadvocates.com";
    const url = `${origin}/give/${tool.slug || tool.id}`;
    navigator.clipboard.writeText(url);
    toast.success(`Copied link for ${tool.name}!`);
  };

  const handleToggleStatus = (tool: any) => {
    const nextStatus = tool.status === "active" ? "archived" : "active";
    updateToolMutation.mutate({
      id: tool.id,
      status: nextStatus,
    });
  };

  return (
    <div className="min-h-screen bg-[#07162B] text-white p-4 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-inner">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Website Tools</h1>
              <PageIdBadge id="PG-040-WEB" name="Website Tools" />
            </div>
            <p className="text-xs md:text-sm text-white/60">
              Create donation forms, campaign pages, buttons, progress bars, and shareable fundraising tools for the
              Waypoint website.
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setToolToEdit(null);
            setCreateModalOpen(true);
          }}
          className="bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] hover:brightness-105 text-black font-bold text-xs md:text-sm rounded-xl px-4 py-2.5 shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create Website Tool
        </Button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-[#001A41]/80 border border-white/10 rounded-2xl">
          <span className="text-xs text-white/50 block">Active Tools</span>
          <span className="text-2xl font-bold text-white mt-1 block">{activeCount}</span>
          <span className="text-[10px] text-emerald-400 mt-1 block">Live on Public Website</span>
        </Card>
        <Card className="p-4 bg-[#001A41]/80 border border-white/10 rounded-2xl">
          <span className="text-xs text-white/50 block">Web Gifts Generated</span>
          <span className="text-2xl font-bold text-[#D4AF37] mt-1 block">{totalDonationsCount}</span>
          <span className="text-[10px] text-white/50 mt-1 block">Connected donations</span>
        </Card>
        <Card className="p-4 bg-[#001A41]/80 border border-white/10 rounded-2xl">
          <span className="text-xs text-white/50 block">Total Raised via Tools</span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">
            ${(totalRaisedCents / 100).toLocaleString()}
          </span>
          <span className="text-[10px] text-white/50 mt-1 block">100% connected data</span>
        </Card>
        <Card className="p-4 bg-[#001A41]/80 border border-white/10 rounded-2xl">
          <span className="text-xs text-white/50 block">Connected Funds</span>
          <span className="text-2xl font-bold text-white mt-1 block">3 Funds</span>
          <span className="text-[10px] text-[#D4AF37] mt-1 block">Real-time balances</span>
        </Card>
      </div>

      {/* Controls & Search */}
      <Card className="p-4 bg-[#001A41]/60 border border-white/10 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools by name, slug, or fund..."
              className="bg-black/30 border-white/15 text-white pl-9 text-xs h-9 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Type Filters */}
            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10 text-xs overflow-x-auto max-w-full">
              {[
                { id: "all", label: "All Types" },
                { id: "donation_form", label: "Forms" },
                { id: "campaign_page", label: "Campaigns" },
                { id: "donate_button", label: "Buttons" },
                { id: "floating_button", label: "Floating" },
                { id: "progress_bar", label: "Goals" },
                { id: "supporter_signup", label: "Signups" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTypeFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all text-xs whitespace-nowrap ${
                    typeFilter === f.id
                      ? "bg-[#D4AF37] text-black font-semibold shadow"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10 text-xs">
              {["all", "active", "draft", "archived"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2 py-1 rounded-lg text-xs capitalize ${
                    statusFilter === s ? "bg-white/20 text-white font-medium" : "text-white/50 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Tools Cards Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-white/50 text-sm">Loading website fundraising tools...</div>
      ) : tools.length === 0 ? (
        <Card className="p-12 bg-[#001A41]/40 border border-white/10 rounded-2xl text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mx-auto">
            <Globe className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Website Tools Found</h3>
          <p className="text-xs text-white/60 max-w-sm mx-auto">
            {search || typeFilter !== "all"
              ? "Try adjusting your search query or filters to locate website fundraising widgets."
              : "Create your first donation form, campaign page, or donate button to launch on your public website."}
          </p>
          <Button
            onClick={() => {
              setToolToEdit(null);
              setCreateModalOpen(true);
            }}
            className="bg-[#D4AF37] hover:bg-[#F59E0B] text-black font-bold text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Create Tool Now
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool: any) => {
            const Icon = TYPE_ICONS[tool.type] || FileText;
            const typeLabel = TYPE_LABELS[tool.type] || tool.type;

            return (
              <Card
                key={tool.id}
                className="overflow-hidden bg-[#001A41]/85 border border-white/10 hover:border-[#D4AF37]/50 transition-all rounded-2xl shadow-lg flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#D4AF37]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <Badge variant="outline" className="text-[10px] text-white/70 border-white/20 font-medium">
                          {typeLabel}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge
                        className={`text-[10px] font-semibold ${
                          tool.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : tool.status === "draft"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-white/10 text-white/50 border border-white/20"
                        }`}
                      >
                        {tool.status}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/50 hover:text-white">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#001A41] border border-white/15 text-white text-xs">
                          <DropdownMenuItem
                            onClick={() => {
                              setToolToEdit(tool);
                              setCreateModalOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(tool)}>
                            <Archive className="h-3.5 w-3.5 mr-2" />
                            {tool.status === "active" ? "Archive Tool" : "Activate Tool"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm(`Delete tool "${tool.name}"? Past donation records will not be deleted.`)) {
                                deleteToolMutation.mutate({ id: tool.id });
                              }
                            }}
                            className="text-rose-400 focus:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Tool
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight leading-snug">{tool.name}</h3>
                    <p className="text-xs text-white/60 line-clamp-2 mt-1">{tool.description || tool.headline}</p>
                  </div>

                  {/* Connected Fund Badge */}
                  <div className="flex items-center gap-1.5 text-xs text-white/70 pt-1">
                    <Landmark className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span className="truncate">{tool.fundName}</span>
                  </div>

                  {/* Dynamic Metrics Row */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                    <div className="bg-black/30 p-2 rounded-lg">
                      <span className="text-[10px] text-white/50 block">Amount Raised</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        ${((tool.amountRaisedCents || 0) / 100).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg">
                      <span className="text-[10px] text-white/50 block">Gifts Generated</span>
                      <span className="font-bold text-white text-sm">
                        {tool.donationsGeneratedCount || 0} donations
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-black/30 border-t border-white/10 flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setToolToPreview(tool);
                        setPreviewModalOpen(true);
                      }}
                      className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10 px-2"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setToolToEdit(tool);
                        setCreateModalOpen(true);
                      }}
                      className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10 px-2"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyLink(tool)}
                      className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/10 px-2"
                      title="Copy Public URL"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setToolToShare(tool);
                        setShareModalOpen(true);
                      }}
                      className="h-7 text-xs bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-semibold border border-[#D4AF37]/30 px-2.5 rounded-lg"
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1" /> Embed
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateEditWebsiteToolModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        toolToEdit={toolToEdit}
        onSaved={() => utils.giving.listWebsiteTools.invalidate()}
      />

      <WebsiteToolPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        tool={toolToPreview}
      />

      <ShareWebsiteToolModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        tool={toolToShare}
      />
    </div>
  );
}
