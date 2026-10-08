import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { ATT, cn, shortDate } from "../../lib/utils";
import { Avatar, Empty, Skeleton, Spinner } from "../../components/ui";

const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function Pct({ value }) {
  if (value == null) return <span className="muted">–</span>;
  const tone = value >= 75 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <span className="flex items-center gap-2"><span className="h-2 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><span className={cn("block h-full", tone)} style={{ width: `${value}%` }} /></span>
      <b className="w-12 text-right font-mono text-sm">{value}%</b></span>
  );
}

function TeacherView({ c, data, refresh }) {
  const [date, setDate] = useState(todayISO());
  const [topic, setTopic] = useState("");
  const [marks, setMarks] = useState({});
  const existing = useMemo(() => data.sessions.find((s) => s.date === date), [data, date]);
  useEffect(() => {
    setTopic(existing?.topic || "");
    setMarks(Object.fromEntries((existing?.records || []).map((r) => [r.student, r.status])));
  }, [existing, date]);
  const save = useMutation({
    mutationFn: () => api(`/classes/${c.id}/attendance/${date}`, { method: "PUT", body: { topic, records: Object.entries(marks).map(([student, status]) => ({ student, status })) } }),
    onSuccess: () => { refresh(); toast.success(`Attendance saved for ${shortDate(date)}`); }, onError: (e) => toast.error(e.message),
  });
  const del = async () => {
    if (!confirm(`Delete attendance for ${shortDate(date)}?`)) return;
    await api(`/classes/${c.id}/attendance/${date}`, { method: "DELETE" }).catch((e) => toast.error(e.message));
    refresh();
  };
  const marked = Object.keys(marks).length;

  if (!c.people.length) return <div className="card"><Empty icon={CalendarCheck} title="No students yet">Attendance appears once students join with code {c.code}.</Empty></div>;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="card">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <label><span className="label">Date</span><input type="date" className="input" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="min-w-[180px] flex-1"><span className="label">Topic</span><input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Lecture topic (optional)" maxLength={150} /></label>
          <button className="btn-secondary" onClick={() => setMarks(Object.fromEntries(c.people.map((p) => [p.id, "present"])))}><CheckCheck className="h-4 w-4" />All present</button>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {c.people.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <Avatar name={p.name} color={p.avatarColor} size={32} />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{p.name}</div><div className="muted text-xs">{p.rollNo}</div></div>
              <div className="flex gap-1" role="group" aria-label={`Attendance for ${p.name}`}>
                {Object.entries(ATT).map(([k, v]) => (
                  <button key={k} title={v.label} aria-pressed={marks[p.id] === k} onClick={() => setMarks({ ...marks, [p.id]: k })}
                    className={cn("h-8 w-8 rounded-lg text-xs font-bold transition", marks[p.id] === k ? v.cls : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700")}>{v.short}</button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800">
          <span className="muted text-sm">{marked}/{c.people.length} marked{existing ? " · editing saved record" : ""}</span>
          <div className="flex gap-2">
            {existing && <button className="btn-danger" onClick={del}><Trash2 className="h-4 w-4" />Delete</button>}
            <button className="btn-primary" disabled={!marked || save.isPending} onClick={() => save.mutate()}>{save.isPending && <Spinner className="h-4 w-4" />}Save attendance</button>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="card p-4">
          <h3 className="mb-3 font-bold">Students</h3>
          <ul className="space-y-2">{data.students.map((s) => (
            <li key={s.student.id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{s.student.name}</span><Pct value={s.percent} /></li>))}</ul>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 font-bold">History</h3>
          {data.sessions.length ? <ul className="space-y-1">{data.sessions.map((s) => (
            <li key={s.id}><button onClick={() => setDate(s.date)} className={cn("flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800", s.date === date && "bg-indigo-50 dark:bg-indigo-950")}>
              <span><b>{shortDate(s.date)}</b> <span className="muted">{s.topic}</span></span><span className="font-mono text-xs">{s.percent ?? "–"}%</span></button></li>))}</ul>
            : <p className="muted text-sm">No attendance taken yet.</p>}
        </div>
      </div>
    </div>
  );
}

function StudentView({ data }) {
  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <div className="card h-fit p-6 text-center">
        <div className="muted text-sm">Your attendance</div>
        <div className={cn("mt-2 text-5xl font-extrabold", data.percent == null ? "" : data.percent >= 75 ? "text-emerald-600" : "text-rose-600")}>{data.percent == null ? "–" : `${data.percent}%`}</div>
        {data.percent != null && data.percent < 75 && <p className="mt-2 text-sm text-rose-600">Below 75%. Try not to miss the next classes.</p>}
      </div>
      <div className="card">
        {data.sessions.length ? <ul className="divide-y divide-slate-100 dark:divide-slate-800">{data.sessions.map((s) => (
          <li key={s.date} className="flex items-center justify-between px-4 py-3 text-sm"><span><b>{shortDate(s.date)}</b> <span className="muted">{s.topic}</span></span>
            {s.status ? <span className={cn("chip", ATT[s.status].cls)}>{ATT[s.status].label}</span> : <span className="muted text-xs">not marked</span>}</li>))}</ul>
          : <Empty icon={CalendarCheck} title="No attendance yet" />}
      </div>
    </div>
  );
}

export default function Attendance() {
  const c = useOutletContext();
  const qc = useQueryClient();
  const key = ["attendance", c.id];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api(`/classes/${c.id}/attendance`) });
  if (isLoading) return <Skeleton className="h-80" />;
  return data.role === "teacher" ? <TeacherView c={c} data={data} refresh={() => qc.invalidateQueries({ queryKey: key })} /> : <StudentView data={data} />;
}
