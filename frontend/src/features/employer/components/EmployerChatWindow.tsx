import React, { useState, useRef, useEffect } from 'react';
import { AttachedFileData } from '../../../hooks/useChatScreen';
import { uploadFileApi } from '../../../api/queries';
import { ArrowLeft, Paperclip, Smile, Send, Copy, Trash2 } from 'lucide-react';
import { ChatSession } from '../../../hooks/useEmployerChat';
import { EmployerChatMessageBubble } from './EmployerChatMessageBubble';
import { EmojiPicker } from '../../../components/chat/EmojiPicker';
import { DeleteMessageModal } from '../../../components/chat/DeleteMessageModal';
import { showToast } from '../../../utils/toast';

interface EmployerChatWindowProps {
  language: string;
  activeSession: ChatSession;
  onBack: () => void;
  onSendMessage: (text: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  isTyping: boolean;
}

export const EmployerChatWindow: React.FC<EmployerChatWindowProps> = ({
  language,
  activeSession,
  onBack,
  onSendMessage,
  onDeleteMessage,
  isTyping
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileData[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    message: any;
    x: number;
    y: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession.messages, isTyping]);

  const t = {
    previewLabel: language === 'uz' ? "Ko'rib chiqish" : language === 'ru' ? 'Предпросмотр' : 'Preview',
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
    if (!inputText.trim() && attachedFiles.length === 0) return;

    const pendingFiles = [...attachedFiles];
    const typed = inputText;
    setInputText('');
    setAttachedFiles([]);

    void (async () => {
      let textToSend = typed;
      if (pendingFiles.length > 0) {
        for (const pending of pendingFiles) {
          try {
            const url = await uploadFileApi(pending.file, 'chat');
            textToSend = `[Img:${url}]` + (textToSend ? ` ${textToSend}` : '');
          } catch {
            window.dispatchEvent(new CustomEvent('global-toast', {
              detail: "Faylni yuklab bo'lmadi. Xabar fayl-siz yuborildi.",
            }));
          }
        }
        if (!textToSend.trim()) return;
      }
      onSendMessage(textToSend);
    })();
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
                    <img src={activeSession.candidateAvatar} alt={activeSession.candidateName} className="w-full h-full object-cover"  onError={(e) => {
        const target = e.currentTarget;
        const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
        if (target.src !== fallback) {
          target.src = fallback;
        }
      }} />
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
              onOpenMenu={(msgItem, x, y) => {
                setContextMenu({ message: msgItem, x, y });
              }}
            />
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2" id="typing-indicator">
            <div className="w-8 h-8 rounded-full bg-brand-surface-low overflow-hidden border border-brand-outline-variant flex-shrink-0 flex items-center justify-center">
              {activeSession.candidateAvatar ? (
                <img src={activeSession.candidateAvatar} alt={activeSession.candidateName} className="w-full h-full object-cover animate-pulse"  onError={(e) => {
        const target = e.currentTarget;
        const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
        if (target.src !== fallback) {
          target.src = fallback;
        }
      }} />
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
        {attachedFiles.length > 0 && (
          <div className="w-full max-w-5xl mx-auto px-4 pt-3 pb-1 flex flex-wrap gap-4 bg-white relative">
            {attachedFiles.map((file, idx) => (
              <div key={idx} className="flex items-end gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-lg overflow-hidden shadow-sm bg-slate-50 border border-slate-200">
                    <img 
                      src={file.previewUrl} 
                      alt={t.previewLabel} 
                      className="w-full h-full object-cover"
                     onError={(e) => {
            const target = e.currentTarget;
            const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
            if (target.src !== fallback) {
              target.src = fallback;
            }
          }} />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      const newFiles = [...attachedFiles];
                      URL.revokeObjectURL(newFiles[idx].previewUrl);
                      newFiles.splice(idx, 1);
                      setAttachedFiles(newFiles);
                    }} 
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-500 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer z-10 hover:bg-slate-600 transition-colors border border-white"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1">
                  {file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="w-full flex items-center gap-3">
          <input 
            type="file" 
            id="employer-chat-file" 
            className="hidden" 
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files) {
                const newFiles = Array.from(e.target.files);
                if (attachedFiles.length + newFiles.length > 5) {
                  window.dispatchEvent(new CustomEvent("global-toast", { detail: "Siz ko'pi bilan 5 ta rasm tanlashingiz mumkin" }));
                  return;
                }
                const newAttachedFiles = newFiles.map(f => ({
                  name: f.name,
                  previewUrl: URL.createObjectURL(f),
                  file: f
                }));
                setAttachedFiles([...attachedFiles, ...newAttachedFiles]);
                if (newFiles.length === 1) {
                  window.dispatchEvent(new CustomEvent("global-toast", { detail: `${newFiles[0].name} biriktirildi` }));
                } else {
                  window.dispatchEvent(new CustomEvent("global-toast", { detail: `${newFiles.length} rasm biriktirildi` }));
                }
                e.target.value = '';
              }
            }} 
          />

          <div className="flex-1 flex items-center bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 transition-all focus-within:border-brand-primary/40 focus-within:ring-2 focus-within:ring-brand-primary/10">
            <button 
              onClick={() => document.getElementById('employer-chat-file')?.click()} 
              type="button"
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center shrink-0"
              title={t.attachFile}
            >
              <Paperclip size={20} />
            </button>

            <form onSubmit={handleSend} className="flex-1 mx-2 focus:outline-none outline-none">
              <input
                aria-label={t.typeMessage}
                type="text"
                style={{ outline: 'none', boxShadow: 'none' }}
                className="w-full bg-transparent text-slate-800 text-xs sm:text-sm placeholder:text-slate-400 border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 p-0 shadow-none"
                placeholder={t.typeMessage}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </form>

            <button 
              onClick={() => setShowEmoji(!showEmoji)} 
              type="button"
              className={`p-1 transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center shrink-0 ${
                showEmoji ? 'text-brand-primary' : 'text-slate-400 hover:text-slate-600'
              }`}
              title={t.emoji}
            >
              <Smile size={20} />
            </button>
          </div>

          <button
            onClick={() => handleSend()}
            type="button"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-brand-primary text-white shadow-md hover:shadow-lg active:scale-90 transition-all cursor-pointer shrink-0 border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            title={t.sendMessage}
          >
            <Send size={18} />
          </button>
        </div>
      </footer>

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
        language={language as 'uz' | 'ru' | 'en'}
        isOwnMessage={deleteTarget?.sender === 'recruiter'}
        participantName={activeSession.candidateName}
      />
    </div>
  );
};
