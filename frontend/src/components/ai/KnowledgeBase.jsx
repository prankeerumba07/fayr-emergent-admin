import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Pill, EmptyState } from "@/components/shared/UI";
import { timeAgo } from "@/lib/constants";
import { toast } from "sonner";
import { BookOpen, Plus, Pencil, Trash2, FileText, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const CATS = ["Getting Started", "Rewards", "Refunds", "Verification", "Payments", "Trust & Safety", "Account", "Technical", "General"];
const CAT_COLOR = {
  "Getting Started": "border-indigo-200 bg-indigo-50 text-indigo-700",
  Rewards: "border-violet-200 bg-violet-50 text-violet-700",
  Refunds: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Verification: "border-blue-200 bg-blue-50 text-blue-700",
  Payments: "border-amber-200 bg-amber-50 text-amber-700",
  "Trust & Safety": "border-rose-200 bg-rose-50 text-rose-700",
  Account: "border-slate-200 bg-slate-100 text-slate-600",
  Technical: "border-cyan-200 bg-cyan-50 text-cyan-700",
  General: "border-slate-200 bg-slate-100 text-slate-600",
};

const empty = { title: "", category: "General", content: "" };

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => { const { data } = await api.getKbArticles(); setArticles(data); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (a) => { setEditing(a); setForm({ title: a.title, category: a.category, content: a.content }); setOpen(true); };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editing) { await api.updateKb(editing.id, { ...form, tags: [] }); toast.success("Article updated — AI will use it instantly"); }
    else { await api.createKb({ ...form, tags: [] }); toast.success("Article added to the AI's knowledge"); }
    setOpen(false); await load();
  };
  const remove = async (a) => { await api.deleteKb(a.id); toast.success("Article removed"); await load(); };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900"><BookOpen size={20} className="text-indigo-600" /> Knowledge Base</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Sparkles size={12} className="text-indigo-500" /> The AI reads these on every conversation. Edit anything and it applies immediately.</p>
          </div>
          <button data-testid="add-kb-btn" onClick={openNew} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-transform hover:scale-[1.03]"><Plus size={16} /> New article</button>
        </div>

        {articles.length === 0 && <EmptyState icon={FileText} title="No articles yet" subtitle="Add knowledge so the AI can answer accurately." />}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} data-testid="kb-article-card" className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-2 flex items-start justify-between gap-2">
                <Pill className={CAT_COLOR[a.category] || CAT_COLOR.General}>{a.category}</Pill>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button data-testid="edit-kb-btn" onClick={() => openEdit(a)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={13} /></button>
                  <button data-testid="delete-kb-btn" onClick={() => remove(a)} className="rounded-lg border border-slate-200 p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 size={13} /></button>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
              <p className="mt-1.5 line-clamp-4 flex-1 text-xs leading-relaxed text-slate-500">{a.content}</p>
              <p className="mt-3 text-[10px] text-slate-400">Updated {timeAgo(a.updated_at)}{a.source === "CLAUDE.md" ? " · seeded" : ""}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit article" : "New knowledge article"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <input data-testid="kb-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (e.g. Refund timelines)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            <select data-testid="kb-category-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea data-testid="kb-content-input" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder="What should the AI know?" className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400" />
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button data-testid="save-kb-btn" onClick={save} className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
