import { getDb } from "./connection";
import { sponsors } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// ── In-Memory / Local Cache for Extended 501(c)(3) Config & Charitable Entities ──
export interface Org501c3Settings {
  legalName: string;
  dbaName: string;
  ein: string;
  address: string;
  status501c3: string;
  effectiveDate: string;
  determinationLetterUrl: string;
  defaultAcknowledgment: string;
  logoUrl: string;
  authorizedSigner: string;
  receiptFooter: string;
  taxDeductibleText: string;
  noGoodsProvidedDefault: boolean;
  stripeConnected: boolean;
  stripeAccountId: string;
  stripeMode: "test" | "live";
  stripeWebhookStatus: "active" | "inactive" | "pending";
  scholarshipProgramName: string;
  scholarshipDescription: string;
  scholarshipEligibility: string;
  scholarshipApplicationDates: string;
  scholarshipAwardRules: string;
  scholarshipDefaultFund: string;
}

export let storedOrgSettings: Org501c3Settings = {
  legalName: "Waypoint Foundation Inc.",
  dbaName: "Waypoint Giving & Advocacy Fund",
  ein: "58-7492014",
  address: "1000 Piedmont Ave NE, Suite 400, Atlanta, GA 30309",
  status501c3: "501(c)(3) Public Charity",
  effectiveDate: "2024-01-01",
  determinationLetterUrl: "/docs/waypoint_501c3_determination.pdf",
  defaultAcknowledgment:
    "Thank you for your generous contribution to Waypoint Foundation. Your tax-deductible gift empowers Georgia families with life-changing special education IEP advocacy, evaluations, and due process protection. No goods or services were provided in exchange for this contribution.",
  logoUrl: "https://d2xsxrembyk66g.cloudfront.net/brand/waypoint_crest_gold.png",
  authorizedSigner: "Byron Honea, Master IEP Coach® & Executive Director",
  receiptFooter:
    "Waypoint Foundation Inc. is an exempt organization as described in Section 501(c)(3) of the Internal Revenue Code. Contributions are tax-deductible to the fullest extent permitted by law.",
  taxDeductibleText: "100% Tax-Deductible Contribution under IRC Section 170(c)(2).",
  noGoodsProvidedDefault: true,
  stripeConnected: true,
  stripeAccountId: "acct_waypoint_charity_giving",
  stripeMode: "test",
  stripeWebhookStatus: "active",
  scholarshipProgramName: "Waypoint IEP Family Scholarship Fund",
  scholarshipDescription:
    "Need-based financial assistance co-sponsoring low-income and single-parent households seeking professional IEP advocacy and dispute resolution.",
  scholarshipEligibility:
    "Documented IEP/504 eligible disabilities; enrolled in Georgia public or charter school; demonstrated family financial hardship.",
  scholarshipApplicationDates: "Rolling annual submissions; quarterly cohort reviews.",
  scholarshipAwardRules: "Covers up to 100% of $55/mo or $105/mo advocacy retainer or one-time independent evaluation review.",
  scholarshipDefaultFund: "Advocacy Scholarship Fund",
};

export interface CharitableFund {
  id: string;
  name: string;
  code: string;
  description: string;
  targetGoal: number; // in cents
  currentBalance: number; // in cents
  restrictionType: "unrestricted" | "restricted" | "endowment";
  isDefault: boolean;
  status: "active" | "paused" | "closed";
}

export let storedFunds: CharitableFund[] = [
  {
    id: "fnd-1",
    name: "Advocacy Scholarship Fund",
    code: "SCHOLARSHIP",
    description: "Subsidizes monthly advocacy fees and emergency IEP representation for low-income families.",
    targetGoal: 5000000, // $50,000
    currentBalance: 2475000, // $24,750
    restrictionType: "restricted",
    isDefault: true,
    status: "active",
  },
  {
    id: "fnd-2",
    name: "General Impact & Operations Fund",
    code: "GENERAL",
    description: "Supports free community parent workshops, IEP rights guides, and public outreach.",
    targetGoal: 2500000, // $25,000
    currentBalance: 1280000, // $12,800
    restrictionType: "unrestricted",
    isDefault: false,
    status: "active",
  },
  {
    id: "fnd-3",
    name: "Emergency Due Process Legal Fund",
    code: "DUE_PROCESS",
    description: "Dedicated to high-stakes state complaint filings, independent evaluations, and expert witness support.",
    targetGoal: 2000000, // $20,000
    currentBalance: 960000, // $9,600
    restrictionType: "restricted",
    isDefault: false,
    status: "active",
  },
];

