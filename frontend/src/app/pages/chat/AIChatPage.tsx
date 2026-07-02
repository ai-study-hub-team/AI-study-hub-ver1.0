import {
  ArrowUp,
  BookOpen,
  Copy,
  FileText,
  Globe,
  GraduationCap,
  HelpCircle,
  History,
  Lightbulb,
  MessageSquare,
  MicOff,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { apiClient, getCurrentUserId } from "../../services/apiClient";
import { filterMyDocuments } from "../../utils/documentOwnership";

const MATERIAL_LIMIT = 5;

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

const getStoredUserName = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return (
      localStorage.getItem("fullName") ||
      user?.fullName ||
      user?.name ||
      "User"
    );
  } catch {
    return "User";
  }
};

const quickPrompts = [
  {
    label: "What is this study set about?",
    icon: <Globe className="w-3.5 h-3.5" />,
    color: "text-blue-600 border-blue-200 bg-blue-50",
  },
  {
    label: "How do these topics connect?",
    icon: <Globe className="w-3.5 h-3.5" />,
    color: "text-blue-600 border-blue-200 bg-blue-50",
  },
  {
    label: "Create a study plan for me",
    icon: <BookOpen className="w-3.5 h-3.5" />,
    color: "text-emerald-600 border-emerald-200 bg-emerald-50",
  },
  {
    label: "Quiz me on this study set",
    icon: <BookOpen className="w-3.5 h-3.5" />,
    color: "text-emerald-600 border-emerald-200 bg-emerald-50",
  },
];

const moreQuickPrompts = [
  {
    label: "Generate flashcards for this set",
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: "text-amber-600 border-amber-200 bg-amber-50",
  },
  {
    label: "Create a study summary",
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: "text-amber-600 border-amber-200 bg-amber-50",
  },
  {
    label: "Walk through a tricky problem",
    icon: <GraduationCap className="w-3.5 h-3.5" />,
    color: "text-violet-600 border-violet-200 bg-violet-50",
  },
  {
    label: "Explain it in simple terms",
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    color: "text-pink-600 border-pink-200 bg-pink-50",
  },
];

