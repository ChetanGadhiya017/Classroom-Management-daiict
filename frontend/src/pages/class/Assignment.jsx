import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { ago, cn, dueLabel } from "../../lib/utils";
import { Avatar, FileList, FilePicker, Modal, PageLoader, Spinner, StatusChip } from "../../components/ui";
import { AssignmentForm } from "./Classwork";

function GradeRow({ r, a, classId, refresh }) {
  const [grade, setGrade] = useState(r.submission?.grade ?? "");
  const [feedback, setFeedback] = useState(r.submission?.feedback ?? "");
  const [open, setOpen] = useState(false);
  const save = useMutation({ mutationFn: () => api(`/classes/${classId}/assignments/${a.id}/grade/${r.student.id}`, { method: "POST", body: { grade: Number(grade), feedback } }),
    onSuccess: () => { refresh(); toast.success(`Grade saved for ${r.student.name}`); }, onError: (e) => toast.error(e.message) });
  const s = r.submission;
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={r.student.name} color={r.student.avatarColor} size={34} />
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)}>
          <div className="truncate font-medium">{r.student.name}</div>
          <div className="muted text-xs">{s?.submittedAt ? `Turned in ${ago(s.submittedAt)}${s.files?.length ? ` · ${s.files.length} file(s)` : ""}` : "No work yet"}</div>
        </button>
        <StatusChip status={r.status} />
        <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <input className="input w-20 text-right font-mono" type="number" min={0} max={a.points} step="0.5" value={grade} onChange={(e) => setGrade(e.target.value)} aria-label={`Grade for ${r.student.name}`} />
          <span className="muted text-sm">/{a.points}</span>
          <button className="btn-secondary ml-1 px-3" disabled={grade === "" || save.isPending}>{save.isPending ? <Spinner className="h-4 w-4" /> : "Save"}</button>
        </form>
      </div>
      {open && (
        <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/40">
          {s?.text && <p className="whitespace-pre-wrap text-sm">{s.text}</p>}
          <FileList files={s?.files} />
          <textarea className="input" rows={2} placeholder="Private feedback for the student" value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={5000} />
        </div>
      )}
    </li>
  );
}

function YourWork({ data, classId, refresh }) {
  const { assignment: a, submission: s, status } = data;
  const [text, setText] = useState(s?.text || "");
  const [keep, setKeep] = useState(s?.files || []);
  const [files, setFiles] = useState([]);
  const turnedIn = Boolean(s?.submittedAt);
  const locked = status === "graded";
  const submit = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("text", text);
      keep.forEach((f) => fd.append("keep", f.id));
      files.forEach((f) => fd.append("files", f));
      return api(`/classes/${classId}/assignments/${a.id}/submission`, { method: "PUT", body: fd });
    },
    onSuccess: () => { setFiles([]); refresh(); toast.success("Turned in 🎉"); }, onError: (e) => toast.error(e.message),
  });
  const unsubmit = useMutation({ mutationFn: () => api(`/classes/${classId}/assignments/${a.id}/submission`, { method: "DELETE" }), onSuccess: refresh, onError: (e) => toast.error(e.message) });
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Your work</h2><StatusChip status={status} /></div>
      {locked && (
        <div className="mb-4 rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/50">
          <div className="text-3xl font-extrabold">{s.grade}<span className="muted text-lg">/{a.points}</span></div>
          {s.feedback && <p className="mt-2 whitespace-pre-wrap text-sm"><b>Feedback:</b> {s.feedback}</p>}
        </div>
      )}
      {turnedIn || locked ? (
        <div className="space-y-3">
          {s?.text && <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">{s.text}</p>}
          <FileList files={s?.files} />
          {s?.submittedAt && <p className="muted text-xs">Turned in {ago(s.submittedAt)}{s.late ? " (late)" : ""}</p>}
          {!locked && <button className="btn-secondary w-full" onClick={() => unsubmit.mutate()} disabled={unsubmit.isPending}>Unsubmit to make changes</button>}
        </div>
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
          <textarea className="input" rows={4} placeholder="Add a note or your answer" value={text} onChange={(e) => setText(e.target.value)} maxLength={10000} />
          {keep.length > 0 && <FileList files={keep} onRemove={(f) => setKeep(keep.filter((x) => x !== f))} />}
          <FilePicker files={files} setFiles={setFiles} max={5 - keep.length} />
          <button className="btn-primary w-full" disabled={submit.isPending || (!text.trim() && !files.length && !keep.length)}>{submit.isPending && <Spinner className="h-4 w-4" />}Turn in</button>
        </form>
      )}
    </div>
  );
}

