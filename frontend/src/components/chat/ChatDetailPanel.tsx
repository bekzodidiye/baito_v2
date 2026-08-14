import React from 'react';
import { MessageSquare, MapPin, CheckCheck } from 'lucide-react';
import { ChatHeader } from './ChatHeader';
import { ChatInputBar } from './ChatInputBar';
import { Chat } from '../../types';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import type { AttachedFileData } from '../../hooks/useChatScreen';

interface ChatDetailPanelProps {
  activeChat: Chat | null;
  t: any;
  inputText: string;
  setInputText: (text: string) => void;
  attachedFile: AttachedFileData | null;
  setAttachedFile: (file: AttachedFileData | null) => void;
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  handleSend: (e?: React.FormEvent) => void;
  onBackMobile: () => void;
  setCurrentScreen: (screen: any) => void;
}

export const ChatDetailPanel: React.FC<ChatDetailPanelProps> = ({
  activeChat,
  t,
  inputText,
  setInputText,
  attachedFile,
  setAttachedFile,
  isTyping,
  messagesEndRef,
  handleSend,
  onBackMobile,
  setCurrentScreen
}) => {
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#EAEFF4] text-slate-400 p-6 select-none">
        <div className="w-20 h-20 rounded-full bg-white/80 shadow-xs flex items-center justify-center mb-4 text-slate-300">
          <MessageSquare size={36} />
        </div>
        <p className="text-sm font-semibold text-slate-600">
          Suhbatni boshlash uchun muloqotni tanlang
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Barcha xabarlar Telegram kabi havfsiz va real-vaqtda yetkaziladi
        </p>
      </div>
    );
  }

  const messages = Array.isArray(activeChat.messages) ? activeChat.messages : [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#EAEFF4] relative overflow-hidden">
      {/* Header */}
      <ChatHeader
        activeChat={activeChat}
        t={t}
        setCurrentScreen={(scr) => {
          if (scr === 'messages') {
            onBackMobile();
          } else {
            setCurrentScreen(scr);
          }
        }}
      />

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 no-scrollbar">
        <div className="flex justify-center my-2">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-slate-500 font-bold text-[11px] rounded-full shadow-2xs border border-slate-200/60">
            {t.today || 'Bugun'}
          </span>
        </div>

        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id || index}
              className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%] ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-300 shadow-2xs mb-1">
                  {activeChat.recruiterAvatar ? (
                    <img src={activeChat.recruiterAvatar} alt={activeChat.recruiterName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-xs text-brand-primary">
                      {(activeChat.companyName || 'C').charAt(0)}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                <div
                  className={`px-4 py-2.5 rounded-[18px] text-xs font-medium leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-brand-primary text-white rounded-br-xs'
                      : 'bg-white text-slate-900 rounded-bl-xs border border-slate-200/70'
                  }`}
                >
                  {(() => {
                    // New format: [Img:<blobUrl>] optional text
                    const imgMatch = msg.text.match(/^\[Img:(.*?)\]\s*(.*)$/);
                    if (imgMatch) {
                      return (
                        <div className="flex flex-col gap-1.5">
                          <div className="rounded-xl overflow-hidden shadow-sm border border-black/5 bg-slate-100 max-w-[240px]">
                            <img 
                              src={imgMatch[1]} 
                              alt="Rasm" 
                              className="w-full h-auto object-cover rounded-xl"
                              style={{ maxHeight: '280px' }}
                            />
                          </div>
                          {imgMatch[2] && (
                            <p className="whitespace-pre-wrap leading-relaxed">{imgMatch[2]}</p>
                          )}
                        </div>
                      );
                    }
                    // Legacy format: [Fayl: name] optional text
                    const faylMatch = msg.text.match(/^\[Fayl:\s*(.*?)\]\s*(.*)$/);
                    if (faylMatch) {
                      return (
                        <div className="flex flex-col gap-1.5">
                          <div className="rounded-xl overflow-hidden shadow-sm border border-black/5 bg-slate-100 max-w-[240px] p-6 flex flex-col items-center justify-center gap-2">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                            <span className="text-[10px] font-semibold opacity-70">Fayl</span>
                          </div>
                          {faylMatch[2] && (
                            <p className="whitespace-pre-wrap leading-relaxed">{faylMatch[2]}</p>
                          )}
                        </div>
                      );
                    }
                    return <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>;
                  })()}

                  {/* Optional Map Location Snippet */}
                  {msg.hasMap && (
                    <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
                      <div className="w-full h-24 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-50/60 flex items-center justify-center">
                          <MapPin size={26} className="text-red-500 animate-bounce" />
                        </div>
                        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                          {msg.mapLocation || 'Tashkent'}
                        </div>
                      </div>
                      <button
                        onClick={() => setCurrentScreen('jobs')}
                        className="w-full py-2 px-3 flex items-center justify-between bg-white text-brand-primary text-[11px] font-bold border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <span>{t.workplaceMap || "Xaritada ko'rish"}</span>
                        <span>→</span>
                      </button>
                    </div>
                  )}

                  <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end text-blue-100' : 'justify-end text-slate-400'}`}>
                    <span className="text-[10px] font-medium">{msg.time}</span>
                    {isUser && <CheckCheck size={14} className="text-white shrink-0 ml-0.5" />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-white px-3.5 py-2 rounded-full border border-slate-200/80 shadow-2xs">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.6s]" />
            </div>
            <span className="text-[10px] text-slate-400 font-medium">yozmoqda...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <ChatInputBar
        inputText={inputText}
        setInputText={setInputText}
        attachedFile={attachedFile}
        setAttachedFile={setAttachedFile}
        handleSend={handleSend}
        t={t}
      />
    </div>
  );
};
