import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, CalendarClock, CheckCircle2, ClipboardList, GraduationCap, Megaphone, Users } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ago, cn, dueLabel, firstName, THEME_DOT } from "../lib/utils";
import { Avatar, Empty, PageHeader, Skeleton, StatusChip } from "../components/ui";

function Stat({ icon: Icon, label, value, tone = "indigo", to }) {
  const tones = { indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300", rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300", amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300" };
  const body = (
    <div className="card flex items-center gap-4 p-5 transition hover:shadow-md">
      <span className={cn("grid h-11 w-11 place-items-center rounded-xl", tones[tone])}><Icon className="h-5 w-5" /></span>
      <div><div className="text-2xl font-extrabold tracking-tight">{value ?? "–"}</div><div className="muted text-sm">{label}</div></div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function Today({ slots }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold"><CalendarClock className="h-5 w-5 text-indigo-500" /> Today's classes</h2>
      {slots.length ? (
        <ol className="space-y-3">
          {slots.map((s, i) => (
            <li key={i}><Link to={`/classes/${s.classId}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <span className="w-24 shrink-0 font-mono text-sm font-semibold">{s.start}–{s.end}</span>
              <span className={cn("h-8 w-1 rounded-full", THEME_DOT[s.theme])} />
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{s.name}</span><span className="muted text-xs">{s.room || "No room"}</span></span>
            </Link></li>
          ))}
        </ol>
      ) : <p className="muted text-sm">No classes scheduled today. 🎉</p>}
    </div>
  );
}

function Recent({ posts }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold"><Megaphone className="h-5 w-5 text-indigo-500" /> Latest announcements</h2>
      {posts.length ? (
        <ul className="space-y-4">
          {posts.map((p) => (
            <li key={p.id} className="flex gap-3">
              <Avatar name={p.author} color={p.avatarColor} size={32} />
              <div className="min-w-0">
                <div className="text-xs"><Link to={`/classes/${p.classId}`} className="font-semibold hover:underline">{p.className}</Link> <span className="muted">· {ago(p.createdAt)}</span></div>
                <p className="line-clamp-2 text-sm">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="muted text-sm">Nothing yet.</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => api("/me/dashboard") });
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><div className="grid gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>;
  if (!data) return null;
  const s = data.stats;

  if (!s.classes) {
    return (
      <>
        <PageHeader title={`${greet}, ${firstName(user.name)}`} />
        <div className="card"><Empty icon={GraduationCap} title={user.role === "teacher" ? "Create your first class" : "Join your first class"}
          action={<Link className="btn-primary" to="/classes">{user.role === "teacher" ? "Create a class" : "Join with a code"}</Link>}>
          {user.role === "teacher" ? "Classes hold your announcements, assignments, attendance and timetable." : "Ask your teacher for the 6-character class code."}
        </Empty></div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={`${greet}, ${firstName(user.name)}`} subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} />
      {data.role === "teacher" ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={BookOpen} label="Classes" value={s.classes} to="/classes" />
          <Stat icon={Users} label="Students" value={s.students} tone="emerald" />
          <Stat icon={ClipboardList} label="Assignments" value={s.assignments} tone="amber" />
          <Stat icon={CheckCircle2} label="Waiting to be graded" value={s.toGrade} tone="rose" />
        </div>
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={ClipboardList} label="To do" value={s.todo} />
          <Stat icon={AlertTriangle} label="Missing" value={s.missing} tone="rose" />
          <Stat icon={CheckCircle2} label="Attendance" value={s.attendance == null ? "–" : `${s.attendance}%`} tone="emerald" />
          <Stat icon={GraduationCap} label="Average grade" value={s.average == null ? "–" : `${s.average}%`} tone="amber" />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-bold"><ClipboardList className="h-5 w-5 text-indigo-500" /> {data.role === "teacher" ? "Ready to grade" : "Your to-do list"}</h2>
            {data.role === "teacher" ? (
              data.toGrade.length ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.toGrade.map((a) => (
                    <li key={a.id}><Link to={`/classes/${a.classId}/assignments/${a.id}`} className="flex items-center justify-between gap-4 py-3 hover:opacity-80">
                      <span className="min-w-0"><span className="block truncate font-semibold">{a.title}</span><span className="muted text-xs">{a.className} · {dueLabel(a.due)}</span></span>
                      <span className="chip shrink-0 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">{a.ungraded} to grade</span>
                    </Link></li>
                  ))}
                </ul>
              ) : <p className="muted text-sm">All caught up. Nothing waiting.</p>
            ) : data.todo.length ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.todo.map((a) => (
                  <li key={a.id}><Link to={`/classes/${a.classId}/assignments/${a.id}`} className="flex items-center justify-between gap-4 py-3 hover:opacity-80">
                    <span className="flex min-w-0 items-center gap-3"><span className={cn("h-9 w-1 shrink-0 rounded-full", THEME_DOT[a.theme])} />
                      <span className="min-w-0"><span className="block truncate font-semibold">{a.title}</span><span className="muted text-xs">{a.className} · {dueLabel(a.due)}</span></span></span>
                    <StatusChip status={a.status} />
                  </Link></li>
                ))}
              </ul>
            ) : <p className="muted text-sm">Nothing due. Nice work! ✨</p>}
          </div>
          {data.role === "student" && data.graded.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-4 font-bold">Recently graded</h2>
              <ul className="space-y-2">{data.graded.map((g) => (
                <li key={g.id} className="flex items-center justify-between text-sm"><Link className="truncate hover:underline" to={`/classes/${g.classId}/assignments/${g.id}`}>{g.title}</Link>
                  <span className="font-mono font-semibold">{g.grade}/{g.points}</span></li>))}</ul>
            </div>
          )}
        </div>
        <div className="space-y-6"><Today slots={data.today} /><Recent posts={data.recent} /></div>
      </div>
    </>
  );
}
