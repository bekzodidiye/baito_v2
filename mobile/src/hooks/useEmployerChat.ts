import { useState, useEffect, useRef } from 'react';
import { useEmployer } from './useEmployer';

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

export const useEmployerChat = (initialTargetCandidate?: string | null, onClearTargetCandidate?: () => void) => {
  const { language, employer } = useEmployer();
  
  const initialSupportMessage = language === 'uz' ? 'Assalomu alaykum! Baito yordam markaziga xush kelibsiz. Sizga qanday yordam bera olaman?' : language === 'ru' ? 'Здравствуйте! Добро пожаловать в центр поддержки Baito. Чем могу помочь?' : 'Hello! Welcome to Baito Support. How can I help you?';
  const supportName = language === 'uz' ? 'Yordam markazi' : language === 'ru' ? 'Служба поддержки' : 'Support Center';

  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'support_session',
      candidateName: supportName,
      candidateAvatar: '', 
      lastMessage: initialSupportMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [
        {
          id: 'msg_0',
          senderId: 'support',
          sender: 'user', // support acts as the 'user' on the other end
          text: initialSupportMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: new Date().toISOString()
        }
      ]
    }
  ]);
  
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Auto-open support chat if navigating to chats (optional, but good UX if it's the only one)
  // We won't do it automatically here to avoid breaking expected flows, but they can click it in the list.

  const activeSession = sessions?.find(s => s.id === selectedSessionId);

  const sendMessage = (text: string) => {
    if (!text.trim() || !selectedSessionId || !employer?.id) return;
    
    // Add employer message locally
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: employer.id,
      sender: 'recruiter', // employer is the recruiter
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    setSessions(prev => prev.map(s => {
      if (s.id === selectedSessionId) {
        return { 
          ...s, 
          messages: [...s.messages, newMsg],
          lastMessage: newMsg.text,
          time: newMsg.time
        };
      }
      return s;
    }));

    // Mock a reply after 1-2 seconds
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const replyMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        senderId: 'support',
        sender: 'user',
        text: language === 'uz' ? 'Sizning xabaringiz qabul qilindi. Operator tez orada javob beradi.' : language === 'ru' ? 'Ваше сообщение получено. Оператор скоро ответит.' : 'Your message has been received. An operator will reply soon.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString()
      };
      
      setSessions(prev => prev.map(s => {
        if (s.id === selectedSessionId) {
          return { 
            ...s, 
            messages: [...s.messages, replyMsg],
            lastMessage: replyMsg.text,
            time: replyMsg.time
          };
        }
        return s;
      }));
    }, 2000);
  };

  const createSession = async (candidateName: string, initialMessage: string, targetUserId?: string, jobId?: string) => {
    // Disabled functionality
    console.warn("createSession is disabled. Employer can only chat with Support.");
  };

  return {
    sessions,
    selectedSessionId,
    setSelectedSessionId,
    activeSession,
    isTyping,
    sendMessage,
    createSession,
    language
  };
};
