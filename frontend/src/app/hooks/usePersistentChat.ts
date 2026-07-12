import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getCurrentUserId } from "../services/apiClient";

export type ChatRole =
  | "user"
  | "assistant"
  | "system";

export type PersistentChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

type SavedChatState = {
  messages: PersistentChatMessage[];
  conversationId: number | string | null;
  selectedDocumentId: number | null;
  selectedDocumentName: string;
  updatedAt: string;
};

const createEmptyChatState =
  (): SavedChatState => ({
    messages: [],
    conversationId: null,
    selectedDocumentId: null,
    selectedDocumentName: "",
    updatedAt: new Date().toISOString(),
  });

const isSavedChatState = (
  value: unknown,
): value is SavedChatState => {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const state =
    value as Partial<SavedChatState>;

  return Array.isArray(state.messages);
};

export function usePersistentChat() {
  const userId = getCurrentUserId();

  const storageKey = useMemo(() => {
    return `ai-study-hub-current-chat-${
      userId || "guest"
    }`;
  }, [userId]);

  const [
    initialized,
    setInitialized,
  ] = useState(false);

  const [
    messages,
    setMessages,
  ] = useState<
    PersistentChatMessage[]
  >([]);

  const [
    conversationId,
    setConversationId,
  ] = useState<
    number | string | null
  >(null);

  const [
    selectedDocumentId,
    setSelectedDocumentId,
  ] = useState<number | null>(null);

  const [
    selectedDocumentName,
    setSelectedDocumentName,
  ] = useState("");

  /*
   * Khôi phục cuộc trò chuyện khi
   * người dùng mở lại trang AI Chat.
   */
  useEffect(() => {
    try {
      const rawChat =
        localStorage.getItem(
          storageKey,
        );

      if (!rawChat) {
        setInitialized(true);
        return;
      }

      const savedChat = JSON.parse(
        rawChat,
      ) as unknown;

      if (
        !isSavedChatState(savedChat)
      ) {
        localStorage.removeItem(
          storageKey,
        );

        setInitialized(true);
        return;
      }

      setMessages(
        savedChat.messages || [],
      );

      setConversationId(
        savedChat.conversationId ??
          null,
      );

      setSelectedDocumentId(
        savedChat.selectedDocumentId ??
          null,
      );

      setSelectedDocumentName(
        savedChat.selectedDocumentName ||
          "",
      );
    } catch (error) {
      console.error(
        "Restore chat failed:",
        error,
      );

      localStorage.removeItem(
        storageKey,
      );
    } finally {
      setInitialized(true);
    }
  }, [storageKey]);

  /*
   * Tự động lưu mỗi khi tin nhắn,
   * tài liệu hoặc conversation thay đổi.
   */
  useEffect(() => {
    if (!initialized) {
      return;
    }

    const chatState: SavedChatState = {
      messages,
      conversationId,
      selectedDocumentId,
      selectedDocumentName,
      updatedAt:
        new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(chatState),
      );
    } catch (error) {
      console.error(
        "Save chat failed:",
        error,
      );
    }
  }, [
    initialized,
    storageKey,
    messages,
    conversationId,
    selectedDocumentId,
    selectedDocumentName,
  ]);

  const clearCurrentChat =
    useCallback(() => {
      const emptyChat =
        createEmptyChatState();

      setMessages(
        emptyChat.messages,
      );

      setConversationId(null);
      setSelectedDocumentId(null);
      setSelectedDocumentName("");

      localStorage.removeItem(
        storageKey,
      );
    }, [storageKey]);

  return {
    initialized,

    messages,
    setMessages,

    conversationId,
    setConversationId,

    selectedDocumentId,
    setSelectedDocumentId,

    selectedDocumentName,
    setSelectedDocumentName,

    clearCurrentChat,
  };
}