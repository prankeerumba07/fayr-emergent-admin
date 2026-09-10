import React from "react";
import { motion } from "framer-motion";
import {
  MARKETPLACE_STYLE, PRIORITY_STYLE, STATUS_STYLE, SENTIMENT_STYLE, PRESENCE_STYLE, initials,
} from "@/lib/constants";

export const Pill = ({ className = "", children, ...props }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${className}`}
    {...props}
  >
    {children}
  </span>
);

export const MarketplaceBadge = ({ name }) => (
  <Pill className={MARKETPLACE_STYLE[name] || "bg-slate-100 text-slate-600 border-slate-200"} data-testid="marketplace-badge">
    {name}
  </Pill>
);

export const PriorityBadge = ({ priority }) => (
  <Pill className={PRIORITY_STYLE[priority] || PRIORITY_STYLE.low} data-testid="ticket-priority-badge">
    {priority}
  </Pill>
);

export const StatusBadge = ({ status }) => (
  <Pill className={STATUS_STYLE[status] || "bg-slate-100 text-slate-600 border-slate-200"} data-testid="status-badge">
    {status}
  </Pill>
);

export const SentimentBadge = ({ sentiment }) => (
  <Pill className={SENTIMENT_STYLE[sentiment] || SENTIMENT_STYLE.neutral}>{sentiment}</Pill>
);

export const Avatar = ({ src, name, size = 36, presence }) => {
  const p = presence ? PRESENCE_STYLE[presence] : null;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover ring-2 ring-white"
          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
        />
      ) : null}
      <div
        className="absolute inset-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600"
        style={{ display: src ? "none" : "flex" }}
      >
        {initials(name)}
      </div>
      {p && (
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${p.dot}`} />
      )}
    </div>
  );
};

const CARD_INIT = { opacity: 0, y: 12 };
const CARD_ANIM = { opacity: 1, y: 0 };

export const StatCard = ({ icon: Icon, label, value, sub, accent = "text-slate-900", tone = "bg-slate-100 text-slate-600", index = 0 }) => (
  <motion.div
    initial={CARD_INIT}
    animate={CARD_ANIM}
    transition={{ duration: 0.35, delay: index * 0.05 }}
    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    data-testid="stat-card"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-2 text-3xl font-bold tracking-tight ${accent}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      </div>
      {Icon && (
        <div className={`rounded-xl p-2.5 ${tone}`}>
          <Icon size={20} />
        </div>
      )}
    </div>
  </motion.div>
);

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 bg-white px-8 py-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="page-title">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

export const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
    {Icon && <div className="mb-3 rounded-2xl bg-slate-100 p-4 text-slate-400"><Icon size={28} /></div>}
    <p className="text-sm font-medium text-slate-600">{title}</p>
    {subtitle && <p className="mt-1 max-w-xs text-xs text-slate-400">{subtitle}</p>}
  </div>
);