export interface ScholarshipAward {
  id: string;
  studentName: string;
  familyContactName: string;
  familyEmail?: string;
  programTier: string;
  monthlyGrantAmount: number; // in cents
  fundId: string;
  fundName: string;
  sponsorName?: string;
  awardedAt: string;
  status: "active" | "completed" | "paused";
  notes?: string;
}

export let storedScholarships: ScholarshipAward[] = [
  {
    id: "sch-1",
    studentName: "Lucas Vance",
    familyContactName: "Amanda Vance",
    familyEmail: "amanda.vance@example.com",
    programTier: "Full Advocacy Retainer ($105/mo)",
    monthlyGrantAmount: 10500,
    fundId: "fnd-1",
    fundName: "Advocacy Scholarship Fund",
    sponsorName: "Peachtree Foundation",
    awardedAt: "2026-08-15",
    status: "active",
    notes: "Speech therapy reduction dispute and manifestation hearing support.",
  },
  {
    id: "sch-2",
    studentName: "Maya Robinson",
    familyContactName: "Marcus Robinson",
    familyEmail: "marcus.robinson@example.com",
    programTier: "Core Advocacy Co-Sponsorship ($55/mo)",
    monthlyGrantAmount: 5500,
    fundId: "fnd-1",
    fundName: "Advocacy Scholarship Fund",
    sponsorName: "Northside Community Trust",
    awardedAt: "2026-07-01",
    status: "active",
    notes: "Autism accommodation & transition goal assistance.",
  },
  {
    id: "sch-3",
    studentName: "Elijah Chen",
    familyContactName: "Wei & Lin Chen",
    familyEmail: "chen.family@example.com",
    programTier: "Evaluation Review Stipend",
    monthlyGrantAmount: 35000,
    fundId: "fnd-3",
    fundName: "Emergency Due Process Legal Fund",
    sponsorName: "Anonymous Advocate Friend",
    awardedAt: "2026-09-02",
    status: "active",
    notes: "Independent educational evaluation (IEE) assistance.",
  },
];

// ── In-Memory / Local Storage for Connected Donations ──
export interface StoredDonation {
  id: string;
  dbId?: number;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  donorAddress?: string;
  donorOrganization?: string;
  amountCents: number;
  fundId: string;
  fundName: string;
  paymentMethod: string;
  frequency: "one_time" | "monthly";
  coverFees: boolean;
  anonymous: boolean;
  toolId?: string;
  taxDeductible: boolean;
  receiptNumber: string;
  receiptStatus: "Sent" | "Ready";
  donatedAt: string;
  notes?: string;
}

