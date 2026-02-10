import { SearchOutlined } from "@ant-design/icons";
import { Sender } from "@ant-design/x";
import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { sessionApi } from "@pc/apis/session";
import { useConversationStore } from "@pc/store";
import { useThemeStore } from "@pc/store";

import type { ChatSession } from "@pc/types/session";

interface SearchButtonProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchButton = ({ isOpen, onClose }: SearchButtonProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setSelectedId } = useConversationStore();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const [searchResults, setSearchResults] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");

  const handleSubmit = async (value: string) => {
    const trimmedValue = value.trim();
    setQuery(trimmedValue);
    if (trimmedValue) {
      setIsLoading(true);
      try {
        const { data } = await sessionApi.searchMessages(trimmedValue);
        setSearchResults(data);
      } catch (error) {
        console.error("搜索失败:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-500/10 dark:bg-gray-900/30 z-[9998]" />
      <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20">
        <div
          ref={modalRef}
          className={`w-[640px] rounded-xl border shadow-2xl overflow-hidden ${
            isDark ? "bg-[#141414] border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium dark:text-white">
              搜索聊天记录
            </h3>
          </div>
          <div className="p-4">
            <style>
              {`
                .search-sender.ant-x-sender {
                  border: 1px solid #E5E7EB !important;
                  border-radius: 0.5rem !important;
                  box-shadow: none !important;
                }
                .search-sender.ant-x-sender:hover {
                  border-color: #9CA3AF !important;
                }
                .search-sender.ant-x-sender:focus-within {
                  border-color: #6B7280 !important;
                }
                .search-sender .ant-x-sender-submit {
                  background-color: transparent !important;
                  border: none !important;
                  color: #6B7280 !important;
                }
                .search-sender .ant-x-sender-submit:hover {
                  background-color: #F3F4F6 !important;
                  color: #374151 !important;
                }
              `}
            </style>
            <Sender
              placeholder="搜索聊天记录..."
              onSubmit={handleSubmit}
              prefix={
                <SearchOutlined className="text-gray-500 dark:text-gray-400" />
              }
              className="search-sender"
            />
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center text-gray-500 dark:text-gray-400">
                搜索中...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:hover:bg-gray-800"
                    onClick={() => {
                      setSelectedId(chat.id);
                      navigate(`/conversation/${chat.id}`);
                      onClose();
                    }}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {chat.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      更新于 {new Date(chat.updateTime).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                {query ? "无匹配会话" : "输入关键词开始搜索"}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
