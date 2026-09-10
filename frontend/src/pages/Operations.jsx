import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { StatCard, MarketplaceBadge, StatusBadge, Pill, EmptyState, Avatar } from "@/components/shared/UI";
import { timeAgo } from "@/lib/constants";
import { toast } from "sonner";
import {
  ShieldCheck, FileSearch, CheckCircle2, XCircle, Eye, Clock, AlertTriangle, ScanLine, Gauge,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const VIS_STYLE = {
  passed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
};

const ROW_FADE = { initial: { opacity: 0 }, animate: { opacity: 1 } };

export default function Operations() {
  const { agents } = useApp();
  const [claims, setClaims] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    const [c, m] = await Promise.all([api.getClaims(filter), api.getMetrics("operations")]);
    setClaims(c.data);
    setMetrics(m.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id, approve) => {
    if (approve) await api.approveClaim(id);
    else await api.rejectClaim(id, "Insufficient / mismatched evidence");
    await load();
    toast[approve ? "success" : "error"](approve ? "Claim approved — review verified" : "Claim rejected");
  };

  const agentObj = (id) => agents.find((a) => a.id === id);
  const filters = ["pending", "approved", "rejected", "all"];

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-slate-700" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900" data-testid="page-title">Operations — Review Verification</h1>
        </div>
        <p className="mt-1 text-xs text-slate-500">OCR proof inspection & public-visibility checks before any refund is released</p>
      </div>

      <div className="space-y-6 p-8">
        {metrics && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={FileSearch} label="Pending review" value={metrics.pending} tone="bg-amber-50 text-amber-600" accent="text-amber-600" index={0} />
            <StatCard icon={CheckCircle2} label="Approved" value={metrics.approved} tone="bg-emerald-50 text-emerald-600" accent="text-emerald-600" index={1} />
            <StatCard icon={AlertTriangle} label="Failed visibility" value={metrics.failed_visibility} tone="bg-rose-50 text-rose-600" accent="text-rose-600" index={2} />
            <StatCard icon={Gauge} label="Avg review time" value={`${metrics.avg_review_mins}m`} sub="per claim" index={3} />
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-800">Verification queue</p>
            <div className="flex gap-1">
              {filters.map((f) => (
                <button key={f} onClick={() => setFilter(f)} data-testid={`claim-filter-${f}`} className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{f}</button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">User & Product</th>
                  <th className="px-4 py-3 font-medium">Marketplace</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">OCR confidence</th>
                  <th className="px-4 py-3 font-medium">Visibility</th>
                  <th className="px-4 py-3 font-medium">Reviewer</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <motion.tr key={c.id} {...ROW_FADE} data-testid="ocr-claim-row" className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{c.user_name}</p>
                      <p className="max-w-[220px] truncate text-xs text-slate-500">{c.product_title}</p>
                      <p className="font-mono text-[10px] text-slate-400">#{c.order_id}</p>
                    </td>
                    <td className="px-4 py-3"><MarketplaceBadge name={c.marketplace} /></td>
                    <td className="px-4 py-3 font-mono text-slate-700">₹{c.claim_amount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full ${c.ocr_confidence > 0.8 ? "bg-emerald-500" : c.ocr_confidence > 0.6 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${c.ocr_confidence * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{Math.round(c.ocr_confidence * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Pill className={VIS_STYLE[c.visibility_check]}><Eye size={10} /> {c.visibility_check}</Pill></td>
                    <td className="px-4 py-3">
                      {c.assignee_id ? (
                        <span className="flex items-center gap-2 text-xs text-slate-600"><Avatar src={agentObj(c.assignee_id)?.avatar} name={agentObj(c.assignee_id)?.name} size={22} />{agentObj(c.assignee_id)?.name}</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button data-testid="ocr-image-preview" onClick={() => setPreview(c)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100" title="Inspect proof"><ScanLine size={14} /></button>
                        {c.status === "pending" ? (
                          <>
                            <button data-testid="approve-claim-btn" onClick={() => decide(c.id, true)} className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100" title="Approve"><CheckCircle2 size={14} /></button>
                            <button data-testid="reject-claim-btn" onClick={() => decide(c.id, false)} className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100" title="Reject"><XCircle size={14} /></button>
                          </>
                        ) : <StatusBadge status={c.status} />}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {claims.length === 0 && <EmptyState icon={FileSearch} title="Queue empty" subtitle="No claims match this filter." />}
          </div>
        </div>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>OCR Proof Inspection</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={preview.user_name} size={40} />
                <div>
                  <p className="text-sm font-semibold">{preview.user_name}</p>
                  <p className="text-xs text-slate-500">{preview.user_mobile}</p>
                </div>
                <div className="ml-auto"><MarketplaceBadge name={preview.marketplace} /></div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-900 p-4">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><ScanLine size={12} /> Extracted OCR text</p>
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-emerald-300">{preview.ocr_text}</pre>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-400">Order ID</p><p className="font-mono font-medium text-slate-700">{preview.order_id}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-400">Claim amount</p><p className="font-medium text-slate-700">₹{preview.claim_amount}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-400">OCR confidence</p><p className="font-medium text-slate-700">{Math.round(preview.ocr_confidence * 100)}%</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-400">Visibility check</p><Pill className={VIS_STYLE[preview.visibility_check]}>{preview.visibility_check}</Pill></div>
              </div>
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                <AlertTriangle size={12} className="mr-1 inline" /> OCR is supporting evidence only — it never auto-approves or moves money. Holding period + visibility check + finance gate still apply.
              </p>
              {preview.status === "pending" && (
                <div className="flex justify-end gap-2">
                  <button onClick={() => { decide(preview.id, false); setPreview(null); }} className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100">Reject</button>
                  <button onClick={() => { decide(preview.id, true); setPreview(null); }} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Approve claim</button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
