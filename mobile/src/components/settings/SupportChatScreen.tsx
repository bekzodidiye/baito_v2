import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useChatsData } from '../../context/useChatsData';
import { ChatDetailPanel } from '../chat/ChatDetailPanel';
import { translations } from '../../translations';
import type { AttachedFileData } from '../../hooks/useChatScreen';

export const SupportChatScreen: React.FC = () => {
  const language = useAuthStore((s) => s.language);
  const t = translations[language];
  const { setCurrentScreen } = useCurrentScreen();

  const { chats, sendMessage, setActiveChatId } = useChatsData(language);

  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileData[]>([]);
  const [isTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    setActiveChatId('support_session');
  }, [setActiveChatId]);

  const activeChat = useMemo(() => {
    return chats.find((c) => c.id === 'support_session') || chats[0] || null;
  }, [chats]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeChat || (!inputText.trim() && attachedFiles.length === 0)) return;

    const typed = inputText;
    setInputText('');
    setAttachedFiles([]);
    sendMessage('support_session', typed);
  };

  return (
    <div className="flex-1 flex flex-col h-dvh md:h-screen w-full bg-white relative overflow-hidden select-none">
      <ChatDetailPanel
        activeChat={activeChat}
        t={t}
        inputText={inputText}
        setInputText={setInputText}
        attachedFiles={attachedFiles}
        setAttachedFiles={setAttachedFiles}
        isTyping={isTyping}
        messagesEndRef={messagesEndRef}
        handleSend={handleSend}
        onBackMobile={() => setCurrentScreen('help')}
        setCurrentScreen={(screen) => {
          if (screen === 'messages') {
            setCurrentScreen('help');
          } else {
            setCurrentScreen(screen);
          }
        }}
      />
    </div>
  );
};
