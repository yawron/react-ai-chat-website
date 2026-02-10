import { UserOutlined } from "@ant-design/icons";
import { Bubble } from "@ant-design/x";
import { forwardRef } from "react";
import { Virtuoso } from "react-virtuoso";

import { useChatStore, useConversationStore } from "@pc/store";

import { allMessageContent } from "./content";

import type { MessageContent } from "@pc/types/chat";
import type { Role } from "@pc/types/common";
import type { HTMLAttributes } from "react";
import "./bubble.css"; // 添加CSS导入
import "highlight.js/styles/github.css";

const Scroller = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  (props, ref) => (
    <div
      {...props}
      ref={ref}
      className={`${props.className ? `${props.className} ` : ""}chat-bubble-list`}
    />
  ),
);

export const ChatBubble = () => {
  const { messages } = useChatStore();
  const { selectedId } = useConversationStore();

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

  const chatMessage = selectedId ? messages.get(selectedId) : [];

  // 渲染消息内容
  const renderMessageContent = (content: MessageContent[]) => {
    if (!content || content.length === 0) {
      return null;
    }

    return (
      <div className="message-content">
        {content.map((item, index) => {
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

  return (
    <Virtuoso
      data={chatMessage || []}
      followOutput="smooth"
      components={{
        Scroller,
        Footer: () => <div style={{ height: "25%" }} />,
      }}
      style={{
        height: "100%",
        width: "50vw",
      }}
      itemContent={(index, message) => {
        const bubbleProps = getBubbleProps(message.role);
        return (
          <div className="px-4 py-2" data-index={index}>
            <Bubble
              {...bubbleProps}
              content={renderMessageContent(message.content)}
            />
          </div>
        );
      }}
    />
  );
};
