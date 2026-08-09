import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useChatsData } from "../context/useChatsData";
import { translations } from '../translations';
import { getTranslatedChat } from '../chatTranslations';

export function useMessagesScreen() {
  const navigate = useNavigate();
  const { messagesSearchOpen, setMessagesSearchOpen, language } = useApp();
  const { chats, setChats } = useChatsData(language);

  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeCompany, setComposeCompany] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
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
      setChats(prev =>
        prev.map(c => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
      );
      navigate(`/chats/${chatId}`);
    } else {
      navigate('/messages');
    }
  };

  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeCompany || !composeMessage) return;

    const timeNow = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    const newChatId = 'c_' + Date.now();
    const newChat = {
      id: newChatId,
      companyName: composeCompany,
      recruiterName: language === 'ru' ? 'Ответственный сотрудник' : language === 'en' ? 'Responsible manager' : 'Mas\'ul xodim',
      logoUrl: undefined,
      recruiterAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      online: true,
      unreadCount: 0,
      lastMessageTime: timeNow,
      messages: [
        {
          id: 'm1',
          sender: 'user' as const,
          text: composeMessage,
          time: timeNow
        }
      ]
    };

    setChats(prev => [newChat, ...prev]);
    setComposeOpen(false);
    setComposeCompany('');
    setComposeMessage('');
    navigate(`/chats/${newChatId}`);
  };

  return {
    language,
    t,
    chats,
    messagesSearchOpen,
    setMessagesSearchOpen,
    searchQuery,
    setSearchQuery,
    composeOpen,
    setComposeOpen,
    composeCompany,
    setComposeCompany,
    composeMessage,
    setComposeMessage,
    filteredChats,
    handleChatClick,
    handleComposeSubmit
  };
}
