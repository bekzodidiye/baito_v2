import React from 'react';
import { View } from 'react-native';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

export default function EmployerJobsScreen() {
  return (
    <View className="flex-1 bg-white p-4">
      <EmptyState 
        title="Sizning e'lonlaringiz" 
        description="Hali ish e'lonlari kiritilmagan" 
      />
      <Button title="Yangi e'lon qo'shish" variant="primary" />
    </View>
  );
}
