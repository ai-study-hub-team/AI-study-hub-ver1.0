import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  FileAudio,
  FileQuestion,
  FileText,
  FileVideo,
  Presentation,
  RotateCcw,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";
import { CollaborationCard } from "./components/CollaborationCard";
import { RecentUploadsCard } from "./components/RecentUploadsCard";
import { StudyMaterialsCard } from "./components/StudyMaterialsCard";
import { UploadDropzone } from "./components/UploadDropzone";
import { UploadFileList } from "./components/UploadFileList";
import { UploadStepper } from "./components/UploadStepper";
import { UploadTypeButton } from "./components/UploadTypeButton";
import type { RecentUpload, UploadFilter, UploadStep, UploadType } from "./types";

const uploadTypes: UploadType[] = [
  { label: "Powerpoints", icon: Presentation },
  { label: "PDF Documents", icon: FileText },
  { label: "Audio Files", icon: FileAudio },
  { label: "Video Files", icon: FileVideo },
  { label: "Import Quizlet", icon: FileQuestion },
  { label: "Youtube Video", icon: Youtube },
];

const formatUploadedAt = (date: string | undefined) => {
  if (!date) return "";

  const uploadedAt = new Date(date);
  if (Number.isNaN(uploadedAt.getTime())) return date;

  return uploadedAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export function UploadDocumentsPage() {
  const [step, setStep] = useState<UploadStep>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [activeFilter, setActiveFilter] = useState<UploadFilter>("All");
  const [details, setDetails] = useState({
    className: "Class Materials",
    subject: "General Studies",
    notes: "",
  });

  const loadRecentUploads = useCallback(async () => {
    try {
      const response = await documentApi.getDocuments({
        page: 0,
        size: 20,
      });

      const mappedUploads = response.data.content
        .sort((left, right) => {
          const leftDate = new Date(left.uploadedAt || "").getTime();
          const rightDate = new Date(right.uploadedAt || "").getTime();
          return rightDate - leftDate;
        })
        .slice(0, 5)
        .map((document): RecentUpload => ({
          id: document.id,
          name: document.name,
          type: document.type || "Document",
          documentStatus: document.documentStatus,
          aiStatus: document.aiStatus,
          uploadedAt: formatUploadedAt(document.uploadedAt),
        }));

      setRecentUploads(mappedUploads);
} catch (error) {
  console.error("Cannot load recent uploads:", error);
  toast.error("Cannot load recent uploads.");
}
  }, []);

  useEffect(() => {
    loadRecentUploads();
  }, [loadRecentUploads]);

  const filteredUploads = useMemo(() => {
    if (activeFilter === "All") return recentUploads;
    return recentUploads.filter((upload) => upload.aiStatus === activeFilter);
  }, [activeFilter, recentUploads]);

  const addFiles = (selectedFiles: File[]) => {
    setFiles((current) => [...current, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const goNext = async () => {
    if (step === 1 && files.length === 0) {
      toast.error("Please select at least one file.");
      return;
    }

    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      try {
        setIsUploading(true);

        for (const file of files) {
          await documentApi.uploadDocument({
            file,
            title: file.name,
            userId: 1,
            description: details.notes,
            documentType: file.type,
            visibility: "PRIVATE",
            categoryId: undefined,
          });
        }

        await loadRecentUploads();
        setStep(3);
        toast.success("Upload complete. Study materials are being generated.");
      } catch (error) {
        toast.error("Upload failed. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const resetFlow = () => {
    setStep(1);
    setFiles([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Upload</p>
          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">Add class materials</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Upload files, add a little context, and generate study materials in one flow.
          </p>
        </div>
      </div>

      <UploadStepper currentStep={step} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {step === 1 && (
              <div className="space-y-5">
                <UploadDropzone onFilesSelected={addFiles} />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {uploadTypes.map((type) => (
                    <UploadTypeButton key={type.label} type={type} />
                  ))}
                </div>

                <button className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700">
                  View more upload types
                  <ChevronRight className="h-4 w-4" />
                </button>

                <UploadFileList files={files} onRemove={removeFile} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Set Details</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Add class context so the generated materials are easier to organize.
                  </p>
                </div>

                <UploadFileList files={files} onRemove={removeFile} />

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Class</span>
                    <input
                      value={details.className}
                      onChange={(event) => setDetails((current) => ({ ...current, className: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Subject</span>
                    <select
                      value={details.subject}
                      onChange={(event) => setDetails((current) => ({ ...current, subject: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option>General Studies</option>
                      <option>Biology</option>
                      <option>Chemistry</option>
                      <option>Mathematics</option>
                      <option>History</option>
                    </select>
                  </label>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Notes</span>
                  <textarea
                    value={details.notes}
                    onChange={(event) => setDetails((current) => ({ ...current, notes: event.target.value }))}
                    rows={4}
                    placeholder="Exam focus, chapters, teacher instructions..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Upload Complete</h2>
                <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
                  Your files are queued for AI processing. We will turn them into summaries, study plans, and progress tracking.
                </p>
                <div className="mt-5 w-full max-w-xl">
                  <UploadFileList files={files} onRemove={removeFile} />
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
              {step > 1 && (
                <button
                  onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={goNext}
                  disabled={isUploading}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? "Uploading..." : step === 1 ? "Next: Set Details" : "Complete Upload"}
                </button>
              ) : (
                <button
                  onClick={resetFlow}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-blue-700"
                >
                  Upload More Files
                </button>
              )}
            </div>
          </section>

          <CollaborationCard onCopyLink={() => toast.success("Class upload link copied.")} />
        </div>

        <aside className="space-y-5">
          <StudyMaterialsCard />
          <RecentUploadsCard
            uploads={filteredUploads}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        </aside>
      </div>
    </div>
  );
}
