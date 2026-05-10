/**
 * Shared lead form field definitions.
 * Imported by both DynamicForm and LeadFormModal.
 */
export const ALL_FIELDS = [
  // Step 1 — Parent Info
  { key: "parentFirstName",   label: "Parent First Name",         step: 1, required: true },
  { key: "parentLastName",    label: "Parent Last Name",          step: 1, required: true },
  { key: "parentEmail",       label: "Parent Email",              step: 1, required: true },
  { key: "parentPhone",       label: "Parent Phone",              step: 1, required: true },
  { key: "timezone",          label: "Timezone",                  step: 1, required: false },
  { key: "bestTimeToCall",    label: "Best Time to Call",         step: 1, required: false },
  { key: "secondParent",      label: "Second Parent / Guardian",  step: 1, required: false },
  { key: "howHeardAboutUs",   label: "How Did You Hear About Us", step: 1, required: false },
  // Step 2 — Student Info
  { key: "studentFirstName",  label: "Student First Name",        step: 2, required: true },
  { key: "studentLastName",   label: "Student Last Name",         step: 2, required: true },
  { key: "dateOfBirth",       label: "Date of Birth",             step: 2, required: false },
  { key: "gradeLevel",        label: "Grade Level",               step: 2, required: false },
  { key: "diagnosis",         label: "Diagnosis / Disability",    step: 2, required: false },
  { key: "schoolName",        label: "School Name",               step: 2, required: false },
  { key: "countyDistrict",    label: "County / School District",  step: 2, required: false },
  { key: "cityStateZip",      label: "City / State / ZIP",        step: 2, required: false },
  // Step 3 — Challenges
  { key: "challenges",        label: "Challenges & Concerns",     step: 3, required: false },
] as const;

export type FieldKey = typeof ALL_FIELDS[number]["key"];

/** Default: all fields enabled */
export const DEFAULT_FIELDS: FieldKey[] = ALL_FIELDS.map((f) => f.key);
