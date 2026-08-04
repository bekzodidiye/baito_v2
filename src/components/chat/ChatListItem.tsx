import React from 'react';
import { CheckCheck } from 'lucide-react';
import { Chat } from '../../types';

interface ChatListItemProps {
  chat: Chat;
  isSelected: boolean;
  onClick: () => void;
  t?: any;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  chat,
  isSelected,
  onClick,
  t
}) => {
  const messages = Array.isArray(chat.messages) ? chat.messages : [];
  const lastMsg = messages[messages.length - 1];
  const companyInitial = (chat.companyName || 'C').charAt(0);
  const isUserLastMsg = lastMsg?.sender === 'user';
  const fallbackText = (t && t.noConversation) || 'Suhbat mavjud emas';

  return (
    <div
      onClick={onClick}
      className={`flex items-center px-3.5 py-3 cursor-pointer transition-all border-b border-slate-100 group relative ${
        isSelected
          ? 'bg-blue-50/90 border-l-[3px] border-l-brand-primary'
          : 'hover:bg-slate-50/80 bg-white border-l-[3px] border-l-transparent'
      }`}
    >
      {/* Avatar with Online Indicator */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 border border-slate-200/80 flex items-center justify-center">
          {chat.recruiterAvatar ? (
            <img src={chat.recruiterAvatar} alt={chat.companyName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-brand-primary text-white font-bold text-sm">
              {companyInitial}
            </div>
          )}
        </div>
        {chat.online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
        )}
      </div>

      {/* Main Metadata */}
      <div className="ml-3 flex-grow min-w-0">
        <div className="flex justify-between items-baseline gap-1">
          <h3 className={`font-sans font-bold text-xs sm:text-sm truncate ${
            isSelected ? 'text-brand-primary' : 'text-slate-900 group-hover:text-brand-primary'
          }`}>
            {chat.companyName}
          </h3>
          <span className={`text-[10px] sm:text-xs shrink-0 font-medium ${
            chat.unreadCount > 0 ? 'text-brand-primary font-bold' : 'text-slate-400'
          }`}>
            {chat.lastMessageTime || ''}
          </span>
        </div>

        <div className="flex justify-between items-center mt-0.5 gap-1">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {isUserLastMsg && (
              <CheckCheck size={14} className="text-sky-500 shrink-0" />
            )}
            <p className={`text-xs truncate ${
              chat.unreadCount > 0 ? 'text-slate-900 font-bold' : 'text-slate-500 font-normal'
            }`}>
              {lastMsg?.text || fallbackText}
            </p>
          </div>

          {chat.unreadCount > 0 && (
            <span className="shrink-0 bg-brand-primary text-white text-[10px] font-black min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center shadow-2xs">
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
