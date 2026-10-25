import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrentScreen } from '../../hooks/useCurrentScreen';
import { useChatsData, SUPPORT_CHAT_ID } from '../../context/useChatsData';
import { ChatDetailPanel } from '../chat/ChatDetailPanel';
import { translations } from '../../translations';
import type { AttachedFileData } from '../../hooks/useChatScreen';
import { uploadFileApi } from '../../api/queries';
import { showToast } from '../../utils/toast';

export const SupportChatScreen: React.FC = () => {
  const language = useAuthStore((s) => s.language);
  const t = translations[language];
  const { setCurrentScreen } = useCurrentScreen();

  const { chats, sendMessage, deleteMessage, setActiveChatId } = useChatsData(language);

  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileData[]>([]);
  const [isTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveChatId(SUPPORT_CHAT_ID);
  }, [setActiveChatId]);

  const activeChat = useMemo(() => {
    return chats.find((c) => c.id === SUPPORT_CHAT_ID) || null;
  }, [chats]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeChat || (!inputText.trim() && attachedFiles.length === 0)) return;

    const pendingFiles = [...attachedFiles];
    const typed = inputText;
    setInputText('');
    setAttachedFiles([]);

    void (async () => {
      let textToSend = typed;
      if (pendingFiles.length > 0) {
        for (const pending of pendingFiles) {
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
      sendMessage(SUPPORT_CHAT_ID, textToSend);
    })();
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 w-full bg-white relative overflow-hidden select-none">
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
        onDeleteMessage={(messageId) => {
          if (messageId !== 'greeting') {
            deleteMessage(SUPPORT_CHAT_ID, messageId);
          }
        }}
      />
    </div>
  );
};
