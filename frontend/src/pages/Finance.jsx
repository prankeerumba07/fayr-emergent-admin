import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { StatCard, MarketplaceBadge, StatusBadge, Pill, Avatar } from "@/components/shared/UI";
import { inr } from "@/lib/constants";
import { toast } from "sonner";
import {
  CreditCard, Wallet, CheckCircle2, XCircle, BadgeCheck, Clock, TrendingUp, ArrowDownRight, ArrowUpRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const UPI_STYLE = {
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
};

const LEDGER_STYLE = {
  credit: { chip: "bg-emerald-50 text-emerald-600", amt: "text-emerald-600", sign: "+" },
  debit: { chip: "bg-rose-50 text-rose-600", amt: "text-rose-600", sign: "\u2212" },
  hold: { chip: "bg-slate-100 text-slate-500", amt: "text-slate-400", sign: "" },
};
const LEDGER_ICON = { credit: ArrowDownRight, debit: ArrowUpRight, hold: Clock };

function LedgerRow({ e }) {
  const st = LEDGER_STYLE[e.type] || LEDGER_STYLE.hold;
  const Icon = LEDGER_ICON[e.type] || Clock;
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
      <div className="flex items-center gap-2">
        <div className={`rounded-lg p-1.5 ${st.chip}`}><Icon size={14} /></div>
        <div>
          <p className="text-xs font-medium text-slate-700">{e.note}</p>
          <p className="text-[10px] text-slate-400">{new Date(e.date).toLocaleString("en-IN")}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-mono text-sm font-semibold ${st.amt}`}>{st.sign}{e.amount ? inr(e.amount) : "\u2014"}</p>
        <p className="font-mono text-[10px] text-slate-400">bal {inr(e.balance)}</p>
      </div>
    </div>
  );
}

export default function Finance() {
  const { agents } = useApp();
  const [rows, setRows] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [ledger, setLedger] = useState(null);

  const load = useCallback(async () => {
    const [w, m] = await Promise.all([api.getWithdrawals(filter), api.getMetrics("finance")]);
    setRows(w.data);
    setMetrics(m.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id, approve) => {
    if (approve) await api.approveWithdrawal(id);
    else await api.rejectWithdrawal(id, "Failed verification / risk flag");
    await load();
    toast[approve ? "success" : "error"](approve ? "Payout approved & disbursed" : "Withdrawal rejected");
  };

  const filters = ["pending", "paid", "rejected", "all"];

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex items-center gap-2">
          <CreditCard size={20} className="text-slate-700" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900" data-testid="page-title">Finance — Payouts & Refunds</h1>
        </div>
        <p className="mt-1 text-xs text-slate-500">Finance-gated withdrawals with wallet ledger & UPI verification</p>
      </div>

      <div className="space-y-6 p-8">
        {metrics && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Clock} label="Pending approvals" value={metrics.pending} tone="bg-amber-50 text-amber-600" accent="text-amber-600" index={0} />
            <StatCard icon={Wallet} label="Pending amount" value={inr(metrics.pending_amount)} tone="bg-blue-50 text-blue-600" accent="text-blue-600" index={1} />
            <StatCard icon={CheckCircle2} label="Disbursed" value={metrics.paid} tone="bg-emerald-50 text-emerald-600" accent="text-emerald-600" index={2} />
            <StatCard icon={TrendingUp} label="Total paid out" value={inr(metrics.paid_amount)} tone="bg-emerald-50 text-emerald-600" accent="text-emerald-600" index={3} />
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-800">Withdrawal & refund requests</p>
            <div className="flex gap-1">
              {filters.map((f) => (
                <button key={f} onClick={() => setFilter(f)} data-testid={`withdrawal-filter-${f}`} className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">UPI</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Wallet</th>
                  <th className="px-4 py-3 font-medium">Claims</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <motion.tr key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="finance-withdrawal-row" className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{w.user_name}</p>
                      <p className="text-xs text-slate-500">{w.user_mobile}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-slate-600">{w.upi_id}</p>
                      <Pill className={UPI_STYLE[w.upi_status]}><BadgeCheck size={10} /> {w.upi_status}</Pill>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{inr(w.amount)}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{inr(w.wallet_balance)}</td>
                    <td className="px-4 py-3 text-slate-600">{w.tickets_count}</td>
                    <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button data-testid="view-user-ledger-btn" onClick={() => setLedger(w)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">Ledger</button>
                        {w.status === "pending" && (
                          <>
                            <button data-testid="approve-payout-btn" onClick={() => decide(w.id, true)} className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100" title="Approve payout"><CheckCircle2 size={14} /></button>
                            <button data-testid="reject-payout-btn" onClick={() => decide(w.id, false)} className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100" title="Reject"><XCircle size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={!!ledger} onOpenChange={(o) => !o && setLedger(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Wallet Ledger — {ledger?.user_name}</DialogTitle></DialogHeader>
          {ledger && (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-900 p-4 text-white">
                <p className="text-xs text-slate-400">Current balance</p>
                <p className="font-mono text-2xl font-bold">{inr(ledger.wallet_balance)}</p>
                <p className="mt-1 text-[11px] text-slate-400">Append-only double-entry ledger · integer paise</p>
              </div>
              <div className="space-y-2">
                {ledger.ledger.map((e, i) => <LedgerRow key={`${e.type}-${e.date}-${i}`} e={e} />)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
