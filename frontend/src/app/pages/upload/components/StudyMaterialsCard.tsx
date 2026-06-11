import { BookOpen, CheckCircle2, ClipboardList, Sparkles } from "lucide-react";

export function StudyMaterialsCard() {
  const items = [
    { label: "Study Materials", icon: BookOpen },
    { label: "Plans & Progress Tracking", icon: ClipboardList },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
            We will turn it into Digestible Study Materials
          </h2>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
            <item.icon className="h-5 w-5 text-blue-600" />
            <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
        ))}
      </div>
    </section>
  );
}
