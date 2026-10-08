import { NavLink, Outlet, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Copy, Info } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { cn, THEMES } from "../../lib/utils";
import { Empty, Skeleton } from "../../components/ui";

function useClass() {
  const { classId } = useParams();
  return useQuery({ queryKey: ["class", classId], queryFn: () => api(`/classes/${classId}`).then((r) => r.class) });
}

export default function ClassLayout() {
  const { classId } = useParams();
  const { data: c, isLoading, error } = useClass();
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-44" /><Skeleton className="h-10 w-80" /><Skeleton className="h-64" /></div>;
  if (error) return <div className="card"><Empty icon={Info} title={error.status === 403 ? "You're not in this class" : "Class not found"}>{error.message}</Empty></div>;
  const teacher = c.role === "teacher";
  const tabs = [["", "Stream"], ["classwork", "Classwork"], ["people", "People"], ["attendance", "Attendance"], ...(teacher ? [["settings", "Settings"]] : [])];
  const copy = () => { navigator.clipboard?.writeText(c.code); toast.success("Class code copied"); };

  return (
    <>
      <div className={cn("relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-sm sm:p-8", THEMES[c.theme] || THEMES.indigo)}>
        <svg className="absolute -right-10 -top-16 h-72 w-72 opacity-15" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="38" fill="none" stroke="white" strokeWidth="10" /><circle cx="50" cy="50" r="14" fill="white" /></svg>
        <div className="relative">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{c.name}</h1>
          <p className="mt-1 text-white/85">{[c.subject, c.section, c.room && `Room ${c.room}`].filter(Boolean).join(" · ")}</p>
          <p className="mt-3 text-sm text-white/80">Teacher: {c.teacher.name} · {c.students} student{c.students === 1 ? "" : "s"}</p>
          {teacher && (
            <button onClick={copy} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25">
              Class code <span className="font-mono text-base tracking-widest">{c.code}</span><Copy className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {tabs.map(([to, label]) => (
          <NavLink key={label} end to={`/classes/${classId}${to ? `/${to}` : ""}`}
            className={({ isActive }) => cn("whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition", isActive ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet context={c} />
    </>
  );
}