export let storedDonations: StoredDonation[] = [
  {
    id: "don-1",
    dbId: 1,
    donorName: "Peachtree Children's Foundation",
    donorEmail: "grants@peachtreecf.org",
    amountCents: 500000,
    fundId: "fnd-1",
    fundName: "Advocacy Scholarship Fund",
    paymentMethod: "ACH / Bank Transfer",
    frequency: "one_time",
    coverFees: false,
    anonymous: false,
    taxDeductible: true,
    receiptNumber: "REC-2026-0104",
    receiptStatus: "Sent",
    donatedAt: "2026-08-15T10:30:00Z",
    notes: "Q3 family advocacy co-sponsorship grant.",
    toolId: "tool-rise-thrive",
  },
  {
    id: "don-2",
    dbId: 2,
    donorName: "Dr. Eleanor Vance",
    donorEmail: "eleanor.vance@atlhealth.org",
    amountCents: 50000,
    fundId: "fnd-1",
    fundName: "Advocacy Scholarship Fund",
    paymentMethod: "Stripe (Recurring)",
    frequency: "monthly",
    coverFees: true,
    anonymous: false,
    taxDeductible: true,
    receiptNumber: "REC-2026-0105",
    receiptStatus: "Sent",
    donatedAt: "2026-09-01T14:15:00Z",
    notes: "Monthly sustaining gift via Website Donation Form.",
    toolId: "tool-standard-form",
  },
  {
    id: "don-3",
    dbId: 3,
    donorName: "Sarah & David Miller",
    donorEmail: "dmiller@gmail.com",
    amountCents: 50000,
    fundId: "fnd-2",
    fundName: "General Impact & Operations Fund",
    paymentMethod: "Stripe",
    frequency: "one_time",
    coverFees: false,
    anonymous: false,
    taxDeductible: true,
    receiptNumber: "REC-2026-0106",
    receiptStatus: "Ready",
    donatedAt: "2026-09-05T09:00:00Z",
    notes: "Direct online contribution via Floating Donate Button.",
    toolId: "tool-floating-btn",
  },
  {
    id: "don-4",
    dbId: 4,
    donorName: "Northside Community Trust",
    donorEmail: "community@northsidetrust.org",
    amountCents: 1000000,
    fundId: "fnd-3",
    fundName: "Emergency Due Process Legal Fund",
    paymentMethod: "Check #4829",
    frequency: "one_time",
    coverFees: false,
    anonymous: false,
    taxDeductible: true,
    receiptNumber: "REC-2026-0107",
    receiptStatus: "Sent",
    donatedAt: "2026-07-20T16:00:00Z",
    notes: "Restricted grant for independent educational evaluations.",
  },
];

// ── In-Memory / Local Storage for Supporters ──
export interface StoredSupporter {
  id: string | number;
  name: string;
  entityType: "individual" | "organization";
  supporterType: string;
  email: string;
  phone: string;
  lifetimeGivingCents: number;
  donationCount: number;
  lastGiftDate: string;
  status: "active" | "lapsed" | "prospect";
  areasOfInterest?: string[];
  notes?: string;
  familyName?: string;
}

export let storedSupporters: StoredSupporter[] = [
  {
    id: "sup-101",
    name: "Peachtree Children's Foundation",
    entityType: "organization",
    supporterType: "Corporate Sponsor",
    email: "grants@peachtreecf.org",
    phone: "(404) 555-0192",
    lifetimeGivingCents: 1500000,
    donationCount: 3,
    lastGiftDate: "2026-08-15T12:00:00Z",
    status: "active",
    notes: "Annual sponsor for underserved Atlanta school districts.",
  },
  {
    id: "sup-102",
    name: "Dr. Eleanor Vance",
    entityType: "individual",
    supporterType: "Recurring Donor",
    email: "eleanor.vance@atlhealth.org",
    phone: "(404) 555-0144",
    lifetimeGivingCents: 350000,
    donationCount: 12,
    lastGiftDate: "2026-09-01T12:00:00Z",
    status: "active",
    notes: "Monthly recurring sustaining donor for evaluation reviews.",
  },
  {
    id: "sup-103",
    name: "Northside Community Trust",
    entityType: "organization",
    supporterType: "Corporate Sponsor",
    email: "community@northsidetrust.org",
    phone: "(770) 555-0188",
    lifetimeGivingCents: 1000000,
    donationCount: 2,
    lastGiftDate: "2026-07-20T12:00:00Z",
    status: "active",
    notes: "Designated to Title I School Outreach Fund.",
  },
  {
    id: "sup-104",
    name: "Sarah & David Miller",
    entityType: "individual",
    supporterType: "One-Time Donor",
    email: "dmiller@gmail.com",
    phone: "(404) 555-0177",
    lifetimeGivingCents: 50000,
    donationCount: 1,
    lastGiftDate: "2026-09-05T12:00:00Z",
    status: "active",
    notes: "In honor of autism awareness month.",
  },
];

