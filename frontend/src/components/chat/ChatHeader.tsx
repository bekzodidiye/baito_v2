import React, {} from 'react';
import { ArrowLeft } from 'lucide-react';

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
  return (
    <header className="sticky top-0 w-full z-30 bg-white shadow-2xs border-b border-slate-100">
      <div className="w-full flex justify-between items-center px-4 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentScreen('messages')}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-surface-low transition-colors cursor-pointer text-brand-text-variant"
            aria-label={t.back}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center overflow-hidden border border-brand-outline-variant">
                {activeChat.recruiterAvatar ? (
                  <img src={activeChat.recruiterAvatar} alt={activeChat.recruiterName || activeChat.companyName} className="w-full h-full object-cover"  onError={(e) => {
        const target = e.currentTarget;
        const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
        if (target.src !== fallback) {
          target.src = fallback;
        }
      }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-brand-primary text-white font-bold text-sm">
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


      </div>
    </header>
  );
};
