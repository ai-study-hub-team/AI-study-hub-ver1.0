import {
  ArrowLeft,
  FileText,
  Star,
  Download,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { documentApi } from "../../services/documentApi";

export function LibraryCategoryDocumentsPage() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await documentApi.getDocuments({
          page: 0,
          size: 100,
          categoryId: Number(categoryId),
        });

        setDocuments(response.data.content ?? []);
      } catch (error) {
        console.error(error);
        toast.error("Cannot load category documents.");
      }
    };

    loadDocuments();
  }, [categoryId]);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/app/library/categories")}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Categories
      </button>

      <h1 className="text-3xl font-extrabold text-slate-900">
        Category Documents
      </h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {documents.map((document) => (
          <div
            key={document.id}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div className="mb-5 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                <FileText className="h-5 w-5" />
              </div>

              <div className="flex items-center gap-2 text-slate-400">
                <Star className="h-4 w-4" />
                <Download className="h-4 w-4" />
                <RotateCcw className="h-4 w-4" />
                <Trash2 className="h-4 w-4" />
              </div>
            </div>

            <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
              {document.name}
            </h3>

            <p className="mt-1 text-xs font-bold uppercase text-slate-500">
              {document.name?.split(".").pop()?.toUpperCase() || "FILE"}
            </p>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {document.categoryName || "Category"}
              </span>

              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-extrabold text-red-700 ring-1 ring-red-200">
                {document.processStatus || "FAILED"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
