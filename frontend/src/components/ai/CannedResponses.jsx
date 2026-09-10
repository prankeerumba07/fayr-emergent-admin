import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Pill, EmptyState } from "@/components/shared/UI";
import { toast } from "sonner";
import { MessageSquareQuote, Plus, Pencil, Trash2, TrendingUp, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const CATS = ["Refunds", "Verification", "Payments", "Rewards", "Technical", "General"];
const CHANNELS = ["both", "email", "chat"];
const empty = { title: "", category: "General", channel: "both", body: "" };

export default function CannedResponses() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => { const { data } = await api.getCanned(); setItems(data); }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ title: c.title, category: c.category, channel: c.channel, body: c.body }); setOpen(true); };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    if (editing) { await api.updateCanned(editing.id, form); toast.success("Canned response updated — AI adopts your new wording"); }
    else { await api.createCanned(form); toast.success("Canned response added"); }
    setOpen(false); await load();
  };
  const remove = async (c) => { await api.deleteCanned(c.id); toast.success("Removed"); await load(); };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900"><MessageSquareQuote size={20} className="text-indigo-600" /> Canned Responses</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Sparkles size={12} className="text-indigo-500" /> Reusable replies the AI draws from. Update one and the AI instantly answers in your new words.</p>
          </div>
          <button data-testid="add-canned-btn" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-transform hover:scale-[1.03]"><Plus size={16} /> New response</button>
        </div>

        {items.length === 0 && <EmptyState icon={MessageSquareQuote} title="No canned responses" subtitle="Add some for the AI to reuse." />}
        <div className="space-y-3">
          {items.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} data-testid="canned-row" className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{c.title}</h3>
                  <Pill className="border-slate-200 bg-slate-100 text-slate-600">{c.category}</Pill>
                  <Pill className="border-indigo-200 bg-indigo-50 text-indigo-700">{c.channel}</Pill>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><TrendingUp size={11} /> used {c.usage_count}×</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">{c.body}</p>
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button data-testid="edit-canned-btn" onClick={() => openEdit(c)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={13} /></button>
                <button data-testid="delete-canned-btn" onClick={() => remove(c)} className="rounded-lg border border-slate-200 p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={13} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit canned response" : "New canned response"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <input data-testid="canned-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            <div className="flex gap-2">
              <select data-testid="canned-category-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select data-testid="canned-channel-select" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <textarea data-testid="canned-body-input" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} placeholder="The reply text…" className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400" />
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button data-testid="save-canned-btn" onClick={save} className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
