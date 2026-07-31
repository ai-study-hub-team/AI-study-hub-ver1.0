import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Download, Eye, Link2, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { documentPublicLinkApi } from "../../services/documentPublicLinkApi";

const PUBLIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface PublicLinkDialogContextValue {
  openPublicLinkDialog: (documentId: number) => void;
  loadingDocumentId: number | null;
}

const PublicLinkDialogContext =
  createContext<PublicLinkDialogContextValue | null>(null);

export function usePublicLinkDialog(): PublicLinkDialogContextValue {
  const context = useContext(PublicLinkDialogContext);

  if (!context) {
    throw new Error(
      "usePublicLinkDialog must be used inside PublicLinkDialogProvider",
    );
  }

  return context;
}

export function PublicLinkDialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null,
  );
  const [loadingDocumentId, setLoadingDocumentId] = useState<number | null>(
    null,
  );

  const closeDialog = () => {
    if (loadingDocumentId !== null) return;
    setSelectedDocumentId(null);
  };

  const createPublicLink = async (allowDownload: boolean) => {
    if (selectedDocumentId === null || loadingDocumentId !== null) return;

    const documentId = selectedDocumentId;
    setLoadingDocumentId(documentId);

    try {
      const response = await documentPublicLinkApi.createPublicLink(documentId, {
        allowDownload,
        expiresAt: new Date(Date.now() + PUBLIC_LINK_TTL_MS).toISOString(),
      });
      const token = response.data.token?.trim();
      const publicUrl = token
        ? new URL(
            `/public/documents/${encodeURIComponent(token)}`,
            window.location.origin,
          ).toString()
        : response.data.publicUrl;

      try {
        await navigator.clipboard.writeText(publicUrl);
        toast.success("Public link created and copied to clipboard");
      } catch (clipboardError) {
        console.log("Public link:", publicUrl, clipboardError);
        toast.success("Public link created");
      }

      setSelectedDocumentId(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create public link");
    } finally {
      setLoadingDocumentId(null);
    }
  };

  return (
    <PublicLinkDialogContext.Provider
      value={{
        openPublicLinkDialog: setSelectedDocumentId,
        loadingDocumentId,
      }}
    >
      {children}

      {selectedDocumentId !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="public-link-dialog-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="public-link-dialog-title"
                    className="text-xl font-extrabold text-slate-950 dark:text-white"
                  >
                    Create public link
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Choose what people with this link can do.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={loadingDocumentId !== null}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void createPublicLink(false)}
                disabled={loadingDocumentId !== null}
                className="group rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-400 hover:bg-blue-50/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:bg-blue-500/10"
              >
                <Eye className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                <p className="mt-4 font-extrabold text-slate-900 dark:text-white">
                  View only
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  People can preview the document but cannot download it.
                </p>
              </button>

              <button
                type="button"
                onClick={() => void createPublicLink(true)}
                disabled={loadingDocumentId !== null}
                className="group rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-400 hover:bg-blue-50/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:bg-blue-500/10"
              >
                <Download className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                <p className="mt-4 font-extrabold text-slate-900 dark:text-white">
                  Allow download
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  People can preview and download the original file.
                </p>
              </button>
            </div>

            {loadingDocumentId !== null && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating public link...
              </div>
            )}

            <p className="mt-5 text-center text-xs font-medium text-slate-400">
              The public link expires after 7 days.
            </p>
          </div>
        </div>
      )}
    </PublicLinkDialogContext.Provider>
  );
}
