import { Headphones, ShieldCheck, LayoutGrid, CreditCard, Settings2, Bot } from "lucide-react";

export const AI_NAV = { key: "ai", label: "Fayr Assistant", icon: Bot, path: "/assistant" };

export const TEAMS = [
  { key: "customer_support", label: "Customer Support", short: "Support", icon: Headphones, path: "/support" },
  { key: "operations", label: "Operations", short: "Ops", icon: ShieldCheck, path: "/operations" },
  { key: "frontend_ops", label: "Frontend Ops", short: "Frontend", icon: LayoutGrid, path: "/frontend-ops" },
  { key: "finance", label: "Finance", short: "Finance", icon: CreditCard, path: "/finance" },
  { key: "admin", label: "Admin / Management", short: "Admin", icon: Settings2, path: "/admin" },
];

export const MARKETPLACE_STYLE = {
  Amazon: "bg-amber-50 text-amber-800 border-amber-200",
  Flipkart: "bg-blue-50 text-blue-800 border-blue-200",
  Meesho: "bg-pink-50 text-pink-800 border-pink-200",
  Myntra: "bg-purple-50 text-purple-800 border-purple-200",
};

export const PRIORITY_STYLE = {
  urgent: "bg-rose-50 text-rose-700 border-rose-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

export const STATUS_STYLE = {
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  escalated: "bg-rose-50 text-rose-700 border-rose-200",
  resolved: "bg-slate-100 text-slate-600 border-slate-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  waiting: "bg-amber-50 text-amber-700 border-amber-200",
  transferred: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  live: "bg-emerald-50 text-emerald-700 border-emerald-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
};

export const SENTIMENT_STYLE = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  frustrated: "bg-rose-50 text-rose-700 border-rose-200",
};

export const PRESENCE_STYLE = {
  online: { dot: "bg-emerald-500", label: "Online", ring: "ring-emerald-500/30" },
  away: { dot: "bg-amber-500", label: "Away", ring: "ring-amber-500/30" },
  busy: { dot: "bg-rose-500", label: "Busy", ring: "ring-rose-500/30" },
  offline: { dot: "bg-slate-400", label: "Offline", ring: "ring-slate-400/30" },
};

export function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function slaLeft(iso) {
  if (!iso) return { text: "—", breached: false };
  const diff = new Date(iso).getTime() - Date.now();
  const breached = diff < 0;
  const mins = Math.abs(Math.floor(diff / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return { text: breached ? `${label} overdue` : `${label} left`, breached };
}

export function inr(paise) {
  return "₹" + Number(paise).toLocaleString("en-IN");
}

export function initials(name) {
  return (name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}
