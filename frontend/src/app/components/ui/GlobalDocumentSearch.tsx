import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { FileText, Search, X } from "lucide-react";

import {
  documentChunkApi,
  type DocumentChunkResponse,
} from "../../services/documentChunkApi";
import { documentApi } from "../../services/documentApi";

type DocumentNameResult = {
  id: number;
  title?: string;
  name?: string;
  originalName?: string;
  fileName?: string;
  fileType?: string;
};

type SearchResult =
  | {
      type: "document";
      id: number;
      title: string;
      subtitle: string;
    }
  | {
      type: "content";
      id: number;
      documentId: number;
      title: string;
      chunkIndex: number;
      content: string;
    };

const escapeRegExp = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const highlightText = (text: string, keyword: string) => {
  const cleanKeyword = keyword.trim();

  if (!cleanKeyword) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(cleanKeyword)})`, "gi"));

  return parts.map((part, index) => {
    const isMatch = part.toLowerCase() === cleanKeyword.toLowerCase();

    if (isMatch) {
      return (
        <mark
          key={`${part}-${index}`}
          className="rounded bg-yellow-200 px-1 font-semibold text-yellow-900 dark:bg-yellow-500/30 dark:text-yellow-100"
        >
          {part}
        </mark>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
};

const getChunkContent = (item: DocumentChunkResponse) => {
  return (
    item.chunkText ||
    item.content ||
    item.text ||
    item.chunkContent ||
    item.chunk ||
    item.previewText ||
    item.snippet ||
    item.matchedText ||
    ""
  );
};

const getChunkDocumentTitle = (item: DocumentChunkResponse) => {
  return (
    item.documentTitle ||
    item.title ||
    item.documentName ||
    item.originalName ||
    item.fileName ||
    `Document #${item.documentId}`
  );
};

const getDocumentTitle = (item: DocumentNameResult) => {
  return (
    item.title ||
    item.name ||
    item.originalName ||
    item.fileName ||
    `Document #${item.id}`
  );
};

const normalizeDocumentResponse = (data: unknown): DocumentNameResult[] => {
  if (Array.isArray(data)) {
    return data as DocumentNameResult[];
  }

  if (data && typeof data === "object") {
    const value = data as {
      content?: DocumentNameResult[];
      data?: DocumentNameResult[];
      documents?: DocumentNameResult[];
    };

    return value.content || value.data || value.documents || [];
  }

  return [];
};

export function GlobalDocumentSearch() {
  const navigate = useNavigate();

  const [searchKeyword, setSearchKeyword] = useState("");
  const [documentResults, setDocumentResults] = useState<SearchResult[]>([]);
  const [contentResults, setContentResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);

  const searchRef = useRef<HTMLDivElement | null>(null);

  const allResults = useMemo(() => {
    return [...documentResults, ...contentResults].slice(0, 10);
  }, [documentResults, contentResults]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchBox(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const keyword = searchKeyword.trim();

    if (!keyword) {
      setDocumentResults([]);
      setContentResults([]);
      setIsSearching(false);
      setShowSearchBox(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearching(true);

        const [documentResponse, chunkResponse] = await Promise.allSettled([
          documentApi.getDocuments({
            keyword,
            page: 0,
            size: 5,
          }),
          documentChunkApi.searchAllChunks(keyword, 0, 8),
        ]);

        if (documentResponse.status === "fulfilled") {
          const docs = normalizeDocumentResponse(documentResponse.value.data);

          const mappedDocs: SearchResult[] = docs.map((item) => ({
            type: "document",
            id: item.id,
            title: getDocumentTitle(item),
            subtitle: "Document name match",
          }));

          setDocumentResults(mappedDocs);
        } else {
          console.error("Search documents by name failed:", documentResponse.reason);
          setDocumentResults([]);
        }

        if (chunkResponse.status === "fulfilled") {
          const chunks = Array.isArray(chunkResponse.value)
            ? chunkResponse.value
            : chunkResponse.value.content || [];

          const mappedChunks: SearchResult[] = chunks.map((item) => ({
            type: "content",
            id: item.id,
            documentId: item.documentId,
            title: getChunkDocumentTitle(item),
            chunkIndex: item.chunkIndex,
            content: getChunkContent(item),
          }));

          setContentResults(mappedChunks);
        } else {
          console.error("Search document content failed:", chunkResponse.reason);
          setContentResults([]);
        }

        setShowSearchBox(true);
      } catch (error) {
        console.error("Global search failed:", error);
        setDocumentResults([]);
        setContentResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchKeyword]);

  const handleOpenResult = (item: SearchResult) => {
    const keyword = searchKeyword.trim();

    setShowSearchBox(false);
    setSearchKeyword("");
    setDocumentResults([]);
    setContentResults([]);

    if (item.type === "document") {
      navigate(`/app/library/${item.id}/preview`);
      return;
    }

    navigate(
      `/app/library/${item.documentId}/preview?keyword=${encodeURIComponent(
        keyword,
      )}&chunk=${item.chunkIndex}&match=${encodeURIComponent(item.content)}`,
    );
  };

  return (
    <div ref={searchRef} className="relative hidden flex-1 md:block max-w-xl">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

      <input
        type="text"
        value={searchKeyword}
        onChange={(event) => {
          setSearchKeyword(event.target.value);
          setShowSearchBox(true);
        }}
        onFocus={() => {
          if (searchKeyword.trim()) {
            setShowSearchBox(true);
          }
        }}
        placeholder="Search document name or content..."
        className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-blue-500"
      />

      {searchKeyword && (
        <button
          type="button"
          onClick={() => {
            setSearchKeyword("");
            setDocumentResults([]);
            setContentResults([]);
            setShowSearchBox(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {showSearchBox && searchKeyword.trim() && (
        <div className="absolute left-0 top-12 z-50 max-h-[560px] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {isSearching && (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              Searching...
            </div>
          )}

          {!isSearching && allResults.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              No matching document found.
            </div>
          )}

          {!isSearching &&
            allResults.map((item) => {
              const isDocumentNameResult = item.type === "document";

              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => handleOpenResult(item)}
                  className="flex w-full gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isDocumentNameResult
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </p>

                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isDocumentNameResult
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
                        }`}
                      >
                        {isDocumentNameResult ? "Name" : "Content"}
                      </span>
                    </div>

                    {isDocumentNameResult ? (
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {item.subtitle}
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {highlightText(item.content, searchKeyword)}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          Chunk {item.chunkIndex}
                        </p>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}