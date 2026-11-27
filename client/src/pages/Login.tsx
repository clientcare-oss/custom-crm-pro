import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useClerk, useSignIn, useUser } from "@clerk/react";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import ScopedErrorBoundary from "@/components/ScopedErrorBoundary";
import {
  AppleInkIcon,
  EngravedCompassDivider,
  GoogleInkIcon,
  MicrosoftInkIcon,
  OrnateLeatherButton,
} from "@/components/login/LoginEngravings";
import "@/styles/waypointLogin.css";

// Exact normalized coordinates measured directly from lamp-arm-free pendant waypoint-desk-scene.jpg (1376x768)
const SCENE_IMG_W = 1376;
const SCENE_IMG_H = 768;
const SCENE_Y_ANCHOR = 0.24; // Matches background-position: 50% 24% (keeps full pendant brass dome + desk props visible)
const SCENE_LAMP_BOTTOM_Y = 110 / 768; // Exact bottom rim of pendant brass lamp shade (y=110px)
const SCENE_BOOKS_RIGHT_X = 0.377; // Exact right edge of the gold-lettered IDEA / IEP / 504 / FBA / BIP spine (page touches spine flush)
const SCENE_KRAFT_LEFT_X = 0.694;  // Left edge of hanging Cases / Meetings checklist
const PLAQUE_BASE_W = 452;

type LoginViewMode =
  | "sign-in"
  | "forgot-request"
  | "forgot-verify"
  | "forgot-new-password"
  | "mfa-verify"
  | "enterprise-sso";

const REMEMBER_EMAIL_STORAGE_KEY = "waypoint_crm_remembered_email";

function extractClerkErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const errObj = error as {
    longMessage?: string;
    message?: string;
    errors?: Array<{ longMessage?: string; message?: string }>;
  };
  if (errObj.longMessage) return errObj.longMessage;
  if (errObj.message) return errObj.message;
  if (Array.isArray(errObj.errors) && errObj.errors[0]) {
    return errObj.errors[0].longMessage || errObj.errors[0].message || fallback;
  }
  return fallback;
}

