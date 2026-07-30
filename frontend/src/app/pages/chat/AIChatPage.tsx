import {
  AlertCircle,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  FolderOpen,
  Globe,
  GraduationCap,
  HelpCircle,
  History,
  Info,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import {
  apiClient,
  getCurrentUserId,
} from "../../services/apiClient";
import { documentApi } from "../../services/documentApi";

const MATERIAL_LIMIT = 5;

const CURRENT_CHAT_STORAGE_PREFIX =
  "ai-study-hub-current-chat";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type DocumentItem = {
  id: number;
  userId?: number;
  ownerId?: number;
  user?: {
    id?: number;
  };
  title?: string;
  name?: string;
  fileName?: string;
  category?: string;
  categoryName?: string;
  processStatus?: string;
  status?: string;
};

type ChatSession = {
  sessionId?: string;
  id?: string;
  title?: string;
  sessionTitle?: string;
  createdAt?: string;
  createdDate?: string;
};

type PersistedChatState = {
  messages: ChatMessage[];
  currentSessionId: string;
  selectedDocumentIds: number[];
  draftMessage: string;
  updatedAt: string;
};

const MAX_SELECTED_DOCUMENTS = 5;

type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

const getErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const apiError = error as ApiError;

  return (
    apiError.response?.data?.message ||
    apiError.response?.data?.error ||
    apiError.message ||
    fallbackMessage
  );
};

const isChatMessage = (
  value: unknown,
): value is ChatMessage => {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const message =
    value as Partial<ChatMessage>;

  return (
    (message.role === "user" ||
      message.role === "assistant") &&
    typeof message.text === "string"
  );
};

const getStoredUserName = (): string => {
  try {
    const user = JSON.parse(
      localStorage.getItem("user") ||
        "{}",
    );

    return (
      localStorage
        .getItem("fullName")
        ?.trim() ||
      user?.fullName?.trim() ||
      user?.name?.trim() ||
      "User"
    );
  } catch {
    return "User";
  }
};

const formatChatHistoryTime = (
  value?: string,
): string => {
  if (!value) {
    return "Không rõ thời gian";
  }

  /*
   * Backend có thể trả microseconds:
   * 2026-07-03T13:11:54.365049
   *
   * JavaScript chỉ cần milliseconds.
   */
  const normalizedValue =
    value.replace(
      /\.(\d{3})\d+/,
      ".$1",
    );

  const date =
    new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return "Không rõ thời gian";
  }

  const now = new Date();

  const isToday =
    date.toDateString() ===
    now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(
    now.getDate() - 1,
  );

  const isYesterday =
    date.toDateString() ===
    yesterday.toDateString();

  const time =
    date.toLocaleTimeString(
      "vi-VN",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );

  if (isToday) {
    return `Hôm nay, ${time}`;
  }

  if (isYesterday) {
    return `Hôm qua, ${time}`;
  }

  const day =
    date.toLocaleDateString(
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    );

  return `${day}, ${time}`;
};

const quickPrompts = [
  {
    label:
      "What is this study set about?",
    icon: (
      <Globe className="w-3.5 h-3.5" />
    ),
    color:
      "text-blue-600 border-blue-200 bg-blue-50",
  },
  {
    label:
      "How do these topics connect?",
    icon: (
      <Globe className="w-3.5 h-3.5" />
    ),
    color:
      "text-blue-600 border-blue-200 bg-blue-50",
  },
  {
    label:
      "Create a study plan for me",
    icon: (
      <BookOpen className="w-3.5 h-3.5" />
    ),
    color:
      "text-emerald-600 border-emerald-200 bg-emerald-50",
  },
  {
    label:
      "Quiz me on this study set",
    icon: (
      <BookOpen className="w-3.5 h-3.5" />
    ),
    color:
      "text-emerald-600 border-emerald-200 bg-emerald-50",
  },
];

