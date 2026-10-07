/**
 * Temporary Scroll Jump Root Cause Diagnostics Engine
 * Instruments:
 * 1. window / element scroll events and position tracking
 * 2. Monkey-patched focus(), scrollTo(), and scrollIntoView() with stack traces
 * 3. focusin events and activeElement location
 * 4. Document / Body / Main container height collapses (ResizeObserver)
 * 5. React Query / tRPC refetch completions
 * 6. History / Route / Hash changes
 * 7. Component mount / unmount tracking
 */

export interface DiagnosticEvent {
  time: number;
  type: string;
  detail: any;
  scrollY: number;
  docHeight: number;
}

const eventHistory: DiagnosticEvent[] = [];
const MAX_HISTORY = 40;

function recordEvent(type: string, detail: any) {
  const scrollY = typeof window !== "undefined" ? (window.scrollY || document.documentElement.scrollTop || 0) : 0;
  const docHeight = typeof document !== "undefined" ? (document.documentElement.scrollHeight || 0) : 0;
  const evt: DiagnosticEvent = {
    time: Date.now(),
    type,
    detail,
    scrollY,
    docHeight,
  };
  eventHistory.push(evt);
  if (eventHistory.length > MAX_HISTORY) {
    eventHistory.shift();
  }
}

export function logComponentMount(name: string) {
  console.log(`%c[MOUNT] ${name}`, "color: #3b82f6; font-weight: bold;");
  recordEvent("COMPONENT_MOUNT", { name });
}

export function logComponentUnmount(name: string) {
  console.warn(`%c[UNMOUNT] ${name}`, "color: #f97316; font-weight: bold;");
  recordEvent("COMPONENT_UNMOUNT", { name });
}

let initialized = false;

