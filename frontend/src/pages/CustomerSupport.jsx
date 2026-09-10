import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import {
  Avatar, MarketplaceBadge, PriorityBadge, StatusBadge, SentimentBadge, EmptyState, Pill,
} from "@/components/shared/UI";
import AiAssistPanel from "@/components/AiAssistPanel";
import { timeAgo, slaLeft, PRESENCE_STYLE } from "@/lib/constants";
import { toast } from "sonner";
import {
  Inbox, MessageSquare, Send, StickyNote, Clock, AlertTriangle, UserPlus, ArrowRightLeft,
  CheckCircle2, Mail, Circle, Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const TICKET_FILTERS = ["all", "open", "pending", "escalated", "resolved"];

function TransferDialog({ open, onOpenChange, agents, onConfirm, kind = "ticket" }) {
  const [agentId, setAgentId] = useState("");
  const [note, setNote] = useState("");
  const [escalate, setEscalate] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer / Reassign {kind}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Transfer to agent</label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger data-testid="transfer-agent-select"><SelectValue placeholder="Choose an agent" /></SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${PRESENCE_STYLE[a.presence].dot}`} />
                      {a.name} · <span className="text-slate-400">{PRESENCE_STYLE[a.presence].label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Handover note (optional)</label>
            <textarea
              data-testid="transfer-note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Context for the receiving agent…"
              className="w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-slate-400"
            />
          </div>
          {kind === "ticket" && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={escalate} onChange={(e) => setEscalate(e.target.checked)} data-testid="transfer-escalate-checkbox" className="h-4 w-4 rounded border-slate-300" />
              Mark as escalated
            </label>
          )}
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            data-testid="confirm-transfer-btn"
            disabled={!agentId}
            onClick={() => { onConfirm(agentId, note, escalate); setAgentId(""); setNote(""); setEscalate(false); }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Confirm transfer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Email Inbox ------------------------------- */
function InboxView() {
  const { agents, currentAgent } = useApp();
  const csAgents = agents.filter((a) => a.team === "customer_support");
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [mode, setMode] = useState("reply");
  const [transferOpen, setTransferOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.getTickets({ status: filter, q: search || undefined });
    setTickets(data);
    setSelected((prev) => (prev ? data.find((t) => t.id === prev.id) || data[0] : data[0]) || null);
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const refreshSelected = async (id) => {
    const { data } = await api.getTicket(id);
    setSelected(data);
    setTickets((prev) => prev.map((t) => (t.id === id ? data : t)));
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await api.replyTicket(selected.id, { body: reply, mode, agent_name: currentAgent?.name || "You" });
      setReply("");
      await refreshSelected(selected.id);
      toast.success(mode === "note" ? "Internal note added" : "Reply sent to customer");
    } finally { setSending(false); }
  };

  const assign = async (agentId) => {
    await api.assignTicket(selected.id, agentId);
    await refreshSelected(selected.id);
    toast.success("Ticket assigned");
  };

  const transfer = async (agentId, note, escalate) => {
    await api.transferTicket(selected.id, { agent_id: agentId, note, escalate });
    setTransferOpen(false);
    await load();
    toast.success("Ticket transferred");
  };

  const setStatus = async (status) => {
    await api.setTicketStatus(selected.id, status);
    await load();
    toast.success(`Marked ${status}`);
  };

  const agentName = (id) => csAgents.find((a) => a.id === id)?.name;
  const agentObj = (id) => agents.find((a) => a.id === id);

  return (
    <div className="grid h-full grid-cols-[340px_1fr_320px] overflow-hidden">
      {/* list */}
      <div className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-3">
          <input
            data-testid="ticket-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-300 focus:bg-white"
          />
          <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5">
            {TICKET_FILTERS.map((f) => (
              <button
                key={f}
                data-testid={`ticket-filter-${f}`}
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tickets.length === 0 && <EmptyState icon={Inbox} title="No tickets" subtitle="Nothing matches this filter." />}
          {tickets.map((t) => {
            const sla = slaLeft(t.sla_due);
            const active = selected?.id === t.id;
            return (
              <button
                key={t.id}
                data-testid="ticket-list-item"
                onClick={() => setSelected(t)}
                className={`flex w-full flex-col gap-1.5 border-b border-slate-100 px-4 py-3 text-left transition-colors ${active ? "bg-blue-50/60" : "hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">{t.from_name}</span>
                  <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(t.created_at)}</span>
                </div>
                <p className="truncate text-xs text-slate-500">{t.subject}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <MarketplaceBadge name={t.marketplace} />
                  <PriorityBadge priority={t.priority} />
                  {sla.text !== "—" && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${sla.breached ? "text-rose-600" : "text-slate-400"}`}>
                      <Clock size={10} />{sla.text}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* conversation */}
      <div className="flex min-h-0 flex-col bg-slate-50">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-900">{selected.subject}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <Mail size={12} /> {selected.from_email}
                  <StatusBadge status={selected.status} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selected.status !== "resolved" && (
                  <button data-testid="resolve-ticket-btn" onClick={() => setStatus("resolved")} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                    <CheckCircle2 size={14} /> Resolve
                  </button>
                )}
                <button data-testid="transfer-ticket-button" onClick={() => setTransferOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <ArrowRightLeft size={14} /> Transfer
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              {selected.messages.map((m) => {
                if (m.author_type === "system") {
                  return <div key={m.id} className="text-center"><Pill className="border-slate-200 bg-white text-slate-500 normal-case">{m.body}</Pill></div>;
                }
                const isNote = m.author_type === "note";
                const isCustomer = m.author_type === "customer";
                return (
                  <div key={m.id} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[78%] rounded-2xl border p-4 ${isNote ? "border-amber-200 bg-amber-50" : isCustomer ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900 text-white"}`}>
                      <div className="mb-1 flex items-center gap-2">
                        <span className={`text-xs font-semibold ${isCustomer || isNote ? "text-slate-700" : "text-white"}`}>{m.author_name}</span>
                        {isNote && <Pill className="border-amber-300 bg-amber-100 text-amber-800"><StickyNote size={10} /> Note</Pill>}
                        <span className={`text-[10px] ${isCustomer || isNote ? "text-slate-400" : "text-slate-300"}`}>{timeAgo(m.created_at)}</span>
                      </div>
                      <p className={`whitespace-pre-wrap text-sm leading-relaxed ${isCustomer || isNote ? "text-slate-700" : "text-slate-100"}`}>{m.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* composer */}
            <div className="border-t border-slate-200 bg-white p-4">
              <div className="mb-2 flex gap-1">
                <button data-testid="reply-mode-tab-reply" onClick={() => setMode("reply")} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === "reply" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>Reply to customer</button>
                <button data-testid="reply-mode-tab-note" onClick={() => setMode("note")} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === "note" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"}`}>Internal note</button>
              </div>
              <textarea
                data-testid="reply-composer-textarea"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder={mode === "note" ? "Add an internal note (not visible to customer)…" : "Type your reply…"}
                className={`w-full resize-none rounded-xl border p-3 text-sm outline-none focus:border-slate-400 ${mode === "note" ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}
              />
              <div className="mt-2 flex justify-end">
                <button
                  data-testid="send-reply-btn"
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {mode === "note" ? "Add note" : "Send reply"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState icon={Inbox} title="Select a ticket" subtitle="Choose a ticket from the shared inbox to view the conversation." />
        )}
      </div>

      {/* right rail */}
      <div className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white p-5">
        {selected && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
              <div className="mt-2 flex items-center gap-3">
                <Avatar name={selected.from_name} size={40} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selected.from_name}</p>
                  <p className="text-xs text-slate-500">{selected.from_email}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <MarketplaceBadge name={selected.marketplace} />
                <SentimentBadge sentiment={selected.sentiment} />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Assigned agent</p>
              <Select value={selected.assignee_id || ""} onValueChange={assign}>
                <SelectTrigger data-testid="agent-assignment-select">
                  <SelectValue placeholder="Unassigned">
                    {selected.assignee_id ? (
                      <span className="flex items-center gap-2">
                        <Avatar src={agentObj(selected.assignee_id)?.avatar} name={agentName(selected.assignee_id)} size={20} />
                        {agentName(selected.assignee_id)}
                      </span>
                    ) : "Unassigned"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {csAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id} data-testid={`assign-agent-${a.id}`}>
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${PRESENCE_STYLE[a.presence].dot}`} />
                        {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <AiAssistPanel ticketId={selected.id} onApply={(s) => { setMode("reply"); setReply(s); }} />
            </div>
          </div>
        )}
      </div>

      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} agents={agents.filter((a) => a.team === "customer_support")} onConfirm={transfer} kind="ticket" />
    </div>
  );
}

