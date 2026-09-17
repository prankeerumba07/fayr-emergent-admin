import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { Avatar, MarketplaceBadge, SentimentBadge, Pill, EmptyState } from "@/components/shared/UI";
import { timeAgo } from "@/lib/constants";
import { toast } from "sonner";
import {
  Bot, Send, Plus, UserRound, Sparkles, ArrowRightLeft, Hand, Gauge, GraduationCap, ShieldQuestion, Frown, User2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MKTS = ["Amazon", "Flipkart", "Meesho", "Myntra"];
const QUICK = ["hello", "when will I get my refund?", "my withdrawal failed", "I want to talk to a human agent", "this is ridiculous, my refund is stuck!!"];
const THINKING_MOTION = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 } };
const DOT_ANIM = { opacity: [0.3, 1, 0.3] };

function confTone(c) {
  if (c == null) return { c: "text-slate-500", bar: "bg-slate-300" };
  if (c >= 0.7) return { c: "text-emerald-600", bar: "bg-emerald-500" };
  if (c >= 0.45) return { c: "text-amber-600", bar: "bg-amber-500" };
  return { c: "text-rose-600", bar: "bg-rose-500" };
}

function chatBubbleClass(isCustomer, isAi) {
  if (isCustomer) return "rounded-tl-sm border border-slate-200 bg-white text-slate-700";
  if (isAi) return "rounded-tr-sm bg-gradient-to-br from-[#68B642] to-[#30A90F] text-white shadow-md shadow-[#68B642]/20";
  return "rounded-tr-sm bg-slate-900 text-white";
}

