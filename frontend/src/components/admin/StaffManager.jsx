import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, Users2, Shield, Send } from "lucide-react";
import { Avatar } from "@/components/shared/UI";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin / Management" },
  { value: "support", label: "Customer Support" },
  { value: "operations", label: "Operations" },
  { value: "frontend_ops", label: "Frontend Ops" },
  { value: "finance", label: "Finance" },
  { value: "agent", label: "Agent (no section)" },
];
const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));
const ROLE_BADGE = {
  admin: "bg-[#EFE7FF] text-[#7926D9] border-[#CDB4F0]",
  support: "bg-[#EAF2FF] text-[#2F6FD0] border-[#9CC3FF]",
  operations: "bg-[#EAF7E4] text-[#30A90F] border-[#9FDB86]",
  frontend_ops: "bg-[#FFF8E1] text-[#B7791F] border-[#FECA3A]",
  finance: "bg-[#FFDCDC] text-[#E5392B] border-[#F6B4B0]",
  agent: "bg-[#F1F2D9] text-[#5C5C5C] border-[#ECEDDC]",
};

function errText(err) {
  const d = err.response?.data?.detail;
  if (typeof d === "string") return d;
  return err.message || "Something went wrong";
}

export default function StaffManager() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "support" });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "support" });

  const load = () => {
    setLoading(true);
    api.getStaff()
      .then(({ data }) => setStaff(data))
      .catch((e) => toast.error(errText(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createStaff(form);
      toast.success(`${form.email} added to ${ROLE_LABEL[form.role]}`);
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "support" });
      load();
    } catch (err) {
      toast.error(errText(err));
    } finally { setSaving(false); }
  };

  const invite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      await api.inviteStaff(inviteForm);
      toast.success(`Invite emailed to ${inviteForm.email}`);
      setInviteOpen(false);
      setInviteForm({ name: "", email: "", role: "support" });
      load();
    } catch (err) {
      toast.error(errText(err));
    } finally { setInviting(false); }
  };

  const changeRole = async (id, role) => {
    try {
      await api.updateStaff(id, { role });
      toast.success("Role updated");
      setStaff((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (err) { toast.error(errText(err)); }
  };

  const remove = async (id) => {
    try {
      await api.deleteStaff(id);
      toast.success("Teammate removed");
      setStaff((prev) => prev.filter((u) => u.id !== id));
    } catch (err) { toast.error(errText(err)); }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="staff-manager">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <Users2 size={16} className="text-slate-500" />
          <p className="text-sm font-semibold text-slate-800">Team Management</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{staff.length}</span>
        </div>
        <div className="flex items-center gap-2">
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <button data-testid="invite-staff-btn" className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#68B642] to-[#30A90F] px-3 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02]">
              <Send size={14} /> Invite by email
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-testid="invite-staff-dialog">
            <DialogHeader>
              <DialogTitle>Invite a teammate</DialogTitle>
              <DialogDescription>They’ll get an email link to set their own password and activate their account.</DialogDescription>
            </DialogHeader>
            <form onSubmit={invite} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Full name</label>
                <input data-testid="invite-name-input" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Ananya Sharma"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#68B642]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Work email</label>
                <input data-testid="invite-email-input" type="email" required value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="teammate@cashkaro.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#68B642]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Department</label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                  <SelectTrigger data-testid="invite-role-select" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} data-testid={`invite-role-option-${r.value}`}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <button data-testid="invite-submit" type="submit" disabled={inviting}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#191919] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {inviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send invite
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button data-testid="add-staff-btn" className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              <UserPlus size={14} /> Add directly
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-testid="add-staff-dialog">
            <DialogHeader>
              <DialogTitle>Add a teammate</DialogTitle>
              <DialogDescription>Create a login and assign a department. They can reset their password anytime.</DialogDescription>
            </DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Full name</label>
                <input data-testid="staff-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ananya Sharma"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#68B642]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Work email</label>
                <input data-testid="staff-email-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="teammate@cashkaro.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#68B642]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Temporary password</label>
                <input data-testid="staff-password-input" type="text" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#68B642]" />
                <p className="mt-1 text-[11px] text-slate-400">Share this with the teammate. They can reset it anytime via “Forgot password”.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Department</label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger data-testid="staff-role-select" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} data-testid={`staff-role-option-${r.value}`}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <button data-testid="staff-create-submit" type="submit" disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#191919] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Create account
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {loading && <div className="flex items-center gap-2 p-5 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Loading team…</div>}
        {!loading && staff.map((u) => (
          <div key={u.id} data-testid={`staff-row-${u.id}`} className="flex items-center gap-3 p-4">
            <Avatar name={u.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{u.name}</p>
              <p className="truncate text-xs text-slate-500">{u.email}</p>
            </div>
            {u.pending_invite && (
              <span data-testid={`staff-pending-${u.id}`} className="hidden rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 sm:inline">Invite pending</span>
            )}
            <span className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-medium sm:inline ${ROLE_BADGE[u.role] || ROLE_BADGE.agent}`}>
              {ROLE_LABEL[u.role] || u.role}
            </span>
            <Select value={u.role} onValueChange={(v) => changeRole(u.id, v)}>
              <SelectTrigger data-testid={`staff-role-change-${u.id}`} className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button data-testid={`staff-delete-${u.id}`} title="Remove teammate" className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 size={14} />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent data-testid="staff-delete-dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {u.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes their login. They will lose access immediately. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="staff-delete-cancel">Cancel</AlertDialogCancel>
                  <AlertDialogAction data-testid="staff-delete-confirm" onClick={() => remove(u.id)} className="bg-rose-600 hover:bg-rose-700">Remove</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
        {!loading && staff.length === 0 && (
          <div className="flex items-center gap-2 p-5 text-sm text-slate-400"><Shield size={14} /> No teammates yet.</div>
        )}
      </div>
    </div>
  );
}
