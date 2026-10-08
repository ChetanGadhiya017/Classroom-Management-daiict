import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, MoreHorizontal, Pin, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { ago, DAYS } from "../../lib/utils";
import { Avatar, Empty, Skeleton, Spinner } from "../../components/ui";

function Post({ p, classId, refresh }) {
  const [comment, setComment] = useState("");
  const [menu, setMenu] = useState(false);
  const run = (path, method, body) => api(`/classes/${classId}/posts/${p.id}${path}`, { method, body }).then(refresh).catch((e) => toast.error(e.message));
  const add = useMutation({ mutationFn: () => api(`/classes/${classId}/posts/${p.id}/comments`, { method: "POST", body: { body: comment } }),
    onSuccess: () => { setComment(""); refresh(); }, onError: (e) => toast.error(e.message) });
  return (
    <article className="card">
      <div className="flex items-start gap-3 p-5">
        <Avatar name={p.author.name} color={p.author.avatarColor} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm"><span className="font-semibold">{p.author.name}</span><span className="muted">· {ago(p.createdAt)}</span>
            {p.pinned && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><Pin className="h-3 w-3" />Pinned</span>}</div>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{p.body}</p>
        </div>
        {p.canEdit && (
          <div className="relative">
            <button className="btn-ghost p-1.5" onClick={() => setMenu(!menu)} aria-label="Post options"><MoreHorizontal className="h-5 w-5" /></button>
            {menu && (
              <div className="card absolute right-0 z-10 mt-1 w-40 overflow-hidden py-1 text-sm" onMouseLeave={() => setMenu(false)}>
                <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMenu(false); run("", "PATCH", { pinned: !p.pinned }); }}><Pin className="h-4 w-4" />{p.pinned ? "Unpin" : "Pin to top"}</button>
                <button className="flex w-full items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950" onClick={() => { setMenu(false); if (confirm("Delete this announcement?")) run("", "DELETE"); }}><Trash2 className="h-4 w-4" />Delete</button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
        {p.comments.length > 0 && (
          <ul className="mb-3 space-y-3">
            {p.comments.map((c) => (
              <li key={c.id} className="group flex gap-3">
                <Avatar name={c.author.name} color={c.author.avatarColor} size={28} />
                <div className="min-w-0 flex-1 text-sm"><span className="font-semibold">{c.author.name}</span> <span className="muted text-xs">{ago(c.createdAt)}</span><p className="whitespace-pre-wrap">{c.body}</p></div>
                {c.canDelete && <button className="btn-ghost p-1 opacity-0 group-hover:opacity-100" onClick={() => run(`/comments/${c.id}`, "DELETE")} aria-label="Delete comment"><Trash2 className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        )}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (comment.trim()) add.mutate(); }}>
          <input className="input" placeholder="Add a class comment…" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
          <button className="btn-ghost px-3" disabled={!comment.trim() || add.isPending} aria-label="Send comment">{add.isPending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}</button>
        </form>
      </div>
    </article>
  );
}

export default function Stream() {
  const c = useOutletContext();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const key = ["posts", c.id];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api(`/classes/${c.id}/posts`) });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const post = useMutation({ mutationFn: () => api(`/classes/${c.id}/posts`, { method: "POST", body: { body } }),
    onSuccess: () => { setBody(""); refresh(); toast.success("Announcement posted"); }, onError: (e) => toast.error(e.message) });
  const today = (new Date().getDay() + 6) % 7;
  const upcoming = c.timetable.filter((s) => s.day >= today).slice(0, 3);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        {c.role === "teacher" && (
          <form className="card p-4" onSubmit={(e) => { e.preventDefault(); post.mutate(); }}>
            <div className="flex gap-3"><Avatar name={user.name} color={user.avatarColor} />
              <textarea className="input min-h-[80px]" placeholder="Announce something to your class…" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} /></div>
            <div className="mt-3 flex justify-end"><button className="btn-primary" disabled={!body.trim() || post.isPending}>{post.isPending && <Spinner className="h-4 w-4" />}Post</button></div>
          </form>
        )}
        {isLoading ? <Skeleton className="h-40" /> : data.posts.length ? data.posts.map((p) => <Post key={p.id} p={p} classId={c.id} refresh={refresh} />)
          : <div className="card"><Empty icon={MessageSquare} title="No announcements yet">{c.role === "teacher" ? "Post the first update for your class." : "Your teacher's announcements will appear here."}</Empty></div>}
      </div>
      <aside className="space-y-4">
        {c.description && <div className="card p-4"><h3 className="mb-1 text-sm font-bold">About</h3><p className="muted whitespace-pre-wrap text-sm">{c.description}</p></div>}
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-bold">This week</h3>
          {upcoming.length ? <ul className="space-y-2 text-sm">{upcoming.map((s) => <li key={s._id} className="flex justify-between"><span>{DAYS[s.day].slice(0, 3)}</span><span className="font-mono">{s.start}–{s.end}</span></li>)}</ul>
            : <p className="muted text-sm">{c.timetable.length ? "No more classes this week." : "No timetable set."}</p>}
        </div>
      </aside>
    </div>
  );
}
