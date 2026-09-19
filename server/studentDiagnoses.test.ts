import { describe, it, expect } from "vitest";
import { parseStudentDiagnoses, parseDiagnosisTags } from "../client/src/lib/studentUtils";

describe("Student Diagnoses Parsing and Formatting", () => {
  describe("parseDiagnosisTags", () => {
    it("splits comma and ampersand separated diagnoses without single-word wrapping", () => {
      const input = "Autism, ADHD & Specific Learning Disability (Dyslexia)";
      const tags = parseDiagnosisTags(input);
      expect(tags).toEqual([
        "Autism",
        "ADHD",
        "Specific Learning Disability (Dyslexia)",
      ]);
    });

    it("does not split composite names like 'Speech & Language Impairment'", () => {
      const input = "Speech & Language Impairment, Autism";
      const tags = parseDiagnosisTags(input);
      expect(tags).toEqual([
        "Speech & Language Impairment",
        "Autism",
      ]);
    });

    it("handles single diagnosis strings", () => {
      expect(parseDiagnosisTags("Autism Spectrum Disorder")).toEqual([
        "Autism Spectrum Disorder",
      ]);
      expect(parseDiagnosisTags("Other Health Impairment (OHI)")).toEqual([
        "Other Health Impairment (OHI)",
      ]);
    });

    it("returns empty array for empty or missing input", () => {
      expect(parseDiagnosisTags("")).toEqual([]);
      expect(parseDiagnosisTags(undefined)).toEqual([]);
    });
  });

  describe("parseStudentDiagnoses", () => {
    it("accurately keeps composite diagnosis string under medical diagnoses with default eligibility", () => {
      const contact = {
        diagnosis: "ADHD & Specific Learning Disability (Dyslexia)",
      };
      const result = parseStudentDiagnoses(contact);
      expect(result.iepEligibility).toBe("Autism");
      expect(result.medicalDiagnoses).toBe("ADHD & Specific Learning Disability (Dyslexia)");
    });

    it("respects explicit IEP and Medical prefixes", () => {
      const contact = {
        diagnosis: "IEP: Autism | Medical: ADHD, Anxiety",
      };
      const result = parseStudentDiagnoses(contact);
      expect(result.iepEligibility).toBe("Autism");
      expect(result.medicalDiagnoses).toBe("ADHD, Anxiety");
    });

    it("preserves explicitly defined dedicated contact fields", () => {
      const contact = {
        iepEligibility: "Specific Learning Disability",
        medicalDiagnoses: "Anxiety",
      };
      const result = parseStudentDiagnoses(contact);
      expect(result.iepEligibility).toBe("Specific Learning Disability");
      expect(result.medicalDiagnoses).toBe("Anxiety");
    });
  });
});
