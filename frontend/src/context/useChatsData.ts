import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { Chat, Message } from '../types';
import { openChatSocket, SocketMessage } from '../api/chatSocket';
import {
  fetchChats,
  fetchChatMessages,
  sendChatMessageApi,
  deleteChatMessageApi,
  markChatReadApi,
  fetchSupportConversationApi,
  sendSupportMessageApi,
  deleteSupportMessageApi,
} from '../api/queries';
import { useAuthStore } from "../store/useAuthStore";

/**
 * Conversations, from the server.
 *
 * This hook used to return a single hard-coded "support" conversation, hold
 * messages in React state, and — two seconds after you sent one — invent a
 * reply saying an operator would be in touch. `setChats` and `addNewMessage`
 * were `() => {}`. Nothing was ever sent anywhere and everything vanished on
 * reload, while the backend's chat endpoints and the four API helpers in
 * api/queries.ts sat unused with no callers at all.
 *
 * Messages arrive by polling rather than over the WebSocket at
 * /chats/ws/{id}. Polling is the plainer of the two and enough for a
 * conversation people check rather than watch; the socket is the upgrade.
 */

/** What the API returns — deliberately separate from the UI's `Chat`. */
interface ApiChat {
  id: string;
  workerId: string;
  employerId: string;
  jobId?: string | null;
  isContactRevealed?: boolean;
  createdAt?: string | null;
  otherUserName?: string | null;
  otherUserAvatar?: string | null;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  unreadCount?: number;
}

interface ApiMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  hasMap?: boolean;
  mapLocation?: string | null;
  createdAt?: string | null;
}

const CHATS_KEY = ['chats'] as const;
const MESSAGES_KEY = 'chat-messages';
const SUPPORT_KEY = ['support-conversation'] as const;

/** Support is always in the list, above the rest, whether or not anything has
 *  been said yet. It is not a row in `chats` — it is a ticket — so it carries a
 *  fixed id the send path recognises. */
export const SUPPORT_CHAT_ID = 'support';

interface ApiSupportMessage {
  id: string;
  senderId: string;
  fromSupport: boolean;
  text: string;
  timestamp?: string | null;
}

interface ApiSupportConversation {
  ticketId: string | null;
  status: string | null;
  messages: ApiSupportMessage[];
}

const clockTime = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const toMessage = (m: ApiMessage, myId?: string, myUid?: string): Message => ({
  id: m.id,
  // The UI's two senders are "me" and "the other party"; the API gives ids.
  sender: (myId && m.senderId === myId) || (myUid && m.senderId === myUid) ? 'user' : 'recruiter',
  text: m.text,
  time: clockTime(m.createdAt),
  hasMap: m.hasMap ?? false,
  mapLocation: m.mapLocation ?? undefined,
});

const toChat = (c: ApiChat, messages: Message[], unknownName: string): Chat => {
  const name = c.otherUserName || unknownName;
  return {
    id: c.id,
    // The list shows a company and a person; a one-to-one chat has one name
    // for both until the API distinguishes them.
    companyName: name,
    recruiterName: name,
    logoUrl: c.otherUserAvatar || undefined,
    recruiterAvatar: c.otherUserAvatar || undefined,
    // Presence is not something the API reports.
    online: false,
    messages,
    unreadCount: c.unreadCount ?? 0,
    lastMessageTime: clockTime(c.lastMessageTime),
  };
};