const moreQuickPrompts = [
  {
    label:
      "Generate flashcards for this set",
    icon: (
      <Sparkles className="w-3.5 h-3.5" />
    ),
    color:
      "text-amber-600 border-amber-200 bg-amber-50",
  },
  {
    label:
      "Create a study summary",
    icon: (
      <Sparkles className="w-3.5 h-3.5" />
    ),
    color:
      "text-amber-600 border-amber-200 bg-amber-50",
  },
  {
    label:
      "Walk through a tricky problem",
    icon: (
      <GraduationCap className="w-3.5 h-3.5" />
    ),
    color:
      "text-violet-600 border-violet-200 bg-violet-50",
  },
  {
    label:
      "Explain it in simple terms",
    icon: (
      <MessageSquare className="w-3.5 h-3.5" />
    ),
    color:
      "text-pink-600 border-pink-200 bg-pink-50",
  },
];

export function AIChatPage() {
  const navigate = useNavigate();

  const scrollRef =
    useRef<HTMLDivElement>(null);

  const userId =
    getCurrentUserId();

  const userName =
    getStoredUserName();

  const chatStorageKey =
    `${CURRENT_CHAT_STORAGE_PREFIX}-${
      userId || "guest"
    }`;

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>([]);

  const [
    documents,
    setDocuments,
  ] = useState<DocumentItem[]>([]);

  const [
    selectedDocumentIds,
    setSelectedDocumentIds,
  ] = useState<number[]>([]);

  const [
    chatSessions,
    setChatSessions,
  ] = useState<ChatSession[]>([]);

  const [
    currentSessionId,
    setCurrentSessionId,
  ] = useState("");

  const [
    isChatRestored,
    setIsChatRestored,
  ] = useState(false);

  const [
    isOpenHistory,
    setIsOpenHistory,
  ] = useState(false);

  const [
    isOpenMaterials,
    setIsOpenMaterials,
  ] = useState(false);

  const [
    showMorePrompts,
    setShowMorePrompts,
  ] = useState(false);

  const [
    showAllMaterials,
    setShowAllMaterials,
  ] = useState(false);

  const [
    isSending,
    setIsSending,
  ] = useState(false);

  const visibleMaterials =
    showAllMaterials
      ? documents
      : documents.slice(
          0,
          MATERIAL_LIMIT,
        );

  const isEmpty =
    messages.length === 0;

  /*
   * Khôi phục cuộc trò chuyện hiện tại
   * từ localStorage.
   */
  useEffect(() => {
    if (!userId) {
      return;
    }

    setIsChatRestored(false);

    try {
      const rawChat =
        localStorage.getItem(
          chatStorageKey,
        );

      if (!rawChat) {
        return;
      }

      const savedChat =
        JSON.parse(rawChat) as
          Partial<PersistedChatState>;

      const restoredMessages =
        Array.isArray(
          savedChat.messages,
        )
          ? savedChat.messages.filter(
              isChatMessage,
            )
          : [];

      const restoredDocumentIds =
        Array.isArray(
          savedChat.selectedDocumentIds,
        )
          ? savedChat.selectedDocumentIds
              .map((id) => Number(id))
              .filter(
                (id) =>
                  Number.isInteger(id) &&
                  id > 0,
              )
              .slice(
                0,
                MAX_SELECTED_DOCUMENTS,
              )
          : [];

      setMessages(
        restoredMessages,
      );

      setCurrentSessionId(
        savedChat.currentSessionId
          ? String(
              savedChat.currentSessionId,
            )
          : "",
      );

      setSelectedDocumentIds(
        Array.from(
          new Set(
            restoredDocumentIds,
          ),
        ),
      );

      setMessage(
        typeof savedChat.draftMessage ===
          "string"
          ? savedChat.draftMessage
          : "",
      );
    } catch (error) {
      console.error(
        "Restore current chat failed:",
        error,
      );

      localStorage.removeItem(
        chatStorageKey,
      );
    } finally {
      setIsChatRestored(true);
    }
  }, [
    userId,
    chatStorageKey,
  ]);

  /*
   * Tự động lưu mỗi khi cuộc trò chuyện,
   * session, tài liệu hoặc nội dung nhập
   * thay đổi.
   */
  useEffect(() => {
    if (
      !userId ||
      !isChatRestored
    ) {
      return;
    }

    const chatState:
      PersistedChatState = {
        messages,
        currentSessionId,
        selectedDocumentIds,
        draftMessage: message,
        updatedAt:
          new Date().toISOString(),
      };

    try {
      localStorage.setItem(
        chatStorageKey,
        JSON.stringify(chatState),
      );
    } catch (error) {
      console.error(
        "Save current chat failed:",
        error,
      );
    }
  }, [
    userId,
    chatStorageKey,
    isChatRestored,
    messages,
    currentSessionId,
    selectedDocumentIds,
    message,
  ]);

  /*
   * Kiểm tra đăng nhập và tải dữ liệu.
   */
  useEffect(() => {
    if (!userId) {
      toast.error(
        "Please login again.",
      );

      navigate("/login", {
        replace: true,
      });

      return;
    }

    void loadDocuments();
    void loadChatSessions();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /*
   * Tự động cuộn xuống tin nhắn mới nhất.
   */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top:
        scrollRef.current
          .scrollHeight,
      behavior: "smooth",
    });
  }, [
    messages,
    isSending,
  ]);

  const saveCurrentChatNow =
    (): void => {
      if (!userId) {
        return;
      }

      const chatState:
        PersistedChatState = {
        messages,
        currentSessionId,
        selectedDocumentIds,
        draftMessage: message,
        updatedAt:
          new Date().toISOString(),
      };

      try {
        localStorage.setItem(
          chatStorageKey,
          JSON.stringify(chatState),
        );
      } catch (error) {
        console.error(
          "Save chat before navigation failed:",
          error,
        );
      }
    };

  const getSessionId = (
    session: ChatSession,
  ): string => {
    return String(
      session.sessionId ||
        session.id ||
        "",
    );
  };

  const buildChatTitle = (
    text: string,
  ): string => {
    const cleaned = text
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) {
      return "New Chat";
    }

    return cleaned.length > 60
      ? `${cleaned.slice(0, 60)}...`
      : cleaned;
  };

  const loadDocuments =
    async (): Promise<void> => {
      if (!userId) {
        return;
      }

      try {
        const ownedDocuments =
          await documentApi.getAiReadyDocumentsForSelect(
            userId,
          );

        setDocuments(ownedDocuments);

        /*
         * Loại bỏ ID tài liệu đã bị xóa
         * hoặc không còn thuộc người dùng.
         */
        setSelectedDocumentIds(
          (currentIds) =>
            currentIds.filter(
              (documentId) =>
                ownedDocuments.some(
                  (document) =>
                    document.id ===
                    documentId,
                ),
            ),
        );
      } catch (error) {
        console.error(
          "Load documents failed:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Cannot load documents.",
          ),
        );
      }
    };

  const loadChatSessions =
    async (): Promise<void> => {
      if (!userId) {
        return;
      }

      try {
        const response =
          await apiClient.get(
            "/api/chat/sessions",
            {
              params: {
                userId,
              },
            },
          );

        const rawData =
          response.data?.content ??
          response.data?.data ??
          response.data ??
          [];

        setChatSessions(
          Array.isArray(rawData)
            ? rawData
            : [],
        );
      } catch (error) {
        console.error(
          "Load chat sessions failed:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Cannot load chat sessions.",
          ),
        );
      }
    };

  const createNewSession =
    (): void => {
      if (!userId) {
        toast.error(
          "Please login again.",
        );
        return;
      }

      localStorage.removeItem(
        chatStorageKey,
      );

      setCurrentSessionId("");
      setMessages([]);
      setMessage("");
      setSelectedDocumentIds([]);
      setIsOpenHistory(false);
      setIsOpenMaterials(false);
      setShowAllMaterials(false);

      toast.success(
        "New chat created.",
      );
    };

  const formatMessages = (
    rawMessages: unknown[],
  ): ChatMessage[] => {
    const formattedMessages:
      ChatMessage[] = [];

    rawMessages.forEach(
      (rawMessage) => {
        if (
          !rawMessage ||
          typeof rawMessage !==
            "object"
        ) {
          return;
        }

        const msg =
          rawMessage as Record<
            string,
            unknown
          >;

        const question =
          typeof msg.question ===
          "string"
            ? msg.question
            : "";

        const answer =
          typeof msg.answer ===
          "string"
            ? msg.answer
            : "";

        if (
          question &&
          answer
        ) {
          formattedMessages.push({
            role: "user",
            text: question,
          });

          formattedMessages.push({
            role: "assistant",
            text: answer,
          });

          return;
        }

        const userText =
          (typeof msg.userMessage ===
          "string"
            ? msg.userMessage
            : "") ||
          (typeof msg.userQuestion ===
          "string"
            ? msg.userQuestion
            : "");

        if (userText) {
          formattedMessages.push({
            role: "user",
            text: userText,
          });
        }

        const assistantText =
          (typeof msg.aiMessage ===
          "string"
            ? msg.aiMessage
            : "") ||
          (typeof msg.aiAnswer ===
          "string"
            ? msg.aiAnswer
            : "") ||
          (typeof msg.botResponse ===
          "string"
            ? msg.botResponse
            : "") ||
          (typeof msg.response ===
          "string"
            ? msg.response
            : "");

        if (assistantText) {
          formattedMessages.push({
            role: "assistant",
            text: assistantText,
          });
        }

        const roleValue = String(
          msg.role ||
            msg.sender ||
            msg.type ||
            msg.messageType ||
            msg.senderType ||
            "",
        ).toUpperCase();

        const textValue =
          (typeof msg.content ===
          "string"
            ? msg.content
            : "") ||
          (typeof msg.message ===
          "string"
            ? msg.message
            : "") ||
          (typeof msg.text ===
          "string"
            ? msg.text
            : "") ||
          (typeof msg.messageText ===
          "string"
            ? msg.messageText
            : "") ||
          (typeof msg.answerText ===
          "string"
            ? msg.answerText
            : "");

        if (textValue) {
          formattedMessages.push({
            role:
              roleValue.includes(
                "USER",
              )
                ? "user"
                : "assistant",
            text: textValue,
          });
        }
      },
    );

    return formattedMessages;
  };

  const loadSessionMessages =
    async (
      sessionId?: string,
    ): Promise<void> => {
      if (
        !sessionId ||
        !userId
      ) {
        toast.error(
          "Missing session or user.",
        );
        return;
      }

      try {
        const response =
          await apiClient.get(
            `/api/chat/sessions/${sessionId}/messages`,
            {
              params: {
                userId,
              },
            },
          );

        const rawMessages =
          response.data?.content ??
          response.data?.messages ??
          response.data?.data ??
          response.data ??
          [];

        const formattedMessages =
          formatMessages(
            Array.isArray(rawMessages)
              ? rawMessages
              : [],
          );

        setCurrentSessionId(
          sessionId,
        );

        setMessages(
          formattedMessages,
        );

        setMessage("");
        setIsOpenHistory(false);
      } catch (error) {
        console.error(
          "Load session messages failed:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Cannot load session messages.",
          ),
        );
      }
    };

  const toggleDocument = (
    id: number,
  ): void => {
    setSelectedDocumentIds(
      (currentIds) => {
        // Always allow deselecting a material.
        if (currentIds.includes(id)) {
          return currentIds.filter(
            (documentId) =>
              documentId !== id,
          );
        }

        // Do not allow selecting more than 5 materials.
        if (
          currentIds.length >=
          MAX_SELECTED_DOCUMENTS
        ) {
          toast.error(
            `You can select up to ${MAX_SELECTED_DOCUMENTS} materials at a time.`,
          );

          return currentIds;
        }

        return [
          ...currentIds,
          id,
        ];
      },
    );
  };

  const handleSend =
    async (
      overrideText?: string,
    ): Promise<void> => {
      const text = (
        overrideText ?? message
      ).trim();

      if (
        !text ||
        isSending
      ) {
        return;
      }

      if (!userId) {
        toast.error(
          "Please login again.",
        );
        return;
      }

      if (
        selectedDocumentIds.length >
        MAX_SELECTED_DOCUMENTS
      ) {
        toast.error(
          `You can use up to ${MAX_SELECTED_DOCUMENTS} materials in one chat.`,
        );
        return;
      }

      const selectedDocuments =
        documents.filter(
          (document) =>
            selectedDocumentIds.includes(
              document.id,
            ),
        );

      const notProcessedDocument =
        selectedDocuments.find(
          (document) =>
            document.processStatus &&
            document.processStatus !==
              "PROCESSED",
        );

      if (
        notProcessedDocument
      ) {
        setMessages(
          (currentMessages) => [
            ...currentMessages,
            {
              role: "assistant",
              text:
                "This material is not processed yet. Please wait until AI Status is PROCESSED before chatting.",
            },
          ],
        );

        return;
      }

      let sessionId =
        currentSessionId;

      setMessages(
        (currentMessages) => [
          ...currentMessages,
          {
            role: "user",
            text,
          },
        ],
      );

      setMessage("");
      setIsSending(true);

      try {
        if (!sessionId) {
          const sessionResponse =
            await apiClient.post(
              "/api/chat/sessions",
              {
                userId,
                title:
                  buildChatTitle(
                    text,
                  ),
              },
            );

          const createdSessionId =
            sessionResponse.data
              ?.sessionId ??
            sessionResponse.data?.id ??
            "";

          sessionId =
            createdSessionId
              ? String(
                  createdSessionId,
                )
              : "";

          if (!sessionId) {
            throw new Error(
              "Backend did not return a session ID.",
            );
          }

          setCurrentSessionId(
            sessionId,
          );

          await loadChatSessions();
        }

        const response =
          await apiClient.post(
            "/api/chat/ask",
            {
              sessionId,
              userId,
              documentIds:
                selectedDocumentIds,
              question: text,
            },
          );

        const answer =
          response.data?.answer ||
          response.data?.response ||
          response.data?.message ||
          "AI không có câu trả lời.";

        setMessages(
          (currentMessages) => [
            ...currentMessages,
            {
              role: "assistant",
              text: String(answer),
            },
          ],
        );

        await loadChatSessions();
      } catch (error) {
        console.error(
          "Send message failed:",
          error,
        );

        setMessages(
          (currentMessages) => [
            ...currentMessages,
            {
              role: "assistant",
              text: getErrorMessage(
                error,
                "Cannot connect to AI.",
              ),
            },
          ],
        );
      } finally {
        setIsSending(false);
      }
    };

  const copyToClipboard = (
    text: string,
  ): void => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(
          "Copied to clipboard.",
        );
      })
      .catch(() => {
        toast.error(
          "Cannot copy this message.",
        );
      });
  };

  const handleOpenUpload =
    (): void => {
      saveCurrentChatNow();

      setIsOpenMaterials(false);

      navigate("/app/upload");
    };

  if (
    userId &&
    !isChatRestored
  ) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Restoring conversation...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans relative">
      <div className="fixed top-16 left-[260px] right-0 z-50 h-14 flex items-center justify-between px-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 text-sm z-40">
          <button
            type="button"
            className="font-semibold text-blue-600 hover:underline"
          >
            My First Study Set
          </button>

          <span className="text-slate-300 dark:text-slate-700">
            ›
          </span>

          <button
            type="button"
            onClick={
              createNewSession
            }
            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition font-medium"
          >
            <Sparkles className="w-4 h-4 text-sky-500" />
            New Chat
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsOpenHistory(
                  (currentValue) =>
                    !currentValue,
                );

                void loadChatSessions();
              }}
              className={`flex items-center gap-1.5 transition font-medium px-2 py-1 rounded-md ${
                isOpenHistory
                  ? "text-blue-600 bg-slate-100 dark:bg-slate-800"
                  : "text-slate-600 dark:text-slate-300 hover:text-blue-600"
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>

            {isOpenHistory && (
              <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xl p-4 flex flex-col gap-4 z-50">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-[15px]">
                  Chat History
                </h3>

                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg outline-none placeholder:text-slate-400 focus:border-blue-500 transition"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2">
                  {chatSessions.length ===
                  0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                        No sessions found
                      </span>
                    </div>
                  ) : (
                    chatSessions.map(
                      (session) => {
                        const sessionId =
                          getSessionId(
                            session,
                          );

                        return (
                          <button
                            type="button"
                            key={sessionId}
                            onClick={() =>
                              void loadSessionMessages(
                                sessionId,
                              )
                            }
                            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                              currentSessionId ===
                              sessionId
                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                                : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            }`}
                          >
                            <p className="font-semibold truncate">
                              {session.title ||
                                session.sessionTitle ||
                                "New Chat"}
                            </p>

                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 shrink-0" />

                              <span>
                                {formatChatHistoryTime(
                                  session.createdAt ||
                                    session.createdDate,
                                )}
                              </span>
                            </p>
                          </button>
                        );
                      },
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    createNewSession
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-start max-w-3xl w-full mx-auto px-6 pt-24 gap-12">
            <div className="flex flex-col items-center text-center gap-1">
              <div className="w-20 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-md mb-1">
                <Sparkles className="w-8 h-8 text-white" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Hello, {userName}
              </h1>

              <p className="text-sm text-slate-400 dark:text-slate-500">
                What are we working on
                today?
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {quickPrompts.map(
                (prompt, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() =>
                      void handleSend(
                        prompt.label,
                      )
                    }
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[13px] font-medium transition hover:shadow-sm ${prompt.color}`}
                  >
                    {prompt.icon}
                    {prompt.label}
                  </button>
                ),
              )}

              {showMorePrompts &&
                moreQuickPrompts.map(
                  (
                    prompt,
                    index,
                  ) => (
                    <button
                      type="button"
                      key={`more-${index}`}
                      onClick={() =>
                        void handleSend(
                          prompt.label,
                        )
                      }
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[13px] font-medium transition hover:shadow-sm ${prompt.color}`}
                    >
                      {prompt.icon}
                      {prompt.label}
                    </button>
                  ),
                )}
            </div>

            <button
              type="button"
              onClick={() =>
                setShowMorePrompts(
                  (currentValue) =>
                    !currentValue,
                )
              }
              className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
            >
              {showMorePrompts
                ? "View Less"
                : "View More"}
            </button>

            <p className="text-xs text-slate-400 -mt-8">
              You can ask general
              questions without selecting
              materials.
            </p>

            <div className="h-24" />

            <div className="fixed bottom-6 left-[260px] right-0 z-30 flex justify-center">
              <div className="w-full max-w-3xl px-6">
                <ChatInput
                  message={message}
                  setMessage={
                    setMessage
                  }
                  onSend={() =>
                    void handleSend()
                  }
                  isSending={
                    isSending
                  }
                  selectedCount={
                    selectedDocumentIds.length
                  }
                  onOpenMaterials={() =>
                    setIsOpenMaterials(
                      true,
                    )
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden max-w-3xl w-full mx-auto px-6 relative">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto pt-24 pb-32 space-y-6"
            >
              {messages.map(
                (
                  chatMessage,
                  index,
                ) =>
                  chatMessage.role ===
                  "user" ? (
                    <div
                      key={`${chatMessage.role}-${index}`}
                      className="flex justify-end"
                    >
                      <div className="max-w-[75%] rounded-2xl px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[15px] whitespace-pre-wrap break-words">
                        {chatMessage.text}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={`${chatMessage.role}-${index}`}
                      className="flex gap-3 group"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] leading-7 text-slate-800 dark:text-slate-100 prose-sm max-w-none">
                          <ReactMarkdown>
                            {
                              chatMessage.text
                            }
                          </ReactMarkdown>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition text-slate-400">
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                chatMessage.text,
                              )
                            }
                            title="Copy"
                          >
                            <Copy className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200" />
                          </button>

                          <button
                            type="button"
                            title="Like"
                          >
                            <ThumbsUp className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200" />
                          </button>

                          <button
                            type="button"
                            title="Dislike"
                          >
                            <ThumbsDown className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200" />
                          </button>

                          <button
                            type="button"
                            title="Regenerate"
                          >
                            <RefreshCw className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200" />
                          </button>

                          <button
                            type="button"
                            title="Read aloud"
                          >
                            <Volume2 className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200" />
                          </button>

                          <button
                            type="button"
                            title="Help"
                          >
                            <HelpCircle className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ),
              )}

              {isSending && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>

                  <div className="text-sm text-slate-400 mt-1">
                    AI is thinking...
                  </div>
                </div>
              )}
            </div>

            <div className="fixed bottom-6 left-[260px] right-0 z-30 flex justify-center bg-gradient-to-t from-slate-50/50 dark:from-slate-950 via-slate-50/50 dark:via-slate-950 to-transparent pt-6 pb-0">
              <div className="w-full max-w-3xl px-6">
                <ChatInput
                  message={message}
                  setMessage={
                    setMessage
                  }
                  onSend={() =>
                    void handleSend()
                  }
                  isSending={
                    isSending
                  }
                  selectedCount={
                    selectedDocumentIds.length
                  }
                  onOpenMaterials={() =>
                    setIsOpenMaterials(
                      true,
                    )
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {isOpenMaterials && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[4px] z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-6xl h-[86vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between px-8 pt-7 pb-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  Select Materials
                </h2>

                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Optional. If no material
                  is selected, AI will
                  answer as a general
                  tutor.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsOpenMaterials(
                    false,
                  )
                }
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Close materials"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-8 pb-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setSelectedDocumentIds(
                    [],
                  )
                }
                className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedDocumentIds(
                    documents
                      .filter(
                        (document) =>
                          !document.processStatus ||
                          document.processStatus ===
                            "PROCESSED",
                      )
                      .slice(
                        0,
                        MAX_SELECTED_DOCUMENTS,
                      )
                      .map(
                        (document) =>
                          document.id,
                      ),
                  )
                }
                className="px-4 py-2 text-sm font-bold text-blue-600 border border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Select Up to 5
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 content-start">
                <button
                  type="button"
                  onClick={
                    handleOpenUpload
                  }
                  className="min-h-[230px] border-2 border-dashed border-blue-400 rounded-3xl flex flex-col items-center justify-center p-5 gap-4 bg-blue-50/30 hover:bg-blue-50 dark:bg-blue-950/10 dark:hover:bg-blue-950/20 transition group text-center"
                >
                  <div className="relative">
                    <div className="w-24 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                      <FolderOpen className="w-12 h-12 text-blue-500" />
                    </div>

                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white dark:bg-slate-900 shadow-xl border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      <Plus className="w-8 h-8" />
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-base font-extrabold text-blue-600">
                      Upload New Material
                    </p>
                  </div>
                </button>

                {visibleMaterials.map(
                  (document) => {
                    const isSelected =
                      selectedDocumentIds.includes(
                        document.id,
                      );

                    const isLimitReached =
                      selectedDocumentIds.length >=
                        MAX_SELECTED_DOCUMENTS &&
                      !isSelected;

                    const documentName =
                      document.title ||
                      document.name ||
                      document.fileName ||
                      "Untitled";

                    const isProcessed =
                      !document.processStatus ||
                      document.processStatus ===
                        "PROCESSED";

                    const isFailed =
                      document.processStatus ===
                        "FAILED" ||
                      document.status ===
                        "FAILED";

                    return (
                      <div
                        key={
                          document.id
                        }
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (
                            !isProcessed
                          ) {
                            toast.error(
                              "This material is not processed yet. Please wait until AI Status is PROCESSED.",
                            );
                            return;
                          }

                          toggleDocument(
                            document.id,
                          );
                        }}
                        onKeyDown={(
                          event,
                        ) => {
                          if (
                            event.key ===
                              "Enter" ||
                            event.key ===
                              " "
                          ) {
                            event.preventDefault();

                            if (
                              isProcessed
                            ) {
                              toggleDocument(
                                document.id,
                              );
                            }
                          }
                        }}
                        className={`relative min-h-[230px] rounded-3xl border p-4 shadow-sm hover:shadow-lg transition-all overflow-hidden ${
                          isProcessed &&
                          !isLimitReached
                            ? "cursor-pointer"
                            : "cursor-not-allowed opacity-60"
                        } ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-100 dark:ring-blue-900/40"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div
                          className={`absolute top-4 right-4 w-6 h-6 rounded-lg border flex items-center justify-center ${
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </div>

                        <div className="h-24 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center mb-4 overflow-hidden">
                          <div className="w-[78%] h-[70%] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm p-3">
                            <div className="w-10 h-2 rounded-full bg-blue-400 mb-3" />

                            <div className="space-y-2">
                              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 w-full" />
                              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 w-5/6" />
                              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 w-2/3" />
                            </div>
                          </div>
                        </div>

                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 line-clamp-2 min-h-[40px]">
                          {documentName}
                        </h3>

                        <div className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />

                            <span>
                              ID:{" "}
                              {
                                document.id
                              }
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />

                            <span>
                              Category:{" "}
                              {document.categoryName ||
                                document.category ||
                                "No category"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4">
                          {isFailed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300 text-xs font-bold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Failed
                            </span>
                          ) : isProcessed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Processed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 text-xs font-bold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Processing
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}

                {documents.length >
                  MATERIAL_LIMIT && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowAllMaterials(
                        (currentValue) =>
                          !currentValue,
                      )
                    }
                    className="min-h-[230px] rounded-3xl border-2 border-dashed border-blue-300 bg-blue-50/30 dark:bg-blue-950/10 hover:bg-blue-50 dark:hover:bg-blue-950/20 flex flex-col items-center justify-center gap-4 transition"
                  >
                    <div className="w-24 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                      <FolderOpen className="w-12 h-12 text-blue-500" />
                    </div>

                    <div className="text-center">
                      <p className="text-lg font-extrabold text-blue-600">
                        {showAllMaterials
                          ? "Thu gọn"
                          : "Xem thêm"}
                      </p>

                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        See all materials
                      </p>
                    </div>
                  </button>
                )}

                {documents.length ===
                  0 && (
                  <div className="lg:col-span-3 sm:col-span-2 min-h-[230px] rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    No uploaded materials
                    found. You can still
                    chat without
                    materials.
                  </div>
                )}
              </div>
            </div>

            <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>

                <p>
                  <span className="font-extrabold text-blue-600">
                    {
                      selectedDocumentIds.length
                    }
                    /
                    {
                      MAX_SELECTED_DOCUMENTS
                    }{" "}
                    materials selected
                  </span>

                  <span className="mx-2">
                    •
                  </span>

                  Maximum 5 materials can
                  be selected at the same
                  time.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsOpenMaterials(
                    false,
                  )
                }
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-blue-600 text-white text-sm font-extrabold hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatInput({
  message,
  setMessage,
  onSend,
  isSending,
  selectedCount,
  onOpenMaterials,
}: {
  message: string;
  setMessage: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  selectedCount: number;
  onOpenMaterials: () => void;
}) {
  const [
    showEmptyAlert,
    setShowEmptyAlert,
  ] = useState(false);

  const handleSubmit = (): void => {
    if (!message.trim()) {
      setShowEmptyAlert(true);
      return;
    }

    setShowEmptyAlert(false);
    onSend();
  };

  return (
    <div className="w-full relative">
      {showEmptyAlert && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div className="w-[360px] overflow-hidden rounded-3xl bg-white shadow-2xl text-center">
            <div className="px-8 py-7">
              <h2 className="text-xl font-extrabold text-slate-900">
                Unable to send message
              </h2>

              <p className="mt-2 text-base text-slate-700 leading-snug">
                Please enter your content
                before submitting.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowEmptyAlert(
                  false,
                )
              }
              className="w-full border-t border-slate-200 py-4 text-lg font-semibold text-blue-500 hover:bg-slate-50 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm px-4 py-3 flex flex-col gap-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40 transition">
        <textarea
          value={message}
          onChange={(event) =>
            setMessage(
              event.target.value,
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={
            selectedCount > 0
              ? "Ask about your selected materials..."
              : "Ask your AI tutor anything..."
          }
          rows={1}
          className="w-full resize-none outline-none bg-transparent text-sm placeholder:text-slate-400 dark:text-white py-1"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-400 dark:text-slate-500">
            <button
              type="button"
              onClick={onOpenMaterials}
              className="hover:text-slate-600 dark:hover:text-slate-200 transition"
              aria-label="Open materials"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={
                onOpenMaterials
              }
              className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-900 transition flex items-center gap-1.5 select-none h-6"
            >
              <FileText className="w-4 h-4" />
              {selectedCount} materials
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={
                handleSubmit
              }
              disabled={isSending}
              className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shadow-sm active:scale-95 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