// ── Website Tools Data Structures ──
export type WebsiteToolType =
  | "donation_form"
  | "donate_button"
  | "floating_button"
  | "progress_bar"
  | "campaign_page"
  | "supporter_signup";

export interface WebsiteTool {
  id: string;
  slug: string;
  name: string;
  type: WebsiteToolType;
  fundId: string;
  fundName: string;
  status: "active" | "draft" | "archived";
  headline: string;
  description?: string;
  settings: {
    // Donation Form & Campaign settings
    suggestedAmounts?: number[]; // in cents
    allowCustomAmount?: boolean;
    frequencies?: ("one_time" | "monthly")[];
    requiredFields?: string[];
    optionalFields?: string[];
    allowAnonymous?: boolean;
    allowCoverFees?: boolean;
    showGoal?: boolean;
    showTotalRaised?: boolean;
    showDonorCount?: boolean;
    showPublicSupporters?: boolean;
    thankYouMessage?: string;

    // Button settings
    buttonText?: string;
    connectedFormId?: string;
    buttonStyle?: "solid_gold" | "navy_outline" | "gold_gradient" | "minimal";
    buttonSize?: "sm" | "md" | "lg";
    fullWidth?: boolean;
    buttonIcon?: "heart" | "gift" | "shield" | "sparkles" | "none";
    buttonAction?: "modal" | "embedded" | "page";

    // Floating button settings
    screenPosition?: "bottom_right" | "bottom_left" | "middle_right";
    desktopEnabled?: boolean;
    mobileEnabled?: boolean;
    displayDelaySeconds?: number;
    displayScrollPercent?: number;

    // Progress bar & Goal settings
    goalAmountCents?: number;
    startDate?: string;
    endDate?: string;
    showPercentage?: boolean;
    shortMessage?: string;

    // Campaign page settings
    heroImageUrl?: string;
    storyContent?: string;
    impactMetrics?: { label: string; value: string; description?: string }[];

    // Supporter signup form settings
    interestOptions?: string[];
  };
  updatedAt: string;
  createdAt: string;
}

