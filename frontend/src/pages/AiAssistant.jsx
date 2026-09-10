import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, MessageSquare, Mail, BookOpen, MessageSquareQuote, BarChart3, Sparkles } from "lucide-react";
import AiLiveChat from "@/components/ai/AiLiveChat";
import AiEmail from "@/components/ai/AiEmail";
import KnowledgeBase from "@/components/ai/KnowledgeBase";
import CannedResponses from "@/components/ai/CannedResponses";
import TrainingInsights from "@/components/ai/TrainingInsights";

const TABS = [
  { key: "chat", label: "AI Live Chat", icon: MessageSquare, C: AiLiveChat },
  { key: "email", label: "AI Email", icon: Mail, C: AiEmail },
  { key: "kb", label: "Knowledge Base", icon: BookOpen, C: KnowledgeBase },
  { key: "canned", label: "Canned Responses", icon: MessageSquareQuote, C: CannedResponses },
  { key: "insights", label: "Training Insights", icon: BarChart3, C: TrainingInsights },
];

export default function AiAssistant() {
  const [tab, setTab] = useState("chat");
  const Active = TABS.find((t) => t.key === tab).C;

  return (
    <div className="flex h-full flex-col">
      <div className="relative overflow-hidden border-b border-slate-200/70 bg-white/70 px-8 py-5 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-200/50 to-violet-200/40 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
              <Bot size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900" data-testid="page-title">Fayr Assistant</h1>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Sparkles size={12} className="text-indigo-500" /> Autonomous AI support · learns from every reply · powered by Claude Sonnet 4.6
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white/80 p-1 backdrop-blur">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  data-testid={`ai-tab-${t.key}`}
                  onClick={() => setTab(t.key)}
                  className={`relative inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${active ? "text-white" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {active && <motion.span layoutId="ai-tab-pill" className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                  <Icon size={15} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-slate-50/60">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-full">
            <Active />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
