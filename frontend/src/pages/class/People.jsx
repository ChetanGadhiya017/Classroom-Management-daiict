import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Avatar, Empty } from "../../components/ui";

export default function People() {
  const c = useOutletContext();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const people = c.people.filter((p) => `${p.name} ${p.rollNo || ""} ${p.email}`.toLowerCase().includes(q.toLowerCase()));
  const remove = async (p) => {
    if (!confirm(`Remove ${p.name} from ${c.name}?`)) return;
    try {
      await api(`/classes/${c.id}/students/${p.id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["class", c.id] });
      toast.success(`${p.name} removed`);
    } catch (e) { toast.error(e.message); }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <h2 className="font-bold">Students <span className="muted font-normal">({c.people.length})</span></h2>
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="input w-60 pl-9" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" /></label>
        </div>
        {people.length ? (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={p.name} color={p.avatarColor} />
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{p.name}</div><div className="muted truncate text-xs">{[p.rollNo, c.role === "teacher" && p.email].filter(Boolean).join(" · ")}</div></div>
                {c.role === "teacher" && <button className="btn-danger px-2 py-1.5" onClick={() => remove(p)} aria-label={`Remove ${p.name}`}><UserMinus className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        ) : <Empty icon={Users} title={c.people.length ? "No match" : "No students yet"}>{c.role === "teacher" && !c.people.length ? `Share the code ${c.code} with your students.` : ""}</Empty>}
      </div>
      <div className="card h-fit p-4">
        <h3 className="muted mb-3 text-xs font-semibold uppercase tracking-wider">Teacher</h3>
        <div className="flex items-center gap-3"><Avatar name={c.teacher.name} color={c.teacher.avatarColor} /><div><div className="font-semibold">{c.teacher.name}</div><div className="muted text-xs">{c.teacher.email}</div></div></div>
      </div>
    </div>
  );
}
