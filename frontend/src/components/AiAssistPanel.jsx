import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Sparkles, Loader2, ClipboardCheck, ListChecks, X } from "lucide-react";
import { SentimentBadge } from "@/components/shared/UI";
import { toast } from "sonner";

export default function AiAssistPanel({ ticketId, chatId, onApply }) {
  const [suggestions, setSuggestions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadingS, setLoadingS] = useState(false);
  const [loadingSum, setLoadingSum] = useState(false);

  const getSuggestions = async () => {
    setLoadingS(true);
    try {
      const { data } = await api.aiReplySuggestions({ ticket_id: ticketId, chat_id: chatId });
      setSuggestions(data.suggestions || []);
    } catch (e) {
      toast.error("AI suggestion failed. Check LLM key balance.");
    } finally {
      setLoadingS(false);
    }
  };

  const getSummary = async () => {
    setLoadingSum(true);
    try {
      const { data } = await api.aiChatSummary({ ticket_id: ticketId, chat_id: chatId });
      setSummary(data);
    } catch (e) {
      toast.error("AI summary failed. Check LLM key balance.");
    } finally {
      setLoadingSum(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="ai-assist-panel">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600"><Sparkles size={15} /></div>
        <p className="text-sm font-semibold text-slate-900">AI Assist</p>
      </div>

      <div className="flex gap-2">
        <button
          data-testid="ai-generate-suggestions-btn"
          onClick={getSuggestions}
          disabled={loadingS}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          {loadingS ? <Loader2 size={13} className="animate-spin" /> : <ListChecks size={13} />} Suggest replies
        </button>
        <button
          data-testid="ai-generate-summary-btn"
          onClick={getSummary}
          disabled={loadingSum}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          {loadingSum ? <Loader2 size={13} className="animate-spin" /> : <ClipboardCheck size={13} />} Summarize
        </button>
      </div>

      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50/50 p-3"
            data-testid="ai-chat-summary-box"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-800">Conversation summary</p>
              <button onClick={() => setSummary(null)} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">{summary.summary}</p>
            {summary.points?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {summary.points.map((pt, i) => (
                  <li key={`pt-${i}`} className="flex gap-1.5 text-xs text-slate-600"><span className="text-blue-500">•</span>{pt}</li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex items-center gap-2">
              <SentimentBadge sentiment={summary.sentiment} />
              {summary.next && <span className="text-[11px] text-slate-500">Next: {summary.next}</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <motion.div
            key={`sug-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-slate-200 bg-white p-3"
            data-testid="ai-reply-suggestion-card"
          >
            <p className="text-xs leading-relaxed text-slate-700">{s}</p>
            <button
              data-testid="ai-apply-suggestion-btn"
              onClick={() => { onApply?.(s); toast.success("Reply drafted from AI suggestion"); }}
              className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-slate-700"
            >
              Use this reply
            </button>
          </motion.div>
        ))}
        {suggestions.length === 0 && !loadingS && (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            Generate smart replies & summaries for this conversation.
          </p>
        )}
      </div>
    </div>
  );
}
