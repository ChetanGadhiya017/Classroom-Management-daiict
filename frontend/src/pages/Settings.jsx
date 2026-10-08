import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Avatar, Field, PageHeader, Spinner } from "../components/ui";

export default function Settings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [p, setP] = useState({ name: user.name, rollNo: user.rollNo || "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const profile = useMutation({ mutationFn: () => api("/auth/me", { method: "PATCH", body: p }),
    onSuccess: (r) => { qc.setQueryData(["me"], r.user); toast.success("Profile saved"); }, onError: (e) => toast.error(e.message) });
  const password = useMutation({ mutationFn: () => api("/auth/me/password", { method: "POST", body: { current: pw.current, next: pw.next } }),
    onSuccess: () => { setPw({ current: "", next: "", confirm: "" }); toast.success("Password changed"); }, onError: (e) => toast.error(e.message) });
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <form className="card space-y-4 p-6" onSubmit={(e) => { e.preventDefault(); profile.mutate(); }}>
          <div className="flex items-center gap-4"><Avatar name={p.name} color={user.avatarColor} size={56} /><div><div className="font-bold">{user.email}</div><div className="muted text-sm capitalize">{user.role}</div></div></div>
          <Field label="Full name"><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required minLength={2} maxLength={80} /></Field>
          {user.role === "student" && <Field label="Roll number"><input className="input" value={p.rollNo} onChange={(e) => setP({ ...p, rollNo: e.target.value })} maxLength={20} /></Field>}
          <button className="btn-primary" disabled={profile.isPending}>{profile.isPending && <Spinner className="h-4 w-4" />}Save profile</button>
        </form>
        <form className="card space-y-4 p-6" onSubmit={(e) => { e.preventDefault(); if (pw.next !== pw.confirm) return toast.error("New passwords don't match"); password.mutate(); }}>
          <h2 className="text-lg font-bold">Change password</h2>
          <Field label="Current password"><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" /></Field>
          <Field label="New password" hint="(8+ characters)"><input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={8} autoComplete="new-password" /></Field>
          <Field label="Confirm new password"><input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required minLength={8} autoComplete="new-password" /></Field>
          <button className="btn-primary" disabled={password.isPending}>{password.isPending && <Spinner className="h-4 w-4" />}Update password</button>
        </form>
      </div>
    </>
  );
}
