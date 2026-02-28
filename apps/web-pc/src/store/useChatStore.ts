import { create } from "zustand";

import { useConversationStore } from "./useConversationStore";

import type { MessageContent } from "@pc/types/chat";
import type { Role } from "@pc/types/common";

export type MessageProps = {
  content: MessageContent[]; // 兼容旧格式
  role: Role;
};

export type ChatMessageProps = Map<string, MessageProps[]>;

export interface ChatStoreProps {
  messages: ChatMessageProps;
  addMessage: ({ content, role }: MessageProps) => void;
  addChunkMessage: (chunk: string) => void;
}

export const useChatStore = create<ChatStoreProps>((set) => ({
  messages: new Map(),
  // 用户消息
  addMessage: ({ content, role }: MessageProps) => {
    const { selectedId } = useConversationStore.getState(); // 获取实时的 selectedId
    set((state) => {
      const newMap = new Map(state.messages);
      const currentMessages = newMap.get(selectedId as string) || [];
      newMap.set(selectedId as string, [...currentMessages, { content, role }]);
      return { messages: newMap };
    });
  },
  // AI 消息
  addChunkMessage: (chunk: string) => {
    const { selectedId } = useConversationStore.getState(); // 获取实时的 selectedId
    set((state) => {
      const newMap = new Map(state.messages);
      const currentMessages = newMap.get(selectedId as string) || [];
      // Create a shallow copy of the array to ensure reference changes
      const newMessages = [...currentMessages];

      const lastMessageIndex = newMessages.length - 1;
      const lastMessage = newMessages[lastMessageIndex];

      if (lastMessage && lastMessage.role === "system") {
        // 如果最后一条消息是系统消息，则更新其内容
        // Clone message and content array to avoid direct mutation
        const newLastMessage = {
          ...lastMessage,
          content: [...lastMessage.content],
        };
        const lastContentIndex = newLastMessage.content.length - 1;
        const lastTextContent = newLastMessage.content[lastContentIndex];

        // 如果最后一个内容项是文本类型，则追加到该文本内容中
        if (lastTextContent && lastTextContent.type === "text") {
          newLastMessage.content[lastContentIndex] = {
            ...lastTextContent,
            content: lastTextContent.content + chunk,
          };
        }
        newMessages[lastMessageIndex] = newLastMessage;
      } else {
        // 否则，添加一个新的系统消息，包含文本内容
        newMessages.push({
          content: [
            {
              type: "text",
              content: chunk,
            },
          ],
          role: "system",
        });
      }

      newMap.set(selectedId as string, newMessages);
      return {
        messages: newMap,
      };
    });
  },
}));
