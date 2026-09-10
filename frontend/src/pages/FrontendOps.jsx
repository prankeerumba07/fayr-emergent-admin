import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { StatCard, MarketplaceBadge, StatusBadge, Pill } from "@/components/shared/UI";
import {
  LayoutGrid, Image, Gift, Bug, Eye, MousePointerClick, TrendingUp,
} from "lucide-react";

const SEVERITY_STYLE = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  low: "border-slate-200 bg-slate-100 text-slate-600",
};
const UX_STATUS = {
  open: "border-rose-200 bg-rose-50 text-rose-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function FrontendOps() {
  const [banners, setBanners] = useState([]);
  const [rules, setRules] = useState([]);
  const [issues, setIssues] = useState([]);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    api.getBanners().then(({ data }) => setBanners(data));
    api.getRewardRules().then(({ data }) => setRules(data));
    api.getUxIssues().then(({ data }) => setIssues(data));
    api.getMetrics("frontend_ops").then(({ data }) => setMetrics(data));
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex items-center gap-2">
          <LayoutGrid size={20} className="text-slate-700" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900" data-testid="page-title">Frontend Operations</h1>
        </div>
        <p className="mt-1 text-xs text-slate-500">App campaign banners, reward rules, marketplace mapping & UX issues</p>
      </div>

      <div className="space-y-6 p-8">
        {metrics && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard icon={Image} label="Live banners" value={metrics.live_banners} tone="bg-emerald-50 text-emerald-600" accent="text-emerald-600" index={0} />
            <StatCard icon={Gift} label="Reward rules" value={metrics.reward_rules} tone="bg-blue-50 text-blue-600" accent="text-blue-600" index={1} />
            <StatCard icon={Bug} label="Open UX issues" value={metrics.open_ux_issues} tone="bg-rose-50 text-rose-600" accent="text-rose-600" index={2} />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 p-4"><Image size={16} className="text-slate-500" /><p className="text-sm font-semibold text-slate-800">Campaign Banners</p></div>
            <div className="divide-y divide-slate-100">
              {banners.map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} data-testid="banner-row" className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{b.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{b.placement}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <MarketplaceBadge name={b.marketplace} />
                    {b.status === "live" && (
                      <>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Eye size={12} /> {b.impressions.toLocaleString("en-IN")}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500"><MousePointerClick size={12} /> {b.ctr}% CTR</span>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 p-4"><Gift size={16} className="text-slate-500" /><p className="text-sm font-semibold text-slate-800">Reward Rules</p></div>
              <div className="divide-y divide-slate-100">
                {rules.map((r) => (
                  <div key={r.id} data-testid="reward-rule-row" className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <MarketplaceBadge name={r.marketplace} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.reward_pct}% of product value</p>
                      </div>
                    </div>
                    <Pill className={r.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}>{r.status}</Pill>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 p-4"><Bug size={16} className="text-slate-500" /><p className="text-sm font-semibold text-slate-800">Reported UX Issues</p></div>
              <div className="divide-y divide-slate-100">
                {issues.map((u) => (
                  <div key={u.id} data-testid="ux-issue-row" className="flex items-center justify-between gap-2 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{u.title}</p>
                      <p className="text-xs text-slate-400">via {u.reported_by}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Pill className={SEVERITY_STYLE[u.severity]}>{u.severity}</Pill>
                      <Pill className={UX_STATUS[u.status]}>{u.status.replace("_", " ")}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
