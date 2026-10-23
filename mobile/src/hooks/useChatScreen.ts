import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useChatsData } from "../context/useChatsData";
import { getTranslatedChat } from '../chatTranslations';
import { translations } from '../translations';
import { useCurrentScreen } from '../hooks/useCurrentScreen';

export interface AttachedFileData {
  name: string;
  previewUrl: string; // blob: URL from createObjectURL
}

export function useChatScreen() {
  const { id: selectedChatId } = useParams<{ id: string }>();
  const { setCurrentScreen } = useCurrentScreen();
  const { language } = useApp();
  const { chats, sendMessage, setActiveChatId } = useChatsData(language);
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileData[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  const rawActiveChat = chats.find((c: any) => c.id === selectedChatId);
  const activeChat = rawActiveChat ? getTranslatedChat(rawActiveChat, language) : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedChatId) {
      setActiveChatId(selectedChatId);
    }
  }, [selectedChatId, setActiveChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || (!inputText.trim() && attachedFiles.length === 0)) return;

    let textToSend = inputText;
    if (attachedFiles.length > 0) {
      attachedFiles.forEach(file => {
        textToSend = `[Img:${file.previewUrl}]` + (textToSend ? ` ${textToSend}` : '');
      });
    }

    sendMessage(activeChat.id, textToSend);
    setInputText('');
    setAttachedFiles([]);
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
    attachedFiles,
    setAttachedFiles,
    isTyping,
    setIsTyping,
    messagesEndRef,
    activeChat,
    handleSend
  };
}
