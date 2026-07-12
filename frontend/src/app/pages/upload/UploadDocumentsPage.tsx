import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  CheckCircle2,
  ChevronRight,
  FileAudio,
  FileQuestion,
  FileText,
  FileVideo,
  Folder,
  Presentation,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";
import { documentNoteApi } from "../../services/documentNoteApi";
import { categoryApi, type CategoryResponse } from "../../services/categoryApi";
import { folderApi, type FolderResponse } from "../../services/folderApi";
import { getCurrentUserId } from "../../services/apiClient";
import { filterMyDocuments } from "../../utils/documentOwnership";
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

type ListResponse<T> = T[] | { content?: T[] };

const normalizeList = <T,>(data: ListResponse<T> | null | undefined): T[] => {
  if (Array.isArray(data)) return data;
  return data?.content ?? [];
};

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

const getFolderOptionLabel = (folder: FolderResponse) => {
  if (folder.parentFolderName) {
    return `${folder.parentFolderName} / ${folder.name}`;
  }

  return folder.name;
};

export function UploadDocumentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const presetFolderId = searchParams.get("folderId");

  const [step, setStep] = useState<UploadStep>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [activeFilter, setActiveFilter] = useState<UploadFilter>("All");
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [folders, setFolders] = useState<FolderResponse[]>([]);

  const [details, setDetails] = useState({
    folderId: "",
    categoryId: "",
    documentTitle: "",
    noteTitle: "",
    notes: "",
  });

  const loadFolders = useCallback(async () => {
    try {
      const userId = getCurrentUserId();

      if (!userId) {
        toast.error("Please login again.");
        return;
      }

      const response = await folderApi.getFolders(userId);

      const folderData = normalizeList<FolderResponse>(
        response.data as ListResponse<FolderResponse>,
      ).filter((folder) => Number(folder.userId) === userId);

      setFolders(folderData);
    } catch (error) {
      console.error("Cannot load folders:", error);
      toast.error("Cannot load folders.");
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const userId = getCurrentUserId();

      if (!userId) {
        toast.error("Please login again.");
        return;
      }

      const response = await categoryApi.getCategories();

      setCategories(
        normalizeList<CategoryResponse>(
          response.data as ListResponse<CategoryResponse>,
        ).filter((category) => Number(category.userId) === userId),
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

      const mappedUploads = filterMyDocuments(
        response.data.content ?? [],
        userId,
      )
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
    loadFolders();
  }, [loadRecentUploads, loadCategories, loadFolders]);

  useEffect(() => {
    if (!presetFolderId) return;

    const folderId = Number(presetFolderId);

    if (!Number.isInteger(folderId) || folderId <= 0) return;

    setDetails((current) => ({
      ...current,
      folderId: String(folderId),
    }));
  }, [presetFolderId]);

  const filteredUploads = useMemo(() => {
    if (activeFilter === "All") return recentUploads;

    return recentUploads.filter((upload) => upload.aiStatus === activeFilter);
  }, [activeFilter, recentUploads]);

  const sortedFolders = useMemo(() => {
    return [...folders].sort((left, right) => {
      const leftName = getFolderOptionLabel(left).toLowerCase();
      const rightName = getFolderOptionLabel(right).toLowerCase();

      return leftName.localeCompare(rightName);
    });
  }, [folders]);

  const selectedPresetFolderExists = useMemo(() => {
    if (!presetFolderId) return false;

    return folders.some((folder) => String(folder.id) === presetFolderId);
  }, [folders, presetFolderId]);

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
      setStep(2);
      return;
    }

    if (step === 2) {
      const userId = getCurrentUserId();

      if (!userId) {
        toast.error("Please login again.");
        return;
      }

      try {
        setIsUploading(true);

        const documentTitle = details.documentTitle.trim();
        const noteTitle = details.noteTitle.trim();
        const noteContent = details.notes.trim();

        for (const file of files) {
          const finalDocumentTitle =
            documentTitle && files.length === 1 ? documentTitle : file.name;

          const uploadResponse = await documentApi.uploadDocument({
            file,
            title: finalDocumentTitle,
            userId,
            description: noteContent,
            documentType: file.type,
            visibility: "PRIVATE",
            ...(details.folderId ? { folderId: Number(details.folderId) } : { folderId: null }),
            ...(details.categoryId
              ? { categoryId: Number(details.categoryId) }
              : {}),
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
      folderId: presetFolderId || "",
      categoryId: "",
      documentTitle: "",
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
            Upload files, choose a folder, optionally add a category, and
            generate study materials in one flow.
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
                    Choose a folder or keep the document in Root. Category is optional and only used as a
                    label.
                  </p>
                </div>

                {folders.length === 0 && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                    <h3 className="font-bold text-blue-900 dark:text-blue-200">
                      No folders yet
                    </h3>

                    <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                      You can still upload to Root, or create a folder first.
                    </p>

                    <button
                      type="button"
                      onClick={() => navigate("/app/folders")}
                      className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                    >
                      Create Folder
                    </button>
                  </div>
                )}

                <UploadFileList files={files} onRemove={removeFile} />

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Document title
                    </span>

                    <input
                      value={details.documentTitle}
                      onChange={(event) =>
                        setDetails((current) => ({
                          ...current,
                          documentTitle: event.target.value,
                        }))
                      }
                      disabled={files.length > 1}
                      placeholder={
                        files.length === 1
                          ? `Default: ${files[0].name}`
                          : "Multiple files will keep original names"
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                    />

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {files.length === 1
                        ? "If empty, the original file name will be used."
                        : "Custom title is only available when uploading one file."}
                    </p>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Folder <span className="font-medium text-slate-400">optional</span>
                    </span>

                    <select
                      value={details.folderId}
                      onChange={(event) =>
                        setDetails((current) => ({
                          ...current,
                          folderId: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Root / No folder</option>

                      {sortedFolders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {getFolderOptionLabel(folder)}
                        </option>
                      ))}
                    </select>

                    {presetFolderId &&
                      details.folderId === presetFolderId &&
                      selectedPresetFolderExists && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                          Folder was preselected from the folder page.
                        </p>
                      )}

                    <button
                      type="button"
                      onClick={() => navigate("/app/folders")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      <Folder className="h-3.5 w-3.5" />
                      Create or manage folders
                    </button>
                  </label>

                  <label className="block space-y-1.5 md:col-span-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Category{" "}
                      <span className="font-medium text-slate-400">
                        optional
                      </span>
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
                      <option value="">No category</option>

                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Category is only a label. Documents are stored in folders.
                    </p>
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
                  type="button"
                  onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Back
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
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
                  type="button"
                  onClick={resetFlow}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-blue-700"
                >
                  Upload More Files
                </button>
              )}
            </div>
          </section>

          <CollaborationCard
            onCopyLink={() => navigate("/app/shares")}
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