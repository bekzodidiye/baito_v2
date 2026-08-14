import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Inbox, SquarePen, Search, X } from 'lucide-react';
import { EmployerPageHeader } from '../EmployerPageHeader';
import { ChatSession } from '../../../hooks/useEmployerChat';

interface EmployerChatListProps {
  language: 'uz' | 'ru' | 'en';
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  messagesSearchOpen: boolean;
  setMessagesSearchOpen: (open: boolean) => void;
  onComposeClick: () => void;
}

export const EmployerChatList: React.FC<EmployerChatListProps> = ({
  language,
  sessions,
  onSelectSession,
  messagesSearchOpen,
  setMessagesSearchOpen,
  onComposeClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = sessions.filter(s => 
    s.candidateName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const t = {
    searchChatPlaceholder: language === 'uz' ? 'Xabarlarni qidirish...' : language === 'ru' ? 'Поиск сообщений...' : "Search messages...",
    noConversations: language === 'uz' ? 'Suhbatlar yo\'q' : language === 'ru' ? 'Нет чатов' : "No chats",
    archivedConversations: language === 'uz' ? 'Arxivlangan suhbatlar mavjud emas' : language === 'ru' ? 'Архивированных чатов нет' : "No archived chats",
    writeNewMessage: language === 'uz' ? 'Yangi xabar' : language === 'ru' ? 'Новое сообщение' : "New message",
    conversationNotStarted: language === 'uz' ? 'Suhbat hali boshlanmagan' : language === 'ru' ? 'Чат еще не начат' : "Chat not started",
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 px-4 md:px-6 flex flex-col gap-6 pb-24 md:pb-6">
      <EmployerPageHeader 
        title={language === 'uz' ? 'Suhbatlar' : language === 'ru' ? 'Чаты' : "Chats"}
        description={language === 'uz' ? "Nomzodlar bilan xabarlashish" : language === 'ru' ? "Общение с кандидатами" : "Chat with candidates"}
        language={language}
        showPostButton={false}
      />
      {/* Search Bar */}
      <AnimatePresence>
        {messagesSearchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', scale: 1, marginBottom: 4 }}
            exit={{ opacity: 0, height: 0, scale: 0.95, marginBottom: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="relative flex items-center bg-white border border-slate-200/90 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] h-12 px-4 group/search">
              <Search className="text-slate-400 group-focus-within/search:text-brand-primary transition-colors flex-shrink-0" size={18} />
              <input
                type="text"
                autoFocus
                className="w-full h-full pl-3 pr-8 bg-transparent text-sm font-sans focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 transition-all placeholder:text-slate-400 font-semibold text-slate-800 border-none"
                placeholder={t.searchChatPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {(searchQuery || messagesSearchOpen) && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setMessagesSearchOpen(false);
                  }}
                  className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer flex items-center justify-center border-none bg-transparent"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat List */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex flex-col bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03),_0_1px_3px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-300 overflow-hidden"
      >
        {filteredChats.map((chat, idx) => {
          const messages = Array.isArray(chat.messages) ? chat.messages : [];
          const lastMsg = messages[messages.length - 1];
          const candidateInitial = (chat.candidateName || 'C').charAt(0);

          return (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelectSession(chat.id)}
              className="flex items-center px-4 py-4 hover:bg-brand-surface-low transition-colors cursor-pointer border-b border-brand-surface-low last:border-none group relative"
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-surface-low border border-brand-outline-variant">
                  {chat.candidateAvatar ? (
                    <img src={chat.candidateAvatar} alt={chat.candidateName || ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-primary text-white font-bold text-sm">
                      {candidateInitial}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-brand-secondary border-2 border-white rounded-full" />
              </div>
              
              <div className="ml-4 flex-grow min-w-0 pr-2">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-display font-bold text-sm text-brand-primary truncate group-hover:text-brand-primary-container transition-colors">
                    {chat.candidateName || ''}
                  </h3>
                  <span className={`text-[10px] font-semibold whitespace-nowrap text-brand-text-variant`}>
                    {chat.time || ''}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-xs truncate pr-4 text-brand-text-variant font-medium`}>
                    {lastMsg?.text || t.conversationNotStarted}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredChats.length === 0 && (
          <div className="p-8 text-center text-brand-text-variant">
            <Inbox size={40} className="mx-auto text-brand-outline-variant mb-2" />
            <p className="font-display font-bold text-sm">{t.noConversations}</p>
          </div>
        )}
      </motion.div>

      {/* Empty state tip */}
      <div className="mt-4 text-center">
        <p className="text-xs text-brand-text-variant opacity-60 font-semibold">
          {t.archivedConversations}
        </p>
      </div>
    </div>
  );
};
