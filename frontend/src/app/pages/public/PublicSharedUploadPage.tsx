import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { AlertTriangle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import {
  publicShareApi,
  type PublicDocumentShareLinkResponse,
} from "../../services/publicShareApi";

export function PublicSharedUploadPage() {
  const { token } = useParams();

  const [linkData, setLinkData] =
    useState<PublicDocumentShareLinkResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploaderName, setUploaderName] = useState("");
  const [uploaderEmail, setUploaderEmail] = useState("");

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
          reason:
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            "This shared upload link is invalid or unavailable.",
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

    if (!title.trim()) {
      toast.error("Please enter a document title.");
      return;
    }

    try {
      setIsSubmitting(true);

      await publicShareApi.submitPublicDocumentShareLink({
        token,
        file,
        title: title.trim(),
        description: description.trim(),
        uploaderName: uploaderName.trim(),
        uploaderEmail: uploaderEmail.trim(),
      });

      setSubmitted(true);
      setFile(null);
      setTitle("");
      setDescription("");
      setUploaderName("");
      setUploaderEmail("");

      toast.success("Upload submitted. The owner will review it.");
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Upload failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
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
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">File *</span>

              <input
                type="file"
                disabled={isSubmitting}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">
                Document title *
              </span>

              <input
                value={title}
                disabled={isSubmitting}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: SWP391 - Lecture 1"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-slate-700">
                Description
              </span>

              <textarea
                value={description}
                disabled={isSubmitting}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Optional note for the owner"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-slate-700">
                  Your name
                </span>

                <input
                  value={uploaderName}
                  disabled={isSubmitting}
                  onChange={(event) => setUploaderName(event.target.value)}
                  placeholder="Nguyen Van B"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-slate-700">
                  Your email
                </span>

                <input
                  type="email"
                  value={uploaderEmail}
                  disabled={isSubmitting}
                  onChange={(event) => setUploaderEmail(event.target.value)}
                  placeholder="b@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}

            {isSubmitting ? "Uploading..." : "Submit for Review"}
          </button>
        </section>
      </main>
    </div>
  );
}

export default PublicSharedUploadPage;