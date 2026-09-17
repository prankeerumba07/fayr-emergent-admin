import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { StatCard } from "@/components/shared/UI";
import { timeAgo } from "@/lib/constants";
import {
  GraduationCap, BookOpen, MessageSquareQuote, Bot, ArrowRightLeft, Sparkles, MessageSquare, Mail, Hash,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from "recharts";

const KW_TICK = { fontSize: 12, fill: "#64748b" };
const CHART_CURSOR = { fill: "#f1f5f9" };
const TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 };

const ROW_FADE = { initial: { opacity: 0, x: -8 }, animate: { opacity: 1, x: 0 } };

export default function TrainingInsights() {
  const [d, setD] = useState(null);
  useEffect(() => { api.getTrainingInsights().then(({ data }) => setD(data)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return null;

  const kw = d.top_keywords.map((k) => ({ name: k.word, value: k.count }));
  const resRate = d.ai_chats > 0 ? Math.round((d.resolved_by_ai / d.ai_chats) * 100) : 0;
  const donut = [
    { name: "Resolved by AI", value: d.resolved_by_ai, color: "#4F46E5" },
    { name: "Handed to human", value: d.handoffs, color: "#E11D48" },
  ];
  const KW_COLORS = ["#4F46E5", "#7C3AED", "#2563EB", "#059669", "#D97706", "#0891B2"];

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900"><GraduationCap size={20} className="text-[#30A90F]" /> Training Insights</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Sparkles size={12} className="text-[#68B642]" /> What the AI has learned from your team, your docs, and real conversations.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={GraduationCap} label="Replies learned" value={d.examples_count} sub="from human agents" tone="bg-[#F1F5DB] text-[#30A90F]" accent="text-[#30A90F]" index={0} />
          <StatCard icon={BookOpen} label="Knowledge articles" value={d.kb_count} tone="bg-[#F1F5DB] text-[#30A90F]" accent="text-[#30A90F]" index={1} />
          <StatCard icon={MessageSquareQuote} label="Canned responses" value={d.canned_count} tone="bg-blue-50 text-blue-600" accent="text-blue-600" index={2} />
          <StatCard icon={Bot} label="AI resolution rate" value={`${resRate}%`} sub={`${d.resolved_by_ai}/${d.ai_chats} chats`} tone="bg-emerald-50 text-emerald-600" accent="text-emerald-600" index={3} />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
            <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Hash size={15} className="text-slate-500" /> Top user question keywords</p>
            <div className="h-64">
              {kw.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kw} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={KW_TICK} axisLine={false} tickLine={false} width={90} />
                    <Tooltip cursor={CHART_CURSOR} contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>{kw.map((e, i) => <Cell key={e.name} fill={KW_COLORS[i % KW_COLORS.length]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="pt-16 text-center text-sm text-slate-400">No questions learned yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800"><ArrowRightLeft size={15} className="text-slate-500" /> AI vs Human handoff</p>
            <div className="flex items-center gap-4">
              <div className="h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="value" innerRadius={44} outerRadius={64} paddingAngle={3} stroke="none">
                      {donut.map((e) => <Cell key={e.name} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {donut.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs text-slate-600"><span className="h-3 w-3 rounded-sm" style={{ background: s.color }} /> {s.name}<span className="font-semibold text-slate-900">{s.value}</span></div>
                ))}
                <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">Channels learned: <span className="font-medium text-slate-700">{Object.entries(d.by_channel).map(([k, v]) => `${k} ${v}`).join(" · ") || "—"}</span></div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800"><GraduationCap size={15} className="text-[#68B642]" /> Recently learned agent replies</p>
            <div className="space-y-3">
              {d.recent_examples.map((e, i) => (
                <motion.div key={`${e.channel}-${e.user_question}-${i}`} {...ROW_FADE} transition={{ delay: i * 0.04 }} data-testid="learned-example-row" className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">{e.channel === "email" ? <Mail size={12} /> : <MessageSquare size={12} />} User asked: <span className="text-slate-700">“{e.user_question}”</span></p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600"><span className="font-medium text-[#30A90F]">Learned reply:</span> {e.agent_reply}</p>
                </motion.div>
              ))}
              {d.recent_examples.length === 0 && <p className="text-sm text-slate-400">No learned replies yet — reply to a chat or email as a human to teach the AI.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800"><MessageSquareQuote size={15} className="text-slate-500" /> Most-used canned responses</p>
            <div className="space-y-2">
              {d.top_canned.map((c) => (
                <div key={c.title} data-testid="top-canned-row" className="flex items-center justify-between">
                  <span className="truncate text-xs text-slate-600">{c.title}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-gradient-to-r from-[#68B642] to-[#30A90F]" style={{ width: `${Math.min(100, (c.usage_count / (d.top_canned[0]?.usage_count || 1)) * 100)}%` }} /></div>
                    <span className="w-6 text-right text-xs font-semibold text-slate-700">{c.usage_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
