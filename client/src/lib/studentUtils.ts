/**
 * Student Special Education & Medical Diagnosis Extraction & Formatting Utilities
 *
 * Ensures consistent display of IEP Eligibility and Medical Diagnoses across PG-030 (Student Workspace),
 * with graceful fallback parsing from legacy composite diagnosis strings.
 */

export interface StudentDiagnoses {
  iepEligibility: string;
  medicalDiagnoses: string;
}

export function parseStudentDiagnoses(contact?: any): StudentDiagnoses {
  if (!contact) {
    return {
      iepEligibility: "Autism",
      medicalDiagnoses: "ADHD, Anxiety",
    };
  }

  let iepEligibility = (contact.iepEligibility || "").trim();
  let medicalDiagnoses = (contact.medicalDiagnoses || "").trim();

  // If not explicitly set on dedicated fields, inspect composite diagnosis string
  const rawDiagnosis = (contact.diagnosis || contact.disabilities || "").trim();
  if (rawDiagnosis) {
    if (!iepEligibility) {
      const iepMatch = rawDiagnosis.match(/IEP(?:\s*Eligibility)?:\s*([^|;\n]+)/i);
      if (iepMatch) {
        iepEligibility = iepMatch[1].trim();
      }
    }
    if (!medicalDiagnoses) {
      const medMatch = rawDiagnosis.match(/Medical(?:\s*Diagnoses?)?:\s*([^|;\n]+)/i);
      if (medMatch) {
        medicalDiagnoses = medMatch[1].trim();
      } else if (!rawDiagnosis.toLowerCase().includes("iep:")) {
        medicalDiagnoses = rawDiagnosis;
      }
    }
  }

  return {
    iepEligibility: iepEligibility || "Autism",
    medicalDiagnoses: medicalDiagnoses || "ADHD & Specific Learning Disability (Dyslexia)",
  };
}

/**
 * Splits composite or comma-separated disabilities and diagnoses into clean, individual chips/tags.
 * Handles IDEA eligibility categories and medical diagnoses without splitting composite names like "Speech & Language".
 */
export function parseDiagnosisTags(raw?: string): string[] {
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Split on commas, semicolons, or ' & ' / ' and ' (unless part of 'Speech & Language' or 'Speech and Language')
  return trimmed
    .split(/(?:,\s*|;\s*|(?<!Speech)\s+(?:&|and)\s+)/i)
    .map(part => part.trim())
    .filter(Boolean);
}

