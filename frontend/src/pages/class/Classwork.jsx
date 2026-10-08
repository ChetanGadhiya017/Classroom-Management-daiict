import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { dueLabel } from "../../lib/utils";
import { Empty, Field, FilePicker, Modal, Skeleton, Spinner, StatusChip } from "../../components/ui";

export function AssignmentForm({ initial = {}, onSubmit, pending, submitLabel }) {
  const toLocal = (d) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
  const [f, setF] = useState({ title: "", instructions: "", points: 100, topic: "", allowLate: true, ...initial, due: toLocal(initial.due) });
  const [files, setFiles] = useState([]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries({ ...f, due: f.due ? new Date(f.due).toISOString() : "" }).forEach(([k, v]) => fd.append(k, String(v)));
    files.forEach((x) => fd.append("files", x));
    onSubmit(fd);
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Title"><input className="input" value={f.title} onChange={set("title")} required minLength={2} maxLength={150} /></Field>
      <Field label="Instructions" hint="(optional)"><textarea className="input" rows={5} value={f.instructions} onChange={set("instructions")} maxLength={10000} /></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Points"><input className="input" type="number" min={0} max={1000} value={f.points} onChange={set("points")} /></Field>
        <Field label="Due"><input className="input" type="datetime-local" value={f.due} onChange={set("due")} /></Field>
        <Field label="Topic"><input className="input" value={f.topic} onChange={set("topic")} maxLength={60} placeholder="Labs" /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.allowLate} onChange={set("allowLate")} className="h-4 w-4 accent-indigo-600" />Accept late submissions</label>
      <FilePicker files={files} setFiles={setFiles} />
      <button className="btn-primary w-full" disabled={pending}>{pending && <Spinner className="h-4 w-4" />}{submitLabel}</button>
    </form>
  );
}

export default function Classwork() {
  const c = useOutletContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const key = ["assignments", c.id];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api(`/classes/${c.id}/assignments`) });
  const create = useMutation({ mutationFn: (fd) => api(`/classes/${c.id}/assignments`, { method: "POST", body: fd }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setOpen(false); toast.success("Assignment published"); }, onError: (e) => toast.error(e.message) });
  const groups = useMemo(() => {
    const g = {};
    for (const a of data?.assignments || []) (g[a.topic || "General"] ||= []).push(a);
    return Object.entries(g);
  }, [data]);
  const teacher = c.role === "teacher";

  return (
    <>
      {teacher && <div className="mb-5 flex justify-end"><button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Create assignment</button></div>}
      {isLoading ? <Skeleton className="h-60" /> : !groups.length ? (
        <div className="card"><Empty icon={ClipboardList} title="No classwork yet">{teacher ? "Create an assignment with files and a due date." : "Assignments from your teacher will appear here."}</Empty></div>
      ) : groups.map(([topic, list]) => (
        <section key={topic} className="mb-8">
          <h2 className="mb-3 border-b border-slate-200 pb-2 text-lg font-bold dark:border-slate-800">{topic}</h2>
          <ul className="space-y-2">
            {list.map((a) => (
              <li key={a.id}>
                <Link to={`/classes/${c.id}/assignments/${a.id}`} className="card flex items-center gap-4 p-4 transition hover:shadow-md">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><ClipboardList className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{a.title}</span><span className="muted text-xs">{dueLabel(a.due)} · {a.points} pts</span></span>
                  {teacher ? (
                    <span className="hidden text-right text-sm sm:block"><b>{a.turnedIn}</b><span className="muted">/{a.students} turned in</span><br /><span className="muted text-xs">{a.graded} graded</span></span>
                  ) : a.status === "graded" ? <span className="font-mono text-sm font-bold">{a.grade}/{a.points}</span> : <StatusChip status={a.status} />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title="New assignment" wide>
        <AssignmentForm submitLabel="Publish" pending={create.isPending} onSubmit={(fd) => create.mutate(fd)} />
      </Modal>
    </>
  );
}
