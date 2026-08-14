import React from 'react';
import { View } from 'react-native';
import { EmptyState } from '../components/ui/EmptyState';

export default function WorkerApplicationsScreen() {
  return (
    <View className="flex-1 bg-white">
      <EmptyState 
        title="Sizning arizalaringiz" 
        description="Hozircha arizalar yo'q" 
      />
    </View>
  );
}
