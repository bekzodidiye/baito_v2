import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Chat, Message } from '../types';
import { useApp } from './AppContext';
import { fetchChats, fetchChatMessages, sendChatMessageApi, markChatReadApi } from '../api/queries';

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

const clockTime = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const toMessage = (m: ApiMessage, myId?: string): Message => ({
  id: m.id,
  // The UI's two senders are "me" and "the other party"; the API gives ids.
  sender: myId && m.senderId === myId ? 'user' : 'recruiter',
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
  const { userProfile, isLoggedIn } = useApp();
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

  const { data: apiMessages = [] } = useQuery<ApiMessage[]>({
    queryKey: [MESSAGES_KEY, activeChatId],
    queryFn: () => fetchChatMessages(activeChatId as string),
    enabled: Boolean(activeChatId) && isLoggedIn,
    // Faster while a conversation is open, because that is when a reply is
    // actually being waited for.
    refetchInterval: activeChatId ? 5000 : false,
  });

  const chats: Chat[] = (Array.isArray(apiChats) ? apiChats : []).map((c) =>
    toChat(
      c,
      c.id === activeChatId
        ? (Array.isArray(apiMessages) ? apiMessages : []).map((m) =>
            toMessage(m, userProfile?.id),
          )
        : [],
      unknownName,
    ),
  );

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      const body = text.trim();
      if (!body || !chatId) return;

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

  /** Clear a conversation's badge, on the server and here. */
  const markChatRead = useCallback(
    async (chatId: string) => {
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

  return { chats, sendMessage, setActiveChatId, markChatRead, refreshChats };
}