export let storedWebsiteTools: WebsiteTool[] = [
  {
    id: "tool-rise-thrive",
    slug: "rise-and-thrive",
    name: "Rise & Thrive Scholarship Campaign",
    type: "campaign_page",
    fundId: "fnd-1",
    fundName: "Advocacy Scholarship Fund",
    status: "active",
    headline: "Rise & Thrive: IEP Family Advocacy Scholarship Campaign",
    description:
      "Empower underserved Georgia children with professional Master IEP Coach® advocacy and specialized evaluations.",
    settings: {
      goalAmountCents: 5000000, // $50,000
      suggestedAmounts: [2500, 5000, 10500, 25000],
      allowCustomAmount: true,
      frequencies: ["one_time", "monthly"],
      requiredFields: ["name", "email"],
      optionalFields: ["phone", "address"],
      allowAnonymous: true,
      allowCoverFees: true,
      showGoal: true,
      showTotalRaised: true,
      showDonorCount: true,
      showPublicSupporters: true,
      thankYouMessage:
        "Your tax-deductible gift directly funds life-changing special education advocacy representation. Thank you for standing beside our children.",
      heroImageUrl: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80",
      storyContent:
        "Every child in Georgia deserves an individualized education plan that truly unlocks their potential. Far too often, low-income families and single parents face intimidating school district administrative teams alone.\n\nThe Rise & Thrive Scholarship Fund removes financial barriers by covering 100% of advocacy retainer costs, independent educational evaluations, and manifestation dispute hearings for families in need.",
      impactMetrics: [
        { label: "Families Subsidized", value: "34+", description: "Low-income students supported" },
        { label: "IEP Retention Rate", value: "100%", description: "Measurable service hour gains" },
        { label: "Independent Evaluations", value: "18", description: "Fully funded diagnostic reviews" },
      ],
    },
    updatedAt: "2026-09-10T14:30:00Z",
    createdAt: "2026-07-01T09:00:00Z",
  },
  {
    id: "tool-standard-form",
    slug: "give-standard",
    name: "Standard Waypoint Donation Form",
    type: "donation_form",
    fundId: "fnd-1",
    fundName: "Advocacy Scholarship Fund",
    status: "active",
    headline: "Support Special Education IEP Advocacy",
    description:
      "Your tax-deductible contribution supports scholarships for Georgia children with special education needs.",
    settings: {
      suggestedAmounts: [2500, 5000, 10000, 25000],
      allowCustomAmount: true,
      frequencies: ["one_time", "monthly"],
      requiredFields: ["name", "email"],
      optionalFields: ["phone", "organization"],
      allowAnonymous: true,
      allowCoverFees: true,
      showGoal: false,
      showTotalRaised: true,
      showDonorCount: false,
      showPublicSupporters: false,
      thankYouMessage: "Thank you for empowering Georgia students through specialized IEP advocacy!",
    },
    updatedAt: "2026-09-08T11:20:00Z",
    createdAt: "2026-07-05T10:00:00Z",
  },
  {
    id: "tool-primary-btn",
    slug: "donate-btn-nav",
    name: "Header Gold Donate Button",
    type: "donate_button",
    fundId: "fnd-1",
    fundName: "Advocacy Scholarship Fund",
    status: "active",
    headline: "Sponsor a Family Today",
    description: "Compact navigation bar CTA button triggering the donation modal.",
    settings: {
      buttonText: "Donate Now",
      connectedFormId: "tool-standard-form",
      buttonStyle: "solid_gold",
      buttonSize: "md",
      fullWidth: false,
      buttonIcon: "heart",
      buttonAction: "modal",
    },
    updatedAt: "2026-09-02T16:45:00Z",
    createdAt: "2026-07-10T12:00:00Z",
  },
  {
    id: "tool-floating-btn",
    slug: "floating-support",
    name: "Global Sticky Support Button",
    type: "floating_button",
    fundId: "fnd-2",
    fundName: "General Impact & Operations Fund",
    status: "active",
    headline: "Support Waypoint Giving",
    description: "Subtle bottom-right corner floating button appearing after 5 seconds of browsing.",
    settings: {
      buttonText: "Support Our Mission",
      connectedFormId: "tool-standard-form",
      screenPosition: "bottom_right",
      desktopEnabled: true,
      mobileEnabled: true,
      displayDelaySeconds: 4,
      displayScrollPercent: 15,
      buttonIcon: "gift",
      buttonAction: "modal",
    },
    updatedAt: "2026-08-28T09:15:00Z",
    createdAt: "2026-07-15T08:30:00Z",
  },
  {
    id: "tool-progress-widget",
    slug: "scholarship-meter",
    name: "Scholarship Fund Progress Bar",
    type: "progress_bar",
    fundId: "fnd-1",
    fundName: "Advocacy Scholarship Fund",
    status: "active",
    headline: "2026 IEP Advocacy Scholarship Progress",
    description: "Visual live progress bar connected dynamically to real donation records.",
    settings: {
      goalAmountCents: 5000000, // $50,000
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      showPercentage: true,
      showGoal: true,
      showTotalRaised: true,
      showDonorCount: true,
      shortMessage: "Help us fund 50 family advocacy grants this school year!",
    },
    updatedAt: "2026-09-01T10:00:00Z",
    createdAt: "2026-07-20T14:00:00Z",
  },
  {
    id: "tool-supporter-signup",
    slug: "join-supporters",
    name: "Community Supporter & Partner Signup",
    type: "supporter_signup",
    fundId: "fnd-2",
    fundName: "General Impact & Operations Fund",
    status: "active",
    headline: "Join Waypoint Community Supporters",
    description: "Engage individuals, advocates, and companies wishing to volunteer or partner.",
    settings: {
      interestOptions: [
        "Advocacy Scholarship Support",
        "Corporate Sponsorship",
        "Volunteer & Mentor",
        "Host an IEP Rights Workshop",
        "General Updates & Newsletter",
      ],
      thankYouMessage:
        "Welcome to the Waypoint Advocates community! Our team will reach out with upcoming advocacy initiatives and impact stories.",
    },
    updatedAt: "2026-08-25T13:40:00Z",
    createdAt: "2026-07-22T11:00:00Z",
  },
];

