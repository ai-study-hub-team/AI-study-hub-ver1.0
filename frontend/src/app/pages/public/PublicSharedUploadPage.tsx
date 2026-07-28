import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import {
  publicShareApi,
  type PublicDocumentShareLinkResponse,
} from "../../services/publicShareApi";
import { getAuthToken } from "../../services/apiClient";

const getAcceptedTypeLabel = (mimeType: string) => {
  const value = mimeType.toLowerCase();
  if (value === "application/pdf") return "PDF";
  if (value === "text/plain") return "TXT";
  if (value.includes("wordprocessingml")) return "DOCX";
  if (value.includes("presentationml")) return "PPTX";
  if (value.includes("spreadsheetml")) return "XLSX";
  if (value.startsWith("image/")) return "IMAGE";
  if (value.startsWith("video/")) return "VIDEO";
  if (value.startsWith("audio/")) return "AUDIO";
  return value.split("/").pop()?.toUpperCase() || "FILE";
};

const getUploadErrorMessage = (error: any) => {
  const status = Number(error?.response?.status);
  const rawMessage = String(
    error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "",
  );

  const normalizedMessage = rawMessage.toLowerCase();

  if (
    status === 403 ||
    normalizedMessage.includes("allowlist") ||
    normalizedMessage.includes("not allowed") ||
    normalizedMessage.includes("not permitted") ||
    normalizedMessage.includes("permission") ||
    normalizedMessage.includes("access denied")
  ) {
    return "You are not allowed to upload through this link. Ask the owner to add your registered email to the allowlist.";
  }

  if (status === 401) {
    return "Please sign in before uploading a document.";
  }

  if (
    normalizedMessage.includes("limit") ||
    normalizedMessage.includes("maximum") ||
    normalizedMessage.includes("max") ||
    normalizedMessage.includes("exceed") ||
    normalizedMessage.includes("exceeded") ||
    normalizedMessage.includes("full") ||
    normalizedMessage.includes("quota")
  ) {
    return "Upload limit reached.";
  }

  return rawMessage || "Upload failed. Please try again.";
};

export function PublicSharedUploadPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [linkData, setLinkData] =
    useState<PublicDocumentShareLinkResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const isAuthenticated = Boolean(getAuthToken());
  const acceptedMimeTypes = (() => {
    const value = linkData?.allowedFileTypes;
    const urlTypes = new URLSearchParams(window.location.search).get("types");
    const types = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : urlTypes
          ? urlTypes.split(",")
          : [];
    return types.map((type) => type.trim()).filter(Boolean);
  })();
  const acceptedTypeLabels = Array.from(
    new Set(acceptedMimeTypes.map(getAcceptedTypeLabel)),
  );

  const redirectToLogin = () => {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    sessionStorage.setItem("postLoginRedirect", returnTo);
    navigate(`/login?redirect=${encodeURIComponent(returnTo)}`, {
      state: { returnTo },
    });
  };

  const handleBack = () => {
    if (!getAuthToken()) {
      navigate("/");
      return;
    }

    const role = (localStorage.getItem("role") || "")
      .toUpperCase()
      .replace(/^ROLE_/, "");
    navigate(role === "ADMIN" || role === "MANAGER" ? "/admin" : "/app/dashboard");
  };

  useEffect(() => {
    if (!token) {
      setLinkData({
        title: null,
        description: null,
        allowUpload: false,
        reason: "Invalid shared upload link.",
      });
      setIsLoading(false);
      return;
    }

    const loadLink = async () => {
      try {
        setIsLoading(true);

        const response = await publicShareApi.getPublicDocumentShareLink(token);
        setLinkData(response.data);
      } catch (error: any) {
        console.error(error);

        setLinkData({
          title: null,
          description: null,
          allowUpload: false,
          reason: getUploadErrorMessage(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadLink();
  }, [token]);

  const handleSubmit = async () => {
    if (!token) {
      toast.error("Invalid shared upload link.");
      return;
    }

    if (!linkData?.allowUpload) {
      toast.error("This upload link is unavailable.");
      return;
    }

    if (!file) {
      toast.error("Please choose a file to upload.");
      return;
    }

    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    if (
      acceptedMimeTypes.length > 0 &&
      !acceptedMimeTypes.includes(file.type)
    ) {
      toast.error(
        `This file type is not accepted. Choose: ${acceptedTypeLabels.join(", ")}.`,
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);

      await publicShareApi.submitPublicDocumentShareLink({
        token,
        file,
        title: title.trim(),
        description: description.trim(),
        onProgress: setUploadProgress,
      });

      setSubmitted(true);
      setFile(null);
      setTitle("");
      setDescription("");

      toast.success("Upload submitted. The owner will review it.");
    } catch (error: any) {
      console.error(error);

      toast.error(getUploadErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-slate-700 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm font-semibold">Checking upload link...</span>
        </div>
      </div>
    );
  }

  if (!linkData?.allowUpload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-orange-500" />

          <h1 className="mt-4 text-xl font-extrabold text-slate-900">
            Upload link unavailable
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {linkData?.reason || "This link may be disabled, expired, or full."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <main className="mx-auto max-w-2xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <button
            type="button"
            onClick={handleBack}
            className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">
            AI Study Hub Shared Upload
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-slate-950">
            {linkData.title || "Submit a document"}
          </h1>

          {linkData.description && (
            <p className="mt-2 text-sm text-slate-500">
              {linkData.description}
            </p>
          )}

          {submitted && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-5 w-5" />
                Submitted for review
              </div>

              <p className="mt-1 text-sm">
                This file is not added to the owner&apos;s library until they
                approve it.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-4">
            {acceptedTypeLabels.length > 0 && (
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Accepted file types
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {acceptedTypeLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">File *</span>

              <input
                type="file"
                accept={acceptedMimeTypes.length ? acceptedMimeTypes.join(",") : undefined}
                disabled={isSubmitting || !isAuthenticated}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">
                Document title
              </span>

              <input
                value={title}
                disabled={isSubmitting || !isAuthenticated}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional, for example: SWP391 - Lecture 1"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">
                Description
              </span>

              <textarea
                value={description}
                disabled={isSubmitting || !isAuthenticated}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Optional note for the owner"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            {!isAuthenticated && (
              <div className="flex flex-col gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Sign in before choosing a file. Your account identity is
                  verified before upload and recorded so the owner can see who
                  submitted each document.
                </p>
                <button
                  type="button"
                  onClick={redirectToLogin}
                  className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700"
                >
                  Login to upload
                </button>
              </div>
            )}
          </div>

          {isSubmitting && (
            <div className="mt-4" aria-live="polite">
              <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
                <span>Uploading</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-blue-600 transition-[width]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={isAuthenticated ? handleSubmit : redirectToLogin}
            disabled={isSubmitting}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}

            {isSubmitting
              ? "Uploading..."
              : isAuthenticated
                ? "Submit for Review"
                : "Login to Upload"}
          </button>
        </section>
      </main>
    </div>
  );
}

export default PublicSharedUploadPage;
