import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarDays, GraduationCap, Home, LogOut, Menu, Moon, Settings, Sun, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ago, cn, THEME_DOT } from "../lib/utils";
import { Avatar } from "./ui";

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("cm-theme", next ? "dark" : "light"); } catch { /* ignore */ }
    setDark(next);
  };
  return [dark, toggle];
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["notifications"], queryFn: () => api("/me/notifications"), refetchInterval: 30000 });
  const read = useMutation({ mutationFn: (id) => api("/me/notifications/read", { method: "POST", body: id ? { id } : {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const unread = data?.unread || 0;
  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost relative p-2" onClick={() => setOpen(!open)} aria-label={`Notifications (${unread} unread)`}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="card absolute right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="font-semibold">Notifications</span>
            {unread > 0 && <button className="text-xs font-semibold text-indigo-600 hover:underline" onClick={() => read.mutate()}>Mark all read</button>}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {!data?.items?.length && <li className="muted px-4 py-8 text-center text-sm">You're all caught up.</li>}
            {data?.items?.map((n) => (
              <li key={n.id}>
                <button className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60", !n.read && "bg-indigo-50/60 dark:bg-indigo-950/40")}
                  onClick={() => { if (!n.read) read.mutate(n.id); setOpen(false); if (n.link) navigate(n.link); }}>
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-indigo-500")} />
                  <span className="min-w-0"><span className="block text-sm">{n.title}</span><span className="muted text-xs">{ago(n.createdAt)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [dark, toggleTheme] = useTheme();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const { data } = useQuery({ queryKey: ["classes"], queryFn: () => api("/classes") });
  useEffect(() => setMenu(false), [location.pathname]);

  const link = ({ isActive }) => cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
    isActive ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800");
  const active = (data?.classes || []).filter((c) => !c.archived);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-slate-200 bg-white p-4 transition-transform dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
        menu ? "translate-x-0 shadow-2xl" : "-translate-x-full")}>
        <Link to="/" className="mb-6 flex items-center gap-2.5 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white"><GraduationCap className="h-5 w-5" /></span>
          <span className="text-[15px] font-extrabold tracking-tight">Classroom Manager</span>
        </Link>
        <nav className="space-y-1">
          <NavLink to="/" end className={link}><Home className="h-5 w-5" /> Home</NavLink>
          <NavLink to="/classes" end className={link}><GraduationCap className="h-5 w-5" /> All classes</NavLink>
          <NavLink to="/timetable" className={link}><CalendarDays className="h-5 w-5" /> Timetable</NavLink>
          <NavLink to="/settings" className={link}><Settings className="h-5 w-5" /> Settings</NavLink>
        </nav>
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          <div className="muted mb-2 px-3 text-xs font-semibold uppercase tracking-wider">{user.role === "teacher" ? "Teaching" : "Enrolled"}</div>
          <div className="space-y-0.5">
            {active.map((c) => (
              <NavLink key={c.id} to={`/classes/${c.id}`} className={link}>
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", THEME_DOT[c.theme] || "bg-indigo-500")} />
                <span className="truncate">{c.name}</span>
              </NavLink>
            ))}
            {!active.length && <p className="muted px-3 text-sm">No classes yet.</p>}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
          <Avatar name={user.name} color={user.avatarColor} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{user.name}</div><div className="muted text-xs capitalize">{user.role}</div></div>
          <button className="btn-ghost p-2" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
        </div>
      </aside>
      {menu && <div className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMenu(false)} />}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
          <button className="btn-ghost p-2 lg:hidden" onClick={() => setMenu(!menu)} aria-label="Menu">{menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <div className="flex-1" />
          <button className="btn-ghost p-2" onClick={toggleTheme} aria-label="Toggle dark mode">{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
          <Notifications />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8"><Outlet /></main>
      </div>
    </div>
  );
}
