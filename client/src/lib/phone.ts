/**
 * Phone number formatting utilities.
 *
 * Accepts any reasonable input:
 *   "17706847089"   → "+1 (770) 684-7089"
 *   "7706847089"    → "(770) 684-7089"
 *   "18005551234"   → "+1 (800) 555-1234"
 *   "(770) 684-7089" → "(770) 684-7089"  (already formatted, left alone)
 *   "+447911123456"  → "+44 7911 123456"  (international, kept as-is with spacing)
 */

/** Strip everything except digits and leading + */
function digitsOnly(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}

/**
 * Format a US/Canada 10-digit number as (NXX) NXX-XXXX.
 */
function formatUS10(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Format a US/Canada 11-digit number (leading 1) as +1 (NXX) NXX-XXXX.
 */
function formatUS11(digits: string): string {
  return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
}

/**
 * Attempt to auto-format a phone number string.
 * Returns the formatted string, or the original trimmed value if it can't be
 * confidently formatted (so we never silently destroy what the user typed).
 */
export function formatPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Already looks formatted — leave it alone
  const stripped = digitsOnly(trimmed);

  // US/Canada 10-digit
  if (/^\d{10}$/.test(stripped)) {
    return formatUS10(stripped);
  }

  // US/Canada 11-digit starting with 1
  if (/^1\d{10}$/.test(stripped)) {
    return formatUS11(stripped);
  }

  // International with + prefix (e.g. +447911123456)
  if (trimmed.startsWith("+") && stripped.length >= 7) {
    // Keep as-is — user knows what they're doing
    return trimmed;
  }

  // Fallback: return trimmed original
  return trimmed;
}

/**
 * Validate that a phone string is acceptable to save.
 * Returns null if valid, or a human-readable error string.
 */
export function validatePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null; // empty is fine (optional field)

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < 7) {
    return "Phone number is too short — enter at least 7 digits (e.g. 7706847089 or 17706847089).";
  }
  if (digits.length > 15) {
    return "Phone number is too long — maximum 15 digits.";
  }
  return null;
}
