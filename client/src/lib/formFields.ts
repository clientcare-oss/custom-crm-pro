/**
 * Shared lead form field definitions & Custom Question Builder schema.
 * Imported by DynamicForm, LeadFormModal, LeadFormsBuilderStudio, and LeadFormsStudioWidgets.
 */
export const ALL_FIELDS = [
  // Step 1 — Parent Info
  { key: "parentFirstName",   label: "Parent First Name",         step: 1, required: true,  type: "text",     placeholder: "Jane" },
  { key: "parentLastName",    label: "Parent Last Name",          step: 1, required: true,  type: "text",     placeholder: "Smith" },
  { key: "parentEmail",       label: "Parent Email",              step: 1, required: true,  type: "email",    placeholder: "jane@example.com" },
  { key: "parentPhone",       label: "Parent Phone",              step: 1, required: true,  type: "phone",    placeholder: "(404) 555-0199" },
  { key: "timezone",          label: "Timezone",                  step: 1, required: false, type: "select",   placeholder: "Select timezone" },
  { key: "bestTimeToCall",    label: "Best Time to Call",         step: 1, required: false, type: "text",     placeholder: "Mornings, Afternoons..." },
  { key: "secondParent",      label: "Second Parent / Guardian",  step: 1, required: false, type: "group",    placeholder: "Second parent contact info" },
  { key: "howHeardAboutUs",   label: "How Did You Hear About Us", step: 1, required: false, type: "select",   placeholder: "Select an option" },
  // Step 2 — Student Info
  { key: "studentFirstName",  label: "Student First Name",        step: 2, required: true,  type: "text",     placeholder: "Alex" },
  { key: "studentLastName",   label: "Student Last Name",         step: 2, required: true,  type: "text",     placeholder: "Smith" },
  { key: "dateOfBirth",       label: "Date of Birth",             step: 2, required: false, type: "date",     placeholder: "YYYY-MM-DD" },
  { key: "gradeLevel",        label: "Grade Level",               step: 2, required: false, type: "select",   placeholder: "Select grade" },
  { key: "diagnosis",         label: "Diagnosis / Disability",    step: 2, required: false, type: "text",     placeholder: "e.g., Autism, ADHD, Dyslexia" },
  { key: "schoolName",        label: "School Name",               step: 2, required: false, type: "text",     placeholder: "Lincoln Elementary School" },
  { key: "countyDistrict",    label: "County / School District",  step: 2, required: false, type: "text",     placeholder: "e.g., Fulton County Schools" },
  { key: "cityStateZip",      label: "City / State / ZIP",        step: 2, required: false, type: "address",  placeholder: "Atlanta, GA 30301" },
  // Step 3 — Challenges
  { key: "challenges",        label: "Challenges & Concerns",     step: 3, required: false, type: "textarea", placeholder: "Describe the 3 biggest challenges your child is facing at school..." },
] as const;

export type FieldKey = typeof ALL_FIELDS[number]["key"];

/** Default: all fields enabled */
export const DEFAULT_FIELDS: FieldKey[] = ALL_FIELDS.map((f) => f.key);

export type CustomQuestionType =
  | "short_text"
  | "long_text"
  | "dropdown"
  | "checkboxes"
  | "yes_no"
  | "date"
  | "phone";

export interface CustomFormQuestion {
  id: string;
  label: string;
  type: CustomQuestionType;
  step: 1 | 2 | 3;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // For dropdown or checkboxes
}

export interface ParsedCustomLabelsAndQuestions {
  labels: Record<string, string>;
  placeholders: Record<string, string>;
  stepTitles: {
    step1?: string;
    step2?: string;
    step3?: string;
    step4?: string;
  };
  customQuestions: CustomFormQuestion[];
}

/**
 * Safely parses `customLabels` JSON column from `lead_forms` into both custom label overrides
 * AND custom builder questions without requiring any breaking schema migration.
 */
export function parseFormBuilderConfig(
  rawCustomLabels: string | null | undefined
): ParsedCustomLabelsAndQuestions {
  const empty: ParsedCustomLabelsAndQuestions = {
    labels: {},
    placeholders: {},
    stepTitles: {},
    customQuestions: [],
  };
  if (!rawCustomLabels) return empty;
  try {
    const parsed =
      typeof rawCustomLabels === "string"
        ? JSON.parse(rawCustomLabels)
        : rawCustomLabels;
    if (!parsed || typeof parsed !== "object") return empty;

    const labels: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (
        k !== "__customQuestions" &&
        k !== "__placeholders" &&
        k !== "__stepTitles" &&
        typeof v === "string"
      ) {
        labels[k] = v;
      }
    }

    const placeholders =
      parsed.__placeholders && typeof parsed.__placeholders === "object"
        ? (parsed.__placeholders as Record<string, string>)
        : {};

    const stepTitles =
      parsed.__stepTitles && typeof parsed.__stepTitles === "object"
        ? (parsed.__stepTitles as ParsedCustomLabelsAndQuestions["stepTitles"])
        : {};

    const customQuestions = Array.isArray(parsed.__customQuestions)
      ? (parsed.__customQuestions as CustomFormQuestion[])
      : [];

    return {
      labels,
      placeholders,
      stepTitles,
      customQuestions,
    };
  } catch {
    return empty;
  }
}

export function serializeFormBuilderConfig(
  config: ParsedCustomLabelsAndQuestions
): string {
  const payload: Record<string, any> = {
    ...config.labels,
  };
  if (Object.keys(config.placeholders || {}).length > 0) {
    payload.__placeholders = config.placeholders;
  }
  if (Object.keys(config.stepTitles || {}).length > 0) {
    payload.__stepTitles = config.stepTitles;
  }
  if (Array.isArray(config.customQuestions) && config.customQuestions.length > 0) {
    payload.__customQuestions = config.customQuestions;
  }
  return JSON.stringify(payload);
}