export default function AiLiveChat() {
  const { currentAgent, agents } = useApp();
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [speakAs, setSpeakAs] = useState("customer");
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [aiMeta, setAiMeta] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ customer_name: "", marketplace: "Amazon", message: "hello" });
  const endRef = useRef(null);

  const load = useCallback(async () => {
    const { data } = await api.getChats();
    setChats(data);
    setSelected((prev) => (prev ? data.find((c) => c.id === prev.id) || prev : data.find((c) => c.handled_by === "ai") || data[0]) || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (selected) setSpeakAs(selected.ai_active ? "customer" : "agent"); }, [selected?.id, selected?.ai_active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selected?.messages?.length, thinking]);

  const upsert = (chat) => { setSelected(chat); setChats((prev) => { const has = prev.find((c) => c.id === chat.id); return has ? prev.map((c) => (c.id === chat.id ? chat : c)) : [chat, ...prev]; }); };

  const send = async () => {
    if (!input.trim() || !selected) return;
    const text = input; setInput("");
    if (speakAs === "customer") {
      const optimistic = { ...selected, messages: [...selected.messages, { id: "tmp", author_type: "customer", author_name: selected.customer_name, body: text, created_at: new Date().toISOString() }] };
      setSelected(optimistic);
      setThinking(true);
      try {
        const { data } = await api.customerMessage(selected.id, { body: text });
        upsert(data.chat); setAiMeta(data.ai);
        if (data.ai?.handoff) { toast.warning("AI handed off to a human agent"); setSpeakAs("agent"); }
      } finally { setThinking(false); }
    } else {
      const { data } = await api.sendChatMessage(selected.id, { body: text, agent_name: currentAgent?.name || "Agent" });
      upsert(data);
      toast.success("Sent — AI captured this reply to learn from");
    }
  };

  const createChat = async () => {
    if (!form.customer_name.trim()) return;
    setThinking(true);
    try {
      const { data } = await api.startChat(form);
      setNewOpen(false); setForm({ customer_name: "", marketplace: "Amazon", message: "hello" });
      upsert(data.chat); setAiMeta(data.ai);
    } finally { setThinking(false); }
  };

  const takeover = async () => {
    const { data } = await api.assignChat(selected.id, currentAgent.id);
    upsert(data); setSpeakAs("agent");
    toast.success(`${currentAgent.name} took over from AI`);
  };
  const resumeAi = async () => {
    const { data } = await api.resumeAi(selected.id);
    upsert(data); setSpeakAs("customer");
    toast.success("Fayr Assistant resumed this chat");
  };
  const handoff = async () => {
    const { data } = await api.chatHandoff(selected.id, "Manual handoff by operator");
    upsert(data); setSpeakAs("agent");
    toast.warning("Handed off to human queue");
  };

  return (
    <div className="grid h-full grid-cols-[300px_1fr_300px] overflow-hidden">
      {/* list */}
      <div className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">Conversations</p>
          <button data-testid="new-chat-btn" onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#68B642] to-[#30A90F] px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition-transform hover:scale-[1.03]">
            <Plus size={13} /> Simulate
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {chats.length === 0 && <EmptyState icon={Bot} title="No chats yet" subtitle="Click Simulate to start a customer chat." />}
          {chats.map((c) => {
            const active = selected?.id === c.id;
            return (
              <button key={c.id} data-testid="ai-chat-item" onClick={() => setSelected(c)} className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors ${active ? "bg-[#F1F5DB]/70" : "hover:bg-slate-50"}`}>
                <Avatar name={c.customer_name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-sm font-semibold text-slate-800">{c.customer_name}</span>
                    <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(c.last_at)}</span>
                  </div>
                  <p className="truncate text-xs text-slate-500">{c.messages[c.messages.length - 1]?.body}</p>
                  <div className="mt-1">
                    {c.ai_active ? (
                      <Pill className="border-[#C7E7B4] bg-[#F1F5DB] text-[#218200]"><Bot size={10} /> AI handling</Pill>
                    ) : (
                      <Pill className="border-slate-200 bg-slate-100 text-slate-600"><User2 size={10} /> Human</Pill>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* conversation */}
      <div className="flex min-h-0 flex-col bg-slate-50/60">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur">
              <div className="flex items-center gap-3">
                <Avatar name={selected.customer_name} size={38} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selected.customer_name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500"><MarketplaceBadge name={selected.marketplace} /> · started {timeAgo(selected.started_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selected.ai_active ? (
                  <>
                    <Pill className="border-[#C7E7B4] bg-[#F1F5DB] text-[#218200]"><Bot size={11} /> AI active</Pill>
                    <button data-testid="chat-handoff-btn" onClick={handoff} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><Hand size={13} /> Hand off</button>
                  </>
                ) : (
                  <>
                    <button data-testid="chat-takeover-btn" onClick={takeover} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"><UserRound size={13} /> Take over</button>
                    <button data-testid="chat-resume-ai-btn" onClick={resumeAi} className="inline-flex items-center gap-1.5 rounded-lg border border-[#C7E7B4] bg-[#F1F5DB] px-3 py-2 text-xs font-medium text-[#218200] hover:bg-[#EAF7E4]"><Bot size={13} /> Resume AI</button>
                  </>
                )}
              </div>
            </div>

            {!selected.ai_active && (
              <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-xs text-amber-800" data-testid="handoff-banner">
                <ArrowRightLeft size={14} /> {selected.handoff_reason ? `Handed to a human — ${selected.handoff_reason}.` : "This chat is being handled by a human agent."}
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6">
              {selected.messages.map((m) => {
                if (m.author_type === "system") return <div key={m.id} className="text-center"><Pill className="border-slate-200 bg-white text-slate-500 normal-case">{m.body}</Pill></div>;
                const isCustomer = m.author_type === "customer";
                const isAi = m.ai;
                return (
                  <div key={m.id} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${chatBubbleClass(isCustomer, isAi)}`}>
                      {!isCustomer && <p className={`mb-0.5 flex items-center gap-1 text-[10px] font-semibold ${isAi ? "text-[#EAF7E4]" : "text-slate-300"}`}>{isAi ? <><Bot size={10} /> Fayr Assistant</> : m.author_name}</p>}
                      <p className="text-sm leading-relaxed">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${isCustomer ? "text-slate-400" : "text-white/60"}`}>{timeAgo(m.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <AnimatePresence>
                {thinking && (
                  <motion.div {...THINKING_MOTION} className="flex justify-end">
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#68B642] to-[#30A90F] px-4 py-3 shadow-md">
                      {[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-white/80" animate={DOT_ANIM} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={endRef} />
            </div>

            <div className="border-t border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-1">
                <span className="mr-1 text-[11px] font-medium text-slate-400">Speak as</span>
                <button data-testid="speak-as-customer" onClick={() => setSpeakAs("customer")} className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${speakAs === "customer" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>Customer</button>
                <button data-testid="speak-as-agent" onClick={() => setSpeakAs("agent")} className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${speakAs === "agent" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>Agent</button>
                {speakAs === "customer" && selected.ai_active && <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-[#68B642]"><Sparkles size={11} /> AI will auto-reply</span>}
              </div>
              {speakAs === "customer" && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {QUICK.map((q) => <button key={q} onClick={() => setInput(q)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-100">{q}</button>)}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  data-testid="ai-chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !thinking && send()}
                  placeholder={speakAs === "customer" ? "Type a message as the customer…" : "Reply as a human agent…"}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#68B642]"
                />
                <button data-testid="ai-chat-send" onClick={send} disabled={thinking || !input.trim()} className="rounded-xl bg-gradient-to-r from-[#68B642] to-[#30A90F] p-2.5 text-white transition-transform hover:scale-105 disabled:opacity-50">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState icon={Bot} title="Start a conversation" subtitle="Click Simulate to see the AI greet and help a customer." />
        )}
      </div>

      {/* right rail */}
      <div className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white p-5">
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#EAF7E4] bg-gradient-to-b from-[#F1F5DB]/60 to-white p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"><Gauge size={14} className="text-[#30A90F]" /> Last AI decision</p>
            {aiMeta ? (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs"><span className="text-slate-500">Confidence</span><span className={`font-semibold ${confTone(aiMeta.confidence).c}`}>{Math.round((aiMeta.confidence || 0) * 100)}%</span></div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><motion.div className={`h-full ${confTone(aiMeta.confidence).bar}`} initial={{ width: 0 }} animate={{ width: `${(aiMeta.confidence || 0) * 100}%` }} /></div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">Sentiment <SentimentBadge sentiment={aiMeta.sentiment} /></div>
                {aiMeta.handoff && <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800">Handed off: {aiMeta.reason}</p>}
              </div>
            ) : <p className="mt-2 text-xs text-slate-400">Send a message to see the AI's live confidence & sentiment read.</p>}
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800"><ArrowRightLeft size={14} className="text-slate-500" /> Handoff triggers</p>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5"><UserRound size={14} className="text-slate-400" /> User asks for a human agent</li>
              <li className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5"><ShieldQuestion size={14} className="text-slate-400" /> AI confidence below 45%</li>
              <li className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5"><Frown size={14} className="text-slate-400" /> User is frustrated / angry</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800"><GraduationCap size={14} /> Continuous learning</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-700">Every time you reply as a human agent, that reply is captured into the AI's memory and used on future chats — so it keeps sounding more like your team.</p>
          </div>
        </div>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Simulate an incoming chat</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Customer name</label>
              <input data-testid="new-chat-name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="e.g. Rahul Gupta" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#68B642]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Marketplace</label>
              <Select value={form.marketplace} onValueChange={(v) => setForm({ ...form, marketplace: v })}>
                <SelectTrigger data-testid="new-chat-marketplace"><SelectValue /></SelectTrigger>
                <SelectContent>{MKTS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">First message</label>
              <input data-testid="new-chat-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#68B642]" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setNewOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button data-testid="create-chat-confirm" onClick={createChat} disabled={!form.customer_name.trim() || thinking} className="rounded-lg bg-gradient-to-r from-[#68B642] to-[#30A90F] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Start chat</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
