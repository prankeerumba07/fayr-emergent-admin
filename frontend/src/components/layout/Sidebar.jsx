import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { TEAMS, AI_NAV, canAccessSection } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { Sparkles } from "lucide-react";

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;
  const showAi = canAccessSection(role, AI_NAV.key);
  const teams = TEAMS.filter((t) => canAccessSection(role, t.key));
  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-slate-200 bg-white" data-testid="sidebar">
      <div className="flex items-center gap-3 px-6 py-6">
        <div>
          <p className="font-logo text-2xl font-extrabold leading-none tracking-tight text-[#191919]">fayr<span className="text-[#F5C400]">.</span></p>
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#5C5C5C]">Ops Desk</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {showAi && (
          <>
            <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">AI</p>
            <NavLink
              to={AI_NAV.path}
              data-testid="nav-ai"
              className={({ isActive }) =>
                `group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? "text-white" : "text-[#30A90F] hover:bg-[#F1F5DB]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="active-pill" className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-[#68B642] to-[#30A90F]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                  )}
                  {!isActive && <span className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-[#F1F5DB] to-[#EAF7E4]" />}
                  <AI_NAV.icon size={18} className={isActive ? "text-white" : "text-[#30A90F]"} />
                  <span>{AI_NAV.label}</span>
                  <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${isActive ? "bg-white/20 text-white" : "bg-[#30A90F] text-white"}`}>New</span>
                </>
              )}
            </NavLink>
          </>
        )}

        {teams.length > 0 && (
          <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Teams</p>
        )}
        {teams.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.key}
              to={t.path}
              data-testid={`nav-${t.key}`}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-[#191919] text-white" : "text-[#5C5C5C] hover:bg-[#F1F2D9]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="active-pill"
                      className="absolute inset-0 -z-10 rounded-xl bg-[#191919]"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon size={18} className={isActive ? "text-white" : "text-[#68B642] group-hover:text-[#30A90F]"} />
                  <span>{t.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-[#ECEDDC] bg-gradient-to-b from-[#F1F5DB] to-white p-4">
        <div className="flex items-center gap-2 text-[#191919]">
          <Sparkles size={15} className="text-[#30A90F]" />
          <p className="text-xs font-semibold">AI Assist enabled</p>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
          Reply suggestions & chat summaries powered by Claude across every conversation.
        </p>
      </div>
    </aside>
  );
}
