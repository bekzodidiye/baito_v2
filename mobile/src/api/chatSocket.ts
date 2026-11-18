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

export interface ChatSocket {
  close: () => void;
}

/** Open a socket for one conversation. Returns a handle that closes it. */
export const openChatSocket = (
  chatId: string,
  onMessage: (msg: SocketMessage) => void,
): ChatSocket => {
  let socket: WebSocket | null = null;
  let closedByUs = false;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const connect = () => {
    if (closedByUs) return;
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${scheme}://${window.location.host}/api/v1/chats/ws/${encodeURIComponent(chatId)}`;

    try {
      socket = new WebSocket(url);
    } catch {
      return; // Polling remains the fallback.
    }

    socket.onopen = () => {
      attempt = 0;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data === 'object') {
          if ((data.type === 'delete' && data.messageId) || (data.id && data.text !== undefined)) {
            onMessage(data as SocketMessage);
          }
        }
      } catch {
        // A frame we cannot read is not worth tearing the connection down for.
      }
    };

    socket.onclose = () => {
      socket = null;
      if (closedByUs) return;
      // Back off, and stop trying after a while rather than hammering a
      // server that is refusing the upgrade.
      attempt += 1;
      if (attempt > 5) return;
      retry = setTimeout(connect, Math.min(1000 * 2 ** attempt, 30000));
    };

    socket.onerror = () => {
      socket?.close();
    };
  };

  connect();

  return {
    close: () => {
      closedByUs = true;
      if (retry) clearTimeout(retry);
      socket?.close();
      socket = null;
    },
  };
};
