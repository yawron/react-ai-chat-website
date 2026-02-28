import { DEFAULT_MESSAGE } from "@pc/constant";
import ChatInput from "@pc/features/chat/components/ChatInput";
import { ChatBubble } from "@pc/features/chat/components/Bubble/bubble";
import { useChatStore, useConversationStore } from "@pc/store";

const Home = () => {
  const { selectedId } = useConversationStore();
  const { messages } = useChatStore();

  const chatInfo = selectedId ? messages.get(selectedId) : [];
  const hasMessages = chatInfo && chatInfo.length > 0;

  return (
    <div className="h-screen flex flex-col items-center overflow-hidden">
      <div className="flex-1 min-h-0 w-full flex justify-center overflow-hidden pb-24">
        <ChatBubble />
      </div>
      {!hasMessages && !selectedId && (
        <div className="absolute top-1/2 transform -translate-y-1/2 text-2xl font-bold">
          {DEFAULT_MESSAGE}
        </div>
      )}
      <ChatInput />
    </div>
  );
};

export default Home;
