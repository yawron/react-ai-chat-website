import { UserOutlined } from "@ant-design/icons";
import { Bubble } from "@ant-design/x";
import { memo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";

import { useChatStore, useConversationStore } from "@pc/store";

import type { MessageProps } from "@pc/store";

import { allMessageContent } from "./content";

import type { MessageContent } from "@pc/types/chat";
import type { Role } from "@pc/types/common";
import "./bubble.css";
import "highlight.js/styles/github.css";

const getBubbleProps = (role: Role) => {
  if (role === "system") {
    return {
      placement: "start" as const,
      avatar: { icon: <UserOutlined />, style: { background: "#fde3cf" } },
      variant: "borderless" as const,
      style: { maxWidth: "100%" },
    };
  }
  if (role === "user") {
    return {
      placement: "end" as const,
      avatar: { icon: <UserOutlined />, style: { background: "#87d068" } },
    };
  }
  return {
    placement: "end" as const,
    variant: "borderless" as const,
  };
};

const renderMessageContent = (content: MessageContent[], role: Role) => {
  if (!content || content.length === 0) {
    return null;
  }

  return (
    <div className="message-content">
      {content.map((item, index) => {
        // 用户消息的 text 类型不渲染 Markdown，AI 消息才渲染
        if (item.type === "text" && role === "user") {
          return (
            <div key={index} className="text-content">
              {item.content}
            </div>
          );
        }
        return (
          <div key={index}>
            {/*  eslint-disable-next-line @typescript-eslint/no-explicit-any*/}
            {allMessageContent[item.type as keyof typeof allMessageContent](
              item as any,
            )}
          </div>
        );
      })}
    </div>
  );
};

// 使用 React.memo 包装单条消息组件，避免历史消息因父组件状态更新而重新渲染
const MessageBubble = memo(({ message }: { message: MessageProps }) => {
  const bubbleProps = getBubbleProps(message.role);
  return (
    <div className="px-4 py-2">
      <Bubble
        {...bubbleProps}
        content={renderMessageContent(message.content, message.role)}
      />
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export const ChatBubble = () => {
  const { messages } = useChatStore();
  const { selectedId } = useConversationStore();
  const [atBottom, setAtBottom] = useState(true);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const chatMessage = selectedId ? messages.get(selectedId) : [];

  return (
    <div className="flex-1 min-h-0 w-full flex justify-center">
      <Virtuoso
        ref={virtuosoRef}
        data={chatMessage}
        totalCount={chatMessage?.length}
        atBottomStateChange={setAtBottom}
        initialTopMostItemIndex={
          chatMessage?.length ? chatMessage.length - 1 : 0
        }
        followOutput={atBottom ? "smooth" : false}
        className="chat-bubble-list"
        style={{
          height: "100%",
          width: "50vw",
        }}
        itemContent={(index, message) => {
          if (!message) return null;
          return <MessageBubble key={index} message={message} />;
        }}
      />
    </div>
  );
};
