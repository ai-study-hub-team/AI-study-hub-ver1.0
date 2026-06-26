import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle2,
  ChevronRight,
  FileAudio,
  FileQuestion,
  FileText,
  FileVideo,
  Presentation,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";
import { documentNoteApi } from "../../services/documentNoteApi";
import { categoryApi, type CategoryResponse } from "../../services/categoryApi";
import { getCurrentUserId } from "../../services/apiClient";
import { CollaborationCard } from "./components/CollaborationCard";
import { RecentUploadsCard } from "./components/RecentUploadsCard";
import { StudyMaterialsCard } from "./components/StudyMaterialsCard";
import { UploadDropzone } from "./components/UploadDropzone";
import { UploadFileList } from "./components/UploadFileList";
import { UploadStepper } from "./components/UploadStepper";
import { UploadTypeButton } from "./components/UploadTypeButton";
import type {
  RecentUpload,
  UploadFilter,
  UploadStep,
  UploadType,
} from "./types";

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
  const navigate = useNavigate();

  const [step, setStep] = useState<UploadStep>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [activeFilter, setActiveFilter] = useState<UploadFilter>("All");
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  const [details, setDetails] = useState({
    categoryId: "",
    noteTitle: "",
    notes: "",
  });

  const loadCategories = useCallback(async () => {
    try {
      const userId = getCurrentUserId();

      if (!userId) {
        toast.error("Please login again.");
        return;
      }

      const response = await categoryApi.getCategories();

      setCategories(
        (response.data ?? []).filter(
          (category) => Number(category.userId) === userId,
        ),
      );
    } catch (error) {
      console.error("Cannot load categories:", error);
      toast.error("Cannot load categories.");
    }
  }, []);

  const loadRecentUploads = useCallback(async () => {
    try {
      const userId = getCurrentUserId();

      if (!userId) {
        toast.error("Please login again.");
        return;
      }

      const response = await documentApi.getDocuments({
        page: 0,
        size: 20,
      });

      const mappedUploads = (response.data.content ?? [])
        .sort((left, right) => {
          const leftDate = new Date(left.uploadedAt || "").getTime();
          const rightDate = new Date(right.uploadedAt || "").getTime();

          return rightDate - leftDate;
        })
        .slice(0, 5)
        .map(
          (document): RecentUpload => ({
            id: document.id,
            name: document.name,
            type: "",
            documentStatus: document.documentStatus,
            aiStatus: document.aiStatus,
            uploadedAt: formatUploadedAt(document.uploadedAt),
          }),
        );

      setRecentUploads(mappedUploads);
    } catch (error) {
      console.error("Cannot load recent uploads:", error);
      toast.error("Cannot load recent uploads.");
    }
  }, []);

  useEffect(() => {
    loadRecentUploads();
    loadCategories();
  }, [loadRecentUploads, loadCategories]);

  const filteredUploads = useMemo(() => {
    if (activeFilter === "All") return recentUploads;

    return recentUploads.filter((upload) => upload.aiStatus === activeFilter);
  }, [activeFilter, recentUploads]);

  const addFiles = (selectedFiles: File[]) => {
    setFiles((current) => [...current, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const goNext = async () => {
    if (step === 1 && files.length === 0) {
      toast.error("Please select at least one file.");
      return;
    }

    if (step === 1) {
      if (categories.length === 0) {
        toast.error("Please create a category before uploading documents.");
        navigate("/app/categories");
        return;
      }

      setStep(2);
      return;
    }

    if (step === 2) {
      if (categories.length === 0) {
        toast.error("Please create a category before uploading documents.");
        navigate("/app/categories");
        return;
      }

      if (!details.categoryId) {
        toast.error("Please select a category.");
        return;
      }

      const userId = getCurrentUserId();

      if (!userId) {
        toast.error("Please login again.");
        return;
      }

      try {
        setIsUploading(true);

        const noteTitle = details.noteTitle.trim();
        const noteContent = details.notes.trim();

        for (const file of files) {
          const uploadResponse = await documentApi.uploadDocument({
            file,
            title: file.name,
            userId,
            description: noteContent,
            documentType: file.type,
            visibility: "PRIVATE",
            categoryId: Number(details.categoryId),
          });

          const uploadedDocument = uploadResponse.data;

          if (noteTitle || noteContent) {
            await documentNoteApi.createNote({
              userId,
              documentId: uploadedDocument.id,
              title: noteTitle || "Upload note",
              content: noteContent || "",
            });
          }
        }

        await loadRecentUploads();
        setStep(3);
        toast.success("Upload complete. Study materials are being generated.");
      } catch (error: any) {
        console.error("Upload failed:", error);
        toast.error(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Upload failed. Please try again.",
        );
      } finally {
        setIsUploading(false);
      }
    }
  };

  const resetFlow = () => {
    setStep(1);
    setFiles([]);
    setDetails({
      categoryId: "",
      noteTitle: "",
      notes: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
            Upload
          </p>

          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white">
            Add study materials
          </h1>

          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Upload files, add a little context, and generate study materials in
            one flow.
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
                  <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
                    Set Details
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Select a category and add a note for this upload.
                  </p>
                </div>

                {categories.length === 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <h3 className="font-bold text-amber-900 dark:text-amber-200">
                      No categories yet
                    </h3>

                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                      Please create a category before uploading documents.
                    </p>

                    <button
                      onClick={() => navigate("/app/categories")}
                      className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                    >
                      Create Category
                    </button>
                  </div>
                )}

                <UploadFileList files={files} onRemove={removeFile} />

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Category
                    </span>

                    <select
                      value={details.categoryId}
                      onChange={(event) =>
                        setDetails((current) => ({
                          ...current,
                          categoryId: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Select category</option>

                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                      Document Notes
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <input
                      value={details.noteTitle}
                      onChange={(event) =>
                        setDetails((current) => ({
                          ...current,
                          noteTitle: event.target.value,
                        }))
                      }
                      placeholder="Note title"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                    />

                    <textarea
                      value={details.notes}
                      onChange={(event) =>
                        setDetails((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      rows={5}
                      placeholder="Write your note..."
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                  <CheckCircle2 className="h-9 w-9" />
                </div>

                <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
                  Upload Complete
                </h2>

                <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">
                  Your files are queued for AI processing. We will turn them
                  into summaries, study plans, and progress tracking.
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
                  {isUploading
                    ? "Uploading..."
                    : step === 1
                      ? "Next: Set Details"
                      : "Complete Upload"}
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

          <CollaborationCard
            onCopyLink={() => toast.success("Upload link copied.")}
          />
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
