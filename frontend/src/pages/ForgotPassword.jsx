import React, { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-slate-50 px-6">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-200/50 to-violet-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200/40 to-indigo-200/40 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl shadow-slate-200/60 backdrop-blur-xl"
        data-testid="forgot-password-page"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <Bot size={24} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-slate-900">Forgot password</p>
            <p className="text-xs text-slate-500">We’ll email you a secure reset link</p>
          </div>
        </div>

        {sent ? (
          <div data-testid="forgot-sent" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Check your inbox</div>
            If an account exists for that email, a password reset link is on its way. The link expires in 1 hour.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Work email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  data-testid="forgot-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@cashkaro.com"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-indigo-400"
                />
              </div>
            </div>
            {error && <p data-testid="forgot-error" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
            <button
              data-testid="forgot-submit-btn"
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Send reset link
            </button>
          </form>
        )}

        <a href="/" data-testid="back-to-login-link" className="mt-6 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft size={13} /> Back to sign in
        </a>
      </motion.div>
    </div>
  );
}
