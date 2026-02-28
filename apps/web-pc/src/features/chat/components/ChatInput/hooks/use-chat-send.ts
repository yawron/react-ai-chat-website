import { useRef, useCallback } from "react";

import { createSSE, sendChatMessage } from "@pc/apis/chat";
import { sessionApi } from "@pc/apis/session";
import { useChatStore, useConversationStore } from "@pc/store";

interface SendMessageParams {
  chatId: string;
  message: string;
  fileId?: string;
}

interface UseChatSendReturn {
  sendMessage: (chatId: string, message: string, fileId?: string) => Promise<void>;
  createSSEAndSendMessage: (
    chatId: string,
    message: string,
    fileId?: string,
    onComplete?: () => void,
  ) => void;
}

export const useChatSend = (): UseChatSendReturn => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const idRef = useRef<string | null>(null);

  const { addMessage, addChunkMessage } = useChatStore();
  const { setSelectedId, addConversation } = useConversationStore();

  const sendMessage = useCallback(
    async (chatId: string, chatMessage: string, fileId?: string) => {
      await sendChatMessage({
        id: chatId,
        message: chatMessage,
        fileId,
      });
    },
    [],
  );

  const createSSEAndSendMessage = useCallback(
    (chatId: string, chatMessage: string, fileId?: string, onComplete?: () => void) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      eventSourceRef.current = createSSE(chatId);
      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "chunk") {
            addChunkMessage(data.content);
          } else if (data.type === "complete") {
            // SSE 完成，关闭连接并调用回调
            eventSourceRef.current?.close();
            eventSourceRef.current = null;
            onComplete?.();
          } else if (data.type === "error") {
            console.error("SSE连接错误:", data.error);
            eventSourceRef.current?.close();
            eventSourceRef.current = null;
            onComplete?.();
          }
        } catch (error) {
          console.log("解析消息失败", error);
        }
      };

      eventSourceRef.current.onerror = (error) => {
        console.error("SSE连接错误:", error);
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
        onComplete?.();
      };

      sendMessage(chatId, chatMessage, fileId);
    },
    [sendMessage, addChunkMessage],
  );

  return {
    sendMessage,
    createSSEAndSendMessage,
  };
};
