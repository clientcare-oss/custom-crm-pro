/**
 * Client-Side Console & Error Interceptor
 * Maintains a circular buffer of recent console logs and unhandled errors
 * to attach to issue reports.
 */

export interface LogEntry {
  timestamp: string;
  type: "error" | "warn" | "log" | "exception";
  message: string;
  stack?: string;
}

const MAX_LOGS = 30;
const logBuffer: LogEntry[] = [];

// Sensitive patterns to scrub from logs
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-_.]+/gi,
  /lin_api_[A-Za-z0-9]+/gi,
  /sk_[a-z0-9_]+/gi,
  /pk_[a-z0-9_]+/gi,
  /password["']?\s*[:=]\s*["'][^"']+["']/gi,
  /token["']?\s*[:=]\s*["'][^"']+["']/gi,
];

function sanitize(text: string): string {
  let cleaned = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    cleaned = cleaned.replace(pattern, "[REDACTED]");
  }
  return cleaned;
}

function addEntry(type: LogEntry["type"], message: string, stack?: string) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type,
    message: sanitize(message),
    stack: stack ? sanitize(stack) : undefined,
  };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.shift();
  }
}

let initialized = false;

export function initConsoleLogger() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Intercept console.error
  const origError = console.error;
  console.error = function (...args: any[]) {
    try {
      const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
      addEntry("error", msg);
    } catch (_) {}
    origError.apply(console, args);
  };

  // Intercept console.warn
  const origWarn = console.warn;
  console.warn = function (...args: any[]) {
    try {
      const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
      addEntry("warn", msg);
    } catch (_) {}
    origWarn.apply(console, args);
  };

  // Intercept unhandled exceptions
  window.addEventListener("error", (event) => {
    addEntry("exception", event.message || "Unknown error", event.error?.stack);
  });

  // Intercept unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = typeof reason === "object" ? reason?.message || JSON.stringify(reason) : String(reason);
    addEntry("exception", `Unhandled Rejection: ${msg}`, reason?.stack);
  });
}

export function getRecentLogs(): LogEntry[] {
  return [...logBuffer];
}

export function clearLogs() {
  logBuffer.length = 0;
}
