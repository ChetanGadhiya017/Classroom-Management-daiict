import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { BookOpenCheck, CalendarDays, ClipboardCheck, GraduationCap, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { Field, Spinner } from "../components/ui";
import { cn, firstName } from "../lib/utils";

const FEATURES = [
  [BookOpenCheck, "Assignments with files, due dates, late policy and grading"],
  [Users, "Join classes with a 6-character code"],
  [ClipboardCheck, "Attendance with per-student percentages"],
  [CalendarDays, "One weekly timetable across all your classes"],
];

export default function AuthPage({ mode }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", rollNo: "" });
  const [error, setError] = useState("");
  if (user) return <Navigate to={location.state?.from || "/"} replace />;
  const isLogin = mode === "login";
  const m = isLogin ? login : register;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    setError("");
    const body = isLogin ? { email: form.email, password: form.password } : { ...form, rollNo: form.rollNo || undefined };
    m.mutate(body, {
      onSuccess: (r) => { toast.success(isLogin ? `Welcome back, ${firstName(r.user.name)}!` : "Account created"); navigate(location.state?.from || "/"); },
      onError: (err) => setError(err.message),
    });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/40 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-fuchsia-600/30 blur-3xl" />
        <div className="relative flex items-center gap-2.5 font-extrabold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600"><GraduationCap className="h-5 w-5" /></span>Classroom Manager</div>
        <div className="relative">
          <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Everything your class needs, in one calm place.</h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-3 text-slate-300"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Icon className="h-5 w-5" /></span>{text}</li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-slate-500">Built at DA-IICT · v2</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight">{isLogin ? "Sign in" : "Create your account"}</h2>
            <p className="muted mt-1 text-sm">{isLogin ? "Welcome back! Enter your details." : "It takes less than a minute."}</p>
          </div>
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
                {["student", "teacher"].map((r) => (
                  <button type="button" key={r} onClick={() => setForm({ ...form, role: r })}
                    className={cn("rounded-lg py-2 text-sm font-semibold capitalize transition", form.role === r ? "bg-white shadow dark:bg-slate-800" : "muted")}>
                    I'm a {r}
                  </button>
                ))}
              </div>
              <Field label="Full name"><input className="input" value={form.name} onChange={set("name")} required minLength={2} autoComplete="name" /></Field>
              {form.role === "student" && <Field label="Roll number" hint="(optional)"><input className="input" value={form.rollNo} onChange={set("rollNo")} maxLength={20} /></Field>}
            </>
          )}
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={set("email")} required autoComplete="email" /></Field>
          <Field label="Password" hint={isLogin ? "" : "(8+ characters)"}>
            <input className="input" type="password" value={form.password} onChange={set("password")} required minLength={isLogin ? 1 : 8} autoComplete={isLogin ? "current-password" : "new-password"} />
          </Field>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
          <button className="btn-primary w-full py-2.5" disabled={m.isPending}>{m.isPending && <Spinner className="h-4 w-4" />}{isLogin ? "Sign in" : "Create account"}</button>
          <p className="muted text-center text-sm">
            {isLogin ? "New here? " : "Already have an account? "}
            <Link className="font-semibold text-indigo-600 hover:underline" to={isLogin ? "/register" : "/login"}>{isLogin ? "Create an account" : "Sign in"}</Link>
          </p>
          {isLogin && <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700">Demo (after <code>npm run seed</code>): <b>teacher@demo.local</b> / teacher123 · <b>student@demo.local</b> / student123</p>}
        </form>
      </section>
    </div>
  );
}
