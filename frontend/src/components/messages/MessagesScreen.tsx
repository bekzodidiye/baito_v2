import React from 'react';
import { useMessagesScreen } from '../../hooks/useMessagesScreen';
import { useChatScreen } from '../../hooks/useChatScreen';
import { ChatListPanel } from '../chat/ChatListPanel';
import { ChatDetailPanel } from '../chat/ChatDetailPanel';

export const MessagesScreen: React.FC = () => {
  const {
    t,
    searchQuery,
    setSearchQuery,
    filteredChats,
    handleChatClick
  } = useMessagesScreen();

  // Which conversation the panel shows when the route has no id — the same
  // choice made below, so the send button targets what is on screen.
  const displayedChatId = filteredChats.length > 0 ? filteredChats[0].id : null;

  const {
    selectedChatId,
    activeChat,
    inputText,
    setInputText,
    attachedFiles,
    setAttachedFiles,
    isTyping,
    messagesEndRef,
    handleSend,
    setCurrentScreen,
    deleteMessage
  } = useChatScreen(displayedChatId);

  // If no chat selected yet on desktop, select the first one by default for continuous view
  const effectiveActiveChat = activeChat || (filteredChats.length > 0 ? filteredChats[0] : null);

  return (
    <div className={`w-full font-sans flex flex-col ${
      selectedChatId
        ? 'h-dvh md:h-screen mt-0 md:mt-0'
        : 'h-[calc(100dvh-7.5rem)] md:h-screen mt-14 md:mt-0'
    }`}>
      {/* Telegram Main 2-Column Desktop Canvas Container */}
      <div className="bg-white overflow-hidden flex flex-col md:flex-row h-full w-full relative">
        {/* Left Contact List Panel ("userlar") */}
        <div className={`w-full md:w-[420px] shrink-0 h-full ${selectedChatId ? 'hidden md:flex' : 'flex'} flex-col`}>
          <ChatListPanel
            filteredChats={filteredChats}
            selectedChatId={effectiveActiveChat?.id || null}
            onChatClick={(id) => handleChatClick(id)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            t={t}
          />
        </div>

        {/* Right Active Chat Conversation Panel ("chat") */}
        <div className={`flex-1 h-full ${!selectedChatId ? 'hidden md:flex' : 'flex'} flex-col bg-white`}>
          <ChatDetailPanel
            activeChat={effectiveActiveChat}
            t={t}
            inputText={inputText}
            setInputText={setInputText}
            attachedFiles={attachedFiles}
            setAttachedFiles={setAttachedFiles}
            isTyping={isTyping}
            messagesEndRef={messagesEndRef}
            handleSend={handleSend}
            onBackMobile={() => handleChatClick('')}
            setCurrentScreen={setCurrentScreen}
            onDeleteMessage={(messageId) => {
              if (effectiveActiveChat) {
                deleteMessage(effectiveActiveChat.id, messageId);
              }
            }}
          />
        </div>
      </div>

    </div>
  );
};
