import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Send } from 'lucide-react';
import { useMessagesScreen } from '../../hooks/useMessagesScreen';
import { useChatScreen } from '../../hooks/useChatScreen';
import { ChatListPanel } from '../chat/ChatListPanel';
import { ChatDetailPanel } from '../chat/ChatDetailPanel';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

export const MessagesScreen: React.FC = () => {
  const {
    t,
    searchQuery,
    setSearchQuery,
    composeOpen,
    setComposeOpen,
    composeCompany,
    setComposeCompany,
    composeMessage,
    setComposeMessage,
    filteredChats,
    handleChatClick,
    handleComposeSubmit
  } = useMessagesScreen();

  const {
    selectedChatId,
    activeChat,
    inputText,
    setInputText,
    isTyping,
    messagesEndRef,
    handleSend,
    setCurrentScreen,
    sendMessage
  } = useChatScreen();

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
        <div className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${selectedChatId ? 'hidden md:flex' : 'flex'} flex-col`}>
          <ChatListPanel
            filteredChats={filteredChats}
            selectedChatId={effectiveActiveChat?.id || null}
            onChatClick={(id) => handleChatClick(id)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onComposeClick={() => setComposeOpen(true)}
            t={t}
          />
        </div>

        {/* Right Active Chat Conversation Panel ("chat") */}
        <div className={`flex-1 h-full ${!selectedChatId ? 'hidden md:flex' : 'flex'} flex-col bg-slate-50/50`}>
          <ChatDetailPanel
            activeChat={effectiveActiveChat}
            t={t}
            inputText={inputText}
            setInputText={setInputText}
            isTyping={isTyping}
            messagesEndRef={messagesEndRef}
            handleSend={handleSend}
            onBackMobile={() => handleChatClick('')}
            setCurrentScreen={setCurrentScreen}
          />
        </div>
      </div>

      {/* Compose Chat Modal */}
      <AnimatePresence>
        {composeOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setComposeOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleComposeSubmit}
              className="relative bg-white w-full max-w-md rounded-2xl p-6 z-10 flex flex-col gap-4 shadow-2xl border-none"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-sans font-bold text-base text-slate-900">{t.writeNewMessage}</h3>
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer border-none bg-transparent"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.employerClient}</label>
                <input
                  type="text"
                  required
                  placeholder={t.employerPlaceholder}
                  className="bg-slate-50 border-none rounded-xl p-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  value={composeCompany}
                  onChange={(e) => setComposeCompany(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.messageText}</label>
                <textarea
                  required
                  rows={4}
                  placeholder={t.messagePlaceholder}
                  className="bg-slate-50 border-none rounded-xl p-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus:ring-2 focus:ring-brand-primary/20 transition-all resize-none"
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors mt-2 border-none"
              >
                <span>{t.sendMessage}</span>
                <Send size={14} />
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
