import { useQuery } from '@tanstack/react-query';
import { Chat, Message } from '../types';
import { useCallback, useState } from 'react';
import { useApp } from './AppContext';

export function useChatsData(language: 'uz' | 'ru' | 'en') {
  const { userProfile, isLoggedIn } = useApp();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  const initialSupportMessage = language === 'uz' ? 'Assalomu alaykum! Baito yordam markaziga xush kelibsiz. Sizga qanday yordam bera olaman?' : language === 'ru' ? 'Здравствуйте! Добро пожаловать в центр поддержки Baito. Чем могу помочь?' : 'Hello! Welcome to Baito Support. How can I help you?';
  const supportName = language === 'uz' ? 'Yordam markazi' : language === 'ru' ? 'Служба поддержки' : 'Support Center';

  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({
    'support_session': [
      {
        id: 'msg_0',
        sender: 'recruiter', // Support acts as the recruiter
        text: initialSupportMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]
  });

  const chats: Chat[] = [
    {
      id: 'support_session',
      companyName: supportName,
      logoUrl: '',
      recruiterName: supportName,
      recruiterAvatar: '',
      lastMessageTime: messagesMap['support_session']?.slice(-1)[0]?.time || '',
      unreadCount: 0,
      online: true,
      messages: messagesMap['support_session'] || []
    }
  ];

  const sendMessage = useCallback((chatId: string, text: string) => {
    if (!text.trim() || !userProfile?.id) return;
    
    // Add user message locally
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessagesMap(prev => {
      const existing = prev[chatId] || [];
      return { ...prev, [chatId]: [...existing, newMsg] };
    });

    // Mock a reply after 2 seconds
    setTimeout(() => {
      const replyMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: 'recruiter',
        text: language === 'uz' ? 'Sizning xabaringiz qabul qilindi. Operator tez orada javob beradi.' : language === 'ru' ? 'Ваше сообщение получено. Оператор скоро ответит.' : 'Your message has been received. An operator will reply soon.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      setMessagesMap(prev => {
        const existing = prev[chatId] || [];
        return { ...prev, [chatId]: [...existing, replyMsg] };
      });
    }, 2000);

  }, [userProfile?.id, language]);
  
  const setChats = (updater: any) => {}; 
  const addNewMessage = () => {}; 

  return { chats, setChats, sendMessage, addNewMessage, setActiveChatId };
}
