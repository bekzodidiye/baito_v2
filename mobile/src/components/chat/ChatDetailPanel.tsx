import React, { useState, useEffect } from 'react';
import { MessageCircle, MapPin, CheckCheck, MoreVertical, Copy, Trash2 } from 'lucide-react';
import { ChatHeader } from './ChatHeader';
import { ChatInputBar } from './ChatInputBar';
import { ImageModal } from './ImageModal';
import { DeleteMessageModal } from './DeleteMessageModal';
import { Chat, Message } from '../../types';
import type { AttachedFileData } from '../../hooks/useChatScreen';
import { showToast } from '../../utils/toast';
import { useAuthStore } from '../../store/useAuthStore';

interface ChatDetailPanelProps {
  activeChat: Chat | null;
  t: any;
  inputText: string;
  setInputText: (text: string) => void;
  attachedFiles: AttachedFileData[];
  setAttachedFiles: (files: AttachedFileData[]) => void;
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  handleSend: (e?: React.FormEvent) => void;
  onBackMobile: () => void;
  setCurrentScreen: (screen: any) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export const ChatDetailPanel: React.FC<ChatDetailPanelProps> = ({
  activeChat,
  t,
  inputText,
  setInputText,
  attachedFiles,
  setAttachedFiles,
  isTyping,
  messagesEndRef,
  handleSend,
  onBackMobile,
  setCurrentScreen,
  onDeleteMessage
}) => {
  const language = useAuthStore((s) => s.language);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    message: Message;
    x: number;
    y: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const lastTapRef = React.useRef<{ id: string; time: number }>({ id: '', time: 0 });

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, []);
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white text-slate-400 p-6 select-none">
        <div className="w-20 h-20 rounded-full bg-slate-50 shadow-xs flex items-center justify-center mb-4 text-slate-300">
          <MessageCircle size={36} />
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
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white relative overflow-hidden">
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
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3.5 no-scrollbar">
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
              className={`flex items-end gap-1.5 max-w-[85%] sm:max-w-[70%] group relative ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-300 shadow-2xs mb-1">
                  {activeChat.recruiterAvatar ? (
                    <img src={activeChat.recruiterAvatar} alt={activeChat.recruiterName} className="w-full h-full object-cover"  onError={(e) => {
        const target = e.currentTarget;
        const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
        if (target.src !== fallback) {
          target.src = fallback;
        }
      }} />
                  ) : (
                    <span className="font-bold text-xs text-brand-primary">
                      {(activeChat.companyName || 'C').charAt(0)}
                    </span>
                  )}
                </div>
              )}

              {/* Subtle hover trigger for Telegram action menu */}
              <div
                className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center mb-1 shrink-0 ${
                  isUser ? 'order-first' : 'order-last'
                }`}
              >
                <button
                  type="button"
                  title={language === 'uz' ? 'Amallar' : language === 'ru' ? 'Действия' : 'Actions'}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setContextMenu({
                      message: msg,
                      x: isUser ? Math.max(10, rect.left - 165) : Math.min(window.innerWidth - 180, rect.right + 6),
                      y: Math.min(rect.top, window.innerHeight - 120),
                    });
                  }}
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                >
                  <MoreVertical size={13} />
                </button>
              </div>

              <div
                className="flex flex-col gap-0.5 cursor-pointer select-none"
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    message: msg,
                    x: Math.min(e.clientX, window.innerWidth - 180),
                    y: Math.min(e.clientY, window.innerHeight - 120),
                  });
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    message: msg,
                    x: Math.min(e.clientX, window.innerWidth - 180),
                    y: Math.min(e.clientY, window.innerHeight - 120),
                  });
                }}
                onTouchEnd={(e) => {
                  const now = Date.now();
                  if (lastTapRef.current.id === msg.id && now - lastTapRef.current.time < 350) {
                    const touch = e.changedTouches[0];
                    if (touch) {
                      e.preventDefault();
                      setContextMenu({
                        message: msg,
                        x: Math.min(touch.clientX, window.innerWidth - 180),
                        y: Math.min(touch.clientY, window.innerHeight - 120),
                      });
                    }
                    lastTapRef.current = { id: '', time: 0 };
                  } else {
                    lastTapRef.current = { id: msg.id, time: now };
                  }
                }}
              >
                {(() => {
                  const imgRegex = /\[Img:(.*?)\]/g;
                  const images: string[] = [];
                  let match;
                  while ((match = imgRegex.exec(msg.text)) !== null) {
                    if (match[1]) images.push(match[1]);
                  }
                  const hasImages = images.length > 0;
                  const cleanCaption = msg.text.replace(/\[Img:.*?\]/g, '').trim();

                  return (
                    <div
                      className={`rounded-2xl text-xs font-medium leading-relaxed shadow-xs ${
                        hasImages ? 'p-2 sm:p-2.5' : 'px-4 py-2.5'
                      } ${
                        isUser
                          ? 'bg-brand-primary text-white rounded-br-xs'
                          : 'bg-white text-slate-900 rounded-bl-xs border border-slate-200/70'
                      }`}
                    >
                      {hasImages ? (
                        <div className="flex flex-col gap-1.5">
                          {images.length === 1 ? (
                            <button 
                              type="button"
                              className="rounded-xl overflow-hidden shadow-xs bg-slate-900/10 w-52 h-52 cursor-pointer hover:opacity-95 transition-opacity text-left p-0 border-0 focus-visible:outline-2 focus-visible:outline-brand-primary"
                              onClick={() => setModalImage(images[0])}
                              aria-label={t.imageLabel}
                            >
                              <img 
                                src={images[0]} 
                                alt="" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
                                  if (target.src !== fallback) {
                                    target.src = fallback;
                                  }
                                }} 
                              />
                            </button>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5 max-w-[280px]">
                              {images.map((imgUrl, i) => (
                                <button 
                                  type="button"
                                  key={i} 
                                  className={`rounded-xl overflow-hidden shadow-xs bg-slate-900/10 cursor-pointer hover:opacity-95 transition-opacity text-left p-0 border-0 focus-visible:outline-2 focus-visible:outline-brand-primary ${
                                    images.length === 3 && i === 0 ? 'col-span-2 h-36' : 'h-28'
                                  }`}
                                  onClick={() => setModalImage(imgUrl)}
                                  aria-label={`${t.imageLabel} ${i + 1}`}
                                >
                                  <img 
                                    src={imgUrl} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
                                      if (target.src !== fallback) {
                                        target.src = fallback;
                                      }
                                    }} 
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                          {cleanCaption && (
                            <p className="whitespace-pre-wrap leading-relaxed px-1 pt-1 text-sm font-medium">{cleanCaption}</p>
                          )}
                        </div>
                      ) : (() => {
                        // Legacy format: [Fayl: name] optional text
                        const faylMatch = msg.text.match(/^\[Fayl:\s*(.*?)\]\s*(.*)$/);
                        if (faylMatch) {
                          return (
                            <div className="flex flex-col gap-1.5">
                              <div className="rounded-xl overflow-hidden shadow-sm border border-black/5 bg-slate-100 max-w-[240px] p-6 flex flex-col items-center justify-center gap-2">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                                <span className="text-[10px] font-semibold opacity-70">{t.fileLabel}</span>
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

                      <div className={`flex items-center gap-1 mt-1 ${hasImages ? 'px-1' : ''} ${isUser ? 'justify-end text-blue-100' : 'justify-end text-slate-400'}`}>
                        <span className="text-[10px] font-medium">{msg.time}</span>
                        {isUser && <CheckCheck size={14} className="text-sky-300 shrink-0 ml-0.5" />}
                      </div>
                    </div>
                  );
                })()}
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
            <span className="text-[10px] text-slate-400 font-medium">{t.typingIndicator}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <ChatInputBar
        inputText={inputText}
        setInputText={setInputText}
        attachedFiles={attachedFiles}
        setAttachedFiles={setAttachedFiles}
        handleSend={handleSend}
        t={t}
      />
      <ImageModal isOpen={!!modalImage} imageUrl={modalImage || ''} onClose={() => setModalImage(null)} />

      {/* Telegram-style Message Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/90 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100 select-none"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              const cleanText =
                contextMenu.message.text
                  .replace(/\[Img:.*?\]/g, '')
                  .replace(/\[Fayl:.*?\]/g, '')
                  .trim() || contextMenu.message.text;
              navigator.clipboard.writeText(cleanText);
              showToast(
                language === 'uz'
                  ? 'Xabar nusxalandi'
                  : language === 'ru'
                    ? 'Текст скопирован'
                    : 'Copied to clipboard',
                'info',
              );
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-primary transition-colors cursor-pointer text-left"
          >
            <Copy size={15} />
            <span>{language === 'uz' ? 'Nusxa olish' : language === 'ru' ? 'Копировать' : 'Copy'}</span>
          </button>
          {contextMenu.message.id !== 'greeting' && (
            <button
              type="button"
              onClick={() => {
                const target = contextMenu.message;
                setContextMenu(null);
                setDeleteTarget(target);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left border-t border-slate-100"
            >
              <Trash2 size={15} />
              <span>{language === 'uz' ? "O'chirish" : language === 'ru' ? 'Удалить' : 'Delete'}</span>
            </button>
          )}
        </div>
      )}

      {/* Telegram-style Delete Message Modal */}
      <DeleteMessageModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget && onDeleteMessage) {
            onDeleteMessage(deleteTarget.id);
            showToast(
              language === 'uz'
                ? "Xabar o'chirildi"
                : language === 'ru'
                  ? 'Сообщение удалено'
                  : 'Message deleted',
              'info',
            );
          }
          setDeleteTarget(null);
        }}
        language={language}
        isOwnMessage={deleteTarget?.sender === 'user'}
        participantName={activeChat.companyName || activeChat.recruiterName}
      />
    </div>
  );
};
