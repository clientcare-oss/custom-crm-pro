export interface ServiceDeliverableItem {
  id: string;
  text: string;
  sortOrder: number;
  isActive: boolean;
}

export type PlanEligibilityStatus = "included" | "available_as_addon" | "unavailable" | "custom";

export interface PlanEligibilityMap {
  plan_55?: PlanEligibilityStatus;
  plan_105?: PlanEligibilityStatus;
  scholarship?: PlanEligibilityStatus;
  pay_per_use?: PlanEligibilityStatus;
  standalone?: PlanEligibilityStatus;
}

export interface CatalogServiceItem {
  id: number;
  organizationId: number;
  ownerId: number;
  folderId: number | null;
  serviceCode: string;
  internalName: string;
  clientFacingTitle: string;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  description: string | null;
  internalInstructions: string | null;
  sortOrder: number;
  icon: string;
  accentColor: string;
  price: number;
  standardPrice: number;
  currency: string;
  billingType: "recurring" | "one_time" | "included" | "free" | "custom" | string;
  billingInterval: "monthly" | "yearly" | null | string;
  customPriceAllowed: boolean;
  duration: number | null;
  sessionDurationMinutes: number | null;
  deliveryTimeValue: number | null;
  deliveryTimeUnit: string;
  deliveryTimeLabel: string;
  isActive: boolean;
  isArchived: boolean;
  availableInDiscoveryCall: boolean;
  availableInParentPortal: boolean;
  availableInSupportOfferPanel: boolean;
  availableAsStandalone: boolean;
  availableAsAddOn: boolean;
  visibleToEmployees: boolean;
  planEligibility: string | PlanEligibilityMap | null;
  includedItems: string | ServiceDeliverableItem[] | null;
  allowDocumentUpload: boolean;
  requireDocumentUpload: boolean;
  requireQuestionnaire: boolean;
  requireAgreement: boolean;
  requirePayment: boolean;
  smartFileTemplateId: number | null;
  workflowTemplateId: number | null;
  taskTemplateId: number | null;
  priorityEnabled: boolean;
  priorityPrice: number | null;
  priorityDeliveryTimeValue: number | null;
  priorityDeliveryTimeUnit: string | null;
  priorityDeliveryTimeLabel: string | null;
  priorityDescription: string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  stripeRecurringPriceId: string | null;
  stripePriorityPriceId: string | null;
  stripeSyncStatus: "not_connected" | "synced" | "update_required" | "sync_failed" | string;
  stripeSyncedAt: string | Date | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CatalogFolderItem {
  id: number;
  organizationId: number;
  ownerId: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  isArchived: boolean;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ServicesFilterState {
  status: "all" | "active" | "inactive" | "archived";
  folderId: number | null; // null = all, or specific ID
  search: string;
  billingType: string | "all";
  availableAsAddOnOnly: boolean;
  showMoreFilters: boolean;
}
