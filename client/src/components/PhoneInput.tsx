import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatPhone, validatePhone } from "@/lib/phone";

interface PhoneInputProps {
  value: string;
  onChange: (formatted: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Smart phone input that:
 * - Accepts raw digits (e.g. 17706847089) or any common format
 * - Auto-formats on blur (e.g. → +1 (770) 684-7089)
 * - Shows a clear, friendly error if the number looks invalid
 * - Shows helper text so users know what formats work
 */
export function PhoneInput({ value, onChange, placeholder, className }: PhoneInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  function handleBlur() {
    setTouched(true);
    const err = validatePhone(value);
    setError(err);
    if (!err && value.trim()) {
      const formatted = formatPhone(value);
      if (formatted !== value) {
        onChange(formatted);
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    // Clear error as user types
    if (touched) {
      setError(validatePhone(e.target.value));
    }
  }

  return (
    <div className="space-y-1">
      <Input
        type="tel"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder ?? "e.g. 17706847089 or (770) 684-7089"}
        className={`${className ?? ""} ${error ? "border-red-400 focus-visible:ring-red-400" : ""}`}
      />
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Enter digits like <span className="font-mono">17706847089</span> — we'll format it for you.
        </p>
      )}
    </div>
  );
}
