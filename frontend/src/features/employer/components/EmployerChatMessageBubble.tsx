import React from 'react';
import { translations } from '../../../translations';
import { useAuthStore } from '../../../store/useAuthStore';
import { MapPin, MoreVertical } from 'lucide-react';
import { ChatSession } from '../../../hooks/useEmployerChat';
import { ImageModal } from '../../../components/chat/ImageModal';

interface EmployerChatMessageBubbleProps {
  msg: any;
  isRecruiter: boolean;
  activeSession: ChatSession;
  workplaceText: string;
  onOpenMenu?: (msg: any, x: number, y: number) => void;
}

export const EmployerChatMessageBubble: React.FC<EmployerChatMessageBubbleProps> = ({
  msg,
  isRecruiter,
  activeSession,
  workplaceText,
  onOpenMenu
}) => {
  const [modalImage, setModalImage] = React.useState<string | null>(null);
  const lastTapRef = React.useRef<{ id: string; time: number }>({ id: '', time: 0 });
  const language = useAuthStore(st => st.language);
  const t = translations[language];
  return (
    <div className={`flex items-end gap-1.5 max-w-[85%] group relative ${isRecruiter ? 'self-end flex-row-reverse' : 'self-start'}`}>
      {!isRecruiter && (
        <div className="w-8 h-8 rounded-full bg-brand-surface-low flex-shrink-0 flex items-center justify-center overflow-hidden border border-brand-outline-variant shadow-xs">
          {activeSession.candidateAvatar ? (
            <img src={activeSession.candidateAvatar} alt={activeSession.candidateName} className="w-full h-full object-cover"  onError={(e) => {
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
      )}

      {onOpenMenu && (
        <div
          className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center mb-1 shrink-0 ${
            isRecruiter ? 'order-first' : 'order-last'
          }`}
        >
          <button
            type="button"
            title={language === 'uz' ? 'Amallar' : language === 'ru' ? 'Действия' : 'Actions'}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              onOpenMenu(
                msg,
                isRecruiter ? Math.max(10, rect.left - 165) : Math.min(window.innerWidth - 180, rect.right + 6),
                Math.min(rect.top, window.innerHeight - 120),
              );
            }}
            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          >
            <MoreVertical size={13} />
          </button>
        </div>
      )}

      <div
        className="flex flex-col gap-0.5 cursor-pointer select-none"
        onContextMenu={(e) => {
          if (onOpenMenu) {
            e.preventDefault();
            e.stopPropagation();
            onOpenMenu(
              msg,
              Math.min(e.clientX, window.innerWidth - 180),
              Math.min(e.clientY, window.innerHeight - 120),
            );
          }
        }}
        onDoubleClick={(e) => {
          if (onOpenMenu) {
            e.preventDefault();
            e.stopPropagation();
            onOpenMenu(
              msg,
              Math.min(e.clientX, window.innerWidth - 180),
              Math.min(e.clientY, window.innerHeight - 120),
            );
          }
        }}
        onTouchEnd={(e) => {
          if (!onOpenMenu) return;
          const now = Date.now();
          if (lastTapRef.current.id === msg.id && now - lastTapRef.current.time < 350) {
            const touch = e.changedTouches[0];
            if (touch) {
              e.preventDefault();
              onOpenMenu(
                msg,
                Math.min(touch.clientX, window.innerWidth - 180),
                Math.min(touch.clientY, window.innerHeight - 120),
              );
            }
            lastTapRef.current = { id: '', time: 0 };
          } else {
            lastTapRef.current = { id: msg.id, time: now };
          }
        }}
      >
        <div className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed ${isRecruiter ? 'bg-brand-primary text-white rounded-br-none shadow-[inset_0_4px_8px_rgba(0,0,0,0.25),_inset_0_1px_3px_rgba(0,0,0,0.12),_0_4px_12px_rgba(26,35,126,0.25)]' : 'bg-white text-brand-text rounded-bl-none border border-brand-outline-variant/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),_0_2px_6px_rgba(0,0,0,0.04)]'}`}>
          {(() => {
            const imgRegex = /\[Img:(.*?)\]/g;
            const images: string[] = [];
            let match;
            while ((match = imgRegex.exec(msg.text)) !== null) {
              if (match[1]) images.push(match[1]);
            }

            if (images.length > 0) {
              const cleanCaption = msg.text.replace(/\[Img:.*?\]/g, '').trim();
              return (
                <div className="flex flex-col gap-1.5">
                  {images.length === 1 ? (
                    <div 
                      className="rounded-xl overflow-hidden shadow-sm border border-black/5 bg-slate-100 w-48 h-48 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setModalImage(images[0])}
                    >
                      <img 
                        src={images[0]} 
                        alt={t.imageLabel} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
                          if (target.src !== fallback) {
                            target.src = fallback;
                          }
                        }} 
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 max-w-[280px]">
                      {images.map((imgUrl, i) => (
                        <div 
                          key={i} 
                          className={`rounded-xl overflow-hidden shadow-sm border border-black/5 bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity ${
                            images.length === 3 && i === 0 ? 'col-span-2 h-36' : 'h-28'
                          }`}
                          onClick={() => setModalImage(imgUrl)}
                        >
                          <img 
                            src={imgUrl} 
                            alt={t.imageLabel} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
                              if (target.src !== fallback) {
                                target.src = fallback;
                              }
                            }} 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {cleanCaption && (
                    <p className="whitespace-pre-wrap leading-relaxed mt-1">{cleanCaption}</p>
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
                    <span className="text-[10px] font-semibold opacity-70">{t.fileLabel}</span>
                  </div>
                  {faylMatch[2] && (
                    <p className="whitespace-pre-wrap leading-relaxed">{faylMatch[2]}</p>
                  )}
                </div>
              );
            }
            return <p>{msg.text}</p>;
          })()}
          
          {msg.hasMap && (
            <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 bg-white shadow-xs group max-w-sm">
              <div className="w-full h-28 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                <svg viewBox="0 0 320 112" className="w-full h-full object-cover select-none">
                  <rect width="320" height="112" fill="#fafafa" />
                  <path d="M -10 -10 C 40 10, 60 40, 30 75 Z" fill="#f0fdf4" />
                  <path d="M 240 -10 C 270 20, 290 10, 310 5 Z" fill="#f0fdf4" />
                  <path d="M -10 90 C 70 85, 110 65, 140 45 C 170 25, 230 15, 330 5" fill="none" stroke="#e0f2fe" strokeWidth="12" />
                  <g stroke="#ffffff" strokeWidth="8">
                    <path d="M -10 40 L 330 40" />
                    <path d="M 120 -10 L 120 120" />
                  </g>
                  <path d="M 120 90 L 120 40 L 160 40" fill="none" stroke="#3b82f6" strokeWidth="3" />
                </svg>

                <div className="absolute top-[36%] left-[50%] -translate-x-[50%] -translate-y-[50%]">
                  <div className="relative">
                    <span className="absolute -inset-2 rounded-full bg-red-500/10 animate-ping"></span>
                    <div className="bg-red-500 text-white p-1 rounded-full shadow-md">
                      <MapPin size={14} />
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-[9px] font-medium py-1 px-2.5 rounded-lg flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{msg.mapLocation || workplaceText}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`flex items-center gap-1 mt-0.5 ${isRecruiter ? 'justify-end mr-1' : 'ml-1'}`}>
          <span className="text-[9px] text-brand-outline font-bold">{msg.time}</span>
          {isRecruiter && <span className="text-[10px] text-brand-primary shrink-0">✓✓</span>}
        </div>
      </div>
      <ImageModal isOpen={!!modalImage} imageUrl={modalImage || ''} onClose={() => setModalImage(null)} />
    </div>
  );
};
