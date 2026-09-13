/**
 * Create & Edit Website Tool Modal
 * Configures all 6 types of website donation and fundraising tools.
 */

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileText,
  MousePointerClick,
  Layers,
  BarChart2,
  Megaphone,
  UserPlus,
  Plus,
  Trash2,
  CheckCircle2,
  DollarSign,
  Sparkles,
} from "lucide-react";

interface CreateEditWebsiteToolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolToEdit?: any | null;
  onSaved: () => void;
}

const TOOL_TYPES = [
  {
    type: "donation_form",
    label: "Donation Form",
    icon: FileText,
    desc: "Embeddable giving form with frequencies, suggested amounts, and Stripe processing.",
  },
  {
    type: "donate_button",
    label: "Donate Button",
    icon: MousePointerClick,
    desc: "Customizable CTA button opening a modal or redirecting to dedicated giving pages.",
  },
  {
    type: "floating_button",
    label: "Floating Donate Button",
    icon: Layers,
    desc: "Sticky corner button remaining visible during scrolling with custom delay triggers.",
  },
  {
    type: "progress_bar",
    label: "Fundraising Goal / Progress Bar",
    icon: BarChart2,
    desc: "Live visual progress meter calculated dynamically from connected fund donations.",
  },
  {
    type: "campaign_page",
    label: "Campaign Page Builder",
    icon: Megaphone,
    desc: "Full public fundraising page with hero banner, story, impact stats, and embedded form.",
  },
  {
    type: "supporter_signup",
    label: "Supporter Signup Form",
    icon: UserPlus,
    desc: "Engage allies, volunteers, and potential corporate sponsors with direct CRM sync.",
  },
];