export function useChatsData(language: 'uz' | 'ru' | 'en') {
  const userProfile = useAuthStore(s => s.userProfile);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const queryClient = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const unknownName =
    language === 'uz' ? 'Suhbatdosh' : language === 'ru' ? 'Собеседник' : 'Contact';

  const { data: apiChats = [] } = useQuery<ApiChat[]>({
    queryKey: CHATS_KEY,
    queryFn: fetchChats,
    enabled: isLoggedIn,
    refetchInterval: isLoggedIn ? 15000 : false,
    staleTime: 5000,
  });

  const { data: support } = useQuery<ApiSupportConversation>({
    queryKey: SUPPORT_KEY,
    queryFn: fetchSupportConversationApi,
    enabled: isLoggedIn,
    refetchInterval: activeChatId === SUPPORT_CHAT_ID ? 5000 : 30000,
  });

  const { data: apiMessages = [] } = useQuery<ApiMessage[]>({
    queryKey: [MESSAGES_KEY, activeChatId],
    queryFn: () => fetchChatMessages(activeChatId as string),
    // Support is a ticket, not a chat row; its messages come from its own query.
    enabled: Boolean(activeChatId) && activeChatId !== SUPPORT_CHAT_ID && isLoggedIn,
    // The socket delivers new messages; this is the net under it.
    refetchInterval: activeChatId ? 20000 : false,
  });

  const supportName =
    language === 'uz' ? 'Yordam markazi' : language === 'ru' ? 'Служба поддержки' : 'Support Center';

  const greetingText =
    language === 'uz'
      ? "Assalomu alaykum! Baito yordam xizmatiga xush kelibsiz. Sizga qanday yordam bera olaman?"
      : language === 'ru'
        ? "Здравствуйте! Добро пожаловать в службу поддержки Baito. Чем мы можем вам помочь?"
        : "Hello! Welcome to Baito Support. How can we help you?";

  const supportMessages: Message[] = [
    {
      id: 'greeting',
      sender: 'recruiter',
      text: greetingText,
      time: '',
    },
    ...(support?.messages ?? []).map((m) => ({
      id: m.id,
      sender: (m.fromSupport ? 'recruiter' : 'user') as 'user' | 'recruiter',
      text: m.text,
      time: clockTime(m.timestamp),
    })),
  ];

  const supportChat: Chat = {
    id: SUPPORT_CHAT_ID,
    companyName: supportName,
    recruiterName: supportName,
    online: true,
    messages: supportMessages,
    unreadCount: 0,
    lastMessageTime: supportMessages.length
      ? supportMessages[supportMessages.length - 1].time
      : '',
  };

  const conversations: Chat[] = (Array.isArray(apiChats) ? apiChats : []).map((c) =>
    toChat(
      c,
      c.id === activeChatId
        ? (Array.isArray(apiMessages) ? apiMessages : []).map((m) =>
            toMessage(m, userProfile?.id, userProfile?.uid),
          )
        : [],
      unknownName,
    ),
  );

  const chats: Chat[] = [supportChat, ...conversations];

  // Live updates for the conversation on screen. Polling stays as the
  // fallback: if the upgrade is refused the interval still carries it.
  useEffect(() => {
    if (!isLoggedIn || !activeChatId || activeChatId === SUPPORT_CHAT_ID) return;
    const chatId = activeChatId;

    const socket = openChatSocket(chatId, (msg: SocketMessage) => {
      if ((msg as any).type === 'delete' && (msg as any).messageId) {
        const deletedId = (msg as any).messageId;
        queryClient.setQueryData<ApiMessage[]>([MESSAGES_KEY, chatId], (prev) =>
          (prev ?? []).filter((m) => m.id !== deletedId),
        );
        queryClient.invalidateQueries({ queryKey: CHATS_KEY });
        return;
      }
      queryClient.setQueryData<ApiMessage[]>([MESSAGES_KEY, chatId], (prev) => {
        const list = prev ?? [];
        // The server echoes to everyone including the author, who already has
        // this from their own optimistic insert.
        if (list.some((m) => m.id === msg.id)) return list;
        return [...list.filter((m) => !m.id.startsWith('pending_')), msg];
      });
      queryClient.invalidateQueries({ queryKey: CHATS_KEY });
    });

    return () => socket.close();
  }, [isLoggedIn, activeChatId, queryClient]);

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      const body = text.trim();
      if (!body || !chatId) return;

      if (chatId === SUPPORT_CHAT_ID) {
        try {
          await sendSupportMessageApi(body);
        } finally {
          queryClient.invalidateQueries({ queryKey: SUPPORT_KEY });
        }
        return;
      }

      // Show it straight away, then reconcile with what the server stored.
      queryClient.setQueryData<ApiMessage[]>([MESSAGES_KEY, chatId], (prev) => [
        ...(prev ?? []),
        {
          id: `pending_${Date.now()}`,
          chatId,
          senderId: userProfile?.id ?? '',
          text: body,
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        await sendChatMessageApi(chatId, { text: body });
      } finally {
        // On success this replaces the optimistic copy with the stored one; on
        // failure it removes it, so nothing is left looking sent that was not.
        queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, chatId] });
        queryClient.invalidateQueries({ queryKey: CHATS_KEY });
      }
    },
    [queryClient, userProfile?.id],
  );

  const deleteMessage = useCallback(
    async (chatId: string, messageId: string) => {
      if (!chatId || !messageId) return;

      if (chatId === SUPPORT_CHAT_ID) {
        if (messageId === 'greeting') return;
        queryClient.setQueryData<ApiSupportConversation>(SUPPORT_KEY, (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.filter((m) => m.id !== messageId),
          };
        });
        try {
          await deleteSupportMessageApi(messageId);
        } finally {
          queryClient.invalidateQueries({ queryKey: SUPPORT_KEY });
        }
        return;
      }

      // Optimistic message removal
      queryClient.setQueryData<ApiMessage[]>([MESSAGES_KEY, chatId], (prev) =>
        (prev ?? []).filter((m) => m.id !== messageId),
      );

      try {
        await deleteChatMessageApi(chatId, messageId);
      } finally {
        queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, chatId] });
        queryClient.invalidateQueries({ queryKey: CHATS_KEY });
      }
    },
    [queryClient],
  );

  /** Clear a conversation's badge, on the server and here. */
  const markChatRead = useCallback(
    async (chatId: string) => {
      // Nothing to mark: the support ticket has no unread state of its own.
      if (chatId === SUPPORT_CHAT_ID) return;
      // Locally first so the badge goes as the conversation opens.
      queryClient.setQueryData<ApiChat[]>(CHATS_KEY, (prev) =>
        (prev ?? []).map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
      );
      try {
        await markChatReadApi(chatId);
      } catch {
        // Not worth interrupting anyone over; the next poll restores the truth.
      }
    },
    [queryClient],
  );

  const refreshChats = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: CHATS_KEY });
  }, [queryClient]);

  return { chats, sendMessage, deleteMessage, setActiveChatId, markChatRead, refreshChats };
}
