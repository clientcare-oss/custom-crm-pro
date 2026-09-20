import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { LayoutGrid, List, AlertCircle, RefreshCw, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ScopedErrorBoundary from "@/components/ScopedErrorBoundary";

// Modular Services Components
import { ServicesHeader } from "@/components/services/ServicesHeader";
import { ServicesSummaryCards } from "@/components/services/ServicesSummaryCards";
import { ServicesCategoryPanel } from "@/components/services/ServicesCategoryPanel";
import { ServiceCard } from "@/components/services/ServiceCard";
import { ServiceListView } from "@/components/services/ServiceListView";
import { ServiceEditorSheet } from "@/components/services/ServiceEditorSheet";
import { ServiceDetailModal } from "@/components/services/ServiceDetailModal";
import { CategoryModal } from "@/components/services/CategoryModal";
import type { CatalogServiceItem, CatalogFolderItem } from "@/components/services/serviceTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ServicesPage() {
  return (
    <ScopedErrorBoundary moduleName="Advocacy Services Catalog">
      <ServicesCatalogMain />
    </ScopedErrorBoundary>
  );
}

function ServicesCatalogMain() {
  // Filters & View State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "archived">("active");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isUnfiledSelected, setIsUnfiledSelected] = useState(false);
  const [billingTypeFilter, setBillingTypeFilter] = useState<string>("all");
  const [addOnOnly, setAddOnOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  // Modals & Panels State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingService, setEditingService] = useState<CatalogServiceItem | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [viewingService, setViewingService] = useState<CatalogServiceItem | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<CatalogFolderItem | null>(null);

  // Permanent Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<CatalogServiceItem | null>(null);

  const utils = trpc.useContext();

  // Queries
  const { data: allServices = [], isLoading: loadingServices, error: servicesError, refetch } =
    trpc.services.list.useQuery({
      includeArchived: true,
      status: "all",
    });

  const { data: folders = [], isLoading: loadingFolders } =
    trpc.services.folders.list.useQuery({ includeArchived: false });

  // Mutations
  const createServiceMutation = trpc.services.create.useMutation({
    onSuccess: () => {
      toast.success("Service created successfully");
      utils.services.list.invalidate();
      setEditorOpen(false);
    },
    onError: (err) => toast.error(err.message || "Failed to create service"),
  });

  const updateServiceMutation = trpc.services.update.useMutation({
    onSuccess: () => {
      toast.success("Master service updated");
      utils.services.list.invalidate();
      setEditorOpen(false);
    },
    onError: (err) => toast.error(err.message || "Failed to update service"),
  });

  const duplicateServiceMutation = trpc.services.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Service duplicated as new inactive draft");
      utils.services.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to duplicate service"),
  });

  const archiveServiceMutation = trpc.services.archive.useMutation({
    onSuccess: () => {
      toast.success("Service safely archived");
      utils.services.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to archive service"),
  });

  const restoreServiceMutation = trpc.services.restore.useMutation({
    onSuccess: () => {
      toast.success("Service restored to active catalog");
      utils.services.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to restore service"),
  });

  const deletePermanentMutation = trpc.services.deletePermanent.useMutation({
    onSuccess: () => {
      toast.success("Unreferenced service deleted permanently");
      utils.services.list.invalidate();
      setDeleteConfirmOpen(false);
      setServiceToDelete(null);
    },
    onError: (err) => toast.error(err.message || "Cannot delete service"),
  });

  const moveServiceMutation = trpc.services.move.useMutation({
    onSuccess: () => {
      toast.success("Service moved to category");
      utils.services.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to move service"),
  });

  const createFolderMutation = trpc.services.folders.create.useMutation({
    onSuccess: () => {
      toast.success("Category created");
      utils.services.folders.list.invalidate();
      setCategoryModalOpen(false);
    },
    onError: (err) => toast.error(err.message || "Failed to create category"),
  });

  const updateFolderMutation = trpc.services.folders.update.useMutation({
    onSuccess: () => {
      toast.success("Category updated");
      utils.services.folders.list.invalidate();
      setCategoryModalOpen(false);
    },
    onError: (err) => toast.error(err.message || "Failed to update category"),
  });

  const archiveFolderMutation = trpc.services.folders.archive.useMutation({
    onSuccess: () => {
      toast.success("Category archived");
      utils.services.folders.list.invalidate();
      utils.services.list.invalidate();
      setCategoryModalOpen(false);
    },
    onError: (err) => toast.error(err.message || "Failed to archive category"),
  });

  const seedDefaultsMutation = trpc.services.seedDefaults.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "Standard Waypoint services verified.");
      utils.services.list.invalidate();
      utils.services.folders.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to review defaults"),
  });

  // Client-side filtering across the cached list
  const filteredServices = useMemo(() => {
    let result = (allServices as CatalogServiceItem[]) || [];

    // Status filter
    if (statusFilter === "active") {
      result = result.filter((s) => s.isActive && !s.isArchived);
    } else if (statusFilter === "inactive") {
      result = result.filter((s) => !s.isActive && !s.isArchived);
    } else if (statusFilter === "archived") {
      result = result.filter((s) => s.isArchived);
    }

    // Category filter
    if (isUnfiledSelected) {
      result = result.filter((s) => s.folderId === null || s.folderId === undefined);
    } else if (selectedFolderId !== null) {
      result = result.filter((s) => s.folderId === selectedFolderId);
    }

    // Add-on only filter
    if (addOnOnly) {
      result = result.filter((s) => s.availableAsAddOn);
    }

    // Billing type filter
    if (billingTypeFilter !== "all") {
      result = result.filter((s) => s.billingType === billingTypeFilter);
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) => {
        const title = (s.clientFacingTitle || s.name || "").toLowerCase();
        const internal = (s.internalName || "").toLowerCase();
        const code = (s.serviceCode || "").toLowerCase();
        const desc = (s.shortDescription || s.description || "").toLowerCase();
        const deliverables = typeof s.includedItems === "string" ? s.includedItems.toLowerCase() : "";
        const priceStr = (s.standardPrice / 100).toString();

        return (
          title.includes(q) ||
          internal.includes(q) ||
          code.includes(q) ||
          desc.includes(q) ||
          deliverables.includes(q) ||
          priceStr.includes(q)
        );
      });
    }

    return result;
  }, [allServices, statusFilter, selectedFolderId, isUnfiledSelected, addOnOnly, billingTypeFilter, search]);

  const hasActiveFilters =
    statusFilter !== "active" ||
    selectedFolderId !== null ||
    isUnfiledSelected ||
    billingTypeFilter !== "all" ||
    addOnOnly ||
    search.trim().length > 0;

  const handleClearFilters = () => {
    setStatusFilter("active");
    setSelectedFolderId(null);
    setIsUnfiledSelected(false);
    setBillingTypeFilter("all");
    setAddOnOnly(false);
    setSearch("");
  };

  // Handlers for Services
  const handleAddService = () => {
    setEditingService(null);
    setEditorOpen(true);
  };

  const handleEditService = (service: CatalogServiceItem) => {
    setEditingService(service);
    setEditorOpen(true);
  };

  const handleViewService = (service: CatalogServiceItem) => {
    setViewingService(service);
    setDetailOpen(true);
  };

  const handleDuplicateService = (service: CatalogServiceItem) => {
    duplicateServiceMutation.mutate({ id: service.id });
  };

  const handleToggleActive = (service: CatalogServiceItem) => {
    updateServiceMutation.mutate({
      id: service.id,
      isActive: !service.isActive,
    });
  };

  const handleArchiveService = (service: CatalogServiceItem) => {
    archiveServiceMutation.mutate({ id: service.id });
  };

  const handleRestoreService = (service: CatalogServiceItem) => {
    restoreServiceMutation.mutate({ id: service.id });
  };

  const handleMoveToCategory = (service: CatalogServiceItem, folderId: number | null) => {
    moveServiceMutation.mutate({ id: service.id, folderId });
  };

  const handleDeletePermanent = (service: CatalogServiceItem) => {
    setServiceToDelete(service);
    setDeleteConfirmOpen(true);
  };

  const handleSaveService = async (data: Partial<CatalogServiceItem>) => {
    if (data.id) {
      await updateServiceMutation.mutateAsync({
        id: data.id,
        ...(data as any),
      });
    } else {
      await createServiceMutation.mutateAsync(data as any);
    }
  };

  // Category Handlers
  const handleNewCategory = () => {
    setEditingFolder(null);
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (folder: CatalogFolderItem) => {
    setEditingFolder(folder);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (data: { name: string; slug?: string; icon?: string; color?: string }) => {
    if (editingFolder) {
      await updateFolderMutation.mutateAsync({
        id: editingFolder.id,
        ...data,
      });
    } else {
      await createFolderMutation.mutateAsync(data);
    }
  };

  const handleArchiveCategory = async (folderId: number) => {
    await archiveFolderMutation.mutateAsync({ id: folderId });
  };

  return (
    <div className="min-h-full bg-[#000821] text-slate-100 space-y-3 max-w-full overflow-x-hidden pb-8">
      {/* Header & Search */}
      <ServicesHeader
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        billingTypeFilter={billingTypeFilter}
        onBillingTypeFilterChange={setBillingTypeFilter}
        onAddService={handleAddService}
        onReviewDefaults={() => seedDefaultsMutation.mutate()}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Summary Cards */}
      <ServicesSummaryCards
        services={(allServices as CatalogServiceItem[]) || []}
        activeFilter={statusFilter}
        onSelectFilter={setStatusFilter}
        addOnOnly={addOnOnly}
        onToggleAddOn={() => setAddOnOnly(!addOnOnly)}
      />

      {/* Main Layout: Category Left Panel + Services Right List */}
      <div className="flex flex-col lg:flex-row items-start gap-4 pt-1">
        {/* Left Category Panel */}
        <ServicesCategoryPanel
          folders={(folders as CatalogFolderItem[]) || []}
          services={(allServices as CatalogServiceItem[]) || []}
          selectedFolderId={selectedFolderId}
          isUnfiledSelected={isUnfiledSelected}
          onSelectAll={() => {
            setSelectedFolderId(null);
            setIsUnfiledSelected(false);
          }}
          onSelectFolder={(id) => {
            setSelectedFolderId(id);
            setIsUnfiledSelected(false);
          }}
          onSelectUnfiled={() => {
            setSelectedFolderId(null);
            setIsUnfiledSelected(true);
          }}
          onNewCategory={handleNewCategory}
          onEditCategory={handleEditCategory}
        />

        {/* Right Services Listing Area */}
        <div className="flex-1 w-full min-w-0 space-y-3">
          {/* List Title & View Switcher Bar */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Services</h2>
              <span className="text-xs font-semibold text-sky-400">
                ({filteredServices.length} {filteredServices.length === 1 ? "item" : "items"})
              </span>
            </div>

            <div className="flex items-center gap-1 bg-[#082043] p-0.5 rounded-lg border border-sky-500/25">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-blue-200 hover:text-white"
                }`}
                aria-label="Cards view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-blue-200 hover:text-white"
                }`}
                aria-label="List view"
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
          </div>

          {/* Loading Skeleton */}
          {loadingServices && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-28 rounded-2xl bg-[#001035]/60 border border-blue-900/50 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Error State */}
          {!loadingServices && servicesError && (
            <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Failed to load services catalog</h3>
              <p className="text-xs text-rose-300 max-w-md mx-auto">{servicesError.message}</p>
              <Button
                type="button"
                onClick={() => refetch()}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-xl"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry Loading
              </Button>
            </div>
          )}

          {/* Empty State: No Services at all */}
          {!loadingServices && !servicesError && (allServices as any[]).length === 0 && (
            <div className="p-12 rounded-2xl bg-[#001035] border border-blue-900/60 shadow-xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-950/80 border border-blue-800/40 flex items-center justify-center text-blue-400 mx-auto">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">No services have been created yet.</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Create your first master service offering to start generating client proposals and portal offers.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddService}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold px-4"
              >
                Add Your First Service
              </Button>
            </div>
          )}

          {/* Empty State: Filter matched nothing */}
          {!loadingServices &&
            !servicesError &&
            (allServices as any[]).length > 0 &&
            filteredServices.length === 0 && (
              <div className="p-10 rounded-2xl bg-[#0B1D35] border border-blue-900/40 text-center space-y-3">
                <h3 className="text-base font-bold text-white">No services match these filters.</h3>
                <p className="text-xs text-slate-400">
                  Try adjusting your search keywords, billing filter, or category selection.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearFilters}
                  className="border-blue-900/60 bg-[#07162B] text-slate-200 text-xs rounded-xl"
                >
                  Clear Filters
                </Button>
              </div>
            )}

          {/* Render Cards View */}
          {!loadingServices && !servicesError && viewMode === "cards" && filteredServices.length > 0 && (
            <div className="space-y-3">
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  folders={(folders as CatalogFolderItem[]) || []}
                  onView={handleViewService}
                  onEdit={handleEditService}
                  onDuplicate={handleDuplicateService}
                  onMoveToCategory={handleMoveToCategory}
                  onToggleActive={handleToggleActive}
                  onArchive={handleArchiveService}
                  onRestore={handleRestoreService}
                  onViewHistory={handleViewService}
                  onDeletePermanent={handleDeletePermanent}
                />
              ))}
            </div>
          )}

          {/* Render List View */}
          {!loadingServices && !servicesError && viewMode === "list" && filteredServices.length > 0 && (
            <ServiceListView
              services={filteredServices}
              folders={(folders as CatalogFolderItem[]) || []}
              onView={handleViewService}
              onEdit={handleEditService}
              onDuplicate={handleDuplicateService}
              onToggleActive={handleToggleActive}
              onArchive={handleArchiveService}
              onRestore={handleRestoreService}
              onDeletePermanent={handleDeletePermanent}
            />
          )}

          {/* Footer Count info */}
          {!loadingServices && filteredServices.length > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-2 pt-2">
              <span>
                Showing 1–{filteredServices.length} of {filteredServices.length} services
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Full Service Editor Drawer */}
      <ServiceEditorSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        service={editingService}
        folders={(folders as CatalogFolderItem[]) || []}
        onSave={handleSaveService}
        saving={createServiceMutation.isPending || updateServiceMutation.isPending}
      />

      {/* Service Detail Modal (View action) */}
      <ServiceDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        service={viewingService}
        folders={(folders as CatalogFolderItem[]) || []}
        onEdit={(srv) => {
          setViewingService(null);
          setEditingService(srv);
          setEditorOpen(true);
        }}
      />

      {/* Category Modal (Add / Edit category) */}
      <CategoryModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        folder={editingFolder}
        onSave={handleSaveCategory}
        onArchive={handleArchiveCategory}
        saving={createFolderMutation.isPending || updateFolderMutation.isPending}
      />

      {/* Guarded Permanent Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-[#001035] border border-rose-900/60 text-slate-100 max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <Trash2 className="w-5 h-5" />
              Delete Service Permanently?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 pt-2">
              Permanent deletion is strictly restricted to services that have{" "}
              <strong className="text-white">never</strong> been referenced in historical client offers,
              invoices, payments, or contracts.
              <br />
              <br />
              If this service has ever been used, permanent deletion will be blocked and you must use{" "}
              <strong className="text-amber-300">Archive Service</strong> instead to preserve historical accounting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              className="border-blue-900/60 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deletePermanentMutation.isPending}
              onClick={() => {
                if (serviceToDelete) {
                  deletePermanentMutation.mutate({ id: serviceToDelete.id });
                }
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
            >
              {deletePermanentMutation.isPending ? "Checking & Deleting..." : "Yes, Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
