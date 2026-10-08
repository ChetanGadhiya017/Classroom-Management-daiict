import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { api } from "../lib/api";
import { cn, DAYS, THEMES } from "../lib/utils";
import { Empty, PageHeader, Skeleton } from "../components/ui";

const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

export default function Timetable() {
  const { data, isLoading } = useQuery({ queryKey: ["timetable"], queryFn: () => api("/me/timetable") });
  if (isLoading) return <Skeleton className="h-[500px]" />;
  const slots = data.slots;
  const today = (new Date().getDay() + 6) % 7;
  const days = slots.some((s) => s.day > 4) ? 7 : 5;
  const start = Math.min(8 * 60, ...slots.map((s) => toMin(s.start)));
  const end = Math.max(17 * 60, ...slots.map((s) => toMin(s.end)));
  const hours = [];
  for (let m = Math.floor(start / 60) * 60; m < end; m += 60) hours.push(m);
  const PX = 1.1; // pixels per minute

  return (
    <>
      <PageHeader title="Timetable" subtitle="Your week across all classes" />
      {!slots.length ? <div className="card"><Empty icon={CalendarDays} title="No timetable yet">Teachers add lecture slots in each class's Settings tab.</Empty></div> : (
        <>
          <div className="card hidden overflow-x-auto p-4 md:block">
            <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `56px repeat(${days}, 1fr)` }}>
              <div />
              {DAYS.slice(0, days).map((d, i) => <div key={d} className={cn("pb-3 text-center text-sm font-semibold", i === today && "text-indigo-600")}>{d.slice(0, 3)}{i === today && <span className="ml-1 rounded-full bg-indigo-600 px-1.5 text-[10px] text-white">today</span>}</div>)}
              <div className="relative" style={{ height: (end - hours[0]) * PX }}>
                {hours.map((m) => <div key={m} className="muted absolute -translate-y-2 text-xs" style={{ top: (m - hours[0]) * PX }}>{String(m / 60).padStart(2, "0")}:00</div>)}
              </div>
              {DAYS.slice(0, days).map((d, i) => (
                <div key={d} className={cn("relative border-l border-slate-100 dark:border-slate-800", i === today && "bg-indigo-50/40 dark:bg-indigo-950/20")} style={{ height: (end - hours[0]) * PX }}>
                  {hours.map((m) => <div key={m} className="absolute inset-x-0 border-t border-dashed border-slate-100 dark:border-slate-800" style={{ top: (m - hours[0]) * PX }} />)}
                  {slots.filter((s) => s.day === i).map((s, k) => (
                    <Link key={k} to={`/classes/${s.classId}`} className={cn("absolute inset-x-1 overflow-hidden rounded-lg bg-gradient-to-br p-2 text-white shadow-sm transition hover:brightness-110", THEMES[s.theme])}
                      style={{ top: (toMin(s.start) - hours[0]) * PX, height: Math.max(28, (toMin(s.end) - toMin(s.start)) * PX - 2) }}>
                      <div className="truncate text-xs font-bold">{s.name}</div>
                      <div className="truncate text-[11px] opacity-90">{s.start}–{s.end}{s.room && ` · ${s.room}`}</div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4 md:hidden">
            {DAYS.map((d, i) => {
              const list = slots.filter((s) => s.day === i);
              return list.length ? (
                <div key={d} className="card p-4"><h3 className={cn("mb-2 font-bold", i === today && "text-indigo-600")}>{d}</h3>
                  <ul className="space-y-2">{list.map((s, k) => <li key={k}><Link className="flex justify-between text-sm" to={`/classes/${s.classId}`}><span className="font-medium">{s.name}</span><span className="font-mono">{s.start}–{s.end}</span></Link></li>)}</ul></div>
              ) : null;
            })}
          </div>
        </>
      )}
    </>
  );
}
