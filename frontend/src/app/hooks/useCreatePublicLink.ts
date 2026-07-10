import { useState } from "react";
import { toast } from "sonner";

import { documentPublicLinkApi } from "../services/documentPublicLinkApi";

const PUBLIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useCreatePublicLink() {
  const [loadingDocumentId, setLoadingDocumentId] = useState<number | null>(
    null,
  );

  const createAndCopyPublicLink = async (
    documentId: number | null | undefined,
  ) => {
    if (!Number.isInteger(documentId) || Number(documentId) <= 0) {
      toast.error("Failed to create public link");
      return;
    }

    setLoadingDocumentId(Number(documentId));

    try {
      const response = await documentPublicLinkApi.createPublicLink(
        Number(documentId),
        {
          allowDownload: true,
          expiresAt: new Date(Date.now() + PUBLIC_LINK_TTL_MS).toISOString(),
        },
      );

      try {
        await navigator.clipboard.writeText(response.data.publicUrl);
        toast.success("Public link created and copied to clipboard");
      } catch (clipboardError) {
        console.log("Public link:", response.data.publicUrl, clipboardError);
        toast.success("Public link created");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to create public link");
    } finally {
      setLoadingDocumentId(null);
    }
  };

  return {
    createAndCopyPublicLink,
    loadingDocumentId,
  };
}