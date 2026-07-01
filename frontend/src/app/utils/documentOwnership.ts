import { getCurrentUserId } from "../services/apiClient";

type UserLike = {
  id?: unknown;
  userId?: unknown;
};

export type DocumentOwnerCandidate = {
  userId?: unknown;
  ownerId?: unknown;
  createdBy?: unknown;
  user?: UserLike | null;
  owner?: UserLike | null;
};

const normalizeId = (value: unknown): number | null => {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
};

export const getDocumentOwnerId = (
  document: DocumentOwnerCandidate | null | undefined,
): number | null => {
  if (!document) return null;

  if (typeof document.createdBy === "object" && document.createdBy !== null) {
    const createdBy = document.createdBy as UserLike;
    return (
      normalizeId(document.userId) ??
      normalizeId(document.ownerId) ??
      normalizeId(document.user?.id) ??
      normalizeId(document.user?.userId) ??
      normalizeId(document.owner?.id) ??
      normalizeId(document.owner?.userId) ??
      normalizeId(createdBy.id) ??
      normalizeId(createdBy.userId)
    );
  }

  return (
    normalizeId(document.userId) ??
    normalizeId(document.ownerId) ??
    normalizeId(document.user?.id) ??
    normalizeId(document.user?.userId) ??
    normalizeId(document.owner?.id) ??
    normalizeId(document.owner?.userId) ??
    normalizeId(document.createdBy)
  );
};

export const isMyDocument = (
  document: DocumentOwnerCandidate | null | undefined,
  currentUserId = getCurrentUserId(),
) => {
  const ownerId = getDocumentOwnerId(document);
  const normalizedCurrentUserId = normalizeId(currentUserId);

  return Boolean(
    ownerId &&
      normalizedCurrentUserId &&
      ownerId === normalizedCurrentUserId,
  );
};

export const filterMyDocuments = <T extends DocumentOwnerCandidate>(
  documents: T[],
  currentUserId = getCurrentUserId(),
) => documents.filter((document) => isMyDocument(document, currentUserId));
