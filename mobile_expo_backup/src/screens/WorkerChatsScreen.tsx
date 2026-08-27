import React from 'react';
import { View } from 'react-native';
import { EmptyState } from '../components/ui/EmptyState';

export default function WorkerChatsScreen() {
  return (
    <View className="flex-1 bg-white">
      <EmptyState 
        title="Xabarlar" 
        description="Hozircha xabarlar yo'q" 
      />
    </View>
  );
}
