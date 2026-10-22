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
  const fallbackText = t?.noConversations ?? '';

  const getSubtitle = () => {
    if (!lastMsg?.text) return fallbackText;
    const hasImages = /\[Img:.*?\]/.test(lastMsg.text);
    const cleanText = lastMsg.text.replace(/\[Img:.*?\]/g, '').replace(/\[Fayl:.*?\]/g, '').trim();
    if (hasImages) {
      return cleanText ? `📷 ${cleanText}` : '📷 Rasm';
    }
    const faylMatch = lastMsg.text.match(/^\[Fayl:\s*(.*?)\]\s*(.*)$/);
    if (faylMatch) {
      return faylMatch[2] ? `📎 ${faylMatch[2]}` : '📎 Fayl';
    }
    return lastMsg.text;
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-center px-3.5 py-3 mx-2.5 my-1 rounded-2xl cursor-pointer transition-all group relative ${
        isSelected
          ? 'bg-brand-primary text-white shadow-xs'
          : 'hover:bg-slate-50/80 bg-white text-slate-900'
      }`}
    >
      {/* Avatar with Online Indicator */}
      <div className="relative flex-shrink-0">
        <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center ${
          isSelected ? 'bg-white shadow-xs' : 'bg-slate-100 border border-slate-200/80'
        }`}>
          {chat.recruiterAvatar ? (
            <img src={chat.recruiterAvatar} alt={chat.companyName} className="w-full h-full object-cover"  onError={(e) => {
        const target = e.currentTarget;
        const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
        if (target.src !== fallback) {
          target.src = fallback;
        }
      }} />
          ) : (
            <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${
              isSelected ? 'bg-white text-brand-primary' : 'bg-brand-primary text-white'
            }`}>
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
            isSelected ? 'text-white' : 'text-slate-900 group-hover:text-brand-primary'
          }`}>
            {chat.companyName}
          </h3>
          <span className={`text-[10px] sm:text-xs shrink-0 font-medium ${
            chat.unreadCount > 0 ? (isSelected ? 'text-white font-bold' : 'text-brand-primary font-bold') : (isSelected ? 'text-slate-300' : 'text-slate-400')
          }`}>
            {chat.lastMessageTime || ''}
          </span>
        </div>

        <div className="flex justify-between items-center mt-0.5 gap-1">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {isUserLastMsg && (
              <CheckCheck size={14} className={isSelected ? 'text-sky-300 shrink-0' : 'text-sky-500 shrink-0'} />
            )}
            <p className={`text-xs truncate ${
              chat.unreadCount > 0 ? (isSelected ? 'text-white font-bold' : 'text-slate-900 font-bold') : (isSelected ? 'text-slate-200 font-normal' : 'text-slate-500 font-normal')
            }`}>
              {getSubtitle()}
            </p>
          </div>

          {chat.unreadCount > 0 && (
            <span className={`shrink-0 text-[10px] font-black min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center shadow-2xs ${
              isSelected ? 'bg-white text-brand-primary' : 'bg-brand-primary text-white'
            }`}>
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
