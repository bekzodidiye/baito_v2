import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useChatsData } from "../context/useChatsData";
import { getTranslatedChat } from '../chatTranslations';
import { translations } from '../translations';
import { useCurrentScreen } from '../hooks/useCurrentScreen';
import { uploadFileApi } from '../api/queries';
import { showToast } from '../utils/toast';

export interface AttachedFileData {
  name: string;
  /** For the sender's own preview only — a blob: URL exists in one browser. */
  previewUrl: string;
  /** The bytes, so they can be uploaded and given a URL the other side can open. */
  file: File;
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

    const chatId = activeChat.id;
    const pending = attachedFile;
    const typed = inputText;
    setInputText('');
    setAttachedFile(null);

    void (async () => {
      let textToSend = typed;
      if (pending) {
        // The message used to carry `blob:` — a URL that only resolves in the
        // sender's own browser, so the other side saw a broken image. Upload
        // it and reference the stored copy instead.
        try {
          const url = await uploadFileApi(pending.file, 'job');
          textToSend = `[Img:${url}]` + (textToSend ? ` ${textToSend}` : '');
        } catch {
          showToast(
            language === 'uz'
              ? "Faylni yuklab bo'lmadi. Xabar fayl-siz yuborildi."
              : language === 'ru'
                ? 'Не удалось загрузить файл. Сообщение отправлено без него.'
                : 'The file could not be uploaded. The message was sent without it.',
          );
          if (!textToSend.trim()) return;
        }
      }
      sendMessage(chatId, textToSend);
    })();
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