export function initScrollDiagnostics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  console.log(
    "%c[Scroll Diagnostics] Initialized — Monitoring scroll, focus, reflows, and navigation...",
    "background: #020712; color: #38bdf8; font-size: 13px; font-weight: bold; padding: 4px 8px; border-radius: 4px;"
  );

  let lastScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  let lastHeight = document.documentElement.scrollHeight;
  let isUserInteracting = false;
  let interactionTimer: any = null;

  // 1. Detect user-initiated scrolling (wheel, touch, keydown)
  const setInteracting = () => {
    isUserInteracting = true;
    clearTimeout(interactionTimer);
    interactionTimer = setTimeout(() => {
      isUserInteracting = false;
    }, 400);
  };

  window.addEventListener("wheel", setInteracting, { passive: true });
  window.addEventListener("touchstart", setInteracting, { passive: true });
  window.addEventListener("touchmove", setInteracting, { passive: true });
  window.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Space", "Home", "End"].includes(e.key)) {
      setInteracting();
    }
  }, { passive: true });

  // 2. Monitor scroll position resets
  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const currentHeight = document.documentElement.scrollHeight;

    // Detect sudden jump to top (e.g. from >40px to 0) without user wheel/touch interaction
    if (lastScrollY > 40 && currentScrollY === 0 && !isUserInteracting) {
      console.group(
        "%c🚨 [SCROLL JUMP DETECTED] Page jumped from " + lastScrollY + "px to 0px! 🚨",
        "background: #881337; color: #ffe4e6; font-size: 14px; font-weight: bold; padding: 6px 12px; border-radius: 4px;"
      );
      console.warn("Active element at time of jump:", document.activeElement);
      console.warn("Document height at jump:", currentHeight, "px (Previous was:", lastHeight, "px)");
      console.warn("Events immediately preceding the jump (newest to oldest):");
      console.table(
        [...eventHistory].reverse().slice(0, 15).map((e) => ({
          ms_ago: Date.now() - e.time,
          type: e.type,
          detail: typeof e.detail === "object" ? JSON.stringify(e.detail).slice(0, 80) : e.detail,
          scrollY_at_event: e.scrollY,
          docHeight: e.docHeight,
        }))
      );
      console.trace("Call stack at scroll reset:");
      console.groupEnd();
    }

    recordEvent("SCROLL", {
      from: lastScrollY,
      to: currentScrollY,
      userInitiated: isUserInteracting,
    });

    lastScrollY = currentScrollY;
    lastHeight = currentHeight;
  }, { passive: true });

  // 3. Monkey-patch focus()
  const originalFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (options?: FocusOptions) {
    const rect = this.getBoundingClientRect();
    const tag = this.tagName.toLowerCase();
    const id = this.id ? `#${this.id}` : "";
    const cls = this.className ? `.${this.className.toString().slice(0, 30)}` : "";
    const elDesc = `${tag}${id}${cls}`;

    console.warn(
      `%c[focus() CALLED] on ${elDesc}`,
      "color: #a855f7; font-weight: bold;",
      { top: rect.top, options, element: this }
    );
    recordEvent("METHOD_FOCUS", {
      element: elDesc,
      top: rect.top,
      preventScroll: options?.preventScroll,
    });

    return originalFocus.apply(this, arguments as any);
  };

  // 4. Track focusin events
  document.addEventListener("focusin", (e) => {
    const target = e.target as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect?.() || { top: 0 };
    const desc = `${target.tagName?.toLowerCase() || ""}${target.id ? `#${target.id}` : ""}`;
    recordEvent("EVENT_FOCUSIN", {
      element: desc,
      top: rect.top,
      viewportTop: rect.top < 0 ? "ABOVE_VIEWPORT" : rect.top > window.innerHeight ? "BELOW_VIEWPORT" : "IN_VIEWPORT",
    });
  }, true);

  // 5. Monkey-patch window.scrollTo, window.scroll, Element.prototype.scrollTo, Element.prototype.scrollIntoView
  const origWinScrollTo = window.scrollTo;
  window.scrollTo = function (...args: any[]) {
    console.warn("%c[window.scrollTo() CALLED]", "color: #ef4444; font-weight: bold;", args);
    console.trace("window.scrollTo stack trace:");
    recordEvent("WINDOW_SCROLLTO", args);
    return origWinScrollTo.apply(this, args as any);
  };

  const origWinScroll = window.scroll;
  window.scroll = function (...args: any[]) {
    console.warn("%c[window.scroll() CALLED]", "color: #ef4444; font-weight: bold;", args);
    console.trace("window.scroll stack trace:");
    recordEvent("WINDOW_SCROLL", args);
    return origWinScroll.apply(this, args as any);
  };

  const origElemScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (...args: any[]) {
    console.warn("%c[scrollIntoView() CALLED]", "color: #f59e0b; font-weight: bold;", this, args);
    console.trace("scrollIntoView stack trace:");
    recordEvent("SCROLL_INTO_VIEW", { element: this.tagName, args });
    return origElemScrollIntoView.apply(this, args as any);
  };

  // 6. Monitor container / document height collapses
  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        if (Math.abs(h - lastHeight) > 100) {
          recordEvent("HEIGHT_CHANGE", { from: lastHeight, to: h });
          if (h < window.innerHeight && lastHeight > window.innerHeight) {
            console.error(
              `%c[CRITICAL REFROW] Container collapsed below viewport height! (${lastHeight}px -> ${h}px) — This will force scroll position to 0!`,
              "background: #7f1d1d; color: #fecaca; font-weight: bold; padding: 4px;"
            );
          }
          lastHeight = h;
        }
      }
    });
    if (document.body) {
      resizeObserver.observe(document.body);
    }
  }

  // 7. Track route / URL changes
  window.addEventListener("popstate", () => {
    recordEvent("POPSTATE", { href: window.location.href });
  });
  window.addEventListener("hashchange", () => {
    recordEvent("HASHCHANGE", { hash: window.location.hash });
  });

  // Expose global inspector for direct console access
  (window as any).__scrollDiagnostics = {
    getHistory: () => [...eventHistory],
    dump: () => {
      console.table(
        [...eventHistory].reverse().map((e) => ({
          time: new Date(e.time).toLocaleTimeString(),
          type: e.type,
          detail: JSON.stringify(e.detail).slice(0, 100),
          scrollY: e.scrollY,
          docHeight: e.docHeight,
        }))
      );
    },
  };
}
