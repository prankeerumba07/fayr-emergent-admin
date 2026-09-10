import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { StatCard, Avatar, Pill } from "@/components/shared/UI";
import { PRESENCE_STYLE, TEAMS, timeAgo } from "@/lib/constants";
import {
  Settings2, Users, UserCheck, Activity, History, TicketCheck, Gauge,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

const TEAM_LABEL = Object.fromEntries(TEAMS.map((t) => [t.key, t.short]));

export default function Admin() {
  const { agents } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.getMetrics("admin").then(({ data }) => setMetrics(data));
    api.getAuditLogs(30).then(({ data }) => setLogs(data));
  }, []);

  const teamCounts = TEAMS.map((t) => ({
    name: t.short,
    agents: agents.filter((a) => a.team === t.key).length,
    online: agents.filter((a) => a.team === t.key && a.presence === "online").length,
  }));

  const COLORS = ["#2563EB", "#059669", "#D97706", "#E11D48", "#7c3aed"];

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex items-center gap-2">
          <Settings2 size={20} className="text-slate-700" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900" data-testid="page-title">Admin / Management</h1>
        </div>
        <p className="mt-1 text-xs text-slate-500">Staff roster, routing capacity, SLA config & audit trail</p>
      </div>

      <div className="space-y-6 p-8">
        {metrics && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard icon={Users} label="Total staff" value={metrics.total_staff} index={0} />
            <StatCard icon={UserCheck} label="Online now" value={metrics.online_staff} tone="bg-emerald-50 text-emerald-600" accent="text-emerald-600" index={1} />
            <StatCard icon={TicketCheck} label="Tickets" value={metrics.total_tickets} tone="bg-blue-50 text-blue-600" accent="text-blue-600" index={2} />
            <StatCard icon={Gauge} label="Claims" value={metrics.total_claims} tone="bg-amber-50 text-amber-600" accent="text-amber-600" index={3} />
            <StatCard icon={Activity} label="Withdrawals" value={metrics.total_withdrawals} tone="bg-rose-50 text-rose-600" accent="text-rose-600" index={4} />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <p className="mb-4 text-sm font-semibold text-slate-800">Team capacity</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamCounts} barCategoryGap={24}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="agents" radius={[8, 8, 0, 0]} name="Staff">
                    {teamCounts.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 p-4"><History size={16} className="text-slate-500" /><p className="text-sm font-semibold text-slate-800">Audit log</p></div>
            <div className="max-h-56 space-y-2 overflow-y-auto p-4">
              {logs.map((l) => (
                <div key={l.id} data-testid="audit-log-row" className="flex items-start gap-2 text-xs">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  <div>
                    <p className="text-slate-700"><span className="font-medium">{l.actor}</span> · {l.action.replace(/_/g, " ")} <span className="text-slate-400">{l.entity}</span></p>
                    <p className="text-[10px] text-slate-400">{timeAgo(l.timestamp)}</p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-xs text-slate-400">No activity yet.</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4"><p className="text-sm font-semibold text-slate-800">Staff & Agent Routing</p></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a, i) => {
              const p = PRESENCE_STYLE[a.presence];
              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} data-testid="staff-member-card" className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                  <Avatar src={a.avatar} name={a.name} size={44} presence={a.presence} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{a.name}</p>
                    <p className="truncate text-xs text-slate-500">{a.role}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Pill className="border-slate-200 bg-slate-100 text-slate-600">{TEAM_LABEL[a.team] || a.team}</Pill>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-slate-500`}>
                        <span className={`h-2 w-2 rounded-full ${p.dot}`} />{p.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">{a.active_tickets}</p>
                    <p className="text-[10px] text-slate-400">active</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
