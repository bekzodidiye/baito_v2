import React from 'react';
import { Search, SquarePen, X } from 'lucide-react';
import { ChatListItem } from './ChatListItem';
import { Chat } from '../../types';

interface ChatListPanelProps {
  filteredChats: Chat[];
  selectedChatId: string | null;
  onChatClick: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onComposeClick: () => void;
  t: any;
}

export const ChatListPanel: React.FC<ChatListPanelProps> = ({
  filteredChats,
  selectedChatId,
  onChatClick,
  searchQuery,
  setSearchQuery,
  onComposeClick,
  t
}) => {
  return (
    <div className="w-full h-full flex flex-col bg-white border-r border-slate-200/80 select-none">
      {/* Search Header Bar (Telegram Style) */}
      <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
        <div className="relative flex-1 flex items-center bg-slate-100/90 rounded-full px-3.5 h-9 group focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all">
          <Search size={16} className="text-slate-400 group-focus-within:text-brand-primary shrink-0" />
          <input
            type="text"
            className="w-full h-full ml-2 bg-transparent text-xs font-sans text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 placeholder:text-slate-400 font-medium"
            placeholder={t.searchChatPlaceholder || "Ish beruvchi yoki xabarni izlash..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full border-none bg-transparent cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={onComposeClick}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-brand-primary/10 text-slate-600 hover:text-brand-primary flex items-center justify-center transition-colors cursor-pointer shrink-0 border-none"
          title={t.writeNewMessage || "Yangi xabar"}
        >
          <SquarePen size={17} />
        </button>
      </div>

      {/* Chat Contacts Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 no-scrollbar">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isSelected={selectedChatId === chat.id}
              onClick={() => onChatClick(chat.id)}
              t={t}
            />
          ))
        ) : (
          <div className="p-8 text-center text-slate-400 font-medium text-xs">
            {t.noConversations || "Xabarlar mavjud emas"}
          </div>
        )}
      </div>

      {/* Bottom Footer Note */}
      <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center">
        <p className="text-[11px] text-slate-400 font-medium">
          Sizda yana 12 ta eski yozishmalar mavjud
        </p>
      </div>
    </div>
  );
};
