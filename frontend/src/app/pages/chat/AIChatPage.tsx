import {
  ArrowUp,
  BookOpen,
  FileImage,
  Globe,
  GraduationCap,
  History,
  MessageSquare,
  MicOff,
  Search,
  Sparkles,
  X,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API_BASE_URL = "http://localhost:8080/api";
const userId = 1;

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type DocumentItem = {
  id: number;
  title: string;
  categoryName?: string;
  processStatus?: string;
};

type ChatSession = {
  sessionId: string;
  title: string;
  createdAt?: string;
};

const suggestions = [
  {
    title: "Walk through calculus problem",
    icon: <GraduationCap className="w-5 h-5 text-violet-500" />,
  },
  {
    title: "Practice Spanish conversation",
    icon: <MessageSquare className="w-5 h-5 text-blue-500" />,
  },
  {
    title: "Summarize this chapter",
    icon: <BookOpen className="w-5 h-5 text-yellow-500" />,
  },
  {
    title: "Explain photosynthesis in simple terms",
    icon: <BookOpen className="w-5 h-5 text-emerald-500" />,
  },
];

export function AIChatPage() {
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState("");

  const [isOpenHistory, setIsOpenHistory] = useState(false);
  const [isOpenMaterials, setIsOpenMaterials] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadChatSessions();
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/documents`, {
        params: { page: 0, size: 100 },
      });

      setDocuments(res.data.content ?? []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadChatSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/chat/sessions`, {
        params: { userId },
      });

      setChatSessions(res.data.content ?? res.data ?? []);
    } catch (error) {
      console.error(error);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/chat/sessions`, {
        userId,
        title: "New Chat",
      });

      setCurrentSessionId(res.data.sessionId);
      setMessages([]);
      await loadChatSessions();
      setIsOpenHistory(false);
    } catch (error) {
      console.error(error);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/chat/sessions/${sessionId}/messages`,
      );

      const data = res.data.content ?? res.data ?? [];

      setCurrentSessionId(sessionId);
      setMessages(
        data.map((msg: any) => ({
          role:
            msg.role === "USER" || msg.sender === "USER" || msg.type === "USER"
              ? "user"
              : "assistant",
          text: msg.content ?? msg.message ?? msg.text ?? "",
        })),
      );

      setIsOpenHistory(false);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleDocument = (id: number) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id],
    );
  };

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    if (selectedDocumentIds.length === 0) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Please select at least one material first." },
      ]);
      return;
    }

    let sessionId = currentSessionId;

    try {
      if (!sessionId) {
        const sessionRes = await axios.post(`${API_BASE_URL}/chat/sessions`, {
          userId,
          title: "New Chat",
        });

        sessionId = sessionRes.data.sessionId;
        setCurrentSessionId(sessionId);
        await loadChatSessions();
      }

      const question = message.trim();

      setMessages((prev) => [...prev, { role: "user", text: question }]);
      setMessage("");
      setIsSending(true);

      const res = await axios.post(`${API_BASE_URL}/chat/ask`, {
        sessionId,
        userId,
        documentIds: selectedDocumentIds,
        question,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: res.data.answer || "AI không có câu trả lời.",
        },
      ]);

      await loadChatSessions();
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Cannot connect to AI." },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans relative">
      <div className="h-14 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 text-sm z-40">
          <button className="font-semibold text-blue-600 hover:underline">
            My First Study Set
          </button>

          <span className="text-slate-300 dark:text-slate-700">›</span>

          <button
            onClick={createNewSession}
            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition font-medium"
          >
            <Sparkles className="w-4 h-4 text-sky-500" /> New Chat
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
              <History className="w-4 h-4" /> History
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
                    chatSessions.map((session) => (
                      <button
                        key={session.sessionId}
                        onClick={() => loadSessionMessages(session.sessionId)}
                        className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                          currentSessionId === session.sessionId
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        }`}
                      >
                        <p className="font-semibold truncate">
                          {session.title || "New Chat"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {session.createdAt || session.sessionId}
                        </p>
                      </button>
                    ))
                  )}
                </div>

                <button
                  onClick={createNewSession}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <span className="text-lg leading-none">+</span> New Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto px-6 pb-6 gap-5">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-1">
            Hello, User
          </h1>
        </div>

        {messages.length === 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 w-full max-w-3xl">
              {suggestions.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setMessage(item.title)}
                  className="h-[68px] rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all text-left flex justify-between items-stretch group shadow-sm"
                >
                  <div className="flex items-center px-5 flex-1 min-w-0">
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm md:text-[14px] leading-snug line-clamp-2">
                      {item.title}
                    </p>
                  </div>
                  <div className="w-14 flex items-center justify-center bg-slate-50/60 dark:bg-slate-800 border-l border-slate-100 dark:border-slate-800 shrink-0">
                    {item.icon}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {messages.length > 0 && (
          <div className="w-full max-w-3xl space-y-3 overflow-y-auto max-h-[420px] pr-2">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm whitespace-pre-wrap break-words ${
                  msg.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "mr-auto bg-slate-50 dark:bg-slate-900 border-l-4 border-blue-500 text-slate-800 dark:text-slate-100"
                }`}
              >
                <div className="text-[15px] leading-7">
                  {msg.role === "assistant" ? (
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="mr-auto rounded-2xl px-4 py-3 text-sm bg-white border border-slate-200 text-slate-500">
                AI is thinking...
              </div>
            )}
          </div>
        )}

        <div className="w-full max-w-3xl mt-1">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 flex flex-col justify-between min-h-[120px]">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask your AI tutor anything..."
              rows={2}
              className="w-full resize-none outline-none bg-transparent text-sm placeholder:text-slate-400 dark:text-white px-1 py-1"
            />

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50 dark:border-slate-800/60 w-full">
              <div className="flex items-center gap-3.5 text-slate-400 dark:text-slate-500">
                <button>
                  <FileImage className="w-4 h-4" />
                </button>
                <button>
                  <Globe className="w-4 h-4" />
                </button>
                <button>
                  <GraduationCap className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsOpenMaterials(true)}
                  className="px-2.5 py-1 rounded-md border border-slate-200 text-slate-500 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-900 transition flex items-center gap-1.5 select-none h-6"
                >
                  <span>📝</span> {selectedDocumentIds.length} materials
                </button>
              </div>

              <div className="flex items-center gap-3.5">
                <button className="text-slate-400">
                  <MicOff className="w-4 h-4" />
                </button>

                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shadow-sm active:scale-95 shrink-0 disabled:opacity-50"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isOpenMaterials && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Select Materials
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Select materials to use for the chat.
                </p>
              </div>

              <button
                onClick={() => setIsOpenMaterials(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-2 flex justify-end">
              <button
                onClick={() => setSelectedDocumentIds(documents.map((doc) => doc.id))}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50/50 rounded-xl transition"
              >
                Select All
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-4 gap-4">
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

              {documents.map((doc) => {
                const isSelected = selectedDocumentIds.includes(doc.id);

                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocument(doc.id)}
                    className={`border rounded-xl flex flex-col overflow-hidden shadow-sm hover:shadow transition cursor-pointer ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex-1 p-4 bg-slate-50/40 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-tight line-clamp-2 uppercase">
                        {doc.title}
                      </div>

                      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                        ID: {doc.id}
                        <br />
                        Category: {doc.categoryName || "No category"}
                        <br />
                        Status: {doc.processStatus || "Unknown"}
                      </p>
                    </div>

                    <div className="h-10 px-3 flex items-center gap-2 bg-white dark:bg-slate-900">
                      <span className="text-blue-500 text-sm">
                        {isSelected ? "✅" : "📝"}
                      </span>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate flex-1">
                        {doc.title}
                      </span>
                    </div>
                  </div>
                );
              })}

              {documents.length === 0 && (
                <div className="col-span-3 flex items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">
                  No uploaded materials found.
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