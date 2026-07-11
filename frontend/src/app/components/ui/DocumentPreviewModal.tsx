import * as XLSX from "xlsx";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PptxViewer, RECOMMENDED_ZIP_LIMITS } from "@aiden0z/pptx-renderer";
import { Download, FileWarning, Loader2, X } from "lucide-react";
import mammoth from "mammoth";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export interface PreviewDocument {
  id: number;
  title?: string;
  name?: string;
  originalName?: string;
  fileName?: string;
  fileType?: string;
  mimeType?: string;
  type?: string;
}

interface DocumentPreviewModalProps {
  document: PreviewDocument | null;
  onClose: () => void;
}

const getDocumentName = (document: PreviewDocument) =>
  document.originalName ||
  document.fileName ||
  document.name ||
  document.title ||
  `Document #${document.id}`;

const getMimeType = (document: PreviewDocument, responseType?: unknown) => {
  if (typeof responseType === "string" && responseType) return responseType;

  return (
    document.mimeType ||
    document.fileType ||
    document.type ||
    "application/octet-stream"
  );
};

const isDocxFile = (mimeType: string, fileName: string) =>
  mimeType.includes("wordprocessingml") ||
  mimeType.includes("msword") ||
  fileName.toLowerCase().endsWith(".docx") ||
  fileName.toLowerCase().endsWith(".doc");

const isPdfFile = (mimeType: string, fileName: string) =>
  mimeType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf");

const isExcelFile = (mimeType: string, fileName: string) => {
  const lowerName = fileName.toLowerCase();

  return (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".csv")
  );
};

const isPptxFile = (mimeType: string, fileName: string) =>
  mimeType.includes("presentationml") || fileName.toLowerCase().endsWith(".pptx");

