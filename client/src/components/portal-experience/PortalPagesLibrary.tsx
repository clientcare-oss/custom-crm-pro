import React, { useState } from "react";
import { PortalExperiencePage, PageCategory } from "./types";
import { InteractivePageIdPill } from "./InteractivePageIdPill";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Layers, 
  Eye, 
  Sliders, 
  ExternalLink, 
  Sparkles, 
  Check, 
  Filter,
  Globe,
  FileCode2,
  Lock,
  ArrowUpRight,
  Hash
} from "lucide-react";
import { toast } from "sonner";

interface PortalPagesLibraryProps {
  pages: PortalExperiencePage[];
  onPreviewPage: (page: PortalExperiencePage) => void;
  onDesignPage: (page: PortalExperiencePage) => void;
  onToggleStatus: (pageId: string) => void;
}

export function PortalPagesLibrary({
  pages,
  onPreviewPage,
  onDesignPage,
  onToggleStatus
}: PortalPagesLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories: Array<{ id: string; label: string }> = [
    { id: "all", label: "All Pages (22)" },
    { id: "Discovery & Pre-Sale", label: "Discovery & Pre-Sale" },
    { id: "Onboarding & Setup", label: "Onboarding & Setup" },
    { id: "Active Workspaces", label: "Active Workspaces" },
    { id: "Account & Billing", label: "Account & Billing" },
    { id: "Lifecycle & Offboarding", label: "Lifecycle & Offboarding" }
  ];

  const filteredPages = pages.filter((page) => {
    const matchesSearch = 
      page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.pageId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.associatedStageName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || page.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-xl border border-border/50">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search experience pages, # IDs, routes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-background/80"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              size="sm"
              variant={selectedCategory === cat.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.id)}
              className={`h-8 text-xs font-semibold px-2.5 transition-all ${
                selectedCategory === cat.id 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPages.map((page) => (
          <Card 
            key={page.id}
            className="border-border/60 hover:border-primary/40 transition-all duration-200 bg-card/90 flex flex-col justify-between overflow-hidden group shadow-sm hover:shadow-md"
          >
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                {/* # Page ID badge */}
                <InteractivePageIdPill pageId={page.pageId} size="sm" />

                <button
                  onClick={() => onToggleStatus(page.id)}
                  title="Toggle publication status"
                  className="transition-transform hover:scale-105"
                >
                  {page.status === "published" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30 text-[10px] cursor-pointer">
                      Published
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border-amber-500/30 text-[10px] cursor-pointer">
                      Draft
                    </Badge>
                  )}
                </button>
              </div>

              <div className="mb-1">
                <Badge variant="outline" className="text-[10px] font-medium bg-muted/40 text-muted-foreground border-border/60">
                  {page.category}
                </Badge>
              </div>

              <CardTitle className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                <span>{page.name}</span>
              </CardTitle>

              <CardDescription className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                {page.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-4 pb-3 pt-0 space-y-2.5 text-xs">
              <div className="flex items-center justify-between bg-muted/30 p-2 rounded border border-border/40 font-mono text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5 truncate">
                  <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                  {page.route}
                </span>
                <span className="text-[10px] text-foreground font-sans font-semibold bg-background px-1.5 py-0.5 rounded border border-border/40 shrink-0">
                  {page.associatedStageName.split(" · ")[0]}
                </span>
              </div>
            </CardContent>

            <div className="p-3 bg-muted/15 border-t border-border/40 flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDesignPage(page)}
                className="flex-1 h-7 text-xs font-semibold gap-1 border-border/60 hover:bg-muted"
              >
                <Sliders className="h-3 w-3" />
                Design
              </Button>

              <Button
                size="sm"
                onClick={() => onPreviewPage(page)}
                className="flex-1 h-7 text-xs font-semibold gap-1 bg-primary/90 hover:bg-primary text-primary-foreground"
              >
                <Eye className="h-3 w-3" />
                Preview
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredPages.length === 0 && (
        <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/60">
          <Layers className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="font-semibold text-foreground">No experience pages match your filter</p>
          <p className="text-xs mt-1">Try searching for a different keyword or selecting 'All Pages'.</p>
        </div>
      )}
    </div>
  );
}
