import { describe, it, expect, beforeEach } from "vitest";
import {
  extractIepFieldsHeuristic,
  syncIepToStudentProfile,
  applyConfirmedIepUpdates,
  dismissIepUpdates,
  getPendingIepUpdates,
  inMemoryPendingIepUpdates,
} from "./services/iepExtractionService";
import { inMemoryContacts } from "./db/contacts";

describe("IEP Extraction & Smart Hybrid Profile Sync", () => {
  beforeEach(() => {
    inMemoryPendingIepUpdates.clear();
    inMemoryContacts.clear();
  });

  const sampleIepText = `
GEORGIA DEPARTMENT OF EDUCATION
INDIVIDUALIZED EDUCATION PROGRAM (IEP)

STUDENT IDENTIFYING INFORMATION:
Student Name: Tyler Robinson
Date of Birth: 04/12/2015
Grade: 5th Grade
Attending School: Manning Oaks Elementary
School District: Fulton County Schools
Primary Disability: Autism (AUT)
Medical Diagnoses: ADHD, Sensory Processing Disorder
Plan Type: IEP
Meeting Date: 10/14/2026
Case Manager: Sarah Jenkins
`;

  it("extracts core student demographic and eligibility fields via heuristic parser", () => {
    const extracted = extractIepFieldsHeuristic(sampleIepText);

    expect(extracted.dateOfBirth).toBe("04/12/2015");
    expect(extracted.calculatedAge).toBeGreaterThanOrEqual(10);
    expect(extracted.gradeLevel).toBe("5th Grade");
    expect(extracted.schoolName).toBe("Manning Oaks Elementary");
    expect(extracted.countyDistrict).toBe("Fulton County Schools");
    expect(extracted.iepEligibility).toContain("Autism");
    expect(extracted.medicalDiagnoses).toContain("ADHD");
    expect(extracted.planType).toBe("IEP");
  });

  it("performs Smart Hybrid sync: auto-applies empty fields and queues conflicts for review", async () => {
    // Setup student in memory with some existing fields and some empty fields
    const mockStudent = {
      id: 999,
      firstName: "Tyler",
      lastName: "Robinson",
      gradeLevel: "4th Grade", // CONFLICT: 4th Grade in profile vs 5th Grade in IEP
      schoolName: "", // EMPTY: Should be auto-applied
      dateOfBirth: "", // EMPTY: Should be auto-applied
      countyDistrict: "Fulton County Schools", // MATCH: No change needed
      iepEligibility: "Other Health Impairment", // CONFLICT: OHI in profile vs Autism in IEP
      medicalDiagnoses: "", // EMPTY: Should be auto-applied
    };
    inMemoryContacts.set(999, mockStudent);

    const result = await syncIepToStudentProfile({
      contactId: 999,
      extractedText: sampleIepText,
      sourceDocument: "Tyler-IEP-2026.pdf",
    });

    // 1. Empty fields were auto-applied
    const autoFields = result.autoApplied.map((a) => a.field);
    expect(autoFields).toContain("schoolName");
    expect(autoFields).toContain("dateOfBirth");
    expect(autoFields).toContain("medicalDiagnoses");

    // 2. Conflicting fields are held for review
    const pendingFields = result.pendingReview.map((p) => p.field);
    expect(pendingFields).toContain("gradeLevel");
    expect(pendingFields).toContain("iepEligibility");

    // Verify grade conflict details
    const gradeConflict = result.pendingReview.find((p) => p.field === "gradeLevel");
    expect(gradeConflict?.currentValue).toBe("4th Grade");
    expect(gradeConflict?.extractedValue).toBe("5th Grade");

    // 3. Pending queue is retrievable
    const pending = getPendingIepUpdates(999);
    expect(pending).not.toBeNull();
    expect(pending?.fields.length).toBe(2);
  });

  it("allows advocate to apply confirmed updates and clears pending queue", async () => {
    inMemoryPendingIepUpdates.set(999, {
      extractedAt: new Date().toISOString(),
      sourceDocument: "Tyler-IEP-2026.pdf",
      fields: [
        {
          field: "gradeLevel",
          label: "Grade Level",
          currentValue: "4th Grade",
          extractedValue: "5th Grade",
        },
      ],
    });

    const updateRes = await applyConfirmedIepUpdates({
      contactId: 999,
      acceptedFields: { gradeLevel: "5th Grade" },
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.updatedCount).toBe(1);

    // Queue is cleared
    expect(getPendingIepUpdates(999)).toBeNull();
  });

  it("allows advocate to dismiss pending updates without modifying profile", () => {
    inMemoryPendingIepUpdates.set(999, {
      extractedAt: new Date().toISOString(),
      sourceDocument: "Tyler-IEP-2026.pdf",
      fields: [
        {
          field: "gradeLevel",
          label: "Grade Level",
          currentValue: "4th Grade",
          extractedValue: "5th Grade",
        },
      ],
    });

    const dismissed = dismissIepUpdates(999);
    expect(dismissed).toBe(true);
    expect(getPendingIepUpdates(999)).toBeNull();
  });

  it("extracts school district across varied IEP formats (System, LEA, School District, County)", () => {
    const text1 = "System: Paulding County\nSchool: Connie Dugan Elementary\nGrade: 5th";
    expect(extractIepFieldsHeuristic(text1).countyDistrict).toBe("Paulding County");

    const text2 = "Local Educational Agency: Atlanta Public Schools\nGrade: 3rd";
    expect(extractIepFieldsHeuristic(text2).countyDistrict).toBe("Atlanta Public Schools");

    const text3 = "School District: Cobb County School District\nEligibility: Autism";
    expect(extractIepFieldsHeuristic(text3).countyDistrict).toBe("Cobb County School District");

    const text4 = "Student attends Connie Dugan Elementary in Paulding County.";
    expect(extractIepFieldsHeuristic(text4).countyDistrict).toBe("Paulding County School District");
  });

  it("auto-populates empty countyDistrict during Smart Hybrid sync", async () => {
    const mockStudent = {
      id: 1001,
      firstName: "Brooklyn",
      lastName: "Smith",
      countyDistrict: "", // EMPTY
      gradeLevel: "5th Grade",
    };
    inMemoryContacts.set(1001, mockStudent);

    const iepText = `
      STUDENT: Brooklyn Smith
      System: Paulding County School District
      School: Connie Dugan Elementary
      Grade: 5th Grade
    `;

    const result = await syncIepToStudentProfile({
      contactId: 1001,
      extractedText: iepText,
      sourceDocument: "Brooklyn-IEP.pdf",
    });

    const appliedFields = result.autoApplied.map(a => a.field);
    expect(appliedFields).toContain("countyDistrict");
    const districtUpdate = result.autoApplied.find(a => a.field === "countyDistrict");
    expect(districtUpdate?.value).toBe("Paulding County School District");
  });
});

