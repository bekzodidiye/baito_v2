import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatsData } from "../context/useChatsData";
import { translations } from '../translations';
import { getTranslatedChat } from '../chatTranslations';
import { Chat } from '../types';
import { useUIStore } from "../store/useUIStore";
import { useAuthStore } from "../store/useAuthStore";

export function useMessagesScreen() {
  const navigate = useNavigate();
  const messagesSearchOpen = useUIStore(s => s.messagesSearchOpen);
    const setMessagesSearchOpen = useUIStore(s => s.setMessagesSearchOpen);
    const language = useAuthStore(s => s.language);
  const { chats, markChatRead } = useChatsData(language);

  const [searchQuery, setSearchQuery] = useState('');
  const t = translations[language];

  const safeChats = Array.isArray(chats) ? chats.filter(Boolean) : [];
  const translatedChats = safeChats.map(chat => getTranslatedChat(chat, language));

  const filteredChats = translatedChats.filter(chat => {
    if (!chat) return false;
    const company = (chat.companyName || '').toLowerCase();
    const recruiter = (chat.recruiterName || '').toLowerCase();
    const query = (searchQuery || '').toLowerCase();
    const messages = Array.isArray(chat.messages) ? chat.messages : [];

    return (
      company.includes(query) ||
      recruiter.includes(query) ||
      messages.some(m => m && (m.text || '').toLowerCase().includes(query))
    );
  });

  const handleChatClick = (chatId: string) => {
    if (chatId) {
      markChatRead(chatId);
      navigate(`/chats/${chatId}`);
    } else {
      navigate('/messages');
    }
  };

  return {
    language,
    t,
    chats,
    messagesSearchOpen,
    setMessagesSearchOpen,
    searchQuery,
    setSearchQuery,
    filteredChats,
    handleChatClick
  };
}
