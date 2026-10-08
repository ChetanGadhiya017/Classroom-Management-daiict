import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow } from "date-fns";

export const cn = (...c) => c.filter(Boolean).join(" ");

export const THEMES = {
  indigo: "from-indigo-600 to-violet-600",
  emerald: "from-emerald-600 to-teal-600",
  rose: "from-rose-600 to-pink-600",
  amber: "from-amber-500 to-orange-600",
  sky: "from-sky-600 to-blue-600",
  violet: "from-violet-600 to-fuchsia-600",
  teal: "from-teal-600 to-cyan-600",
  slate: "from-slate-700 to-slate-900",
};
export const THEME_DOT = {
  indigo: "bg-indigo-500", emerald: "bg-emerald-500", rose: "bg-rose-500", amber: "bg-amber-500",
  sky: "bg-sky-500", violet: "bg-violet-500", teal: "bg-teal-500", slate: "bg-slate-500",
};

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TITLES = /^(dr|prof|mr|mrs|ms|miss|sir|shri|smt)\.?$/i;
/** "Dr. Neha Sharma" → "Neha" */
export function firstName(name = "") {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.find((p) => !TITLES.test(p)) || parts[0] || "";
}

export function initials(name = "") {
  return name.split(/\s+/).filter((p) => /[A-Za-z]/.test(p[0] || "") && !TITLES.test(p)).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
}

export function dueLabel(due) {
  if (!due) return "No due date";
  const d = new Date(due);
  if (isToday(d)) return `Due today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Due tomorrow, ${format(d, "h:mm a")}`;
  return `${isPast(d) ? "Was due" : "Due"} ${format(d, "EEE d MMM, h:mm a")}`;
}

export const ago = (d) => `${formatDistanceToNowStrict(new Date(d))} ago`;
export const shortDate = (d) => format(new Date(d), "d MMM yyyy");
export const bytes = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export const STATUS = {
  assigned: { label: "Assigned", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  submitted: { label: "Turned in", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  late: { label: "Turned in late", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  missing: { label: "Missing", cls: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  graded: { label: "Graded", cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
};

export const ATT = {
  present: { label: "Present", short: "P", cls: "bg-emerald-500 text-white" },
  late: { label: "Late", short: "L", cls: "bg-amber-500 text-white" },
  absent: { label: "Absent", short: "A", cls: "bg-rose-500 text-white" },
  excused: { label: "Excused", short: "E", cls: "bg-slate-500 text-white" },
};