export default function CreateEditWebsiteToolModal({
  open,
  onOpenChange,
  toolToEdit,
  onSaved,
}: CreateEditWebsiteToolModalProps) {
  const { data: funds = [] } = trpc.giving.listFunds.useQuery();

  const isEditing = !!toolToEdit;

  // Form State
  const [selectedType, setSelectedType] = useState<string>("donation_form");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [fundId, setFundId] = useState("fnd-1");
  const [status, setStatus] = useState<"active" | "draft" | "archived">("active");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");

  // Settings State
  const [suggestedAmountsStr, setSuggestedAmountsStr] = useState("25, 50, 100, 250");
  const [allowCustomAmount, setAllowCustomAmount] = useState(true);
  const [oneTimeEnabled, setOneTimeEnabled] = useState(true);
  const [monthlyEnabled, setMonthlyEnabled] = useState(true);
  const [allowCoverFees, setAllowCoverFees] = useState(true);
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [showGoal, setShowGoal] = useState(true);
  const [showTotalRaised, setShowTotalRaised] = useState(true);
  const [showDonorCount, setShowDonorCount] = useState(true);
  const [thankYouMessage, setThankYouMessage] = useState("");

  // Button settings
  const [buttonText, setButtonText] = useState("Donate Now");
  const [buttonStyle, setButtonStyle] = useState("solid_gold");
  const [buttonSize, setButtonSize] = useState("md");
  const [buttonIcon, setButtonIcon] = useState("heart");

  // Floating button settings
  const [screenPosition, setScreenPosition] = useState("bottom_right");
  const [displayDelay, setDisplayDelay] = useState(3);

  // Goal / Progress settings
  const [goalAmountStr, setGoalAmountStr] = useState("50000");
  const [shortMessage, setShortMessage] = useState("");

  // Campaign page settings
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [storyContent, setStoryContent] = useState("");

  useEffect(() => {
    if (toolToEdit) {
      setSelectedType(toolToEdit.type || "donation_form");
      setName(toolToEdit.name || "");
      setSlug(toolToEdit.slug || "");
      setFundId(toolToEdit.fundId || "fnd-1");
      setStatus(toolToEdit.status || "active");
      setHeadline(toolToEdit.headline || "");
      setDescription(toolToEdit.description || "");

      const s = toolToEdit.settings || {};
      if (s.suggestedAmounts) {
        setSuggestedAmountsStr(s.suggestedAmounts.map((c: number) => c / 100).join(", "));
      }
      setAllowCustomAmount(s.allowCustomAmount ?? true);
      setOneTimeEnabled(s.frequencies ? s.frequencies.includes("one_time") : true);
      setMonthlyEnabled(s.frequencies ? s.frequencies.includes("monthly") : true);
      setAllowCoverFees(s.allowCoverFees ?? true);
      setAllowAnonymous(s.allowAnonymous ?? true);
      setShowGoal(s.showGoal ?? true);
      setShowTotalRaised(s.showTotalRaised ?? true);
      setShowDonorCount(s.showDonorCount ?? true);
      setThankYouMessage(s.thankYouMessage || "");

      setButtonText(s.buttonText || "Donate Now");
      setButtonStyle(s.buttonStyle || "solid_gold");
      setButtonSize(s.buttonSize || "md");
      setButtonIcon(s.buttonIcon || "heart");

      setScreenPosition(s.screenPosition || "bottom_right");
      setDisplayDelay(s.displayDelaySeconds ?? 3);

      if (s.goalAmountCents) {
        setGoalAmountStr(String(s.goalAmountCents / 100));
      }
      setShortMessage(s.shortMessage || "");
      setHeroImageUrl(s.heroImageUrl || "");
      setStoryContent(s.storyContent || "");
    } else {
      // Default reset
      setSelectedType("donation_form");
      setName("");
      setSlug("");
      setFundId(funds[0]?.id || "fnd-1");
      setStatus("active");
      setHeadline("");
      setDescription("");
      setSuggestedAmountsStr("25, 50, 100, 250");
      setAllowCustomAmount(true);
      setOneTimeEnabled(true);
      setMonthlyEnabled(true);
      setAllowCoverFees(true);
      setAllowAnonymous(true);
      setShowGoal(true);
      setShowTotalRaised(true);
      setShowDonorCount(true);
      setThankYouMessage("Thank you for your generous 501(c)(3) tax-deductible contribution!");
      setButtonText("Donate Now");
      setButtonStyle("solid_gold");
      setButtonSize("md");
      setButtonIcon("heart");
      setScreenPosition("bottom_right");
      setDisplayDelay(3);
      setGoalAmountStr("50000");
      setShortMessage("Help us support 50 families with specialized advocacy grants this year!");
      setHeroImageUrl("https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80");
      setStoryContent("");
    }
  }, [toolToEdit, open]);

  const createMutation = trpc.giving.createWebsiteTool.useMutation({
    onSuccess: () => {
      toast.success("Website Tool created successfully!");
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message || "Failed to create tool"),
  });

  const updateMutation = trpc.giving.updateWebsiteTool.useMutation({
    onSuccess: () => {
      toast.success("Website Tool updated successfully!");
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message || "Failed to update tool"),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a tool name");
      return;
    }
    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const parsedSuggested = suggestedAmountsStr
      .split(",")
      .map((s) => Math.round(parseFloat(s.trim()) * 100))
      .filter((n) => !isNaN(n) && n > 0);

    const frequencies: ("one_time" | "monthly")[] = [];
    if (oneTimeEnabled) frequencies.push("one_time");
    if (monthlyEnabled) frequencies.push("monthly");

    const goalCents = Math.round((parseFloat(goalAmountStr) || 0) * 100);

    const settingsPayload: Record<string, any> = {
      suggestedAmounts: parsedSuggested.length > 0 ? parsedSuggested : [2500, 5000, 10000, 25000],
      allowCustomAmount,
      frequencies: frequencies.length > 0 ? frequencies : ["one_time"],
      allowCoverFees,
      allowAnonymous,
      showGoal,
      showTotalRaised,
      showDonorCount,
      thankYouMessage,
      buttonText,
      buttonStyle,
      buttonSize,
      buttonIcon,
      screenPosition,
      displayDelaySeconds: displayDelay,
      goalAmountCents: goalCents > 0 ? goalCents : 5000000,
      shortMessage,
      heroImageUrl,
      storyContent,
    };

    if (isEditing) {
      updateMutation.mutate({
        id: toolToEdit.id,
        name,
        slug: cleanSlug,
        type: selectedType as any,
        fundId,
        status,
        headline: headline || name,
        description,
        settings: settingsPayload,
      });
    } else {
      createMutation.mutate({
        name,
        slug: cleanSlug,
        type: selectedType as any,
        fundId,
        status,
        headline: headline || name,
        description,
        settings: settingsPayload,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#001A41] border border-[#D4AF37]/30 text-white p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs">
              {isEditing ? "Edit Website Tool" : "New Website Tool"}
            </Badge>
          </div>
          <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight text-white">
            {isEditing ? `Edit: ${name}` : "Create Public Website Fundraising Tool"}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            Configure donation forms, buttons, progress bars, and campaign pages connected to your 501(c)(3) funds.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6 pt-3">
          {/* Tool Type Selector (only on create or switchable) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-white/80">Choose Tool Type</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TOOL_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSel = selectedType === t.type;
                  return (
                    <div
                      key={t.type}
                      onClick={() => setSelectedType(t.type)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSel
                          ? "bg-[#D4AF37]/15 border-[#D4AF37] ring-1 ring-[#D4AF37]"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${isSel ? "bg-[#D4AF37] text-black" : "bg-white/10 text-[#D4AF37]"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{t.label}</div>
                          <div className="text-[10px] text-white/60 leading-tight">{t.desc}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="bg-black/30 border border-white/10 p-1 w-full grid grid-cols-3">
              <TabsTrigger value="general" className="text-xs">General & Fund</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">Behavior & Amounts</TabsTrigger>
              <TabsTrigger value="content" className="text-xs">Copy & Media</TabsTrigger>
            </TabsList>

            {/* TAB 1: General & Fund */}
            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80">Tool Name *</Label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!isEditing && !slug) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                      }
                    }}
                    placeholder="e.g. Rise & Thrive Campaign"
                    className="bg-white/5 border-white/15 text-white text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80">URL Slug (/give/slug) *</Label>
                  <Input
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="rise-and-thrive"
                    className="bg-white/5 border-white/15 text-white text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80">Connected Charitable Fund *</Label>
                  <Select value={fundId} onValueChange={setFundId}>
                    <SelectTrigger className="bg-white/5 border-white/15 text-white text-xs h-9">
                      <SelectValue placeholder="Select Fund" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#001A41] border border-white/15 text-white">
                      {funds.map((f: any) => (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          {f.name} ({f.restrictionType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80">Publication Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger className="bg-white/5 border-white/15 text-white text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#001A41] border border-white/15 text-white">
                      <SelectItem value="active" className="text-xs text-emerald-400">Published / Active</SelectItem>
                      <SelectItem value="draft" className="text-xs text-amber-400">Draft Mode</SelectItem>
                      <SelectItem value="archived" className="text-xs text-white/50">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Public Headline *</Label>
                <Input
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Empower Georgia Children with Special Education Advocacy"
                  className="bg-white/5 border-white/15 text-white text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Public Subtitle / Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide brief context on how this gift creates direct impact..."
                  rows={2}
                  className="bg-white/5 border-white/15 text-white text-xs"
                />
              </div>
            </TabsContent>

            {/* TAB 2: Behavior & Amounts */}
            <TabsContent value="settings" className="space-y-4 pt-4">
              {(selectedType === "donation_form" || selectedType === "campaign_page" || selectedType === "donate_button") && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/80">Suggested Donation Amounts (comma-separated dollars)</Label>
                    <Input
                      value={suggestedAmountsStr}
                      onChange={(e) => setSuggestedAmountsStr(e.target.value)}
                      placeholder="25, 50, 100, 250"
                      className="bg-white/5 border-white/15 text-white text-xs h-9"
                    />
                    <p className="text-[10px] text-white/50">Example: 25, 50, 100, 250. Will render as quick-select pills.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                      <Checkbox
                        checked={oneTimeEnabled}
                        onCheckedChange={(c) => setOneTimeEnabled(!!c)}
                        className="border-white/30 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-black"
                      />
                      <span>Enable One-Time Gifts</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                      <Checkbox
                        checked={monthlyEnabled}
                        onCheckedChange={(c) => setMonthlyEnabled(!!c)}
                        className="border-white/30 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-black"
                      />
                      <span>Enable Monthly Recurring</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                      <Checkbox
                        checked={allowCoverFees}
                        onCheckedChange={(c) => setAllowCoverFees(!!c)}
                        className="border-white/30 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-black"
                      />
                      <span>Allow Donors to Cover Fees</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                      <Checkbox
                        checked={allowAnonymous}
                        onCheckedChange={(c) => setAllowAnonymous(!!c)}
                        className="border-white/30 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-black"
                      />
                      <span>Allow Anonymous Gifts</span>
                    </label>
                  </div>
                </>
              )}

              {(selectedType === "progress_bar" || selectedType === "campaign_page") && (
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs text-white/80">Fundraising Campaign Goal ($ USD)</Label>
                  <Input
                    type="number"
                    value={goalAmountStr}
                    onChange={(e) => setGoalAmountStr(e.target.value)}
                    placeholder="50000"
                    className="bg-white/5 border-white/15 text-white text-xs h-9"
                  />
                  <p className="text-[10px] text-white/50">Progress percentage is calculated automatically from connected donation records.</p>
                </div>
              )}

              {selectedType === "donate_button" && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/80">Button Text</Label>
                    <Input
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      className="bg-white/5 border-white/15 text-white text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/80">Button Style</Label>
                    <Select value={buttonStyle} onValueChange={setButtonStyle}>
                      <SelectTrigger className="bg-white/5 border-white/15 text-white text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#001A41] border border-white/15 text-white">
                        <SelectItem value="solid_gold" className="text-xs">Solid Gold Gradient</SelectItem>
                        <SelectItem value="navy_outline" className="text-xs">Navy Outline</SelectItem>
                        <SelectItem value="minimal" className="text-xs">Minimal Glass</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedType === "floating_button" && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/80">Screen Position</Label>
                    <Select value={screenPosition} onValueChange={setScreenPosition}>
                      <SelectTrigger className="bg-white/5 border-white/15 text-white text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#001A41] border border-white/15 text-white">
                        <SelectItem value="bottom_right" className="text-xs">Bottom Right Corner</SelectItem>
                        <SelectItem value="bottom_left" className="text-xs">Bottom Left Corner</SelectItem>
                        <SelectItem value="middle_right" className="text-xs">Middle Right Tab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/80">Display Delay (Seconds)</Label>
                    <Input
                      type="number"
                      value={displayDelay}
                      onChange={(e) => setDisplayDelay(parseInt(e.target.value) || 0)}
                      className="bg-white/5 border-white/15 text-white text-xs h-9"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: Copy & Media */}
            <TabsContent value="content" className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/80">Custom Thank-You Message</Label>
                <Textarea
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  placeholder="Displayed immediately upon contribution confirmation..."
                  rows={2}
                  className="bg-white/5 border-white/15 text-white text-xs"
                />
              </div>

              {selectedType === "campaign_page" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/80">Campaign Hero Image URL</Label>
                    <Input
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="bg-white/5 border-white/15 text-white text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/80">Full Campaign Story (Rich Text)</Label>
                    <Textarea
                      value={storyContent}
                      onChange={(e) => setStoryContent(e.target.value)}
                      placeholder="Detail why support is needed and the direct impact on students..."
                      rows={4}
                      className="bg-white/5 border-white/15 text-white text-xs"
                    />
                  </div>
                </>
              )}

              {selectedType === "progress_bar" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/80">Progress Bar Motivational Message</Label>
                  <Input
                    value={shortMessage}
                    onChange={(e) => setShortMessage(e.target.value)}
                    placeholder="e.g. Help us reach our goal to sponsor 50 low-income students!"
                    className="bg-white/5 border-white/15 text-white text-xs h-9"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t border-white/10 flex justify-between sm:justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/20 text-white hover:bg-white/10 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[#D4AF37] hover:bg-[#F59E0B] text-black font-bold text-xs shadow-lg"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Create Website Tool"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
