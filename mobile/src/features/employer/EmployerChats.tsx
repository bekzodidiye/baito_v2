import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useEmployerChat } from '../../hooks/useEmployerChat';
import { EmployerChatList } from './components/EmployerChatList';
import { EmployerChatWindow } from './components/EmployerChatWindow';


interface EmployerChatsProps {
  initialTargetCandidate?: string | null;
  onClearTargetCandidate?: () => void;
}

export const EmployerChats: React.FC<EmployerChatsProps> = ({ 
  initialTargetCandidate,
  onClearTargetCandidate
}) => {
  const { setEmployerSelectedChatId, messagesSearchOpen, setMessagesSearchOpen } = useApp();
  
  const {
    sessions,
    selectedSessionId,
    setSelectedSessionId,
    activeSession,
    isTyping,
    sendMessage,
    createSession,
    language
  } = useEmployerChat(initialTargetCandidate, onClearTargetCandidate);

  // Synchronize with global AppContext for header/layout awareness
  useEffect(() => {
    setEmployerSelectedChatId(selectedSessionId);
    return () => {
      setEmployerSelectedChatId(null);
    };
  }, [selectedSessionId, setEmployerSelectedChatId]);

  if (selectedSessionId && activeSession) {
    return (
      <EmployerChatWindow
        language={language}
        activeSession={activeSession}
        onBack={() => setSelectedSessionId(null)}
        onSendMessage={sendMessage}
        isTyping={isTyping}
      />
    );
  }

  return (
    <>
      <EmployerChatList
        language={language}
        sessions={sessions}
        onSelectSession={setSelectedSessionId}
        messagesSearchOpen={messagesSearchOpen}
        setMessagesSearchOpen={setMessagesSearchOpen}
        onComposeClick={() => {}}
      />
    </>
  );
};