// ── Helper: Compute Dynamic Totals for Website Tool from Real Donations ──
export function enrichWebsiteTool(tool: WebsiteTool) {
  // Find all donations matching this toolId OR matching this fund
  const matchingDonations = storedDonations.filter(
    (d) => d.toolId === tool.id || (tool.fundId && d.fundId === tool.fundId)
  );

  const amountRaisedCents = matchingDonations.reduce((sum, d) => sum + d.amountCents, 0);
  const donationsCount = matchingDonations.length;

  return {
    ...tool,
    donationsGeneratedCount: donationsCount,
    amountRaisedCents: amountRaisedCents,
  };
}

// ── Public & Admin Services for Giving & Website Tools ──
export async function getWebsiteToolsList(typeFilter?: string, statusFilter?: string, search?: string) {
  let tools = storedWebsiteTools.map((t) => enrichWebsiteTool(t));

  if (typeFilter && typeFilter !== "all") {
    tools = tools.filter((t) => t.type === typeFilter);
  }

  if (statusFilter && statusFilter !== "all") {
    tools = tools.filter((t) => t.status === statusFilter);
  }

  if (search) {
    const q = search.toLowerCase();
    tools = tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.headline.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.fundName.toLowerCase().includes(q)
    );
  }

  return tools;
}

export async function getWebsiteToolByIdOrSlug(idOrSlug: string) {
  const tool = storedWebsiteTools.find((t) => t.id === idOrSlug || t.slug === idOrSlug);
  if (!tool) return null;
  return enrichWebsiteTool(tool);
}

export async function createWebsiteToolRecord(data: Omit<WebsiteTool, "id" | "updatedAt" | "createdAt" | "fundName"> & { fundName?: string }) {
  const id = `tool-${Date.now()}`;
  const now = new Date().toISOString();
  const fund = storedFunds.find((f) => f.id === data.fundId) || storedFunds[0];

  const newTool: WebsiteTool = {
    ...data,
    id,
    fundName: fund.name,
    updatedAt: now,
    createdAt: now,
  };

  storedWebsiteTools.unshift(newTool);
  return enrichWebsiteTool(newTool);
}

