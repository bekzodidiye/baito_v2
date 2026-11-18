import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useChatsData } from '../../context/useChatsData';
import { getTranslatedChat } from '../../chatTranslations';
import { translations } from '../../translations';
import { ChatListPanel } from '../../components/chat/ChatListPanel';
import { ChatDetailPanel } from '../../components/chat/ChatDetailPanel';
import type { AttachedFileData } from '../../hooks/useChatScreen';
import { uploadFileApi } from '../../api/queries';
import { showToast } from '../../utils/toast';

interface EmployerChatsProps {
  initialTargetCandidate?: string | null;
  onClearTargetCandidate?: () => void;
}

export const EmployerChats: React.FC<EmployerChatsProps> = ({ 
  initialTargetCandidate,
  onClearTargetCandidate
}) => {
  const { language, setEmployerSelectedChatId } = useApp();
  const t = translations[language];

  const { chats, sendMessage, deleteMessage, markChatRead, setActiveChatId } = useChatsData(language);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileData[]>([]);
  const [isTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selected chat state with global AppContext so EmployerPanel/Header/BottomNav knows if chat is active on mobile
  useEffect(() => {
    setEmployerSelectedChatId(selectedChatId);
    return () => {
      setEmployerSelectedChatId(null);
    };
  }, [selectedChatId, setEmployerSelectedChatId]);

  // Transform and filter chats
  const safeChats = useMemo(() => (Array.isArray(chats) ? chats.filter(Boolean) : []), [chats]);
  const translatedChats = useMemo(
    () => safeChats.map((chat) => getTranslatedChat(chat, language)),
    [safeChats, language]
  );

  const filteredChats = useMemo(() => {
    return translatedChats.filter((chat) => {
      if (!chat) return false;
      const company = (chat.companyName || '').toLowerCase();
      const recruiter = (chat.recruiterName || '').toLowerCase();
      const query = (searchQuery || '').toLowerCase();
      const messages = Array.isArray(chat.messages) ? chat.messages : [];

      return (
        company.includes(query) ||
        recruiter.includes(query) ||
        messages.some((m) => m && (m.text || '').toLowerCase().includes(query))
      );
    });
  }, [translatedChats, searchQuery]);

  // Target candidate auto-selection from applicant card
  useEffect(() => {
    if (initialTargetCandidate && filteredChats.length > 0) {
      const target = initialTargetCandidate.toLowerCase();
      const match = filteredChats.find(
        (c) =>
          (c.companyName && c.companyName.toLowerCase().includes(target)) ||
          (c.recruiterName && c.recruiterName.toLowerCase().includes(target))
      );
      if (match) {
        setSelectedChatId(match.id);
        markChatRead(match.id);
      } else {
        setSearchQuery(initialTargetCandidate);
      }
      onClearTargetCandidate?.();
    }
  }, [initialTargetCandidate, filteredChats, onClearTargetCandidate, markChatRead]);

  // Desktop default selection or explicit active chat
  const effectiveActiveChat = useMemo(() => {
    if (selectedChatId) {
      return filteredChats.find((c) => c.id === selectedChatId) || null;
    }
    return filteredChats.length > 0 ? filteredChats[0] : null;
  }, [selectedChatId, filteredChats]);

  // Keep active chat messages fetched
  useEffect(() => {
    if (effectiveActiveChat?.id) {
      setActiveChatId(effectiveActiveChat.id);
    }
  }, [effectiveActiveChat?.id, setActiveChatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [effectiveActiveChat?.messages, isTyping]);

  const handleChatClick = (id: string) => {
    setSelectedChatId(id);
    if (id) {
      markChatRead(id);
      setActiveChatId(id);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!effectiveActiveChat || (!inputText.trim() && attachedFiles.length === 0)) return;

    const chatId = effectiveActiveChat.id;
    const pendingFiles = [...attachedFiles];
    const typed = inputText;
    setInputText('');
    setAttachedFiles([]);

    void (async () => {
      let textToSend = typed;
      if (pendingFiles.length > 0) {
        for (const pending of pendingFiles) {
          if (!pending.file) continue;
          try {
            const url = await uploadFileApi(pending.file, 'chat');
            textToSend = `[Img:${url}]` + (textToSend ? ` ${textToSend}` : '');
          } catch {
            showToast(
              language === 'uz'
                ? "Faylni yuklab bo'lmadi. Xabar fayl-siz yuborildi."
                : language === 'ru'
                  ? 'Не удалось загрузить файл. Сообщение отправлено без него.'
                  : 'The file could not be uploaded. The message was sent without it.',
            );
          }
        }
        if (!textToSend.trim()) return;
      }
      sendMessage(chatId, textToSend);
    })();
  };

  return (
    <div className="w-full font-sans flex flex-col h-full bg-white relative overflow-hidden select-none">
      {/* Telegram Main 2-Column Canvas Container */}
      <div className="bg-white overflow-hidden flex flex-col md:flex-row h-full w-full relative">
        {/* Left Contact List Panel */}
        <div
          className={`w-full md:w-[420px] shrink-0 h-full ${
            selectedChatId ? 'hidden md:flex' : 'flex'
          } flex-col`}
        >
          <ChatListPanel
            filteredChats={filteredChats}
            selectedChatId={effectiveActiveChat?.id || null}
            onChatClick={handleChatClick}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            t={t}
          />
        </div>

        {/* Right Active Conversation Panel */}
        <div
          className={`flex-1 h-full ${
            !selectedChatId ? 'hidden md:flex' : 'flex'
          } flex-col bg-white`}
        >
          <ChatDetailPanel
            activeChat={effectiveActiveChat}
            t={t}
            inputText={inputText}
            setInputText={setInputText}
            attachedFiles={attachedFiles}
            setAttachedFiles={setAttachedFiles}
            isTyping={isTyping}
            messagesEndRef={messagesEndRef}
            handleSend={handleSend}
            onBackMobile={() => setSelectedChatId(null)}
            setCurrentScreen={() => setSelectedChatId(null)}
            onDeleteMessage={(messageId) => {
              if (effectiveActiveChat) {
                deleteMessage(effectiveActiveChat.id, messageId);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