function WaypointLoginContent() {
  const { signIn, fetchStatus } = useSignIn();
  const { isSignedIn } = useUser();
  const clerk = useClerk();
  const [, setLocation] = useLocation();

  const [mode, setMode] = useState<LoginViewMode>("sign-in");
  const [email, setEmail] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(REMEMBER_EMAIL_STORAGE_KEY) || "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem(REMEMBER_EMAIL_STORAGE_KEY));
  });
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const plaqueRef = useRef<HTMLElement | null>(null);
  const [plaqueGeom, setPlaqueGeom] = useState<{
    left: number;
    top: number;
    scale: number;
    isMobile: boolean;
  }>({ left: 0, top: 120, scale: 1, isMobile: false });

  const isBusy = submitting || fetchStatus === "fetching" || Boolean(oauthLoading);

  // Lock the parchment plaque mathematically right under the brass banker lamp,
  // strictly to the right of the IDEA / IEP / 504 / FBA / BIP book spines, and scaled
  // so it ALWAYS fits 100% inside the viewport with zero vertical scrolling.
  useLayoutEffect(() => {
    const computePlacement = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const naturalH = plaqueRef.current?.offsetHeight || 595;

      if (vw < 820) {
        const availW = vw - 24;
        const availH = vh - 24;
        const scale = Math.min(1, availW / PLAQUE_BASE_W, availH / naturalH);
        const scaledW = PLAQUE_BASE_W * scale;
        const scaledH = naturalH * scale;
        setPlaqueGeom({
          left: Math.round((vw - scaledW) / 2),
          top: Math.max(12, Math.round((vh - scaledH) / 2)),
          scale,
          isMobile: true,
        });
        return;
      }

      // Backdrop uses object-cover anchored at (50%, 42%) so both brass lamp & bottom compass/mug stay cleanly framed
      const coverScale = Math.max(vw / SCENE_IMG_W, vh / SCENE_IMG_H);
      const renderedW = SCENE_IMG_W * coverScale;
      const renderedH = SCENE_IMG_H * coverScale;
      const offsetX = (vw - renderedW) / 2;
      const offsetY = (vh - renderedH) * SCENE_Y_ANCHOR;

      const lampBottomY = offsetY + SCENE_LAMP_BOTTOM_Y * renderedH;
      const booksRightX = offsetX + SCENE_BOOKS_RIGHT_X * renderedW;
      const kraftLeftX = offsetX + SCENE_KRAFT_LEFT_X * renderedW;

      // Sit right under the brass lamp rim & scale up generously to touch the IDEA/IEP books on the left with zero scroll
      const top = Math.max(52, Math.round(lampBottomY + 5));
      const bottomPad = 10;
      const availH = Math.max(340, vh - top - bottomPad);
      const bayLeft = booksRightX;
      const bayRight = kraftLeftX - 4;
      const availW = Math.max(300, bayRight - bayLeft);

      const scale = Math.min(1.35, availW / PLAQUE_BASE_W, availH / naturalH);

      setPlaqueGeom({
        left: Math.round(bayLeft),
        top,
        scale,
        isMobile: false,
      });
    };

    computePlacement();
    window.addEventListener("resize", computePlacement);
    const ro =
      typeof ResizeObserver !== "undefined" && plaqueRef.current
        ? new ResizeObserver(computePlacement)
        : null;
    if (ro && plaqueRef.current) ro.observe(plaqueRef.current);

    return () => {
      window.removeEventListener("resize", computePlacement);
      ro?.disconnect();
    };
  }, [mode, Boolean(errorMsg), Boolean(infoMsg)]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (rememberMe && email.trim()) {
      window.localStorage.setItem(REMEMBER_EMAIL_STORAGE_KEY, email.trim());
    } else if (!rememberMe) {
      window.localStorage.removeItem(REMEMBER_EMAIL_STORAGE_KEY);
    }
  }, [rememberMe, email]);

  const completeActiveSession = async () => {
    if (!signIn) return;
    const { error } = await signIn.finalize({
      navigate: async ({ decorateUrl }) => {
        const dest = decorateUrl("/");
        if (dest.startsWith("http")) {
          window.location.href = dest;
        } else {
          setLocation(dest);
        }
      },
    });
    if (error) {
      setErrorMsg(extractClerkErrorMessage(error, "Unable to finalize your session."));
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg("Please enter your email address and password.");
      return;
    }

    if (isSignedIn) {
      toast.success("Already authenticated — opening your Waypoint workspace.");
      setLocation("/");
      return;
    }

    if (!signIn) {
      clerk.openSignIn();
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await signIn.password({
        emailAddress: trimmedEmail,
        password,
      });

      if (error) {
        setErrorMsg(
          extractClerkErrorMessage(error, "Invalid email address or password. Please try again.")
        );
        return;
      }

      if (signIn.status === "complete") {
        await completeActiveSession();
        return;
      }

      if (
        signIn.status === "needs_second_factor" ||
        signIn.status === "needs_client_trust"
      ) {
        const hasEmailFactor = signIn.supportedSecondFactors?.some(
          (f) => f.strategy === "email_code"
        );
        if (hasEmailFactor) {
          await signIn.mfa.sendEmailCode();
          setInfoMsg("A verification code has been sent to your email address.");
        } else {
          setInfoMsg("Enter the verification code from your authenticator app.");
        }
        setCode("");
        setMode("mfa-verify");
        return;
      }

      setErrorMsg("Additional verification is required to complete sign-in.");
    } catch (err) {
      setErrorMsg(extractClerkErrorMessage(err, "Sign-in failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!signIn || !code.trim()) {
      setErrorMsg("Please enter your verification code.");
      return;
    }

    setSubmitting(true);
    try {
      const hasEmailFactor = signIn.supportedSecondFactors?.some(
        (f) => f.strategy === "email_code"
      );
      const { error } = hasEmailFactor
        ? await signIn.mfa.verifyEmailCode({ code: code.trim() })
        : await signIn.mfa.verifyTOTP({ code: code.trim() });

      if (error) {
        setErrorMsg(extractClerkErrorMessage(error, "Invalid verification code."));
        return;
      }

      if (signIn.status === "complete") {
        await completeActiveSession();
      }
    } catch (err) {
      setErrorMsg(extractClerkErrorMessage(err, "Unable to verify code."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Enter your account email address to receive a reset code.");
      return;
    }
    if (!signIn) {
      clerk.openSignIn();
      return;
    }

    setSubmitting(true);
    try {
      const createRes = await signIn.create({ identifier: trimmedEmail });
      if (createRes.error) {
        setErrorMsg(
          extractClerkErrorMessage(createRes.error, "We couldn't find an account for that email.")
        );
        return;
      }
      const { error } = await signIn.resetPasswordEmailCode.sendCode();
      if (error) {
        setErrorMsg(extractClerkErrorMessage(error, "Could not send password reset code."));
        return;
      }
      setCode("");
      setInfoMsg(`We sent a 6-digit verification code to ${trimmedEmail}.`);
      setMode("forgot-verify");
    } catch (err) {
      setErrorMsg(extractClerkErrorMessage(err, "Unable to initiate password reset."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!signIn || !code.trim()) {
      setErrorMsg("Enter the verification code sent to your email.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({
        code: code.trim(),
      });
      if (error) {
        setErrorMsg(extractClerkErrorMessage(error, "That reset code is invalid or expired."));
        return;
      }
      setInfoMsg("Code verified. Choose your new password below.");
      setMode("forgot-new-password");
    } catch (err) {
      setErrorMsg(extractClerkErrorMessage(err, "Code verification failed."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!signIn || newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      });
      if (error) {
        setErrorMsg(extractClerkErrorMessage(error, "Could not update your password."));
        return;
      }
      toast.success("Password updated — signing you in.");
      if (signIn.status === "complete") {
        await completeActiveSession();
      } else {
        setMode("sign-in");
      }
    } catch (err) {
      setErrorMsg(extractClerkErrorMessage(err, "Password update failed."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthProvider = async (
    strategy: "oauth_google" | "oauth_apple" | "oauth_microsoft"
  ) => {
    setErrorMsg(null);
    setInfoMsg(null);

    if (isSignedIn) {
      toast.success("Already authenticated — opening your Waypoint workspace.");
      setLocation("/");
      return;
    }

    if (!signIn) {
      clerk.openSignIn();
      return;
    }

    setOauthLoading(strategy);
    try {
      const { error } = await signIn.sso({
        strategy,
        redirectUrl: "/",
        redirectCallbackUrl: "/sso-callback",
      });
      if (error) {
        const msg = extractClerkErrorMessage(
          error,
          "This sign-in provider is not enabled for your workspace."
        );
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = extractClerkErrorMessage(err, "Unable to launch external sign-in.");
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setOauthLoading(null);
    }
  };

  const handleEnterpriseSsoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Enter your organization email address to sign in with SSO.");
      return;
    }

    if (isSignedIn) {
      setLocation("/");
      return;
    }

    if (!signIn) {
      clerk.openSignIn();
      return;
    }

    setOauthLoading("enterprise_sso");
    try {
      const { error } = await signIn.sso({
        strategy: "enterprise_sso",
        identifier: trimmedEmail,
        redirectUrl: "/",
        redirectCallbackUrl: "/sso-callback",
      });
      if (error) {
        const msg = extractClerkErrorMessage(
          error,
          "No Enterprise SSO connection was found for that email domain."
        );
        setErrorMsg(msg);
      }
    } catch (err) {
      setErrorMsg(extractClerkErrorMessage(err, "Unable to initiate Enterprise SSO."));
    } finally {
      setOauthLoading(null);
    }
  };

  const resetToSignIn = () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setCode("");
    setNewPassword("");
    signIn?.reset();
    setMode("sign-in");
  };

  return (
    <div className="wp-login-stage">
      {/* Full-bleed photorealistic study desk photograph */}
      <div className="wp-login-backdrop" aria-hidden="true" />
      <div className="wp-login-lighting" aria-hidden="true" />

      {/* Centered Antique Parchment Plaque locked right under the brass lamp with zero scroll */}
      <main
        className="wp-login-plaque-anchor"
        aria-label="Waypoint Advocates Login"
        style={{
          left: `${plaqueGeom.left}px`,
          top: `${plaqueGeom.top}px`,
          width: `${PLAQUE_BASE_W}px`,
          transform: `scale(${plaqueGeom.scale})`,
          transformOrigin: "top left",
        }}
      >
        <section ref={plaqueRef} className="wp-login-plaque">
          {/* Trailing backlit green ivy vine draping physically over the top-left corner */}
          <img
            src="/assets/login/ivy-corner-overlay.png"
            alt=""
            aria-hidden="true"
            className="wp-login-ivy-overlay"
          />

          {/* Official Waypoint Advocates Crest & Masthead */}
          <header className="relative z-10 flex flex-col items-center text-center">
            <img
              src="/waypoint-logo.png"
              alt="Waypoint Advocates"
              className="wp-login-brand-logo"
            />
            <h1 className="wp-login-brand-title mt-1">
              Waypoint Advocates<sup className="wp-login-tm">™</sup>
            </h1>
            <p className="wp-login-brand-subtitle mt-0.5">
              PROFESSIONAL ADVOCACY PLATFORM
            </p>
          </header>

          {/* Engraved Compass Rose Divider */}
          <EngravedCompassDivider className="relative z-10 my-1.5" />

          {/* Main Form View */}
          {mode === "sign-in" && (
            <div className="relative z-10">
              <div className="text-center mb-3">
                <h2 className="wp-login-heading">Welcome Back</h2>
                <p className="wp-login-copy mt-1 max-w-[330px] mx-auto">
                  Access your workspace, case tools, records, and client communications.
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="mb-3 rounded-[6px] border border-[#6E1F14]/55 bg-[#7B2214]/12 px-3 py-2 text-[12px] leading-snug text-[#4D120A] font-serif"
                >
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handlePasswordSignIn} className="space-y-2.5" noValidate>
                {/* Email Address */}
                <label className="wp-login-input-wrap">
                  <span className="sr-only">Email Address</span>
                  <Mail
                    className="w-[17px] h-[17px] text-[#1E150D] ml-3 mr-2.5 shrink-0"
                    strokeWidth={1.9}
                  />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    disabled={isBusy}
                    className="wp-login-input"
                  />
                </label>

                {/* Password */}
                <label className="wp-login-input-wrap">
                  <span className="sr-only">Password</span>
                  <Lock
                    className="w-[16px] h-[16px] text-[#1E150D] fill-[#1E150D]/85 ml-3 mr-2.5 shrink-0"
                    strokeWidth={1.8}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    disabled={isBusy}
                    className="wp-login-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 p-1 text-[#1E150D]/85 hover:text-[#0E0905] transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-[17px] h-[17px]" strokeWidth={2} />
                    ) : (
                      <Eye className="w-[17px] h-[17px]" strokeWidth={2} />
                    )}
                  </button>
                </label>

                {/* Remember me + Forgot password */}
                <div className="flex items-center justify-between pt-0.5 pb-1 text-[12.5px] text-[#24190F]">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="wp-login-checkbox"
                    />
                    <span className="font-serif">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setInfoMsg(null);
                      setMode("forgot-request");
                    }}
                    className="font-serif underline underline-offset-[3px] decoration-[#24190F]/70 hover:text-[#0D0804] hover:decoration-[#0D0804] transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Ornate Notched-Corner Navy Leather & Brass Log In Plaque */}
                <div className="pt-0.5">
                  <OrnateLeatherButton type="submit" disabled={isBusy}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#F5E0AC]" />
                        <span>Signing In…</span>
                      </>
                    ) : (
                      <span>Log In</span>
                    )}
                  </OrnateLeatherButton>
                </div>
              </form>

              {/* "or" Divider */}
              <div className="flex items-center gap-3 my-2.5" aria-hidden="true">
                <div
                  className="h-[1px] flex-1"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(44,30,17,0.12) 0%, rgba(44,30,17,0.62) 100%)",
                  }}
                />
                <span className="font-serif font-semibold text-[15px] text-[#1D140C] leading-none">
                  or
                </span>
                <div
                  className="h-[1px] flex-1"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(44,30,17,0.62) 0%, rgba(44,30,17,0.12) 100%)",
                  }}
                />
              </div>

              {/* 4 Tactile Embossed Parchment OAuth / SSO Buttons */}
              <div className="grid grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOAuthProvider("oauth_google")}
                  disabled={isBusy}
                  aria-label="Sign in with Google"
                  title="Sign in with Google"
                  className="wp-login-oauth-btn"
                >
                  {oauthLoading === "oauth_google" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <GoogleInkIcon className="w-[19px] h-[19px]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthProvider("oauth_apple")}
                  disabled={isBusy}
                  aria-label="Sign in with Apple"
                  title="Sign in with Apple"
                  className="wp-login-oauth-btn"
                >
                  {oauthLoading === "oauth_apple" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <AppleInkIcon className="w-[19px] h-[19px]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthProvider("oauth_microsoft")}
                  disabled={isBusy}
                  aria-label="Sign in with Microsoft"
                  title="Sign in with Microsoft"
                  className="wp-login-oauth-btn"
                >
                  {oauthLoading === "oauth_microsoft" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MicrosoftInkIcon className="w-[16px] h-[16px]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setInfoMsg(null);
                    setMode("enterprise-sso");
                  }}
                  disabled={isBusy}
                  aria-label="Sign in with Enterprise SSO"
                  title="Sign in with Enterprise SSO"
                  className="wp-login-oauth-btn"
                >
                  <KeyRound className="w-[15px] h-[15px] shrink-0" strokeWidth={2.3} />
                  <span className="font-serif font-bold text-[13.5px] tracking-[0.02em]">
                    SSO
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Secondary Flow: Forgot Password / MFA / Enterprise SSO (styled natively on parchment) */}
          {mode !== "sign-in" && (
            <div className="relative z-10">
              <div className="text-center mb-3.5">
                <h2 className="wp-login-heading text-[25px] sm:text-[28px]">
                  {mode === "forgot-request" && "Reset Password"}
                  {mode === "forgot-verify" && "Enter Reset Code"}
                  {mode === "forgot-new-password" && "New Password"}
                  {mode === "mfa-verify" && "Verify Identity"}
                  {mode === "enterprise-sso" && "Enterprise SSO"}
                </h2>
                <p className="wp-login-copy mt-1 max-w-[330px] mx-auto">
                  {mode === "forgot-request" &&
                    "Enter your email address and we will send a verification code."}
                  {mode === "forgot-verify" &&
                    "Enter the 6-digit code sent to your inbox."}
                  {mode === "forgot-new-password" &&
                    "Create a strong new password for your Waypoint account."}
                  {mode === "mfa-verify" &&
                    "Complete two-step verification to enter your workspace."}
                  {mode === "enterprise-sso" &&
                    "Enter your organization email to continue with Single Sign-On."}
                </p>
              </div>

              {infoMsg && (
                <div className="mb-3 rounded-[6px] border border-[#2B4666]/45 bg-[#102642]/10 px-3 py-2 text-[12px] leading-snug text-[#122640] font-serif">
                  {infoMsg}
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="mb-3 rounded-[6px] border border-[#6E1F14]/55 bg-[#7B2214]/12 px-3 py-2 text-[12px] leading-snug text-[#4D120A] font-serif"
                >
                  {errorMsg}
                </div>
              )}

              {mode === "forgot-request" && (
                <form onSubmit={handleForgotSendCode} className="space-y-3">
                  <label className="wp-login-input-wrap">
                    <Mail className="w-[17px] h-[17px] text-[#1E150D] ml-3 mr-2.5 shrink-0" />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isBusy}
                      className="wp-login-input"
                    />
                  </label>
                  <OrnateLeatherButton type="submit" disabled={isBusy}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#F5E0AC]" />
                        <span>Sending Code…</span>
                      </>
                    ) : (
                      <span>Send Reset Code</span>
                    )}
                  </OrnateLeatherButton>
                </form>
              )}

              {(mode === "forgot-verify" || mode === "mfa-verify") && (
                <form
                  onSubmit={mode === "forgot-verify" ? handleForgotVerifyCode : handleMfaVerify}
                  className="space-y-3"
                >
                  <label className="wp-login-input-wrap">
                    <KeyRound className="w-[16px] h-[16px] text-[#1E150D] ml-3 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="6-Digit Verification Code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={isBusy}
                      className="wp-login-input tracking-[0.18em]"
                    />
                  </label>
                  <OrnateLeatherButton type="submit" disabled={isBusy}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#F5E0AC]" />
                        <span>Verifying…</span>
                      </>
                    ) : (
                      <span>Verify Code</span>
                    )}
                  </OrnateLeatherButton>
                </form>
              )}

              {mode === "forgot-new-password" && (
                <form onSubmit={handleForgotSubmitPassword} className="space-y-3">
                  <label className="wp-login-input-wrap">
                    <Lock className="w-[16px] h-[16px] text-[#1E150D] ml-3 mr-2.5 shrink-0" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="New Password (8+ characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isBusy}
                      className="wp-login-input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 p-1 text-[#1E150D]/85 hover:text-[#0E0905] cursor-pointer"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-[17px] h-[17px]" />
                      ) : (
                        <Eye className="w-[17px] h-[17px]" />
                      )}
                    </button>
                  </label>
                  <OrnateLeatherButton type="submit" disabled={isBusy}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#F5E0AC]" />
                        <span>Updating…</span>
                      </>
                    ) : (
                      <span>Update &amp; Log In</span>
                    )}
                  </OrnateLeatherButton>
                </form>
              )}

              {mode === "enterprise-sso" && (
                <form onSubmit={handleEnterpriseSsoSubmit} className="space-y-3">
                  <label className="wp-login-input-wrap">
                    <Mail className="w-[17px] h-[17px] text-[#1E150D] ml-3 mr-2.5 shrink-0" />
                    <input
                      type="email"
                      placeholder="Work Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isBusy}
                      className="wp-login-input"
                    />
                  </label>
                  <OrnateLeatherButton type="submit" disabled={isBusy}>
                    {oauthLoading === "enterprise_sso" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#F5E0AC]" />
                        <span>Connecting SSO…</span>
                      </>
                    ) : (
                      <span>Continue with SSO</span>
                    )}
                  </OrnateLeatherButton>
                </form>
              )}

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={resetToSignIn}
                  className="inline-flex items-center gap-1.5 font-serif text-[12.5px] text-[#24190F] underline underline-offset-2 hover:text-[#0C0804] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Log In</span>
                </button>
              </div>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}

export default function Login() {
  return (
    <ScopedErrorBoundary moduleName="Waypoint CRM Login">
      <WaypointLoginContent />
    </ScopedErrorBoundary>
  );
}
