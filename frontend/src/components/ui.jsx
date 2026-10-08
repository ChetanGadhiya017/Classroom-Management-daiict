import { useEffect } from "react";
import { Loader2, Paperclip, X } from "lucide-react";
import { cn, initials, STATUS, bytes } from "../lib/utils";
import { fileUrl } from "../lib/api";

export function Avatar({ name, color, size = 36, className }) {
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, background: color || "#6366f1", fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export const Spinner = ({ className }) => <Loader2 className={cn("animate-spin", className || "h-5 w-5")} />;

export function PageLoader() {
  return <div className="grid min-h-[40vh] place-items-center text-indigo-500"><Spinner className="h-7 w-7" /></div>;
}

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800", className)} />;
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Icon className="h-7 w-7" /></div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <p className="muted mt-1 max-w-sm text-sm">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={cn("card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-6 sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn-ghost -mr-2 p-2" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="label">{label}{hint && <span className="muted ml-1 font-normal">{hint}</span>}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

export function StatusChip({ status }) {
  const s = STATUS[status] || STATUS.assigned;
  return <span className={cn("chip", s.cls)}>{s.label}</span>;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function FileList({ files, onRemove }) {
  if (!files?.length) return null;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {files.map((f) => (
        <li key={f.id || f.name} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
          <Paperclip className="h-4 w-4 shrink-0 text-indigo-500" />
          {f.path ? <a className="min-w-0 flex-1 truncate text-sm font-medium hover:underline" href={fileUrl(f)}>{f.name}</a>
            : <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>}
          <span className="muted shrink-0 text-xs">{bytes(f.size)}</span>
          {onRemove && <button type="button" className="btn-ghost p-1" onClick={() => onRemove(f)} aria-label={`Remove ${f.name}`}><X className="h-4 w-4" /></button>}
        </li>
      ))}
    </ul>
  );
}

export function FilePicker({ files, setFiles, max = 5 }) {
  return (
    <div>
      <label className="btn-secondary cursor-pointer">
        <Paperclip className="h-4 w-4" /> Attach files
        <input type="file" multiple hidden onChange={(e) => { setFiles([...files, ...e.target.files].slice(0, max)); e.target.value = ""; }} />
      </label>
      <span className="muted ml-3 text-xs">PDF, Office, images, code or zip · up to 10 MB each</span>
      {files.length > 0 && <div className="mt-3"><FileList files={files} onRemove={(f) => setFiles(files.filter((x) => x !== f))} /></div>}
    </div>
  );
}