export function AIChatPage() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const userId = getCurrentUserId();
  const userName = getStoredUserName();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState("");

  const [isOpenHistory, setIsOpenHistory] = useState(false);
  const [isOpenMaterials, setIsOpenMaterials] = useState(false);
  const [isOpenAttach, setIsOpenAttach] = useState(false);
  const [showMorePrompts, setShowMorePrompts] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const visibleMaterials = showAllMaterials
    ? documents
    : documents.slice(0, MATERIAL_LIMIT);

  const isEmpty = messages.length === 0;

  useEffect(() => {
    if (!userId) {
      toast.error("Please login again.");
      navigate("/login");
      return;
    }

    loadDocuments();
    loadChatSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSending]);

  const getSessionId = (session: ChatSession) => {
    return session.sessionId || session.id || "";
  };

  const buildChatTitle = (text: string) => {
    const cleaned = text.replace(/\s+/g, " ").trim();

    if (!cleaned) return "New Chat";

    return cleaned.length > 60 ? `${cleaned.slice(0, 60)}...` : cleaned;
  };

  const loadDocuments = async () => {
    try {
      const res = await apiClient.get("/api/documents/search-filter", {
        params: { page: 0, size: 100 },
      });

      const data = res.data?.content ?? res.data?.data ?? res.data ?? [];
      setDocuments(Array.isArray(data) ? filterMyDocuments(data, userId) : []);
    } catch (error: any) {
      console.error("Load documents failed:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load documents.",
      );
    }
  };

  const loadChatSessions = async () => {
    if (!userId) return;

    try {
      const res = await apiClient.get("/api/chat/sessions", {
        params: { userId },
      });

      const data = res.data?.content ?? res.data?.data ?? res.data ?? [];
      setChatSessions(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Load chat sessions failed:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load chat sessions.",
      );
    }
  };

  const createNewSession = () => {
    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    setCurrentSessionId("");
    setMessages([]);
    setMessage("");
    setIsOpenHistory(false);
    setIsOpenAttach(false);
    setIsOpenMaterials(false);
  };

  const formatMessages = (rawMessages: any[]): ChatMessage[] => {
    const formattedMessages: ChatMessage[] = [];

    rawMessages.forEach((msg: any) => {
      if (msg.question && msg.answer) {
        formattedMessages.push({
          role: "user",
          text: msg.question,
        });

        formattedMessages.push({
          role: "assistant",
          text: msg.answer,
        });

        return;
      }

      if (msg.userMessage || msg.userQuestion) {
        formattedMessages.push({
          role: "user",
          text: msg.userMessage || msg.userQuestion,
        });
      }

      if (msg.aiMessage || msg.aiAnswer || msg.botResponse || msg.response) {
        formattedMessages.push({
          role: "assistant",
          text: msg.aiMessage || msg.aiAnswer || msg.botResponse || msg.response,
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

      const text =
        msg.content ||
        msg.message ||
        msg.text ||
        msg.messageText ||
        msg.answerText ||
        "";

      if (text) {
        formattedMessages.push({
          role: roleValue.includes("USER") ? "user" : "assistant",
          text,
        });
      }
    });

    return formattedMessages;
  };

  const loadSessionMessages = async (sessionId?: string) => {
    if (!sessionId || !userId) {
      toast.error("Missing session or user.");
      return;
    }

    try {
      const res = await apiClient.get(
        `/api/chat/sessions/${sessionId}/messages`,
        {
          params: { userId },
        },
      );

      const rawMessages =
        res.data?.content ||
        res.data?.messages ||
        res.data?.data ||
        res.data ||
        [];

      const formattedMessages = formatMessages(
        Array.isArray(rawMessages) ? rawMessages : [],
      );

      setCurrentSessionId(sessionId);
      setMessages(formattedMessages);
      setIsOpenHistory(false);
    } catch (error: any) {
      console.error("Load session messages failed:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load session messages.",
      );
    }
  };

  const toggleDocument = (id: number) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(id)
        ? prev.filter((docId) => docId !== id)
        : [...prev, id],
    );
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? message).trim();

    if (!text || isSending) return;

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    const selectedDocs = documents.filter((doc) =>
      selectedDocumentIds.includes(doc.id),
    );

    const notProcessedDoc = selectedDocs.find(
      (doc) => doc.processStatus && doc.processStatus !== "PROCESSED",
    );

    if (notProcessedDoc) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "This material is not processed yet. Please wait until AI Status is PROCESSED before chatting.",
        },
      ]);
      return;
    }

    let sessionId = currentSessionId;

    try {
      if (!sessionId) {
        const sessionRes = await apiClient.post("/api/chat/sessions", {
          userId,
          title: buildChatTitle(text),
        });

        sessionId = sessionRes.data?.sessionId || sessionRes.data?.id || "";
        setCurrentSessionId(sessionId);
        await loadChatSessions();
      }

      setMessages((prev) => [...prev, { role: "user", text }]);
      setMessage("");
      setIsSending(true);

      const res = await apiClient.post("/api/chat/ask", {
        sessionId,
        userId,
        documentIds: selectedDocumentIds,
        question: text,
      });

      const answer =
        res.data?.answer ||
        res.data?.response ||
        res.data?.message ||
        "AI không có câu trả lời.";

      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);

      await loadChatSessions();
    } catch (error: any) {
      console.error("Send message failed:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Cannot connect to AI.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans relative">
      <div className="fixed top-16 left-[260px] right-0 z-50 h-14 flex items-center justify-between px-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 text-sm z-40">
          <button className="font-semibold text-blue-600 hover:underline">
            My First Study Set
          </button>

          <span className="text-slate-300 dark:text-slate-700">›</span>

          <button
            onClick={createNewSession}
            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition font-medium"
          >
            <Sparkles className="w-4 h-4 text-sky-500" />
            New Chat
          </button>

          <div className="relative">
            <button
              onClick={() => {
                setIsOpenHistory(!isOpenHistory);
                loadChatSessions();
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
                  {chatSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                        No sessions found
                      </span>
                    </div>
                  ) : (
                    chatSessions.map((session) => {
                      const sessionId = getSessionId(session);

                      return (
                        <button
                          key={sessionId}
                          onClick={() => loadSessionMessages(sessionId)}
                          className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                            currentSessionId === sessionId
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                          }`}
                        >
                          <p className="font-semibold truncate">
                            {session.title || session.sessionTitle || "New Chat"}
                          </p>

                          <p className="text-[11px] text-slate-400 truncate">
                            {session.createdAt ||
                              session.createdDate ||
                              sessionId}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>

                <button
                  onClick={createNewSession}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <span className="text-lg leading-none">+</span>
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
                What are we working on today?
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p.label)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[13px] font-medium transition hover:shadow-sm ${p.color}`}
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}

              {showMorePrompts &&
                moreQuickPrompts.map((p, i) => (
                  <button
                    key={`more-${i}`}
                    onClick={() => handleSend(p.label)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[13px] font-medium transition hover:shadow-sm ${p.color}`}
                  >
                    {p.icon}
                    {p.label}
                  </button>
                ))}
            </div>

            <button
              onClick={() => setShowMorePrompts((v) => !v)}
              className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
            >
              {showMorePrompts ? "View Less" : "View More"}
            </button>

            <p className="text-xs text-slate-400 -mt-8">
              You can ask general questions without selecting materials.
            </p>

            <div className="h-24" />

            <div className="fixed bottom-6 left-[260px] right-0 z-30 flex justify-center">
              <div className="w-full max-w-3xl px-6">
                <ChatInput
                  message={message}
                  setMessage={setMessage}
                  onSend={() => handleSend()}
                  isSending={isSending}
                  isOpenAttach={isOpenAttach}
                  setIsOpenAttach={setIsOpenAttach}
                  selectedCount={selectedDocumentIds.length}
                  onOpenMaterials={() => setIsOpenMaterials(true)}
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
              {messages.map((msg, index) =>
                msg.role === "user" ? (
                  <div key={index} className="flex justify-end">
                    <div className="max-w-[75%] rounded-2xl px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[15px] whitespace-pre-wrap break-words">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div key={index} className="flex gap-3 group">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] leading-7 text-slate-800 dark:text-slate-100 prose-sm max-w-none">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition text-slate-400">
                        <button
                          onClick={() => copyToClipboard(msg.text)}
                          title="Copy"
                        >
                          <Copy className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200" />
                        </button>

                        <button title="Like">
                          <ThumbsUp className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200" />
                        </button>

                        <button title="Dislike">
                          <ThumbsDown className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200" />
                        </button>

                        <button title="Regenerate">
                          <RefreshCw className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200" />
                        </button>

                        <button title="Read aloud">
                          <Volume2 className="w-3.5 h-3.5 hover:text-slate-600 dark:hover:text-slate-200" />
                        </button>

                        <button title="Help">
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
                  setMessage={setMessage}
                  onSend={() => handleSend()}
                  isSending={isSending}
                  isOpenAttach={isOpenAttach}
                  setIsOpenAttach={setIsOpenAttach}
                  selectedCount={selectedDocumentIds.length}
                  onOpenMaterials={() => setIsOpenMaterials(true)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {isOpenMaterials && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Select Materials
                </h2>

                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Optional. If no material is selected, AI will answer as a
                  general tutor.
                </p>
              </div>

              <button
                onClick={() => setIsOpenMaterials(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedDocumentIds([])}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition"
              >
                Clear
              </button>

              <button
                onClick={() =>
                  setSelectedDocumentIds(
                    documents
                      .filter(
                        (doc) =>
                          !doc.processStatus || doc.processStatus === "PROCESSED",
                      )
                      .map((doc) => doc.id),
                  )
                }
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50/50 rounded-xl transition"
              >
                Select All
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-4 gap-4 content-start">
              <button
                onClick={() => navigate("/app/upload")}
                className="border-2 border-dashed border-blue-400 rounded-xl flex flex-col items-center justify-center p-4 gap-3 bg-white hover:bg-blue-50/50 dark:bg-slate-900 dark:hover:bg-blue-950/20 transition group text-center min-h-[160px]"
              >
                <div className="w-12 h-12 rounded-full border border-blue-400 flex items-center justify-center text-blue-500">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>

                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  Upload New Material
                </span>
              </button>

              {visibleMaterials.map((doc) => {
                const isSelected = selectedDocumentIds.includes(doc.id);
                const docName =
                  doc.title || doc.name || doc.fileName || "Untitled";
                const isProcessed =
                  !doc.processStatus || doc.processStatus === "PROCESSED";

                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      if (!isProcessed) {
                        toast.error(
                          "This material is not processed yet. Please wait until AI Status is PROCESSED.",
                        );
                        return;
                      }

                      toggleDocument(doc.id);
                    }}
                    className={`min-h-[160px] border rounded-xl flex flex-col overflow-hidden shadow-sm hover:shadow transition ${
                      isProcessed
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex-1 p-4 bg-slate-50/40 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-tight line-clamp-2 uppercase">
                        {docName}
                      </div>

                      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                        ID: {doc.id}
                        <br />
                        Category:{" "}
                        {doc.categoryName || doc.category || "No category"}
                        <br />
                        Status: {doc.processStatus || doc.status || "Unknown"}
                      </p>
                    </div>

                    <div className="h-10 px-3 flex items-center gap-2 bg-white dark:bg-slate-900">
                      <span className="text-blue-500 text-sm">
                        {isSelected ? "✅" : "📝"}
                      </span>

                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate flex-1">
                        {docName}
                      </span>
                    </div>
                  </div>
                );
              })}

              {documents.length > MATERIAL_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAllMaterials(!showAllMaterials)}
                  className="border border-dashed border-blue-300 rounded-xl flex flex-col items-center justify-center p-4 gap-2 bg-blue-50/40 hover:bg-blue-50 dark:bg-blue-950/20 transition text-center min-h-[160px]"
                >
                  <span className="text-sm font-bold text-blue-600">
                    {showAllMaterials ? "Thu gọn" : "Xem thêm"}
                  </span>
                </button>
              )}

              {documents.length === 0 && (
                <div className="col-span-3 flex items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">
                  No uploaded materials found. You can still chat without
                  materials.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-white dark:bg-slate-900">
              <button
                onClick={() => setIsOpenMaterials(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-6 rounded-xl transition shadow-sm active:scale-95"
              >
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
  isOpenAttach,
  setIsOpenAttach,
  selectedCount,
  onOpenMaterials,
}: {
  message: string;
  setMessage: (v: string) => void;
  onSend: () => void;
  isSending: boolean;
  isOpenAttach: boolean;
  setIsOpenAttach: (v: boolean) => void;
  selectedCount: number;
  onOpenMaterials: () => void;
}) {
  const [showEmptyAlert, setShowEmptyAlert] = useState(false);

  const handleSubmit = () => {
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
                Please enter your content before submitting.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowEmptyAlert(false)}
              className="w-full border-t border-slate-200 py-4 text-lg font-semibold text-blue-500 hover:bg-slate-50 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {isOpenAttach && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50">
          {[
            {
              icon: <FileText className="w-4 h-4" />,
              label: "Materials",
              action: onOpenMaterials,
            },
            {
              icon: <Lightbulb className="w-4 h-4" />,
              label: "Prompt Suggestions",
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => {
                setIsOpenAttach(false);
                item.action?.();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm px-4 py-3 flex flex-col gap-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40 transition">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
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
              onClick={() => setIsOpenAttach(!isOpenAttach)}
              className="hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenMaterials}
              className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-900 transition flex items-center gap-1.5 select-none h-6"
            >
              <FileText className="w-4 h-4" />
              {selectedCount} materials
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="text-slate-400">
              <MicOff className="w-4 h-4" />
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSending}
              className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shadow-sm active:scale-95 shrink-0 disabled:opacity-50"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}