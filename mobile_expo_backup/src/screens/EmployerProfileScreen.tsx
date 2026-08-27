import React from 'react';
import { View } from 'react-native';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/useAuthStore';

export default function EmployerProfileScreen() {
  const { clearSession } = useAuthStore();
  
  return (
    <View className="flex-1 bg-white p-4">
      <EmptyState 
        title="Ish beruvchi profili" 
        description="Profil ma'lumotlari tez orada" 
      />
      <Button 
        title="Tizimdan chiqish" 
        variant="danger" 
        onPress={() => clearSession()} 
      />
    </View>
  );
}
