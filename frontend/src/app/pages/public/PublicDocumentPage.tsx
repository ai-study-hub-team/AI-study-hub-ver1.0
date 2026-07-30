import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { Download, FileText, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";
import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from "@aiden0z/pptx-renderer";

import {
  publicShareApi,
  type PublicDocumentResponse,
} from "../../services/publicShareApi";
import { ReportDocumentModal } from "../shares/components/ReportDocumentModal";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const resolveFileUrl = (url?: string) => {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  return `${API_BASE_URL}/${url}`;
};

const getFileNameFromUrl = (url?: string) => {
  if (!url) return "";

  try {
    const parsedUrl = new URL(resolveFileUrl(url));
    const name = parsedUrl.pathname.split("/").filter(Boolean).pop();
    return name ? decodeURIComponent(name) : "";
  } catch {
    const cleanUrl = url.split("?")[0].split("#")[0];
    const name = cleanUrl.split("/").filter(Boolean).pop();
    return name ? decodeURIComponent(name) : "";
  }
};

const getFileExtension = (name?: string) => {
  const source = name || "";
  const cleanSource = source.split("?")[0].split("#")[0];
  const parts = cleanSource.split(".");

  if (parts.length <= 1) return "";

  return parts.pop()?.toLowerCase() || "";
};

const isDocxDocument = (contentType: string, name: string) => {
  const lowerName = name.toLowerCase();

  return (
    contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  );
};

const isExcelDocument = (contentType: string, name: string) => {
  const lowerName = name.toLowerCase();

  return (
    contentType.includes("spreadsheet") ||
    contentType.includes("excel") ||
    contentType === "application/vnd.ms-excel" ||
    contentType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".csv")
  );
};

const isPowerPointDocument = (contentType: string, name: string) => {
  const lowerName = name.toLowerCase();

  return (
    contentType.includes("presentation") ||
    contentType.includes("powerpoint") ||
    contentType === "application/vnd.ms-powerpoint" ||
    contentType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    lowerName.endsWith(".ppt") ||
    lowerName.endsWith(".pptx")
  );
};

const isPptxDocument = (contentType: string, name: string) => {
  const lowerName = name.toLowerCase();

  return (
    contentType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    lowerName.endsWith(".pptx")
  );
};

const isTextDocument = (contentType: string, name: string) =>
  contentType.startsWith("text/") || name.toLowerCase().endsWith(".txt");

const getContentTypeFromBlob = (blob: Blob) => {
  return blob.type || "application/octet-stream";
};

