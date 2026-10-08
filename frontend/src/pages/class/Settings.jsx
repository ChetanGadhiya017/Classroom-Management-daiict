import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { DAYS } from "../../lib/utils";
import { ClassForm } from "../Classes";
import { Spinner } from "../../components/ui";

export default function ClassSettings() {
  const c = useOutletContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [slots, setSlots] = useState(c.timetable.map(({ day, start, end, room }) => ({ day, start, end, room: room || "" })));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["class", c.id] }); qc.invalidateQueries({ queryKey: ["classes"] }); };
  const update = useMutation({ mutationFn: (b) => api(`/classes/${c.id}`, { method: "PATCH", body: b }), onSuccess: () => { refresh(); toast.success("Saved"); }, onError: (e) => toast.error(e.message) });
  const saveTT = useMutation({ mutationFn: () => api(`/classes/${c.id}/timetable`, { method: "PUT", body: { slots: slots.map((s) => ({ ...s, day: Number(s.day) })) } }),
    onSuccess: () => { refresh(); qc.invalidateQueries({ queryKey: ["timetable"] }); toast.success("Timetable saved"); }, onError: (e) => toast.error(e.message) });
  const setSlot = (i, k, v) => setSlots(slots.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const rotate = async () => { await api(`/classes/${c.id}/code`, { method: "POST" }); refresh(); toast.success("New class code generated"); };
  const remove = async () => {
    if (prompt(`This permanently deletes ${c.name} with all posts, assignments, submissions and attendance. Type the class name to confirm.`) !== c.name) return;
    await api(`/classes/${c.id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["classes"] });
    toast.success("Class deleted");
    navigate("/classes");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="mb-4 text-lg font-bold">Class details</h2>
        <ClassForm initial={c} submitLabel="Save changes" pending={update.isPending}
          onSubmit={({ name, subject, section, room, description, theme }) => update.mutate({ name, subject, section, room, description, theme })} />
      </section>
      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="mb-1 text-lg font-bold">Weekly timetable</h2>
          <p className="muted mb-4 text-sm">Shown on every member's Timetable and Today views.</p>
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={i} className="grid grid-cols-[1.3fr_1fr_1fr_1fr_auto] gap-2">
                <select className="input" value={s.day} onChange={(e) => setSlot(i, "day", e.target.value)} aria-label="Day">{DAYS.map((d, k) => <option key={d} value={k}>{d}</option>)}</select>
                <input className="input" type="time" value={s.start} onChange={(e) => setSlot(i, "start", e.target.value)} aria-label="Start" />
                <input className="input" type="time" value={s.end} onChange={(e) => setSlot(i, "end", e.target.value)} aria-label="End" />
                <input className="input" value={s.room} placeholder={c.room || "Room"} onChange={(e) => setSlot(i, "room", e.target.value)} aria-label="Room" />
                <button className="btn-ghost px-2" onClick={() => setSlots(slots.filter((_, j) => j !== i))} aria-label="Remove slot"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {!slots.length && <p className="muted text-sm">No lectures scheduled.</p>}
          </div>
          <div className="mt-4 flex justify-between">
            <button className="btn-secondary" onClick={() => setSlots([...slots, { day: 0, start: "09:00", end: "10:00", room: "" }])}><Plus className="h-4 w-4" />Add slot</button>
            <button className="btn-primary" onClick={() => saveTT.mutate()} disabled={saveTT.isPending}>{saveTT.isPending && <Spinner className="h-4 w-4" />}Save timetable</button>
          </div>
        </section>
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-bold">Access</h2>
          <div className="flex items-center justify-between gap-4"><div><div className="font-medium">Class code: <span className="font-mono">{c.code}</span></div><p className="muted text-sm">Rotate it if it was shared somewhere it shouldn't be.</p></div>
            <button className="btn-secondary" onClick={rotate}><RefreshCw className="h-4 w-4" />New code</button></div>
          <div className="flex items-center justify-between gap-4"><div><div className="font-medium">{c.archived ? "Archived" : "Archive class"}</div><p className="muted text-sm">Archived classes are read-only and hidden from the sidebar; students can't join.</p></div>
            <button className="btn-secondary" onClick={() => update.mutate({ archived: !c.archived })}><Archive className="h-4 w-4" />{c.archived ? "Restore" : "Archive"}</button></div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 dark:border-slate-800"><div><div className="font-medium text-rose-600">Delete class</div><p className="muted text-sm">Removes everything permanently.</p></div>
            <button className="btn-danger border border-rose-200 dark:border-rose-900" onClick={remove}><Trash2 className="h-4 w-4" />Delete</button></div>
        </section>
      </div>
    </div>
  );
}
