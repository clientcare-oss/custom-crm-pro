import { describe, it, expect } from "vitest";
import {
  containsProhibitedComplaintTerms,
  sanitizeComplaintText,
  formatFirstLastName,
  isFirstLastNameOnly,
  PROHIBITED_COMPLAINT_TERMS_REGEX,
} from "../shared/complaintEngine";
import { buildReadinessReport } from "./complaintValidation";

describe("State Complaint Terminology Guardrail (AGENTS.md Rule F & IDEA / GaDOE Standards)", () => {
  describe("containsProhibitedComplaintTerms", () => {
    it("detects variants of Master IEP Coach / Master Coach / IEP Coach", () => {
      expect(containsProhibitedComplaintTerms("Master IEP Coach")).toBe(true);
      expect(containsProhibitedComplaintTerms("master iep coach")).toBe(true);
      expect(containsProhibitedComplaintTerms("MASTER COACH")).toBe(true);
      expect(containsProhibitedComplaintTerms("Byron Honea, Master IEP Coach")).toBe(true);
      expect(containsProhibitedComplaintTerms("Represented by an IEP Coach")).toBe(true);
      expect(containsProhibitedComplaintTerms("Master IEP Coaching Services")).toBe(true);
    });

    it("returns false for compliant advocate and special education terminology", () => {
      expect(containsProhibitedComplaintTerms("Lead Special Education Advocate")).toBe(false);
      expect(containsProhibitedComplaintTerms("Special Education Advocate")).toBe(false);
      expect(containsProhibitedComplaintTerms("Byron Honea, Lead Special Education Advocate")).toBe(false);
      expect(containsProhibitedComplaintTerms("Authorized Representative / Advocate")).toBe(false);
      expect(containsProhibitedComplaintTerms("Parent of student with autism")).toBe(false);
      expect(containsProhibitedComplaintTerms(null)).toBe(false);
      expect(containsProhibitedComplaintTerms(undefined)).toBe(false);
    });
  });

  describe("sanitizeComplaintText", () => {
    it("converts Master IEP Coach to Lead Special Education Advocate", () => {
      expect(sanitizeComplaintText("Byron Honea, Master IEP Coach")).toBe("Byron Honea, Lead Special Education Advocate");
      expect(sanitizeComplaintText("Filing as master iep coach for complainant")).toBe("Filing as Lead Special Education Advocate for complainant");
      expect(sanitizeComplaintText("Master Coach Byron Honea")).toBe("Lead Special Education Advocate Byron Honea");
    });

    it("converts IEP Coach to Special Education Advocate", () => {
      expect(sanitizeComplaintText("Services provided by an IEP Coach")).toBe("Services provided by an Special Education Advocate");
    });

    it("handles null and empty input gracefully", () => {
      expect(sanitizeComplaintText("")).toBe("");
      expect(sanitizeComplaintText(null)).toBe("");
      expect(sanitizeComplaintText(undefined)).toBe("");
    });
  });

  describe("formatFirstLastName (Name of Complainant Area)", () => {
    it("strips trailing comma-separated titles and roles", () => {
      expect(formatFirstLastName("Byron Honea, Lead Special Education Advocate")).toBe("Byron Honea");
      expect(formatFirstLastName("Byron Honea, Advocate")).toBe("Byron Honea");
      expect(formatFirstLastName("Marcus Santiago, Parent")).toBe("Marcus Santiago");
    });

    it("strips hyphenated titles and parenthetical annotations", () => {
      expect(formatFirstLastName("Byron Honea - Advocate")).toBe("Byron Honea");
      expect(formatFirstLastName("Byron Honea (Special Education Advocate)")).toBe("Byron Honea");
    });

    it("replaces organizational name with practice owner name", () => {
      expect(formatFirstLastName("Waypoint Advocates")).toBe("Byron Honea");
      expect(formatFirstLastName("waypoint advocate")).toBe("Byron Honea");
    });

    it("strips honorific prefixes and credential suffixes", () => {
      expect(formatFirstLastName("Mr. Byron Honea")).toBe("Byron Honea");
      expect(formatFirstLastName("Dr. Jane Doe")).toBe("Jane Doe");
      expect(formatFirstLastName("John Doe Esq.")).toBe("John Doe");
      expect(formatFirstLastName("Jane Smith BCBA")).toBe("Jane Smith");
    });

    it("preserves clean first and last names", () => {
      expect(formatFirstLastName("Byron Honea")).toBe("Byron Honea");
      expect(formatFirstLastName("Marcus Santiago")).toBe("Marcus Santiago");
      expect(formatFirstLastName("Mary Ann Higgins")).toBe("Mary Ann Higgins");
    });

    it("handles empty or null values gracefully", () => {
      expect(formatFirstLastName("")).toBe("");
      expect(formatFirstLastName(null)).toBe("");
      expect(formatFirstLastName(undefined)).toBe("");
    });
  });

  describe("isFirstLastNameOnly", () => {
    it("returns true for clean first and last names", () => {
      expect(isFirstLastNameOnly("Byron Honea")).toBe(true);
      expect(isFirstLastNameOnly("Marcus Santiago")).toBe(true);
      expect(isFirstLastNameOnly("Mary Jane Watson")).toBe(true);
    });

    it("returns false if title, role words, or punctuation are present", () => {
      expect(isFirstLastNameOnly("Byron Honea, Lead Special Education Advocate")).toBe(false);
      expect(isFirstLastNameOnly("Byron Honea - Advocate")).toBe(false);
      expect(isFirstLastNameOnly("Byron Honea (Advocate)")).toBe(false);
      expect(isFirstLastNameOnly("Byron Honea Advocate")).toBe(false);
      expect(isFirstLastNameOnly("Coach Byron")).toBe(false);
      expect(isFirstLastNameOnly("Waypoint Advocates")).toBe(false);
      expect(isFirstLastNameOnly("Byron")).toBe(false);
      expect(isFirstLastNameOnly("")).toBe(false);
      expect(isFirstLastNameOnly(null)).toBe(false);
    });
  });

  describe("buildReadinessReport validation check", () => {
    const baseCase: any = {
      id: 1,
      caseId: "SC-2026-001",
      complainantName: "Byron Honea",
      complainantRelationship: "Lead Special Education Advocate",
      complainantAddress: "PO Box 724944, Atlanta, GA 31139",
      complainantPhone: "(404) 919-8664",
      complainantEmail: "advocate@waypointadvocates.com",
      studentName: "Elijah Santiago",
      studentDob: new Date("2010-05-18"),
      studentAddress: "123 Peachtree St, Atlanta, GA",
      studentSchool: "Midtown High School",
      agencyName: "Atlanta Public Schools",
      studentGtid: "9001234567",
      parentDifferent: false,
      signatureName: "Byron Honea",
      signatureDate: new Date(),
      mediationRequested: "yes",
      districtCopyDelivered: true,
      districtCopyRecipient: "Superintendent",
      districtCopyDate: new Date(),
      districtCopyMethod: "certified_mail",
      confirmedAccuracy: true,
    };

    const baseAllegation: any = {
      id: 101,
      seqNumber: 1,
      plainTitle: "Failure to implement IEP specialized reading instruction",
      formalTitle: "Failure to implement IEP reading services under 34 CFR 300.323",
      status: "accepted",
      requiredElements: [{ text: "IEP mandated reading", met: true }],
      districtNotice: "Written notice sent Oct 12",
      draftStatement: "The district failed to deliver 150 minutes of reading instruction.",
      draftFacts: "Between November and January, 18 sessions were missed without makeup.",
    };

    it("passes readiness check when all titles and complainant name are compliant", () => {
      const report = buildReadinessReport({
        c: baseCase,
        allegations: [baseAllegation],
        timeline: [{ id: 1, eventDate: new Date(), title: "IEP meeting", details: "Convened", linkedAllegationIds: [101] } as any],
        evidenceLinks: [{ id: 1, evidenceItemId: 1, targetType: "allegation", targetId: 101 } as any],
        evidenceCount: 1,
        remedies: [{ id: 1, accepted: true, title: "Compensatory tutoring" } as any],
        draftSections: ["parties", "public_agency", "jurisdiction", "violations", "facts", "impact", "resolution", "mediation", "signature", "district_copy"],
      });

      const termCheck = report.categories
        .find(c => c.key === "writing_review")
        ?.items.find(i => i.key === "prohibited_terms");

      expect(termCheck).toBeDefined();
      expect(termCheck?.status).toBe("ok");

      const compNameCheck = report.categories
        .find(c => c.key === "required_information")
        ?.items.find(i => i.key === "complainant_name");

      expect(compNameCheck).toBeDefined();
      expect(compNameCheck?.status).toBe("ok");
    });

    it("issues a warning when complainant name contains title/suffix instead of first and last name only", () => {
      const caseWithTitleInName = {
        ...baseCase,
        complainantName: "Byron Honea, Lead Special Education Advocate",
      };

      const report = buildReadinessReport({
        c: caseWithTitleInName,
        allegations: [baseAllegation],
        timeline: [{ id: 1, eventDate: new Date(), title: "IEP meeting", details: "Convened", linkedAllegationIds: [101] } as any],
        evidenceLinks: [{ id: 1, evidenceItemId: 1, targetType: "allegation", targetId: 101 } as any],
        evidenceCount: 1,
        remedies: [{ id: 1, accepted: true, title: "Compensatory tutoring" } as any],
        draftSections: ["parties"],
      });

      const compNameCheck = report.categories
        .find(c => c.key === "required_information")
        ?.items.find(i => i.key === "complainant_name");

      expect(compNameCheck).toBeDefined();
      expect(compNameCheck?.status).toBe("warning");
      expect(compNameCheck?.detail).toContain("State agency rule: Name of Complainant must only be first and last name");
    });

    it("flags an error when prohibited title 'Master IEP Coach' is used in case fields", () => {
      const prohibitedCase = {
        ...baseCase,
        complainantRelationship: "Authorized Master IEP Coach",
      };

      const report = buildReadinessReport({
        c: prohibitedCase,
        allegations: [baseAllegation],
        timeline: [{ id: 1, eventDate: new Date(), title: "IEP meeting", details: "Convened", linkedAllegationIds: [101] } as any],
        evidenceLinks: [{ id: 1, evidenceItemId: 1, targetType: "allegation", targetId: 101 } as any],
        evidenceCount: 1,
        remedies: [{ id: 1, accepted: true, title: "Compensatory tutoring" } as any],
        draftSections: ["parties"],
      });

      const termCheck = report.categories
        .find(c => c.key === "writing_review")
        ?.items.find(i => i.key === "prohibited_terms");

      expect(termCheck).toBeDefined();
      expect(termCheck?.status).toBe("error");
      expect(termCheck?.detail).toContain("Prohibited term");
    });
  });
});
