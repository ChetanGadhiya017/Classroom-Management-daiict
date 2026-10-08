import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, GraduationCap, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { cn, THEMES } from "../lib/utils";
import { Avatar, Empty, Field, Modal, PageHeader, Skeleton, Spinner } from "../components/ui";

export function ClassForm({ initial = {}, onSubmit, pending, submitLabel }) {
  const [f, setF] = useState({ name: "", subject: "", section: "", room: "", description: "", theme: "indigo", ...initial });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}>
      <Field label="Class name"><input className="input" value={f.name} onChange={set("name")} required minLength={2} maxLength={100} placeholder="Database Management Systems" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Subject"><input className="input" value={f.subject} onChange={set("subject")} maxLength={100} placeholder="DBMS" /></Field>
        <Field label="Section"><input className="input" value={f.section} onChange={set("section")} maxLength={40} placeholder="Div A" /></Field>
      </div>
      <Field label="Room"><input className="input" value={f.room} onChange={set("room")} maxLength={40} placeholder="LT-3" /></Field>
      <Field label="Description" hint="(optional)"><textarea className="input" rows={3} value={f.description} onChange={set("description")} maxLength={2000} /></Field>
      <div>
        <span className="label">Colour</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(THEMES).map(([k, g]) => (
            <button type="button" key={k} onClick={() => setF({ ...f, theme: k })} aria-label={k}
              className={cn("h-8 w-8 rounded-full bg-gradient-to-br ring-offset-2 dark:ring-offset-slate-900", g, f.theme === k && "ring-2 ring-indigo-500")} />
          ))}
        </div>
      </div>
      <button className="btn-primary w-full" disabled={pending}>{pending && <Spinner className="h-4 w-4" />}{submitLabel}</button>
    </form>
  );
}

function ClassCard({ c }) {
  return (
    <Link to={`/classes/${c.id}`} className={cn("card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg", c.archived && "opacity-60")}>
      <div className={cn("relative h-24 bg-gradient-to-br p-4 text-white", THEMES[c.theme] || THEMES.indigo)}>
        <svg className="absolute -right-6 -top-6 h-32 w-32 opacity-20" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="14" /></svg>
        <h3 className="relative line-clamp-1 text-lg font-bold group-hover:underline">{c.name}</h3>
        <p className="relative text-sm text-white/85">{[c.subject, c.section].filter(Boolean).join(" · ") || " "}</p>
      </div>
      <div className="flex items-center justify-between p-4">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          {c.role === "student" && c.teacher?.name ? (<><Avatar name={c.teacher.name} color={c.teacher.avatarColor} size={26} /><span className="truncate">{c.teacher.name}</span></>)
            : (<><Users className="h-4 w-4 text-slate-400" />{c.students} student{c.students === 1 ? "" : "s"}</>)}
        </span>
        {c.archived ? <span className="chip bg-slate-100 dark:bg-slate-800"><Archive className="h-3 w-3" /> Archived</span>
          : c.code && <span className="chip bg-indigo-50 font-mono text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{c.code}</span>}
      </div>
    </Link>
  );
}

export default function Classes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["classes"], queryFn: () => api("/classes") });
  const create = useMutation({ mutationFn: (b) => api("/classes", { method: "POST", body: b }) });
  const join = useMutation({ mutationFn: (code) => api("/classes/join", { method: "POST", body: { code } }) });
  const done = (r, msg) => { qc.invalidateQueries({ queryKey: ["classes"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); setOpen(false); toast.success(msg); navigate(`/classes/${r.class.id}`); };
  const teacher = user.role === "teacher";

  return (
    <>
      <PageHeader title="Classes" subtitle={teacher ? "Classes you teach" : "Classes you're enrolled in"}
        actions={<button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{teacher ? "Create class" : "Join class"}</button>} />
      {isLoading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}</div>
        : data.classes.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.classes.map((c) => <ClassCard key={c.id} c={c} />)}</div>
          : <div className="card"><Empty icon={GraduationCap} title={teacher ? "No classes yet" : "You haven't joined a class"}
            action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{teacher ? "Create class" : "Join class"}</button>}>
            {teacher ? "Create a class and share its code with your students." : "Your teacher will give you a 6-character code."}</Empty></div>}

      <Modal open={open} onClose={() => setOpen(false)} title={teacher ? "Create a class" : "Join a class"}>
        {teacher ? <ClassForm submitLabel="Create class" pending={create.isPending}
          onSubmit={(f) => create.mutate(f, { onSuccess: (r) => done(r, "Class created"), onError: (e) => toast.error(e.message) })} />
          : (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); join.mutate(code, { onSuccess: (r) => done(r, `Joined ${r.class.name}`), onError: (er) => toast.error(er.message) }); }}>
              <p className="muted text-sm">Ask your teacher for the class code, then enter it here.</p>
              <input className="input text-center font-mono text-2xl uppercase tracking-[0.4em]" maxLength={6} value={code} autoFocus
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABC123" aria-label="Class code" />
              <button className="btn-primary w-full" disabled={code.length !== 6 || join.isPending}>{join.isPending && <Spinner className="h-4 w-4" />}Join</button>
            </form>
          )}
      </Modal>
    </>
  );
}
