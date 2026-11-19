import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatsData } from "../context/useChatsData";
import { getTranslatedChat } from '../chatTranslations';
import { translations } from '../translations';
import { useCurrentScreen } from '../hooks/useCurrentScreen';
import { uploadFileApi } from '../api/queries';
import { showToast } from '../utils/toast';
import { useAuthStore } from "../store/useAuthStore";

export interface AttachedFileData {
  name: string;
  /** For the sender's own preview only — a blob: URL exists in one browser. */
  previewUrl: string;
  /** The bytes, so they can be uploaded and given a URL the other side can open. */
  file: File;
}

/**
 * @param displayedChatId The conversation the screen is showing when the route
 *   carries no id. The messages screen opens the first conversation on its own
 *   — but the active chat here came only from the route, so on /messages it was
 *   null, and `handleSend` returned on its first line. The panel showed a
 *   conversation and the send button did nothing.
 */
export function useChatScreen(displayedChatId?: string | null) {
  const { id: routeChatId } = useParams<{ id: string }>();
  // The route still decides the layout — one panel or two on mobile.
  const selectedChatId = routeChatId;
  const activeChatId = routeChatId || displayedChatId || undefined;
  const navigate = useNavigate();
  const { currentScreen, setCurrentScreen } = useCurrentScreen();
  const language = useAuthStore(s => s.language);
  const { chats, sendMessage, deleteMessage, setActiveChatId } = useChatsData(language);
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileData[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  const rawActiveChat = chats.find((c: any) => c.id === activeChatId);
  const activeChat = rawActiveChat ? getTranslatedChat(rawActiveChat, language) : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeChatId) {
      setActiveChatId(activeChatId);
    }
  }, [activeChatId, setActiveChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, isTyping]);

  useEffect(() => {
    return () => {
      attachedFiles.forEach(file => {
        if (file.previewUrl) {
          try {
            URL.revokeObjectURL(file.previewUrl);
          } catch {}
        }
      });
    };
  }, []);

  const handleSend = (e?: React.FormEvent) => {
    // The form calls this with an event; the send button calls it with none,
    // and `e.preventDefault()` on the button path threw a TypeError.
    e?.preventDefault();
    if (!activeChat || (!inputText.trim() && attachedFiles.length === 0)) return;

    const chatId = activeChat.id;
    const pendingFiles = [...attachedFiles];
    const typed = inputText;
    setInputText('');
    setAttachedFiles([]);

    void (async () => {
      let textToSend = typed;
      if (pendingFiles.length > 0) {
        for (const pending of pendingFiles) {
          if (pending.previewUrl) {
            try {
              URL.revokeObjectURL(pending.previewUrl);
            } catch {}
          }
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
    attachedFiles,
    setAttachedFiles,
    isTyping,
    setIsTyping,
    messagesEndRef,
    activeChat,
    handleSend,
    deleteMessage
  };
}

