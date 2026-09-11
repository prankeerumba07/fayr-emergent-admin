import React from "react";
import { ShieldAlert } from "lucide-react";

export default function NoAccess() {
  return (
    <div className="flex h-full items-center justify-center p-8" data-testid="no-access-page">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <ShieldAlert size={24} />
        </div>
        <p className="text-lg font-bold text-slate-900">No sections assigned</p>
        <p className="mt-2 text-sm text-slate-500">
          Your account doesn’t have any department access yet. Please contact an administrator to
          get assigned to a team.
        </p>
      </div>
    </div>
  );
}
