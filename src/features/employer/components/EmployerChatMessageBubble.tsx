import React from 'react';
import { MapPin } from 'lucide-react';
import { ChatSession } from '../../../hooks/useEmployerChat';

interface EmployerChatMessageBubbleProps {
  msg: any;
  isRecruiter: boolean;
  activeSession: ChatSession;
  workplaceText: string;
}

export const EmployerChatMessageBubble: React.FC<EmployerChatMessageBubbleProps> = ({
  msg,
  isRecruiter,
  activeSession,
  workplaceText
}) => {
  return (
    <div className={`flex items-end gap-2 max-w-[85%] ${isRecruiter ? 'self-end flex-row-reverse' : 'self-start'}`}>
      {!isRecruiter && (
        <div className="w-8 h-8 rounded-full bg-brand-surface-low flex-shrink-0 flex items-center justify-center overflow-hidden border border-brand-outline-variant shadow-xs">
          {activeSession.candidateAvatar ? (
            <img src={activeSession.candidateAvatar} alt={activeSession.candidateName} className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-xs text-brand-primary">{(activeSession.candidateName || 'C').charAt(0)}</span>
          )}
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        <div className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed ${isRecruiter ? 'bg-brand-primary text-white rounded-br-none shadow-[inset_0_4px_8px_rgba(0,0,0,0.25),_inset_0_1px_3px_rgba(0,0,0,0.12),_0_4px_12px_rgba(26,35,126,0.25)]' : 'bg-white text-brand-text rounded-bl-none border border-brand-outline-variant/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03),_0_2px_6px_rgba(0,0,0,0.04)]'}`}>
          <p>{msg.text}</p>
          
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
    </div>
  );
};
