import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Paperclip, Smile, Send } from 'lucide-react';
import { ChatSession } from '../../../hooks/useEmployerChat';
import { EmployerChatMessageBubble } from './EmployerChatMessageBubble';
import { EmojiPicker } from '../../../components/chat/EmojiPicker';

interface EmployerChatWindowProps {
  language: string;
  activeSession: ChatSession;
  onBack: () => void;
  onSendMessage: (text: string) => void;
  isTyping: boolean;
}

export const EmployerChatWindow: React.FC<EmployerChatWindowProps> = ({
  language,
  activeSession,
  onBack,
  onSendMessage,
  isTyping
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; previewUrl: string } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession.messages, isTyping]);

  const t = {
    back: language === 'uz' ? 'Orqaga' : language === 'ru' ? 'Назад' : "Back",
    online: language === 'uz' ? 'Onlayn' : language === 'ru' ? 'Онлайн' : "Online",
    today: language === 'uz' ? 'Bugun' : language === 'ru' ? 'Сегодня' : "Today",
    workplace: language === 'uz' ? 'Ish joyi' : language === 'ru' ? 'Место работы' : "Workplace",
    attachFile: language === 'uz' ? "Fayl biriktirish" : language === 'ru' ? "Прикрепить файл" : "Attach file",
    typeMessage: language === 'uz' ? "Xabar yozing..." : language === 'ru' ? "Напишите сообщение..." : "Type a message...",
    emoji: language === 'uz' ? "Emoji" : language === 'ru' ? "Эмодзи" : "Emoji",
    sendMessage: language === 'uz' ? 'Yuborish' : language === 'ru' ? 'Отправить' : "Send",
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;
    
    let textToSend = inputText;
    if (attachedFile) {
      textToSend = `[Img:${attachedFile.previewUrl}]` + (textToSend ? ` ${textToSend}` : '');
    }
    
    onSendMessage(textToSend);
    setInputText('');
    setAttachedFile(null);
  };

  const safeMessages = Array.isArray(activeSession.messages) 
    ? activeSession.messages.filter(m => m && typeof m === 'object' && m.sender)
    : [];

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh-2rem)] bg-brand-background relative pt-0 max-w-6xl mx-auto w-full">
      {/* Top App Bar */}
      <header className="sticky top-0 w-full z-30 bg-white shadow-2xs border-b border-slate-100">
        <div className="w-full max-w-5xl mx-auto flex justify-between items-center px-4 h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors cursor-pointer text-brand-text-variant border-none bg-transparent"
              aria-label={t.back}
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-brand-surface-low flex items-center justify-center overflow-hidden border border-brand-outline-variant">
                  {activeSession.candidateAvatar ? (
                    <img src={activeSession.candidateAvatar} alt={activeSession.candidateName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-primary text-white font-bold text-xs">
                      {(activeSession.candidateName || 'C').charAt(0)}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-secondary rounded-full border-2 border-white animate-pulse" />
              </div>

              <div className="flex flex-col">
                <h1 className="font-display font-bold text-sm text-brand-primary leading-tight">
                  {activeSession.candidateName}
                </h1>
                <span className="text-[10px] font-bold text-brand-secondary">
                  {t.online}
                </span>
              </div>
            </div>
          </div>


        </div>
      </header>

      {/* Messages Canvas */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 overflow-y-auto no-scrollbar flex flex-col space-y-4">
        <div className="flex justify-center my-2">
          <span className="px-3.5 py-1.5 bg-white text-brand-text-variant font-bold text-[10px] rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.06),_0_1px_2px_rgba(0,0,0,0.02)] border border-brand-outline-variant/15">
            {t.today}
          </span>
        </div>

        {safeMessages.map((msg, index) => {
          const isRecruiter = msg.sender === 'recruiter';
          return (
            <EmployerChatMessageBubble
              key={msg.id || index}
              msg={msg}
              isRecruiter={isRecruiter}
              activeSession={activeSession}
              workplaceText={t.workplace}
            />
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2" id="typing-indicator">
            <div className="w-8 h-8 rounded-full bg-brand-surface-low overflow-hidden border border-brand-outline-variant flex-shrink-0 flex items-center justify-center">
              {activeSession.candidateAvatar ? (
                <img src={activeSession.candidateAvatar} alt={activeSession.candidateName} className="w-full h-full object-cover animate-pulse" />
              ) : (
                <span className="font-bold text-xs text-brand-primary">{(activeSession.candidateName || 'C').charAt(0)}</span>
              )}
            </div>
            <div className="flex gap-1 bg-white px-4 py-2.5 rounded-full border border-brand-outline-variant/30 shadow-xs">
              <span className="w-1.5 h-1.5 bg-brand-outline rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-brand-outline rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="w-1.5 h-1.5 bg-brand-outline rounded-full animate-bounce [animation-delay:0.6s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input Bar */}
      <footer className="sticky bottom-0 w-full bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-0 py-0 z-30 relative">
        {/* Telegram-style Emoji Picker */}
        {showEmoji && (
          <EmojiPicker
            onSelect={(emoji) => setInputText(prev => prev + emoji)}
            onClose={() => setShowEmoji(false)}
          />
        )}

        {/* Telegram-style Attachment Preview Bar */}
        {attachedFile && (
          <div className="w-full max-w-5xl mx-auto px-4 pt-3 pb-1 flex items-end gap-3 bg-white relative">
            <div className="relative">
              <div className="w-14 h-14 rounded-lg overflow-hidden shadow-sm bg-slate-50 border border-slate-200">
                <img 
                  src={attachedFile.previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
              <button 
                type="button" 
                onClick={() => { URL.revokeObjectURL(attachedFile.previewUrl); setAttachedFile(null); }} 
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-500 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer z-10 hover:bg-slate-600 transition-colors border border-white"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1">
              {attachedFile.name.length > 20 ? attachedFile.name.substring(0, 20) + '...' : attachedFile.name}
            </div>
          </div>
        )}

        <div className="w-full max-w-5xl mx-auto flex items-end gap-2 px-4 pb-3 pt-2 relative bg-white">
          <input 
            type="file" 
            id="employer-chat-file" 
            className="hidden" 
            accept="image/*,application/pdf,.doc,.docx"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const previewUrl = URL.createObjectURL(file);
                setAttachedFile({ name: file.name, previewUrl });
                window.dispatchEvent(new CustomEvent("global-toast", { detail: `${file.name} biriktirildi` }));
                e.target.value = '';
              }
            }} 
          />
          <button 
            onClick={() => document.getElementById('employer-chat-file')?.click()} 
            type="button"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white text-brand-text-variant shadow-xs hover:bg-slate-50 transition-all cursor-pointer border-none shrink-0 bg-transparent"
            title={t.attachFile}
          >
            <Paperclip size={18} />
          </button>

          <form onSubmit={handleSend} className="flex-1 relative flex flex-col items-start gap-1 w-full">
            <div className="w-full relative flex items-center">
              <input
                type="text"
                className="w-full bg-slate-50 text-brand-text font-sans rounded-full py-3 px-5 pr-12 border-none focus:outline-none transition-all placeholder:text-brand-outline text-xs font-semibold h-11"
                placeholder={t.typeMessage}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button 
                onClick={() => setShowEmoji(!showEmoji)} 
                type="button"
                className={`absolute right-4 transition-colors cursor-pointer border-none bg-transparent ${showEmoji ? 'text-brand-primary' : 'text-brand-outline hover:text-brand-primary'}`}
                title={t.emoji}
              >
                <Smile size={18} />
              </button>
            </div>
          </form>

          <button
            onClick={() => handleSend()}
            type="button"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-brand-primary text-white shadow-md hover:shadow-lg active:scale-90 transition-all cursor-pointer shrink-0 border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            title={t.sendMessage}
          >
            <Send size={18} className="translate-x-0.5" />
          </button>
        </div>
      </footer>
    </div>
  );
};
