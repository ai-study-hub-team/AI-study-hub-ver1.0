import { Copy, Users } from "lucide-react";

interface CollaborationCardProps {
  onCopyLink: () => void;
}

export function CollaborationCard({ onCopyLink }: CollaborationCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40">
          <Users className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
            Ask your friends to help upload Materials
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Share a class link so teammates can add notes, slides, and recordings.
          </p>
        </div>
        <button
          onClick={onCopyLink}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          <Copy className="h-4 w-4" />
          Copy Link
        </button>
      </div>
    </section>
  );
}
