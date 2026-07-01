import { apiClient } from "./apiClient";

export type FavoriteDocument = {
  favoriteId: number;
  documentId: number;
  title: string;
  description: string;
  fileType: string;
  processStatus: string;
  visibility: string;
  ownerId: number;
  ownerName: string;
  favoritedAt: string;
};

export type FavoriteDocumentPageResponse = {
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  size: number;
  content: FavoriteDocument[];
  number: number;
  numberOfElements: number;
  empty: boolean;
  sort?: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  pageable?: {
    offset: number;
    paged: boolean;
    pageNumber: number;
    pageSize: number;
    unpaged: boolean;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
  };
};

export const favoriteApi = {
  addFavorite: (documentId: number) => {
    return apiClient.post<void>(`/api/documents/${documentId}/favorite`);
  },

  removeFavorite: (documentId: number) => {
    return apiClient.delete<void>(`/api/documents/${documentId}/favorite`);
  },

  getFavorites: (page = 0, size = 10) => {
    return apiClient.get<FavoriteDocumentPageResponse>(
      "/api/documents/favorites",
      {
        params: {
          page,
          size,
        },
      },
    );
  },
};