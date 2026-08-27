import React from 'react';
import { MessagesScreen } from '../messages/MessagesScreen';
import { ErrorBoundary } from '../ErrorBoundary';

export const ChatScreen: React.FC = () => {
  return (
    <ErrorBoundary>
      <MessagesScreen />
    </ErrorBoundary>
  );
};
