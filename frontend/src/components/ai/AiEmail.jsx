import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { Avatar, MarketplaceBadge, StatusBadge, Pill, EmptyState } from "@/components/shared/UI";
import { timeAgo } from "@/lib/constants";
import { toast } from "sonner";
import { Bot, Sparkles, Send, Loader2, Mail, CheckCircle2, PencilLine, Zap } from "lucide-react";

function confTone(c) {
  if (c == null) return "text-slate-500";
  if (c >= 0.7) return "text-emerald-600";
  if (c >= 0.45) return "text-amber-600";
  return "text-rose-600";
}

const RESULT_MOTION = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export default function AiEmail() {
  const { currentAgent } = useApp();
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.getTickets({ status: "all" });
    setTickets(data);
    setSelected((prev) => (prev ? data.find((t) => t.id === prev.id) || data[0] : data[0]) || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setResult(null); setDraft(""); }, [selected?.id]);

  const refresh = async (id) => { const { data } = await api.getTicket(id); setSelected(data); setTickets((p) => p.map((t) => (t.id === id ? data : t))); };

  const process = async () => {
    if (!selected) return;
    setProcessing(true); setResult(null);
    try {
      const { data } = await api.aiProcessTicket(selected.id);
      setResult(data);
      setSelected(data.ticket); setTickets((p) => p.map((t) => (t.id === data.ticket.id ? data.ticket : t)));
      if (data.mode === "sent") toast.success("AI auto-sent a reply to the customer");
      else { setDraft(data.draft); toast.info("AI drafted a reply for your review"); }
    } finally { setProcessing(false); }
  };

  const approveDraft = async () => {
    await api.replyTicket(selected.id, { body: draft, mode: "reply", agent_name: currentAgent?.name || "Agent" });
    setResult(null); setDraft("");
    await refresh(selected.id);
    toast.success("Sent — AI learned from your final version");
  };

  return (
    <div className="grid h-full grid-cols-[320px_1fr] overflow-hidden">
      <div className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3"><p className="text-sm font-semibold text-slate-800">Email tickets</p><p className="text-xs text-slate-400">AI auto-sends simple replies · drafts complex ones</p></div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tickets.map((t) => {
            const active = selected?.id === t.id;
            return (
              <button key={t.id} data-testid="ai-email-item" onClick={() => setSelected(t)} className={`flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-3 text-left transition-colors ${active ? "bg-indigo-50/70" : "hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between"><span className="truncate text-sm font-semibold text-slate-800">{t.from_name}</span><span className="text-[10px] text-slate-400">{timeAgo(t.created_at)}</span></div>
                <p className="truncate text-xs text-slate-500">{t.subject}</p>
                <div className="flex items-center gap-1.5"><MarketplaceBadge name={t.marketplace} />{t.ai_handled && <Pill className="border-indigo-200 bg-indigo-50 text-indigo-700"><Bot size={10} /> AI replied</Pill>}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-col bg-slate-50/60">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-900">{selected.subject}</h3>
                <p className="flex items-center gap-1.5 text-xs text-slate-500"><Mail size={12} /> {selected.from_email} <StatusBadge status={selected.status} /></p>
              </div>
              <button data-testid="ai-process-btn" onClick={process} disabled={processing} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform hover:scale-[1.03] disabled:opacity-60">
                {processing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Let AI handle this
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              {selected.messages.map((m) => {
                if (m.author_type === "system") return <div key={m.id} className="text-center"><Pill className="border-slate-200 bg-white text-slate-500 normal-case">{m.body}</Pill></div>;
                const isCustomer = m.author_type === "customer";
                const isNote = m.author_type === "note";
                const isAi = m.ai;
                return (
                  <div key={m.id} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[78%] rounded-2xl border p-4 ${isNote ? "border-amber-200 bg-amber-50" : isCustomer ? "border-slate-200 bg-white" : isAi ? "border-transparent bg-gradient-to-br from-indigo-600 to-violet-600 text-white" : "border-slate-800 bg-slate-900 text-white"}`}>
                      <p className={`mb-1 flex items-center gap-1 text-xs font-semibold ${isCustomer || isNote ? "text-slate-700" : "text-white/90"}`}>{isAi && <Bot size={11} />}{m.author_name}</p>
                      <p className={`whitespace-pre-wrap text-sm leading-relaxed ${isCustomer || isNote ? "text-slate-700" : "text-white"}`}>{m.body}</p>
                    </div>
                  </div>
                );
              })}

              {result && (
                <motion.div {...RESULT_MOTION} data-testid="ai-email-result" className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      {result.mode === "sent" ? <><Zap size={15} className="text-emerald-600" /> Auto-sent by AI</> : <><PencilLine size={15} className="text-amber-600" /> AI draft — needs your review</>}
                    </p>
                    <span className={`text-xs font-semibold ${confTone(result.confidence)}`}>{Math.round((result.confidence || 0) * 100)}% confidence</span>
                  </div>
                  {result.canned_used && <p className="mb-2 text-[11px] text-slate-400">Based on canned response: <span className="font-medium text-slate-600">{result.canned_used}</span></p>}
                  {result.mode === "draft" ? (
                    <>
                      <textarea data-testid="ai-draft-textarea" value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400" />
                      <div className="mt-2 flex justify-end gap-2">
                        <button onClick={() => { setResult(null); setDraft(""); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Discard</button>
                        <button data-testid="approve-draft-btn" onClick={approveDraft} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"><Send size={13} /> Approve & send</button>
                      </div>
                    </>
                  ) : (
                    <p className="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 size={14} /> Reply delivered to the customer and added to the thread above.</p>
                  )}
                </motion.div>
              )}
            </div>
          </>
        ) : <EmptyState icon={Mail} title="Select a ticket" subtitle="Pick an email and let the AI draft or send a reply." />}
      </div>
    </div>
  );
}
