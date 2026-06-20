import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Download,
  FileText,
  Pencil,
  Plus,
  Save,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";
import { documentApi } from "../../services/documentApi";
import {
  documentNoteApi,
  type DocumentNoteResponse,
} from "../../services/documentNoteApi";

const CURRENT_USER_ID = 1;

const isPublicHttpUrl = (url: string | undefined) =>
  Boolean(url && /^https?:\/\//i.test(url));

export function DocumentPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [fileUrl, setFileUrl] = useState("");
  const [publicFileUrl, setPublicFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileName, setFileName] = useState("Document");
  const [docxHtml, setDocxHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [notes, setNotes] = useState<DocumentNoteResponse[]>([]);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);

  const documentId = Number(id);

  const loadNotes = async () => {
    if (!documentId) return;

    try {
      setIsNotesLoading(true);
      const response = await documentNoteApi.getNotesByDocumentId(
        documentId,
        CURRENT_USER_ID,
      );
      setNotes(response.data ?? []);
    } catch (error) {
      console.error("Cannot load notes:", error);
      toast.error("Cannot load document notes.");
    } finally {
      setIsNotesLoading(false);
    }
  };

  useEffect(() => {
    if (!documentId) {
      toast.error("Invalid document id.");
      navigate("/app/library");
      return;
    }

    let currentBlobUrl = "";

    const loadDocument = async () => {
      try {
        setIsLoading(true);

        const [detailResponse, fileResponse] = await Promise.all([
          documentApi.getDocumentById(documentId),
          documentApi.getDocumentFile(documentId),
        ]);

        const documentData = detailResponse.data;

        const contentTypeHeader = fileResponse.headers["content-type"];
        const contentType =
          typeof contentTypeHeader === "string"
            ? contentTypeHeader
            : documentData.fileType || "application/octet-stream";

        const blob = new Blob([fileResponse.data], {
          type: contentType,
        });

        const isDocx =
          contentType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          documentData.originalName?.toLowerCase().endsWith(".docx") ||
          documentData.fileName?.toLowerCase().endsWith(".docx");

        const publicUrl = isPublicHttpUrl(documentData.fileUrl)
          ? documentData.fileUrl
          : "";

        if (isDocx && !publicUrl) {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value);
        } else {
          setDocxHtml("");
        }

        currentBlobUrl = window.URL.createObjectURL(blob);

        setFileUrl(currentBlobUrl);
        setPublicFileUrl(publicUrl);
        setFileType(contentType);
        setFileName(
          documentData.title ||
            documentData.originalName ||
            documentData.fileName ||
            "Document",
        );
      } catch (error) {
        console.error("Cannot preview document:", error);
        toast.error("Cannot preview document.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
    loadNotes();

    return () => {
      if (currentBlobUrl) {
        window.URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [documentId, navigate]);

  const resetNoteForm = () => {
    setNoteTitle("");
    setNoteContent("");
    setEditingNoteId(null);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      toast.error("Please enter note title.");
      return;
    }

    if (!noteContent.trim()) {
      toast.error("Please enter note content.");
      return;
    }

    try {
      if (editingNoteId) {
        await documentNoteApi.updateNote(editingNoteId, {
          userId: CURRENT_USER_ID,
          title: noteTitle.trim(),
          content: noteContent.trim(),
        });

        toast.success("Note updated.");
      } else {
        await documentNoteApi.createNote({
          userId: CURRENT_USER_ID,
          documentId,
          title: noteTitle.trim(),
          content: noteContent.trim(),
        });

        toast.success("Note created.");
      }

      resetNoteForm();
      loadNotes();
    } catch (error) {
      console.error("Cannot save note:", error);
      toast.error("Cannot save note.");
    }
  };

  const handleEditNote = (note: DocumentNoteResponse) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const handleDeleteNote = async () => {
    if (deleteNoteId === null) return;

    try {
      await documentNoteApi.deleteNote(deleteNoteId, CURRENT_USER_ID);
      toast.success("Note deleted.");

      if (editingNoteId === deleteNoteId) {
        resetNoteForm();
      }

      setDeleteNoteId(null);
      loadNotes();
    } catch (error) {
      console.error("Cannot delete note:", error);
      toast.error("Cannot delete note.");
    }
  };

  const handleDownload = async () => {
    try {
      const response = await documentApi.downloadDocument(documentId);

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Cannot download document:", error);
      toast.error("Cannot download document.");
    }
  };

  const renderPreview = () => {
    if (!fileUrl) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-slate-500 dark:text-slate-400">
          <FileText className="mb-4 h-12 w-12" />
          <p className="text-sm font-semibold">No preview available.</p>
        </div>
      );
    }

    if (fileType.startsWith("image/")) {
      return (
        <div className="flex h-full items-center justify-center overflow-auto bg-slate-100 p-6 dark:bg-slate-950">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-h-full max-w-full rounded-xl object-contain shadow"
          />
        </div>
      );
    }

    if (fileType.startsWith("video/")) {
      return (
        <div className="flex h-full items-center justify-center bg-black">
          <video src={fileUrl} controls className="max-h-full max-w-full" />
        </div>
      );
    }

    if (fileType.startsWith("audio/")) {
      return (
        <div className="flex h-full items-center justify-center bg-slate-100 dark:bg-slate-950">
          <audio src={fileUrl} controls className="w-full max-w-2xl" />
        </div>
      );
    }

    if (fileType === "application/pdf") {
      return (
        <iframe
          src={fileUrl}
          title={fileName}
          className="h-full w-full border-0"
        />
      );
    }

    const isDocx =
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.toLowerCase().endsWith(".docx");
    const officeViewerUrl =
      isDocx && publicFileUrl
        ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(publicFileUrl)}`
        : "";

    if (isDocx && officeViewerUrl) {
      return (
        <iframe
          src={officeViewerUrl}
          title={fileName}
          className="h-full w-full border-0 bg-white"
        />
      );
    }

    if (docxHtml) {
      return (
        <div className="h-full overflow-auto bg-slate-100 p-6 dark:bg-slate-950">
          <div
            className="docx-preview mx-auto min-h-full max-w-[900px] rounded-2xl bg-white px-12 py-10 text-slate-950 shadow-sm dark:bg-white dark:text-slate-950"
            dangerouslySetInnerHTML={{ __html: docxHtml }}
          />
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-500 dark:text-slate-400">
        <FileText className="mb-4 h-14 w-14" />
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          Preview is not supported for this file type
        </h2>
        <p className="mt-2 max-w-md text-sm">
          This file type may not be viewable directly in the browser. You can
          download it instead.
        </p>
        <button
          onClick={handleDownload}
          className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          Download file
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950">
      <style>{`
        .docx-preview {
          font-family: "Times New Roman", Times, serif;
          font-size: 16px;
          line-height: 1.45;
        }

        .docx-preview p { margin: 0 0 8px; }
        .docx-preview h1 { font-size: 28px; font-weight: 700; margin: 18px 0 10px; }
        .docx-preview h2 { font-size: 22px; font-weight: 700; margin: 16px 0 8px; }
        .docx-preview h3 { font-size: 18px; font-weight: 700; margin: 14px 0 6px; }
        .docx-preview table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .docx-preview th, .docx-preview td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
        .docx-preview ul, .docx-preview ol { margin: 8px 0 8px 24px; }
      `}</style>
      <header className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold text-slate-950 dark:text-white">
              {fileName}
            </h1>
          </div>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-h-0 border-r border-slate-200 dark:border-slate-800">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Loading preview...
            </div>
          ) : (
            renderPreview()
          )}
        </section>

        <aside className="flex min-h-0 flex-col bg-slate-50 dark:bg-slate-950">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-extrabold text-slate-950 dark:text-white">
                Document Notes
              </h2>
            </div>

            <input
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
              placeholder="Note title"
              className="mb-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />

            <textarea
              value={noteContent}
              onChange={(event) => setNoteContent(event.target.value)}
              placeholder="Write your note..."
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleSaveNote}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                {editingNoteId ? (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Note
                  </>
                )}
              </button>

              {editingNoteId && (
                <button
                  onClick={resetNoteForm}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {isNotesLoading ? (
              <p className="text-sm font-semibold text-slate-500">
                Loading notes...
              </p>
            ) : notes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-800">
                <StickyNote className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No notes yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Add your first note for this document.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-extrabold text-slate-950 dark:text-white">
                          {note.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(
                            note.updatedAt || note.createdAt,
                          ).toLocaleString("vi-VN", {
                            hour12: false,
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => setDeleteNoteId(note.id)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>
      {deleteNoteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/40">
              <Trash2 className="h-6 w-6" />
            </div>

            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
              Delete note?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              This note will be permanently deleted. This action cannot be
              undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteNoteId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteNote}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
