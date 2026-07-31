import { toast } from "sonner";

import { usePublicLinkDialog } from "../components/sharing/PublicLinkDialogProvider";

export function useCreatePublicLink() {
  const { openPublicLinkDialog, loadingDocumentId } = usePublicLinkDialog();

  const createAndCopyPublicLink = (
    documentId: number | null | undefined,
  ) => {
    if (!Number.isInteger(documentId) || Number(documentId) <= 0) {
      toast.error("Failed to create public link");
      return;
    }

    openPublicLinkDialog(Number(documentId));
  };

  return {
    createAndCopyPublicLink,
    loadingDocumentId,
  };
}