export function PublicDocumentPage() {
  const { token } = useParams();

  const pptxContainerRef = useRef<HTMLDivElement | null>(null);

  const [documentData, setDocumentData] =
    useState<PublicDocumentResponse | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileName, setFileName] = useState("Document");

  const [docxHtml, setDocxHtml] = useState("");
  const [excelHtml, setExcelHtml] = useState("");
  const [textContent, setTextContent] = useState("");
  const [pptxBuffer, setPptxBuffer] = useState<ArrayBuffer | null>(null);
  const [pptxError, setPptxError] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);

  const title = useMemo(() => {
    return (
      documentData?.title ||
      documentData?.fileName ||
      documentData?.originalName ||
      fileName ||
      "Document"
    );
  }, [documentData, fileName]);

  const extension = useMemo(() => {
    return getFileExtension(fileName || title);
  }, [fileName, title]);

  useEffect(() => {
    if (!pptxBuffer || !pptxContainerRef.current) return;

    const container = pptxContainerRef.current;
    container.innerHTML = "";

    let isCancelled = false;

    const renderPptx = async () => {
      try {
        await PptxViewer.open(pptxBuffer, container, {
          zipLimits: RECOMMENDED_ZIP_LIMITS,
          listOptions: {
            windowed: true,
            initialSlides: 4,
            batchSize: 4,
          },
        });

        if (!isCancelled) {
          setPptxError("");
        }
      } catch (error) {
        console.error("Cannot render PPTX:", error);

        if (!isCancelled) {
          setPptxError("Cannot preview this PowerPoint file.");
        }
      }
    };

    renderPptx();

    return () => {
      isCancelled = true;
      container.innerHTML = "";
    };
  }, [pptxBuffer]);

  useEffect(() => {
    if (!token) {
      setLoadError("Invalid public link.");
      setIsLoading(false);
      return;
    }

    let currentBlobUrl = "";

    const loadPublicDocument = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const detailResponse = await publicShareApi.getPublicDocument(token);
        const data = detailResponse.data;

        setDocumentData(data);

        const previewFileName =
          data.originalName ||
          data.fileName ||
          getFileNameFromUrl(data.fileUrl) ||
          data.title ||
          "Document";

        setFileName(previewFileName);

        const fileResponse = await publicShareApi.getPublicDocumentFile(token);

        const responseBlob = fileResponse.data as Blob;
        const responseContentType = responseBlob.type?.toLowerCase();
        const contentType =
          responseContentType &&
          responseContentType !== "application/octet-stream"
            ? responseContentType
            : data.contentType || getContentTypeFromBlob(responseBlob);

        const blob = new Blob([responseBlob], {
          type: contentType,
        });

        const isDocx = isDocxDocument(contentType, previewFileName);
        const isExcel = isExcelDocument(contentType, previewFileName);
        const isPptx = isPptxDocument(contentType, previewFileName);
        const isText = isTextDocument(contentType, previewFileName);

        setDocxHtml("");
        setExcelHtml("");
        setTextContent("");
        setPptxBuffer(null);
        setPptxError("");

        if (isDocx) {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value);
        } else if (isExcel) {
          const arrayBuffer = await blob.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const html = XLSX.utils.sheet_to_html(worksheet);
          setExcelHtml(html);
        } else if (isPptx) {
          const arrayBuffer = await blob.arrayBuffer();
          setPptxBuffer(arrayBuffer);
        } else if (isText) {
          setTextContent(await blob.text());
        }

        currentBlobUrl = window.URL.createObjectURL(blob);

        setFileUrl(currentBlobUrl);
        setFileType(contentType);
      } catch (error) {
        console.error("Cannot load public document:", error);
        setLoadError("Failed to load this public document.");
        toast.error("Failed to load public document");
      } finally {
        setIsLoading(false);
      }
    };

    loadPublicDocument();

    return () => {
      if (currentBlobUrl) {
        window.URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [token]);

  const handleDownload = async () => {
    if (!token || !documentData?.allowDownload) return;

    try {
      const response = await publicShareApi.downloadPublicDocument(token);
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = window.document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || title || "Document";
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Cannot download public document:", error);
      toast.error("Download is not allowed or the link is no longer valid.");
    }
  };

  const renderPreview = () => {
    if (!fileUrl) {
      return (
        <div className="flex min-h-[520px] flex-col items-center justify-center text-center text-slate-500">
          <FileText className="mb-4 h-14 w-14" />
          <h2 className="text-lg font-extrabold text-slate-900">
            No preview available
          </h2>
          <p className="mt-2 text-sm">
            The server did not return a valid file for this document.
          </p>
        </div>
      );
    }

    const isPowerPoint = isPowerPointDocument(fileType, fileName);
    const isPptx = isPptxDocument(fileType, fileName);

    if (isPowerPoint) {
      if (!isPptx) {
        return (
          <div className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center text-slate-500">
            <FileText className="mb-4 h-14 w-14" />
            <h2 className="text-lg font-extrabold text-slate-900">
              PPT preview is not supported
            </h2>
            <p className="mt-2 max-w-md text-sm">
              Old .ppt files cannot be previewed in the browser. Please download
              the file or upload it as .pptx.
            </p>
          </div>
        );
      }

      return (
        <div className="overflow-auto bg-slate-50 p-3">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 border-b border-slate-200 pb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                PowerPoint Preview
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-950">
                {fileName}
              </h2>
            </div>

            {pptxError ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center text-slate-500">
                <FileText className="mb-4 h-12 w-12" />
                <p className="text-sm font-bold">{pptxError}</p>
              </div>
            ) : (
              <div
                ref={pptxContainerRef}
                className="pptx-preview min-h-[420px] overflow-auto"
              />
            )}
          </div>
        </div>
      );
    }

    if (fileType.startsWith("image/")) {
      return (
        <div className="flex min-h-[520px] items-center justify-center overflow-auto bg-slate-50 p-6">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-h-[calc(100vh-180px)] max-w-full rounded-xl object-contain shadow"
          />
        </div>
      );
    }

    if (fileType.startsWith("video/")) {
      return (
        <div className="flex min-h-[520px] items-center justify-center bg-black">
          <video src={fileUrl} controls className="max-h-full max-w-full" />
        </div>
      );
    }

    if (fileType.startsWith("audio/")) {
      return (
        <div className="flex min-h-[520px] items-center justify-center bg-slate-50">
          <audio src={fileUrl} controls className="w-full max-w-2xl" />
        </div>
      );
    }

    if (fileType === "application/pdf" || extension === "pdf") {
      return (
        <iframe
          src={fileUrl}
          title={fileName}
          className="h-[calc(100vh-150px)] w-full border-0 bg-white"
        />
      );
    }

    if (excelHtml) {
      return (
        <div className="overflow-auto bg-slate-50 p-3">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 border-b border-slate-200 pb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Spreadsheet Preview
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-950">
                {fileName}
              </h2>
            </div>

            <div
              className="excel-preview rounded-xl border border-slate-200 bg-white"
              dangerouslySetInnerHTML={{ __html: excelHtml }}
            />
          </div>
        </div>
      );
    }

    if (docxHtml) {
      return (
        <div className="overflow-auto bg-white p-3">
          <div
            className="docx-preview min-h-full w-full max-w-none bg-white px-8 py-10 text-slate-950"
            dangerouslySetInnerHTML={{ __html: docxHtml }}
          />
        </div>
      );
    }

    if (isTextDocument(fileType, fileName)) {
      return (
        <div className="min-h-[520px] overflow-auto bg-slate-50 p-4">
          <pre className="min-h-[500px] whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-white p-6 font-mono text-sm leading-6 text-slate-800 shadow-sm">
            {textContent}
          </pre>
        </div>
      );
    }

    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center text-slate-500">
        <FileText className="mb-4 h-14 w-14" />
        <h2 className="text-lg font-extrabold text-slate-900">
          Preview is not supported for this file type
        </h2>
        <p className="mt-2 max-w-md text-sm">
          This file type may not be viewable directly in the browser. You can
          download it instead.
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm font-semibold">Loading document...</span>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !documentData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-orange-500" />

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Document not available
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {loadError ||
              "This public link may be invalid, expired, or disabled."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
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

        .excel-preview table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .excel-preview th,
        .excel-preview td {
          border: 1px solid #d1d5db;
          padding: 8px;
          vertical-align: top;
        }

        .pptx-preview section,
        .pptx-preview .slide {
          margin: 0 auto 24px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
        }
      `}</style>

      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-600">
              AI Study Hub Public Document
            </p>

            <h1 className="mt-1 truncate text-xl font-bold text-slate-900">
              {title}
            </h1>

            {extension && (
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                {extension}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsReportOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
            >
              <ShieldAlert className="h-4 w-4" />
              Report
            </button>

            {documentData.allowDownload && fileUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {renderPreview()}
        </section>
      </main>

      {isReportOpen && (
        <ReportDocumentModal
          documentId={documentData.documentId}
          documentTitle={title}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
}

export default PublicDocumentPage;