export async function updateWebsiteToolRecord(id: string, updates: Partial<WebsiteTool>) {
  const index = storedWebsiteTools.findIndex((t) => t.id === id);
  if (index === -1) throw new Error(`Website tool with id ${id} not found`);

  const current = storedWebsiteTools[index];
  let fundName = current.fundName;
  if (updates.fundId && updates.fundId !== current.fundId) {
    const fund = storedFunds.find((f) => f.id === updates.fundId);
    if (fund) fundName = fund.name;
  }

  storedWebsiteTools[index] = {
    ...current,
    ...updates,
    fundName,
    settings: {
      ...current.settings,
      ...(updates.settings || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  return enrichWebsiteTool(storedWebsiteTools[index]);
}

export async function deleteWebsiteToolRecord(id: string) {
  storedWebsiteTools = storedWebsiteTools.filter((t) => t.id !== id);
  return { success: true };
}

export async function processPublicDonationTransaction(input: {
  toolId?: string;
  fundId?: string;
  amountCents: number;
  frequency?: "one_time" | "monthly";
  coverFees?: boolean;
  anonymous?: boolean;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  donorAddress?: string;
  donorOrganization?: string;
  notes?: string;
  paymentMethod?: string;
}) {
  const targetFundId = input.fundId || "fnd-1";
  const fund = storedFunds.find((f) => f.id === targetFundId) || storedFunds[0];

  // 1. Check or create Supporter (avoid duplicate by email)
  let supporter = storedSupporters.find((s) => s.email?.toLowerCase() === input.donorEmail.toLowerCase());
  const nowIso = new Date().toISOString();

  if (!supporter) {
    supporter = {
      id: `sup-${Date.now()}`,
      name: input.donorName,
      entityType: input.donorOrganization ? "organization" : "individual",
      supporterType: input.frequency === "monthly" ? "Recurring Donor" : "One-Time Donor",
      email: input.donorEmail,
      phone: input.donorPhone || "",
      lifetimeGivingCents: input.amountCents,
      donationCount: 1,
      lastGiftDate: nowIso,
      status: "active",
      notes: input.donorOrganization ? `Organization: ${input.donorOrganization}` : undefined,
    };
    storedSupporters.unshift(supporter);
  } else {
    supporter.lifetimeGivingCents += input.amountCents;
    supporter.donationCount += 1;
    supporter.lastGiftDate = nowIso;
    if (input.frequency === "monthly") {
      supporter.supporterType = "Recurring Donor";
    }
  }

  // 2. Generate Receipt Number
  const receiptNumber = `REC-2026-${String(storedDonations.length + 101).padStart(4, "0")}`;

  // 3. Create Donation record
  const newDonation: StoredDonation = {
    id: `don-${Date.now()}`,
    donorName: input.donorName,
    donorEmail: input.donorEmail,
    donorPhone: input.donorPhone,
    donorAddress: input.donorAddress,
    donorOrganization: input.donorOrganization,
    amountCents: input.amountCents,
    fundId: fund.id,
    fundName: fund.name,
    paymentMethod: input.paymentMethod || "Stripe (Card)",
    frequency: input.frequency || "one_time",
    coverFees: !!input.coverFees,
    anonymous: !!input.anonymous,
    taxDeductible: true,
    receiptNumber,
    receiptStatus: "Ready",
    donatedAt: nowIso,
    notes: input.notes,
    toolId: input.toolId,
  };

  storedDonations.unshift(newDonation);

  // 4. Update Fund balance
  fund.currentBalance += input.amountCents;

  // 5. Try syncing to D1 database if connected
  try {
    const db = await getDb();
    if (db) {
      await db.insert(sponsors).values({
        ownerId: 1,
        type: input.donorOrganization ? "sponsor" : "gift",
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        donorPhone: input.donorPhone || null,
        amount: input.amountCents,
        notes: input.notes || `Web Donation via ${fund.name}`,
        status: "acknowledged",
        donatedAt: new Date(),
      });
    }
  } catch (e) {
    console.warn("Could not insert public donation into D1 sponsors table:", e);
  }

  return {
    success: true,
    donation: newDonation,
    receiptNumber,
    fundName: fund.name,
    charitableText: storedOrgSettings.taxDeductibleText,
    acknowledgment: storedOrgSettings.defaultAcknowledgment,
    signer: storedOrgSettings.authorizedSigner,
  };
}

export async function processSupporterSignupSubmission(input: {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  areasOfInterest?: string[];
  notes?: string;
}) {
  const existing = storedSupporters.find((s) => s.email?.toLowerCase() === input.email.toLowerCase());
  const nowIso = new Date().toISOString();

  if (existing) {
    existing.phone = input.phone || existing.phone;
    existing.areasOfInterest = Array.from(
      new Set([...(existing.areasOfInterest || []), ...(input.areasOfInterest || [])])
    );
    if (input.organization) {
      existing.notes = `Org: ${input.organization}. ${existing.notes || ""}`.trim();
    }
    return { success: true, isNew: false, supporter: existing };
  }

  const newSupporter: StoredSupporter = {
    id: `sup-${Date.now()}`,
    name: input.name,
    entityType: input.organization ? "organization" : "individual",
    supporterType: "Community Supporter",
    email: input.email,
    phone: input.phone || "",
    lifetimeGivingCents: 0,
    donationCount: 0,
    lastGiftDate: nowIso,
    status: "active",
    areasOfInterest: input.areasOfInterest || [],
    notes: input.organization ? `Organization: ${input.organization}` : input.notes,
  };

  storedSupporters.unshift(newSupporter);
  return { success: true, isNew: true, supporter: newSupporter };
}
