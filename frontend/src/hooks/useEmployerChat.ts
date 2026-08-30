import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEmployer } from './useEmployer';
import { fetchChats, fetchChatMessages, sendChatMessageApi, createChatApi, markChatReadApi } from '../api/queries';

/**
 * The employer's side of the same conversations.
 *
 * This was a second, separate mock: its own hard-coded "support" session, its
 * own local send that invented "an operator will reply soon" two seconds
 * later, and a createSession that did nothing but
 * `console.warn("createSession is disabled. Employer can only chat with
 * Support.")`. An employer could not message a candidate at all, while the
 * backend had the endpoints for it the whole time.
 *
 * It keeps its own ChatSession shape because the employer components are built
 * around it; only the data behind it changes.
 */

export interface ChatMessage {
  id: string;
  senderId: string;
  sender: 'user' | 'recruiter';
  text: string;
  time: string;
  hasMap?: boolean;
  mapLocation?: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  jobId?: string;
  candidateName: string;
  candidateAvatar: string;
  lastMessage: string;
  time: string;
  messages: ChatMessage[];
}

interface ApiChat {
  id: string;
  workerId: string;
  employerId: string;
  jobId?: string | null;
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

export const useEmployerChat = (
  initialTargetCandidate?: string | null,
  onClearTargetCandidate?: () => void,
) => {
  const { language, employer } = useEmployer();
  const queryClient = useQueryClient();

  const [selectedSessionId, setSelectedSessionIdState] = useState<string | null>(null);

  /** Opening a conversation is what marks it read. */
  const setSelectedSessionId = useCallback(
    (id: string | null) => {
      setSelectedSessionIdState(id);
      if (!id) return;
      queryClient.setQueryData<ApiChat[]>(CHATS_KEY, (prev) =>
        (prev ?? []).map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
      );
      // The badge is already gone locally; the next poll corrects it if this
      // does not land.
      markChatReadApi(id).catch(() => {});
    },
    [queryClient],
  );
  const [isTyping] = useState(false);

  const unknownName =
    language === 'uz' ? 'Nomzod' : language === 'ru' ? 'Кандидат' : 'Candidate';

  const { data: apiChats = [] } = useQuery<ApiChat[]>({
    queryKey: CHATS_KEY,
    queryFn: fetchChats,
    enabled: Boolean(employer?.id),
    refetchInterval: employer?.id ? 15000 : false,
    staleTime: 5000,
  });

  const { data: apiMessages = [] } = useQuery<ApiMessage[]>({
    queryKey: [MESSAGES_KEY, selectedSessionId],
    queryFn: () => fetchChatMessages(selectedSessionId as string),
    enabled: Boolean(selectedSessionId),
    refetchInterval: selectedSessionId ? 5000 : false,
  });

  const toMessage = useCallback(
    (m: ApiMessage): ChatMessage => ({
      id: m.id,
      senderId: m.senderId,
      // These components call the employer "recruiter" and the other party "user".
      sender: employer?.id && m.senderId === employer.id ? 'recruiter' : 'user',
      text: m.text,
      time: clockTime(m.createdAt),
      hasMap: m.hasMap ?? false,
      mapLocation: m.mapLocation ?? undefined,
      createdAt: m.createdAt ?? new Date().toISOString(),
    }),
    [employer?.id],
  );

  const sessions: ChatSession[] = (Array.isArray(apiChats) ? apiChats : []).map((c) => ({
    id: c.id,
    jobId: c.jobId ?? undefined,
    candidateName: c.otherUserName || unknownName,
    candidateAvatar: c.otherUserAvatar || '',
    lastMessage: c.lastMessage || '',
    time: clockTime(c.lastMessageTime),
    messages:
      c.id === selectedSessionId
        ? (Array.isArray(apiMessages) ? apiMessages : []).map(toMessage)
        : [],
  }));

  const activeSession = sessions.find((s) => s.id === selectedSessionId);

  const sendMessage = useCallback(
    async (text: string) => {
      const body = text.trim();
      if (!body || !selectedSessionId || !employer?.id) return;

      queryClient.setQueryData<ApiMessage[]>([MESSAGES_KEY, selectedSessionId], (prev) => [
        ...(prev ?? []),
        {
          id: `pending_${Date.now()}`,
          chatId: selectedSessionId,
          senderId: employer.id,
          text: body,
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        await sendChatMessageApi(selectedSessionId, { text: body });
      } finally {
        // Either replaces the optimistic copy with the stored one, or drops it
        // so nothing sits there looking sent when it was not.
        queryClient.invalidateQueries({ queryKey: [MESSAGES_KEY, selectedSessionId] });
        queryClient.invalidateQueries({ queryKey: CHATS_KEY });
      }
    },
    [selectedSessionId, employer?.id, queryClient],
  );

  /** Open a conversation with a candidate, creating it if there is not one. */
  const createSession = useCallback(
    async (_candidateName: string, initialMessage: string, targetUserId?: string, jobId?: string) => {
      if (!targetUserId) return;
      // The employer is the caller, so the candidate is the worker side.
      const chat = await createChatApi({ workerId: targetUserId, jobId });
      if (!chat?.id) return;

      setSelectedSessionIdState(chat.id);
      if (initialMessage.trim()) {
        await sendChatMessageApi(chat.id, { text: initialMessage.trim() });
      }
      queryClient.invalidateQueries({ queryKey: CHATS_KEY });
      onClearTargetCandidate?.();
    },
    [queryClient, onClearTargetCandidate],
  );

  return {
    sessions,
    selectedSessionId,
    setSelectedSessionId,
    activeSession,
    isTyping,
    sendMessage,
    createSession,
    language,
  };
};
