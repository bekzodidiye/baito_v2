import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
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
  return (
    <header className="sticky top-0 w-full z-30 bg-white shadow-2xs border-b border-slate-100">
      <div className="w-full max-w-5xl mx-auto flex justify-between items-center px-4 h-16">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentScreen('messages')}
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


      </div>
    </header>
  );
};
