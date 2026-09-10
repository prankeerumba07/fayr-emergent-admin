import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { TEAMS } from "@/lib/constants";
import { Sparkles } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-slate-200 bg-white" data-testid="sidebar">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
          <span className="font-mono text-lg font-bold">F</span>
        </div>
        <div>
          <p className="text-base font-bold leading-none tracking-tight text-slate-900">Fayr</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-slate-400">Ops Desk</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Teams</p>
        {TEAMS.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.key}
              to={t.path}
              data-testid={`nav-${t.key}`}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="active-pill"
                      className="absolute inset-0 -z-10 rounded-xl bg-slate-900"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon size={18} className={isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"} />
                  <span>{t.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4">
        <div className="flex items-center gap-2 text-slate-900">
          <Sparkles size={15} className="text-blue-600" />
          <p className="text-xs font-semibold">AI Assist enabled</p>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
          Reply suggestions & chat summaries powered by Claude across every conversation.
        </p>
      </div>
    </aside>
  );
}
