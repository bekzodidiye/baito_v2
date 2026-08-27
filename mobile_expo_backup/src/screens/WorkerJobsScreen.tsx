import React from 'react';
import { View, Text } from 'react-native';
import { EmptyState } from '../components/ui/EmptyState';

export default function WorkerJobsScreen() {
  return (
    <View className="flex-1 bg-white">
      <EmptyState 
        title="Ishlar xaritasi" 
        description="Tez orada xarita shu yerda bo'ladi" 
      />
    </View>
  );
}
