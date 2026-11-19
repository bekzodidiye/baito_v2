/**
 * Live chat updates.
 *
 * Messages arrived by polling — every five seconds while a conversation was
 * open — because that was the plainer of the two and enough to get the feature
 * working. The socket has been on the backend the whole time, and nginx was
 * fixed to pass the Upgrade header earlier, so a reply can land immediately
 * instead of up to five seconds later.
 *
 * Deliberately receive-only. Sending still goes over HTTP, which already
 * handles the optimistic update and reports its own failures; a socket that
 * drops mid-send would have to reproduce all of that. If the socket never
 * connects, polling still carries the conversation.
 */

export interface SocketMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  hasMap?: boolean;
  mapLocation?: string | null;
  createdAt?: string | null;
}

export interface ChatSocketOptions {
  onMessage?: (msg: SocketMessage) => void;
  onTyping?: (data: { userId: string; isTyping: boolean }) => void;
  onRead?: (data: { userId: string; chatId: string }) => void;
}

export interface ChatSocket {
  close: () => void;
  sendTyping: (isTyping: boolean) => void;
  sendRead: () => void;
}

export const calculateBackoffDelay = (
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number => {
  return Math.min(baseDelay * 2 ** Math.min(attempt, 10), maxDelay);
};

export const getChatWebSocketUrl = (chatId: string, token?: string): string => {
  const scheme = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost';
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${scheme}://${host}/api/v1/chats/ws/${encodeURIComponent(chatId)}${query}`;
};

/** Open a socket for one conversation. Returns a handle that closes it. */
export const openChatSocket = (
  chatId: string,
  handlerOrOptions: ((msg: SocketMessage) => void) | ChatSocketOptions,
): ChatSocket => {
  const options: ChatSocketOptions =
    typeof handlerOrOptions === 'function'
      ? { onMessage: handlerOrOptions }
      : (handlerOrOptions || {});

  let socket: WebSocket | null = null;
  let closedByUs = false;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let attempt = 0;

  const connect = () => {
    if (closedByUs) return;
    const url = getChatWebSocketUrl(chatId);

    try {
      socket = new WebSocket(url);
    } catch {
      return; // Polling remains the fallback.
    }

    socket.onopen = () => {
      attempt = 0;
      if (pingTimer) clearInterval(pingTimer);
      // Keepalive ping every 25 seconds to prevent NAT/proxy drops
      pingTimer = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({ type: 'ping' }));
          } catch {
            // Ignore send error on closed socket
          }
        }
      }, 25000);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data === 'object') {
          if (data.type === 'pong') {
            return;
          }
          if (data.type === 'typing' && options.onTyping) {
            const userId = data.userId || data.senderId || data.user_id;
            const isTyping = data.isTyping !== undefined ? Boolean(data.isTyping) : Boolean(data.is_typing);
            options.onTyping({ userId, isTyping });
            return;
          }
          if (data.type === 'read' && options.onRead) {
            const userId = data.userId || data.readerId || data.user_id;
            const chatId = data.chatId || data.chat_id;
            options.onRead({ userId, chatId });
            return;
          }
          if ((data.type === 'delete' && data.messageId) || (data.id && data.text !== undefined)) {
            options.onMessage?.(data as SocketMessage);
          }
        }
      } catch {
        // A frame we cannot read is not worth tearing the connection down for.
      }
    };

    socket.onclose = () => {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      socket = null;
      if (closedByUs) return;
      // Exponential backoff capped at 30 seconds with persistent reconnection
      attempt += 1;
      const delay = calculateBackoffDelay(attempt);
      retry = setTimeout(connect, delay);
    };

    socket.onerror = () => {
      socket?.close();
    };
  };

  const handleWakeup = () => {
    if (closedByUs) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      attempt = 0;
      if (retry) {
        clearTimeout(retry);
        retry = null;
      }
      connect();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleWakeup);
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleWakeup);
  }

  connect();

  return {
    sendTyping: (isTyping: boolean) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: 'typing', isTyping, is_typing: isTyping }));
        } catch {
          // ignore
        }
      }
    },
    sendRead: () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: 'read' }));
        } catch {
          // ignore
        }
      }
    },
    close: () => {
      closedByUs = true;
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      if (retry) clearTimeout(retry);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleWakeup);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleWakeup);
      }
      socket?.close();
      socket = null;
    },
  };
};
