import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const { language } = useApp();
  const { chats, sendMessage, setActiveChatId } = useChatsData(language);
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<AttachedFileData | null>(null);
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

  const handleSend = (e?: React.FormEvent) => {
    // The form calls this with an event; the send button calls it with none,
    // and `e.preventDefault()` on the button path threw a TypeError.
    e?.preventDefault();
    if (!activeChat || (!inputText.trim() && !attachedFile)) return;

    let textToSend = inputText;
    if (attachedFile) {
      // Embed the blob URL so the bubble can render the actual image
      textToSend = `[Img:${attachedFile.previewUrl}]` + (textToSend ? ` ${textToSend}` : '');
    }

    sendMessage(activeChat.id, textToSend);
    setInputText('');
    setAttachedFile(null);
    // There used to be a `setIsTyping(true)` here with a 2.4s timer, which
    // showed "typing…" for the other person every time *you* sent something.
    // Nobody was typing. Real presence needs the WebSocket at /chats/ws/{id}.
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
    attachedFile,
    setAttachedFile,
    isTyping,
    setIsTyping,
    messagesEndRef,
    activeChat,
    handleSend
  };
}
