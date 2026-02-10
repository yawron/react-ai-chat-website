import { UserOutlined } from "@ant-design/icons";
import { Bubble } from "@ant-design/x";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import debounce from "lodash/debounce";
import throttle from "lodash/throttle";

import { useChatStore, useConversationStore } from "@pc/store";

import { allMessageContent } from "./content";

import type { MessageContent } from "@pc/types/chat";
import type { Role } from "@pc/types/common";
import type { HTMLAttributes } from "react";
import "./bubble.css"; // 添加CSS导入
import "highlight.js/styles/github.css";

export const ChatBubble = () => {
  const { messages } = useChatStore();
  const { selectedId } = useConversationStore();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

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
  const handleScroll = useMemo(
    () =>
      throttle(
        (scrollTop: number, scrollHeight: number, clientHeight: number) => {
          setIsAtBottom(scrollHeight - (scrollTop + clientHeight) < 12);
        },
        80,
      ),
    [],
  );

  const handleResize = useMemo(
    () =>
      debounce(() => {
        if (!scrollerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollerRef.current;
        setIsAtBottom(scrollHeight - (scrollTop + clientHeight) < 12);
      }, 200),
    [],
  );

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      handleResize.cancel();
      handleScroll.cancel();
    };
  }, [handleResize, handleScroll]);

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
      followOutput={isAtBottom ? "smooth" : false}
      components={{
        Scroller: forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
          (props, ref) => (
            <div
              {...props}
              ref={(node) => {
                scrollerRef.current = node;
                if (typeof ref === "function") {
                  ref(node);
                } else if (ref) {
                  ref.current = node;
                }
              }}
              className={`${
                props.className ? `${props.className} ` : ""
              }chat-bubble-list`}
              onScroll={(event) => {
                if (!event.currentTarget) return;
                handleScroll(
                  event.currentTarget.scrollTop,
                  event.currentTarget.scrollHeight,
                  event.currentTarget.clientHeight,
                );
              }}
            />
          ),
        ),
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
