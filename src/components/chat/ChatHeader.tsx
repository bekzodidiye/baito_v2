import React, { useState } from 'react';
import { ArrowLeft, Phone, MoreVertical, Trash2, ShieldAlert } from 'lucide-react';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';

interface ChatHeaderProps {
  activeChat: {
    companyName: string;
    recruiterName?: string;
    recruiterAvatar?: string;
    online?: boolean;
  };
  t: {
    back: string;
    online: string;
    offline: string;
  };
  setCurrentScreen: (screen: any) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ activeChat, t, setCurrentScreen }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleCall = () => {
    window.location.href = 'tel:+998901234567';
  };

  return (
    <header className="sticky top-0 w-full z-30 bg-white shadow-2xs border-b border-slate-100">
      <div className="w-full max-w-5xl mx-auto flex justify-between items-center px-4 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentScreen('xabarlar')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors cursor-pointer text-brand-text-variant"
            aria-label={t.back}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-brand-surface-low flex items-center justify-center overflow-hidden border border-brand-outline-variant">
                {activeChat.recruiterAvatar ? (
                  <img src={activeChat.recruiterAvatar} alt={activeChat.recruiterName || activeChat.companyName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-primary text-white font-bold text-xs">
                    {(activeChat.companyName || 'C').charAt(0)}
                  </div>
                )}
              </div>
              {activeChat.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-secondary rounded-full border-2 border-white animate-pulse" />
              )}
            </div>

            <div className="flex flex-col">
              <h1 className="font-display font-bold text-sm text-brand-primary leading-tight">
                {activeChat.companyName}
              </h1>
              <span className="text-[10px] font-bold text-brand-secondary">
                {activeChat.online ? t.online : t.offline}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 relative">
          <button onClick={handleCall} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low text-brand-text-variant cursor-pointer transition-colors" title="Qo'ng'iroq qilish">
            <Phone size={18} />
          </button>
          <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low text-brand-text-variant cursor-pointer transition-colors" title="Qo'shimcha">
            <MoreVertical size={18} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-xl shadow-lg p-2 w-44 z-50 text-xs font-bold space-y-1">
              <button onClick={() => { setShowMenu(false); window.dispatchEvent(new CustomEvent("global-toast", { detail: "Chat tarixi tozalandi" })); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center gap-2 text-slate-700 cursor-pointer">
                <Trash2 size={14} /> Chatni tozalash
              </button>
              <button onClick={() => { setShowMenu(false); window.dispatchEvent(new CustomEvent("global-toast", { detail: "Shikoyat yuborildi" })); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center gap-2 text-red-600 cursor-pointer">
                <ShieldAlert size={14} /> Shikoyat qilish
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