export function DocumentPreviewModal({
  document,
  onClose,
}: DocumentPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [docxHtml, setDocxHtml] = useState("");
  const [excelHtml, setExcelHtml] = useState("");
  const [pptxBuffer, setPptxBuffer] = useState<ArrayBuffer | null>(null);
  const [mimeType, setMimeType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [viewerWidth, setViewerWidth] = useState(900);

  const viewerRef = useRef<HTMLDivElement | null>(null);
  const pptxContainerRef = useRef<HTMLDivElement | null>(null);

  const documentName = useMemo(
    () => (document ? getDocumentName(document) : "Document"),
    [document],
  );

  useEffect(() => {
    if (!viewerRef.current) return;

    const element = viewerRef.current;
    const updateWidth = () => {
      setViewerWidth(Math.max(320, Math.min(element.clientWidth - 32, 1000)));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, [document]);

  useEffect(() => {
    if (!pptxBuffer || !pptxContainerRef.current) return;

    const container = pptxContainerRef.current;
    container.innerHTML = "";
    let cancelled = false;

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
      } catch (renderError) {
        console.error("Cannot render PPTX:", renderError);
        if (!cancelled) setError("Cannot preview this PowerPoint file.");
      }
    };

    void renderPptx();

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [pptxBuffer]);

  useEffect(() => {
    if (!document) return;

    let active = true;
    let objectUrl = "";

    const loadPreview = async () => {
      setLoading(true);
      setError("");
      setPreviewUrl("");
      setDocxHtml("");
      setExcelHtml("");
      setPptxBuffer(null);
      setMimeType("");
      setPdfPageCount(0);

      try {
        const response = await documentApi.getDocumentFile(document.id);
        const resolvedMimeType = getMimeType(
          document,
          response.headers?.["content-type"],
        );
        const blob = new Blob([response.data], { type: resolvedMimeType });
        const fileName = getDocumentName(document);

        if (isDocxFile(resolvedMimeType, fileName)) {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (active) setDocxHtml(result.value);
        } else if (isExcelFile(resolvedMimeType, fileName)) {
          const arrayBuffer = await blob.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          if (active) setExcelHtml(XLSX.utils.sheet_to_html(firstSheet));
        } else if (isPptxFile(resolvedMimeType, fileName)) {
          const arrayBuffer = await blob.arrayBuffer();
          if (active) setPptxBuffer(arrayBuffer);
        } else {
          objectUrl = window.URL.createObjectURL(blob);
          if (active) setPreviewUrl(objectUrl);
        }

        if (active) setMimeType(resolvedMimeType);
      } catch (loadError) {
        console.error("Cannot preview document:", loadError);
        if (active) {
          setError(
            "Cannot preview this document. The server may not allow access to this file.",
          );
          toast.error("Cannot preview document.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPreview();

    return () => {
      active = false;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [document]);

  if (!document) return null;

  const handleDownload = async () => {
    try {
      const response = await documentApi.downloadDocument(document.id);
      const responseContentType = response.headers?.["content-type"];
      const downloadMimeType =
        typeof responseContentType === "string"
          ? responseContentType
          : mimeType || "application/octet-stream";

      const blob = new Blob([response.data], {
        type: downloadMimeType,
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = documentName;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Cannot download document:", downloadError);
      toast.error("Cannot download document.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={onClose}
    >
      <div
        className="flex h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Document preview
            </h2>
            <p
              className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400"
              title={documentName}
            >
              {documentName}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Close document preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={viewerRef}
          className="document-popup-viewer min-h-0 flex-1 overflow-auto bg-slate-200/70 p-3 dark:bg-slate-950 sm:p-5"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 font-bold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading document...
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center font-semibold text-red-600 dark:text-red-300">
              <FileWarning className="h-10 w-10" />
              {error}
            </div>
          ) : docxHtml ? (
            <div className="mx-auto min-h-full w-full max-w-[1000px] bg-white px-8 py-10 shadow-lg sm:px-14 sm:py-14">
              <div
                className="docx-preview text-slate-950"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            </div>
          ) : excelHtml ? (
            <div className="mx-auto min-h-full w-full max-w-6xl overflow-auto rounded-2xl bg-white p-5 shadow-lg">
              <div
                className="excel-preview"
                dangerouslySetInnerHTML={{ __html: excelHtml }}
              />
            </div>
          ) : pptxBuffer ? (
            <div
              ref={pptxContainerRef}
              className="pptx-preview mx-auto min-h-full w-full max-w-6xl"
            />
          ) : previewUrl && isPdfFile(mimeType, documentName) ? (
            <div className="flex min-h-full flex-col items-center gap-5">
              <Document
                file={previewUrl}
                loading={
                  <div className="flex items-center gap-2 font-bold text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading PDF...
                  </div>
                }
                onLoadSuccess={({ numPages }) => setPdfPageCount(numPages)}
                onLoadError={(pdfError) => {
                  console.error("Cannot render PDF:", pdfError);
                  setError("Cannot preview this PDF file.");
                }}
              >
                {Array.from({ length: pdfPageCount }, (_, index) => (
                  <Page
                    key={`pdf-page-${index + 1}`}
                    pageNumber={index + 1}
                    width={viewerWidth}
                    renderAnnotationLayer
                    renderTextLayer
                    className="overflow-hidden rounded-sm bg-white shadow-lg"
                  />
                ))}
              </Document>
            </div>
          ) : previewUrl && mimeType.startsWith("image/") ? (
            <div className="flex min-h-full items-center justify-center">
              <img
                src={previewUrl}
                alt={documentName}
                className="max-h-full max-w-full rounded-xl object-contain shadow-lg"
              />
            </div>
          ) : previewUrl && mimeType.startsWith("video/") ? (
            <video
              src={previewUrl}
              controls
              className="h-full w-full rounded-xl bg-black"
            />
          ) : previewUrl && mimeType.startsWith("audio/") ? (
            <div className="flex h-full items-center justify-center">
              <audio src={previewUrl} controls className="w-full max-w-2xl" />
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              title={documentName}
              className="h-full min-h-[72vh] w-full rounded-xl border-0 bg-white shadow-lg"
            />
          ) : null}
        </div>

        <style>{`
          .docx-preview {
            font-family: "Times New Roman", Times, serif;
            font-size: 16px;
            line-height: 1.5;
            overflow-wrap: anywhere;
          }
          .docx-preview p { margin: 0 0 8px; }
          .docx-preview h1 { margin: 18px 0 10px; font-size: 28px; font-weight: 700; }
          .docx-preview h2 { margin: 16px 0 8px; font-size: 22px; font-weight: 700; }
          .docx-preview h3 { margin: 14px 0 6px; font-size: 18px; font-weight: 700; }
          .docx-preview table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          .docx-preview th,
          .docx-preview td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
          .docx-preview ul,
          .docx-preview ol { margin: 8px 0 8px 24px; }
          .docx-preview img { max-width: 100%; height: auto; }

          .excel-preview table { width: max-content; min-width: 100%; border-collapse: collapse; font-size: 14px; }
          .excel-preview th,
          .excel-preview td { border: 1px solid #d1d5db; padding: 8px 10px; white-space: nowrap; text-align: left; }
          .excel-preview tr:first-child td,
          .excel-preview th { background: #f8fafc; font-weight: 700; }

          .react-pdf__Page { position: relative; }
          .react-pdf__Page canvas { display: block; max-width: 100%; height: auto !important; }

          .pptx-preview section,
          .pptx-preview .slide { margin: 0 auto 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18); }
        `}</style>
      </div>
    </div>
  );
}