export default function AssignmentPage() {
  const { classId, aid } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [edit, setEdit] = useState(false);
  const key = ["assignment", aid];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => api(`/classes/${classId}/assignments/${aid}`) });
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["assignments", classId] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  const update = useMutation({ mutationFn: (fd) => api(`/classes/${classId}/assignments/${aid}`, { method: "PATCH", body: fd }),
    onSuccess: () => { refresh(); setEdit(false); toast.success("Assignment updated"); }, onError: (e) => toast.error(e.message) });
  if (isLoading) return <PageLoader />;
  if (error) return <p className="text-rose-600">{error.message}</p>;
  const a = data.assignment;
  const teacher = data.role === "teacher";
  const counts = teacher && data.roster.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {});
  const del = async () => {
    if (!confirm("Delete this assignment and all submissions?")) return;
    await api(`/classes/${classId}/assignments/${aid}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["assignments", classId] });
    navigate(`/classes/${classId}/classwork`);
  };

  return (
    <>
      <Link to={`/classes/${classId}/classwork`} className="muted mb-4 inline-flex items-center gap-1 text-sm hover:underline"><ArrowLeft className="h-4 w-4" />Classwork</Link>
      <div className={cn("grid gap-6", !teacher && "lg:grid-cols-[1fr_340px]")}>
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-indigo-600 text-white"><ClipboardList className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-extrabold tracking-tight">{a.title}</h1>
                <p className="muted mt-1 text-sm">{a.points} points · {dueLabel(a.due)}{!a.allowLate && " · no late work"}{a.topic && ` · ${a.topic}`}</p>
              </div>
              {teacher && <div className="flex gap-1"><button className="btn-ghost p-2" onClick={() => setEdit(true)} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                <button className="btn-danger p-2" onClick={del} aria-label="Delete"><Trash2 className="h-4 w-4" /></button></div>}
            </div>
            {a.instructions && <p className="mt-5 whitespace-pre-wrap leading-relaxed">{a.instructions}</p>}
            {a.attachments.length > 0 && <div className="mt-5"><FileList files={a.attachments} /></div>}
          </div>
          {teacher && (
            <div className="card">
              <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-4 dark:border-slate-800">
                <h2 className="text-lg font-bold">Student work</h2>
                <div className="flex flex-wrap gap-2 text-xs">{["submitted", "late", "graded", "assigned", "missing"].filter((k) => counts[k]).map((k) => <span key={k} className="chip bg-slate-100 dark:bg-slate-800">{counts[k]} {k}</span>)}</div>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">{data.roster.map((r) => <GradeRow key={r.student.id} r={r} a={a} classId={classId} refresh={refresh} />)}</ul>
              {!data.roster.length && <p className="muted p-6 text-center text-sm">No students in this class yet.</p>}
            </div>
          )}
        </div>
        {!teacher && <YourWork key={data.submission?.submittedAt || "new"} data={data} classId={classId} refresh={refresh} />}
      </div>
      {teacher && <Modal open={edit} onClose={() => setEdit(false)} title="Edit assignment" wide><AssignmentForm initial={a} submitLabel="Save" pending={update.isPending} onSubmit={(fd) => update.mutate(fd)} /></Modal>}
    </>
  );
}
