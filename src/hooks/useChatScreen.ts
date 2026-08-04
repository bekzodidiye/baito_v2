import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getTranslatedChat } from '../chatTranslations';
import { translations } from '../translations';

export function useChatScreen() {
  const { id: selectedChatId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { chats, sendMessage, setCurrentScreen, language } = useApp();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  const rawActiveChat = chats.find(c => c.id === selectedChatId);
  const activeChat = rawActiveChat ? getTranslatedChat(rawActiveChat, language) : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || !inputText.trim()) return;

    sendMessage(activeChat.id, inputText);
    setInputText('');
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2400);
  };

  return {
    language,
    t,
    chats,
    selectedChatId,
    sendMessage,
    setCurrentScreen,
    inputText,
    setInputText,
    isTyping,
    setIsTyping,
    messagesEndRef,
    activeChat,
    handleSend
  };
}
