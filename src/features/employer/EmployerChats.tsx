import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useEmployerChat } from '../../hooks/useEmployerChat';
import { EmployerChatList } from './components/EmployerChatList';
import { EmployerChatWindow } from './components/EmployerChatWindow';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X } from 'lucide-react';

interface EmployerChatsProps {
  initialTargetCandidate?: string | null;
  onClearTargetCandidate?: () => void;
}

export const EmployerChats: React.FC<EmployerChatsProps> = ({ 
  initialTargetCandidate,
  onClearTargetCandidate
}) => {
  const { setEmployerSelectedChatId, messagesSearchOpen, setMessagesSearchOpen } = useApp();
  
  const {
    sessions,
    selectedSessionId,
    setSelectedSessionId,
    activeSession,
    isTyping,
    sendMessage,
    createSession,
    language
  } = useEmployerChat(initialTargetCandidate, onClearTargetCandidate);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeCandidate, setComposeCandidate] = useState('');
  const [composeMessage, setComposeMessage] = useState('');

  // Synchronize with global AppContext for header/layout awareness
  useEffect(() => {
    setEmployerSelectedChatId(selectedSessionId);
    return () => {
      setEmployerSelectedChatId(null);
    };
  }, [selectedSessionId, setEmployerSelectedChatId]);

  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeCandidate.trim() || !composeMessage.trim()) return;
    createSession(composeCandidate, composeMessage);
    setComposeOpen(false);
    setComposeCandidate('');
    setComposeMessage('');
  };

  const t = {
    writeNewMessage: language === 'uz' ? 'Yangi xabar' : language === 'ru' ? 'Новое сообщение' : "New message",
    candidateClient: language === 'uz' ? 'Nomzod ism-sharifi' : language === 'ru' ? 'ФИО кандидата' : "Candidate Name",
    candidatePlaceholder: language === 'uz' ? 'Ismini kiriting' : language === 'ru' ? 'Введите имя' : "Enter name",
    messageText: language === 'uz' ? 'Xabar matni' : language === 'ru' ? 'Текст сообщения' : "Message text",
    messagePlaceholder: language === 'uz' ? 'Xabaringizni yozing...' : language === 'ru' ? 'Напишите ваше сообщение...' : "Type your message...",
    sendMessage: language === 'uz' ? 'Yuborish' : language === 'ru' ? 'Отправить' : "Send",
  };

  if (selectedSessionId && activeSession) {
    return (
      <EmployerChatWindow
        language={language}
        activeSession={activeSession}
        onBack={() => setSelectedSessionId(null)}
        onSendMessage={sendMessage}
        isTyping={isTyping}
      />
    );
  }

  return (
    <>
      <EmployerChatList
        language={language}
        sessions={sessions}
        onSelectSession={setSelectedSessionId}
        messagesSearchOpen={messagesSearchOpen}
        setMessagesSearchOpen={setMessagesSearchOpen}
        onComposeClick={() => setComposeOpen(true)}
      />

      <AnimatePresence>
        {composeOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setComposeOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleComposeSubmit}
              className="relative bg-white w-full max-w-md rounded-2xl p-6 z-10 flex flex-col gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border-none"
            >
              <div className="flex justify-between items-center border-b border-brand-surface-low pb-3">
                <h3 className="font-display font-bold text-base text-brand-primary">{t.writeNewMessage}</h3>
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="p-1 rounded-full hover:bg-brand-surface-low text-brand-text-variant cursor-pointer border-none bg-transparent"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.candidateClient}</label>
                <input
                  type="text"
                  required
                  placeholder={t.candidatePlaceholder}
                  className="bg-slate-50 border-none rounded-xl p-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  value={composeCandidate}
                  onChange={(e) => setComposeCandidate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.messageText}</label>
                <textarea
                  required
                  rows={4}
                  placeholder={t.messagePlaceholder}
                  className="bg-slate-50 border-none rounded-xl p-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all resize-none"
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
    </>
  );
};
