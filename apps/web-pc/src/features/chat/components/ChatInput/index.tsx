import { LinkOutlined } from "@ant-design/icons";
import { Attachments, Sender } from "@ant-design/x";
import { Button, Spin, type GetRef } from "antd";
import React, { useState, useRef, useEffect, useCallback } from "react";

import { BASE_URL } from "@pc/constant";
import { sessionApi } from "@pc/apis/session";
import { useConversationStore, useChatStore } from "@pc/store";
import { isImageByExtension } from "@pc/utils/judgeImage";

import { useFileUpload, useChatSend } from "./hooks";
import type { RcFile } from "antd/es/upload";

const ChatInput: React.FC = () => {
  const [inputLoading, setInputLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const attachmentsRef = useRef<GetRef<typeof Attachments>>(null);
  const senderRef = useRef<GetRef<typeof Sender>>(null);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // 使用文件上传 hook
  const {
    fileList,
    uploadProgress,
    isUploading,
    isLoading,
    failedChunks,
    fileInfo,
    selectFile,
    cancelUpload,
    retryUpload,
    resetUploadState,
    setFileList,
  } = useFileUpload(selectedChatId);

  // 使用消息发送 hook
  const { createSSEAndSendMessage } = useChatSend();

  const { addMessage } = useChatStore();
  const { selectedId, setSelectedId, addConversation } = useConversationStore();

  // 同步 selectedId
  useEffect(() => {
    setSelectedChatId(selectedId);
  }, [selectedId]);

  // 切换会话时重置输入状态
  useEffect(() => {
    resetUploadState();
    setInputValue("");
  }, [selectedId, resetUploadState]);

  // 监听输入值变化
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  // 粘贴上传/文件框选择上传都会拦截至此处
  const handleFileUpload = useCallback(
    (file: RcFile) => {
      selectFile(file);
      return false;
    },
    [selectFile],
  );

  const submitMessage = useCallback(
    async (chatMessage: string) => {
      setInputLoading(true);

      // 新建会话，并将id与会话关联
      let currentChatId = selectedChatId;
      if (!currentChatId) {
        const { data } = await sessionApi.createChat(chatMessage || "图片消息");
        const { id, title } = data;
        currentChatId = id;
        setSelectedId(id);
        addConversation({ id, title });
      }

      // 添加文件内容
      if (fileInfo.fileId) {
        const fileIsImage = isImageByExtension(fileInfo.fileName || "");
        if (fileIsImage) {
          addMessage({
            content: [
              {
                type: "image",
                content: fileInfo.filePath
                  ? `${BASE_URL}${fileInfo.filePath}`
                  : "",
              },
            ],
            role: "image",
          });
        } else {
          addMessage({
            content: [
              {
                type: "file",
                content: {
                  uid: fileInfo.fileId,
                  name: fileInfo.fileName || "",
                },
              },
            ],
            role: "file",
          });
        }
      }

      // 添加文本内容
      if (chatMessage && chatMessage.trim()) {
        addMessage({
          content: [
            {
              type: "text",
              content: chatMessage,
            },
          ],
          role: "user",
        });
      }

      // 建立sse连接，发送消息请求,并展示模型回复
      createSSEAndSendMessage(
        currentChatId!,
        chatMessage,
        fileInfo.fileId || undefined,
        () => {
          // SSE 完成后的回调
          setInputLoading(false);
        },
      );

      // 重置输入状态和清空输入框
      setInputValue("");
      setFileList([]);
      resetUploadState();
    },
    [
      selectedChatId,
      fileInfo,
      addMessage,
      createSSEAndSendMessage,
      setFileList,
      resetUploadState,
      setSelectedId,
      addConversation,
    ],
  );

  const senderHeader = (
    <Sender.Header
      title="附件"
      styles={{
        content: {
          padding: 0,
        },
      }}
      open={open}
      onOpenChange={setOpen}
      forceRender
    >
      <Spin
        spinning={isLoading}
        tip={
          isUploading ? (
            <span
              style={{
                fontSize: "12px",
                color: "#ff4f39",
                cursor: "pointer",
              }}
              onClick={cancelUpload}
            >
              点击取消 ({uploadProgress}%)
            </span>
          ) : failedChunks.length > 0 ? (
            <span
              style={{
                fontSize: "12px",
                color: "#1890ff",
                cursor: "pointer",
              }}
              onClick={retryUpload}
            >
              点击重试
            </span>
          ) : (
            <span
              style={{
                fontSize: "12px",
                color: "#ff4f39",
                cursor: "pointer",
              }}
              onClick={cancelUpload}
            >
              点击取消
            </span>
          )
        }
      >
        <Attachments
          ref={attachmentsRef}
          maxCount={1}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items={fileList as any}
          onChange={({
            fileList: fl,
          }: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fileList: any[];
          }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setFileList(fl as any);
            // 如果清空了列表，重置相关的 ref
            if (fl.length === 0) {
              resetUploadState();
            }
          }}
          styles={{
            placeholder: { backgroundColor: "transparent" },
          }}
          beforeUpload={handleFileUpload}
          placeholder={(type) =>
            type === "drop"
              ? {
                  title: "请将文件拖拽至此处",
                }
              : {
                  title: "文件上传",
                  description: "点击或拖拽上传文件",
                }
          }
          getDropContainer={() => senderRef.current?.nativeElement}
        />
      </Spin>
    </Sender.Header>
  );

  return (
    <React.Fragment>
      <div className="w-1/2 z-50 pb-4 bg-white dark:bg-[#141414]">
        <Sender
          ref={senderRef}
          value={inputValue}
          onChange={handleInputChange}
          header={senderHeader}
          prefix={
            <Button
              type="text"
              icon={<LinkOutlined />}
              onClick={() => setOpen(!open)}
            />
          }
          onPasteFile={(_, files) => {
            for (const file of files) {
              attachmentsRef.current?.upload(file);
            }
            setOpen(true);
          }}
          submitType="shiftEnter"
          placeholder="请输入您的问题"
          loading={inputLoading}
          onSubmit={submitMessage}
        />
      </div>
    </React.Fragment>
  );
};

export default ChatInput;
