import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";
import { documentApi } from "../../services/documentApi";

export function DocumentPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileName, setFileName] = useState("Document");
  const [docxHtml, setDocxHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const documentId = Number(id);

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

        if (isDocx) {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value);
        } else {
          setDocxHtml("");
        }

        currentBlobUrl = window.URL.createObjectURL(blob);

        setFileUrl(currentBlobUrl);
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

    return () => {
      if (currentBlobUrl) {
        window.URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [documentId, navigate]);

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

    if (docxHtml) {
      return (
        <div className="h-full overflow-auto bg-slate-100 p-6 dark:bg-slate-950">
          <div
            className="mx-auto min-h-full max-w-4xl rounded-2xl bg-white p-10 text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
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

      <main className="min-h-0 flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading preview...
          </div>
        ) : (
          renderPreview()
        )}
      </main>
    </div>
  );
}