import { useState, useCallback } from "react";

interface Message {
  id?: number;
  role: "user" | "assistant" | "system";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
}

const CHAT_DEPRECATED_MESSAGE =
  "Chat-based constraint collection has been removed. Use the manual draft form to build and solve a timetable.";

let nextConversationId = 1;

export function useChat(conversationId: number | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastConstraints, setLastConstraints] = useState<any>(null);
  const [lastSolved, setLastSolved] = useState<{
    timetable?: any;
    grid?: any;
    time?: { days: string[]; slots: string[] };
  } | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;

    setMessages((prev) => [...prev, { role: "user", content }]);
    setIsStreaming(true);

    try {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: CHAT_DEPRECATED_MESSAGE
        }
      ]);
      setLastConstraints(null);
      setLastSolved(null);
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId]);

  const appendMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const resetSession = useCallback(() => {
    setMessages([]);
    setLastConstraints(null);
    setLastSolved(null);
  }, []);

  return {
    messages,
    sendMessage,
    isStreaming,
    lastConstraints,
    lastSolved,
    appendMessage,
    resetSession
  };
}

export function useCreateConversation() {
  return async (title: string = "Manual Timetable Draft"): Promise<Conversation> => ({
    id: nextConversationId++,
    title
  });
}