/* ------------------------------- Live Chat ------------------------------- */
function ChatView() {
  const { agents, currentAgent } = useApp();
  const csAgents = agents.filter((a) => a.team === "customer_support");
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.getChats();
    setChats(data);
    setSelected((prev) => (prev ? data.find((c) => c.id === prev.id) || data[0] : data[0]) || null);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async (id) => {
    const { data } = await api.getChat(id);
    setSelected(data);
    setChats((prev) => prev.map((c) => (c.id === id ? data : c)));
  };

  const send = async () => {
    if (!msg.trim() || !selected) return;
    await api.sendChatMessage(selected.id, { body: msg, agent_name: currentAgent?.name || "You" });
    setMsg("");
    await refresh(selected.id);
  };

  const pickup = async () => {
    await api.assignChat(selected.id, currentAgent.id);
    await load();
    toast.success("Chat assigned to you");
  };

  const transfer = async (agentId, note) => {
    await api.transferChat(selected.id, { agent_id: agentId, note });
    setTransferOpen(false);
    await load();
    toast.success("Chat transferred");
  };

  const agentObj = (id) => agents.find((a) => a.id === id);

  return (
    <div className="grid h-full grid-cols-[320px_1fr_320px] overflow-hidden">
      <div className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">Live Chats</p>
          <p className="text-xs text-slate-400">{chats.filter((c) => c.status === "waiting").length} waiting in queue</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {chats.map((c) => {
            const active = selected?.id === c.id;
            return (
              <button
                key={c.id}
                data-testid="chat-item"
                onClick={() => setSelected(c)}
                className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors ${active ? "bg-blue-50/60" : "hover:bg-slate-50"}`}
              >
                <Avatar name={c.customer_name} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-sm font-semibold text-slate-800">{c.customer_name}</span>
                    {c.waiting && <span className="flex h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
                  </div>
                  <p className="truncate text-xs text-slate-500">{c.messages[c.messages.length - 1]?.body}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <StatusBadge status={c.status} />
                    <SentimentBadge sentiment={c.sentiment} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-col bg-slate-50">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
              <div className="flex items-center gap-3">
                <Avatar name={selected.customer_name} size={38} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selected.customer_name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Circle size={7} className="fill-emerald-500 text-emerald-500" /> {selected.marketplace} · started {timeAgo(selected.started_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!selected.assignee_id && (
                  <button data-testid="chat-pickup-btn" onClick={pickup} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                    <UserPlus size={14} /> Pick up
                  </button>
                )}
                <button data-testid="chat-transfer-btn" onClick={() => setTransferOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <ArrowRightLeft size={14} /> Transfer
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6">
              {selected.messages.map((m) => {
                if (m.author_type === "system") {
                  return <div key={m.id} className="text-center"><Pill className="border-slate-200 bg-white text-slate-500 normal-case">{m.body}</Pill></div>;
                }
                const isCustomer = m.author_type === "customer";
                return (
                  <div key={m.id} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isCustomer ? "rounded-tl-sm border border-slate-200 bg-white text-slate-700" : "rounded-tr-sm bg-slate-900 text-white"}`}>
                      <p className="text-sm leading-relaxed">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${isCustomer ? "text-slate-400" : "text-slate-400"}`}>{timeAgo(m.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <input
                  data-testid="chat-message-input"
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Type a message…"
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                />
                <button data-testid="chat-send-btn" onClick={send} disabled={!msg.trim()} className="rounded-xl bg-slate-900 p-2.5 text-white transition-colors hover:bg-slate-700 disabled:opacity-50">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState icon={MessageSquare} title="No chat selected" subtitle="Pick a conversation from the live queue." />
        )}
      </div>

      <div className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white p-5">
        {selected && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Visitor</p>
              <div className="mt-2 flex items-center gap-3">
                <Avatar name={selected.customer_name} size={40} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selected.customer_name}</p>
                  <p className="text-xs text-slate-500">{selected.customer_email}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <MarketplaceBadge name={selected.marketplace} />
                <SentimentBadge sentiment={selected.sentiment} />
                <StatusBadge status={selected.status} />
              </div>
              {selected.assignee_id && (
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  Handling: <span className="font-medium text-slate-700">{agentObj(selected.assignee_id)?.name}</span>
                </p>
              )}
            </div>
            <div className="border-t border-slate-100 pt-4">
              <AiAssistPanel chatId={selected.id} />
            </div>
          </div>
        )}
      </div>

      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} agents={csAgents} onConfirm={transfer} kind="chat" />
    </div>
  );
}

export default function CustomerSupport() {
  const [tab, setTab] = useState("inbox");
  const [metrics, setMetrics] = useState(null);
  useEffect(() => { api.getMetrics("customer_support").then(({ data }) => setMetrics(data)); }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900" data-testid="page-title">Customer Support</h1>
          <p className="text-xs text-slate-500">Omnichannel inbox — email tickets & live chat routing</p>
        </div>
        <div className="flex items-center gap-4">
          {metrics && (
            <div className="hidden items-center gap-4 lg:flex">
              <Metric label="Open" value={metrics.open} tone="text-emerald-600" />
              <Metric label="Escalated" value={metrics.escalated} tone="text-rose-600" />
              <Metric label="Chats waiting" value={metrics.chats_waiting} tone="text-amber-600" />
              <Metric label="SLA" value={`${metrics.sla_compliance}%`} tone="text-slate-900" />
            </div>
          )}
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button data-testid="tab-inbox" onClick={() => setTab("inbox")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === "inbox" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
              <Inbox size={15} /> Inbox
            </button>
            <button data-testid="tab-chat" onClick={() => setTab("chat")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === "chat" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
              <MessageSquare size={15} /> Live Chat
            </button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-full">
            {tab === "inbox" ? <InboxView /> : <ChatView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const Metric = ({ label, value, tone }) => (
  <div className="text-center">
    <p className={`text-lg font-bold leading-none ${tone}`}>{value}</p>
    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
  </div>
);
