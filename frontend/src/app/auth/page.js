"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { useToastFeedback } from "@/hooks/useToastFeedback";
import {
  getCurrentUser,
  hasAuthSession,
  requestEmailCode,
  saveAuthSession,
  verifyEmailCode,
} from "@/lib/api";
import { ROUTES } from "@/lib/constants";

const STEP_EMAIL = "email";
const STEP_CODE = "code";

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState(STEP_EMAIL);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [session, setSession] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useToastFeedback({
    error,
    clearError: () => setError(""),
    notice,
    clearNotice: () => setNotice(""),
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reason") === "session_expired") {
        setNotice("Your session has expired. Please sign in again.");
        setBooting(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function boot() {
      if (!hasAuthSession()) {
        if (active) setBooting(false);
        return;
      }
      try {
        await getCurrentUser();
        if (!active) return;
        router.replace(ROUTES.dashboard);
      } catch {
        if (active) setBooting(false);
      }
    }
    boot();
    return () => { active = false; };
  }, [router]);

  async function handleRequestCode(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await requestEmailCode(email);
      setSession(data.session);
      setNotice("A sign-in code has been sent to your email.");
      setStep(STEP_CODE);
    } catch (err) {
      setError(err.message || "Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const tokens = await verifyEmailCode(email, code, session);
      saveAuthSession(tokens);
      router.replace(ROUTES.onboarding);
    } catch (err) {
      setError(err.message || "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await requestEmailCode(email);
      setSession(data.session);
      setCode("");
      setNotice("A new code has been sent to your email.");
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  }

  if (booting) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#f5f7f1] px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(90,188,109,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(53,164,191,0.14),_transparent_28%),linear-gradient(180deg,_#fbfcf8_0%,_#f4f6ef_100%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="relative flex min-h-screen items-center justify-center">
          <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm text-slate-500 shadow-sm backdrop-blur">
            Checking session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7f1] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(90,188,109,0.24),_transparent_30%),radial-gradient(circle_at_18%_72%,_rgba(255,206,112,0.16),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(53,164,191,0.16),_transparent_26%),linear-gradient(180deg,_#fbfcf8_0%,_#f2f5ed_100%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="auth-ambient-drift absolute -left-16 top-20 h-64 w-64 rounded-full bg-emerald-200/45 blur-3xl" aria-hidden />
      <div className="auth-ambient-drift-slow absolute bottom-12 right-[-4rem] h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl" aria-hidden />
      <div className="auth-orbit-left absolute left-[8%] top-[18%] hidden h-20 w-20 rounded-[2rem] border border-white/70 bg-white/50 shadow-lg backdrop-blur lg:block" aria-hidden />
      <div className="auth-orbit-right absolute bottom-[18%] right-[14%] hidden h-16 w-16 rounded-full border border-white/80 bg-white/60 shadow-lg backdrop-blur lg:block" aria-hidden />

      <div className="relative flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
          <div className="absolute left-[9%] top-[22%] max-w-xs rounded-[1.75rem] border border-white/70 bg-white/65 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-700">
              Nutrition Copilot
            </p>
            <p className="mt-3 text-lg font-black leading-tight text-slate-900">
              One secure sign-in for pantry scans, recipes, and macro-aware planning.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
              <span className="rounded-full bg-emerald-50 px-3 py-1">Fridge vision</span>
              <span className="rounded-full bg-cyan-50 px-3 py-1">Receipt OCR</span>
              <span className="rounded-full bg-amber-50 px-3 py-1">Goal aligned</span>
            </div>
          </div>
          <div className="absolute bottom-[18%] left-[12%] rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-sm text-slate-600 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
            Passwordless access
            <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
              Email verification only
            </div>
          </div>
        </div>

        <div className="relative w-full max-w-[460px] space-y-6 rounded-[2rem] border border-white/70 bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur md:p-8">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name={step === STEP_EMAIL ? "mail" : "pin"} className="text-2xl" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Passwordless</p>
              <h1 className="text-2xl font-black tracking-tight">
                {step === STEP_EMAIL ? "Sign in" : "Enter code"}
              </h1>
            </div>
          </div>
          {step === STEP_EMAIL ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
              <p className="text-xs text-slate-500">
                New users are registered automatically. No password needed.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary text-white font-bold py-3 disabled:opacity-60 transition-opacity"
              >
                {loading ? "Sending..." : "Send sign-in code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <p className="text-sm text-slate-600">
                Code sent to <span className="font-semibold">{email}</span>
              </p>
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">8-digit code</span>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="00000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={loading || code.length < 8}
                className="w-full rounded-xl bg-primary text-white font-bold py-3 disabled:opacity-60 transition-opacity"
              >
                {loading ? "Verifying..." : "Sign in"}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setStep(STEP_EMAIL); setError(""); setNotice(""); setCode(""); }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-primary font-semibold disabled:opacity-60"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
